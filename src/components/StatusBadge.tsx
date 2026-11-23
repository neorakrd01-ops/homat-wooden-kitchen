import { STATUS_COLORS } from "@/lib/view";

export function StatusBadge({ status, label }: { status: string; label: string }) {
  return <span className={`badge ${STATUS_COLORS[status] ?? "bg-stone-100"}`}>{label}</span>;
}
