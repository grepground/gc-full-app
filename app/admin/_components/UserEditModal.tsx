"use client";

import React, { useState, useEffect } from "react";
import { apiFetch } from "../../services/api";

interface UserData {
  id: number;
  username: string;
  email: string;
  role: string;
  isActive: boolean;
  firstName: string | null;
  lastName: string | null;
  nickname: string | null;
}

interface UserEditModalProps {
  targetUser: UserData | null;
  onClose: () => void;
  onSuccess: () => Promise<void>;
}

export default function UserEditModal({
  targetUser,
  onClose,
  onSuccess,
}: UserEditModalProps) {
  const [username, setUsername] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [role, setRole] = useState<string>("user");
  const [isActive, setIsActive] = useState<boolean>(true);

  // FIX: New identity fields state mappings
  const [firstName, setFirstName] = useState<string>("");
  const [lastName, setLastName] = useState<string>("");
  const [nickname, setNickname] = useState<string>("");

  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (targetUser) {
      setUsername(targetUser.username);
      setEmail(targetUser.email);
      setRole(targetUser.role);
      setIsActive(targetUser.isActive ?? true);
      setFirstName(targetUser.firstName || "");
      setLastName(targetUser.lastName || "");
      setNickname(targetUser.nickname || "");
      setError(null);
    }
  }, [targetUser]);

  if (!targetUser) return null;

  const handleSaveChanges = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // FIX: Included new variables to short-circuit check gates safely
    const hasChanged =
      username !== targetUser.username ||
      email !== targetUser.email ||
      role !== targetUser.role ||
      isActive !== targetUser.isActive ||
      firstName !== (targetUser.firstName || "") ||
      lastName !== (targetUser.lastName || "") ||
      nickname !== (targetUser.nickname || "");

    if (!hasChanged) {
      onClose();
      return;
    }

    setIsSaving(true);
    try {
      await apiFetch(`/users/${targetUser.id}`, {
        method: "PATCH",
        // Pass empty strings as null tokens back into the database if cleared
        body: JSON.stringify({
          username,
          email,
          role,
          isActive,
          firstName: firstName.trim() || null,
          lastName: lastName.trim() || null,
          nickname: nickname.trim() || null,
        }),
      });

      await onSuccess();
      onClose();
    } catch (err: any) {
      setError(
        err.message || "Failed to commit credential changes back to storage.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <div
        onClick={onClose}
        className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm animate-fade-in"
      />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <form
          onSubmit={handleSaveChanges}
          className="bg-chess-surface border border-chess-border/20 w-full max-w-md p-6 rounded-2xl space-y-5 pointer-events-auto animate-scale-up text-chess-text"
        >
          <div className="space-y-1">
            <h3 className="text-base font-bold tracking-tight text-chess-text">
              Modify Credentials
            </h3>
            <p className="text-xs text-chess-text/40 font-medium leading-relaxed">
              Update user entity states directly. Password fields are strictly
              omitted.
            </p>
          </div>

          {error && (
            <div className="bg-red-500/5 border border-red-500/10 px-4 py-2.5 rounded-xl text-xs font-semibold text-red-400">
              {error}
            </div>
          )}

          <div className="space-y-4 text-xs font-bold">
            {/* Row 1: Core System Identifiers */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase text-chess-text/40 tracking-wider">
                  Username
                </label>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-chess-bg/40 border border-chess-border/20 px-3 py-2.5 rounded-xl font-medium text-sm text-chess-text focus:outline-none focus:border-chess-primary transition-colors"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] uppercase text-chess-text/40 tracking-wider">
                  Chess Nickname
                </label>
                <input
                  type="text"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder="Optional rank name"
                  className="w-full bg-chess-bg/40 border border-chess-border/20 px-3 py-2.5 rounded-xl font-medium text-sm text-chess-text focus:outline-none focus:border-chess-primary transition-colors"
                />
              </div>
            </div>

            {/* Input: Email Address */}
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase text-chess-text/40 tracking-wider">
                Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-chess-bg/40 border border-chess-border/20 px-3 py-2.5 rounded-xl font-medium text-sm text-chess-text focus:outline-none focus:border-chess-primary transition-colors"
              />
            </div>

            {/* FIX: Row 2: Real Identity Information Blocks */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase text-chess-text/40 tracking-wider">
                  First Name
                </label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full bg-chess-bg/40 border border-chess-border/20 px-3 py-2.5 rounded-xl font-medium text-sm text-chess-text focus:outline-none focus:border-chess-primary transition-colors"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] uppercase text-chess-text/40 tracking-wider">
                  Last Name
                </label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full bg-chess-bg/40 border border-chess-border/20 px-3 py-2.5 rounded-xl font-medium text-sm text-chess-text focus:outline-none focus:border-chess-primary transition-colors"
                />
              </div>
            </div>

            {/* Row 3: Privileges & Lifecycle Access */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase text-chess-text/40 tracking-wider">
                  Access Privilege
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full bg-chess-bg/40 border border-chess-border/20 px-3 py-2.5 rounded-xl font-medium text-sm text-chess-text focus:outline-none focus:border-chess-primary transition-colors cursor-pointer"
                >
                  <option value="user">User</option>
                  <option value="moderator">Moderator</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] uppercase text-chess-text/40 tracking-wider">
                  Account Status
                </label>
                <select
                  value={isActive ? "active" : "suspended"}
                  onChange={(e) => setIsActive(e.target.value === "active")}
                  className="w-full bg-chess-bg/40 border border-chess-border/20 px-3 py-2.5 rounded-xl font-medium text-sm text-chess-text focus:outline-none focus:border-chess-primary transition-colors cursor-pointer"
                >
                  <option value="active">Active</option>
                  <option value="suspended">Suspended</option>
                </select>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs font-bold pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="w-full bg-chess-bg/60 border border-chess-border/10 text-chess-text/60 py-2.5 rounded-xl hover:bg-chess-surface-hover transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="w-full bg-chess-primary text-chess-surface py-2.5 rounded-xl hover:opacity-90 transition-opacity cursor-pointer"
            >
              {isSaving ? "Saving..." : "Commit Update"}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
