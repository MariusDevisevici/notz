import { auth } from "@/auth";
import { redirect } from "next/navigation";

export default async function CreateNotzPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/");
  }

  return <section className="px-4 py-8 sm:px-6 sm:py-10" />;
}