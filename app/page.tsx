'use client';

import { useState } from 'react';


// --- Wallet pills renderer (no dependencies) ---
const WALLET_COLORS: Record<string, { bg: string; text: string }> = {
  'paypal':     { bg: '#003087', text: '#ffffff' },
  'apple pay':  { bg: '#000000', text: '#ffffff' },
  'google pay': { bg: '#4285F4', text: '#ffffff' },
  'shop pay':   { bg: '#5a31f4', text: '#ffffff' },
  'afterpay':   { bg: '#b2ffe5', text: '#0f172a' },
  'klarna':     { bg: '#ffb3c7', text: '#0f172a' },
};

function renderWalletPills(input?: string | string[]) {
  const names = Array.isArray(input)
    ? input
    : (input || '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', justifyContent: 'center' }}>
      {names.map((name) => {
        const c = WALLET_COLORS[name.toLowerCase()] || { bg: '#e2e8f0', text: '#0f172a' };
        return (
          <span
            key={name}
            style={{
              backgroundColor: c.bg,
              color: c.text,
              borderRadius: '9999px',
              padding: '4px 10px',   // smaller pill
              fontSize: '0.75rem',   // smaller text
              fontWeight: 600,
              lineHeight: 1,
              boxShadow: '0 1px 2px rgba(0,0,0,0.08)',
              border: '1px solid rgba(0,0,0,0.06)',
              whiteSpace: 'nowrap',
            }}
          >
            {name}
          </span>
        );
      })}
    </div>
  );
}


/** ---------- Types ---------- */
type Signals = {
  tqs_badge?: boolean;
  delivery_time?: string;
  return_window?: string;
  e_wallets?: string;
  store_rating?: string | number;
  review_count?: string | number;
  logo_url?: string;
  scamadviser_score?: string | number;
  section_grades?: {
    shipping?: string;
    returns?: string;
    pricing?: string;
    payments?: string;
    website?: string;
  };
  [k: string]: any;
};

type Row = {
  domain: string;
  country: string;
  signals?: Signals;
  error?: string;
};

const DEFAULTS = ['asos.com','boohoo.com','next.co.uk','riverisland.com','newlook.com'];

/** ---------- helpers ---------- */
const pick = <T,>(...vals: (T | undefined | null | '')[]) =>
  vals.find((v) => v !== undefined && v !== null && v !== '') as T | undefined;

const get = (obj: any, path: string) =>
  path.split('.').reduce((a, k) => (a && a[k] !== undefined ? a[k] : undefined), obj);

const getAny = (obj: any, paths: string[], fallback: any = '—') =>
  (pick(...paths.map((p) => get(obj, p))) as any) ?? fallback;

// TSQ Scoring system
const levelScore = (grade?: string): number => {
  if (!grade) return 0.00;
  const g = String(grade).toLowerCase();
  if (g.startsWith('exception')) return 1.00;
  if (g.startsWith('great')) return 0.85;
  if (g.startsWith('good')) return 0.70;
  if (g.startsWith('fair')) return 0.40;
  if (g.startsWith('poor')) return 0.20;
  return 0.00;
};

const computeTsqScore = (signals: Signals): number => {
  // Base scores from quality grades
  const returnsScore = levelScore(signals.section_grades?.returns) * 30;
  const shippingScore = levelScore(signals.section_grades?.shipping) * 25;
  const pricingScore = levelScore(signals.section_grades?.pricing) * 25;
  const websiteScore = levelScore(signals.section_grades?.website) * 10;
  
  // Wallets score (5% max, based on unique wallet count)
  const wallets = signals.e_wallets || '';
  const uniqueWallets = new Set(
    wallets.split(',').map(w => w.trim()).filter(Boolean)
  );
  const walletsScore = Math.min(uniqueWallets.size / 3, 1.0) * 5;
  
  // Trust score (5% max, normalized from 0-100)
  let trustScore = 0;
  if (signals.scamadviser_score) {
    const trustValue = parseInt(String(signals.scamadviser_score), 10);
    if (!isNaN(trustValue)) {
      trustScore = (trustValue / 100) * 5;
    }
  }
  
  // Bonuses
  let bonuses = 0;
  
  // Return window bonus
  const returnWindow = signals.return_window || '';
  const maxDaysMatch = returnWindow.match(/(\d+)/g);
  if (maxDaysMatch) {
    const maxDays = Math.max(...maxDaysMatch.map(Number));
    if (maxDays >= 30) bonuses += 5;
    else if (maxDays >= 28) bonuses += 3;
  }
  
  // Top Quality Store bonus
  if (signals.tqs_badge === true) bonuses += 5;
  
  // Calculate final score
  const totalScore = returnsScore + shippingScore + pricingScore + websiteScore + walletsScore + trustScore + bonuses;
  
  // Cap at 100, floor at 0, round to nearest integer
  return Math.round(Math.max(0, Math.min(100, totalScore)));
};

const qualityTone = (grade?: string) => {
  if (!grade) return 'slate';
  const g = String(grade).toLowerCase();
  if (g.startsWith('exception') || g.startsWith('great')) return 'green';
  if (g.startsWith('good') || g.startsWith('fair')) return 'yellow';
  return 'red';
};

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

const validationUrl = (domain: string, country: string) => {
  const c = (country || 'US').toUpperCase();
  return `https://www.google.com/storepages?q=${encodeURIComponent(domain)}&c=${c}&v=19`;
};

/** ---------- Page ---------- */
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

  async function compare() {
    setLoading(true);
    setHasCompared(true);
    setRows([]);
    const entries = domains.map((d) => d.trim()).filter(Boolean).slice(0, 5);
    const promises = entries.map(async (d) => {
      try {
        const r = await fetch(`/api/storepage?domain=${encodeURIComponent(d)}&country=${country}`);
        const json = await r.json();
        if (json?.error) return { domain: d, country, error: String(json.error) } as Row;
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

  // Sort rows by TSQ score (best to worst)
  const sortedRows = [...rows].sort((a, b) => {
    const aScore = a.signals ? computeTsqScore(a.signals) : 0;
    const bScore = b.signals ? computeTsqScore(b.signals) : 0;
    
    if (aScore !== bScore) return bScore - aScore; // Higher score first
    
    // Tie-breakers
    const aSignals = a.signals || {};
    const bSignals = b.signals || {};
    
    // 1. Competitive pricing level
    const aPricing = levelScore(aSignals.section_grades?.pricing);
    const bPricing = levelScore(bSignals.section_grades?.pricing);
    if (aPricing !== bPricing) return bPricing - aPricing;
    
    // 2. Returns quality level
    const aReturns = levelScore(aSignals.section_grades?.returns);
    const bReturns = levelScore(bSignals.section_grades?.returns);
    if (aReturns !== bReturns) return bReturns - aReturns;
    
    // 3. Shipping quality level
    const aShipping = levelScore(aSignals.section_grades?.shipping);
    const bShipping = levelScore(bSignals.section_grades?.shipping);
    if (aShipping !== bShipping) return bShipping - aShipping;
    
    // 4. Number of unique wallets
    const aWallets = new Set((aSignals.e_wallets || '').split(',').map(w => w.trim()).filter(Boolean));
    const bWallets = new Set((bSignals.e_wallets || '').split(',').map(w => w.trim()).filter(Boolean));
    return bWallets.size - aWallets.size;
  });

  const copyResults = async () => {
    try {
      const headers = ['Medal','Store','Top Quality Store','Shipping (quality)','Returns (quality)','Competitive pricing','Website quality','Wallets','Rating','Reviews'];
      const lines: string[] = [headers.join('\t')];
      for (let i = 0; i < sortedRows.length; i++) {
        const row = sortedRows[i];
        const s = row.signals || {};
        const delivery = getAny(s, ['delivery_time','deliveryTime','delivery_estimate']);
        const shipGrade = getAny(s, ['section_grades.shipping','shipping_quality','shippingGrade']);
        const returnWindow = getAny(s, ['return_window','returnWindow','returns_window']);
        const returnsGrade = getAny(s, ['section_grades.returns','returns_quality','returnsGrade']);
        const pricingGrade = getAny(s, ['section_grades.pricing','pricing_quality','pricingGrade']);
        const websiteGrade = getAny(s, ['section_grades.website','website_quality','websiteGrade']);
        const rating = getAny(s, ['store_rating','rating','storeRating']);
        const reviews = getAny(s, ['review_count','reviews','reviewCount']);
        
        const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '';
        
        const values = [
          medal,
          row.domain || '—',
          row.error ? 'Error' : (s?.tqs_badge === true ? 'Yes' : s?.tqs_badge === false ? 'No' : '—'),
          delivery ? `${shipGrade} (${delivery})` : shipGrade,
          returnWindow ? `${returnsGrade} (${returnWindow})` : returnsGrade,
          pricingGrade,
          websiteGrade,
          getAny(s, ['e_wallets','wallets','payment_wallets']),
          String(rating),
          String(reviews),
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
    { m: 'Shipping (quality)', w: 'Overall signal for shipping experience with delivery time shown below.', t: 'Google\'s derived grade per region with delivery estimates.', q: 'Clarify shipping costs, speed, and policies.' },
    { m: 'Returns (quality)', w: 'Overall signal for your returns experience with return window shown below.', t: 'Google\'s derived grade per region with return timeframes.', q: 'Free returns and clear policy improve trust.' },
    { m: 'Competitive pricing', w: 'How your pricing compares to competitors.', t: 'Google\'s derived grade per region.', q: 'Ensure competitive pricing and clear value proposition.' },
    { m: 'Website quality', w: 'Overall website user experience and trust signals.', t: 'Google\'s derived grade per region.', q: 'Improve site speed, mobile experience, and trust signals.' },
    { m: 'Wallets', w: 'Digital wallets available at checkout.', t: 'Detected by Google per region.', q: 'Add popular wallets (e.g., PayPal, Apple Pay).'},
    { m: 'Rating/Reviews', w: 'Aggregate rating and review count.', t: 'Sourced from approved review partners.', q: 'Grow recent, verified reviews.'},
  ] as const;

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Hero */}
      <section className="mx-auto max-w-6xl px-6 pt-16 pb-6 text-center">
        <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl inline-block bg-yellow-100/70 px-3 py-1 rounded-md">
          Compare Google Store Ratings
        </h1>
        <h2 className="mt-6 text-xl font-medium text-slate-700 inline-block bg-green-100/70 px-3 py-1 rounded-md">
          Benchmark Ecommerce Stores by Google’s Public Quality Signals
        </h2>
      </section>


      {/* Inputs */}
      <section className="mx-auto max-w-6xl px-6 pb-8">
        <div className="rounded-2xl border border-slate-200 bg-blue-50/70 p-6 shadow-sm backdrop-blur">
          <p className="mb-5 text-sm text-slate-700 text-center">
            👉 Compare up to five store websites and choose a country. We’ll compare what Google shows on{' '}
            google.com/storepages.
          </p>

          {/* Domains row */}
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-5">
            {domains.map((d, i) => (
              <input
                key={i}
                value={d}
                onChange={(e) => updateDomain(i, e.target.value)}
                placeholder="domain.com"
                className="w-full h-10 rounded-lg border border-slate-200 px-3 text-sm outline-none placeholder:text-slate-400 focus:border-slate-300 focus:ring-2 focus:ring-slate-200"
              />
            ))}
          </div>

          {/* Controls */}
          <div className="mt-4 flex flex-col items-center gap-2 sm:flex-row sm:justify-center sm:gap-3">
            <label className="text-sm text-slate-700 sm:mr-2" htmlFor="country-select">Select Country:</label>
            <select
              id="country-select"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className="h-10 w-full sm:w-48 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-200"
              aria-label="Country"
            >
              <option value="US">United States</option>
              <option value="GB">United Kingdom</option>
              <option value="AU">Australia</option>
              <option value="CA">Canada</option>
              <option value="IE">Ireland</option>
              <option value="NZ">New Zealand</option>
              <option value="DE">Germany</option>
              <option value="FR">France</option>
            </select>

            <button
              onClick={compare}
              disabled={loading}
              className="inline-flex h-10 w-full sm:w-48 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold text-white shadow-sm bg-emerald-600 hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
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
      </section>
    {/* Results */}
      {hasCompared && (
        <section className="mx-auto max-w-6xl px-6 pb-12">
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-[1000px] w-full table-fixed text-left">
                <thead className="text-sm text-slate-600" style={{ backgroundColor: '#fef9c3b3' }}>
                  <tr className="[&>th]:px-2 [&>th]:py-4 [&>th]:align-middle">
                    <th className="w-[4%] text-center"></th>
                    <th className="w-[18%] text-left">Store</th>
                    <th className="w-[6%] text-center">Top Quality Store</th>
                    <th className="w-[11%] text-center">Shipping (quality)</th>
                    <th className="w-[11%] text-center">Returns (quality)</th>
                    <th className="w-[9%] text-center">Competitive pricing</th>
                    <th className="w-[9%] text-center">Website quality</th>
                    <th className="w-[9%] text-center">Wallets</th>
                    <th className="w-[6%] text-center">Rating</th>
                    <th className="w-[7%] text-center">Reviews</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm text-slate-800">
                  {sortedRows.length === 0 && (
                    <tr>
                      <td colSpan={10} className="px-4 py-10 text-center text-slate-500">
                        {loading ? 'Fetching signals…' : 'No results yet.'}
                      </td>
                    </tr>
                  )}
                  {sortedRows.map((row, i) => {
                    const s: Signals = row.signals || {};
                    const tqs = s?.tqs_badge;
                    const delivery = getAny(s, ['delivery_time','deliveryTime','delivery_estimate']);
                    const shipGrade = getAny(s, ['section_grades.shipping','shipping_quality','shippingGrade']);
                    const returnWindow = getAny(s, ['return_window','returnWindow','returns_window']);
                    const returnsGrade = getAny(s, ['section_grades.returns','returns_quality','returnsGrade']);
                    const pricingGrade = getAny(s, ['section_grades.pricing','pricing_quality','pricingGrade']);
                    const websiteGrade = getAny(s, ['section_grades.website','website_quality','websiteGrade']);
                    const wallets = getAny(s, ['e_wallets','wallets','payment_wallets']);
                    const rating = getAny(s, ['store_rating','rating','storeRating']);
                    const reviews = getAny(s, ['review_count','reviews','reviewCount']);

                    const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '';
                    
                    return (
                      <tr key={i} className="[&>td]:px-2 [&>td]:py-4 [&>td]:align-middle hover:bg-slate-50 transition-colors">
                        <td className="text-center text-lg" aria-label={i === 0 ? 'gold medal' : i === 1 ? 'silver medal' : i === 2 ? 'bronze medal' : 'no medal'}>
                          {medal}
                        </td>
                        <td className="flex items-center gap-2 pr-1">
                          <div className="h-10 w-10 overflow-hidden rounded-lg ring-1 ring-slate-200 bg-white">
                            {s?.logo_url ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={s.logo_url} alt="" className="h-full w-full object-cover" />
                            ) : (
                              <div className="h-full w-full bg-slate-100" />
                            )}
                          </div>
                          <div className="leading-5">
                            <div className="font-medium text-slate-900 text-base flex items-center gap-1">
                              {row.domain}
                              <a
                                href={validationUrl(row.domain, row.country)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center rounded border border-slate-200 bg-white px-1 py-0.5 text-xs text-slate-600 hover:bg-slate-50 hover:text-slate-800 transition"
                                title="Open source URL"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-3 w-3">
                                  <path d="M12.5 2a.75.75 0 0 0 0 1.5h2.69l-5.72 5.72a.75.75 0 1 0 1.06 1.06l5.72-5.72V7.5a.75.75 0 0 0 1.5 0V2.75A.75.75 0 0 0 16.75 2h-4.25ZM4.25 4.5A2.25 2.25 0 0 0 2 6.75v8.5A2.25 2.25 0 0 0 4.25 17.5h8.5A2.25 2.25 0 0 0 15 15.25V11a.75.75 0 0 0-1.5 0v4.25a.75.75 0 0 1-.75.75h-8.5a.75.75 0 0 1-.75-.75v-8.5a.75.75 0 0 1 .75-.75H9a.75.75 0 0 0 0-1.5H4.25Z" />
                                </svg>
                              </a>
                            </div>
                          </div>
                        </td>
                        <td className="text-center">
                          {row.error
                            ? badge('Error', 'red')
                            : tqs === true
                              ? badge('Yes', 'green')
                              : tqs === false
                                ? badge('No', 'red')
                                : badge('—', 'slate')}
                        </td>
                        <td className="text-center">
                          <div className="flex flex-col items-center gap-1">
                            {badge(shipGrade, qualityTone(shipGrade))}
                            {delivery && (
                              <div className="text-xs text-slate-500 tabular-nums">
                                {delivery}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="text-center">
                          <div className="flex flex-col items-center gap-1">
                            {badge(returnsGrade, qualityTone(returnsGrade))}
                            {returnWindow && (
                              <div className="text-xs text-slate-500 tabular-nums">
                                {returnWindow}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="text-center">{badge(pricingGrade, qualityTone(pricingGrade))}</td>
                        <td className="text-center">{badge(websiteGrade, qualityTone(websiteGrade))}</td>
                        <td className="text-center">{renderWalletPills(wallets)}</td>
                        <td className="text-center tabular-nums font-medium text-emerald-700">{rating}</td>
                        <td className="text-center tabular-nums">{reviews}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Copy button under table, centered */}
          <div className="pt-4 flex justify-center">
            <button
              onClick={copyResults}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 active:translate-y-px"
              aria-label="Copy table results"
              title="Copy table results"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path d="M6 2.75A1.75 1.75 0 0 1 7.75 1h6.5C15.216 1 16 1.784 16 2.75v6.5A1.75 1.75 0 0 1 14.25 11h-6.5A1.75 1.75 0 0 1 12 9.25v-6.5Z" />
                <path d="M3.75 5A1.75 1.75 0 0 0 2 6.75v8.5C2 16.216 2.784 17 3.75 17h8.5A1.75 1.75 0 0 0 14 15.25V14H7.75A1.75 1.75 0 0 1 6 12.25V6H3.75Z" />
              </svg>
              {copied ? 'Copied!' : 'Copy Results'}
            </button>
          </div>
        </section>
      )}

      {/* TSQ Scoring Explanation */}
      <section className="mx-auto max-w-6xl px-6 pb-10">
        <div className="text-center mb-6">
          <h2 className="inline-block text-xl sm:text-2xl font-semibold text-slate-800 bg-blue-100/70 px-3 py-1 rounded-md">
            How Are These Scores Calculated?
          </h2>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="px-6 py-8">
            <div className="prose prose-slate max-w-none">
              <p className="text-slate-700 mb-4">
                These are <strong>crude scores</strong> designed to provide a quick comparison between stores based on Google's public quality signals. 
                The TSQ (Trust & Quality) scoring system uses a weighted approach to evaluate store performance across key metrics.
              </p>
              
              <h3 className="text-lg font-semibold text-slate-800 mb-3">Scoring Breakdown:</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="space-y-3">
                  <div className="flex justify-between items-center py-2 px-3 bg-slate-50 rounded-lg">
                    <span className="font-medium text-slate-700">Returns Quality</span>
                    <span className="text-slate-600 font-mono">30%</span>
                  </div>
                  <div className="flex justify-between items-center py-2 px-3 bg-slate-50 rounded-lg">
                    <span className="font-medium text-slate-700">Shipping Quality</span>
                    <span className="text-slate-600 font-mono">25%</span>
                  </div>
                  <div className="flex justify-between items-center py-2 px-3 bg-slate-50 rounded-lg">
                    <span className="font-medium text-slate-700">Competitive Pricing</span>
                    <span className="text-slate-600 font-mono">25%</span>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between items-center py-2 px-3 bg-slate-50 rounded-lg">
                    <span className="font-medium text-slate-700">Website Quality</span>
                    <span className="text-slate-600 font-mono">10%</span>
                  </div>
                  <div className="flex justify-between items-center py-2 px-3 bg-slate-50 rounded-lg">
                    <span className="font-medium text-slate-700">Payment Wallets</span>
                    <span className="text-slate-600 font-mono">5%</span>
                  </div>
                  <div className="flex justify-between items-center py-2 px-3 bg-slate-50 rounded-lg">
                    <span className="font-medium text-slate-700">Trust Score</span>
                    <span className="text-slate-600 font-mono">5%</span>
                  </div>
                </div>
              </div>

              <h3 className="text-lg font-semibold text-slate-800 mb-3">Grade Values:</h3>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
                <div className="text-center py-2 px-3 bg-green-50 rounded-lg border border-green-200">
                  <div className="font-semibold text-green-800">Exceptional</div>
                  <div className="text-sm text-green-600">100 points</div>
                </div>
                <div className="text-center py-2 px-3 bg-green-50 rounded-lg border border-green-200">
                  <div className="font-semibold text-green-800">Great</div>
                  <div className="text-sm text-green-600">85 points</div>
                </div>
                <div className="text-center py-2 px-3 bg-yellow-50 rounded-lg border border-yellow-200">
                  <div className="font-semibold text-yellow-800">Good</div>
                  <div className="text-sm text-yellow-600">70 points</div>
                </div>
                <div className="text-center py-2 px-3 bg-orange-50 rounded-lg border border-orange-200">
                  <div className="font-semibold text-orange-800">Fair</div>
                  <div className="text-sm text-orange-600">40 points</div>
                </div>
                <div className="text-center py-2 px-3 bg-red-50 rounded-lg border border-red-200">
                  <div className="font-semibold text-red-800">Poor</div>
                  <div className="text-sm text-red-600">20 points</div>
                </div>
              </div>

              <h3 className="text-lg font-semibold text-slate-800 mb-3">Bonuses:</h3>
              <ul className="list-disc list-inside text-slate-700 space-y-2 mb-4">
                <li><strong>Return Window Bonus:</strong> +5 points for 30+ days, +3 points for 28+ days</li>
                <li><strong>Top Quality Store Badge:</strong> +5 points</li>
                <li><strong>Payment Wallets:</strong> Scored based on unique wallet count (max 3 wallets = 100%)</li>
                <li><strong>Trust Score:</strong> Normalized from 0-100 (e.g., 85/100 = 85% of 5 points)</li>
              </ul>

              <p className="text-sm text-slate-600 italic">
                Final scores are capped at 100 points and rounded to the nearest integer. 
                Stores are ranked by TSQ score, with tie-breakers based on competitive pricing, returns quality, shipping quality, and wallet count.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Explainer */}
      <section className="mx-auto max-w-6xl px-6 pb-10">
        <div className="text-center mb-6">
          <h2 className="inline-block text-xl sm:text-2xl font-semibold text-slate-800 bg-green-100/70 px-3 py-1 rounded-md">
            How Google Might Interpret These Signals?
          </h2>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-sm text-slate-600">
                <tr className="[&>th]:px-4 [&>th]:py-3 [&>th]:align-middle text-left">
                  <th className="w-[20%] text-left">Signal</th>
                  <th className="w-[26%] text-left">What it means</th>
                  <th className="w-[27%] text-left">How it’s measured</th>
                  <th className="w-[27%] text-left">Quick wins</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {EXPLAINER.map((r, idx) => (
                  <tr key={idx} className="odd:bg-slate-50/40 [&>td]:align-middle [&>td]:px-4 [&>td]:py-3">
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

      {/* FAQs + schema */}
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
