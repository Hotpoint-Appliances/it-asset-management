import Link from "next/link";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/Card";
import { LinkProgress } from "@/components/layout/LinkProgress";
import { settingsSections } from "@/components/layout/settings-sections";

export default function SettingsIndexPage() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {settingsSections.map((section) => (
        <Link key={section.href} href={section.href}>
          <Card className="hover:bg-muted/50 h-full transition-colors">
            <CardHeader className="flex-row items-center gap-3 space-y-0">
              <section.icon className="text-muted-foreground h-5 w-5" />
              <div>
                <CardTitle className="text-base">{section.label}</CardTitle>
                <CardDescription>{section.description}</CardDescription>
              </div>
            </CardHeader>
          </Card>
          <LinkProgress />
        </Link>
      ))}
    </div>
  );
}
