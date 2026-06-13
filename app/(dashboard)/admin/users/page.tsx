"use client";

import React, { useState } from "react";
import { Users, Plus, ShieldCheck, Mail, Pencil, X, LayoutDashboard, Building2, UserCircle2, Trash2, UserX, UserCheck, AlertCircle } from "lucide-react";
import { useAppData } from "@/lib/client/useAppData";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "motion/react";

export default function UserManagementPage() {
  const { users, locations, roles, addUser, updateUser, deleteUser, updateUserStatus } = useAppData();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<any>(null);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [userToToggleStatus, setUserToToggleStatus] = useState<any>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const showError = (msg: string) => {
    setError(msg);
    setTimeout(() => setError(""), 5000);
  };
  
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    role: "Sales",
    roleId: "",
    assignedLocations: [] as string[],
    username: "",
    phone: "",
    password: ""
  });

  const handleOpenModal = (user?: any) => {
    if (user) {
      setEditingUser(user);
      setFormData({
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        roleId: user.roleId || "",
        assignedLocations: user.assignedLocations,
        username: user.username || "",
        phone: user.phone || "",
        password: ""
      });
    } else {
      setEditingUser(null);
      setFormData({
        firstName: "",
        lastName: "",
        role: "Sales",
        roleId: roles?.find((role: any) => role.name === "Sales")?.id || "",
        assignedLocations: [],
        username: "",
        phone: "",
        password: ""
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingUser) {
        const selectedRole = roles?.find((role: any) => role.id === formData.roleId);
        await updateUser({ ...editingUser, ...formData, role: selectedRole?.name || formData.role });
      } else {
        const selectedRole = roles?.find((role: any) => role.id === formData.roleId);
        await addUser({
          ...formData,
          role: selectedRole?.name || formData.role,
        });
      }
      setIsModalOpen(false);
    } catch (err) {
      showError(err instanceof Error ? err.message : "Failed to save user. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const toggleLocation = (locationId: string) => {
    setFormData(prev => ({
      ...prev,
      assignedLocations: prev.assignedLocations.includes(locationId)
        ? prev.assignedLocations.filter(id => id !== locationId)
        : [...prev.assignedLocations, locationId]
    }));
  };

  return (
    <>
    <div className="space-y-6 animate-in fade-in duration-500 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
            <UserCircle2 className="w-8 h-8 text-indigo-600" />
            User Management
          </h1>
          <p className="text-slate-500 mt-1 font-bold text-[10px] uppercase tracking-widest opacity-70">Control access levels and location assignments</p>
        </div>
        <button 
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-indigo-900/20 hover:bg-indigo-500 active:scale-95 transition-all"
        >
          <Plus className="w-4 h-4" /> Add User
        </button>
      </div>

      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-center gap-3 px-5 py-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 rounded-2xl text-sm font-bold text-red-700 dark:text-red-400"
          >
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span className="flex-1">{error}</span>
            <button onClick={() => setError("")} className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors">
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-[2.5rem] overflow-hidden shadow-sm">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-slate-50/50 dark:bg-zinc-950/50 border-b border-slate-100 dark:border-zinc-800">
              <th className="px-6 py-5 text-[11px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest">User Details</th>
              <th className="px-6 py-5 text-[11px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest">Role</th>
              <th className="px-6 py-5 text-[11px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest">Assigned Locations</th>
              <th className="px-6 py-5 text-[11px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest">Status</th>
              <th className="px-6 py-5 text-right"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-slate-50/50 dark:hover:bg-zinc-800/30 transition-colors group">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center text-indigo-600 font-black text-xs">
                      {user.firstName?.charAt(0)}{user.lastName?.charAt(0) || ""}
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-tight">{user.firstName} {user.lastName || ""}</h4>
                      <p className="text-[10px] font-mono text-slate-400">{user.id}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className={cn(
                    "inline-flex items-center gap-2 px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest",
                    user.role === 'Super Admin' ? "bg-amber-100 text-amber-700 bg-amber-500/10" : "bg-indigo-100 text-indigo-700 bg-indigo-500/10"
                  )}>
                    <ShieldCheck className="w-3.5 h-3.5" />
                    {user.role}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-wrap gap-1.5">
                    {user.assignedLocations.map(bid => {
                      const location = locations.find(b => b.id === bid);
                      return (
                        <span key={bid} className="px-2 py-0.5 bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 rounded-md text-[9px] font-bold">
                          {location?.name}
                        </span>
                      );
                    })}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className={cn(
                    "inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-widest",
                    user.isActive ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400" : "bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400"
                  )}>
                    <div className={cn("w-1.5 h-1.5 rounded-full", user.isActive ? "bg-emerald-500" : "bg-red-500")} />
                    {user.isActive ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button 
                      onClick={() => { setUserToToggleStatus(user); setIsStatusModalOpen(true); }}
                      title={user.isActive ? "Deactivate User" : "Activate User"}
                      className={cn(
                        "p-2 rounded-xl transition-all",
                        user.isActive 
                          ? "text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-500/10" 
                          : "text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-500/10"
                      )}
                    >
                      {user.isActive ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                    </button>
                    <button 
                      onClick={() => handleOpenModal(user)}
                      title="Edit User"
                      className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/10 rounded-xl transition-all"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => { setUserToDelete(user); setIsDeleteDialogOpen(true); }}
                      title="Delete User"
                      className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-xl transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-white/40 dark:bg-zinc-950/60 backdrop-blur-md"
            />
            <motion.form 
              onSubmit={handleSubmit}
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative w-full max-w-xl max-h-[90vh] flex flex-col bg-white dark:bg-zinc-900 rounded-[2.5rem] shadow-2xl border border-slate-200 dark:border-zinc-800 overflow-hidden"
            >
                <div className="p-6 md:p-8 border-b border-slate-100 dark:border-zinc-800 flex items-center justify-between shrink-0">
                  <div>
                    <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight uppercase">{editingUser ? 'Edit User' : 'Add New User'}</h2>
                    <p className="text-[11px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest">Set permissions and shop/store access</p>
                  </div>
                  <button type="button" onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-full transition-colors">
                    <X className="w-5 h-5 text-slate-400" />
                  </button>
                </div>

                <div className="p-6 md:p-8 space-y-6 overflow-y-auto min-h-0">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                    <label className="text-[11px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest px-1">First Name</label>
                    <input 
                      type="text"
                      required
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-2xl text-xs font-bold outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all"
                      value={formData.firstName}
                      onChange={e => setFormData({ ...formData, firstName: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest px-1">Last Name</label>
                    <input 
                      type="text"
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-2xl text-xs font-bold outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all"
                      value={formData.lastName}
                      onChange={e => setFormData({ ...formData, lastName: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest px-1">Username</label>
                    <input 
                      type="text"
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-2xl text-xs font-bold outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all"
                      value={formData.username}
                      onChange={e => setFormData({ ...formData, username: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest px-1">Phone Number</label>
                    <input 
                      type="text"
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-2xl text-xs font-bold outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all"
                      value={formData.phone}
                      onChange={e => setFormData({ ...formData, phone: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest px-1">
                    {editingUser ? "Password (leave blank to keep)" : "Password"}
                  </label>
                  <input 
                    type="password"
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-2xl text-xs font-bold outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all"
                    value={formData.password}
                    onChange={e => setFormData({ ...formData, password: e.target.value })}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest px-1">Access Role</label>
                  <div className="grid grid-cols-3 gap-3">
                    {Array.from(new Map((roles || []).map((r: any) => [r.id, r])).values()).map((role: any) => (
                      <button
                        key={role.id}
                        type="button"
                        onClick={() => setFormData({ ...formData, role: role.name, roleId: role.id })}
                        className={cn(
                          "py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all",
                          formData.roleId === role.id || (!formData.roleId && formData.role === role.name)
                            ? "bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-500/20" 
                            : "bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 text-slate-500 hover:border-indigo-500"
                        )}
                      >
                        {role.name}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest px-1">Assigned Locations</label>
                  <div className="grid grid-cols-2 gap-2 p-4 bg-slate-50 dark:bg-zinc-950 rounded-2xl border border-slate-100 dark:border-zinc-800">
                    {locations.map((location) => {
                      const isChecked = formData.assignedLocations.includes(location.id);
                      return (
                        <button
                          key={location.id}
                          type="button"
                          onClick={() => toggleLocation(location.id)}
                          className={cn(
                            "flex items-center justify-between p-3 rounded-xl border text-[10px] font-black uppercase tracking-tight transition-all text-left",
                            isChecked
                              ? "bg-indigo-50/50 dark:bg-indigo-950/20 border-indigo-200 dark:border-indigo-900/50 text-indigo-600 dark:text-indigo-400"
                              : "bg-white dark:bg-zinc-900 border-slate-100 dark:border-zinc-800 text-slate-500 hover:border-slate-300 dark:hover:border-zinc-700"
                          )}
                        >
                          <div className="flex items-center gap-2.5">
                            <Building2 className={cn("w-4 h-4 shrink-0", isChecked ? "text-indigo-500" : "text-slate-300 dark:text-zinc-700")} />
                            <span className="truncate">{location.name}</span>
                          </div>
                          {/* Checkbox Icon */}
                          <div className={cn(
                            "w-4 h-4 shrink-0 rounded-md border flex items-center justify-center transition-all",
                            isChecked 
                              ? "bg-indigo-600 border-indigo-600 text-white" 
                              : "bg-white dark:bg-zinc-950 border-slate-300 dark:border-zinc-800"
                          )}>
                            {isChecked && (
                              <svg className="w-2.5 h-2.5 stroke-[3] text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
                </div>

                <div className="p-6 md:p-8 bg-slate-50/50 dark:bg-zinc-950/50 flex gap-4 shrink-0 border-t border-slate-100 dark:border-zinc-800">
                  <button 
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 px-6 py-4 rounded-2xl border border-slate-200 dark:border-zinc-800 text-xs font-black text-slate-500 uppercase tracking-widest hover:bg-slate-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    disabled={saving}
                    className="flex-[2] bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed text-white rounded-2xl py-4 font-black text-xs uppercase tracking-widest shadow-xl shadow-indigo-500/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                  >
                    {saving ? (
                      <>
                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                        </svg>
                        Saving…
                      </>
                    ) : (
                      editingUser ? 'Save Changes' : 'Create User'
                    )}
                  </button>
                </div>
            </motion.form>
          </div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {isStatusModalOpen && userToToggleStatus && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsStatusModalOpen(false)}
              className="absolute inset-0 bg-white/40 dark:bg-zinc-950/60 backdrop-blur-md"
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative w-full max-w-md bg-white dark:bg-zinc-900 rounded-[2rem] shadow-2xl overflow-hidden border border-slate-200 dark:border-zinc-800 p-8 text-center"
            >
              <div className={cn(
                "w-16 h-16 rounded-3xl mx-auto flex items-center justify-center mb-6",
                userToToggleStatus.isActive ? "bg-amber-100 text-amber-600 dark:bg-amber-500/20" : "bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20"
              )}>
                {userToToggleStatus.isActive ? <UserX className="w-8 h-8" /> : <UserCheck className="w-8 h-8" />}
              </div>
              <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight mb-2">
                {userToToggleStatus.isActive ? "Deactivate User?" : "Activate User?"}
              </h2>
              <p className="text-sm font-bold text-slate-500 mb-8">
                {userToToggleStatus.isActive 
                  ? `Are you sure you want to deactivate ${userToToggleStatus.firstName}? They will no longer be able to log in.`
                  : `Are you sure you want to activate ${userToToggleStatus.firstName}? They will regain access to the system.`}
              </p>
              <div className="flex gap-4">
                <button 
                  onClick={() => setIsStatusModalOpen(false)}
                  className="flex-1 py-4 rounded-2xl border border-slate-200 dark:border-zinc-800 text-xs font-black text-slate-500 uppercase tracking-widest hover:bg-slate-50 dark:hover:bg-zinc-800/50 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={async () => {
                    try {
                      await updateUserStatus(userToToggleStatus.id, !userToToggleStatus.isActive);
                    } catch (err) {
                      showError(err instanceof Error ? err.message : "Failed to update user status.");
                    }
                    setIsStatusModalOpen(false);
                  }}
                  className={cn(
                    "flex-1 text-white rounded-2xl py-4 font-black text-xs uppercase tracking-widest shadow-xl transition-all active:scale-[0.98]",
                    userToToggleStatus.isActive ? "bg-amber-500 hover:bg-amber-600 shadow-amber-500/20" : "bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/20"
                  )}
                >
                  Confirm
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isDeleteDialogOpen && userToDelete && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsDeleteDialogOpen(false)}
              className="absolute inset-0 bg-white/40 dark:bg-zinc-950/60 backdrop-blur-md"
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative w-full max-w-md bg-white dark:bg-zinc-900 rounded-[2rem] shadow-2xl overflow-hidden border border-slate-200 dark:border-zinc-800 p-8 text-center"
            >
              <div className="w-16 h-16 rounded-3xl mx-auto flex items-center justify-center mb-6 bg-red-100 text-red-600 dark:bg-red-500/20">
                <Trash2 className="w-8 h-8" />
              </div>
              <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight mb-2">Delete User?</h2>
              <p className="text-sm font-bold text-slate-500 mb-8">
                Are you sure you want to permanently delete <strong>{userToDelete.firstName} {userToDelete.lastName}</strong>? This action cannot be undone.
              </p>
              <div className="flex gap-4">
                <button 
                  onClick={() => setIsDeleteDialogOpen(false)}
                  className="flex-1 py-4 rounded-2xl border border-slate-200 dark:border-zinc-800 text-xs font-black text-slate-500 uppercase tracking-widest hover:bg-slate-50 dark:hover:bg-zinc-800/50 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={async () => {
                    try {
                      await deleteUser(userToDelete.id);
                    } catch (err) {
                      showError(err instanceof Error ? err.message : "Failed to delete user.");
                    }
                    setIsDeleteDialogOpen(false);
                  }}
                  className="flex-1 bg-red-500 hover:bg-red-600 text-white rounded-2xl py-4 font-black text-xs uppercase tracking-widest shadow-xl shadow-red-500/20 transition-all active:scale-[0.98]"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
