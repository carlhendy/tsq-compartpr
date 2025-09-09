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

const DEFAULTS = ['asos.com', 'boohoo.com', 'next.co.uk', 'riverisland.com', 'newlook.com'];

export default function Page() {
  const [domains, setDomains] = useState<string[]>(DEFAULTS);
  const [country, setCountry] = useState<string>('GB');
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [hasCompared, setHasCompared] = useState<boolean>(false);

  const updateDomain = (i: number, v: string) => {
    const next = [...domains];
    next[i] = v;
    setDomains(next);
  };

  async function compare() {
    setLoading(true);
    setHasCompared(true);
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
    if (!q) return 'slate' as const;
    const v = q.toLowerCase();
    if (v.includes('exceptional')) return 'green' as const;
    if (v.includes('great')) return 'green' as const;
    if (v.includes('good')) return 'yellow' as const;
    return 'slate' as const;
  };

  const EXPLAINER = [
    {
      m: 'Top Quality Store',
      w: 'Overall trust/quality score combining key commerce signals.',
      t: 'Composite of shipping, returns, ratings/reviews, payments, policy clarity, etc.',
      q: 'Make policies easy to find, keep promises on shipping/returns, increase review volume/quality.',
    },
    {
      m: 'Delivery time',
      w: 'How fast shoppers receive orders vs. what you promise.',
      t: 'Promised vs actual delivery dates, on-time % by carrier/service level.',
      q: 'Offer clear delivery estimates at PDP/checkout, surface faster options, improve cut-off times and handling SLAs.',
    },
    {
      m: 'Shipping (quality)',
      w: 'Reliability and clarity of shipping experience.',
      t: 'Tracking availability, damage/loss rate, shipping cost transparency, coverage.',
      q: 'Show tracked services, reduce unexpected fees, package better, add free/flat shipping thresholds.',
    },
    {
      m: 'Return window',
      w: 'How long customers have to return items.',
      t: 'Number of days allowed (e.g., 30/60/90).',
      q: 'Extend window (where feasible), state it clearly on PDP, order confirmation, and returns page.',
    },
    {
      m: 'Returns (quality)',
      w: 'Ease and satisfaction of the returns process.',
      t: 'Time to refund, label/portal availability, approval rate, NPS/CSAT on returns.',
      q: 'Offer self-serve portal, instant labels/QR, fast refunds or store credit, clear status updates.',
    },
    {
      m: 'Wallets',
      w: 'Support for popular digital wallets at checkout.',
      t: 'Availability of Google Pay, Apple Pay, PayPal, Shop Pay, etc.',
      q: 'Enable major wallets, default them in express checkout, minimize extra fields when wallet is used.',
    },
    {
      m: 'Rating',
      w: 'Average product/store rating shown to shoppers.',
      t: 'Star average from verified sources (Merchant Center, product review feeds, 3P platforms).',
      q: 'Request reviews post‑purchase, highlight authentic UGC, fix issues dragging ratings down.',
    },
    {
      m: 'Reviews',
      w: 'Volume and freshness of customer reviews.',
      t: 'Total count, recency, % with photos/video, coverage across catalog.',
      q: 'Automate review requests, incentivize UGC (non‑monetary), syndicate reviews, merge duplicates.',
    },
  ] as const;

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Hero */}<section className="mx-auto max-w-6xl px-6 pt-16 pb-6 text-center">
        <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">Compare Google Store Ratings</h1>
        <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-slate-600">
          Benchmark Ecommerce Stores by Google’s Public Quality Signals. Paste up to five store domains and compare the signals Google shows on{' '}
          <code className="rounded bg-slate-100 px-1.5 py-0.5 text-slate-700">google.com/storepages</code>.{' '}
    </p>

        {/* Inputs */}
        <div className="mt-8 rounded-2xl border border-slate-200 bg-sky-50 p-4 shadow-sm backdrop-blur bg-blue-100 p-6 rounded-2xl rounded-2xl ring-1 ring-slate-200 bg-blue-50 rounded-xl p-4">
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
                aria-label="Region"
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
                {loading ? (
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" opacity="0.25" />
                    <path d="M22 12a10 10 0 0 1-10 10" stroke="currentColor" strokeWidth="4" fill="none" />
                  </svg>
                ) : (
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 5l7 7-7 7" />
                  </svg>
                )}
                Compare
              </button>
            </div>
          </div>
        </div>
      </section>





      {hasCompared && (
        <section className="mx-auto max-w-6xl px-6 pb-16">
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full table-fixed text-left">
              
              <thead className="bg-slate-50 text-sm text-slate-600">
                <tr className="[&>th]:px-4 [&>th]:py-3">
                  <th className="w-[26%] text-left">Store</th>
                  <th className="w-[9%] text-center">Top Quality Store</th>
                  <th className="w-[10%] text-center">Delivery time</th>
                  <th className="w-[13%] text-center">Shipping (quality)</th>
                  <th className="w-[12%] text-center">Return window</th>
                  <th className="w-[13%] text-center">Returns (quality)</th>
                  <th className="w-[12%] text-center">Wallets</th>
                  <th className="w-[7%] text-center">Rating</th>
                  <th className="w-[8%] text-center">Reviews</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 text-sm text-slate-800">
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-4 py-10 text-center text-slate-500">
                      {loading ? 'Fetching signals…' : 'No results yet.'}
                    </td>
                  </tr>
                )}
                {rows.map((row, i) => {
                  const s = row.signals;
                  return (
                    <tr key={i} className="[&>td]:px-4 [&>td]:py-4 hover:bg-slate-50 transition-colors">
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

                      <td className="text-center">
                        {s
                          ? (s.tqs_badge ? badge('Yes', 'green') : badge('No', 'red'))
                          : row.error
                          ? badge('Error', 'red')
                          : badge('—', 'slate')}
                      </td>

                      <td className="text-center tabular-nums">{s?.delivery_time || '—'}</td>
                      <td className="text-center">{badge(s?.section_grades?.shipping || '—', qualityTone(s?.section_grades?.shipping))}</td>

                      <td className="text-center tabular-nums">{s?.return_window || '—'}</td>
                      <td className="text-center">{badge(s?.section_grades?.returns || '—', qualityTone(s?.section_grades?.returns))}</td>

                      <td className="text-center truncate">{s?.e_wallets || '—'}</td>

                      <td className="text-center tabular-nums font-medium text-emerald-700">{s?.store_rating || '—'}</td>

                      <td className="text-center tabular-nums">{s?.review_count || '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <p className="mt-3 text-xs text-slate-500">
            We query <span className="font-mono text-slate-700">google.com/storepages</span> for each domain (per region) via a US‑based serverless API.
            Displayed “quality” grades (Exceptional/Great/Good/etc.) are Google’s public indicators on the Store page.
          </p>
        </section>
      )}



      

      



      



{/* Explainer table */}
      <section className="mx-auto max-w-6xl px-6 pb-10">
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 bg-slate-50 px-5 py-3">
            <h2 className="text-sm font-medium text-slate-700">How Google might interpret these signals</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              
              <thead className="bg-slate-50 text-sm text-slate-600">
                <tr className="[&>th]:px-4 [&>th]:py-3">
                  <th className="w-[26%] text-left">Store</th>
                  <th className="w-[9%] text-center">Top Quality Store</th>
                  <th className="w-[10%] text-center">Delivery time</th>
                  <th className="w-[13%] text-center">Shipping (quality)</th>
                  <th className="w-[12%] text-center">Return window</th>
                  <th className="w-[13%] text-center">Returns (quality)</th>
                  <th className="w-[12%] text-center">Wallets</th>
                  <th className="w-[7%] text-center">Rating</th>
                  <th className="w-[8%] text-center">Reviews</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {EXPLAINER.map((r, idx) => (
                  <tr key={idx} className="odd:bg-slate-50/40 [&>td]:align-top [&>td]:px-4 [&>td]:py-3">
                    <td className="text-center font-medium text-slate-900">{r.m}</td>
                    <td className="text-center text-slate-700">{r.w}</td>
                    <td className="text-center text-slate-600">{r.t}</td>
                    <td className="text-center text-slate-600">{r.q}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Results (hidden until Compare) */}{/* Footer */}
      
      {/* FAQs */}
      <section className="mx-auto max-w-6xl px-6 pb-16">
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 bg-slate-50 px-5 py-3">
            <h2 className="text-sm font-medium text-slate-700">FAQs</h2>
          </div>
          <div className="divide-y divide-slate-100">
            <div className="px-5 py-4">
              <h3 className="font-medium text-slate-900">Where do these signals come from?</h3>
              <p className="mt-1 text-sm text-slate-600">
                From Google’s public <span className="font-mono">storepages</span> surface for each domain and region. We don’t scrape private data or guess values.
              </p>
            </div>
            <div className="px-5 py-4">
              <h3 className="font-medium text-slate-900">What does “Top Quality Store” mean?</h3>
              <p className="mt-1 text-sm text-slate-600">
                It’s Google’s badge indicating strong trust/quality across core commerce signals (shipping, returns, reviews, policy clarity, payments, etc.).
              </p>
            </div>
            <div className="px-5 py-4">
              <h3 className="font-medium text-slate-900">How often are results updated?</h3>
              <p className="mt-1 text-sm text-slate-600">
                Whenever you click Compare we fetch fresh data. Google’s public indicators may change at any time.
              </p>
            </div>
            <div className="px-5 py-4">
              <h3 className="font-medium text-slate-900">Why don’t I see all wallets or grades for my store?</h3>
              <p className="mt-1 text-sm text-slate-600">
                Some signals are only shown by Google in certain regions or for eligible stores. If Google doesn’t show it, we display a dash (—).
              </p>
            </div>
            <div className="px-5 py-4">
              <h3 className="font-medium text-slate-900">Can I export the results?</h3>
              <p className="mt-1 text-sm text-slate-600">
                Not yet, but you can copy/paste the table into a spreadsheet. CSV export is on the roadmap.
              </p>
            </div>
          </div>
        </div>
      </section>


<footer className="border-t border-slate-200 bg-white/90 py-10 text-center text-sm text-slate-600">
        <p className="mb-2">
          Vibe coded by{' '}
          <a href="https://carlhendy.com" target="_blank" rel="noreferrer" className="bg-amber-100 text-slate-900 px-2 py-1 rounded-md no-underline font-normal">
            Carl Hendy
          </a>{' '}
          — founder of{' '}
          <a href="https://audits.com" target="_blank" rel="noreferrer" className="bg-amber-100 text-slate-900 px-2 py-1 rounded-md no-underline font-normal">
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
