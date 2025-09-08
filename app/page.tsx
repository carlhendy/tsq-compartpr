// app/page.tsx
"use client";

import { useCallback, useMemo, useState } from "react";

type SectionGrades = {
  shipping?: string;
  returns?: string;
  payments?: string;
  pricing?: string;
  website?: string;
};

type ApiSignals = {
  tqs_badge: boolean;
  delivery_time?: string;
  shipping_cost_free?: boolean;
  return_window?: string;
  return_cost_free?: boolean;
  e_wallets?: string;
  store_rating?: string;
  review_count?: string;
  section_grades?: SectionGrades;
  logo_url?: string;
};

type Row = {
  country: "US" | "GB";
  domain: string;
  signals: ApiSignals;
};

const COUNTRIES: Array<"US" | "GB"> = ["US", "GB"];

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-md bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700">
      {children}
    </span>
  );
}

function YesNoChip({ yes }: { yes: boolean }) {
  return (
    <span
      className={[
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium",
        yes ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800",
      ].join(" ")}
    >
      {yes ? (
        <>
          <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor">
            <path d="M16.707 5.293a1 1 0 010 1.414l-7.25 7.25a1 1 0 01-1.414 0l-3.25-3.25a1 1 0 111.414-1.414l2.543 2.543 6.543-6.543a1 1 0 011.414 0z" />
          </svg>
          Yes
        </>
      ) : (
        <>
          <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor">
            <path d="M10 8.586l4.95-4.95a1 1 0 111.414 1.414L11.414 10l4.95 4.95a1 1 0 11-1.414 1.414L10 11.414l-4.95 4.95a1 1 0 11-1.414-1.414L8.586 10l-4.95-4.95A1 1 0 115.05 3.636L10 8.586z" />
          </svg>
          No
        </>
      )}
    </span>
  );
}

function GradeChip({ grade }: { grade?: string }) {
  if (!grade) return <span>—</span>;
  const color =
    grade === "Exceptional"
      ? "bg-emerald-100 text-emerald-800"
      : grade === "Great"
      ? "bg-green-100 text-green-800"
      : grade === "Good"
      ? "bg-yellow-100 text-yellow-800"
      : grade === "Fair"
      ? "bg-orange-100 text-orange-800"
      : "bg-rose-100 text-rose-800"; // Poor or unknown
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${color}`}>
      {grade}
    </span>
  );
}

export default function Page() {
  const [country, setCountry] = useState<"US" | "GB">("GB");
  const [domains, setDomains] = useState<string[]>(["", "", "", "", ""]);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const canCompare = useMemo(
    () => domains.some((d) => d.trim().length > 0),
    [domains]
  );

  const onChangeDomain = (i: number, v: string) => {
    const next = [...domains];
    next[i] = v;
    setDomains(next);
  };

  const fetchSignals = useCallback(async (d: string, c: "US" | "GB") => {
    const url = `/api/storepage?domain=${encodeURIComponent(d)}&country=${c}`;
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`API error for ${d}: ${res.status}`);
    const data = (await res.json()) as { signals: ApiSignals } | { error: string };
    if ("error" in data) throw new Error(data.error);
    return data.signals;
  }, []);

  const onCompare = useCallback(async () => {
    setErr(null);
    setLoading(true);
    try {
      const inputDomains = domains
        .map((d) => d.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, ""))
        .filter(Boolean)
        .slice(0, 5);

      const results = await Promise.all(
        inputDomains.map(async (d) => {
          const signals = await fetchSignals(d, country);
          return { country, domain: d, signals } as Row;
        })
      );
      setRows(results);
    } catch (e: any) {
      setErr(e?.message ?? "Something went wrong");
      setRows(null);
    } finally {
      setLoading(false);
    }
  }, [domains, country, fetchSignals]);

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <header className="mb-6 flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Top Quality Store — Scorecard Comparator</h1>
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600">Region</label>
          <select
            value={country}
            onChange={(e) => setCountry(e.target.value as "US" | "GB")}
            className="rounded-md border border-gray-300 bg-white px-2 py-1 text-sm"
          >
            {COUNTRIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </header>

      <section className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {domains.map((d, i) => (
          <input
            key={i}
            value={d}
            onChange={(e) => onChangeDomain(i, e.target.value)}
            placeholder={i === 0 ? "domain.com" : "optional"}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        ))}
      </section>

      <div className="mb-8">
        <button
          disabled={!canCompare || loading}
          onClick={onCompare}
          className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {loading ? "Comparing..." : "Compare"}
        </button>
      </div>

      {err && (
        <div className="mb-6 rounded-md bg-rose-50 px-4 py-3 text-rose-700">
          {err}
        </div>
      )}

      <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Store</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">TQS</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Delivery time</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Shipping (quality)</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Return window</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Returns (quality)</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Wallets</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Rating</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Reviews</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {(rows ?? []).map((row) => {
              const s = row.signals ?? {};
              return (
                <tr key={`${row.country}-${row.domain}`}>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      {s.logo_url ? (
                        <img
                          src={s.logo_url}
                          alt=""
                          className="h-9 w-9 rounded-md object-cover"
                        />
                      ) : (
                        <div className="h-9 w-9 rounded-md bg-gray-100" />
                      )}
                      <div className="flex flex-col">
                        <div className="text-sm font-medium text-gray-900">
                          {row.domain}
                        </div>
                        <div className="mt-1">
                          <Pill>{row.country}</Pill>
                        </div>
                      </div>
                    </div>
                  </td>

                  <td className="px-4 py-4">
                    <YesNoChip yes={!!s.tqs_badge} />
                  </td>

                  <td className="px-4 py-4">
                    <div className="text-sm text-gray-900">
                      {s.delivery_time || "—"}
                    </div>
                  </td>

                  <td className="px-4 py-4">
                    <GradeChip grade={s.section_grades?.shipping} />
                  </td>

                  <td className="px-4 py-4">
                    <div className="text-sm text-gray-900">
                      {s.return_window || "—"}
                    </div>
                  </td>

                  <td className="px-4 py-4">
                    <GradeChip grade={s.section_grades?.returns} />
                  </td>

                  <td className="px-4 py-4">
                    <div className="max-w-[260px] truncate text-sm text-gray-900">
                      {s.e_wallets || "—"}
                    </div>
                  </td>

                  <td className="px-4 py-4">
                    <div className="text-sm font-medium text-emerald-700">
                      {s.store_rating || "—"}
                    </div>
                  </td>

                  <td className="px-4 py-4">
                    <div className="text-sm text-gray-900">
                      {s.review_count || "—"}
                    </div>
                  </td>
                </tr>
              );
            })}

            {!rows?.length && (
              <tr>
                <td colSpan={9} className="px-4 py-16 text-center text-sm text-gray-500">
                  Enter up to five domains above, pick a region, and click <strong>Compare</strong>.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      <p className="mt-4 text-xs text-gray-500">
        We query <code>google.com/storepages</code> for each domain (per region) via a US-based serverless API. Displayed “quality” grades (Exceptional/Great/Good/etc.) are Google’s public indicators on the Store page.
      </p>
    </main>
  );
}
