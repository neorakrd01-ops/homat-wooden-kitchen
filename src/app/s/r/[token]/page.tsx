import { notFound } from "next/navigation";
import { getSettings } from "@/lib/settings";
import { docLang, loadReceipt } from "@/lib/documents-data";
import { ReceiptDocument } from "@/components/documents";

// Public page: the customer opens this from the WhatsApp link. No login.
export default async function SharedReceiptPage({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<{ lang?: string }> }) {
  const { token } = await params;
  if (!/^[A-Za-z0-9_-]{20,}$/.test(token)) notFound();
  const r = await loadReceipt({ shareToken: token });
  if (!r) notFound();
  return <ReceiptDocument lang={docLang((await searchParams).lang)} s={await getSettings()} {...r} />;
}
