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
  accentColor = "#f36b3f",
  surfaceColor = "#fffdf8",
  inkColor = "#211b29",
}: PublicContactFormProps) {
  const [senderName, setSenderName] = useState("");
  const [senderEmail, setSenderEmail] = useState("");
  const [budgetRange, setBudgetRange] = useState("Under $1,000");
  const [message, setMessage] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");

  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fieldStyle = {
    borderColor: `color-mix(in srgb, ${inkColor} 20%, transparent)`,
    backgroundColor: surfaceColor,
    color: inkColor,
  };

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
          website_url: websiteUrl,
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
      <div role="status" className="space-y-3 border p-6 text-center sm:p-8" style={{ ...fieldStyle, borderRadius: "12px" }}>
        <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-[#277a67] text-white">
          <CheckCircle2 className="h-5 w-5" />
        </div>
        <h4 className="font-bold text-sm">Message Delivered</h4>
        <p className="mx-auto max-w-sm text-sm leading-6 opacity-80">
          Your inquiry has been sent directly to @{handle}&apos;s verified inbox.
        </p>
        <button
          type="button"
          onClick={() => setSubmitted(false)}
          className="pt-2 text-sm font-bold underline underline-offset-4 opacity-75 hover:opacity-100"
        >
          Send another inquiry
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-5 border p-5 text-left sm:p-7"
      style={{ ...fieldStyle, borderRadius: "12px" }}
    >
      <div aria-hidden="true" className="pointer-events-none absolute -left-[10000px] h-px w-px overflow-hidden">
        <label htmlFor="inquiry-website">Leave this field empty</label>
        <input
          id="inquiry-website"
          name="website_url"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={websiteUrl}
          onChange={(event) => setWebsiteUrl(event.target.value)}
        />
      </div>
      <div className="flex items-center gap-2 mb-1">
        <Mail className="h-4 w-4 opacity-80" />
        <h3 className="font-bold text-base">Send a direct inquiry</h3>
      </div>

      {error && (
        <div role="alert" className="flex items-center gap-2 border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="inquiry-name" className="mb-1.5 block text-xs font-bold opacity-80">
            Your Name
          </label>
          <input
            id="inquiry-name"
            type="text"
            required
            maxLength={100}
            placeholder="Alex Rivers"
            value={senderName}
            onChange={(e) => setSenderName(e.target.value)}
            autoComplete="name"
            className="w-full rounded-md border px-3 py-3 text-sm focus-visible:outline-2 focus-visible:outline-offset-2"
            style={fieldStyle}
          />
        </div>
        <div>
          <label htmlFor="inquiry-email" className="mb-1.5 block text-xs font-bold opacity-80">
            Your Email
          </label>
          <input
            id="inquiry-email"
            type="email"
            required
            maxLength={254}
            placeholder="alex@example.com"
            value={senderEmail}
            onChange={(e) => setSenderEmail(e.target.value)}
            autoComplete="email"
            className="w-full rounded-md border px-3 py-3 text-sm focus-visible:outline-2 focus-visible:outline-offset-2"
            style={fieldStyle}
          />
        </div>
      </div>

      <div>
        <label htmlFor="inquiry-budget" className="mb-1.5 block text-xs font-bold opacity-80">
          Project Scope / Budget Range
        </label>
        <select
          id="inquiry-budget"
          value={budgetRange}
          onChange={(e) => setBudgetRange(e.target.value)}
          className="w-full rounded-md border px-3 py-3 text-sm focus-visible:outline-2 focus-visible:outline-offset-2"
          style={fieldStyle}
        >
          <option value="Under $1,000">Under $1,000 (Consultation / Shoutout)</option>
          <option value="$1,000 - $5,000">$1,000 - $5,000 (Dedicated Campaign)</option>
          <option value="$5,000+">$5,000+ (Multi-Platform Brand Partnership)</option>
          <option value="General Inquiry">General / Press / Speaking Inquiry</option>
        </select>
      </div>

      <div>
        <label htmlFor="inquiry-message" className="mb-1.5 block text-xs font-bold opacity-80">
          Your Message
        </label>
        <textarea
          id="inquiry-message"
          required
          minLength={5}
          rows={5}
          maxLength={2000}
          placeholder="Briefly describe what you'd like to collaborate on..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="w-full resize-y rounded-md border px-3 py-3 text-sm leading-6 focus-visible:outline-2 focus-visible:outline-offset-2"
          style={fieldStyle}
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="inline-flex min-h-12 w-full items-center justify-center gap-2 px-4 py-3 text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:cursor-wait disabled:opacity-50"
        style={{ backgroundColor: accentColor }}
      >
        {loading ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Send className="h-3.5 w-3.5" />
        )}
        Deliver Message to @{handle}
      </button>
      <p className="text-xs leading-5 opacity-65">Your message is delivered to the creator. No Biolio account is needed.</p>
    </form>
  );
}
