import type { Metadata } from "next";
import Link from "next/link";
import { ShieldWarningIcon } from "@phosphor-icons/react/ssr";
import { Button } from "@/components/ui/Button";
import { StandalonePage } from "@/components/shared/StandalonePage";
import { StatusPage } from "@/components/shared/StatusPage";

export const metadata: Metadata = {
  title: "Access denied",
  description: "You don't have permission to view this page.",
};

export default function ForbiddenPage() {
  return (
    <StandalonePage>
      <StatusPage
        icon={ShieldWarningIcon}
        iconClassName="text-destructive"
        title="Access denied"
        description="You don't have permission to view this page."
        action={
          <Button asChild>
            <Link href="/">Back to dashboard</Link>
          </Button>
        }
      />
    </StandalonePage>
  );
}
