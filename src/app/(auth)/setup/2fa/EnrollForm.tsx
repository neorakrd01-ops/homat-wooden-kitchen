"use client";

import { useActionState } from "react";
import { enrollAction, finishEnrollAction } from "@/lib/auth-actions";
import { SubmitButton } from "@/components/SubmitButton";

type Text = Record<"title" | "step1" | "step2" | "manual" | "verify" | "codesTitle" | "codesHelp" | "done", string>;

export function EnrollForm({ qr, secret, errors, text }: { qr: string; secret: string; errors: Record<string, string>; text: Text }) {
  const [state, action] = useActionState(enrollAction, undefined);

  if (state?.ok && state.codes) {
    return (
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">{text.codesTitle}</h2>
        <p className="notice">{text.codesHelp}</p>
        <ul className="grid grid-cols-2 gap-2 font-mono text-sm" dir="ltr">
          {state.codes.map((c) => (
            <li key={c} className="rounded border border-stone-200 bg-stone-50 px-2 py-1 text-center">{c}</li>
          ))}
        </ul>
        <form action={finishEnrollAction}>
          <SubmitButton className="btn btn-primary w-full">{text.done}</SubmitButton>
        </form>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-4">
      <h2 className="text-lg font-semibold">{text.title}</h2>
      {state?.error && <div className="error">{errors[state.error] ?? state.error}</div>}
      <p className="text-sm">{text.step1}</p>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={qr} alt="QR" className="mx-auto h-56 w-56" />
      <p className="text-xs text-stone-500">
        {text.manual} <span className="font-mono break-all" dir="ltr">{secret}</span>
      </p>
      <p className="text-sm">{text.step2}</p>
      <input className="input text-center text-lg tracking-widest" name="code" inputMode="numeric" dir="ltr" autoComplete="one-time-code" required />
      <SubmitButton className="btn btn-primary w-full">{text.verify}</SubmitButton>
    </form>
  );
}
