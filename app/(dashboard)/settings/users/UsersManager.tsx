"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { Plus, Pencil, UserRoundX, UserRoundCheck, UsersRound } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Badge } from "@/components/ui/Badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/Dialog";
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
import type { User, Role } from "@/types/user";
import type { Department } from "@/types/department";

function errorMessage(err: unknown): string {
  if (axios.isAxiosError(err) && err.response?.data?.error) return err.response.data.error;
  return "Something went wrong. Please try again.";
}

const emptyForm = { fullName: "", email: "", password: "", roleId: "", departmentId: "" };

export function UsersManager({
  initialUsers,
  roles,
  departments,
}: {
  initialUsers: User[];
  roles: Role[];
  departments: Department[];
}) {
  const router = useRouter();
  const addToast = useUIStore((s) => s.addToast);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<User | null>(null);
  const [deactivating, setDeactivating] = React.useState<User | null>(null);
  const [form, setForm] = React.useState(emptyForm);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  function openCreate() {
    setEditing(null);
    setForm({ ...emptyForm, roleId: String(roles.find((r) => r.name === "viewer")?.id ?? "") });
    setError(null);
    setDialogOpen(true);
  }

  function openEdit(user: User) {
    setEditing(user);
    const role = roles.find((r) => r.name === user.roleName);
    setForm({
      fullName: user.fullName,
      email: user.email,
      password: "",
      roleId: role ? String(role.id) : "",
      departmentId: user.departmentId != null ? String(user.departmentId) : "",
    });
    setError(null);
    setDialogOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const payload: Record<string, unknown> = {
        fullName: form.fullName,
        email: form.email,
        roleId: Number(form.roleId),
        departmentId: form.departmentId ? Number(form.departmentId) : null,
      };
      if (editing) {
        if (form.password) payload.password = form.password;
        await axios.patch(`/api/users/${editing.id}`, payload);
        addToast({ title: "User updated", variant: "success" });
      } else {
        payload.password = form.password;
        await axios.post("/api/users", payload);
        addToast({ title: "User created", variant: "success" });
      }
      setDialogOpen(false);
      router.refresh();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleToggleActive() {
    if (!deactivating) return;
    setSubmitting(true);
    try {
      await axios.patch(`/api/users/${deactivating.id}`, { isActive: !deactivating.isActive });
      addToast({
        title: deactivating.isActive ? "User deactivated" : "User reactivated",
        variant: "success",
      });
      setDeactivating(null);
      router.refresh();
    } catch (err) {
      addToast({
        title: "Could not update user",
        description: errorMessage(err),
        variant: "error",
      });
      setDeactivating(null);
    } finally {
      setSubmitting(false);
    }
  }

  function departmentName(id: number | null): string {
    if (id == null) return "—";
    return departments.find((d) => d.id === id)?.name ?? "—";
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" />
          New User
        </Button>
      </div>

      {initialUsers.length === 0 ? (
        <EmptyState
          icon={UsersRound}
          title="No users yet"
          description="Create the first user account."
          action={<Button onClick={openCreate}>New User</Button>}
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {initialUsers.map((user) => (
              <TableRow key={user.id}>
                <TableCell className="font-medium">{user.fullName}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell className="capitalize">{user.roleName.replace("_", " ")}</TableCell>
                <TableCell>{departmentName(user.departmentId)}</TableCell>
                <TableCell>
                  <Badge variant={user.isActive ? "success" : "neutral"}>
                    {user.isActive ? "Active" : "Inactive"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(user)}>
                    <Pencil className="h-4 w-4" />
                    <span className="sr-only">Edit</span>
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => setDeactivating(user)}>
                    {user.isActive ? (
                      <UserRoundX className="h-4 w-4" />
                    ) : (
                      <UserRoundCheck className="h-4 w-4" />
                    )}
                    <span className="sr-only">{user.isActive ? "Deactivate" : "Reactivate"}</span>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit user" : "New user"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="user-full-name" className="text-sm font-medium">
                Full name
              </label>
              <Input
                id="user-full-name"
                required
                value={form.fullName}
                onChange={(e) => setForm({ ...form, fullName: e.target.value })}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="user-email" className="text-sm font-medium">
                Email
              </label>
              <Input
                id="user-email"
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="user-password" className="text-sm font-medium">
                {editing ? "New password (leave blank to keep current)" : "Password"}
              </label>
              <Input
                id="user-password"
                type="password"
                required={!editing}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="user-role" className="text-sm font-medium">
                Role
              </label>
              <Select
                id="user-role"
                required
                value={form.roleId}
                onChange={(e) => setForm({ ...form, roleId: e.target.value })}
              >
                <option value="" disabled>
                  Select a role
                </option>
                {roles.map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.name.replace("_", " ")}
                  </option>
                ))}
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="user-department" className="text-sm font-medium">
                Department
              </label>
              <Select
                id="user-department"
                value={form.departmentId}
                onChange={(e) => setForm({ ...form, departmentId: e.target.value })}
              >
                <option value="">None</option>
                {departments.map((department) => (
                  <option key={department.id} value={department.id}>
                    {department.name}
                  </option>
                ))}
              </Select>
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

      <Dialog open={!!deactivating} onOpenChange={(open) => !open && setDeactivating(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {deactivating?.isActive ? "Deactivate user" : "Reactivate user"}
            </DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground text-sm">
            {deactivating?.isActive ? (
              <>
                This will prevent <strong>{deactivating?.fullName}</strong> from logging in. Their
                history is kept.
              </>
            ) : (
              <>
                This will restore login access for <strong>{deactivating?.fullName}</strong>.
              </>
            )}
          </p>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </DialogClose>
            <Button
              variant={deactivating?.isActive ? "destructive" : "default"}
              disabled={submitting}
              onClick={handleToggleActive}
            >
              {submitting ? "Saving…" : deactivating?.isActive ? "Deactivate" : "Reactivate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
