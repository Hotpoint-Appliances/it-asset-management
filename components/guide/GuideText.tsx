import { Fragment } from "react";
import { Badge } from "@/components/ui/Badge";
import { AUDIENCE_LABELS, type GuideAudience } from "@/lib/guide/topics";

/** Guide copy with `**bold**` for the names of buttons, menus and fields. */
export function GuideText({ text }: { text: string }) {
  const parts = text.split(/\*\*(.+?)\*\*/g);
  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <strong key={i} className="text-foreground font-semibold">
            {part}
          </strong>
        ) : (
          <Fragment key={i}>{part}</Fragment>
        ),
      )}
    </>
  );
}

/** Who a topic or section is for. Text labels, so the meaning never rests on color. */
export function AudienceBadges({
  who,
  className,
}: {
  who: GuideAudience[];
  className?: string;
}) {
  return (
    <ul className={className ?? "flex flex-wrap gap-1.5"} aria-label="For">
      {who.map((a) => (
        <li key={a}>
          <Badge variant={a === "recipient" ? "outline" : "secondary"}>
            {AUDIENCE_LABELS[a]}
          </Badge>
        </li>
      ))}
    </ul>
  );
}
