"use client";

import * as React from "react";
import Link from "next/link";
import { TriangleAlert, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { StatusPage } from "./StatusPage";

/** Shared body of every error boundary (app/(dashboard)/error.tsx, app/error.tsx,
 * app/global-error.tsx). Never shows `error.message`: in production a Server Component error's
 * message is replaced by a generic one anyway, and a client error's could carry internals. The
 * digest is the hash Next also prints in the server log, so a user can quote it to IT. */
export function ErrorFallback({
  error,
  retry,
  showHomeLink = true,
}: {
  error: Error & { digest?: string };
  retry: () => void;
  showHomeLink?: boolean;
}) {
  React.useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center gap-3">
      <StatusPage
        icon={TriangleAlert}
        iconClassName="text-destructive"
        title="Something went wrong"
        description="This page couldn't be loaded. It may be a temporary problem; try again, and contact IT if it keeps happening."
        action={
          <div className="flex flex-wrap justify-center gap-2">
            <Button onClick={() => retry()}>
              <RotateCw className="h-4 w-4" />
              Try again
            </Button>
            {showHomeLink && (
              <Button variant="outline" asChild>
                <Link href="/">Back to dashboard</Link>
              </Button>
            )}
          </div>
        }
      />
      {error.digest && (
        <p className="text-muted-foreground text-xs">
          Reference: <span className="font-mono">{error.digest}</span>
        </p>
      )}
    </div>
  );
}
