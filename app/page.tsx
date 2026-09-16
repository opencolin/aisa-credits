import Link from "next/link";
import { redirect } from "next/navigation";

export default function Home() {
  redirect("/console/events");
  // eslint-disable-next-line no-unreachable
  return <Link href="/console/events">Console</Link>;
}
