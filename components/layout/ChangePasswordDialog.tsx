"use client";

import * as React from "react";
import axios from "axios";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { PasswordInput } from "@/components/ui/PasswordInput";
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
import { RequiredMark } from "@/components/shared/RequiredMark";
import { FieldError } from "@/components/shared/FieldError";
import { useFieldErrors } from "@/lib/hooks/useFieldErrors";
import { useSyncOnOpen } from "@/lib/hooks/useSyncOnOpen";
import { useUIStore } from "@/store";

type Field = "currentPassword" | "newPassword" | "confirmPassword";

const MIN_LENGTH = 8;

/** Self-service password change from the user menu. The server re-checks the current password
 * and signs out the user's other sessions; this one stays signed in. */
export function ChangePasswordDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const addToast = useUIStore((s) => s.addToast);
  const [values, setValues] = React.useState<Record<Field, string>>({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const fields = useFieldErrors<Field>();
  const idPrefix = React.useId();

  useSyncOnOpen(open, () => {
    setValues({ currentPassword: "", newPassword: "", confirmPassword: "" });
    setError(null);
    fields.reset();
  });

  function set(name: Field, value: string) {
    setValues((v) => ({ ...v, [name]: value }));
    fields.clear(name);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const { currentPassword, newPassword, confirmPassword } = values;
    const ok = fields.validate(
      {
        currentPassword: !currentPassword && "Enter your current password.",
        newPassword: !newPassword
          ? "Enter a new password."
          : newPassword.length < MIN_LENGTH
            ? `Use at least ${MIN_LENGTH} characters.`
            : newPassword === currentPassword &&
              "Choose a password different from your current one.",
        confirmPassword: !confirmPassword
          ? "Re-enter the new password."
          : confirmPassword !== newPassword && "Passwords don't match.",
      },
      event.currentTarget,
    );
    if (!ok) return;
    setSubmitting(true);
    setError(null);
    try {
      await axios.post("/api/auth/password", { currentPassword, newPassword });
      onOpenChange(false);
      addToast({
        title: "Password changed",
        description: "You've been signed out on other devices.",
        variant: "success",
      });
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 429) {
        // nginx's limit_req answers with an HTML page, as on the login form.
        setError("Too many attempts. Wait a minute and try again.");
      } else if (
        axios.isAxiosError(err) &&
        err.response?.data?.field === "currentPassword"
      ) {
        fields.validate(
          { currentPassword: err.response.data.error as string },
          event.currentTarget,
        );
      } else if (axios.isAxiosError(err) && err.response?.data?.error) {
        setError(err.response.data.error as string);
      } else {
        setError("Something went wrong. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  function passwordField(
    name: Field,
    label: string,
    autoComplete: string,
    hint?: string,
  ) {
    const id = `${idPrefix}-${name}`;
    const hintId = `${id}-hint`;
    const invalid = fields.invalid(name);
    return (
      <div className="flex flex-col gap-1.5">
        <label htmlFor={id} className="text-sm font-medium">
          {label}
          <RequiredMark />
        </label>
        <PasswordInput
          id={id}
          name={name}
          autoComplete={autoComplete}
          required
          value={values[name]}
          onChange={(e) => set(name, e.target.value)}
          {...invalid}
          aria-describedby={
            [invalid["aria-describedby"], hint && hintId]
              .filter(Boolean)
              .join(" ") || undefined
          }
        />
        {hint && (
          <p id={hintId} className="text-muted-foreground text-xs">
            {hint}
          </p>
        )}
        <FieldError id={fields.errorId(name)} message={fields.errors[name]} />
      </div>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Change password</DialogTitle>
          <DialogDescription>
            You&apos;ll stay signed in here and be signed out everywhere else.
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={handleSubmit}
          noValidate
          className="flex min-h-0 flex-1 flex-col"
        >
          <DialogBody>
            {passwordField(
              "currentPassword",
              "Current password",
              "current-password",
            )}
            {passwordField(
              "newPassword",
              "New password",
              "new-password",
              `At least ${MIN_LENGTH} characters.`,
            )}
            {passwordField(
              "confirmPassword",
              "Confirm new password",
              "new-password",
            )}
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
            <Button type="submit" disabled={submitting}>
              {submitting && (
                <Loader2 aria-hidden="true" className="animate-spin" />
              )}
              {submitting ? "Saving…" : "Change password"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
