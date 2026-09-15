import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { requireSession } from "@/lib/auth/session";

export default async function Home() {
  await requireSession();

  return (
    <AppShell>
      <Card>
        <CardHeader>
          <CardTitle>Dashboard</CardTitle>
        </CardHeader>
        <CardContent className="text-muted-foreground text-sm">
          Coming soon — fleet overview widgets land in Phase 6.
        </CardContent>
      </Card>
    </AppShell>
  );
}
