"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { PencilSimpleIcon, PlusIcon, TrashIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CreateNotzForm } from "./form";
import { deleteNotz, updateNotz } from "@/app/actions/notz-actions";
import type { ManageNotzItem, UpdateNotzInput } from "@/lib/models/notz";

type ManageNotzViewProps = {
  featuredCount: number;
  initialNotz: ManageNotzItem[];
};

const getActionErrorMessage = (error: unknown) => {
  if (typeof error === "string") {
    return error;
  }

  if (error && typeof error === "object") {
    const values = Object.values(error as Record<string, unknown>).flatMap((value) =>
      Array.isArray(value) ? value : [value]
    );

    const firstMessage = values.find((value) => typeof value === "string");

    if (typeof firstMessage === "string") {
      return firstMessage;
    }
  }

  return "Something went wrong";
};

export function ManageNotzView({ featuredCount, initialNotz }: ManageNotzViewProps) {
  const router = useRouter();
  const [isCreateOpen, setIsCreateOpen] = useState(initialNotz.length === 0);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<UpdateNotzInput | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const beginEdit = (item: ManageNotzItem) => {
    setEditingId(item.id);
    setDraft({
      id: item.id,
      name: item.name,
      featured: item.featured,
    });
    setActionError(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setDraft(null);
    setActionError(null);
  };

  const submitEdit = () => {
    if (!draft) {
      return;
    }

    startTransition(async () => {
      const result = await updateNotz(draft);

      if ("success" in result && result.success) {
        cancelEdit();
        router.refresh();
        return;
      }

      setActionError(getActionErrorMessage(result.error));
    });
  };

  const openDeleteConfirm = (id: string, name: string) => {
    setDeleteTarget({ id, name });
  };

  const closeDeleteConfirm = () => {
    if (isPending) {
      return;
    }

    setDeleteTarget(null);
  };

  const confirmDelete = () => {
    if (!deleteTarget) {
      return;
    }

    const { id } = deleteTarget;

    startTransition(async () => {
      const result = await deleteNotz({ id });

      if ("success" in result && result.success) {
        if (editingId === id) {
          cancelEdit();
        }

        setDeleteTarget(null);
        router.refresh();
        return;
      }

      setActionError(getActionErrorMessage(result.error));
    });
  };

  return (
    <section className="mx-auto flex w-full max-w-6xl flex-col gap-3 sm:gap-6">
      <div className="neo-panel flex flex-col gap-4 bg-card p-4 shadow-[4px_4px_0_0_var(--color-foreground)] sm:flex-row sm:items-center sm:justify-between sm:p-5 sm:shadow-[6px_6px_0_0_var(--color-foreground)]">
        <div className="space-y-1">
          <h1 className="text-2xl font-black uppercase tracking-[0.18em] text-foreground sm:text-3xl">
            Manage Notz
          </h1>
          <p className="text-sm font-bold uppercase tracking-[0.12em] text-foreground/70">
            Create, edit, and delete your note spaces in one place.
          </p>
        </div>

        <Button
          type="button"
          size="sm"
          className="w-full sm:w-auto"
          onClick={() => setIsCreateOpen(true)}
        >
          <PlusIcon weight="bold" />
          Create Notz
        </Button>
      </div>

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent showCloseButton={false} className="max-w-[calc(100%-2rem)] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-black uppercase tracking-[0.18em] text-foreground sm:text-2xl">
              Create Notz
            </DialogTitle>
          </DialogHeader>
          <CreateNotzForm
            featuredCount={featuredCount}
            onCreated={() => {
              setIsCreateOpen(false);
              setActionError(null);
            }}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && closeDeleteConfirm()}>
        <DialogContent showCloseButton={false} className="max-w-[calc(100%-2rem)] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-black uppercase tracking-[0.18em] text-foreground sm:text-2xl">
              Delete Notz
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm font-bold uppercase tracking-[0.12em] text-foreground/80">
            {deleteTarget ? `Delete ${deleteTarget.name}? This cannot be undone.` : "Delete this notz?"}
          </p>
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={closeDeleteConfirm}
              disabled={isPending}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={confirmDelete}
              disabled={isPending}
              className="w-full sm:w-auto"
            >
              {isPending ? "Deleting..." : "Delete"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="neo-panel overflow-hidden bg-card shadow-[4px_4px_0_0_var(--color-foreground)] sm:shadow-[6px_6px_0_0_var(--color-foreground)]">
        <div className="flex items-center justify-between border-b-3 border-foreground px-4 py-3 sm:px-5">
          <h2 className="text-sm font-black uppercase tracking-[0.18em] text-foreground">
            Your Notz
          </h2>
          <span className="text-xs font-bold uppercase tracking-[0.12em] text-foreground/60">
            {initialNotz.length} total
          </span>
        </div>

        {actionError && (
          <div className="border-b-3 border-foreground bg-destructive px-4 py-3 text-xs font-black uppercase tracking-[0.14em] text-primary-foreground sm:px-5">
            {actionError}
          </div>
        )}

        <div className="overflow-x-auto">
          {/* Desktop table view */}
          <table className="hidden w-full border-collapse sm:table">
            <thead>
              <tr className="border-b-3 border-foreground bg-secondary/35 text-left text-xs font-black uppercase tracking-[0.16em] text-foreground">
                <th className="px-4 py-3 sm:px-5">Name</th>
                <th className="px-4 py-3">Featured</th>
                <th className="px-4 py-3 text-right sm:px-5">Actions</th>
              </tr>
            </thead>
            <tbody>
              {initialNotz.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-4 py-10 text-center text-sm font-bold uppercase tracking-[0.14em] text-foreground/60 sm:px-5">
                    No notz yet. Create your first one.
                  </td>
                </tr>
              ) : (
                initialNotz.map((item) => {
                  const isEditing = editingId === item.id && draft;

                  return (
                    <tr key={item.id} className="border-b-2 border-foreground/20 last:border-b-0">
                      <td className="px-4 py-3 align-middle sm:px-5">
                        {isEditing ? (
                          <input
                            type="text"
                            value={draft.name}
                            onChange={(event) =>
                              setDraft((current) =>
                                current
                                  ? {
                                      ...current,
                                      name: event.target.value,
                                    }
                                  : current
                              )
                            }
                            disabled={isPending}
                            className="w-full border-2 border-foreground bg-background px-3 py-2 text-sm font-medium text-foreground outline-none focus:border-3"
                          />
                        ) : (
                          <span className="text-sm font-bold uppercase tracking-[0.12em] text-foreground">
                            {item.name}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 align-middle">
                        {isEditing ? (
                          <label className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.14em] text-foreground">
                            <Checkbox
                              checked={draft.featured}
                              onCheckedChange={(checked) =>
                                setDraft((current) =>
                                  current
                                    ? {
                                        ...current,
                                        featured: Boolean(checked),
                                      }
                                    : current
                                )
                              }
                              disabled={isPending}
                              className="size-5 border-2 border-foreground data-checked:border-foreground data-checked:bg-primary data-checked:text-primary-foreground"
                            />
                            Featured
                          </label>
                        ) : item.featured ? (
                          <span className="inline-flex items-center border-2 border-foreground bg-primary px-2 py-1 text-[0.65rem] font-black uppercase tracking-[0.14em] text-primary-foreground">
                            Yes
                          </span>
                        ) : (
                          <span className="inline-flex items-center border-2 border-foreground bg-background px-2 py-1 text-[0.65rem] font-black uppercase tracking-[0.14em] text-foreground/70">
                            No
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 align-middle sm:px-5">
                        <div className="flex justify-end gap-2">
                          {isEditing ? (
                            <>
                              <Button
                                type="button"
                                size="xs"
                                onClick={submitEdit}
                                disabled={isPending}
                              >
                                Save
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                size="xs"
                                onClick={cancelEdit}
                                disabled={isPending}
                              >
                                Cancel
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button
                                type="button"
                                variant="outline"
                                size="xs"
                                onClick={() => beginEdit(item)}
                                disabled={isPending}
                              >
                                <PencilSimpleIcon weight="bold" />
                                Edit
                              </Button>
                              <Button
                                type="button"
                                variant="destructive"
                                size="xs"
                                onClick={() => openDeleteConfirm(item.id, item.name)}
                                disabled={isPending}
                              >
                                <TrashIcon weight="bold" />
                                Delete
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>

          {/* Mobile card view */}
          <div className="grid gap-0 sm:hidden">
            {initialNotz.length === 0 ? (
              <div className="px-4 py-10 text-center text-sm font-bold uppercase tracking-[0.14em] text-foreground/60">
                No notz yet. Create your first one.
              </div>
            ) : (
              initialNotz.map((item) => {
                const isEditing = editingId === item.id && draft;

                return (
                  <div key={item.id} className="border-b-2 border-foreground/20 px-4 py-3 last:border-b-0">
                    {isEditing ? (
                      <div className="space-y-3">
                        <input
                          type="text"
                          value={draft.name}
                          onChange={(event) =>
                            setDraft((current) =>
                              current
                                ? { ...current, name: event.target.value }
                                : current
                            )
                          }
                          disabled={isPending}
                          className="w-full border-2 border-foreground bg-background px-3 py-2 text-sm font-medium text-foreground outline-none focus:border-3"
                        />
                        <label className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.14em] text-foreground">
                          <Checkbox
                            checked={draft.featured}
                            onCheckedChange={(checked) =>
                              setDraft((current) =>
                                current
                                  ? { ...current, featured: Boolean(checked) }
                                  : current
                              )
                            }
                            disabled={isPending}
                            className="size-5 border-2 border-foreground data-checked:border-foreground data-checked:bg-primary data-checked:text-primary-foreground"
                          />
                          Featured
                        </label>
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            size="xs"
                            onClick={submitEdit}
                            disabled={isPending}
                            className="flex-1"
                          >
                            Save
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="xs"
                            onClick={cancelEdit}
                            disabled={isPending}
                            className="flex-1"
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-2">
                          <span className="truncate text-sm font-bold uppercase tracking-[0.12em] text-foreground">
                            {item.name}
                          </span>
                          {item.featured && (
                            <span className="inline-flex shrink-0 items-center border-2 border-foreground bg-primary px-1.5 py-0.5 text-[0.6rem] font-black uppercase leading-none tracking-[0.14em] text-primary-foreground">
                              ★
                            </span>
                          )}
                        </div>
                        <div className="flex shrink-0 gap-1.5">
                          <Button
                            type="button"
                            variant="outline"
                            size="icon-xs"
                            onClick={() => beginEdit(item)}
                            disabled={isPending}
                            aria-label={`Edit ${item.name}`}
                          >
                            <PencilSimpleIcon weight="bold" className="size-3.5" />
                          </Button>
                          <Button
                            type="button"
                            variant="destructive"
                            size="icon-xs"
                            onClick={() => openDeleteConfirm(item.id, item.name)}
                            disabled={isPending}
                            aria-label={`Delete ${item.name}`}
                          >
                            <TrashIcon weight="bold" className="size-3.5" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </section>
  );
}