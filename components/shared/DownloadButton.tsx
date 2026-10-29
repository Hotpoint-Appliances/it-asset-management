"use client";

import * as React from "react";
import { Download } from "lucide-react";
import { Button, type ButtonProps } from "@/components/ui/Button";
import { useUIStore } from "@/store";

/** `attachment; filename="asset-register-2026-10-27.xlsx"` -> the quoted name. */
function fileNameFrom(disposition: string | null): string | null {
  const match = disposition?.match(/filename="([^"]+)"/);
  return match ? match[1] : null;
}

/** Downloads a server-generated file (the /api/reports exports, the import template). A plain
 * `<a download>` shows nothing while the server builds the workbook, and a failure only surfaces
 * in the browser's download bar; fetching it here gives the button a spinner and turns a failure
 * into an error toast. The routes answer errors as JSON `{ error }`. */
export function DownloadButton({
  href,
  children,
  disabled,
  ...props
}: Omit<ButtonProps, "onClick" | "asChild"> & { href: string }) {
  const addToast = useUIStore((s) => s.addToast);
  const [downloading, setDownloading] = React.useState(false);

  async function handleClick() {
    setDownloading(true);
    try {
      const res = await fetch(href);
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(
          typeof data?.error === "string"
            ? data.error
            : "Something went wrong. Please try again.",
        );
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download =
        fileNameFrom(res.headers.get("Content-Disposition")) ?? "download";
      document.body.appendChild(link);
      link.click();
      link.remove();
      // Revoked on the next task: some browsers start reading the blob after click() returns.
      setTimeout(() => URL.revokeObjectURL(url), 0);
    } catch (err) {
      addToast({
        title: "Download failed",
        description:
          err instanceof Error && err.name !== "TypeError"
            ? err.message
            : "Check your connection and try again.",
        variant: "error",
      });
    } finally {
      setDownloading(false);
    }
  }

  return (
    <Button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      loading={downloading}
      {...props}
    >
      {!downloading && <Download aria-hidden="true" className="h-4 w-4" />}
      {children}
    </Button>
  );
}
