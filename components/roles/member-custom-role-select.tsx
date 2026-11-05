"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@/components/ui/toast";

type Props = {
  userId: number;
  value: number | null;
  roles: { id: number; name: string }[];
};

export function MemberCustomRoleSelect({ userId, value, roles }: Props) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  const change = async (next: string) => {
    setSaving(true);
    const res = await fetch(`/api/workspace-members/${userId}/custom-role`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ customRoleId: next ? Number(next) : null }),
    });
    const json = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) return toast(json.error || "Failed to update role.", "error");
    toast("Custom role updated", "success");
    router.refresh();
  };

  return (
    <select
      aria-label="Custom role"
      value={value ?? ""}
      disabled={saving}
      onChange={(e) => change(e.target.value)}
      className="h-8 border border-gray-300 bg-white px-2 text-xs text-gray-800 disabled:opacity-50"
    >
      <option value="">Built-in role</option>
      {roles.map((r) => (
        <option key={r.id} value={r.id}>{r.name}</option>
      ))}
    </select>
  );
}
