'use client';

import { useState } from 'react';

/**
 * Types for the signals we render. Shape is kept loose on purpose; we
 * normalise at read-time with getAny().
 */
type Signals = {
  tqs_badge?: boolean;
  delivery_time?: string;
  return_window?: string;
  e_wallets?: string;
  store_rating?: string | number;
  review_count?: string | number;
  logo_url?: string;
  section_grades?: {
    shipping?: string;
    returns?: string;
  };
  // allow unknown keys
  [k: string]: any;
};

type Row = {
  domain: string;
  country: string;
  signals?: Signals;
  error?: string;
};

const DEFAULTS = ['asos.com','boohoo.com','next.co.uk','riverisland.com','newlook.com'];

/** ---------- tiny data helpers (no visual changes) ---------- */
const pick = <T,>(...vals: (T | undefined | null | '')[]) =>
  vals.find((v) => v !== undefined && v !== null && v !== '') as T | undefined;

const get = (obj: any, path: string) =>
  path.split('.').reduce((a, k) => (a && a[k] !== undefined ? a[k] : undefined), obj);

const getAny = (obj: any, paths: string[], fallback: any = '—') =>
  (pick(...paths.map((p) => get(obj, p))) as any) ?? fallback;

/** Quality -> colour tone */
const qualityTone = (grade?: string) => {
  if (!grade) return 'slate';
  const g = String(grade).toLowerCase();
  if (g.startsWith('exception') || g.startsWith('great')) return 'green';
  if (g.startsWith('good') || g.startsWith('fair')) return 'yellow';
  return 'red';
};

/** Small pill badge */
const badge = (label: string | number, tone: 'green'|'yellow'|'red'|'slate' = 'slate') => {
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

/** Validation URL to Google Storepages */
const validationUrl = (domain: string, country: string) => {
  const c = (country || 'US').toUpperCase();
  return `https://www.google.com/storepages?q=${encodeURIComponent(domain)}&c=${c}&v=19`;
};

export default function Page() {
  const [domains, setDomains] = useState<string[]>(DEFAULTS);
  const [country, setCountry] = useState<string>('GB');
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [hasCompared, setHasCompared] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  const updateDomain = (i: number, v: string) => {
    const next = [...domains];
    next[i] = v;
    setDomains(next);
  };

  /** Fetch & normalise results */
  async function compare() {
    setLoading(true);
    setHasCompared(true);
    setRows([]);
    const entries = domains.map((d) => d.trim()).filter(Boolean).slice(0, 5);
    const promises = entries.map(async (d) => {
      try {
        const r = await fetch(`/api/storepage?domain=${encodeURIComponent(d)}&country=${country}`);
        const json = await r.json();
        if (json?.error) {
          return { domain: d, country, error: String(json.error) } as Row;
        }
        // Accept {signals:{...}} or {data:{...}} or {payload:{...}} or flat {...}
        const payload = json?.signals ?? json?.data ?? json?.payload ?? json;
        return { domain: d, country, signals: payload as Signals } as Row;
      } catch (e: any) {
        return { domain: d, country, error: e?.message || 'Fetch error' } as Row;
      }
    });
    const res = await Promise.all(promises);
    setRows(res);
    setLoading(false);
  }

  /** Copy a text-only (TSV) version of the table */
  const copyResults = async () => {
    try {
      const headers = ['Store','Top Quality Store','Delivery time','Shipping (quality)','Return window','Returns (quality)','Wallets','Rating','Reviews'];
      const lines: string[] = [headers.join('\t')];
      for (const row of rows) {
        const s = row.signals || {};
        const tqs = s?.tqs_badge;
        const delivery = getAny(s, ['delivery_time','deliveryTime','delivery_estimate']);
        const shipGrade = getAny(s, ['section_grades.shipping','shipping_quality','shippingGrade']);
        const returnWindow = getAny(s, ['return_window','returnWindow','returns_window']);
        const returnsGrade = getAny(s, ['section_grades.returns','returns_quality','returnsGrade']);
        const wallets = getAny(s, ['e_wallets','wallets','payment_wallets']);
        const rating = getAny(s, ['store_rating','rating','storeRating']);
        const reviews = getAny(s, ['review_count','reviews','reviewCount']);

        const values = [
          row.domain || '—',
          row.error ? 'Error' : (tqs === true ? 'Yes' : tqs === false ? 'No' : '—'),
          delivery, shipGrade, returnWindow, returnsGrade, wallets, String(rating), String(reviews),
        ];
        lines.push(values.join('\t'));
      }
      await navigator.clipboard.writeText(lines.join('\n'));
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch (e) {
      console.error('Copy failed', e);
    }
  };

  const EXPLAINER = [
    { m: 'Delivery time', w: 'Estimated shipping time surfaced by Google.', t: 'From Google’s Store page for your domain & region.', q: 'Sync accurate shipping SLAs and expedited options.' },
    { m: 'Shipping (quality)', w: 'Overall signal for shipping experience.', t: 'Google’s derived grade per region.', q: 'Clarify shipping costs, speed, and policies.' },
    { m: 'Return window', w: 'How long customers have to return items.', t: 'Shown on Store page when detected.', q: 'Make your return window obvious site‑wide.' },
    { m: 'Returns (quality)', w: 'Overall signal for your returns experience.', t: 'Google’s derived grade per region.', q: 'Free returns and clear policy improve trust.' },
    { m: 'Wallets', w: 'Digital wallets available at checkout.', t: 'Detected by Google per region.', q: 'Add popular wallets (e.g., PayPal, Apple Pay).'},
    { m: 'Rating/Reviews', w: 'Aggregate rating and review count.', t: 'Sourced from approved review partners.', q: 'Grow recent, verified reviews.'},
  ] as const;

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Hero */}
      <section className="mx-auto max-w-6xl px-6 pt-16 pb-6 text-center">
        <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl text-center inline-block mx-auto bg-yellow-100/70 px-3 py-1 rounded-md">
          Compare Google Store Ratings
        </h1>
        <h2 className="mt-6 text-xl font-medium text-slate-700 text-center inline-block mx-auto bg-green-100/70 px-3 py-1 rounded-md">
          Benchmark Ecommerce Stores by Google’s Public Quality Signals
        </h2>
      </section>

      {/* Inputs */}
      <section className="mx-auto max-w-6xl px-6 pb-8">
        <div className="mt-2 rounded-2xl border border-slate-200 bg-blue-50/70 p-6 shadow-sm backdrop-blur">
          <p className="mb-6 text-sm text-slate-600 text-center">
            👉 Compare up to five store websites and review the signals displayed by Google on{' '}
            <code className="rounded bg-slate-100 px-1.5 py-0.5 text-slate-700">google.com/storepages</code>.
          </p>
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

      {/* Results */}
      {hasCompared && (
        <section className="mx-auto max-w-6xl px-6 pb-12">
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-end gap-2 px-4 py-2">
              <button
                onClick={copyResults}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
                aria-label="Copy table results"
                title="Copy table results"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M6 2.75A1.75 1.75 0 0 1 7.75 1h6.5C15.216 1 16 1.784 16 2.75v6.5A1.75 1.75 0 0 1 14.25 11h-6.5A1.75 1.75 0 0 1 12 9.25v-6.5Z" />
                  <path d="M3.75 5A1.75 1.75 0 0 0 2 6.75v8.5C2 16.216 2.784 17 3.75 17h8.5A1.75 1.75 0 0 0 14 15.25V14H7.75A1.75 1.75 0 0 1 6 12.25V6H3.75Z" />
                </svg>
                {copied ? 'Copied' : 'Copy results'}
              </button>
            </div>
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
                  const s: Signals = row.signals || {};
                  const tqs = s?.tqs_badge; // true/false/undefined
                  const delivery = getAny(s, ['delivery_time','deliveryTime','delivery_estimate']);
                  const shipGrade = getAny(s, ['section_grades.shipping','shipping_quality','shippingGrade']);
                  const returnWindow = getAny(s, ['return_window','returnWindow','returns_window']);
                  const returnsGrade = getAny(s, ['section_grades.returns','returns_quality','returnsGrade']);
                  const wallets = getAny(s, ['e_wallets','wallets','payment_wallets']);
                  const rating = getAny(s, ['store_rating','rating','storeRating']);
                  const reviews = getAny(s, ['review_count','reviews','reviewCount']);

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
                          <div className="font-medium text-slate-900 flex items-center gap-2">
                            {row.domain}
                            <a
                              href={validationUrl(row.domain, row.country)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center rounded-md border border-slate-200 bg-white px-1.5 py-0.5 text-xs text-slate-600 hover:bg-slate-50 hover:text-slate-800 transition"
                              title="Open source URL"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
                                <path d="M12.5 2a.75.75 0 0 0 0 1.5h2.69l-5.72 5.72a.75.75 0 1 0 1.06 1.06l5.72-5.72V7.5a.75.75 0 0 0 1.5 0V2.75A.75.75 0 0 0 16.75 2h-4.25ZM4.25 4.5A2.25 2.25 0 0 0 2 6.75v8.5A2.25 2.25 0 0 0 4.25 17.5h8.5A2.25 2.25 0 0 0 15 15.25V11a.75.75 0 0 0-1.5 0v4.25a.75.75 0 0 1-.75.75h-8.5a.75.75 0 0 1-.75-.75v-8.5a.75.75 0 0 1 .75-.75H9a.75.75 0 0 0 0-1.5H4.25Z" />
                              </svg>
                            </a>
                          </div>
                        </div>
                      </td>

                      {/* TQS */}
                      <td className="text-center">
                        {row.error
                          ? badge('Error', 'red')
                          : tqs === true
                            ? badge('Yes', 'green')
                            : tqs === false
                              ? badge('No', 'red')
                              : badge('—', 'slate')}
                      </td>

                      {/* Delivery */}
                      <td className="text-center tabular-nums">{delivery}</td>

                      {/* Shipping grade */}
                      <td className="text-center">{badge(shipGrade, qualityTone(shipGrade))}</td>

                      {/* Return window */}
                      <td className="text-center tabular-nums">{returnWindow}</td>

                      {/* Returns grade */}
                      <td className="text-center">{badge(returnsGrade, qualityTone(returnsGrade))}</td>

                      {/* Wallets */}
                      <td className="text-center truncate">{wallets}</td>

                      {/* Rating */}
                      <td className="text-center tabular-nums font-medium text-emerald-700">{rating}</td>

                      {/* Reviews */}
                      <td className="text-center tabular-nums">{reviews}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
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
                <tr className="[&>th]:px-4 [&>th]:py-3 text-left">
                  <th className="w-[20%] text-left">Signal</th>
                  <th className="w-[26%] text-left">What it means</th>
                  <th className="w-[27%] text-left">How it’s measured</th>
                  <th className="w-[27%] text-left">Quick wins</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {EXPLAINER.map((r, idx) => (
                  <tr key={idx} className="odd:bg-slate-50/40 [&>td]:align-top [&>td]:px-4 [&>td]:py-3">
                    <td className="font-medium text-slate-900">{r.m}</td>
                    <td className="text-slate-700">{r.w}</td>
                    <td className="text-slate-600">{r.t}</td>
                    <td className="text-slate-600">{r.q}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* FAQs with schema (includes the storepages collection note) */}
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
                You can copy the table using the “Copy results” button and paste into a spreadsheet. CSV export is on the roadmap.
              </p>
            </div>
            <div className="px-5 py-4">
              <h3 className="font-medium text-slate-900">How do we collect and display the quality signals for store websites from google.com/storepages?</h3>
              <p className="mt-1 text-sm text-slate-600">
                We query <span className="font-mono">google.com/storepages</span> for each domain (per region) via a US‑based serverless API. Displayed “quality” grades
                (Exceptional/Great/Good/etc.) are Google’s public indicators on the Store page.
              </p>
            </div>
          </div>
        </div>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "FAQPage",
              "mainEntity": [
                {
                  "@type": "Question",
                  "name": "Where do these signals come from?",
                  "acceptedAnswer": { "@type": "Answer", "text": "From Google’s public storepages surface for each domain and region. We don’t scrape private data or guess values." }
                },
                {
                  "@type": "Question",
                  "name": "What does “Top Quality Store” mean?",
                  "acceptedAnswer": { "@type": "Answer", "text": "It’s Google’s badge indicating strong trust/quality across core commerce signals (shipping, returns, reviews, policy clarity, payments, etc.)." }
                },
                {
                  "@type": "Question",
                  "name": "How often are results updated?",
                  "acceptedAnswer": { "@type": "Answer", "text": "Whenever you click Compare we fetch fresh data. Google’s public indicators may change at any time." }
                },
                {
                  "@type": "Question",
                  "name": "Why don’t I see all wallets or grades for my store?",
                  "acceptedAnswer": { "@type": "Answer", "text": "Some signals are only shown by Google in certain regions or for eligible stores. If Google doesn’t show it, we display a dash (—)." }
                },
                {
                  "@type": "Question",
                  "name": "Can I export the results?",
                  "acceptedAnswer": { "@type": "Answer", "text": "You can copy the table using the “Copy results” button and paste into a spreadsheet. CSV export is on the roadmap." }
                },
                {
                  "@type": "Question",
                  "name": "How do we collect and display the quality signals for store websites from google.com/storepages?",
                  "acceptedAnswer": { "@type": "Answer", "text": "We query google.com/storepages for each domain (per region) via a US‑based serverless API. Displayed “quality” grades (Exceptional/Great/Good/etc.) are Google’s public indicators on the Store page." }
                }
              ]
            })
          }}
        />
      </section>

      {/* Footer */}
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
