"use client";

import { useMemo, useState } from "react";

type Line = { description: string; quantity: string; unitPrice: string };
type PriceOption = { id: string; label: string; unit: string; price: string };

/**
 * Editable list of quote/order lines. Prices are typed in major units (dinars, dollars).
 * Sends everything as JSON in a hidden input called "lines"; discount uses input "discount".
 */
export function LinesEditor({
  initial,
  initialDiscount,
  currency,
  prices,
  text,
}: {
  initial: Line[];
  initialDiscount: string;
  currency: string;
  prices: PriceOption[];
  text: Record<"description" | "quantity" | "unitPrice" | "lineTotal" | "addLine" | "addFromList" | "subtotal" | "discount" | "total" | "remove", string>;
}) {
  const [lines, setLines] = useState<Line[]>(initial.length ? initial : [{ description: "", quantity: "1", unitPrice: "" }]);
  const [discount, setDiscount] = useState(initialDiscount);

  const num = (s: string) => {
    const n = Number(String(s).replace(/,/g, ""));
    return Number.isFinite(n) ? n : 0;
  };
  const fmt = (n: number) =>
    new Intl.NumberFormat("en-US", { minimumFractionDigits: currency === "USD" ? 2 : 0, maximumFractionDigits: 2 }).format(n);

  const subtotal = useMemo(() => lines.reduce((s, l) => s + num(l.quantity) * num(l.unitPrice), 0), [lines]);
  const total = subtotal - num(discount);

  const update = (i: number, patch: Partial<Line>) => setLines((ls) => ls.map((l, j) => (j === i ? { ...l, ...patch } : l)));

  return (
    <div className="space-y-3">
      <input type="hidden" name="lines" value={JSON.stringify(lines)} />
      <div className="overflow-x-auto">
        <table className="table min-w-[560px]">
          <thead>
            <tr>
              <th className="w-1/2">{text.description}</th>
              <th>{text.quantity}</th>
              <th>{text.unitPrice} ({currency})</th>
              <th>{text.lineTotal}</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {lines.map((l, i) => (
              <tr key={i}>
                <td>
                  <input className="input" value={l.description} onChange={(e) => update(i, { description: e.target.value })} />
                </td>
                <td>
                  <input className="input w-20" dir="ltr" inputMode="decimal" value={l.quantity} onChange={(e) => update(i, { quantity: e.target.value })} />
                </td>
                <td>
                  <input className="input w-32" dir="ltr" inputMode="decimal" value={l.unitPrice} onChange={(e) => update(i, { unitPrice: e.target.value })} />
                </td>
                <td className="num pt-4">{fmt(num(l.quantity) * num(l.unitPrice))}</td>
                <td>
                  <button type="button" className="btn !px-2" title={text.remove} onClick={() => setLines((ls) => ls.filter((_, j) => j !== i))}>
                    ✕
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn" onClick={() => setLines((ls) => [...ls, { description: "", quantity: "1", unitPrice: "" }])}>
          + {text.addLine}
        </button>
        {prices.length > 0 && (
          <select
            className="input !w-auto"
            value=""
            onChange={(e) => {
              const p = prices.find((x) => x.id === e.target.value);
              if (!p) return;
              const blankIdx = lines.findIndex((l) => !l.description && !l.unitPrice);
              const line = { description: p.unit ? `${p.label} (${p.unit})` : p.label, quantity: "1", unitPrice: p.price };
              setLines((ls) => (blankIdx >= 0 ? ls.map((l, j) => (j === blankIdx ? line : l)) : [...ls, line]));
            }}
          >
            <option value="">+ {text.addFromList}</option>
            {prices.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label} — {p.price} {currency}
                {p.unit ? ` / ${p.unit}` : ""}
              </option>
            ))}
          </select>
        )}
      </div>

      <div className="ms-auto max-w-xs space-y-2 text-sm">
        <div className="flex justify-between">
          <span>{text.subtotal}</span>
          <span className="num">{fmt(subtotal)} {currency}</span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <label htmlFor="discount">{text.discount}</label>
          <input id="discount" name="discount" className="input !w-32" dir="ltr" inputMode="decimal" value={discount} onChange={(e) => setDiscount(e.target.value)} />
        </div>
        <div className="flex justify-between border-t pt-2 text-base font-bold">
          <span>{text.total}</span>
          <span className="num">{fmt(total)} {currency}</span>
        </div>
      </div>
    </div>
  );
}
