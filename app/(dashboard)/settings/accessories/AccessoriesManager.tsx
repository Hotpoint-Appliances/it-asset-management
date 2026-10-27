"use client";

import * as React from "react";
import { useRouteLoadingRouter } from "@/lib/hooks/useRouteLoadingRouter";
import axios from "axios";
import { Plus, Pencil, Trash2, Cable } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Badge } from "@/components/ui/Badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogBody,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/Dialog";
import {
  ConfirmDialog,
  recordSaveConfirm,
  useConfirm,
} from "@/components/shared/ConfirmDialog";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/Table";
import { EmptyState } from "@/components/shared/EmptyState";
import { useUIStore } from "@/store";
import { usePagination } from "@/lib/hooks/usePagination";
import { Pagination } from "@/components/shared/Pagination";
import type { Accessory } from "@/types/accessory";
import { RequiredMark } from "@/components/shared/RequiredMark";
import { FieldError } from "@/components/shared/FieldError";
import { useFieldErrors } from "@/lib/hooks/useFieldErrors";

function errorMessage(err: unknown): string {
  if (axios.isAxiosError(err) && err.response?.data?.error)
    return err.response.data.error;
  return "Something went wrong. Please try again.";
}

const PAGE_SIZE = 10;

export function AccessoriesManager({
  initialAccessories,
}: {
  initialAccessories: Accessory[];
}) {
  const router = useRouteLoadingRouter();
  const addToast = useUIStore((s) => s.addToast);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Accessory | null>(null);
  const [deleting, setDeleting] = React.useState<Accessory | null>(null);
  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [isActive, setIsActive] = React.useState(true);
  const [sortOrder, setSortOrder] = React.useState(0);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const pagination = usePagination(initialAccessories, PAGE_SIZE);
  const { confirm, dialog: confirmDialog } = useConfirm();
  const fields = useFieldErrors<"name">();

  function openCreate() {
    setEditing(null);
    setName("");
    setDescription("");
    setIsActive(true);
    setSortOrder(initialAccessories.length + 1);
    setError(null);
    fields.reset();
    setDialogOpen(true);
  }

  function openEdit(accessory: Accessory) {
    setEditing(accessory);
    setName(accessory.name);
    setDescription(accessory.description ?? "");
    setIsActive(accessory.isActive);
    setSortOrder(accessory.sortOrder);
    setError(null);
    fields.reset();
    setDialogOpen(true);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const ok = fields.validate(
      {
        name: !name.trim() && "Enter an accessory name.",
      },
      e.currentTarget,
    );
    if (!ok) return;
    if (!(await confirm(recordSaveConfirm("accessory", name, editing?.name))))
      return;
    setSubmitting(true);
    setError(null);
    try {
      const payload = { name, description, isActive, sortOrder };
      if (editing) {
        await axios.patch(`/api/accessories/${editing.id}`, payload);
      } else {
        await axios.post("/api/accessories", payload);
      }
      setDialogOpen(false);
      router.refresh(() =>
        addToast({
          title: editing ? "Accessory updated" : "Accessory created",
          variant: "success",
        }),
      );
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!deleting) return;
    setSubmitting(true);
    try {
      await axios.delete(`/api/accessories/${deleting.id}`);
      setDeleting(null);
      router.refresh(() =>
        addToast({ title: "Accessory deleted", variant: "success" }),
      );
    } catch (err) {
      addToast({
        title: "Could not delete accessory",
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
      <div className="flex justify-end">
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" />
          New Accessory
        </Button>
      </div>

      {initialAccessories.length === 0 ? (
        <EmptyState
          icon={Cable}
          title="No accessories yet"
          description="Define the accessories that can be attached to assets (e.g. charger, mouse, docking station)."
          action={<Button onClick={openCreate}>New Accessory</Button>}
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>In use</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pagination.pageItems.map((accessory) => (
              <TableRow key={accessory.id}>
                <TableCell className="font-medium">{accessory.name}</TableCell>
                <TableCell className="text-muted-foreground">
                  {accessory.description ?? "N/A"}
                </TableCell>
                <TableCell>
                  <Badge variant={accessory.isActive ? "success" : "neutral"}>
                    {accessory.isActive ? "Active" : "Retired"}
                  </Badge>
                </TableCell>
                <TableCell>
                  {accessory.assetCount} asset
                  {accessory.assetCount === 1 ? "" : "s"}
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => openEdit(accessory)}
                  >
                    <Pencil className="h-4 w-4" />
                    <span className="sr-only">Edit</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setDeleting(accessory)}
                  >
                    <Trash2 className="h-4 w-4" />
                    <span className="sr-only">Delete</span>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      <Pagination {...pagination} noun="accessories" />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editing ? "Edit accessory" : "New accessory"}
            </DialogTitle>
          </DialogHeader>
          <form
            onSubmit={handleSubmit}
            noValidate
            className="flex min-h-0 flex-1 flex-col"
          >
            <DialogBody>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="accessory-name" className="text-sm font-medium">
                  Name
                  <RequiredMark />
                </label>
                <Input
                  id="accessory-name"
                  {...fields.invalid("name")}
                  onInput={() => fields.clear("name")}
                  required
                  maxLength={100}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
                <FieldError
                  id={fields.errorId("name")}
                  message={fields.errors.name}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="accessory-description"
                  className="text-sm font-medium"
                >
                  Description
                </label>
                <Input
                  id="accessory-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="accessory-status"
                  className="text-sm font-medium"
                >
                  Status
                </label>
                <Select
                  id="accessory-status"
                  value={isActive ? "active" : "retired"}
                  onChange={(e) => setIsActive(e.target.value === "active")}
                >
                  <option value="active">Active</option>
                  <option value="retired">Retired</option>
                </Select>
                <p className="text-muted-foreground text-xs">
                  Retired accessories stay on the assets they&apos;re attached
                  to but can no longer be added.
                </p>
              </div>
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="accessory-sort-order"
                  className="text-sm font-medium"
                >
                  Sort order
                </label>
                <Input
                  id="accessory-sort-order"
                  type="number"
                  value={sortOrder}
                  onChange={(e) => setSortOrder(Number(e.target.value))}
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
              <Button type="submit" disabled={submitting}>
                {submitting ? "Saving…" : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Delete accessory"
        description={
          <>
            This will permanently delete <strong>{deleting?.name}</strong>. An
            accessory that has ever been attached to an asset can&apos;t be
            deleted; retire it instead.
          </>
        }
        confirmLabel="Delete"
        submittingLabel="Deleting…"
        onConfirm={handleDelete}
        submitting={submitting}
        destructive
      />
      {confirmDialog}
    </div>
  );
}
