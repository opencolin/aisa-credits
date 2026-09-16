"use client";

import { useState } from "react";

export type Faq = { question: string; answer: string };

export function FaqList({ faqs }: { faqs: Faq[] }) {
  const [open, setOpen] = useState(0);

  return (
    <div className="border-line divide-line divide-y border-t">
      {faqs.map((faq, i) => (
        <div key={faq.question}>
          <button
            type="button"
            onClick={() => setOpen(open === i ? -1 : i)}
            aria-expanded={open === i}
            className="flex w-full items-center justify-between gap-6 py-5 text-left"
          >
            <span className="text-fg text-base font-semibold sm:text-lg">{faq.question}</span>
            <span className="text-fg-muted shrink-0 text-2xl leading-none font-light">
              {open === i ? "−" : "+"}
            </span>
          </button>
          {open === i && <p className="text-fg-muted max-w-3xl pb-6 text-sm leading-relaxed sm:text-base">{faq.answer}</p>}
        </div>
      ))}
    </div>
  );
}
