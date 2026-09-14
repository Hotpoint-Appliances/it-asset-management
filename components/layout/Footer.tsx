import { cn } from "@/lib/utils";

export function Footer({ className }: { className?: string }) {
  return (
    <footer
      className={cn(
        "text-muted-foreground flex flex-col items-center justify-center gap-1 px-4 py-4 text-xs sm:flex-row sm:px-6",
        className,
      )}
    >
      <span>
        &copy; {new Date().getFullYear()} IT Asset Manager - Internal Tool
      </span>
    </footer>
  );
}
