import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowRightIcon } from "@phosphor-icons/react/ssr";
import { AppLogo } from "@/components/shared/AppLogo";
import { Footer } from "@/components/layout/Footer";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { cn } from "@/lib/utils";

/** The logo and name lead back to the homepage. */
const homeLinkClass =
  "focus-visible:ring-ring flex h-10 items-center gap-2 rounded-lg focus-visible:ring-2 focus-visible:outline-none";

/** Practical notes for whoever is signing in, resetting a password or arriving from an email.
 * Same plain tone as the homepage; keep them true to the app (see the guide note in CLAUDE.md). */
const notes = [
  {
    title: "Use your work email",
    text: "Accounts are set up by the ICT department, which also sets your role. A session lasts 8 hours.",
  },
  {
    title: "Signing for equipment?",
    text: "You don't need to sign in. Open the link in your issue form email instead.",
  },
  {
    title: "Locked out?",
    text: "Reset your password by email, or ask ICT to set a new one for you.",
  },
];

/** The signed-out frame shared by sign-in, forgot password and reset password. Public pages use
 * `.scroll-native` (the browser's scrollbar with arrow buttons, in the theme's colors) rather than
 * the dashboard's `.scroll-area`. */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="bg-background scroll-native grid h-dvh overflow-y-auto lg:grid-cols-2">
      {/* Intro panel on the left from `lg` up, on the shell canvas so the indigo logo in its
          corner stays visible. Below `lg` it's hidden and the logo moves into the form header. */}
      <div className="bg-canvas text-foreground hidden min-h-full flex-col lg:flex">
        <div className="flex items-center gap-2 p-6">
          <Link href="/" className={homeLinkClass}>
            <AppLogo />
            <span className="text-sm font-semibold">IT Asset Manager</span>
          </Link>
        </div>
        <div className="flex flex-1 flex-col justify-center gap-8 px-12 pb-16 xl:px-16">
          <div className="flex flex-col gap-4">
            <p className="text-primary text-sm font-medium">
              Hotpoint Appliances · ICT department
            </p>
            <h2 className="max-w-lg text-3xl font-bold tracking-tight xl:text-4xl">
              The register of every laptop, desktop and phone we own.
            </h2>
            <p className="text-muted-foreground max-w-md text-base">
              Sign in to look up an asset, see who it&apos;s issued to, and
              follow its history from purchase to disposal.
            </p>
          </div>
          <ul className="flex max-w-md flex-col gap-4">
            {notes.map(({ title, text }) => (
              <li key={title} className="border-primary/30 border-l-2 pl-4">
                <p className="text-sm font-semibold">{title}</p>
                <p className="text-muted-foreground mt-0.5 text-sm">{text}</p>
              </li>
            ))}
          </ul>
          <Link
            href="/guide"
            className="text-primary inline-flex w-fit items-center gap-1.5 text-sm font-medium underline-offset-4 hover:underline"
          >
            New here? Read the guide
            <ArrowRightIcon weight="bold" className="h-4 w-4" />
          </Link>
        </div>
      </div>
      <div className="flex min-h-full flex-col">
        <div className="flex items-center justify-between gap-2 p-4 sm:p-6 lg:justify-end">
          <Link href="/" className={cn(homeLinkClass, "lg:hidden")}>
            <AppLogo />
            <span className="text-sm font-semibold">IT Asset Manager</span>
          </Link>
          <ThemeToggle />
        </div>
        <div className="flex flex-1 items-center justify-center p-6">
          {children}
        </div>
        <Footer />
      </div>
    </div>
  );
}
