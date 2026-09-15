import Link from "next/link";
import { CompassIcon } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { StatusPage } from "@/components/shared/StatusPage";

export default function DashboardNotFound() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center p-4">
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
    </div>
  );
}
