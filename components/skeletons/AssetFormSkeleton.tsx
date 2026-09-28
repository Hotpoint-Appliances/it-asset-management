import type { ReactNode } from "react";
import { Skeleton } from "@/components/ui/Skeleton";
import { RequiredMark } from "@/components/shared/RequiredMark";
import { cn } from "@/lib/utils";

/** Mirrors components/assets/AssetForm.tsx section for section. Like the form itself it sits
 * directly on the page (no card), and owner fields show the "External / no login" mode that a
 * new asset defaults to. */
export function AssetFormSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <Section title="Basic information">
        <Field label="Asset tag" required />
        <Field label="Name" required />
        <Field label="Category" required />
        <Field label="Model number" />
        <Field label="Serial number" />
      </Section>

      <Section title="Assignment">
        <Field label="Location" required />
        <Field label="Department" required />
        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <span className="text-sm font-medium">
            Owner
            <RequiredMark />
          </span>
          <div className="flex gap-1.5">
            <Skeleton className="h-9 w-28" />
            <Skeleton className="h-9 w-40" />
          </div>
        </div>
        <Field label="Owner name" required />
        <Field label="Owner email" />
      </Section>

      <Section title="Condition & status">
        <Field label="Condition" required />
        <Field label="Status" required />
      </Section>

      <Section title="Procurement">
        <Field label="Vendor" />
        <Field label="Purchase date" />
        <Field label="Purchase cost (KES)" />
        <Field label="Warranty expiry" />
      </Section>

      <Section title="Depreciation">
        <Field label="Method" />
        <Field label="Useful life (months)" />
        <Field label="Salvage value (KES)" />
      </Section>

      <Section title="Image & notes">
        <Field label="Image">
          <div className="flex items-center gap-3">
            <Skeleton className="border-border h-16 w-16 shrink-0 border" />
            <Skeleton className="h-10 w-full max-w-64" />
          </div>
        </Field>
        <Field label="Notes" className="sm:col-span-2">
          <Skeleton className="h-24 w-full" />
        </Field>
      </Section>

      <div className="flex justify-end gap-2">
        <Skeleton className="h-10 w-20" />
        <Skeleton className="h-10 w-32" />
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="border-border flex flex-col gap-4 border-b pb-6 last:border-b-0 last:pb-0">
      <h2 className="text-sm font-semibold tracking-wide uppercase">{title}</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{children}</div>
    </div>
  );
}

function Field({
  label,
  required = false,
  className,
  children,
}: {
  label: string;
  required?: boolean;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <span className="text-sm font-medium">
        {label}
        {required && <RequiredMark />}
      </span>
      {children ?? <Skeleton className="h-10 w-full" />}
    </div>
  );
}
