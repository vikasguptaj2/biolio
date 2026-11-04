"use client";

import React, { useState } from "react";
import { Send, CheckCircle2, AlertCircle, Loader2, Mail } from "lucide-react";

export interface PublicContactFormProps {
  workspaceId: string;
  handle?: string;
  accentColor?: string;
  surfaceColor?: string;
  inkColor?: string;
}

export function PublicContactForm({
  workspaceId,
  handle = "creator",
}: PublicContactFormProps) {
  const [senderName, setSenderName] = useState("");
  const [senderEmail, setSenderEmail] = useState("");
  const [budgetRange, setBudgetRange] = useState("Under $1,000");
  const [message, setMessage] = useState("");

  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!senderName.trim() || !senderEmail.trim() || !message.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/bio/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId,
          handle,
          senderName: senderName.trim(),
          senderEmail: senderEmail.trim(),
          budgetRange,
          message: message.trim(),
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to deliver inquiry");
      }

      setSubmitted(true);
      setSenderName("");
      setSenderEmail("");
      setMessage("");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to send inquiry. Please try again.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  if (submitted) {
    return (
      <div className="rounded-2xl border border-black/10 bg-black/5 p-6 text-center space-y-2 backdrop-blur-xs">
        <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-[#277a67] text-white">
          <CheckCircle2 className="h-5 w-5" />
        </div>
        <h4 className="font-bold text-sm">Message Delivered</h4>
        <p className="text-xs opacity-80 max-w-sm mx-auto">
          Your inquiry has been sent directly to @{handle}&apos;s verified inbox.
        </p>
        <button
          type="button"
          onClick={() => setSubmitted(false)}
          className="text-[11px] font-bold underline opacity-75 hover:opacity-100 pt-2"
        >
          Send another inquiry
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-black/10 bg-black/5 p-5 sm:p-6 space-y-3.5 backdrop-blur-xs text-left"
    >
      <div className="flex items-center gap-2 mb-1">
        <Mail className="h-4 w-4 opacity-80" />
        <h3 className="font-bold text-sm">Send a Direct Inquiry</h3>
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-600 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider opacity-70 mb-1">
            Your Name
          </label>
          <input
            type="text"
            required
            placeholder="Alex Rivers"
            value={senderName}
            onChange={(e) => setSenderName(e.target.value)}
            className="w-full rounded-xl border border-black/15 bg-white/80 px-3 py-2 text-xs text-black focus:outline-none focus:border-black"
          />
        </div>
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider opacity-70 mb-1">
            Your Email
          </label>
          <input
            type="email"
            required
            placeholder="alex@example.com"
            value={senderEmail}
            onChange={(e) => setSenderEmail(e.target.value)}
            className="w-full rounded-xl border border-black/15 bg-white/80 px-3 py-2 text-xs text-black focus:outline-none focus:border-black"
          />
        </div>
      </div>

      <div>
        <label className="block text-[10px] font-bold uppercase tracking-wider opacity-70 mb-1">
          Project Scope / Budget Range
        </label>
        <select
          value={budgetRange}
          onChange={(e) => setBudgetRange(e.target.value)}
          className="w-full rounded-xl border border-black/15 bg-white/80 px-3 py-2 text-xs text-black focus:outline-none focus:border-black"
        >
          <option value="Under $1,000">Under $1,000 (Consultation / Shoutout)</option>
          <option value="$1,000 - $5,000">$1,000 - $5,000 (Dedicated Campaign)</option>
          <option value="$5,000+">$5,000+ (Multi-Platform Brand Partnership)</option>
          <option value="General Inquiry">General / Press / Speaking Inquiry</option>
        </select>
      </div>

      <div>
        <label className="block text-[10px] font-bold uppercase tracking-wider opacity-70 mb-1">
          Your Message
        </label>
        <textarea
          required
          rows={3}
          placeholder="Briefly describe what you'd like to collaborate on..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="w-full rounded-xl border border-black/15 bg-white/80 px-3 py-2 text-xs text-black focus:outline-none focus:border-black"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-black text-white py-3 text-xs font-bold hover:bg-neutral-800 transition-colors disabled:opacity-50"
      >
        {loading ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Send className="h-3.5 w-3.5" />
        )}
        Deliver Message to @{handle}
      </button>
    </form>
  );
}
