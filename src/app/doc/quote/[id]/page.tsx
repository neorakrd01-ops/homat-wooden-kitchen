import { notFound } from "next/navigation";
import { requireUser } from "@/lib/session";
import { getSettings } from "@/lib/settings";
import { docLang, loadQuote } from "@/lib/documents-data";
import { QuoteDocument } from "@/components/documents";

export default async function QuoteDocPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ lang?: string }> }) {
  await requireUser();
  const quote = await loadQuote({ id: (await params).id });
  if (!quote) notFound();
  return <QuoteDocument lang={docLang((await searchParams).lang)} s={await getSettings()} quote={quote} />;
}
