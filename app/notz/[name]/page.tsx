import { getNotz } from "@/app/actions/notz-actions";
import { notFound } from "next/navigation";
import { NotzWorkspace } from "./notz-workspace";

type NotzPageProps = {
  params: Promise<{
    name: string;
  }>;
};

export default async function NotzPage({ params }: NotzPageProps) {
  const { name } = await params;

  const notz = await getNotz(name);

  if (!notz) {
    notFound();
  }

  return (
    <main className="px-1.5 py-3 sm:px-6 sm:py-10">
      <NotzWorkspace
        notzId={notz.id}
        notzName={notz.name}
        featured={notz.featured}
        initialFields={notz.fields}
      />
    </main>
  );
}