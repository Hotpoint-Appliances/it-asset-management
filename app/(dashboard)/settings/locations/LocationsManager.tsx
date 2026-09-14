"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { Plus, Pencil, Trash2, MapPin, ChevronRight, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/Dialog";
import { EmptyState } from "@/components/shared/EmptyState";
import { TreePicker } from "@/components/shared/TreePicker";
import { buildTree, type TreeNode } from "@/lib/tree";
import { useUIStore } from "@/store";
import type { Location } from "@/types/location";

function errorMessage(err: unknown): string {
  if (axios.isAxiosError(err) && err.response?.data?.error) return err.response.data.error;
  return "Something went wrong. Please try again.";
}

interface LocationNode {
  id: number;
  parentId: number | null;
  name: string;
  address: string | null;
}

export function LocationsManager({ initialLocations }: { initialLocations: Location[] }) {
  const router = useRouter();
  const addToast = useUIStore((s) => s.addToast);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Location | null>(null);
  const [deleting, setDeleting] = React.useState<Location | null>(null);
  const [name, setName] = React.useState("");
  const [parentLocationId, setParentLocationId] = React.useState<number | null>(null);
  const [address, setAddress] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [collapsed, setCollapsed] = React.useState<Set<number>>(new Set());

  const treeItems: LocationNode[] = initialLocations.map((l) => ({
    id: l.id,
    parentId: l.parentLocationId,
    name: l.name,
    address: l.address,
  }));
  const tree = buildTree(treeItems);

  function openCreate(parentId: number | null = null) {
    setEditing(null);
    setName("");
    setParentLocationId(parentId);
    setAddress("");
    setError(null);
    setDialogOpen(true);
  }

  function openEdit(location: Location) {
    setEditing(location);
    setName(location.name);
    setParentLocationId(location.parentLocationId);
    setAddress(location.address ?? "");
    setError(null);
    setDialogOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const payload = { name, parentLocationId, address: address || null };
      if (editing) {
        await axios.patch(`/api/locations/${editing.id}`, payload);
        addToast({ title: "Location updated" });
      } else {
        await axios.post("/api/locations", payload);
        addToast({ title: "Location created" });
      }
      setDialogOpen(false);
      router.refresh();
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
      await axios.delete(`/api/locations/${deleting.id}`);
      addToast({ title: "Location deleted" });
      setDeleting(null);
      router.refresh();
    } catch (err) {
      addToast({
        title: "Could not delete location",
        description: errorMessage(err),
        variant: "error",
      });
      setDeleting(null);
    } finally {
      setSubmitting(false);
    }
  }

  function toggleCollapsed(id: number) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function renderNodes(nodes: TreeNode<LocationNode>[]): React.ReactNode {
    return nodes.map((node) => {
      const location = initialLocations.find((l) => l.id === node.item.id)!;
      const isCollapsed = collapsed.has(node.item.id);
      const hasChildren = node.children.length > 0;
      return (
        <React.Fragment key={node.item.id}>
          <div
            className="border-border flex items-center justify-between gap-2 border-b py-2 last:border-0"
            style={{ paddingLeft: `${node.depth * 1.5}rem` }}
          >
            <div className="flex min-w-0 items-center gap-1">
              {hasChildren ? (
                <button
                  onClick={() => toggleCollapsed(node.item.id)}
                  className="text-muted-foreground flex h-6 w-6 shrink-0 items-center justify-center"
                >
                  {isCollapsed ? (
                    <ChevronRight className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </button>
              ) : (
                <span className="w-6 shrink-0" />
              )}
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{location.name}</p>
                {location.address && (
                  <p className="text-muted-foreground truncate text-xs">{location.address}</p>
                )}
              </div>
            </div>
            <div className="flex shrink-0 gap-1">
              <Button variant="ghost" size="icon" onClick={() => openCreate(node.item.id)}>
                <Plus className="h-4 w-4" />
                <span className="sr-only">Add child location</span>
              </Button>
              <Button variant="ghost" size="icon" onClick={() => openEdit(location)}>
                <Pencil className="h-4 w-4" />
                <span className="sr-only">Edit</span>
              </Button>
              <Button variant="ghost" size="icon" onClick={() => setDeleting(location)}>
                <Trash2 className="h-4 w-4" />
                <span className="sr-only">Delete</span>
              </Button>
            </div>
          </div>
          {!isCollapsed && renderNodes(node.children)}
        </React.Fragment>
      );
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <Button onClick={() => openCreate(null)}>
          <Plus className="h-4 w-4" />
          New Location
        </Button>
      </div>

      {initialLocations.length === 0 ? (
        <EmptyState
          icon={MapPin}
          title="No locations yet"
          description="Create your first location (e.g. a site or building) to start placing assets."
          action={<Button onClick={() => openCreate(null)}>New Location</Button>}
        />
      ) : (
        <div className="border-border rounded-xl border shadow-sm">{renderNodes(tree)}</div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit location" : "New location"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="location-name" className="text-sm font-medium">
                Name
              </label>
              <Input
                id="location-name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="location-parent" className="text-sm font-medium">
                Parent location
              </label>
              <TreePicker
                id="location-parent"
                items={treeItems}
                value={parentLocationId}
                onChange={setParentLocationId}
                excludeId={editing?.id ?? null}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="location-address" className="text-sm font-medium">
                Address
              </label>
              <Input
                id="location-address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
            </div>
            {error && (
              <p role="alert" className="text-destructive text-sm">
                {error}
              </p>
            )}
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

      <Dialog open={!!deleting} onOpenChange={(open) => !open && setDeleting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete location</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground text-sm">
            This will permanently delete <strong>{deleting?.name}</strong>. Any child locations
            will become top-level locations. This cannot be undone.
          </p>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </DialogClose>
            <Button variant="destructive" disabled={submitting} onClick={handleDelete}>
              {submitting ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
