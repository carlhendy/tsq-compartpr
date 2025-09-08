"use client";

import React, { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, XCircle, AlertTriangle, Globe2, Crown, Loader2 } from "lucide-react";

type ScoreSignals = {
  tqs_badge: boolean;
  delivery_time: string;
  shipping_cost_free: boolean;
  return_window: string;
  return_cost_free: boolean;
  e_wallets: string;
  store_rating: string;
  review_count: string;
};

type StoreRow = {
  domain: string;
  country: string;
  url: string;
  signals: ScoreSignals | null;
  error?: string;
};

const USE_LOCAL_API = true;
const API_BASE = "/api";

function Metric({ label, value, good }: { label: string; value: React.ReactNode; good?: boolean }) {
  return (
    <div className={`flex items-center justify-between gap-3 rounded-xl border p-3 ${
      good === true ? "border-green-300 bg-green-50" : good === false ? "border-red-300 bg-red-50" : "border-slate-200 bg-white"
    }`}>
      <span className="text-sm text-slate-600">{label}</span>
      <span className="text-sm font-medium text-slate-900">{value || <span className="text-slate-400">—</span>}</span>
    </div>
  );
}

function Badge({ ok, label }: { ok: boolean; label: string }) {
  const Icon = ok ? CheckCircle2 : XCircle;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${
      ok ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
    }`}>
      <Icon className="h-4 w-4" /> {label}
    </span>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="mt-6 mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">{children}</h3>;
}

function isFast(delivery: string) { return /^(0|1|2|3)/.test(delivery); }
function longReturn(windowStr: string) { const n = parseInt(windowStr.replace(/[^0-9]/g, ""), 10); return !Number.isNaN(n) && n >= 30; }
function manyReviews(countStr: string) { const n = parseInt(countStr.replace(/,/g, ""), 10); return !Number.isNaN(n) && n >= 1000; }
function strongRating(r: string) { const n = parseFloat(r); return !Number.isNaN(n) && n >= 4.5; }

async function fetchStorePage(domain: string, country: string): Promise<StoreRow> {
  const url = `https://www.google.com/storepages?q=${encodeURIComponent(domain)}&c=${country}&v=19`;
  if (USE_LOCAL_API) {
    try {
      const res = await fetch(`${API_BASE}/storepage?domain=${encodeURIComponent(domain)}&country=${country}`, {
        method: "GET", headers: { "Accept": "application/json" },
      });
      if (!res.ok) throw new Error(`API ${res.status}`);
      const data = await res.json();
      return { domain, country, url, signals: data.signals, error: data.error };
    } catch (e: any) {
      return { domain, country, url, signals: null, error: e.message };
    }
  }
  return { domain, country, url, signals: null, error: "Local API disabled." };
}

export default function Page() {
  const [country, setCountry] = useState("US"); // default US for richer details
  const [domains, setDomains] = useState<string[]>(["", "", "", "", ""]);
  const [rows, setRows] = useState<StoreRow[] | null>(null);
  const [loading, setLoading] = useState(false);

  const activeDomains = useMemo(
    () => domains.map((d) => d.trim()).filter(Boolean).slice(0, 5),
    [domains]
  );

  async function onCompare(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const results = await Promise.all(
        activeDomains.slice(0, 5).map((d) => fetchStorePage(d, country))
      );
      setRows(results);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-6xl px-4 py-10">
        <motion.header initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} className="mb-8 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Top Quality Store — Scorecard Comparator</h1>
            <p className="mt-1 text-sm text-slate-600">Enter up to five store domains and compare public signals Google surfaces on their Store pages per region.</p>
          </div>
          <div className="flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-sm shadow-sm ring-1 ring-slate-200">
            <Globe2 className="h-4 w-4" />
            <label className="sr-only" htmlFor="country">Region</label>
            <select id="country" value={country} onChange={(e) => setCountry(e.target.value)} className="rounded-md border border-slate-200 bg-white px-2 py-1 text-sm focus:outline-none">
              {"US,AU,GB,NZ,CA,DE".split(",").map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </motion.header>

        <form onSubmit={onCompare} className="mb-6 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {domains.map((d, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-medium text-slate-700">{i + 1}</span>
                <input
                  value={d}
                  onChange={(e) => setDomains((arr) => arr.map((v, idx) => (idx === i ? e.target.value : v)))}
                  placeholder={i === 0 ? "example.com" : "optional"}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
                />
              </div>
            ))}
          </div>
          <div className="mt-4 flex items-center justify-between">
            <p className="text-xs text-slate-500">We’ll query <code className="rounded bg-slate-100 px-1">google.com/storepages</code> for each domain (per region) via a US-based serverless API.</p>
            <button type="submit" className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800">
              {loading ? <Loader2 className="h-4 w-4 animate-spin"/> : <span>Compare</span>}
            </button>
          </div>
        </form>

        {rows && rows.length > 0 && (
          <div className="space-y-8">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {rows.map((r, idx) => (
                <motion.div key={idx} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="mb-3 flex items-center justify-between">
                    <div className="min-w-0">
                      <h2 className="truncate text-base font-semibold text-slate-900">{r.domain} <span className="text-slate-400">· {r.country}</span></h2>
                      <a className="block truncate text-xs text-slate-500 hover:underline" href={r.url} target="_blank" rel="noreferrer">{r.url}</a>
                    </div>
                    {r.signals?.tqs_badge ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-900"><Crown className="h-4 w-4"/> TQS</span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700"><AlertTriangle className="h-4 w-4"/> No TQS</span>
                    )}
                  </div>

                  {!r.signals && (
                    <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
                      {r.error || "No data."}
                    </div>
                  )}

                  {r.signals && (
                    <div>
                      <SectionTitle>Shipping experience</SectionTitle>
                      <div className="grid grid-cols-2 gap-2">
                        <Metric label="Delivery time" value={<span className={isFast(r.signals.delivery_time) ? "text-emerald-700" : ""}>{r.signals.delivery_time || ""}</span>} good={isFast(r.signals.delivery_time)} />
                        <Metric label="Free shipping" value={r.signals.shipping_cost_free ? <Badge ok label="Yes"/> : <Badge ok={false} label="No"/>} good={r.signals.shipping_cost_free} />
                      </div>

                      <SectionTitle>Return experience</SectionTitle>
                      <div className="grid grid-cols-2 gap-2">
                        <Metric label="Return window" value={<span className={longReturn(r.signals.return_window) ? "text-emerald-700" : ""}>{r.signals.return_window || ""}</span>} good={longReturn(r.signals.return_window)} />
                        <Metric label="Free returns" value={r.signals.return_cost_free ? <Badge ok label="Yes"/> : <Badge ok={false} label="No"/>} good={r.signals.return_cost_free} />
                      </div>

                      <SectionTitle>Browsing & purchase</SectionTitle>
                      <div className="grid grid-cols-2 gap-2">
                        <Metric label="Wallets" value={r.signals.e_wallets} />
                        <Metric label="Promo disapprovals" value={<span className="text-slate-400">— (not public)</span>} />
                      </div>

                      <SectionTitle>Store rating</SectionTitle>
                      <div className="grid grid-cols-2 gap-2">
                        <Metric label="Rating" value={<span className={strongRating(r.signals.store_rating) ? "text-emerald-700" : ""}>{r.signals.store_rating || ""}</span>} good={strongRating(r.signals.store_rating)} />
                        <Metric label="Reviews" value={<span className={manyReviews(r.signals.review_count) ? "text-emerald-700" : ""}>{r.signals.review_count || ""}</span>} good={manyReviews(r.signals.review_count)} />
                      </div>
                    </div>
                  )}
                </motion.div>
              ))}
            </div>

            <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-50 text-left text-slate-600">
                    <th className="px-4 py-3 font-semibold">Store</th>
                    <th className="px-4 py-3 font-semibold">TQS</th>
                    <th className="px-4 py-3 font-semibold">Delivery time</th>
                    <th className="px-4 py-3 font-semibold">Free shipping</th>
                    <th className="px-4 py-3 font-semibold">Return window</th>
                    <th className="px-4 py-3 font-semibold">Free returns</th>
                    <th className="px-4 py-3 font-semibold">Wallets</th>
                    <th className="px-4 py-3 font-semibold">Rating</th>
                    <th className="px-4 py-3 font-semibold">Reviews</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={i} className="border-t border-slate-100">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="rounded bg-slate-100 px-2 py-0.5 text-xs">{r.country}</span>
                          <a href={r.url} target="_blank" rel="noreferrer" className="font-medium text-slate-900 hover:underline">{r.domain}</a>
                        </div>
                      </td>
                      <td className="px-4 py-3">{r.signals ? (r.signals.tqs_badge ? <Badge ok label="Yes"/> : <Badge ok={false} label="No"/>) : <span className="text-slate-400">—</span>}</td>
                      <td className={`px-4 py-3 ${r.signals && isFast(r.signals.delivery_time) ? "text-emerald-700" : ""}`}>{r.signals?.delivery_time || "—"}</td>
                      <td className="px-4 py-3">{r.signals ? (r.signals.shipping_cost_free ? <Badge ok label="Yes"/> : <Badge ok={false} label="No"/>) : "—"}</td>
                      <td className={`px-4 py-3 ${r.signals && longReturn(r.signals.return_window) ? "text-emerald-700" : ""}`}>{r.signals?.return_window || "—"}</td>
                      <td className="px-4 py-3">{r.signals ? (r.signals.return_cost_free ? <Badge ok label="Yes"/> : <Badge ok={false} label="No"/>) : "—"}</td>
                      <td className="px-4 py-3">{r.signals?.e_wallets || "—"}</td>
                      <td className={`px-4 py-3 ${r.signals && strongRating(r.signals.store_rating) ? "text-emerald-700" : ""}`}>{r.signals?.store_rating || "—"}</td>
                      <td className={`px-4 py-3 ${r.signals && manyReviews(r.signals.review_count) ? "text-emerald-700" : ""}`}>{r.signals?.review_count || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
