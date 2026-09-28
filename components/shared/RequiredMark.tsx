import { cn } from "@/lib/utils";

/** Red asterisk placed at the end of a form label to flag a required field. The asterisk is
 * hidden from assistive tech (it is just a glyph there); the "(required)" text is announced
 * instead. Pair with the input's own `required` attribute for native validation. */
export function RequiredMark({ className }: { className?: string }) {
  return (
    <>
      <span
        aria-hidden="true"
        className={cn("text-destructive ml-0.5", className)}
      >
        *
      </span>
      <span className="sr-only"> (required)</span>
    </>
  );
}
