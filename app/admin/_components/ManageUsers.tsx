"use client";

import React, { useState, useEffect } from "react";
import { apiFetch } from "../../services/api";
import UserEditModal from "./UserEditModal";

interface UserData {
  id: number;
  username: string;
  email: string;
  role: string;
  isActive: boolean;
  // FIX: Extended types matching the core Prisma layout specs cleanly
  firstName: string | null;
  lastName: string | null;
  nickname: string | null;
}

export default function ManageUsers() {
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const data = await apiFetch("/users");
      setUsers(data);
    } catch (err: any) {
      setError(err.message || "Failed to load credentials catalog records.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  if (loading && users.length === 0) {
    return (
      <div className="text-center font-bold text-sm py-12 text-chess-text opacity-40 tracking-widest animate-pulse">
        Loading credential indexes...
      </div>
    );
  }

  return (
    <div className="bg-chess-surface p-8 rounded-2xl space-y-6 animate-fade-in text-chess-text">
      <div className="space-y-1 border-b border-chess-border border-opacity-20 pb-4">
        <h2 className="text-xl font-bold tracking-tight text-chess-text">
          Manage users
        </h2>
        <p className="text-xs font-semibold text-chess-primary opacity-70">
          Supervise user entities, privileges, and operational suspension states
          cleanly
        </p>
      </div>

      {error && (
        <div className="bg-red-500/5 border border-red-500/10 px-4 py-2.5 rounded-xl text-xs font-semibold text-red-400">
          {error}
        </div>
      )}

      {/* Structured User Datagrid Frame */}
      <div className="space-y-3">
        {users.length === 0 ? (
          <p className="text-center font-bold text-xs opacity-30 py-6">
            No users indexed inside records yet.
          </p>
        ) : (
          users.map((u) => (
            <div
              key={u.id}
              className="bg-chess-bg/40 border border-chess-border border-opacity-20 p-4 rounded-xl flex items-center justify-between gap-4 flex-wrap"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-chess-text/90">
                    {u.username}
                  </span>

                  {/* FIX: Render identity metadata context if optional parameters exist */}
                  {u.nickname && (
                    <span className="text-xs text-chess-primary font-medium">
                      ({u.nickname})
                    </span>
                  )}

                  <span
                    className={`text-[9px] px-2 py-0.5 rounded-md font-bold uppercase tracking-wider ${
                      u.role === "admin"
                        ? "bg-red-500/10 text-red-400 border border-red-500/10"
                        : u.role === "moderator"
                          ? "bg-chess-primary/10 text-chess-primary border border-chess-primary/10"
                          : "bg-chess-text/5 text-chess-text/40"
                    }`}
                  >
                    {u.role}
                  </span>
                  {!u.isActive && (
                    <span className="text-[9px] bg-red-500/10 text-red-400 px-2 py-0.5 rounded-md font-bold uppercase tracking-wider border border-red-500/10">
                      Suspended
                    </span>
                  )}
                </div>

                {/* Secondary data strip containing real names and emails */}
                <div className="text-xs font-medium text-chess-text/40 flex flex-col md:flex-row md:items-center gap-1 md:gap-3">
                  <span>{u.email}</span>
                  {(u.firstName || u.lastName) && (
                    <span className="hidden md:inline text-chess-border opacity-30">
                      |
                    </span>
                  )}
                  <span className="italic font-normal">
                    {[u.firstName, u.lastName].filter(Boolean).join(" ")}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedUser(u)}
                className="px-4 py-2 bg-chess-surface border border-chess-border border-opacity-30 rounded-xl font-bold text-xs text-chess-text/80 hover:border-chess-primary/30 transition-all cursor-pointer"
              >
                Modify User
              </button>
            </div>
          ))
        )}
      </div>

      <UserEditModal
        targetUser={selectedUser}
        onClose={() => setSelectedUser(null)}
        onSuccess={fetchUsers}
      />
    </div>
  );
}
