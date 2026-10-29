"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import type { MonthlyMovement } from "@/types/dashboard";

const SERIES = [
  {
    key: "added",
    label: "Added",
    color: "var(--primary)",
    dash: undefined,
  },
  {
    key: "disposed",
    label: "Disposed",
    color: "var(--muted-foreground)",
    dash: "5 4",
  },
] as const;

/** "2026-03" -> "Mar 26", built from the parts so no timezone can shift the month. */
function monthLabel(month: string, withYear = false): string {
  const [y, m] = month.split("-").map(Number);
  const name = new Date(Date.UTC(y, m - 1, 1)).toLocaleString("en-KE", {
    month: "short",
    timeZone: "UTC",
  });
  return withYear ? `${name} ${y}` : `${name} ${String(y).slice(2)}`;
}

/** Assets added vs disposed per month (Recharts). The header totals and a visually hidden table
 * carry the same numbers, so the lines are never the only way to read them; the two series
 * also differ by dash, not just color. */
export function MovementTrendCard({ data }: { data: MonthlyMovement[] }) {
  const totals = {
    added: data.reduce((sum, d) => sum + d.added, 0),
    disposed: data.reduce((sum, d) => sum + d.disposed, 0),
  };
  return (
    <Card className="lg:col-span-2">
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-x-4 gap-y-2 pb-3">
        <div className="flex flex-col gap-1.5">
          <CardTitle className="text-base">Added vs disposed</CardTitle>
          <p className="text-muted-foreground text-xs">Last 12 months</p>
        </div>
        <ul className="flex gap-4 text-sm">
          {SERIES.map((s) => (
            <li key={s.key} className="flex items-center gap-2">
              <svg width="18" height="8" aria-hidden>
                <line
                  x1="1"
                  y1="4"
                  x2="17"
                  y2="4"
                  stroke={s.color}
                  strokeWidth="2.5"
                  strokeDasharray={s.dash}
                  strokeLinecap="round"
                />
              </svg>
              {s.label}
              <span className="font-semibold tabular-nums">
                {totals[s.key]}
              </span>
            </li>
          ))}
        </ul>
      </CardHeader>
      <CardContent className="pt-0">
        <div aria-hidden className="h-56 w-full">
          <LineChart
            responsive
            data={data}
            style={{ width: "100%", height: "100%" }}
            margin={{ top: 8, right: 8, bottom: 0, left: -24 }}
            accessibilityLayer={false}
          >
            <CartesianGrid
              vertical={false}
              stroke="var(--border)"
              strokeDasharray="3 3"
            />
            <XAxis
              dataKey="month"
              tickFormatter={(m: string) => monthLabel(m)}
              tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
              tickLine={false}
              axisLine={{ stroke: "var(--border)" }}
              interval="preserveStartEnd"
              minTickGap={12}
            />
            <YAxis
              allowDecimals={false}
              tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              labelFormatter={(m) => monthLabel(String(m), true)}
              contentStyle={{
                background: "var(--card)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                fontSize: 12,
              }}
              labelStyle={{ color: "var(--foreground)", fontWeight: 600 }}
              cursor={{ stroke: "var(--border)" }}
            />
            {SERIES.map((s) => (
              <Line
                key={s.key}
                type="linear"
                dataKey={s.key}
                name={s.label}
                stroke={s.color}
                strokeWidth={2.5}
                strokeDasharray={s.dash}
                dot={{ r: 2.5, fill: s.color, strokeDasharray: "" }}
                activeDot={{ r: 4 }}
                isAnimationActive={false}
              />
            ))}
          </LineChart>
        </div>
        <table className="sr-only">
          <caption>Assets added and disposed per month</caption>
          <thead>
            <tr>
              <th scope="col">Month</th>
              <th scope="col">Added</th>
              <th scope="col">Disposed</th>
            </tr>
          </thead>
          <tbody>
            {data.map((d) => (
              <tr key={d.month}>
                <th scope="row">{monthLabel(d.month, true)}</th>
                <td>{d.added}</td>
                <td>{d.disposed}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
