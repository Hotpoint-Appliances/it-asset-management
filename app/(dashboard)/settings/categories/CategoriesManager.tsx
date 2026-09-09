"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { Plus, Pencil, Trash2, FolderTree, ChevronRight, ChevronDown } from "lucide-react";
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
import type { Category } from "@/types/category";

function errorMessage(err: unknown): string {
  if (axios.isAxiosError(err) && err.response?.data?.error) return err.response.data.error;
  return "Something went wrong. Please try again.";
}

interface CategoryNode {
  id: number;
  parentId: number | null;
  name: string;
  description: string | null;
}

export function CategoriesManager({ initialCategories }: { initialCategories: Category[] }) {
  const router = useRouter();
  const addToast = useUIStore((s) => s.addToast);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Category | null>(null);
  const [deleting, setDeleting] = React.useState<Category | null>(null);
  const [name, setName] = React.useState("");
  const [parentCategoryId, setParentCategoryId] = React.useState<number | null>(null);
  const [description, setDescription] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [collapsed, setCollapsed] = React.useState<Set<number>>(new Set());

  const treeItems: CategoryNode[] = initialCategories.map((c) => ({
    id: c.id,
    parentId: c.parentCategoryId,
    name: c.name,
    description: c.description,
  }));
  const tree = buildTree(treeItems);

  function openCreate(parentId: number | null = null) {
    setEditing(null);
    setName("");
    setParentCategoryId(parentId);
    setDescription("");
    setError(null);
    setDialogOpen(true);
  }

  function openEdit(category: Category) {
    setEditing(category);
    setName(category.name);
    setParentCategoryId(category.parentCategoryId);
    setDescription(category.description ?? "");
    setError(null);
    setDialogOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const payload = { name, parentCategoryId, description: description || null };
      if (editing) {
        await axios.patch(`/api/categories/${editing.id}`, payload);
        addToast({ title: "Category updated" });
      } else {
        await axios.post("/api/categories", payload);
        addToast({ title: "Category created" });
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
      await axios.delete(`/api/categories/${deleting.id}`);
      addToast({ title: "Category deleted" });
      setDeleting(null);
      router.refresh();
    } catch (err) {
      addToast({
        title: "Could not delete category",
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

  function renderNodes(nodes: TreeNode<CategoryNode>[]): React.ReactNode {
    return nodes.map((node) => {
      const category = initialCategories.find((c) => c.id === node.item.id)!;
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
                <p className="truncate text-sm font-medium">{category.name}</p>
                {category.description && (
                  <p className="text-muted-foreground truncate text-xs">
                    {category.description}
                  </p>
                )}
              </div>
            </div>
            <div className="flex shrink-0 gap-1">
              <Button variant="ghost" size="icon" onClick={() => openCreate(node.item.id)}>
                <Plus className="h-4 w-4" />
                <span className="sr-only">Add child category</span>
              </Button>
              <Button variant="ghost" size="icon" onClick={() => openEdit(category)}>
                <Pencil className="h-4 w-4" />
                <span className="sr-only">Edit</span>
              </Button>
              <Button variant="ghost" size="icon" onClick={() => setDeleting(category)}>
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
          New Category
        </Button>
      </div>

      {initialCategories.length === 0 ? (
        <EmptyState
          icon={FolderTree}
          title="No categories yet"
          description="Create your first category (e.g. Hardware) to start organizing assets."
          action={<Button onClick={() => openCreate(null)}>New Category</Button>}
        />
      ) : (
        <div className="border-border rounded-md border">{renderNodes(tree)}</div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit category" : "New category"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="category-name" className="text-sm font-medium">
                Name
              </label>
              <Input
                id="category-name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="category-parent" className="text-sm font-medium">
                Parent category
              </label>
              <TreePicker
                id="category-parent"
                items={treeItems}
                value={parentCategoryId}
                onChange={setParentCategoryId}
                excludeId={editing?.id ?? null}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="category-description" className="text-sm font-medium">
                Description
              </label>
              <Input
                id="category-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
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
            <DialogTitle>Delete category</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground text-sm">
            This will permanently delete <strong>{deleting?.name}</strong>. Any child categories
            will become top-level categories. This cannot be undone.
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
