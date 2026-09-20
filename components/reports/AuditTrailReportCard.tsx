"use client";

import * as React from "react";
import { ScrollText } from "lucide-react";
import { DatePicker } from "@/components/ui/DatePicker";
import { ReportCard } from "./ReportCard";

/** Audit trail export with an optional date range; both ends blank exports the full trail. */
export function AuditTrailReportCard() {
  const [from, setFrom] = React.useState("");
  const [to, setTo] = React.useState("");

  const params = new URLSearchParams();
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  const href = `/api/reports/audit-trail${params.size ? `?${params.toString()}` : ""}`;
  const rangeInvalid = !!from && !!to && from > to;

  return (
    <ReportCard
      icon={ScrollText}
      title="Audit trail"
      description="Every recorded change across assets, with old and new values resolved to names. Leave the dates empty for the full history."
      href={rangeInvalid ? "#" : href}
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="audit-from" className="text-sm font-medium">
            From
          </label>
          <DatePicker
            id="audit-from"
            value={from}
            onChange={setFrom}
            max={to || undefined}
            placeholder="Start"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="audit-to" className="text-sm font-medium">
            To
          </label>
          <DatePicker
            id="audit-to"
            value={to}
            onChange={setTo}
            min={from || undefined}
            placeholder="Today"
          />
        </div>
      </div>
    </ReportCard>
  );
}
