import * as React from "react";

/** Per-field client validation state for a form (phase-8, itam-design-system's accessibility
 * baseline: errors are announced via aria-describedby, never colour alone).
 *
 * - `validate({ field: message | falsy, ... }, formEl)` on submit: records the messages, focuses
 *   the first invalid control inside `formEl`, and returns whether everything passed (don't send
 *   the request when it didn't).
 * - Spread `invalid(name)` onto the Input / Select / DatePicker / textarea for that field, and
 *   render `<FieldError id={errorId(name)} message={errors[name]} />` under it.
 * - `clear(name)` from the field's onChange so a fixed field stops showing its error.
 *
 * These are UX checks only: the server validators stay the source of truth, and their single
 * error string keeps rendering in the form-level role="alert" block. */
export function useFieldErrors<K extends string>() {
  const prefix = React.useId();
  const [errors, setErrors] = React.useState<Partial<Record<K, string>>>({});

  const errorId = React.useCallback(
    (name: K) => `${prefix}-${name}-error`,
    [prefix],
  );

  function invalid(name: K) {
    const message = errors[name];
    return {
      "aria-invalid": message ? true : undefined,
      "aria-describedby": message ? errorId(name) : undefined,
    } as const;
  }

  function validate(
    checks: Partial<Record<K, string | false | null | undefined>>,
    root?: HTMLElement | null,
  ): boolean {
    const next: Partial<Record<K, string>> = {};
    for (const key of Object.keys(checks) as K[]) {
      const message = checks[key];
      if (typeof message === "string" && message) next[key] = message;
    }
    setErrors(next);
    const ok = Object.keys(next).length === 0;
    if (!ok) {
      // Discrete events commit synchronously, so the attributes exist by the next frame; focus
      // the first invalid control in DOM order (DatePicker marks itself with data-invalid).
      requestAnimationFrame(() => {
        (root ?? document)
          .querySelector<HTMLElement>('[aria-invalid="true"], [data-invalid]')
          ?.focus();
      });
    }
    return ok;
  }

  function clear(name: K) {
    setErrors((current) => {
      if (!current[name]) return current;
      const next = { ...current };
      delete next[name];
      return next;
    });
  }

  const reset = React.useCallback(() => setErrors({}), []);

  return { errors, invalid, errorId, validate, clear, reset };
}

/** Loose email shape check for client-side hints; the server's own validator decides. */
export function looksLikeEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}
