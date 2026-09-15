import { Suspense } from "react";
import { Boxes } from "lucide-react";
import { LoginForm } from "@/components/auth/LoginForm";
import { Footer } from "@/components/layout/Footer";
import { ThemeToggle } from "@/components/layout/ThemeToggle";

export default function LoginPage() {
  return (
    <div className="bg-sidebar flex min-h-screen flex-col">
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
        <Suspense>
          <LoginForm />
        </Suspense>
      </div>
      <Footer />
    </div>
  );
}
