"use client";

import { useState, useEffect } from "react";
import {
  Settings,
  Save,
  CheckCircle2,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface WorkspaceDetails {
  id: string;
  name: string;
  slug: string;
  creator_role?: string;
}

export default function SettingsDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const [workspaceId, setWorkspaceId] = useState("");
  const [workspaceName, setWorkspaceName] = useState("");
  const [slug, setSlug] = useState("");
  const [creatorRole, setCreatorRole] = useState("");

  useEffect(() => {
    async function loadSettings() {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;

        const { data: member } = await supabase
          .from("workspace_members")
          .select("workspace_id, workspaces(*)")
          .eq("user_id", user.id)
          .single();

        if (member?.workspaces) {
          const ws = member.workspaces as unknown as WorkspaceDetails;
          setWorkspaceId(ws.id);
          setWorkspaceName(ws.name || "");
          setSlug(ws.slug || "");
          setCreatorRole(ws.creator_role || "Creator / Influencer");
        }
      } catch (err) {
        console.error("Error loading settings", err);
      } finally {
        setLoading(false);
      }
    }
    loadSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspaceId) return;

    setSaving(true);
    setStatusMsg(null);

    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("workspaces")
        .update({
          name: workspaceName.trim(),
          creator_role: creatorRole,
        })
        .eq("id", workspaceId);

      if (error) throw error;
      setStatusMsg("Workspace settings updated successfully.");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to update settings";
      setStatusMsg("Error updating settings: " + message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[500px] flex items-center justify-center text-xs text-[#7c727e]">
        <span className="h-4 w-4 rounded-full border-2 border-[#f36b3f] border-t-transparent animate-spin mr-2" />
        Loading Settings...
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-10 max-w-4xl mx-auto space-y-8">
      <div>
        <div className="inline-flex items-center gap-2 rounded-full border border-[#e5dcd1] bg-[#fffdf8] px-3 py-1 text-xs font-bold text-[#c45a3a] mb-2 shadow-xs">
          <Settings className="h-3.5 w-3.5 text-[#f36b3f]" />
          WORKSPACE CONFIGURATION
        </div>
        <h1 className="font-editorial text-3xl sm:text-4xl font-bold text-[#211b29]">
          Settings & Identity
        </h1>
        <p className="text-xs text-[#7c727e]">
          Manage your brand name, public URL, and creator persona.
        </p>
      </div>

      <div className="rounded-2xl border border-[#e5dcd1] bg-[#fffdf8] p-8 shadow-xs">
        {statusMsg && (
          <div className="mb-6 p-3 rounded-lg text-xs bg-[#e4f1eb] text-[#277a67] flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{statusMsg}</span>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-5 max-w-lg">
          <div>
            <label className="block text-xs font-bold text-[#211b29] mb-1.5">
              Workspace Display Name
            </label>
            <input
              type="text"
              required
              value={workspaceName}
              onChange={(e) => setWorkspaceName(e.target.value)}
              className="w-full rounded-lg border border-[#e5dcd1] bg-[#f4efe7] px-3.5 py-2.5 text-xs text-[#211b29] focus:outline-none focus:border-[#f36b3f]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#211b29] mb-1.5">
              Permanent Handle
            </label>
            <div className="flex items-center rounded-lg border border-[#e5dcd1] bg-[#eae2dc] px-3.5 py-2.5 text-xs text-[#7c727e]">
              <span className="font-semibold text-[#a99ca7] mr-1">
                biolio.site/
              </span>
              <span className="font-mono font-bold text-[#211b29]">{slug}</span>
            </div>
            <p className="mt-1 text-[11px] text-[#7c727e]">
              Handles are locked after initial reservation to protect your follower links.
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#211b29] mb-1.5">
              Creator Persona
            </label>
            <select
              value={creatorRole}
              onChange={(e) => setCreatorRole(e.target.value)}
              className="w-full rounded-lg border border-[#e5dcd1] bg-[#f4efe7] px-3.5 py-2.5 text-xs text-[#211b29] focus:outline-none focus:border-[#f36b3f]"
            >
              <option value="Creator / Influencer">Creator / Influencer</option>
              <option value="Fashion / Model / Stylist">Fashion / Model / Stylist</option>
              <option value="Photographer / Artist">Photographer / Artist</option>
              <option value="Writer / Journalist">Writer / Journalist</option>
              <option value="Culinary / Hospitality">Culinary / Hospitality</option>
              <option value="Brand / E-commerce">Brand / E-commerce</option>
            </select>
          </div>

          <div className="pt-4 border-t border-[#eee6dc]">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-lg bg-[#f36b3f] px-5 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-[#ee7048] disabled:opacity-50 transition-all"
            >
              <Save className="h-3.5 w-3.5" />
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
