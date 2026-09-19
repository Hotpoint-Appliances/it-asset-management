import Link from "next/link";
import { cookies } from "next/headers";
import { CompassIcon } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/Button";
import { StatusPage } from "@/components/shared/StatusPage";
import { getSession } from "@/lib/auth/session";

export default async function NotFound() {
  const session = await getSession();

  const content = (
    <StatusPage
      icon={CompassIcon}
      title="Page not found"
      description="The page you're looking for doesn't exist or hasn't been built yet."
      action={
        <Button asChild>
          <Link href="/">Back to dashboard</Link>
        </Button>
      }
    />
  );

  if (session) {
    const sidebarCollapsed =
      (await cookies()).get("itam_sidebar_collapsed")?.value === "1";
    return (
      <AppShell sidebarCollapsed={sidebarCollapsed}>
        <div className="flex min-h-[60vh] items-center justify-center p-4">
          {content}
        </div>
      </AppShell>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      {content}
    </div>
  );
}
