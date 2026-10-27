"use client";

import * as React from "react";
import { useRouteLoadingRouter } from "@/lib/hooks/useRouteLoadingRouter";
import axios from "axios";
import { Loader2, Paperclip, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { EmptyState } from "@/components/shared/EmptyState";
import { useUIStore } from "@/store";
import type { AssetAttachment } from "@/types/assetAttachment";

function errorMessage(err: unknown): string {
  if (axios.isAxiosError(err) && err.response?.data?.error)
    return err.response.data.error;
  return "Something went wrong. Please try again.";
}

export function AssetAttachments({
  assetId,
  initialAttachments,
  canManage,
}: {
  assetId: string;
  initialAttachments: AssetAttachment[];
  canManage: boolean;
}) {
  const router = useRouteLoadingRouter();
  const addToast = useUIStore((s) => s.addToast);
  // null = idle, otherwise the upload's percent sent so far.
  const [uploading, setUploading] = React.useState<number | null>(null);
  const [deleting, setDeleting] = React.useState<AssetAttachment | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(0);
    try {
      const formData = new FormData();
      formData.set("file", file);
      await axios.post(`/api/assets/${assetId}/attachments`, formData, {
        onUploadProgress: (e) => {
          if (e.total) setUploading(Math.round((e.loaded / e.total) * 100));
        },
      });
      router.refresh(() =>
        addToast({ title: "Attachment uploaded", variant: "success" }),
      );
    } catch (err) {
      addToast({
        title: "Upload failed",
        description: errorMessage(err),
        variant: "error",
      });
    } finally {
      setUploading(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleDelete() {
    if (!deleting) return;
    setSubmitting(true);
    try {
      await axios.delete(`/api/assets/${assetId}/attachments/${deleting.id}`);
      setDeleting(null);
      router.refresh(() =>
        addToast({ title: "Attachment deleted", variant: "success" }),
      );
    } catch (err) {
      addToast({
        title: "Could not delete attachment",
        description: errorMessage(err),
        variant: "error",
      });
      setDeleting(null);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {canManage && (
        <div className="flex flex-wrap items-center justify-end gap-3">
          {uploading !== null && (
            <p
              role="status"
              className="text-muted-foreground flex items-center gap-2 text-sm"
            >
              <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
              {uploading < 100 ? `Uploading… ${uploading}%` : "Saving…"}
            </p>
          )}
          <Input
            ref={fileInputRef}
            id="attachment-upload"
            type="file"
            accept="image/jpeg,image/png,image/webp,application/pdf"
            onChange={handleFileChange}
            disabled={uploading !== null}
            className="max-w-xs"
          />
        </div>
      )}

      {initialAttachments.length === 0 ? (
        <EmptyState
          icon={Paperclip}
          title="No attachments yet"
          description="Upload invoices, warranty cards, or extra photos for this asset."
          action={
            canManage ? (
              <Button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading !== null}
                className="gap-1.5"
              >
                {uploading !== null ? (
                  <Loader2 aria-hidden="true" className="animate-spin" />
                ) : (
                  <Upload className="h-4 w-4" />
                )}
                Upload a file
              </Button>
            ) : undefined
          }
        />
      ) : (
        <ul className="flex flex-col gap-2">
          {initialAttachments.map((attachment) => (
            <li
              key={attachment.id}
              className="border-border flex items-center justify-between gap-3 rounded-lg border p-3"
            >
              <a
                href={`/api/assets/${assetId}/attachments/${attachment.id}/file`}
                target="_blank"
                rel="noreferrer"
                className="flex min-w-0 items-center gap-2 text-sm hover:underline"
              >
                <Paperclip className="h-4 w-4 shrink-0" />
                <span className="truncate font-medium">
                  {attachment.fileName}
                </span>
              </a>
              <div className="flex shrink-0 items-center gap-3">
                <span className="text-muted-foreground text-xs">
                  {attachment.uploadedByName} ·{" "}
                  {new Date(attachment.uploadedAt).toLocaleDateString()}
                </span>
                {canManage && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setDeleting(attachment)}
                  >
                    <Trash2 className="h-4 w-4" />
                    <span className="sr-only">Delete</span>
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Delete attachment"
        description={
          <>
            This will permanently delete <strong>{deleting?.fileName}</strong>.
            This cannot be undone.
          </>
        }
        confirmLabel="Delete"
        submittingLabel="Deleting…"
        onConfirm={handleDelete}
        submitting={submitting}
        destructive
      />
    </div>
  );
}
