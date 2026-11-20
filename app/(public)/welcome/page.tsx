import type { Metadata } from "next";
import Link from "next/link";
import {
  BellIcon,
  BookOpenTextIcon,
  ChartBarIcon,
  ClockCounterClockwiseIcon,
  PackageIcon,
  QrCodeIcon,
  ShieldCheckIcon,
  SignatureIcon,
  UserGearIcon,
  UsersThreeIcon,
  WrenchIcon,
  ArrowsLeftRightIcon,
  EyeIcon,
} from "@phosphor-icons/react/ssr";
import { Button } from "@/components/ui/Button";

export const metadata: Metadata = {
  // Absolute: this is the app's front page, so it carries the app name alone.
  title: { absolute: "IT Asset Manager" },
  description:
    "Track every IT asset from purchase to disposal: registration and QR labels, assignment, maintenance, issue forms, reports and notifications.",
};

const features = [
  {
    icon: QrCodeIcon,
    title: "Register and label",
    text: "Add assets one at a time or import them from Excel, then print QR labels that open the asset's record.",
  },
  {
    icon: ArrowsLeftRightIcon,
    title: "Assign and transfer",
    text: "Move assets between people, departments and locations, with every change written to the audit trail.",
  },
  {
    icon: SignatureIcon,
    title: "Issue forms",
    text: "Hand equipment over with an issue form that the recipient acknowledges or disputes from an emailed link.",
  },
  {
    icon: WrenchIcon,
    title: "Maintenance",
    text: "Log repairs, services and inspections. Starting a repair marks the asset in repair and finishing it restores its status.",
  },
  {
    icon: ChartBarIcon,
    title: "Dashboard and reports",
    text: "See the fleet at a glance and export the asset register, depreciation, disposals and the audit trail to Excel.",
  },
  {
    icon: BellIcon,
    title: "Notifications",
    text: "Get in-app and email alerts for warranties about to expire, maintenance coming due and new assignments.",
  },
];

const roles = [
  {
    icon: UserGearIcon,
    name: "Admin",
    text: "Everything an asset manager can do, plus users, lookup lists and system settings.",
  },
  {
    icon: UsersThreeIcon,
    name: "Asset manager",
    text: "Registers, assigns, maintains and disposes of assets across every department.",
  },
  {
    icon: EyeIcon,
    name: "Viewer",
    text: "Read-only access to their own department's assets, dashboard and reports.",
  },
];

/** The signed-out homepage. proxy.ts serves it at `/` when there's no session (the dashboard
 * takes `/` otherwise) and redirects direct visits to `/welcome` back to `/`. */
export default function WelcomePage() {
  return (
    <main>
      <section className="mx-auto flex max-w-6xl flex-col items-center gap-6 px-4 pt-16 pb-14 text-center sm:px-6 sm:pt-24 sm:pb-20">
        <span className="bg-primary/10 text-primary inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium">
          <PackageIcon weight="bold" className="h-3.5 w-3.5" />
          Hotpoint IT asset management
        </span>
        <h1 className="max-w-3xl text-4xl font-bold tracking-tight text-balance sm:text-5xl">
          All your IT assets, in one place.
        </h1>
        <p className="text-muted-foreground max-w-2xl text-base text-pretty sm:text-lg">
          A single source of truth for hardware, software and the people who use
          them, from the day an asset is bought to the day it&apos;s disposed
          of.
        </p>
        <div className="flex w-full flex-col justify-center gap-3 sm:w-auto sm:flex-row">
          <Button asChild size="lg">
            <Link href="/login">Sign in</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/guide">
              <BookOpenTextIcon weight="bold" />
              Read the guide
            </Link>
          </Button>
        </div>
      </section>

      <section
        aria-labelledby="features-heading"
        className="bg-canvas border-border border-y"
      >
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
          <div className="mb-10 flex flex-col gap-2 text-center">
            <h2
              id="features-heading"
              className="text-2xl font-semibold tracking-tight sm:text-3xl"
            >
              The whole asset lifecycle
            </h2>
            <p className="text-muted-foreground mx-auto max-w-2xl text-sm sm:text-base">
              Every change is recorded, so you can always tell who had what,
              where it was and what happened to it.
            </p>
          </div>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {features.map(({ icon: Icon, title, text }) => (
              <li
                key={title}
                className="bg-card border-border flex flex-col gap-3 rounded-xl border p-6 shadow-sm"
              >
                <span className="bg-primary/10 text-primary flex h-10 w-10 items-center justify-center rounded-lg">
                  <Icon weight="bold" className="h-5 w-5" />
                </span>
                <h3 className="font-semibold">{title}</h3>
                <p className="text-muted-foreground text-sm">{text}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section
        aria-labelledby="roles-heading"
        className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20"
      >
        <div className="mb-10 flex flex-col gap-2 text-center">
          <h2
            id="roles-heading"
            className="text-2xl font-semibold tracking-tight sm:text-3xl"
          >
            Access that fits the job
          </h2>
          <p className="text-muted-foreground mx-auto max-w-2xl text-sm sm:text-base">
            Accounts are created by an admin. What you can see and do depends on
            your role.
          </p>
        </div>
        <ul className="grid gap-4 md:grid-cols-3">
          {roles.map(({ icon: Icon, name, text }) => (
            <li
              key={name}
              className="border-border flex gap-4 rounded-xl border p-5"
            >
              <span className="bg-muted text-foreground flex h-10 w-10 shrink-0 items-center justify-center rounded-lg">
                <Icon weight="bold" className="h-5 w-5" />
              </span>
              <div className="flex flex-col gap-1">
                <h3 className="font-semibold">{name}</h3>
                <p className="text-muted-foreground text-sm">{text}</p>
              </div>
            </li>
          ))}
        </ul>
        <div className="mt-12 flex flex-col items-center gap-4 text-center">
          <div className="text-muted-foreground flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm">
            <span className="inline-flex items-center gap-2">
              <ShieldCheckIcon weight="bold" className="h-4 w-4" />
              Role-based access
            </span>
            <span className="inline-flex items-center gap-2">
              <ClockCounterClockwiseIcon weight="bold" className="h-4 w-4" />
              Full audit trail
            </span>
          </div>
          <p className="text-muted-foreground text-sm">
            New here?{" "}
            <Link
              href="/guide"
              className="text-primary font-medium underline-offset-4 hover:underline"
            >
              Start with the guide
            </Link>
            , or ask an admin for an account.
          </p>
        </div>
      </section>
    </main>
  );
}
