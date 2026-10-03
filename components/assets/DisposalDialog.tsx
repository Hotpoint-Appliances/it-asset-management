"use client";

import * as React from "react";
import { useRouteLoadingRouter } from "@/lib/hooks/useRouteLoadingRouter";
import axios from "axios";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { DatePicker } from "@/components/ui/DatePicker";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogBody,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/Dialog";
import { useUIStore } from "@/store";
import { useSyncOnOpen } from "@/lib/hooks/useSyncOnOpen";
import type { DisposalMethod } from "@/types/disposal";
import { RequiredMark } from "@/components/shared/RequiredMark";
import { FieldError } from "@/components/shared/FieldError";
import { useFieldErrors } from "@/lib/hooks/useFieldErrors";
import { todayIso } from "@/lib/format";

function errorMessage(err: unknown): string {
  if (axios.isAxiosError(err) && err.response?.data?.error)
    return err.response.data.error;
  return "Something went wrong. Please try again.";
}

const METHODS: { value: DisposalMethod; label: string }[] = [
  { value: "sold", label: "Sold" },
  { value: "scrapped", label: "Scrapped" },
  { value: "donated", label: "Donated" },
  { value: "lost", label: "Lost" },
  { value: "stolen", label: "Stolen" },
  { value: "other", label: "Other" },
];

/** Disposal flow (phase-5-asset-lifecycle Step 5), a dedicated action, not a status dropdown
 * option (docs/asset-lifecycle-flow.md rule 6), with the consequence stated explicitly per
 * itam-design-system's "destructive/terminal actions" rule. `approved_by` is not a form field,
 * see lib/db/disposals.ts's disposeAsset() doc comment. */
export function DisposalDialog({
  assetId,
  assetName,
  open,
  onOpenChange,
}: {
  assetId: string;
  assetName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouteLoadingRouter();
  const addToast = useUIStore((s) => s.addToast);
  const [disposalDate, setDisposalDate] = React.useState("");
  const [disposalMethod, setDisposalMethod] =
    React.useState<DisposalMethod>("sold");
  const [disposalValue, setDisposalValue] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [attachment, setAttachment] = React.useState<File | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const fields = useFieldErrors<"disposalDate" | "disposalValue">();
  const fieldId = React.useId();

  useSyncOnOpen(open, () => {
    setDisposalDate(todayIso());
    setDisposalMethod("sold");
    setDisposalValue("");
    setNotes("");
    setAttachment(null);
    setError(null);
    fields.reset();
  });

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const value = disposalValue.trim();
    const ok = fields.validate(
      {
        disposalDate: !disposalDate && "Select the disposal date.",
        disposalValue:
          value !== "" &&
          !(Number(value) >= 0) &&
          "Enter an amount of 0 or more, or leave it blank.",
      },
      e.currentTarget,
    );
    if (!ok) return;
    setSubmitting(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.set("disposalDate", disposalDate);
      formData.set("disposalMethod", disposalMethod);
      formData.set("disposalValue", disposalValue);
      formData.set("notes", notes);
      if (attachment) formData.set("attachment", attachment);
      await axios.post(`/api/assets/${assetId}/dispose`, formData);
      addToast({ title: "Asset disposed", variant: "success" });
      onOpenChange(false);
      router.refresh();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Dispose asset</DialogTitle>
          <DialogDescription>
            This will mark <strong>{assetName}</strong> as disposed, set its
            status to a terminal state, and remove it from active reports. This
            cannot be undone from the app.
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={handleSubmit}
          noValidate
          className="flex min-h-0 flex-1 flex-col"
        >
          <DialogBody>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor={`${fieldId}-date`}
                  className="text-sm font-medium"
                >
                  Disposal date
                  <RequiredMark />
                </label>
                <DatePicker
                  id={`${fieldId}-date`}
                  required
                  value={disposalDate}
                  onChange={(v) => {
                    setDisposalDate(v);
                    fields.clear("disposalDate");
                  }}
                  {...fields.invalid("disposalDate")}
                />
                <FieldError
                  id={fields.errorId("disposalDate")}
                  message={fields.errors.disposalDate}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor={`${fieldId}-method`}
                  className="text-sm font-medium"
                >
                  Method
                </label>
                <Select
                  id={`${fieldId}-method`}
                  value={disposalMethod}
                  onChange={(e) =>
                    setDisposalMethod(e.target.value as DisposalMethod)
                  }
                >
                  {METHODS.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor={`${fieldId}-value`}
                  className="text-sm font-medium"
                >
                  Disposal value (KES)
                </label>
                <Input
                  id={`${fieldId}-value`}
                  type="number"
                  step="0.01"
                  min="0"
                  value={disposalValue}
                  onChange={(e) => {
                    setDisposalValue(e.target.value);
                    fields.clear("disposalValue");
                  }}
                  {...fields.invalid("disposalValue")}
                />
                <FieldError
                  id={fields.errorId("disposalValue")}
                  message={fields.errors.disposalValue}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor={`${fieldId}-attachment`}
                  className="text-sm font-medium"
                >
                  Attachment
                </label>
                <Input
                  id={`${fieldId}-attachment`}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,application/pdf"
                  onChange={(e) => setAttachment(e.target.files?.[0] ?? null)}
                />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor={`${fieldId}-notes`}
                className="text-sm font-medium"
              >
                Notes
              </label>
              <textarea
                id={`${fieldId}-notes`}
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="border-border bg-background focus-visible:ring-ring flex w-full rounded-lg border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:outline-none"
              />
            </div>

            {error && (
              <p role="alert" className="text-destructive text-sm">
                {error}
              </p>
            )}
          </DialogBody>

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" variant="destructive" disabled={submitting}>
              {submitting ? "Disposing…" : "Dispose asset"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
