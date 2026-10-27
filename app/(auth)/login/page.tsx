import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginForm } from "@/components/auth/LoginForm";
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

export const metadata: Metadata = {
  title: "Sign in",
  description:
    "Sign in to the IT Asset Manager to track your organisation's IT assets.",
};

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFormSkeleton />}>
      <LoginForm />
    </Suspense>
  );
}
