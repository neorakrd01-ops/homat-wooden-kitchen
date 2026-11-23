import { notFound } from "next/navigation";
import { requireUser } from "@/lib/session";
import { getSettings } from "@/lib/settings";
import { docLang, loadReceipt } from "@/lib/documents-data";
import { ReceiptDocument } from "@/components/documents";

export default async function ReceiptDocPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ lang?: string }> }) {
  await requireUser();
  const r = await loadReceipt({ id: (await params).id });
  if (!r) notFound();
  return <ReceiptDocument lang={docLang((await searchParams).lang)} s={await getSettings()} {...r} />;
}
