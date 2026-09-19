import { Suspense } from "react";
import { Boxes } from "lucide-react";
import { LoginForm } from "@/components/auth/LoginForm";
import { Footer } from "@/components/layout/Footer";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { Skeleton } from "@/components/ui/Skeleton";

function LoginFormSkeleton() {
  return (
    <div className="border-border bg-card w-full max-w-sm rounded-xl border p-6 shadow-md">
      <div className="mb-6 flex flex-col items-center gap-1.5 text-center">
        <Skeleton className="mb-1 h-11 w-11 rounded-xl" />
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-4 w-48" />
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

export default function LoginPage() {
  return (
    <div className="bg-background flex h-dvh flex-col overflow-y-auto">
      <div className="flex items-center justify-between gap-2 p-6 sm:p-8">
        <div className="flex items-center gap-2">
          <div className="bg-primary text-primary-foreground flex h-7 w-7 shrink-0 items-center justify-center rounded-lg">
            <Boxes className="h-4 w-4" />
          </div>
          <span className="text-sm font-semibold">IT Asset Manager</span>
        </div>
        <ThemeToggle />
      </div>
      <div className="flex flex-1 items-center justify-center p-4">
        <Suspense fallback={<LoginFormSkeleton />}>
          <LoginForm />
        </Suspense>
      </div>
      <Footer />
    </div>
  );
}
