import { redirect } from "next/navigation";

/** Tracker was merged into Clients — keep old links working. */
export default function TrackerRedirectPage() {
  redirect("/clients");
}
