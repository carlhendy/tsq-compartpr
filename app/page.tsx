'use client';

import { useState, useRef } from 'react';


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

// Quick Start Categories
type CategoryKey = 'Fashion' | 'Cosmetics' | 'Sports & Fitness' | 'Furniture' | 'Electronics' | 'Home & Garden';
type CountryKey = 'UK' | 'US' | 'AU';

// Helper function to get favicon URL using a proxy service
const getFaviconUrl = (domain: string) => {
  // Use Google's favicon service which is reliable and cached
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
};

// Special handling for domains that might have favicon issues
const getFaviconUrlWithFallback = (domain: string) => {
  // For specific domains that might have issues, try multiple approaches
  if (domain === 'chemistwarehouse.com.au') {
    // Try with www prefix first
    return `https://www.google.com/s2/favicons?domain=www.${domain}&sz=32&t=1`;
  }
  if (domain === 'bhphotovideo.com') {
    // Try with www prefix for B&H
    return `https://www.google.com/s2/favicons?domain=www.${domain}&sz=32&t=1`;
  }
  return getFaviconUrl(domain);
};

// Helper function for results table favicons (larger size)
const getResultsFaviconUrl = (domain: string) => {
  // Special handling for domains that might have favicon issues
  if (domain === 'chemistwarehouse.com.au') {
    return `https://www.google.com/s2/favicons?domain=www.${domain}&sz=64&t=1`;
  }
  if (domain === 'bhphotovideo.com') {
    return `https://www.google.com/s2/favicons?domain=www.${domain}&sz=64&t=1`;
  }
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
};

const QUICK_START_CATEGORIES: Record<CountryKey, Record<CategoryKey, string[]>> = {
  'UK': {
    'Fashion': ['asos.com', 'next.co.uk', 'riverisland.com', 'boohoo.com', 'newlook.com'],
    'Cosmetics': ['boots.com', 'superdrug.com', 'lookfantastic.com', 'cultbeauty.com', 'sephora.co.uk'],
    'Sports & Fitness': ['sportsdirect.com', 'decathlon.co.uk', 'jdsports.co.uk', 'mountainwarehouse.com', 'gymshark.com'],
    'Furniture': ['ikea.com', 'wayfair.co.uk', 'dunelm.com', 'argos.co.uk', 'bensonsforbeds.co.uk'],
    'Electronics': ['currys.co.uk', 'argos.co.uk', 'johnlewis.com', 'very.co.uk', 'ao.com'],
    'Home & Garden': ['diy.com', 'homebase.co.uk', 'wickes.co.uk', 'screwfix.com', 'toolstation.com']
  },
  'US': {
    'Fashion': ['nordstrom.com', 'macys.com', 'gap.com', 'urbanoutfitters.com', 'zara.com'],
    'Cosmetics': ['sephora.com', 'ulta.com', 'fentybeauty.com', 'beautylish.com', 'glossier.com'],
    'Sports & Fitness': ['dickssportinggoods.com', 'academy.com', 'rei.com', 'nike.com', 'adidas.com'],
    'Furniture': ['wayfair.com', 'westelm.com', 'crateandbarrel.com', 'potterybarn.com', 'ikea.com'],
    'Electronics': ['bestbuy.com', 'amazon.com', 'newegg.com', 'microcenter.com', 'bhphotovideo.com'],
    'Home & Garden': ['homedepot.com', 'lowes.com', 'menards.com', 'acehardware.com', 'harborfreight.com']
  },
  'AU': {
    'Fashion': ['theiconic.com.au', 'cottonon.com', 'countryroad.com.au', 'seedheritage.com', 'witchery.com.au'],
    'Cosmetics': ['priceline.com.au', 'chemistwarehouse.com.au', 'mecca.com.au', 'adorebeauty.com.au', 'sephora.com.au'],
    'Sports & Fitness': ['rebelsport.com.au', 'decathlon.com.au', 'anacondastores.com', 'intersport.com.au', 'adidas.com.au'],
    'Furniture': ['freedom.com.au', 'fantasticfurniture.com.au', 'harveynorman.com.au', 'nickscali.com.au', 'domayne.com.au'],
    'Electronics': ['harveynorman.com.au', 'jbhifi.com.au', 'officeworks.com.au', 'bigw.com.au', 'target.com.au'],
    'Home & Garden': ['bunnings.com.au', 'homehardware.com.au', 'mitre10.com.au', 'totaltools.com.au', 'sydneytools.com.au']
  }
};

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
  const returnsScore = levelScore(signals.section_grades?.returns) * 25;
  const shippingScore = levelScore(signals.section_grades?.shipping) * 20;
  const pricingScore = levelScore(signals.section_grades?.pricing) * 20;
  const websiteScore = levelScore(signals.section_grades?.website) * 10;
  
  // Wallets score (5% max, based on unique wallet count)
  const wallets = signals.e_wallets || '';
  const uniqueWallets = new Set(
    wallets.split(',').map(w => w.trim()).filter(Boolean)
  );
  const walletsScore = Math.min(uniqueWallets.size / 3, 1.0) * 5;
  
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
  
  // Top Quality Store bonus - MAJOR WEIGHT (15 points)
  if (signals.tqs_badge === true) bonuses += 15;
  
  // Calculate final score
  const totalScore = returnsScore + shippingScore + pricingScore + websiteScore + walletsScore + bonuses;
  
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

// Component to show brand favicons for a category
const CategoryFavicons = ({ brands }: { brands: string[] }) => {
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {brands.map((brand, index) => (
        <div key={brand} className="h-6 w-6 rounded-sm overflow-hidden bg-white">
          <img
            src={getFaviconUrlWithFallback(brand)}
            alt=""
            className="h-full w-full object-cover"
            onError={(e) => {
              const img = e.target as HTMLImageElement;
              // Try alternative favicon services as fallback
              if (img.src.includes('google.com/s2/favicons')) {
                // For Chemist Warehouse, try different domain formats
                if (brand === 'chemistwarehouse.com.au') {
                  img.src = `https://www.google.com/s2/favicons?domain=${brand}&sz=32&t=2`;
                } else {
                  // Try DuckDuckGo favicon service for other domains
                  img.src = `https://icons.duckduckgo.com/ip3/${brand}.ico`;
                }
              } else if (img.src.includes('duckduckgo.com') || (brand === 'chemistwarehouse.com.au' && img.src.includes('google.com/s2/favicons'))) {
                // Try favicon.io service
                img.src = `https://favicons.githubusercontent.com/${brand}`;
              } else if (brand === 'chemistwarehouse.com.au') {
                // Special case for Chemist Warehouse - try direct favicon
                img.src = `https://${brand}/favicon.ico`;
              } else {
                // Final fallback to generic icon
                img.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHZpZXdCb3g9IjAgMCAyMCAyMCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjIwIiBoZWlnaHQ9IjIwIiByeD0iMiIgZmlsbD0iI0YzRjNGNCIvPgo8cGF0aCBkPSJNMTAgNUwxNSAxMEwxMCAxNUw1IDEwTDEwIDVaIiBmaWxsPSIjOUNBM0FGIi8+Cjwvc3ZnPgo=';
              }
            }}
          />
        </div>
      ))}
    </div>
  );
};

/** ---------- Page ---------- */
const EXPLAINER = [
  { m: 'Shipping (quality)', w: 'Overall signal for shipping experience with delivery time shown below.', t: 'Google\'s derived grade per region with delivery estimates.', q: 'Clarify shipping costs, speed, and policies.' },
  { m: 'Returns (quality)', w: 'Overall signal for your returns experience with return window shown below.', t: 'Google\'s derived grade per region with return timeframes.', q: 'Free returns and clear policy improve trust.' },
  { m: 'Competitive pricing', w: 'How your pricing compares to competitors.', t: 'Google\'s derived grade per region.', q: 'Ensure competitive pricing and clear value proposition.' },
  { m: 'Website quality', w: 'Overall website user experience and trust signals.', t: 'Google\'s derived grade per region.', q: 'Improve site speed, mobile experience, and trust signals.' },
  { m: 'Wallets', w: 'Digital wallets available at checkout.', t: 'Detected by Google per region.', q: 'Add popular wallets (e.g., PayPal, Apple Pay).'},
  { m: 'Rating/Reviews', w: 'Aggregate rating and review count.', t: 'Sourced from approved review partners.', q: 'Grow recent, verified reviews.'},
] as const;

export default function Page() {
  const [domains, setDomains] = useState<string[]>(['asos.com', 'boohoo.com', 'next.co.uk']);
  const [country, setCountry] = useState<string>('GB');
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [hasCompared, setHasCompared] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'signals' | 'scoring' | 'faq'>('signals');
  const resultsTableRef = useRef<HTMLDivElement>(null);

  const updateDomain = (i: number, v: string) => {
    const next = [...domains];
    next[i] = v;
    setDomains(next);
  };

  const removeDomain = (i: number) => {
    const next = domains.filter((_, index) => index !== i);
    setDomains(next);
  };

  const addDomain = () => {
    if (domains.length < 5) {
      const newDomains = [...domains, ''];
      setDomains(newDomains);
    }
  };

  const handleQuickStart = (country: CountryKey, category: CategoryKey) => {
    const brands = QUICK_START_CATEGORIES[country][category];
    const countryCode = country === 'UK' ? 'GB' : country;
    
    // Update state
    setDomains(brands);
    setCountry(countryCode);
    
    // Trigger comparison with the new values directly
    compareWithValues(brands, countryCode);
    
    // Scroll to results table if it exists
    if (resultsTableRef.current) {
      resultsTableRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const compareWithValues = async (domainList: string[], countryCode: string) => {
    setLoading(true);
    setHasCompared(true);
    setRows([]);
    const entries = domainList.map((d) => d.trim()).filter(Boolean).slice(0, 5);
    const promises = entries.map(async (d) => {
      try {
        const r = await fetch(`/api/storepage?domain=${encodeURIComponent(d)}&country=${countryCode}`);
        const json = await r.json();
        if (json?.error) return { domain: d, country: countryCode, error: String(json.error) } as Row;
        const payload = json?.signals ?? json?.data ?? json?.payload ?? json;
        return { domain: d, country: countryCode, signals: payload as Signals } as Row;
      } catch (e: any) {
        return { domain: d, country: countryCode, error: e?.message || 'Fetch error' } as Row;
      }
    });
    const res = await Promise.all(promises);
    setRows(res);
    setLoading(false);
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
      const headers = ['Store','Score','Top Quality Store','Shipping (quality)','Returns (quality)','Competitive pricing','Website quality','Wallets','Rating','Reviews'];
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
        const tsqScore = row.signals ? computeTsqScore(row.signals) : 0;
        
        const values = [
          row.domain || '—',
          row.error ? '—' : String(tsqScore),
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

  return (
    <main className="min-h-screen bg-white">
      {/* Hero - Two Column Layout */}
      <section className="pt-4 sm:pt-8 pb-16 px-6" style={{ background: 'linear-gradient(to right, #0a4bf1, #1e40af, #3b82f6)' }}>
        <div className="mx-auto max-w-6xl">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Left Column - Text and Headers */}
            <div className="text-left">
              <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-white sm:text-6xl mb-6 leading-tight">
                <div>Compare <img src="https://www.google.com/images/branding/googlelogo/2x/googlelogo_color_272x92dp.png" alt="Google" className="inline-block h-10 sm:h-16 w-auto mx-1 sm:mx-2" /></div>
                <div>Store Ratings</div>
              </h1>
              <h2 className="text-lg sm:text-2xl font-medium text-white mb-6 max-w-md">
                Benchmark Ecommerce Stores by Google's Public Quality Signals
              </h2>
              <p className="text-white text-sm max-w-md">
                Compare up to five store websites and pick a country. We'll show what Google lists on google.com/storepages.
              </p>
            </div>
            
            {/* Right Column - Input Boxes */}
            <div className="w-full sm:max-w-lg mx-auto lg:mx-0">
              <div className="bg-white p-6 border border-gray-300 rounded-lg shadow-sm">
                {/* Domains - Vertical Stack */}
                <div className="space-y-2 mb-4">
                {domains.map((d, i) => (
                  <div key={i} className="relative">
                    <input
                      value={d}
                      onChange={(e) => updateDomain(i, e.target.value)}
                      placeholder="domain.com"
                      className="w-full h-12 border border-gray-300 px-3 pr-10 text-sm outline-none placeholder:text-gray-400 focus:border-gray-600 focus:ring-0 rounded"
                    />
                    {domains.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeDomain(i)}
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 w-6 h-6 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
                        aria-label="Remove field"
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}
                </div>
                
                {/* Add More Link */}
                {domains.length < 5 && (
                  <div className="text-right mb-4">
                    <button
                      type="button"
                      onClick={addDomain}
                      className="text-sm text-gray-500 hover:text-gray-700 underline"
                    >
                      + Add More
                    </button>
                  </div>
                )}

                {/* Country Selector */}
                <div className="flex items-center gap-3 mb-4">
                  <label className="text-xs text-gray-600 whitespace-nowrap" htmlFor="country-select">Country:</label>
                  <div className="relative flex-1">
                    <select
                      id="country-select"
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                      className="h-12 w-full border border-gray-300 bg-white px-3 pr-6 text-sm text-gray-700 outline-none focus:border-gray-600 focus:ring-0 appearance-none cursor-pointer rounded"
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
                    <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                      <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                </div>

                {/* Compare Button */}
                <button
                  onClick={compare}
                  disabled={loading}
                  className="w-full h-12 px-6 text-white bg-black text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-800 transition-colors rounded"
                >
                  {loading ? 'Comparing...' : 'Compare Stores'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Results */}
      {hasCompared && (
        <section ref={resultsTableRef} className="mx-auto max-w-6xl px-6 pb-12 mt-8">
          <div className="border border-gray-300 bg-white rounded-lg shadow-sm p-2">
            <div className="overflow-x-auto">
              <table className="min-w-[1000px] w-full table-fixed text-left">
                <thead className="text-sm text-black" style={{ backgroundColor: '#e3ff75' }}>
                  <tr className="[&>th]:px-2 [&>th]:py-5 [&>th]:align-middle [&>th]:border-r [&>th]:border-gray-300 [&>th:first-child]:border-r-0 [&>th:last-child]:border-r-0">
                    <th className="w-[16%] text-left">Store</th>
                    <th className="w-[10%] text-center">Score<br/>(out of 100)</th>
                    <th className="w-[10%] text-center">Top Quality Store</th>
                    <th className="w-[10%] text-center">Shipping (quality)</th>
                    <th className="w-[10%] text-center">Returns (quality)</th>
                    <th className="w-[10%] text-center">Competitive pricing</th>
                    <th className="w-[10%] text-center">Website quality</th>
                    <th className="w-[10%] text-center">Wallets</th>
                    <th className="w-[10%] text-center">Rating</th>
                    <th className="w-[10%] text-center">Reviews</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm text-slate-800 bg-white">
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
                    
                    const tsqScore = row.signals ? computeTsqScore(row.signals) : 0;
                    
                    return (
                      <tr key={i} className="[&>td]:px-2 [&>td]:py-5 [&>td]:align-middle hover:bg-gray-50 transition-colors [&>td]:border-r [&>td]:border-gray-300 [&>td:first-child]:border-r-0 [&>td:last-child]:border-r-0">
                        <td className="text-left pl-2 pr-2">
                          <div className="flex items-center gap-2">
                            <div className="h-10 w-10 flex-shrink-0 overflow-hidden bg-white">
                            {s?.logo_url ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img 
                                src={s.logo_url} 
                                alt="" 
                                className="h-full w-full object-cover" 
                                onError={(e) => {
                                  const img = e.target as HTMLImageElement;
                                  // Try our robust favicon service as fallback
                                  img.src = getResultsFaviconUrl(row.domain);
                                }}
                              />
                            ) : (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img 
                                src={getResultsFaviconUrl(row.domain)} 
                                alt="" 
                                className="h-full w-full object-cover"
                                onError={(e) => {
                                  const img = e.target as HTMLImageElement;
                                  // Try alternative favicon services with different approaches
                                  if (img.src.includes('duckduckgo.com')) {
                                    // Try favicon.io service
                                    img.src = `https://favicons.githubusercontent.com/${row.domain}`;
                                  } else if (img.src.includes('favicons.githubusercontent.com')) {
                                    // Try direct favicon from website
                                    img.src = `https://${row.domain}/favicon.ico`;
                                  } else if (img.src.includes('google.com/s2/favicons')) {
                                    // Try DuckDuckGo with different domain format
                                    if (row.domain === 'bhphotovideo.com') {
                                      img.src = `https://icons.duckduckgo.com/ip3/www.${row.domain}.ico`;
                                    } else {
                                      img.src = `https://icons.duckduckgo.com/ip3/${row.domain}.ico`;
                                    }
                                  } else {
                                    // Try one more Google service attempt with different parameters
                                    img.src = `https://www.google.com/s2/favicons?domain=${row.domain}&sz=64&t=2`;
                                  }
                                }}
                              />
                            )}
                          </div>
                          <div className="leading-5 min-w-0 flex-1">
                            <div className="font-medium text-black text-xs flex items-center gap-1">
                              <span className="truncate">{row.domain}</span>
                              <a
                                href={validationUrl(row.domain, row.country)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center rounded bg-white px-1 py-0.5 text-xs text-slate-600 hover:bg-slate-50 hover:text-slate-800 transition flex-shrink-0"
                                title="Open source URL"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-3 w-3">
                                  <path d="M12.5 2a.75.75 0 0 0 0 1.5h2.69l-5.72 5.72a.75.75 0 1 0 1.06 1.06l5.72-5.72V7.5a.75.75 0 0 0 1.5 0V2.75A.75.75 0 0 0 16.75 2h-4.25ZM4.25 4.5A2.25 2.25 0 0 0 2 6.75v8.5A2.25 2.25 0 0 0 4.25 17.5h8.5A2.25 2.25 0 0 0 15 15.25V11a.75.75 0 0 0-1.5 0v4.25a.75.75 0 0 1-.75.75h-8.5a.75.75 0 0 1-.75-.75v-8.5a.75.75 0 0 1 .75-.75H9a.75.75 0 0 0 0-1.5H4.25Z" />
                                </svg>
                              </a>
                            </div>
                          </div>
                          </div>
                        </td>
                        <td className="text-center">
                          {row.error ? (
                            badge('Error', 'red')
                          ) : (
                            badge(tsqScore, 
                              tsqScore >= 80 ? 'green' : 
                              tsqScore >= 60 ? 'yellow' : 
                              tsqScore >= 40 ? 'yellow' : 
                              'red'
                            )
                          )}
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
                            {shipGrade && shipGrade !== '—' ? badge(shipGrade, qualityTone(shipGrade)) : null}
                            {delivery && delivery !== '—' && (
                              <div className="text-xs text-slate-500 tabular-nums">
                                {delivery}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="text-center">
                          <div className="flex flex-col items-center gap-1">
                            {returnsGrade && returnsGrade !== '—' ? badge(returnsGrade, qualityTone(returnsGrade)) : null}
                            {returnWindow && returnWindow !== '—' && (
                              <div className="text-xs text-slate-500 tabular-nums">
                                {returnWindow}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="text-center">{badge(pricingGrade, qualityTone(pricingGrade))}</td>
                        <td className="text-center">{badge(websiteGrade, qualityTone(websiteGrade))}</td>
                        <td className="text-center">{renderWalletPills(wallets)}</td>
                        <td className="text-center">
                          {badge(rating, 
                            rating && !isNaN(Number(rating)) ? 
                              Number(rating) >= 4.5 ? 'green' :
                              Number(rating) >= 4.0 ? 'yellow' :
                              Number(rating) >= 3.0 ? 'yellow' :
                              'red' : 'slate'
                          )}
                        </td>
                        <td className="text-center">
                          {badge(reviews, 
                            reviews && !isNaN(Number(reviews)) ? 
                              Number(reviews) >= 1000 ? 'green' :
                              Number(reviews) >= 100 ? 'yellow' :
                              Number(reviews) >= 10 ? 'yellow' :
                              'red' : 'slate'
                          )}
                        </td>
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
              className="inline-flex items-center gap-2 bg-black px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-gray-800 active:translate-y-px"
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

      {/* Quick Start Section */}
      <section className="w-full">
        <div className="bg-gray-100 pt-6 pb-8 px-6">
          <div className="mx-auto max-w-6xl">
            <h2 className="text-lg font-semibold text-black text-center mb-6">Quick Start</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* UK Categories */}
            <fieldset className="border border-gray-300 bg-white rounded-lg shadow-sm relative">
              <legend className="text-lg font-medium text-black px-2 mx-auto">United Kingdom</legend>
              <div className="p-4 space-y-2">
                {Object.keys(QUICK_START_CATEGORIES.UK).map((category) => (
                  <button
                    key={`UK-${category}`}
                    onClick={() => handleQuickStart('UK', category as CategoryKey)}
                    className="w-full flex items-center justify-between gap-2 px-3 py-2 bg-white text-base font-medium text-black hover:bg-gray-100 transition-colors"
                  >
                    <span>{category}</span>
                    <CategoryFavicons brands={QUICK_START_CATEGORIES.UK[category as CategoryKey]} />
                  </button>
                ))}
              </div>
            </fieldset>

            {/* US Categories */}
            <fieldset className="border border-gray-300 bg-white rounded-lg shadow-sm relative">
              <legend className="text-lg font-medium text-black px-2 mx-auto">United States</legend>
              <div className="p-4 space-y-2">
                {Object.keys(QUICK_START_CATEGORIES.US).map((category) => (
                  <button
                    key={`US-${category}`}
                    onClick={() => handleQuickStart('US', category as CategoryKey)}
                    className="w-full flex items-center justify-between gap-2 px-3 py-2 bg-white text-base font-medium text-black hover:bg-gray-100 transition-colors"
                  >
                    <span>{category}</span>
                    <CategoryFavicons brands={QUICK_START_CATEGORIES.US[category as CategoryKey]} />
                  </button>
                ))}
              </div>
            </fieldset>

            {/* AU Categories */}
            <fieldset className="border border-gray-300 bg-white rounded-lg shadow-sm relative">
              <legend className="text-lg font-medium text-black px-2 mx-auto">Australia</legend>
              <div className="p-4 space-y-2">
                {Object.keys(QUICK_START_CATEGORIES.AU).map((category) => (
                  <button
                    key={`AU-${category}`}
                    onClick={() => handleQuickStart('AU', category as CategoryKey)}
                    className="w-full flex items-center justify-between gap-2 px-3 py-2 bg-white text-base font-medium text-black hover:bg-gray-100 transition-colors"
                  >
                    <span>{category}</span>
                    <CategoryFavicons brands={QUICK_START_CATEGORIES.AU[category as CategoryKey]} />
                  </button>
                ))}
              </div>
            </fieldset>
            </div>
          </div>
        </div>
      </section>

      {/* Tabbed Information Section */}
      <section className="mx-auto max-w-6xl px-6 pt-8 pb-16">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left Side - Tab Buttons */}
          <div className="lg:col-span-1">
            <div className="space-y-3">
              <button
                onClick={() => setActiveTab('signals')}
                className={`w-full h-20 p-4 text-left rounded-lg border transition-colors flex items-center ${
                  activeTab === 'signals'
                    ? 'border-blue-500 text-blue-900'
                    : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                }`}
                style={activeTab === 'signals' ? { backgroundColor: '#e3ff75' } : {}}
              >
                <h3 className="font-semibold text-sm">How Google Might Interpret These Signals?</h3>
              </button>
              <button
                onClick={() => setActiveTab('scoring')}
                className={`w-full h-20 p-4 text-left rounded-lg border transition-colors flex items-center ${
                  activeTab === 'scoring'
                    ? 'border-blue-500 bg-blue-50 text-blue-900'
                    : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                <h3 className="font-semibold text-sm">How Are These Scores Calculated?</h3>
              </button>
              <button
                onClick={() => setActiveTab('faq')}
                className={`w-full h-20 p-4 text-left rounded-lg border transition-colors flex items-center ${
                  activeTab === 'faq'
                    ? 'border-blue-500 bg-blue-50 text-blue-900'
                    : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                <h3 className="font-semibold text-sm">Frequently Asked Questions</h3>
              </button>
            </div>
          </div>

          {/* Right Side - Tab Content */}
          <div className="lg:col-span-3">
            <div className="border border-gray-300 bg-white rounded-lg shadow-sm p-2">
              <div className="px-4 py-3 rounded-t-lg" style={{ backgroundColor: '#e3ff75' }}>
                <h3 className="text-lg font-semibold text-black">
                  {activeTab === 'signals' && 'How Google Might Interpret These Signals?'}
                  {activeTab === 'scoring' && 'How Are These Scores Calculated?'}
                  {activeTab === 'faq' && 'Frequently Asked Questions'}
                </h3>
              </div>
              <div className="overflow-x-auto">
                {activeTab === 'signals' && (
                  <table className="min-w-[800px] w-full text-left text-sm">
                    <tbody className="divide-y divide-slate-100">
                      {EXPLAINER.map((r, idx) => (
                        <tr key={idx} className="odd:bg-slate-50/40 [&>td]:align-middle [&>td]:px-2 sm:[&>td]:px-4 [&>td]:py-4 [&>td]:h-16">
                          <td className="font-medium text-slate-900">{r.m}</td>
                          <td className="text-slate-700">{r.w}</td>
                          <td className="text-slate-600">{r.t}</td>
                          <td className="text-slate-600">{r.q}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}

                {activeTab === 'scoring' && (
                  <div className="px-6 py-8">
                    <p className="text-slate-700 mb-4 text-sm">
                      These are <strong>crude scores</strong> designed to provide a quick comparison between stores based on Google's public quality signals. 
                      The TSQ (Trust & Quality) scoring system uses a weighted approach to evaluate store performance across key metrics.
                      Note: Reviews and ratings are displayed but not factored into the TSQ score to avoid over-weighting star ratings when review counts are missing.
                    </p>
                    
                    <h3 className="text-sm font-semibold text-slate-800 mb-3">Scoring Breakdown:</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                      <div className="space-y-3">
                        <div className="flex justify-between items-center py-2 px-3 bg-slate-50 rounded-lg">
                          <span className="font-medium text-slate-700 text-sm">Returns Quality</span>
                          <span className="text-slate-600 font-mono text-sm">25%</span>
                        </div>
                        <div className="flex justify-between items-center py-2 px-3 bg-slate-50 rounded-lg">
                          <span className="font-medium text-slate-700 text-sm">Shipping Quality</span>
                          <span className="text-slate-600 font-mono text-sm">20%</span>
                        </div>
                        <div className="flex justify-between items-center py-2 px-3 bg-slate-50 rounded-lg">
                          <span className="font-medium text-slate-700 text-sm">Competitive Pricing</span>
                          <span className="text-slate-600 font-mono text-sm">20%</span>
                        </div>
                      </div>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center py-2 px-3 bg-slate-50 rounded-lg">
                          <span className="font-medium text-slate-700 text-sm">Website Quality</span>
                          <span className="text-slate-600 font-mono text-sm">10%</span>
                        </div>
                        <div className="flex justify-between items-center py-2 px-3 bg-slate-50 rounded-lg">
                          <span className="font-medium text-slate-700 text-sm">Payment Wallets</span>
                          <span className="text-slate-600 font-mono text-sm">5%</span>
                        </div>
                        <div className="flex justify-between items-center py-2 px-3 bg-slate-50 rounded-lg">
                          <span className="font-medium text-slate-700 text-sm">Top Quality Store Badge</span>
                          <span className="text-slate-600 font-mono text-sm">15%</span>
                        </div>
                      </div>
                    </div>

                    <h3 className="text-sm font-semibold text-slate-800 mb-3">Grade Values:</h3>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
                      <div className="text-center py-2 px-3 bg-green-50 rounded-lg border border-green-200">
                        <div className="font-semibold text-green-800 text-sm">Exceptional</div>
                        <div className="text-xs text-green-600">100 points</div>
                      </div>
                      <div className="text-center py-2 px-3 bg-green-50 rounded-lg border border-green-200">
                        <div className="font-semibold text-green-800 text-sm">Great</div>
                        <div className="text-xs text-green-600">85 points</div>
                      </div>
                      <div className="text-center py-2 px-3 bg-yellow-50 rounded-lg border border-yellow-200">
                        <div className="font-semibold text-yellow-800 text-sm">Good</div>
                        <div className="text-xs text-yellow-600">70 points</div>
                      </div>
                      <div className="text-center py-2 px-3 bg-orange-50 rounded-lg border border-orange-200">
                        <div className="font-semibold text-orange-800 text-sm">Fair</div>
                        <div className="text-xs text-orange-600">40 points</div>
                      </div>
                      <div className="text-center py-2 px-3 bg-red-50 rounded-lg border border-red-200">
                        <div className="font-semibold text-red-800 text-sm">Poor</div>
                        <div className="text-xs text-red-600">20 points</div>
                      </div>
                    </div>

                    <h3 className="text-sm font-semibold text-slate-800 mb-3">Bonuses:</h3>
                    <ul className="list-disc list-inside text-slate-700 space-y-2 mb-4 text-sm">
                      <li><strong>Return Window Bonus:</strong> +5 points for 30+ days, +3 points for 28+ days</li>
                      <li><strong>Top Quality Store Badge:</strong> +15 points (major weighting)</li>
                      <li><strong>Payment Wallets:</strong> Scored based on unique wallet count (max 3 wallets = 100%)</li>
                    </ul>

                    <p className="text-xs text-slate-600 italic">
                      Final scores are capped at 100 points and rounded to the nearest integer. 
                      Stores are ranked by TSQ score, with tie-breakers based on competitive pricing, returns quality, shipping quality, and wallet count.
                    </p>
                  </div>
                )}

                {activeTab === 'faq' && (
                  <div className="divide-y divide-slate-100">
                    <div className="px-5 py-4">
                      <h3 className="font-medium text-slate-900">Where do these signals come from?</h3>
                      <p className="mt-1 text-sm text-slate-600">
                        From Google's public <span className="font-mono">storepages</span> surface for each domain and region. We don't scrape private data or guess values.
                      </p>
                    </div>
                    <div className="px-5 py-4">
                      <h3 className="font-medium text-slate-900">What does "Top Quality Store" mean?</h3>
                      <p className="mt-1 text-sm text-slate-600">
                        It's Google's badge indicating strong trust/quality across core commerce signals (shipping, returns, reviews, policy clarity, payments, etc.).
                      </p>
                    </div>
                    <div className="px-5 py-4">
                      <h3 className="font-medium text-slate-900">How often are results updated?</h3>
                      <p className="mt-1 text-sm text-slate-600">
                        Whenever you click Compare we fetch fresh data. Google's public indicators may change at any time.
                      </p>
                    </div>
                    <div className="px-5 py-4">
                      <h3 className="font-medium text-slate-900">Why don't I see all wallets or grades for my store?</h3>
                      <p className="mt-1 text-sm text-slate-600">
                        Some signals are only shown by Google in certain regions or for eligible stores. If Google doesn't show it, we display a dash (—).
                      </p>
                    </div>
                    <div className="px-5 py-4">
                      <h3 className="font-medium text-slate-900">Can I export the results?</h3>
                      <p className="mt-1 text-sm text-slate-600">
                        You can copy the table using the "Copy results" button and paste into a spreadsheet. CSV export is on the roadmap.
                      </p>
                    </div>
                    <div className="px-5 py-4">
                      <h3 className="font-medium text-slate-900">Why does a store have a rating but no review count?</h3>
                      <p className="mt-1 text-sm text-slate-600">
                        Because Google can show a seller rating based on a longer time period, but usually needs around 10 recent reviews before showing a review count.
                      </p>
                    </div>
                    <div className="px-5 py-4">
                      <h3 className="font-medium text-slate-900">How do we collect and display the quality signals for store websites from google.com/storepages?</h3>
                      <p className="mt-1 text-sm text-slate-600">
                        We query <span className="font-mono">google.com/storepages</span> for each domain (per region) via a US‑based serverless API. Displayed "quality" grades
                        (Exceptional/Great/Good/etc.) are Google's public indicators on the Store page.
                      </p>
                    </div>
                  </div>
                )}
              </div>
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
                  "acceptedAnswer": { "@type": "Answer", "text": "From Google's public storepages surface for each domain and region. We don't scrape private data or guess values." }
                },
                {
                  "@type": "Question",
                  "name": "What does \"Top Quality Store\" mean?",
                  "acceptedAnswer": { "@type": "Answer", "text": "It's Google's badge indicating strong trust/quality across core commerce signals (shipping, returns, reviews, policy clarity, payments, etc.)." }
                },
                {
                  "@type": "Question",
                  "name": "How often are results updated?",
                  "acceptedAnswer": { "@type": "Answer", "text": "Whenever you click Compare we fetch fresh data. Google's public indicators may change at any time." }
                },
                {
                  "@type": "Question",
                  "name": "Why don't I see all wallets or grades for my store?",
                  "acceptedAnswer": { "@type": "Answer", "text": "Some signals are only shown by Google in certain regions or for eligible stores. If Google doesn't show it, we display a dash (—)." }
                },
                {
                  "@type": "Question",
                  "name": "Can I export the results?",
                  "acceptedAnswer": { "@type": "Answer", "text": "You can copy the table using the \"Copy results\" button and paste into a spreadsheet. CSV export is on the roadmap." }
                },
                {
                  "@type": "Question",
                  "name": "Why does a store have a rating but no review count?",
                  "acceptedAnswer": { "@type": "Answer", "text": "Because Google can show a seller rating based on a longer time period, but usually needs around 10 recent reviews before showing a review count." }
                },
                {
                  "@type": "Question",
                  "name": "How do we collect and display the quality signals for store websites from google.com/storepages?",
                  "acceptedAnswer": { "@type": "Answer", "text": "We query google.com/storepages for each domain (per region) via a US‑based serverless API. Displayed \"quality\" grades (Exceptional/Great/Good/etc.) are Google's public indicators on the Store page." }
                }
              ]
            })
          }}
        />
      </section>

      {/* Footer */}
      <footer className="border-t border-black py-16 px-4 sm:px-6 text-center text-white" style={{ background: 'linear-gradient(to right, #0a4bf1, #1e40af, #3b82f6)' }}>
        <div className="mb-4 text-base">
          <div>
            Badly vibe coded by{' '}
            <a href="https://carlhendy.com" target="_blank" rel="noreferrer" className="text-white underline hover:no-underline font-normal inline-block">
              Carl Hendy
            </a>
            {' '}founder of{' '}
            <a href="https://audits.com" target="_blank" rel="noreferrer" className="text-white underline hover:no-underline font-normal inline-block">
              Audits.com
            </a>.
          </div>
        </div>
        <p className="mx-auto max-w-3xl text-sm text-white">
          Disclaimer: This is a non‑profit, non‑commercial demo. Ratings, review counts and quality grades are displayed from Google's public
          <span className="font-mono"> storepages </span> surface (per region) and may change at any time. This site is not affiliated with Google.
        </p>
      </footer>
    </main>
  );
}
