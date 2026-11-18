"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Inbox,
  Search,
  CheckCircle2,
  Clock,
  Mail,
  Archive,
  Building,
  DollarSign,
  ArrowRight,
  ExternalLink,
  ChevronRight,
  RefreshCw,
} from "lucide-react";

interface InquiryItem {
  id: string;
  sender_name: string;
  sender_email: string;
  sender_company?: string | null;
  inquiry_type: string;
  budget_range?: string | null;
  message: string;
  status: "new" | "read" | "replied" | "archived" | "spam";
  created_at: string;
}

export default function InquiriesDashboardPage() {
  const [inquiries, setInquiries] = useState<InquiryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedInquiry, setSelectedInquiry] = useState<InquiryItem | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function loadInquiries(status: string = activeTab, query: string = searchQuery) {
    setLoading(true);
    setErrorMsg(null);
    try {
      const params = new URLSearchParams();
      if (status !== "all") params.set("status", status);
      if (query.trim()) params.set("q", query.trim());

      const res = await fetch(`/api/bio/inquiries?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error?.message || "Failed to load inquiries.");
      }
      setInquiries(data.inquiries || []);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Error fetching inquiries.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadInquiries();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  async function updateStatus(id: string, newStatus: InquiryItem["status"]) {
    setUpdatingId(id);
    try {
      const res = await fetch("/api/bio/inquiries", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: newStatus }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error?.message || "Failed to update status.");
      }

      setInquiries((prev) =>
        prev.map((item) => (item.id === id ? { ...item, status: newStatus } : item))
      );

      if (selectedInquiry?.id === id) {
        setSelectedInquiry((prev) => (prev ? { ...prev, status: newStatus } : null));
      }
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Error updating inquiry");
    } finally {
      setUpdatingId(null);
    }
  }

  const newCount = inquiries.filter((i) => i.status === "new").length;

  return (
    <div className="p-6 lg:p-10 max-w-7xl mx-auto space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-[#e5dcd1] bg-[#fffdf8] px-3 py-1 text-xs font-bold text-[#c45a3a] mb-2 shadow-xs">
            <Inbox className="h-3.5 w-3.5 text-[#f36b3f]" />
            AUDIENCE INBOX &bull; DIRECT CLIENT LEADS
          </div>
          <h1 className="font-editorial text-3xl sm:text-4xl font-bold text-[#211b29]">
            Inquiries &amp; Brand Bookings
          </h1>
          <p className="text-xs text-[#7c727e] max-w-xl mt-1">
            Private visitor messages received through your verified public contact form.
          </p>
        </div>

        <button
          onClick={() => loadInquiries()}
          className="inline-flex items-center gap-2 self-start rounded-lg border border-[#e5dcd1] bg-white px-3.5 py-2 text-xs font-bold text-[#211b29] hover:border-[#f36b3f] shadow-xs cursor-pointer transition-colors"
        >
          <RefreshCw className={`h-3.5 w-3.5 text-[#f36b3f] ${loading ? "animate-spin" : ""}`} />
          <span>Refresh</span>
        </button>
      </div>

      {errorMsg && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs font-bold text-red-800">
          {errorMsg}
        </div>
      )}

      {/* Control Bar: Filters & Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 pb-2 border-b border-[#eee6dc]">
        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {[
            { id: "all", label: "All Messages" },
            { id: "new", label: `New (${newCount})` },
            { id: "read", label: "Read" },
            { id: "replied", label: "Replied" },
            { id: "archived", label: "Archived" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold whitespace-nowrap cursor-pointer transition-all ${
                activeTab === tab.id
                  ? "bg-[#211b29] text-white shadow-xs"
                  : "bg-[#fffdf8] border border-[#e5dcd1] text-[#7c727e] hover:text-[#211b29]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#a89bac]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") loadInquiries(activeTab, searchQuery);
            }}
            placeholder="Search inquiries..."
            className="w-full rounded-lg border border-[#e5dcd1] bg-[#fffdf8] pl-9 pr-3.5 py-1.5 text-xs text-[#211b29] placeholder-[#a89bac] focus:outline-none focus:border-[#f36b3f]"
          />
        </div>
      </div>

      {/* Two-Pane Layout: List + Detail Drawer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Inquiries List (7 cols on desktop) */}
        <div className="lg:col-span-7 space-y-3">
          {loading ? (
            <div className="min-h-[300px] flex items-center justify-center text-xs text-[#7c727e]">
              <span className="h-4 w-4 rounded-full border-2 border-[#f36b3f] border-t-transparent animate-spin mr-2" />
              Loading messages...
            </div>
          ) : inquiries.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#e5dcd1] bg-[#fffdf8] p-12 text-center space-y-3">
              <div className="h-12 w-12 rounded-full bg-[#fce8df] text-[#f36b3f] flex items-center justify-center mx-auto">
                <Inbox className="h-6 w-6" />
              </div>
              <h3 className="font-editorial text-lg font-bold text-[#211b29]">
                No inquiries found
              </h3>
              <p className="text-xs text-[#7c727e] max-w-sm mx-auto leading-relaxed">
                When visitors or brands send messages from your public bio contact section, they will appear here with full message details and one-click email reply.
              </p>
              <Link
                href="/dashboard/bio"
                className="inline-block text-xs font-bold text-[#f36b3f] hover:underline pt-2"
              >
                Configure contact form in Bio Studio &rarr;
              </Link>
            </div>
          ) : (
            inquiries.map((inq) => {
              const isSelected = selectedInquiry?.id === inq.id;
              return (
                <div
                  key={inq.id}
                  onClick={() => {
                    setSelectedInquiry(inq);
                    if (inq.status === "new") {
                      updateStatus(inq.id, "read");
                    }
                  }}
                  className={`rounded-2xl border p-5 cursor-pointer transition-all shadow-xs ${
                    isSelected
                      ? "border-[#f36b3f] bg-white ring-2 ring-[#f36b3f]/10"
                      : inq.status === "new"
                      ? "border-[#f36b3f]/40 bg-[#fffdf8]"
                      : "border-[#e5dcd1] bg-[#fffdf8] hover:border-[#211b29]/40"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-[#211b29] truncate">
                          {inq.sender_name}
                        </span>
                        {inq.sender_company && (
                          <span className="text-[10px] text-[#7c727e] flex items-center gap-1 truncate">
                            <Building className="h-3 w-3" /> {inq.sender_company}
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-[#7c727e] font-mono truncate">
                        {inq.sender_email}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className={`rounded px-2 py-0.5 text-[9px] font-extrabold uppercase ${
                          inq.status === "new"
                            ? "bg-[#fce8df] text-[#c45a3a]"
                            : inq.status === "replied"
                            ? "bg-[#e4f1eb] text-[#277a67]"
                            : inq.status === "archived"
                            ? "bg-gray-100 text-gray-600"
                            : "bg-[#f0eafa] text-[#7863a7]"
                        }`}
                      >
                        {inq.status}
                      </span>
                      <ChevronRight className="h-4 w-4 text-[#a89bac]" />
                    </div>
                  </div>

                  <p className="text-xs text-[#524955] line-clamp-2 leading-relaxed mb-3">
                    {inq.message}
                  </p>

                  <div className="flex items-center justify-between text-[10px] text-[#a89bac] pt-2 border-t border-[#eee6dc]">
                    <span>
                      {inq.inquiry_type || "General Inquiry"}
                      {inq.budget_range && ` &bull; Budget: ${inq.budget_range}`}
                    </span>
                    <span>{new Date(inq.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Inquiry Detail View (5 cols on desktop) */}
        <div className="lg:col-span-5 rounded-2xl border border-[#e5dcd1] bg-[#fffdf8] p-6 shadow-xs sticky top-6">
          {selectedInquiry ? (
            <div className="space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-[#eee6dc]">
                <div>
                  <h3 className="font-editorial text-xl font-bold text-[#211b29]">
                    {selectedInquiry.sender_name}
                  </h3>
                  <a
                    href={`mailto:${selectedInquiry.sender_email}?subject=Re: Inquiry on Biolio`}
                    className="text-xs font-mono text-[#f36b3f] hover:underline flex items-center gap-1 mt-0.5"
                  >
                    <Mail className="h-3 w-3" />
                    {selectedInquiry.sender_email}
                  </a>
                </div>

                <span
                  className={`rounded px-2.5 py-1 text-[10px] font-extrabold uppercase ${
                    selectedInquiry.status === "new"
                      ? "bg-[#fce8df] text-[#c45a3a]"
                      : selectedInquiry.status === "replied"
                      ? "bg-[#e4f1eb] text-[#277a67]"
                      : selectedInquiry.status === "archived"
                      ? "bg-gray-100 text-gray-600"
                      : "bg-[#f0eafa] text-[#7863a7]"
                  }`}
                >
                  {selectedInquiry.status}
                </span>
              </div>

              {/* Metadata Badges */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="rounded-lg bg-[#f4efe7] p-3">
                  <div className="text-[10px] text-[#7c727e] font-bold uppercase mb-0.5">
                    Company
                  </div>
                  <div className="font-bold text-[#211b29] truncate">
                    {selectedInquiry.sender_company || "Individual"}
                  </div>
                </div>

                <div className="rounded-lg bg-[#f4efe7] p-3">
                  <div className="text-[10px] text-[#7c727e] font-bold uppercase mb-0.5">
                    Budget
                  </div>
                  <div className="font-bold text-[#211b29] truncate">
                    {selectedInquiry.budget_range || "Not specified"}
                  </div>
                </div>
              </div>

              {/* Message Content */}
              <div>
                <div className="text-[10px] text-[#7c727e] font-bold uppercase mb-2">
                  Message Content
                </div>
                <div className="rounded-xl border border-[#e5dcd1] bg-white p-4 text-xs text-[#211b29] leading-relaxed whitespace-pre-wrap max-h-[300px] overflow-y-auto">
                  {selectedInquiry.message}
                </div>
              </div>

              {/* Actions Strip */}
              <div className="space-y-2 pt-2 border-t border-[#eee6dc]">
                <a
                  href={`mailto:${selectedInquiry.sender_email}?subject=Re: Inquiry on Biolio`}
                  onClick={() => updateStatus(selectedInquiry.id, "replied")}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-[#f36b3f] px-4 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-[#ee7048] transition-all"
                >
                  <Mail className="h-3.5 w-3.5" />
                  <span>Reply via Email</span>
                  <ExternalLink className="h-3 w-3" />
                </a>

                <div className="grid grid-cols-2 gap-2">
                  {selectedInquiry.status !== "replied" && (
                    <button
                      type="button"
                      disabled={updatingId === selectedInquiry.id}
                      onClick={() => updateStatus(selectedInquiry.id, "replied")}
                      className="rounded-lg border border-[#e5dcd1] bg-white px-3 py-2 text-xs font-bold text-[#277a67] hover:bg-[#e4f1eb] cursor-pointer transition-colors"
                    >
                      Mark Replied
                    </button>
                  )}

                  {selectedInquiry.status !== "archived" ? (
                    <button
                      type="button"
                      disabled={updatingId === selectedInquiry.id}
                      onClick={() => updateStatus(selectedInquiry.id, "archived")}
                      className="rounded-lg border border-[#e5dcd1] bg-white px-3 py-2 text-xs font-bold text-[#7c727e] hover:bg-gray-100 cursor-pointer transition-colors"
                    >
                      Archive Message
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={updatingId === selectedInquiry.id}
                      onClick={() => updateStatus(selectedInquiry.id, "read")}
                      className="rounded-lg border border-[#e5dcd1] bg-white px-3 py-2 text-xs font-bold text-[#211b29] hover:bg-gray-100 cursor-pointer transition-colors"
                    >
                      Unarchive
                    </button>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="py-20 text-center text-xs text-[#7c727e] space-y-2">
              <Mail className="h-8 w-8 text-[#a89bac] mx-auto" />
              <p className="font-bold text-[#211b29]">Select an inquiry</p>
              <p className="text-[11px] max-w-xs mx-auto">
                Click any message from the list to view the sender details and send an email reply.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

