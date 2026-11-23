"use client";

import { Fragment, useActionState, useEffect, useRef, useState } from "react";

type State = { error?: string; ok?: boolean; message?: string } | undefined;

/**
 * Wraps a server action that returns { error } so the error shows above the form.
 * `errors` maps error keys to translated text. `resetOnOk` clears the form after success.
 */
export function ActionForm({
  action,
  errors,
  children,
  className,
  okText,
  resetOnOk,
}: {
  action: (state: State, form: FormData) => Promise<State>;
  errors: Record<string, string>;
  children: React.ReactNode;
  className?: string;
  okText?: string;
  resetOnOk?: boolean;
}) {
  const [state, formAction] = useActionState(action, undefined);
  const ref = useRef<HTMLFormElement>(null);
  const [generation, setGeneration] = useState(0);
  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    setHidden(false); // new result: show its message
    if (state?.ok && resetOnOk) {
      ref.current?.reset();
      setGeneration((g) => g + 1); // remount children so their own state clears too
    }
  }, [state, resetOnOk]);
  return (
    <form ref={ref} action={formAction} className={className} onInput={() => setHidden(true)}>
      {!hidden && state?.error && (
        <div className="error mb-3">
          {errors[state.error] ?? state.error}
          {state.message ? <span dir="ltr"> ({state.message})</span> : null}
        </div>
      )}
      {!hidden && state?.ok && okText && (
        <div className="notice mb-3 !border-green-200 !bg-green-50 !text-green-800">{okText.replace("{n}", state.message ?? "")}</div>
      )}
      <Fragment key={generation}>{children}</Fragment>
    </form>
  );
}
