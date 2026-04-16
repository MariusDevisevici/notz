import { getNotz } from "@/app/actions/notz-actions";
import { notFound } from "next/navigation";

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

  return <section className="px-2 py-6 sm:px-6 sm:py-10" />;
}