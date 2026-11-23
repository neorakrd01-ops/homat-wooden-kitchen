import { notFound } from "next/navigation";
import { getSettings } from "@/lib/settings";
import { docLang, loadQuote } from "@/lib/documents-data";
import { QuoteDocument } from "@/components/documents";

// Public page: the customer opens this from the WhatsApp link. No login.
export default async function SharedQuotePage({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<{ lang?: string }> }) {
  const { token } = await params;
  if (!/^[A-Za-z0-9_-]{20,}$/.test(token)) notFound();
  const quote = await loadQuote({ shareToken: token });
  if (!quote) notFound();
  return <QuoteDocument lang={docLang((await searchParams).lang)} s={await getSettings()} quote={quote} />;
}
