import type { Metadata } from "next";
import { Suspense } from "react";
import { ClipboardCheck, ShieldCheck, Laptop } from "lucide-react";
import { LoginForm } from "@/components/auth/LoginForm";
import { AppLogo } from "@/components/shared/AppLogo";
import { Footer } from "@/components/layout/Footer";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { Skeleton } from "@/components/ui/Skeleton";

function LoginFormSkeleton() {
  return (
    <div className="w-full max-w-sm">
      <div className="mb-8 flex flex-col items-center gap-2 text-center">
        <Skeleton className="mb-2 h-12 w-12 rounded-xl" />
        <Skeleton className="h-9 w-52" />
        <Skeleton className="h-4 w-56" />
      </div>
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Skeleton className="h-3.5 w-12" />
          <Skeleton className="h-10 w-full" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Skeleton className="h-3.5 w-16" />
          <Skeleton className="h-10 w-full" />
        </div>
        <Skeleton className="mt-1 h-10 w-full" />
      </div>
    </div>
  );
}

const highlights = [
  { icon: Laptop, text: "Track every device from purchase to retirement" },
  { icon: ClipboardCheck, text: "Manage assignments and handovers with ease" },
  { icon: ShieldCheck, text: "Keep your inventory accurate and accountable" },
];

export const metadata: Metadata = {
  title: "Sign in",
  description:
    "Sign in to the IT Asset Manager to track your organisation's IT assets.",
};

export default function LoginPage() {
  return (
    <div className="bg-background grid h-dvh overflow-y-auto lg:grid-cols-2">
      {/* Highlights panel on the left from `lg` up, on the shell canvas so the indigo logo in its
          corner stays visible. Below `lg` it's hidden and the logo moves into the form header. */}
      <div className="bg-canvas text-foreground hidden min-h-full flex-col lg:flex">
        <div className="flex items-center gap-2 p-6">
          <div className="flex h-10 items-center gap-2">
            <AppLogo />
            <span className="text-sm font-semibold">IT Asset Manager</span>
          </div>
        </div>
        <div className="flex flex-1 flex-col justify-center gap-10 px-12 pb-22 xl:px-16">
          <div className="flex flex-col gap-3">
            <h2 className="text-4xl font-bold tracking-tight">
              All your IT assets, in one place.
            </h2>
            <p className="text-muted-foreground max-w-md text-base">
              A single source of truth for hardware, software and the people
              who use them.
            </p>
          </div>
          <ul className="flex max-w-md flex-col gap-4">
            {highlights.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3 text-sm">
                <span className="bg-primary/10 text-primary flex h-9 w-9 shrink-0 items-center justify-center rounded-lg">
                  <Icon className="h-4 w-4" />
                </span>
                {text}
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="flex min-h-full flex-col">
        <div className="flex items-center justify-between gap-2 p-4 sm:p-6 lg:justify-end">
          <div className="flex items-center gap-2 lg:hidden">
            <AppLogo />
            <span className="text-sm font-semibold">IT Asset Manager</span>
          </div>
          <ThemeToggle />
        </div>
        <div className="flex flex-1 items-center justify-center p-6">
          <Suspense fallback={<LoginFormSkeleton />}>
            <LoginForm />
          </Suspense>
        </div>
        <Footer />
      </div>
    </div>
  );
}
