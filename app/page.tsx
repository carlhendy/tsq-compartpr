'use client';

import { useState } from 'react';

type Signals = {
  tqs_badge: boolean;
  delivery_time: string;
  shipping_cost_free: boolean;
  return_window: string;
  return_cost_free: boolean;
  e_wallets: string;
  store_rating: string;
  review_count: string;
  section_grades?: {
    shipping?: string;
    returns?: string;
    pricing?: string;
    payments?: string;
    website?: string;
  };
  logo_url?: string;
};

type Row = {
  domain: string;
  country: string;
  signals?: Signals;
  error?: string;
};

const DEFAULTS = ['dunelm.com', 'charlesandivy.co.uk', 'wickes.co.uk', 'next.co.uk', ''];

export default function Page() {
  const [domains, setDomains] = useState<string[]>(DEFAULTS);
  const [country, setCountry] = useState<string>('GB');
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  const updateDomain = (i: number, v: string) => {
    const next = [...domains];
    next[i] = v;
    setDomains(next);
  };

  async function compare() {
    setLoading(true);
    setRows([]);
    const entries = domains.map(d => d.trim()).filter(Boolean).slice(0, 5);
    const promises = entries.map(async (d) => {
      try {
        const r = await fetch(`/api/storepage?domain=${encodeURIComponent(d)}&country=${country}`);
        const json = await r.json();
        if (json.error) {
          return { domain: d, country, error: json.error } as Row;
        }
        return { domain: d, country, signals: json.signals } as Row;
      } catch (e: any) {
        return { domain: d, country, error: e.message } as Row;
      }
    });
    const out = await Promise.all(promises);
    setRows(out);
    setLoading(false);
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Hero */}
      <section className="mx-auto max-w-6xl px-6 pt-16 pb-6 text-center">
        <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
          Top Quality Store — Scorecard Comparator
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-slate-600">
          Paste up to five store domains and see the public signals Google shows on{" "}
          <code className="rounded bg-slate-100 px-1.5 py-0.5 text-slate-700">google.com/storepages</code>. 
          Compare shipping, returns, wallets, and ratings side by side.
        </p>

        {/* Inputs */}
        <div className="mt-8 rounded-2xl border border-slate-200 bg-white/70 p-4 shadow-sm backdrop-blur">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-2">
            <div className="grid flex-1 grid-cols-1 gap-2 sm:grid-cols-5">
              {domains.map((d, i) => (
                <input
                  key={i}
                  value={d}
                  onChange={(e) => updateDomain(i, e.target.value)}
                  placeholder="domain.com"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none placeholder:text-slate-400 focus:border-slate-300 focus:ring-2 focus:ring-slate-200"
                />
              ))}
            </div>
            <div className="flex items-center gap-2 pt-2 sm:pt-0">
              <select
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-sm text-slate-700 focus:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-200"
              >
                <option value="US">US</option>
                <option value="GB">GB</option>
                <option value="AU">AU</option>
                <option value="CA">CA</option>
                <option value="IE">IE</option>
                <option value="NZ">NZ</option>
                <option value="DE">DE</option>
                <option value="FR">FR</option>
              </select>
              <button
                onClick={compare}
                disabled={loading}
                className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Loading…" : "Compare"}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Results */}
      <section className="mx-auto max-w-6xl px-6 pb-16">
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full table-fixed text-left">
            <thead className="bg-slate-50 text-sm text-slate-600">
              <tr className="[&>th]:px-4 [&>th]:py-3">
                <th className="w-[26%]">Store</th>
                <th className="w-[9%]">TQS</th>
                <th className="w-[10%]">Delivery time</th>
                <th className="w-[13%]">Shipping (quality)</th>
                <th className="w-[12%]">Return window</th>
                <th className="w-[13%]">Returns (quality)</th>
                <th className="w-[12%]">Wallets</th>
                <th className="w-[7%]">Rating</th>
                <th className="w-[8%]">Reviews</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm text-slate-800">
              {rows.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-10 text-center text-slate-500">
                    Enter domains above and click <span className="font-medium text-slate-900">Compare</span>.
                  </td>
                </tr>
              )}
              {rows.map((row, i) => {
                const s = row.signals;
                const badge = (label: string, tone: 'green'|'yellow'|'red'|'slate' = 'slate') => {
                  const toneMap: Record<string, string> = {
                    green: 'bg-green-50 text-green-700 ring-green-600/20',
                    yellow: 'bg-amber-50 text-amber-700 ring-amber-600/20',
                    red: 'bg-rose-50 text-rose-700 ring-rose-600/20',
                    slate: 'bg-slate-50 text-slate-700 ring-slate-600/20',
                  };
                  return (
                    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs ring-1 ${toneMap[tone]}`}>
                      {label}
                    </span>
                  );
                };

                const qualityTone = (q?: string) => {
                  if (!q) return 'slate';
                  const v = q.toLowerCase();
                  if (v.includes('exceptional')) return 'green';
                  if (v.includes('great')) return 'green';
                  if (v.includes('good')) return 'yellow';
                  return 'slate';
                };

                return (
                  <tr key={i} className="[&>td]:px-4 [&>td]:py-4">
                    <td className="flex items-center gap-3 pr-2">
                      <div className="h-10 w-10 overflow-hidden rounded-xl ring-1 ring-slate-200 bg-white">
                        {s?.logo_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={s.logo_url} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <div className="h-full w-full bg-slate-100" />
                        )}
                      </div>
                      <div className="leading-5">
                        <div className="font-medium text-slate-900">{row.domain}</div>
                      </div>
                    </td>

                    <td>
                      {s ? (
                        s.tqs_badge
                          ? badge('Yes', 'green')
                          : badge('No', 'red')
                      ) : row.error ? badge('Error', 'red') : badge('—', 'slate')}
                    </td>

                    <td className="tabular-nums">{s?.delivery_time || '—'}</td>

                    <td>{badge(s?.section_grades?.shipping || '—', qualityTone(s?.section_grades?.shipping) as any)}</td>

                    <td className="tabular-nums">{s?.return_window || '—'}</td>

                    <td>{badge(s?.section_grades?.returns || '—', qualityTone(s?.section_grades?.returns) as any)}</td>

                    <td className="truncate">{s?.e_wallets || '—'}</td>

                    <td className="tabular-nums font-medium text-emerald-700">{s?.store_rating || '—'}</td>

                    <td className="tabular-nums">{s?.review_count || '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <p className="mt-3 text-xs text-slate-500">
          We query <span className="font-mono text-slate-700">google.com/storepages</span> for each domain (per region) via a US-based serverless API.
          Displayed “quality” grades (Exceptional/Great/Good/etc.) are Google’s public indicators on the Store page.
        </p>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-6xl px-6 pb-20">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-900">Frequently Asked Questions</h2>
          <div className="mt-4 space-y-5 text-slate-700">
            <div>
              <p className="font-medium">❓ 1. How can I compare ecommerce store ratings?</p>
              <p className="mt-1 text-sm text-slate-600">
                Our tool lets you enter multiple online stores and instantly compare their customer review scores, overall ratings, and trust levels.
                This makes it easy to see which store offers the best shopping experience.
              </p>
            </div>
            <div>
              <p className="font-medium">❓ 2. Can I bulk compare multiple ecommerce stores at once?</p>
              <p className="mt-1 text-sm text-slate-600">
                Yes! Instead of checking review sites one by one, you can compare several ecommerce stores side by side in one place.
                Perfect for shoppers doing research or businesses benchmarking competitors.
              </p>
            </div>
            <div>
              <p className="font-medium">❓ 3. Why is comparing ecommerce store scores important?</p>
              <p className="mt-1 text-sm text-slate-600">
                Ratings and reviews are one of the strongest signals of customer satisfaction.
                By comparing store scores, you can identify which stores are most trusted, deliver better service, and provide a smoother shopping experience.
              </p>
            </div>
            <div>
              <p className="font-medium">❓ 4. Does your tool show both ratings and customer reviews?</p>
              <p className="mt-1 text-sm text-slate-600">
                Absolutely. You’ll see not just the overall star ratings but also the number of reviews, so you can judge both quality and credibility.
                A store with thousands of positive reviews may be more reliable than one with just a handful.
              </p>
            </div>
            <div>
              <p className="font-medium">❓ 5. Can I find the top-rated ecommerce stores?</p>
              <p className="mt-1 text-sm text-slate-600">
                Yes. You can sort and filter to highlight stores with the highest ratings, best customer feedback, and strongest reputations.
                This helps you quickly find the best options in any ecommerce category.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white/90 py-10 text-center text-sm text-slate-600">
        <p className="mb-2">
          Vibe coded by{" "}
          <a href="https://carlhendy.com" target="_blank" rel="noreferrer" className="font-medium text-slate-900 underline decoration-slate-300 hover:decoration-slate-500">
            Carl Hendy
          </a>{" "}
          — founder of{" "}
          <a href="https://audits.com" target="_blank" rel="noreferrer" className="font-medium text-slate-900 underline decoration-slate-300 hover:decoration-slate-500">
            Audits.com
          </a>.
        </p>
        <p className="mx-auto max-w-3xl text-xs text-slate-500">
          Disclaimer: This is a non‑profit, non‑commercial demo. Ratings, review counts and quality grades are displayed from Google’s public
          <span className="font-mono"> storepages </span> surface (per region) and may change at any time. This site is not affiliated with Google.
        </p>
      </footer>
    </main>
  );
}
