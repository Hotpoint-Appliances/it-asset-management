import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";

export default function DashboardPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Dashboard</CardTitle>
      </CardHeader>
      <CardContent className="text-muted-foreground text-sm">
        Coming soon — fleet overview widgets land in Phase 6.
      </CardContent>
    </Card>
  );
}
