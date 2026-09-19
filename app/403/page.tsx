import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { StatusPage } from "@/components/shared/StatusPage";

export default function ForbiddenPage() {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <StatusPage
        icon={ShieldAlert}
        iconClassName="text-destructive"
        title="Access denied"
        description="You don't have permission to view this page."
        action={
          <Button asChild>
            <Link href="/">Back to dashboard</Link>
          </Button>
        }
      />
    </div>
  );
}
