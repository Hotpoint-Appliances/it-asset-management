/** The message under an invalid field, referenced by that field's aria-describedby (see
 * lib/hooks/useFieldErrors.ts). Renders nothing when there's no message. Paired with the
 * field's aria-invalid border, so the error is never signalled by colour alone. */
export function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="text-destructive text-xs">
      {message}
    </p>
  );
}
