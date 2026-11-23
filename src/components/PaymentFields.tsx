"use client";

import { useState } from "react";

export function PaymentFields({
  orderCurrency,
  defaultRate,
  today,
  allowPayment,
  text,
}: {
  orderCurrency: string;
  defaultRate: string;
  today: string;
  allowPayment: boolean;
  text: Record<
    "kind" | "payment" | "refund" | "amount" | "currency" | "rate" | "rateHelp" | "method" | "cash" | "transfer" | "card" | "other" | "date" | "note" | "converted",
    string
  >;
}) {
  const [currency, setCurrency] = useState(orderCurrency);
  const [amount, setAmount] = useState("");
  const [rate, setRate] = useState(defaultRate);
  const other = currency !== orderCurrency;

  const a = Number(amount.replace(/,/g, ""));
  const r = Number(rate.replace(/,/g, ""));
  let converted = "";
  if (other && a > 0 && r > 0) {
    const v = currency === "IQD" ? a / r : a * r;
    converted = new Intl.NumberFormat("en-US", { maximumFractionDigits: orderCurrency === "USD" ? 2 : 0 }).format(v) + " " + orderCurrency;
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div>
        <label className="label">{text.kind}</label>
        <select className="input" name="kind" defaultValue={allowPayment ? "PAYMENT" : "REFUND"}>
          {allowPayment && <option value="PAYMENT">{text.payment}</option>}
          <option value="REFUND">{text.refund}</option>
        </select>
      </div>
      <div>
        <label className="label">{text.date}</label>
        <input className="input" type="date" name="date" defaultValue={today} required />
      </div>
      <div>
        <label className="label">{text.amount}</label>
        <div className="flex gap-1">
          <input className="input" name="amount" dir="ltr" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} required />
          <select className="input !w-24" name="currency" value={currency} onChange={(e) => setCurrency(e.target.value)}>
            <option>IQD</option>
            <option>USD</option>
          </select>
        </div>
      </div>
      <div>
        <label className="label">{text.method}</label>
        <select className="input" name="method" defaultValue="CASH">
          <option value="CASH">{text.cash}</option>
          <option value="TRANSFER">{text.transfer}</option>
          <option value="CARD">{text.card}</option>
          <option value="OTHER">{text.other}</option>
        </select>
      </div>
      {other && (
        <div className="sm:col-span-2 rounded-lg border border-amber-200 bg-amber-50 p-3">
          <label className="label">{text.rate}</label>
          <input className="input !w-40" name="exchangeRate" dir="ltr" inputMode="decimal" value={rate} onChange={(e) => setRate(e.target.value)} required />
          <p className="mt-1 text-xs text-stone-600">{text.rateHelp}</p>
          {converted && (
            <p className="mt-1 text-sm font-semibold">
              {text.converted}: <span className="num">{converted}</span>
            </p>
          )}
        </div>
      )}
      <div className="sm:col-span-2">
        <label className="label">{text.note}</label>
        <input className="input" name="note" />
      </div>
    </div>
  );
}
