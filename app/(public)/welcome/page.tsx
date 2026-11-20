import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRightIcon } from "@phosphor-icons/react/ssr";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { conditionBadgeVariant, statusBadgeVariant } from "@/lib/badgeVariants";

export const metadata: Metadata = {
  // Absolute: this is the app's front page, so it carries the app name alone.
  title: { absolute: "IT Asset Manager" },
  description:
    "Hotpoint's register of IT equipment: who has each laptop, desktop and phone, where it is, and everything that's happened to it.",
};

/** An example audit trail for the hero's record preview. Illustrative only: the DEMO- tag
 * matches what `npm run seed:demo` creates, and none of it is read from the database. */
const PREVIEW_LOG = [
  { what: "Issue form EIF-000231 acknowledged", when: "12 Mar 2026" },
  { what: "Transferred to Finance, Head Office", when: "10 Mar 2026" },
  { what: "Repair completed, back to active", when: "21 Jan 2026" },
  { what: "Registered from purchase order", when: "4 Sep 2025" },
];

/** How an asset moves through the system, each stage pointing at its guide topic. */
const STAGES = [
  {
    title: "Register it",
    text: "ICT adds the asset, or imports a batch from Excel, and prints a QR label for it.",
    href: "/guide/registering-assets",
  },
  {
    title: "Hand it over",
    text: "It's assigned to someone, who signs an issue form from a link in their email.",
    href: "/guide/issue-forms",
  },
  {
    title: "Look after it",
    text: "Moves, repairs and condition changes are logged as they happen. Nothing is overwritten.",
    href: "/guide/maintenance",
  },
  {
    title: "Retire it",
    text: "When it's sold, scrapped or written off, it's disposed of with an approver, and its history stays.",
    href: "/guide/disposal",
  },
];

/** The common reasons someone lands here without being signed in. */
const HELP = [
  {
    title: "Signing for equipment?",
    text: "Use the link in your email. You don't need an account to acknowledge an issue form.",
    link: { href: "/guide/issue-forms#recipient", label: "How signing works" },
  },
  {
    title: "Forgotten your password?",
    text: "We'll email a reset link to the address on your account.",
    link: { href: "/forgot-password", label: "Reset your password" },
  },
  {
    title: "Need an account?",
    text: "Accounts are set up by the ICT department. Ask them for access and the right role.",
    link: { href: "/guide#roles", label: "What each role can do" },
  },
];

function RecordPreview() {
  return (
    <figure className="w-full">
      <div className="bg-card border-border overflow-clip rounded-xl border shadow-sm">
        <div className="border-border flex flex-col gap-3 border-b p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-muted-foreground font-mono text-xs">
                DEMO-014
              </p>
              <p className="truncate font-semibold">
                Lenovo ThinkPad T14 Gen 3
              </p>
            </div>
            <div className="flex shrink-0 gap-1.5">
              <Badge variant={statusBadgeVariant("active")}>Active</Badge>
              <Badge variant={conditionBadgeVariant("good")}>Good</Badge>
            </div>
          </div>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <div>
              <dt className="text-muted-foreground text-xs">Owner</dt>
              <dd>W. Kamau</dd>
            </div>
            <div>
              <dt className="text-muted-foreground text-xs">Department</dt>
              <dd>Finance</dd>
            </div>
            <div>
              <dt className="text-muted-foreground text-xs">Location</dt>
              <dd>Head Office, 2nd floor</dd>
            </div>
            <div>
              <dt className="text-muted-foreground text-xs">Warranty</dt>
              <dd>Until Sep 2028</dd>
            </div>
          </dl>
        </div>
        <div className="bg-canvas/60 p-5">
          <p className="text-muted-foreground mb-3 text-xs font-medium">
            Audit log
          </p>
          <ol className="flex flex-col">
            {PREVIEW_LOG.map(({ what, when }, i) => (
              <li key={what} className="relative flex gap-3 pb-3 last:pb-0">
                {/* The rail joining the dots, stopping at the last entry. */}
                {i < PREVIEW_LOG.length - 1 && (
                  <span
                    aria-hidden="true"
                    className="bg-border absolute top-3 bottom-0 left-[3px] w-px"
                  />
                )}
                <span
                  aria-hidden="true"
                  className={`mt-1.5 h-[7px] w-[7px] shrink-0 rounded-full ${i === 0 ? "bg-primary" : "bg-muted-foreground/40"}`}
                />
                <div className="flex min-w-0 flex-1 flex-wrap items-baseline justify-between gap-x-3 text-sm">
                  <span className="min-w-0">{what}</span>
                  <span className="text-muted-foreground text-xs">{when}</span>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
      <figcaption className="text-muted-foreground mt-2 text-xs">
        An example asset record.
      </figcaption>
    </figure>
  );
}

/** The signed-out homepage. proxy.ts serves it at `/` when there's no session (the dashboard
 * takes `/` otherwise) and redirects direct visits to `/welcome` back to `/`. */
export default function WelcomePage() {
  return (
    <main>
      <section className="mx-auto grid max-w-6xl grid-cols-[minmax(0,1fr)] items-center gap-12 px-4 pt-12 pb-16 sm:px-6 lg:grid-cols-[minmax(0,1fr)_26rem] lg:gap-16 lg:pt-20 lg:pb-24">
        <div className="flex flex-col gap-6">
          <p className="text-primary text-sm font-medium">
            Hotpoint Appliances · ICT department
          </p>
          <h1 className="max-w-xl text-3xl font-bold tracking-tight text-balance sm:text-4xl">
            Who has which laptop, where it is, and what&apos;s happened to it.
          </h1>
          <p className="text-muted-foreground max-w-xl text-base text-pretty">
            IT Asset Manager is where ICT keeps the record of every laptop,
            desktop and phone the company owns: who it&apos;s issued to, the
            forms they signed, its repairs, and how it was finally disposed of.
          </p>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
            <Button asChild size="lg">
              <Link href="/login">Sign in</Link>
            </Button>
            <Link
              href="/guide"
              className="text-primary inline-flex items-center gap-1.5 text-sm font-medium underline-offset-4 hover:underline"
            >
              How it works
              <ArrowRightIcon weight="bold" className="h-4 w-4" />
            </Link>
          </div>
        </div>
        <RecordPreview />
      </section>

      <section
        aria-labelledby="stages-heading"
        className="bg-canvas border-border border-y"
      >
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[18rem_minmax(0,1fr)] lg:gap-16 lg:py-20">
          <div className="flex flex-col gap-3">
            <h2
              id="stages-heading"
              className="text-2xl font-semibold tracking-tight"
            >
              From purchase to disposal
            </h2>
            <p className="text-muted-foreground text-sm">
              Every asset goes through the same four stages, and every change
              along the way is recorded with who made it and when.
            </p>
          </div>
          <ol className="border-border divide-border divide-y border-t sm:border-t-0">
            {STAGES.map(({ title, text, href }, i) => (
              <li
                key={title}
                className="grid gap-x-6 gap-y-1 py-5 first:pt-5 sm:grid-cols-[3rem_minmax(0,1fr)_auto] sm:items-baseline sm:first:pt-0"
              >
                <span className="text-muted-foreground font-mono text-sm">
                  0{i + 1}
                </span>
                <div className="flex flex-col gap-1">
                  <h3 className="font-semibold">{title}</h3>
                  <p className="text-muted-foreground text-sm">{text}</p>
                </div>
                <Link
                  href={href}
                  className="text-primary mt-1 text-sm font-medium whitespace-nowrap underline-offset-4 hover:underline sm:mt-0"
                >
                  Read more
                  <span className="sr-only">
                    {" "}
                    about how to {title.toLowerCase()}
                  </span>
                </Link>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section
        aria-labelledby="help-heading"
        className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:py-20"
      >
        <h2
          id="help-heading"
          className="mb-8 text-2xl font-semibold tracking-tight"
        >
          Not here to sign in?
        </h2>
        <ul className="grid gap-x-10 gap-y-8 md:grid-cols-3">
          {HELP.map(({ title, text, link }) => (
            <li key={title} className="border-primary/30 border-l-2 pl-4">
              <h3 className="font-semibold">{title}</h3>
              <p className="text-muted-foreground mt-1 text-sm">{text}</p>
              <Link
                href={link.href}
                className="text-primary mt-3 inline-flex items-center gap-1.5 text-sm font-medium underline-offset-4 hover:underline"
              >
                {link.label}
                <ArrowRightIcon weight="bold" className="h-3.5 w-3.5" />
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
