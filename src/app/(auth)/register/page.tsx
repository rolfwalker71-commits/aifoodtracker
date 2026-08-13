import { redirect } from "next/navigation";

/** Open registration removed — use invite codes. */
export default function RegisterRedirectPage() {
  redirect("/invite");
}
