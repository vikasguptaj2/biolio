"use client";

import { useState, useEffect } from "react";
import type { EvaluatedWorkspaceEntitlements } from "@/lib/entitlements";
import {
  ProductLockPaywall,
  FeatureTierBanner,
} from "@/components/dashboard/feature-lock";
import {
  Plus,
  Trash2,
  CheckCircle2,
  Loader2,
  Zap,
  RefreshCw,
} from "lucide-react";

type DmScreen = "overview" | "flows" | "builder" | "activity" | "settings";

interface AutomationRule {
  id: string;
  name: string;
  keywords: string[];
  match_mode: string;
  target_scope?: string;
  is_enabled: boolean;
  cooldown_hours?: number;
  private_message_template: string;
  public_reply_template?: string | null;
  send_public_reply?: boolean;
  cta_button_label?: string | null;
  destination_url?: string | null;
}

interface InstagramConnection {
  id: string;
  ig_username: string;
  account_type?: string;
  status: string;
  hourly_ceiling?: number;
}

interface AutomationExecution {
  id: string;
  created_at: string;
  commenter_username?: string;
  matched_keyword?: string;
  status: string;
  attribution_token?: string;
}

export default function AutomationDashboardPage() {
  const [activeScreen, setActiveScreen] = useState<DmScreen>("overview");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [workspaceSlug, setWorkspaceSlug] = useState("creator");
  const [entitlements, setEntitlements] =
    useState<EvaluatedWorkspaceEntitlements | null>(null);
  const [connection, setConnection] = useState<InstagramConnection | null>(null);
  const [rules, setRules] = useState<AutomationRule[]>([]);
  const [executions, setExecutions] = useState<AutomationExecution[]>([]);

  // Flow Builder State (Matches dmBuilder in prototype)
  const [ruleName, setRuleName] = useState("Send my free city guide");
  const [keywordsInput, setKeywordsInput] = useState("GUIDE, CITY GUIDE");
  const [matchMode, setMatchMode] = useState("exact_token");
  const [targetScope, setTargetScope] = useState("all_eligible_posts");
  const [privateMessage, setPrivateMessage] = useState(
    "Hey! ✨ So happy you're here. Here's my little city guide — I hope it helps you find a new favourite spot."
  );
  const [ctaButtonLabel, setCtaButtonLabel] = useState("Get the city guide");
  const [destinationUrl, setDestinationUrl] = useState(
    "https://biolio.site/creator"
  );
  const [sendPublicReply, setSendPublicReply] = useState(true);
  const [publicReplyTemplate, setPublicReplyTemplate] = useState(
    "Just sent the guide to your DMs! Check your message requests ✨"
  );
  const [cooldownHours] = useState(6);

  function showToast(msg: string) {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  }

  const [refreshKey, setRefreshKey] = useState(0);

  function loadAutomation() {
    setLoading(true);
    setRefreshKey((k) => k + 1);
  }

  useEffect(() => {
    let ignore = false;

    async function loadData() {
      try {
        const res = await fetch("/api/automation/workflows");
        const data = await res.json();
        if (ignore) return;

        if (!res.ok) {
          if (data?.error?.code === "MODULE_LOCKED") {
            setEntitlements({
              activePlanId: "bio_creator",
              activePlanLabel: "Biolio Bio Standalone",
              activeScope: "bio_only",
              scope: "bio_only",
              bioState: "paid",
              igState: "locked",
              isBioProductLocked: false,
              isAutomationProductLocked: true,
              automationLockReason: data.error.message,
              bioTier: "creator",
              bioMaxLinks: null,
              bioMaxGalleryItems: 30,
              bioMaxBlogPosts: 20,
              canRemoveBranding: false,
              canRemoveBiolioBranding: false,
              canUseBlogPublishing: true,
              canExportAnalytics: false,
              canUseCustomThemes: true,
              igTier: "free",
              automationMaxActiveRules: 0,
              automationMonthlyActionQuota: 0,
              automationMonthlyActionsUsed: 0,
              automationQuotaPercent: 100,
              canUsePublicCommentReplies: false,
              logRetentionDays: 7,
            });
          } else {
            setErrorMsg(
              data?.error?.message || "Failed to load Instagram Automation."
            );
          }
          return;
        }

        setEntitlements(data.entitlements);
        if (data.workspace?.slug) {
          setWorkspaceSlug(data.workspace.slug);
          setDestinationUrl(`https://biolio.site/${data.workspace.slug}`);
        }
        setConnection(data.connection || null);
        setRules(data.rules || []);
        setExecutions(data.executions || []);
      } catch {
        if (!ignore) {
          setErrorMsg("Failed to connect to Automation API.");
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    void loadData();

    return () => {
      ignore = true;
    };
  }, [refreshKey]);

  async function handleConnectInstagram() {
    setSaving(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/automation/workflows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "connect_account",
          igUsername: workspaceSlug,
          accountType: "CREATOR",
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data?.error?.message || "Failed to connect account.");
      } else {
        setConnection(data.connection);
        showToast(
          `Connected Instagram professional account @${data.connection.ig_username}`
        );
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveWorkflow(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/automation/workflows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create_rule",
          name: ruleName,
          keywords: keywordsInput
            .split(",")
            .map((k) => k.trim().toUpperCase())
            .filter(Boolean),
          matchMode,
          targetScope,
          privateMessageTemplate: privateMessage,
          ctaButtonLabel,
          destinationUrl,
          sendPublicReply,
          publicReplyTemplate,
          cooldownHours,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data?.error?.message || "Could not save workflow.");
      } else {
        setRules([data.rule, ...rules]);
        if (data.connection) setConnection(data.connection);
        showToast("Comment-to-DM workflow saved and activated!");
        setActiveScreen("flows");
      }
    } catch {
      setErrorMsg("Network error saving workflow.");
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleRule(rule: AutomationRule) {
    const nextEnabled = !rule.is_enabled;
    setRules(
      rules.map((r) =>
        r.id === rule.id ? { ...r, is_enabled: nextEnabled } : r
      )
    );
    const res = await fetch("/api/automation/workflows", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ruleId: rule.id, isEnabled: nextEnabled }),
    });
    if (res.ok) {
      showToast(nextEnabled ? "Workflow enabled" : "Workflow paused");
    }
  }

  async function handleDeleteRule(ruleId: string) {
    setRules(rules.filter((r) => r.id !== ruleId));
    await fetch(
      `/api/automation/workflows?ruleId=${encodeURIComponent(ruleId)}`,
      { method: "DELETE" }
    );
    showToast("Workflow deleted");
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-7 w-7 animate-spin text-[#f36b3f]" />
      </div>
    );
  }

  if (entitlements?.isAutomationProductLocked) {
    return (
      <ProductLockPaywall
        lockedProduct="automation"
        currentPlanLabel={entitlements.activePlanLabel}
        lockReason={
          entitlements.automationLockReason ||
          "Your workspace is subscribed to Biolio Bio Standalone. Upgrade to the All-in-One Bundle to unlock Instagram DM Automation."
        }
      />
    );
  }

  const enabledRulesCount = rules.filter((r) => r.is_enabled).length;

  return (
    <div className="space-y-6">
      {toastMsg && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 rounded-[6px] bg-[#211b29] px-4 py-3 text-xs font-bold text-white shadow-2xl flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-[#6ac2a2]" />
          {toastMsg}
        </div>
      )}

      {/* Atelier Header + Screen Switcher Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[#e2d8cd] pb-5">
        <div>
          <div className="text-[9px] font-extrabold uppercase tracking-[2px] text-[#c45a3a] mb-2">
            BIOLIO AUTOMATION &bull; INSTAGRAM
          </div>
          <h1 className="font-editorial text-4xl sm:text-5xl font-semibold tracking-tight text-[#251d2a]">
            Make every comment a starting point.
          </h1>
          <p className="text-xs text-[#817680] mt-2">
            Set up deterministic comment-to-DM replies for eligible Instagram interactions — without living in your inbox.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setActiveScreen("builder")}
            className="inline-flex items-center gap-1.5 rounded-[5px] bg-[#ee7048] px-4 py-2.5 text-xs font-extrabold text-white shadow-sm hover:bg-[#e05e36]"
          >
            <Plus className="h-3.5 w-3.5" /> Create automation
          </button>
        </div>
      </div>

      {/* Sub-navigation Bar matching HTML prototype screens */}
      <div className="flex flex-wrap gap-1.5 rounded-[9px] bg-[#eee6dc] p-1.5 w-max max-w-full">
        {[
          { id: "overview", label: "Automation home" },
          { id: "flows", label: `My automations (${rules.length})` },
          { id: "builder", label: "＋ Flow builder" },
          { id: "activity", label: `Activity & logs (${executions.length})` },
          { id: "settings", label: "Instagram connection" },
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setActiveScreen(t.id as DmScreen)}
            className={`rounded-[6px] px-3.5 py-2 text-[11px] font-bold transition-all ${
              activeScreen === t.id
                ? "bg-[#fffdf8] text-[#211b29] shadow-2xs"
                : "text-[#7c727e] hover:text-[#211b29]"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {errorMsg && (
        <div className="rounded-[7px] border border-[#f5c2c7] bg-[#f8d7da] p-4 text-xs font-bold text-[#842029]">
          {errorMsg}
        </div>
      )}

      {entitlements?.igTier === "free" && (
        <FeatureTierBanner
          title="Starter Free Automation Limits Active (1 Active Rule · 100 DMs/mo)"
          description="Upgrade to Instagram Automation Creator (₹499/mo) or the All-in-One Bundle (₹599/mo) to unlock 5+ active rules, 2,500 monthly DMs, and public comment auto-replies."
          requiredTier="IG Creator or Bundle"
        />
      )}

      {/* SCREEN 1: AUTOMATION HOME (dmOverview) */}
      {activeScreen === "overview" && (
        <div className="space-y-6">
          {/* Dark Connected Account Banner */}
          <div className="rounded-[10px] bg-[#211b29] p-6 text-white relative overflow-hidden shadow-md">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-[#f7a75d] via-[#c34d91] to-[#765be4] flex items-center justify-center text-xl font-bold shrink-0">
                  ◎
                </div>
                <div>
                  <span className="rounded bg-white/15 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-[#c9e8dd]">
                    {connection?.status === "connected"
                      ? "CONNECTED ACCOUNT · WEBHOOK SUBSCRIBED"
                      : "READY TO CONNECT"}
                  </span>
                  <h3 className="font-display text-lg font-extrabold mt-1">
                    @{connection?.ig_username || workspaceSlug}
                  </h3>
                  <p className="text-[11px] text-[#c8becd]">
                    Instagram {connection?.account_type || "CREATOR"} account &bull; Meta Graph API v21.0
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                {connection?.status === "connected" ? (
                  <button
                    type="button"
                    onClick={() => setActiveScreen("settings")}
                    className="rounded-[5px] bg-[#fffdf8] px-3.5 py-2 text-xs font-bold text-[#211b29]"
                  >
                    Manage account
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleConnectInstagram}
                    disabled={saving}
                    className="rounded-[5px] bg-[#f36b3f] px-4 py-2.5 text-xs font-extrabold text-white shadow"
                  >
                    {saving ? "Connecting..." : "Connect Instagram Account"}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* 4 Metric Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-[7px] border border-[#e5dbd0] bg-[#fffdf8] p-4">
              <div className="text-[10px] font-bold text-[#7c727e]">
                Automations
              </div>
              <div className="font-editorial text-3xl font-bold text-[#211b29] mt-2">
                {rules.length}
              </div>
              <div className="text-[10px] text-[#277a67] mt-1">
                {enabledRulesCount} currently enabled
              </div>
            </div>
            <div className="rounded-[7px] border border-[#e5dbd0] bg-[#fffdf8] p-4">
              <div className="text-[10px] font-bold text-[#7c727e]">
                Monthly Action Quota
              </div>
              <div className="font-editorial text-3xl font-bold text-[#211b29] mt-2">
                {entitlements?.automationMonthlyActionsUsed.toLocaleString()} /{" "}
                {entitlements?.automationMonthlyActionQuota.toLocaleString()}
              </div>
              <div className="text-[10px] text-[#7863a7] mt-1">
                {entitlements?.igTier.toUpperCase()} tier limit
              </div>
            </div>
            <div className="rounded-[7px] border border-[#e5dbd0] bg-[#fffdf8] p-4">
              <div className="text-[10px] font-bold text-[#7c727e]">
                API Accepted Executions
              </div>
              <div className="font-editorial text-3xl font-bold text-[#211b29] mt-2">
                {executions.filter((e) => e.status === "accepted").length}
              </div>
              <div className="text-[10px] text-[#277a67] mt-1">
                Verified webhook events
              </div>
            </div>
            <div className="rounded-[7px] border border-[#e5dbd0] bg-[#fffdf8] p-4">
              <div className="text-[10px] font-bold text-[#7c727e]">
                Match Engine
              </div>
              <div className="font-editorial text-3xl font-bold text-[#211b29] mt-2">
                5-Mode
              </div>
              <div className="text-[10px] text-[#997027] mt-1">
                Deterministic word-boundary
              </div>
            </div>
          </div>

          {/* Configured Workflows + Meta Readiness */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-7 rounded-[7px] border border-[#e5dbd0] bg-[#fffdf8] p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-display text-sm font-extrabold text-[#211b29]">
                    Your automations
                  </h3>
                  <p className="text-[11px] text-[#857a83]">
                    Active comment-to-DM keyword workflows.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveScreen("flows")}
                  className="text-xs font-bold text-[#f36b3f] hover:underline"
                >
                  View all &rarr;
                </button>
              </div>

              {rules.length === 0 ? (
                <div className="rounded border border-dashed border-[#e5dcd1] p-8 text-center">
                  <p className="text-xs text-[#7c727e] mb-3">
                    No automation rules configured yet.
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveScreen("builder")}
                    className="rounded-[5px] bg-[#211b29] px-4 py-2 text-xs font-bold text-white"
                  >
                    ＋ Create your first workflow
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-[#eee6dc]">
                  {rules.map((r) => (
                    <div
                      key={r.id}
                      className="py-3 flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="h-9 w-9 rounded-lg bg-[#f0eafa] text-[#7863a7] flex items-center justify-center font-bold text-xs shrink-0">
                          ✳
                        </span>
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-[#211b29] truncate">
                            {r.name}
                          </div>
                          <div className="text-[10px] text-[#7c727e] truncate">
                            Keywords: {(r.keywords || []).join(", ")} &bull; Mode:{" "}
                            {r.match_mode}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleToggleRule(r)}
                          className={`rounded-full px-2.5 py-1 text-[10px] font-extrabold ${
                            r.is_enabled
                              ? "bg-[#e4f1eb] text-[#277a67]"
                              : "bg-[#eee6dc] text-[#7c727e]"
                          }`}
                        >
                          {r.is_enabled ? "Enabled" : "Paused"}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="lg:col-span-5 rounded-[7px] border border-[#e5dbd0] bg-[#fffdf8] p-5 space-y-3">
              <h3 className="font-display text-sm font-extrabold text-[#211b29]">
                Meta integration readiness
              </h3>
              <p className="text-[11px] text-[#857a83]">
                Requirements for live comment-to-DM dispatch.
              </p>
              <div className="divide-y divide-[#eee6dc] text-xs">
                <div className="py-2.5 flex items-center justify-between">
                  <span>Account authorization</span>
                  <span className="rounded bg-[#e4f1eb] px-2 py-0.5 text-[9px] font-extrabold uppercase text-[#277a67]">
                    {connection?.status === "connected"
                      ? "Connected"
                      : "Connect above"}
                  </span>
                </div>
                <div className="py-2.5 flex items-center justify-between">
                  <span>HMAC-SHA256 webhook verification</span>
                  <span className="rounded bg-[#e4f1eb] px-2 py-0.5 text-[9px] font-extrabold uppercase text-[#277a67]">
                    Fail-closed active
                  </span>
                </div>
                <div className="py-2.5 flex items-center justify-between">
                  <span>7-day window &amp; self-comment guard</span>
                  <span className="rounded bg-[#e4f1eb] px-2 py-0.5 text-[9px] font-extrabold uppercase text-[#277a67]">
                    Enforced
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SCREEN 2: MY AUTOMATIONS (dmFlows) */}
      {activeScreen === "flows" && (
        <div className="rounded-[7px] border border-[#e5dbd0] bg-[#fffdf8] p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-[#eee6dc] pb-4">
            <div>
              <h3 className="font-display text-base font-extrabold text-[#211b29]">
                Your workflows ({rules.length})
              </h3>
              <p className="text-[11px] text-[#857a83]">
                {enabledRulesCount} enabled &bull;{" "}
                {rules.length - enabledRulesCount} paused
              </p>
            </div>
            <button
              type="button"
              onClick={() => setActiveScreen("builder")}
              className="rounded-[5px] bg-[#ee7048] px-3.5 py-2 text-xs font-extrabold text-white"
            >
              ＋ New workflow
            </button>
          </div>

          {rules.length === 0 ? (
            <p className="text-xs text-[#7c727e] py-8 text-center">
              No workflows created yet.
            </p>
          ) : (
            <div className="divide-y divide-[#eee6dc]">
              {rules.map((r) => (
                <div
                  key={r.id}
                  className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-[#211b29]">
                        {r.name}
                      </span>
                      <span className="rounded bg-[#f0eafa] px-2 py-0.5 text-[9px] font-extrabold uppercase text-[#7863a7]">
                        {r.match_mode}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {(r.keywords || []).map((k: string, idx: number) => (
                        <span
                          key={idx}
                          className="rounded bg-[#211b29] px-2 py-0.5 text-[10px] font-mono font-bold text-[#ff9c7e]"
                        >
                          {k}
                        </span>
                      ))}
                    </div>
                    <p className="text-xs text-[#7c727e]">
                      DM: &ldquo;{r.private_message_template}&rdquo;
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleToggleRule(r)}
                      className={`rounded-[5px] px-3 py-1.5 text-xs font-bold ${
                        r.is_enabled
                          ? "bg-[#e4f1eb] text-[#277a67]"
                          : "bg-[#eee6dc] text-[#7c727e]"
                      }`}
                    >
                      {r.is_enabled ? "Enabled" : "Paused"}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteRule(r.id)}
                      className="rounded-[5px] border border-[#f5c2c7] bg-[#fff5f5] p-2 text-[#a62639] hover:bg-[#fde8eb]"
                      aria-label="Delete workflow"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SCREEN 3: FLOW BUILDER (dmBuilder) */}
      {activeScreen === "builder" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <form
            onSubmit={handleSaveWorkflow}
            className="lg:col-span-8 rounded-[7px] border border-[#e5dbd0] bg-[#fffdf8] p-6 space-y-5"
          >
            <div className="flex items-center justify-between border-b border-[#eee6dc] pb-4">
              <div>
                <h3 className="font-display text-base font-extrabold text-[#211b29]">
                  New comment-to-DM flow
                </h3>
                <p className="text-[11px] text-[#857a83]">
                  Choose a trigger, write the private reply, and set your destination URL.
                </p>
              </div>
              <span className="rounded bg-[#f8efd9] px-2.5 py-1 text-[9px] font-extrabold uppercase text-[#997027]">
                Deterministic Rule
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-extrabold uppercase tracking-wider text-[#5e5661] mb-1">
                  Workflow name
                </label>
                <input
                  type="text"
                  required
                  value={ruleName}
                  onChange={(e) => setRuleName(e.target.value)}
                  className="w-full rounded-[5px] border border-[#e4dbd1] bg-[#fffefa] px-3 py-2.5 text-xs"
                />
              </div>
              <div>
                <label className="block text-[10px] font-extrabold uppercase tracking-wider text-[#5e5661] mb-1">
                  Match mode (No Regex ReDoS)
                </label>
                <select
                  value={matchMode}
                  onChange={(e) => setMatchMode(e.target.value)}
                  className="w-full rounded-[5px] border border-[#e4dbd1] bg-[#fffefa] px-3 py-2.5 text-xs"
                >
                  <option value="exact_token">
                    Word-boundary match (Default — &ldquo;GUIDE&rdquo; never matches &ldquo;misguided&rdquo;)
                  </option>
                  <option value="exact_comment">
                    Exact whole comment match
                  </option>
                  <option value="starts_with">Comment starts with keyword</option>
                  <option value="all_comments">All eligible comments</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-extrabold uppercase tracking-wider text-[#5e5661] mb-1">
                  Trigger keywords (comma-separated)
                </label>
                <input
                  type="text"
                  required
                  value={keywordsInput}
                  onChange={(e) => setKeywordsInput(e.target.value)}
                  placeholder="GUIDE, CITY GUIDE"
                  className="w-full rounded-[5px] border border-[#e4dbd1] bg-[#fffefa] px-3 py-2.5 text-xs font-mono"
                />
              </div>
              <div>
                <label className="block text-[10px] font-extrabold uppercase tracking-wider text-[#5e5661] mb-1">
                  Where should it run?
                </label>
                <select
                  value={targetScope}
                  onChange={(e) => setTargetScope(e.target.value)}
                  className="w-full rounded-[5px] border border-[#e4dbd1] bg-[#fffefa] px-3 py-2.5 text-xs"
                >
                  <option value="all_eligible_posts">
                    Any eligible post or Reel
                  </option>
                  <option value="specific_media">Specific post or Reel</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-extrabold uppercase tracking-wider text-[#5e5661] mb-1">
                Private reply DM message
              </label>
              <textarea
                rows={3}
                required
                value={privateMessage}
                onChange={(e) => setPrivateMessage(e.target.value)}
                className="w-full rounded-[5px] border border-[#e4dbd1] bg-[#fffefa] px-3 py-2.5 text-xs"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-extrabold uppercase tracking-wider text-[#5e5661] mb-1">
                  CTA Button label
                </label>
                <input
                  type="text"
                  value={ctaButtonLabel}
                  onChange={(e) => setCtaButtonLabel(e.target.value)}
                  className="w-full rounded-[5px] border border-[#e4dbd1] bg-[#fffefa] px-3 py-2.5 text-xs"
                />
              </div>
              <div>
                <label className="block text-[10px] font-extrabold uppercase tracking-wider text-[#5e5661] mb-1">
                  Destination URL (HTTPS)
                </label>
                <input
                  type="url"
                  required
                  value={destinationUrl}
                  onChange={(e) => setDestinationUrl(e.target.value)}
                  className="w-full rounded-[5px] border border-[#e4dbd1] bg-[#fffefa] px-3 py-2.5 text-xs"
                />
              </div>
            </div>

            <div className="rounded-[6px] border border-[#e5dcd1] bg-[#fbf8f2] p-3.5 space-y-2">
              <label className="flex items-center justify-between text-xs font-bold text-[#211b29]">
                <span>Send public comment reply confirmation</span>
                <input
                  type="checkbox"
                  checked={
                    Boolean(entitlements?.canUsePublicCommentReplies) &&
                    sendPublicReply
                  }
                  disabled={!entitlements?.canUsePublicCommentReplies}
                  onChange={(e) => setSendPublicReply(e.target.checked)}
                  className="h-4 w-4 accent-[#f36b3f]"
                />
              </label>
              {sendPublicReply && entitlements?.canUsePublicCommentReplies && (
                <input
                  type="text"
                  value={publicReplyTemplate}
                  onChange={(e) => setPublicReplyTemplate(e.target.value)}
                  className="w-full rounded border border-[#e4dbd1] bg-white px-3 py-2 text-xs"
                />
              )}
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setActiveScreen("overview")}
                className="rounded-[5px] border border-[#ded4c9] bg-white px-4 py-2.5 text-xs font-bold text-[#211b29]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-[5px] bg-[#ee7048] px-5 py-2.5 text-xs font-extrabold text-white shadow-md hover:bg-[#e05e36] disabled:opacity-50"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Zap className="h-4 w-4" />
                )}
                Save &amp; activate workflow
              </button>
            </div>
          </form>

          {/* Flow Preview Column */}
          <div className="lg:col-span-4 space-y-4">
            <div className="rounded-[7px] border border-[#e5dbd0] bg-[#fffdf8] p-5 space-y-3">
              <div className="text-xs font-extrabold text-[#211b29]">
                Flow preview
              </div>
              <div className="rounded-lg border border-[#e9def7] bg-[#f7f1fc] p-3 text-xs font-bold text-[#765e9f]">
                TRIGGER: Someone comments &ldquo;
                {keywordsInput.split(",")[0]?.trim() || "GUIDE"}&rdquo;
              </div>
              <div className="text-center text-[#b3a6bb]">↓</div>
              <div className="rounded-lg border border-[#f6e0d4] bg-[#fff5ef] p-3 space-y-1.5">
                <div className="text-xs font-bold text-[#a84e31]">
                  ACTION: Send private reply
                </div>
                <p className="text-[11px] text-[#5d5360] leading-relaxed">
                  {privateMessage}
                </p>
                <span className="inline-block rounded bg-[#e4f1eb] px-2 py-0.5 text-[10px] font-extrabold text-[#277a67]">
                  Button · {ctaButtonLabel}
                </span>
              </div>
              <div className="text-center text-[#b3a6bb]">↓</div>
              <div className="rounded-lg border border-[#e5dcd1] bg-white p-3 text-[11px] font-bold text-[#211b29] truncate">
                DESTINATION: {destinationUrl} ↗
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SCREEN 4: ACTIVITY & LOGS (dmActivity) */}
      {activeScreen === "activity" && (
        <div className="rounded-[7px] border border-[#e5dbd0] bg-[#fffdf8] p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-display text-base font-extrabold text-[#211b29]">
                Execution history
              </h3>
              <p className="text-[11px] text-[#857a83]">
                Webhook comment matches, status transitions, and attribution tokens.
              </p>
            </div>
            <button
              type="button"
              onClick={loadAutomation}
              className="inline-flex items-center gap-1.5 rounded-[5px] border border-[#ded4c9] bg-white px-3 py-1.5 text-xs font-bold text-[#211b29]"
            >
              <RefreshCw className="h-3.5 w-3.5" /> Refresh
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#e5dcd1] text-[10px] font-extrabold uppercase tracking-wider text-[#9b929d]">
                  <th className="py-3 px-3">Time</th>
                  <th className="py-3 px-3">Commenter</th>
                  <th className="py-3 px-3">Matched Keyword</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3">Attribution Token</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#eee6dc]">
                {executions.length > 0 ? (
                  executions.map((ex) => (
                    <tr key={ex.id}>
                      <td className="py-3 px-3 text-[#7c727e]">
                        {ex.created_at
                          ? new Date(ex.created_at).toLocaleString()
                          : "Recent"}
                      </td>
                      <td className="py-3 px-3 font-bold text-[#211b29]">
                        @{ex.commenter_username || "instagram_user"}
                      </td>
                      <td className="py-3 px-3 font-mono text-[#c45a3a]">
                        {ex.matched_keyword || "GUIDE"}
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`rounded px-2 py-0.5 text-[10px] font-extrabold uppercase ${
                            ex.status === "accepted"
                              ? "bg-[#e4f1eb] text-[#277a67]"
                              : ex.status === "skipped"
                              ? "bg-[#f8efd9] text-[#997027]"
                              : "bg-[#f0eafa] text-[#7863a7]"
                          }`}
                        >
                          {ex.status}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-mono text-[11px] text-[#7c727e]">
                        {ex.attribution_token}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={5}
                      className="py-8 text-center text-[#7c727e]"
                    >
                      No webhook executions recorded yet. Create a workflow and trigger a comment webhook to see real-time logs.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SCREEN 5: INSTAGRAM CONNECTION SETTINGS (dmSettings) */}
      {activeScreen === "settings" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="rounded-[7px] border border-[#e5dbd0] bg-[#fffdf8] p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-display text-base font-extrabold text-[#211b29]">
                  @{connection?.ig_username || workspaceSlug}
                </h3>
                <p className="text-[11px] text-[#857a83]">
                  Instagram professional account connection
                </p>
              </div>
              <span className="rounded bg-[#e4f1eb] px-2.5 py-1 text-[9px] font-extrabold uppercase text-[#277a67]">
                {connection?.status || "not_connected"}
              </span>
            </div>

            <div className="divide-y divide-[#eee6dc] text-xs">
              <div className="py-2.5 flex justify-between">
                <span className="text-[#7c727e]">Account type</span>
                <strong className="text-[#211b29]">
                  {connection?.account_type || "CREATOR"}
                </strong>
              </div>
              <div className="py-2.5 flex justify-between">
                <span className="text-[#7c727e]">Token storage</span>
                <strong className="text-[#277a67]">
                  private_integrations.instagram_credentials
                </strong>
              </div>
              <div className="py-2.5 flex justify-between">
                <span className="text-[#7c727e]">Hourly reply ceiling</span>
                <strong className="text-[#211b29]">
                  {connection?.hourly_ceiling || 600} / hr (Max 750)
                </strong>
              </div>
            </div>

            <button
              type="button"
              onClick={handleConnectInstagram}
              disabled={saving}
              className="rounded-[5px] bg-[#211b29] px-4 py-2.5 text-xs font-bold text-white"
            >
              {connection?.status === "connected"
                ? "Refresh OAuth Connection"
                : "Connect Instagram Account"}
            </button>
          </div>

          <div className="rounded-[7px] border border-[#e5dbd0] bg-[#fffdf8] p-6 space-y-3">
            <h3 className="font-display text-base font-extrabold text-[#211b29]">
              Security &amp; Token Isolation
            </h3>
            <p className="text-xs text-[#7c727e] leading-relaxed">
              Biolio never stores Instagram access tokens in public tables. Encrypted credentials are isolated inside{" "}
              <code className="font-mono">
                private_integrations.instagram_credentials
              </code>{" "}
              with <code className="font-mono">REVOKE ALL FROM PUBLIC, anon, authenticated</code>.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
