"use client";

import * as React from "react";
import { useRouteLoadingRouter } from "@/lib/hooks/useRouteLoadingRouter";
import axios from "axios";
import {
  Plus,
  Pencil,
  UserRoundX,
  UserRoundCheck,
  UsersRound,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { PasswordInput } from "@/components/ui/PasswordInput";
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
  ConfirmSummary,
  useConfirm,
  type ConfirmOptions,
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
import type { User, Role } from "@/types/user";
import type { Department } from "@/types/department";
import { RequiredMark } from "@/components/shared/RequiredMark";
import { FieldError } from "@/components/shared/FieldError";
import { useFieldErrors, looksLikeEmail } from "@/lib/hooks/useFieldErrors";

function errorMessage(err: unknown): string {
  if (axios.isAxiosError(err) && err.response?.data?.error)
    return err.response.data.error;
  return "Something went wrong. Please try again.";
}

const emptyForm = {
  fullName: "",
  email: "",
  password: "",
  roleId: "",
  departmentId: "",
};

const PAGE_SIZE = 10;

export function UsersManager({
  initialUsers,
  roles,
  departments,
}: {
  initialUsers: User[];
  roles: Role[];
  departments: Department[];
}) {
  const router = useRouteLoadingRouter();
  const addToast = useUIStore((s) => s.addToast);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<User | null>(null);
  const [deactivating, setDeactivating] = React.useState<User | null>(null);
  const [form, setForm] = React.useState(emptyForm);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const pagination = usePagination(initialUsers, PAGE_SIZE);
  const { confirm, dialog: confirmDialog } = useConfirm();
  const fields = useFieldErrors<"fullName" | "email" | "password">();

  function openCreate() {
    setEditing(null);
    setForm({
      ...emptyForm,
      roleId: String(roles.find((r) => r.name === "viewer")?.id ?? ""),
    });
    setError(null);
    fields.reset();
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
    fields.reset();
    setDialogOpen(true);
  }

  function saveConfirm(): ConfirmOptions {
    const roleLabel = (name: string | undefined) => name?.replace("_", " ");
    const role = roles.find((r) => r.id === Number(form.roleId))?.name;
    const department = form.departmentId
      ? departmentName(Number(form.departmentId))
      : "N/A";
    if (!editing) {
      return {
        title: "Create user?",
        description: (
          <ConfirmSummary
            intro="They'll be able to sign in with this email and password."
            rows={[
              ["Name", form.fullName.trim()],
              ["Email", form.email.trim()],
              ["Role", roleLabel(role)],
              ["Department", department],
            ]}
          />
        ),
        confirmLabel: "Create user",
      };
    }
    // Only the access-affecting changes are spelled out; the rest is "Save changes to X?".
    const rows: [string, string | undefined][] = [
      [
        "Role",
        role !== editing.roleName
          ? `${roleLabel(editing.roleName)} → ${roleLabel(role)}`
          : undefined,
      ],
      [
        "Email",
        form.email.trim() !== editing.email
          ? `${editing.email} → ${form.email.trim()}`
          : undefined,
      ],
      [
        "Password",
        form.password
          ? "Will be reset, signing them out of open sessions"
          : undefined,
      ],
    ];
    return {
      title: "Save changes?",
      description: (
        <ConfirmSummary
          intro={
            <>
              Save changes to <strong>{form.fullName.trim()}</strong>?
            </>
          }
          rows={rows}
        />
      ),
      confirmLabel: "Save changes",
    };
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const ok = fields.validate(
      {
        fullName: !form.fullName.trim() && "Enter the user's full name.",
        email: !form.email.trim()
          ? "Enter an email address."
          : !looksLikeEmail(form.email) && "Enter a valid email address.",
        password: editing
          ? form.password !== "" &&
            form.password.length < 8 &&
            "A new password must be at least 8 characters, or leave it blank."
          : form.password.length < 8 &&
            "Enter a password of at least 8 characters.",
      },
      e.currentTarget,
    );
    if (!ok) return;
    if (!(await confirm(saveConfirm()))) return;
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
      } else {
        payload.password = form.password;
        await axios.post("/api/users", payload);
      }
      setDialogOpen(false);
      router.refresh(() =>
        addToast({
          title: editing ? "User updated" : "User created",
          variant: "success",
        }),
      );
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
      await axios.patch(`/api/users/${deactivating.id}`, {
        isActive: !deactivating.isActive,
      });
      setDeactivating(null);
      router.refresh(() =>
        addToast({
          title: deactivating.isActive
            ? "User deactivated"
            : "User reactivated",
          variant: "success",
        }),
      );
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
    if (id == null) return "N/A";
    return departments.find((d) => d.id === id)?.name ?? "N/A";
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
            {pagination.pageItems.map((user) => (
              <TableRow key={user.id}>
                <TableCell className="font-medium">{user.fullName}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell className="capitalize">
                  {user.roleName.replace("_", " ")}
                </TableCell>
                <TableCell>{departmentName(user.departmentId)}</TableCell>
                <TableCell>
                  <Badge variant={user.isActive ? "success" : "neutral"}>
                    {user.isActive ? "Active" : "Inactive"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => openEdit(user)}
                  >
                    <Pencil className="h-4 w-4" />
                    <span className="sr-only">Edit</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setDeactivating(user)}
                  >
                    {user.isActive ? (
                      <UserRoundX className="h-4 w-4" />
                    ) : (
                      <UserRoundCheck className="h-4 w-4" />
                    )}
                    <span className="sr-only">
                      {user.isActive ? "Deactivate" : "Reactivate"}
                    </span>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      <Pagination {...pagination} noun="users" />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit user" : "New user"}</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={handleSubmit}
            noValidate
            className="flex min-h-0 flex-1 flex-col"
          >
            <DialogBody>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="user-full-name" className="text-sm font-medium">
                  Full name
                  <RequiredMark />
                </label>
                <Input
                  id="user-full-name"
                  {...fields.invalid("fullName")}
                  onInput={() => fields.clear("fullName")}
                  required
                  value={form.fullName}
                  onChange={(e) =>
                    setForm({ ...form, fullName: e.target.value })
                  }
                />
                <FieldError
                  id={fields.errorId("fullName")}
                  message={fields.errors.fullName}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="user-email" className="text-sm font-medium">
                  Email
                  <RequiredMark />
                </label>
                <Input
                  id="user-email"
                  {...fields.invalid("email")}
                  onInput={() => fields.clear("email")}
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
                <FieldError
                  id={fields.errorId("email")}
                  message={fields.errors.email}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="user-password" className="text-sm font-medium">
                  {editing
                    ? "New password (leave blank to keep current)"
                    : "Password"}
                  {!editing && <RequiredMark />}
                </label>
                <PasswordInput
                  id="user-password"
                  {...fields.invalid("password")}
                  onInput={() => fields.clear("password")}
                  autoComplete="new-password"
                  required={!editing}
                  value={form.password}
                  onChange={(e) =>
                    setForm({ ...form, password: e.target.value })
                  }
                />
                <FieldError
                  id={fields.errorId("password")}
                  message={fields.errors.password}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="user-role" className="text-sm font-medium">
                  Role
                  <RequiredMark />
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
                <label
                  htmlFor="user-department"
                  className="text-sm font-medium"
                >
                  Department
                </label>
                <Select
                  id="user-department"
                  value={form.departmentId}
                  onChange={(e) =>
                    setForm({ ...form, departmentId: e.target.value })
                  }
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
            </DialogBody>
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </DialogClose>
              <Button type="submit" loading={submitting}>
                {submitting ? "Saving…" : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deactivating}
        onOpenChange={(open) => !open && setDeactivating(null)}
        title={deactivating?.isActive ? "Deactivate user" : "Reactivate user"}
        description={
          <>
            {deactivating?.isActive ? (
              <>
                This will sign <strong>{deactivating?.fullName}</strong> out
                immediately and prevent them from logging in again. Their
                history is kept.
              </>
            ) : (
              <>
                This will restore login access for{" "}
                <strong>{deactivating?.fullName}</strong>.
              </>
            )}
          </>
        }
        confirmLabel={deactivating?.isActive ? "Deactivate" : "Reactivate"}
        submittingLabel="Saving…"
        onConfirm={handleToggleActive}
        submitting={submitting}
        destructive={deactivating?.isActive}
      />
      {confirmDialog}
    </div>
  );
}
