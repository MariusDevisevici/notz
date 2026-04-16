import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getManageNotzData } from "@/app/actions/notz-actions";
import { ManageNotzView } from "./manage-view";

export default async function ManageNotzPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/");
  }

  const { featuredCount, notz } = await getManageNotzData();

  return (
    <main className="px-2 py-6 sm:px-6 sm:py-10">
      <ManageNotzView featuredCount={featuredCount} initialNotz={notz} />
    </main>
  );
}