import { redirect } from "next/navigation";

/** Root simply routes into the app; middleware handles auth from there. */
export default function Home() {
  redirect("/tests");
}
