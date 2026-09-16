/**
 * The schema, as an ordered list of idempotent statements.
 *
 * One statement per entry rather than a .sql file: the Neon HTTP driver sends exactly one
 * statement per query, and a naive split on ";" would cut the function body below apart.
 * Every entry is safe to re-run, so `npm run db:migrate` is too.
 */
export const SCHEMA = [
  `create table if not exists events (
    id               text primary key,
    slug             text not null unique,
    title            text not null,
    description      text not null default '',
    status           text not null check (status in ('draft', 'active', 'ended')),
    code_mode        text not null check (code_mode in ('shared', 'unique')),
    shared_code      text unique,
    credit_cents     integer not null check (credit_cents > 0),
    budget_cap_cents integer not null check (budget_cap_cents > 0),
    granted_cents    integer not null default 0,
    grant_count      integer not null default 0,
    expiry_days      integer check (expiry_days is null or expiry_days > 0),
    created_at       timestamptz not null default now(),
    activated_at     timestamptz,
    ended_at         timestamptz,
    -- The database refuses an overspent budget outright, whatever the application does.
    constraint granted_within_cap check (granted_cents <= budget_cap_cents)
  )`,

  `create table if not exists unique_codes (
    code        text primary key,
    event_id    text not null references events(id) on delete cascade,
    redeemed_at timestamptz,
    redeemed_by text
  )`,
  `create index if not exists unique_codes_event_id on unique_codes (event_id)`,

  `create table if not exists redemptions (
    id           text primary key,
    event_id     text not null references events(id) on delete cascade,
    code         text not null,
    email        text not null,
    amount_cents integer not null,
    created_at   timestamptz not null default now(),
    expires_at   timestamptz
  )`,
  `create index if not exists redemptions_event_email on redemptions (event_id, email)`,

  /*
   * Redemption, in one statement.
   *
   * This used to be serialised by a promise chain in the app's own process, which held for
   * exactly as long as there was one process. Vercel runs as many instances as traffic asks
   * for, and a lock in one of them means nothing to the others — so the lock moved here.
   * `select … for update` on the event row makes every claim against an event wait for the
   * one before it, which is what keeps two simultaneous claims from both reading the same
   * granted_cents and both passing the budget check.
   *
   * Every refusal returns before anything is written, so a refused claim changes nothing.
   * The reasons match the old store word for word; the UI renders them as they are.
   */
  `create or replace function redeem_code(p_code text, p_email text)
  returns jsonb
  language plpgsql
  as $fn$
  declare
    v_code     text := upper(btrim(p_code));
    v_email    text := lower(btrim(p_email));
    v_event_id text;
    e          events%rowtype;
    u          unique_codes%rowtype;
    v_expires  timestamptz;
  begin
    select id into v_event_id from events where code_mode = 'shared' and shared_code = v_code;
    if v_event_id is null then
      select event_id into v_event_id from unique_codes where code = v_code;
    end if;
    if v_event_id is null then
      return jsonb_build_object('ok', false, 'reason', 'That code isn''t recognised. Check for typos and try again.');
    end if;

    select * into e from events where id = v_event_id for update;

    if e.status = 'draft' then
      return jsonb_build_object('ok', false, 'reason', 'This code isn''t active yet.');
    end if;
    if e.status = 'ended' then
      return jsonb_build_object('ok', false, 'reason', 'This offer has ended.');
    end if;
    if e.budget_cap_cents - e.granted_cents < e.credit_cents then
      return jsonb_build_object('ok', false, 'reason', 'This offer has run out of credits.');
    end if;

    if e.code_mode = 'unique' then
      select * into u from unique_codes where code = v_code and event_id = e.id for update;
      if not found then
        return jsonb_build_object('ok', false, 'reason', 'That code isn''t recognised.');
      end if;
      if u.redeemed_at is not null then
        return jsonb_build_object('ok', false, 'reason', 'That code has already been used.');
      end if;
      update unique_codes set redeemed_at = now(), redeemed_by = v_email where code = v_code;
    elsif exists (select 1 from redemptions where event_id = e.id and email = v_email) then
      -- One grant per account per event, or a single shared code drains the cap from one laptop.
      return jsonb_build_object('ok', false, 'reason', 'You''ve already claimed credits from this event.');
    end if;

    v_expires := case when e.expiry_days is null then null
                      else now() + make_interval(days => e.expiry_days) end;

    insert into redemptions (id, event_id, code, email, amount_cents, expires_at)
    values (gen_random_uuid()::text, e.id, v_code, v_email, e.credit_cents, v_expires);

    update events
       set granted_cents = granted_cents + credit_cents,
           grant_count   = grant_count + 1
     where id = e.id;

    return jsonb_build_object(
      'ok', true,
      'amountCents', e.credit_cents,
      'expiresAt', to_char(v_expires at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
      'eventTitle', e.title
    );
  end;
  $fn$`,
];
