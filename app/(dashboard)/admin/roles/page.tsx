"use client";

import React from "react";
import { CheckSquare2, Edit3, Lock, Loader2, Plus, Save, Shield, Square, Trash2, X } from "lucide-react";
import { useAppData } from "@/lib/client/useAppData";
import { cn } from "@/lib/utils";
import { formatPermissionLabel, groupPermissions } from "@/lib/permission-catalog";

const emptyForm = { id: "", name: "", description: "", permissionIds: [] as string[] };

export default function RoleManagementPage() {
  const { roles, permissions: storePermissions, addRole, updateRole, deleteRole, refresh } = useAppData();
  const [allPermissions, setAllPermissions] = React.useState<any[]>([]);
  const [permissionsLoading, setPermissionsLoading] = React.useState(false);
  const [form, setForm] = React.useState(emptyForm);
  const [isOpen, setIsOpen] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState("");
  const [success, setSuccess] = React.useState("");

  const groupedPermissions = React.useMemo(() => groupPermissions(allPermissions), [allPermissions]);
  const allPermissionIds = React.useMemo(() => allPermissions.map((permission) => permission.id), [allPermissions]);
  const permissionsReady = allPermissionIds.length > 0;
  const isSuperAdmin = form.name === "Super Admin";
  const allFormSelected = allPermissionIds.length > 0 && allPermissionIds.every((id) => form.permissionIds.includes(id));
  const selectedCount = isSuperAdmin ? allPermissionIds.length : form.permissionIds.length;

  React.useEffect(() => {
    if (Array.isArray(storePermissions) && storePermissions.length > 0) {
      setAllPermissions(storePermissions);
      setPermissionsLoading(false);
      setError("");
    }
  }, [storePermissions]);

  React.useEffect(() => {
    if (Array.isArray(storePermissions) && storePermissions.length > 0) return;
    setPermissionsLoading(true);
    refresh()
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Permissions could not be loaded."))
      .finally(() => setPermissionsLoading(false));
  }, [refresh, storePermissions]);

  React.useEffect(() => {
    if (isSuperAdmin && allPermissionIds.length > 0) {
      setForm((current) => ({ ...current, permissionIds: allPermissionIds }));
    }
  }, [allPermissionIds, isSuperAdmin]);

  const openRole = (role?: any) => {
    setError("");
    setSuccess("");
    if (role) {
      setForm({
        id: role.id,
        name: role.name,
        description: role.description || "",
        permissionIds: role.name === "Super Admin" ? allPermissionIds : role.permissionIds || [],
      });
    } else {
      setForm(emptyForm);
    }
    setIsOpen(true);
  };

  const togglePermission = (permissionId: string) => {
    if (isSuperAdmin) return;
    setForm((current) => ({
      ...current,
      permissionIds: current.permissionIds.includes(permissionId)
        ? current.permissionIds.filter((id) => id !== permissionId)
        : [...current.permissionIds, permissionId],
    }));
  };

  const toggleModule = (modulePermissions: any[]) => {
    if (isSuperAdmin) return;
    const ids = modulePermissions.map((permission) => permission.id);
    const allSelected = ids.every((id) => form.permissionIds.includes(id));
    setForm((current) => ({
      ...current,
      permissionIds: allSelected
        ? current.permissionIds.filter((id) => !ids.includes(id))
        : Array.from(new Set([...current.permissionIds, ...ids])),
    }));
  };

  const toggleAll = () => {
    if (isSuperAdmin) return;
    setForm((current) => ({ ...current, permissionIds: allFormSelected ? [] : allPermissionIds }));
  };

  const saveRole = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setSaving(true);
    try {
      if (form.id) await updateRole(form);
      else await addRole(form);
      setIsOpen(false);
      setForm(emptyForm);
      await refresh();
      setSuccess(form.id ? "Role updated successfully." : "Role created successfully.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Role could not be saved.");
    } finally {
      setSaving(false);
    }
  };

  const removeRole = async (role: any) => {
    if (!window.confirm(`Delete "${role.name}"? Only unused non-system roles can be deleted.`)) return;
    try {
      await deleteRole(role.id);
      await refresh();
      setSuccess("Role deleted successfully.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Role could not be deleted.");
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Role Management</h1>
          <p className="text-slate-500 mt-1 text-xs font-bold uppercase tracking-widest">Assign catalog permissions to roles</p>
        </div>
        <button
          onClick={() => openRole()}
          disabled={!permissionsReady}
          className="inline-flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 text-white rounded-lg text-xs font-black uppercase tracking-widest shadow-lg shadow-indigo-900/20 hover:bg-indigo-500 active:scale-95 transition-all disabled:opacity-60"
        >
          {!permissionsReady ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          Create Role
        </button>
      </div>

      {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-xs font-bold text-red-700">{error}</div>}
      {success && <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-bold text-emerald-700">{success}</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {(roles || []).map((role: any) => (
          <div key={role.id} className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-5 rounded-lg shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-3">
                  <div className={cn("p-2 rounded-lg", role.isSystem ? "bg-amber-50 dark:bg-amber-900/20 text-amber-600" : "bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600")}>
                    <Shield className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-black text-slate-900 dark:text-white text-lg">{role.name}</h4>
                    <div className="flex items-center gap-2">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">{role.userCount} users</p>
                      {role.isSystem && <span className="text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">System</span>}
                    </div>
                  </div>
                </div>
                <p className="mt-3 text-sm text-slate-500">{role.description || "No description"}</p>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => openRole(role)}
                  disabled={!permissionsReady}
                  className="p-2 rounded-lg text-slate-500 hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-indigo-950/30 disabled:opacity-40"
                  title="Edit role"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
                <button
                  disabled={role.userCount > 0 || role.isSystem}
                  onClick={() => removeRole(role)}
                  className="p-2 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40 dark:hover:bg-red-950/20"
                  title={role.isSystem ? "System roles cannot be deleted." : role.userCount > 0 ? `Cannot delete: ${role.userCount} user(s) assigned.` : "Delete unused role."}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {(role.permissions || []).slice(0, 8).map((permission: any) => (
                <span key={permission.id} className="inline-flex items-center gap-1 rounded-md bg-slate-100 dark:bg-zinc-800 px-2 py-1 text-[10px] font-bold text-slate-600 dark:text-zinc-300">
                  <Lock className="h-3 w-3" /> {formatPermissionLabel(permission)}
                </span>
              ))}
              {role.permissions?.length > 8 && <span className="rounded-md bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-500">+{role.permissions.length - 8} more</span>}
            </div>
          </div>
        ))}
      </div>

      {isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <button aria-label="Close" onClick={() => setIsOpen(false)} className="absolute inset-0 bg-white/50 dark:bg-zinc-950/70 backdrop-blur-sm" />
          <form onSubmit={saveRole} className="relative w-full max-w-5xl max-h-[90vh] overflow-y-auto bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl shadow-2xl">
            <div className="sticky top-0 z-10 bg-white dark:bg-zinc-900 border-b border-slate-200 dark:border-zinc-800 px-6 py-4 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-black uppercase tracking-tight text-slate-900 dark:text-white">{form.id ? "Edit Role" : "Create Role"}</h2>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Select permissions under each module</p>
              </div>
              <button type="button" onClick={() => setIsOpen(false)} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="space-y-1.5">
                  <span className="text-[11px] font-black uppercase tracking-widest text-slate-700 dark:text-slate-300">Role Name</span>
                  <input
                    required
                    disabled={isSuperAdmin}
                    value={form.name}
                    onChange={(event) => setForm({ ...form, name: event.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-lg text-sm font-bold outline-none focus:border-indigo-500 disabled:opacity-60"
                    placeholder="e.g. Cashier"
                  />
                </label>
                <label className="space-y-1.5">
                  <span className="text-[11px] font-black uppercase tracking-widest text-slate-700 dark:text-slate-300">Description</span>
                  <input
                    value={form.description}
                    onChange={(event) => setForm({ ...form, description: event.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-lg text-sm font-bold outline-none focus:border-indigo-500"
                    placeholder="Short description of this role"
                  />
                </label>
              </div>

              <div className="flex flex-col gap-3 rounded-lg bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <span className="text-xs font-black uppercase tracking-widest text-slate-600 dark:text-slate-400">
                  Permissions Selected: {selectedCount} / {allPermissions.length}
                </span>
                {!isSuperAdmin && (
                  <button
                    type="button"
                    onClick={toggleAll}
                    className={cn(
                      "inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-[11px] font-black uppercase tracking-widest transition-colors",
                      allFormSelected ? "bg-slate-200 text-slate-700 hover:bg-slate-300 dark:bg-zinc-800 dark:text-zinc-300" : "bg-indigo-600 text-white hover:bg-indigo-500",
                    )}
                  >
                    {allFormSelected ? <Square className="w-3 h-3" /> : <CheckSquare2 className="w-3 h-3" />}
                    {allFormSelected ? "Deselect All" : "Select All"}
                  </button>
                )}
                {isSuperAdmin && <span className="text-[11px] font-black uppercase tracking-widest text-amber-600 dark:text-amber-400">Super Admin has all permissions by default and cannot be restricted.</span>}
              </div>

              {!permissionsReady ? (
                <div className="flex items-center justify-center py-12 gap-3 text-slate-400">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span className="text-sm font-bold">Loading permissions...</span>
                </div>
              ) : (
                <div className="space-y-4">
                  {Object.entries(groupedPermissions).map(([moduleName, modulePermissions]) => {
                    const moduleIds = (modulePermissions as any[]).map((permission) => permission.id);
                    const allModuleSelected = moduleIds.every((id) => form.permissionIds.includes(id));
                    const someModuleSelected = moduleIds.some((id) => form.permissionIds.includes(id));

                    return (
                      <section key={moduleName} className="border border-slate-200 dark:border-zinc-800 rounded-lg overflow-hidden">
                        <div className="flex items-center justify-between px-4 py-3 bg-slate-50 dark:bg-zinc-950 border-b border-slate-200 dark:border-zinc-800">
                          <h3 className="text-xs font-black uppercase tracking-widest text-slate-700 dark:text-slate-300">{moduleName}</h3>
                          {!isSuperAdmin && (
                            <button
                              type="button"
                              onClick={() => toggleModule(modulePermissions as any[])}
                              className={cn(
                                "inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-[10px] font-black uppercase tracking-widest transition-colors",
                                allModuleSelected
                                  ? "bg-indigo-100 text-indigo-700 hover:bg-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300"
                                  : someModuleSelected
                                    ? "bg-slate-200 text-slate-600 hover:bg-slate-300 dark:bg-zinc-800 dark:text-zinc-300"
                                    : "bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-zinc-900 dark:text-zinc-400",
                              )}
                            >
                              {allModuleSelected ? <CheckSquare2 className="w-3 h-3" /> : <Square className="w-3 h-3" />}
                              {allModuleSelected ? "All" : someModuleSelected ? "Some" : "None"}
                            </button>
                          )}
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2 p-3">
                          {(modulePermissions as any[]).map((permission) => {
                            const checked = isSuperAdmin || form.permissionIds.includes(permission.id);
                            return (
                              <label
                                key={permission.id}
                                title={formatPermissionLabel(permission)}
                                className={cn(
                                  "flex items-center gap-3 min-h-12 rounded-lg border px-3 py-2 text-xs font-bold transition-colors",
                                  checked
                                    ? "border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-900/60 dark:bg-indigo-950/30 dark:text-indigo-300"
                                    : "border-slate-200 bg-white text-slate-600 hover:border-indigo-300 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300",
                                  isSuperAdmin ? "cursor-not-allowed opacity-75" : "cursor-pointer",
                                )}
                              >
                                <input
                                  type="checkbox"
                                  disabled={isSuperAdmin}
                                  checked={checked}
                                  onChange={() => togglePermission(permission.id)}
                                  className="w-4 h-4 flex-shrink-0 rounded border-slate-300 accent-indigo-600 dark:border-zinc-700"
                                />
                                <span className="flex-1 leading-snug whitespace-normal break-words">{formatPermissionLabel(permission)}</span>
                              </label>
                            );
                          })}
                        </div>
                      </section>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="sticky bottom-0 bg-white dark:bg-zinc-900 border-t border-slate-200 dark:border-zinc-800 px-6 py-4 flex items-center justify-between gap-3">
              {error ? <p className="text-xs font-bold text-red-600">{error}</p> : <p className="text-xs text-slate-400 font-bold">{selectedCount} of {allPermissions.length} permissions selected</p>}
              <div className="flex gap-3">
                <button type="button" onClick={() => setIsOpen(false)} className="px-5 py-2.5 rounded-lg border border-slate-200 dark:border-zinc-800 text-xs font-black uppercase tracking-widest text-slate-500 hover:bg-slate-50">
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-indigo-600 text-white text-xs font-black uppercase tracking-widest hover:bg-indigo-500 disabled:opacity-60">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Save Role
                </button>
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
