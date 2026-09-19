import { Suspense } from "react";
import { Boxes, ClipboardCheck, ShieldCheck, Laptop } from "lucide-react";
import { LoginForm } from "@/components/auth/LoginForm";
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

export default function LoginPage() {
  return (
    <div className="bg-background grid h-dvh overflow-y-auto lg:grid-cols-2">
      <div className="flex min-h-full flex-col">
        <div className="flex items-center justify-between gap-2 p-4 sm:p-6">
          <div className="flex items-center gap-2">
            <div className="bg-primary text-primary-foreground flex h-7 w-7 shrink-0 items-center justify-center rounded-lg">
              <Boxes className="h-4 w-4" />
            </div>
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
      <div className="bg-primary text-primary-foreground hidden flex-col justify-center gap-10 p-12 lg:flex xl:p-16">
        <div className="flex flex-col gap-3">
          <h2 className="text-4xl font-bold tracking-tight">
            All your IT assets, in one place.
          </h2>
          <p className="text-primary-foreground/80 max-w-md text-base">
            A single source of truth for hardware, software and the people who
            use them.
          </p>
        </div>
        <ul className="flex max-w-md flex-col gap-4">
          {highlights.map(({ icon: Icon, text }) => (
            <li key={text} className="flex items-center gap-3 text-sm">
              <span className="bg-primary-foreground/15 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg">
                <Icon className="h-4 w-4" />
              </span>
              {text}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
