'use client';

import { useState, useRef, useEffect } from 'react';


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

// Helper function to get high-quality square logos
const getFaviconUrl = (domain: string) => {
  // Special case: use toolstation.nl logo for toolstation.com
  if (domain === 'toolstation.com') {
    return `https://logo.clearbit.com/toolstation.nl`;
  }
  // Use Clearbit Logo API for high-quality square logos
  return `https://logo.clearbit.com/${domain}`;
};

// Special handling for domains that might have logo issues
const getFaviconUrlWithFallback = (domain: string) => {
  // Try Clearbit first, then fallback to Google favicons
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
  if (g.startsWith('exception')) return 'green-light';
  if (g.startsWith('great')) return 'green';
  if (g.startsWith('good') || g.startsWith('fair')) return 'yellow';
  return 'red';
};

const badge = (label: string | number, tone: 'green'|'green-light'|'yellow'|'red'|'slate' = 'slate') => {
  const toneMap: Record<string, string> = {
    green: 'bg-green-50 text-green-700 ring-green-600/20',
    'green-light': 'bg-green-100 text-green-600 ring-green-500/20',
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
const CategoryFavicons = ({ brands, country, onBrandClick }: { 
  brands: string[], 
  country: CountryKey, 
  onBrandClick: (brand: string, country: CountryKey) => void 
}) => {
  return (
    <div className="flex items-center gap-3 sm:gap-5 flex-wrap justify-center">
      {brands.map((brand, index) => (
        <div 
          key={brand} 
          className="h-16 w-16 sm:h-20 sm:w-20 lg:h-24 lg:w-24 rounded-lg overflow-hidden bg-white shadow-sm border border-gray-200 flex items-center justify-center cursor-pointer hover:shadow-md transition-shadow duration-200"
          onClick={() => onBrandClick(brand, country)}
          title={`Click to analyze ${brand}`}
        >
          <img
            src={getFaviconUrlWithFallback(brand)}
            alt={brand}
            className="h-full w-full object-contain"
            onLoad={() => console.log(`Logo loaded for ${brand}`)}
            onError={(e) => {
              const img = e.target as HTMLImageElement;
              console.log(`Logo failed for ${brand}, trying fallback`);
              // Fallback chain: Clearbit -> Google Favicons -> DuckDuckGo -> Generic
              if (img.src.includes('logo.clearbit.com')) {
                // Try Google favicons as fallback
                img.src = `https://www.google.com/s2/favicons?domain=${brand}&sz=64`;
              } else if (img.src.includes('google.com/s2/favicons')) {
                // Try DuckDuckGo as fallback
                img.src = `https://icons.duckduckgo.com/ip3/${brand}.ico`;
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
  const [selectedCountry, setSelectedCountry] = useState<CountryKey>('UK');
  const [showAboutSlider, setShowAboutSlider] = useState<boolean>(false);
  const resultsTableRef = useRef<HTMLDivElement>(null);
  const aboutButtonRef = useRef<HTMLButtonElement>(null);

  // Move about button to header and set up event listeners
  useEffect(() => {
    const placeholder = document.getElementById('about-button-placeholder');
    if (placeholder && aboutButtonRef.current) {
      placeholder.appendChild(aboutButtonRef.current);
    }
  }, []);

  const handleStartAgain = () => {
    setDomains(['asos.com', 'boohoo.com', 'next.co.uk']);
    setCountry('GB');
    setRows([]);
    setLoading(false);
    setHasCompared(false);
    setCopied(false);
    setSelectedCountry('UK');
    setActiveTab('signals');
    
    // Scroll to the "Now Create Your Own" section
    setTimeout(() => {
      const element = document.getElementById('now-create-your-own');
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  };


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

  const handleBrandClick = (brand: string, country: CountryKey) => {
    // Get the category for this country
    const category = country === 'UK' ? 'Home & Garden' :
                    country === 'US' ? 'Fashion' : 'Electronics';
    
    // Run the full category report (same as clicking the Compare button)
    handleQuickStart(country, category);
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
    <>
      {/* About Button - will be moved to header */}
      <button 
        ref={aboutButtonRef}
        onClick={() => setShowAboutSlider(true)}
        className="bg-black text-white px-4 py-2 rounded-md text-sm font-semibold hover:bg-gray-800 transition-colors tracking-wide" 
        style={{ fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}
      >
        about
      </button>

    <main className="min-h-screen bg-gray-100">
      {/* Hero - Centered Layout */}
      <section className="pt-12 sm:pt-16 pb-16 px-6 bg-gray-100">
        <div className="mx-auto max-w-4xl">
          {/* Centered Text Content */}
          <div className="text-center mb-12">
            <h1 className="text-black mb-3 leading-tight text-4xl sm:text-6xl tracking-tight font-black" style={{ fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', lineHeight: '1.1', fontWeight: '900' }}>
              World's Most Advanced<br />
              Google Store Ratings Tool
            </h1>
            <p className="text-sm text-gray-600 mb-8" style={{ fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
              (And only)
            </p>
          </div>
          
          {/* Quick Start Section */}
          <div className="mb-8">
            <div className="pt-0 pb-12 px-6">
              <div className="mx-auto max-w-6xl">
                
                {/* Examples, Flags, and Logos Container */}
                <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-4 sm:p-6 mb-1 max-w-2xl mx-auto">
                  {/* Examples and Flags Row */}
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6 mb-6">
                    {/* Examples Text */}
                    <div className="flex items-center">
                      <span className="text-black font-semibold tracking-wide text-sm sm:text-base" style={{ fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>Click on any of the examples:</span>
                    </div>

                    {/* Flags Row */}
                    <div className="flex items-center gap-2 sm:gap-3">
                      <button
                        onClick={() => setSelectedCountry('UK')}
                        className={`h-10 sm:h-12 px-2 sm:px-3 text-left transition-colors flex items-center gap-1 sm:gap-2 ${
                          selectedCountry === 'UK'
                            ? 'border-b-2 border-b-black text-black'
                            : 'text-gray-700 hover:text-black hover:border-b-2 hover:border-b-black'
                        }`}
                      >
                        <span className="text-base sm:text-lg">🇬🇧</span>
                        <span className="font-semibold text-xs sm:text-sm">UK</span>
                      </button>
                      <button
                        onClick={() => setSelectedCountry('US')}
                        className={`h-10 sm:h-12 px-2 sm:px-3 text-left transition-colors flex items-center gap-1 sm:gap-2 ${
                          selectedCountry === 'US'
                            ? 'border-b-2 border-b-black text-black'
                            : 'text-gray-700 hover:text-black hover:border-b-2 hover:border-b-black'
                        }`}
                      >
                        <span className="text-base sm:text-lg">🇺🇸</span>
                        <span className="font-semibold text-xs sm:text-sm">USA</span>
                      </button>
                      <button
                        onClick={() => setSelectedCountry('AU')}
                        className={`h-10 sm:h-12 px-2 sm:px-3 text-left transition-colors flex items-center gap-1 sm:gap-2 ${
                          selectedCountry === 'AU'
                            ? 'border-b-2 border-b-black text-black'
                            : 'text-gray-700 hover:text-black hover:border-b-2 hover:border-b-black'
                        }`}
                      >
                        <span className="text-base sm:text-lg">🇦🇺</span>
                        <span className="font-semibold text-xs sm:text-sm">AU</span>
                      </button>
                    </div>
                  </div>

                  {/* Logos Row */}
                  <div className="flex items-center justify-center">
                    <CategoryFavicons 
                      brands={
                        selectedCountry === 'UK' ? QUICK_START_CATEGORIES.UK['Home & Garden'] :
                        selectedCountry === 'US' ? QUICK_START_CATEGORIES.US['Fashion'] :
                        QUICK_START_CATEGORIES.AU['Electronics']
                      }
                      country={selectedCountry}
                      onBrandClick={handleBrandClick}
                    />
                  </div>
                </div>

              </div>
            </div>

          </div>
          
          {/* Why Care About Google Store Ratings header */}
          <div className="mb-3 text-center">
            <h1 className="text-2xl sm:text-3xl text-black font-black tracking-tight" style={{ fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', fontWeight: '900' }}>
              Why Care About Google Store Ratings?
            </h1>
          </div>
          
          {/* Stats Section */}
          <div className="mb-8">
            <div className="max-w-4xl mx-auto px-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                {/* Text Column */}
                <div className="flex justify-center md:justify-start">
                  <div style={{
                    textAlign: 'center',
                    padding: '1.5rem',
                    border: '1px solid #ddd',
                    borderRadius: '12px',
                    background: '#fff',
                    maxWidth: '400px',
                    margin: '2rem auto'
                  }}>
                    <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>8% Increase in Sales</div>
                    <p style={{ margin: '0.5rem 0' }}>
                      Businesses using the Top Quality Store widget saw this lift.
                    </p>
                    <div style={{ fontSize: '0.85rem', color: '#666' }}>Google, September 25</div>
                  </div>
                </div>
                
                {/* Image Column */}
                <div className="flex justify-center md:justify-end">
                  <img 
                    src="/top-quality-store-widget-embedded.gif" 
                    alt="Widget Preview" 
                    className="max-w-full h-auto rounded-lg shadow-sm"
                  />
                </div>
              </div>
            </div>
          </div>
          
          {/* Now Create Your Own section */}
          <div id="now-create-your-own" className="mb-6 text-center">
            <div className="flex items-start justify-center gap-4 mb-4">
              <span className="text-2xl mt-2" style={{transform: 'scaleX(-1)'}}>⤵</span>
              <h1 className="text-2xl sm:text-3xl text-black font-black tracking-tight" style={{ fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', fontWeight: '900' }}>
                Now Create Your Own
              </h1>
              <span className="text-2xl mt-2">⤵</span>
            </div>
            <h2 className="text-lg sm:text-xl text-black max-w-lg mx-auto tracking-wide font-bold" style={{ fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', lineHeight: '1.4', fontWeight: '700' }}>
              Compare up to five ecommerce sites in your country and see their Google store ratings.
            </h2>
          </div>
          
          {/* Centered Input Boxes */}
          <div className="w-full max-w-lg mx-auto">
            <div className="bg-white p-4 sm:p-6 border border-gray-300 rounded-lg shadow-sm">
              {/* Domains - Vertical Stack */}
              <div className="space-y-3 mb-4">
                {domains.map((d, i) => (
                  <div key={i} className="relative">
                    <input
                      type="text"
                      value={d}
                      onChange={(e) => updateDomain(i, e.target.value)}
                      placeholder="domain.com"
                      className="w-full h-12 sm:h-14 border border-gray-300 px-3 pr-10 text-sm sm:text-base outline-none placeholder:text-gray-400 focus:border-gray-600 focus:ring-0 rounded"
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
                  <label className="text-xs sm:text-sm text-gray-600 whitespace-nowrap" htmlFor="country-select">Country:</label>
                  <div className="relative flex-1">
                    <select
                      id="country-select"
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                      className="h-12 sm:h-14 w-full border border-gray-300 bg-white px-3 pr-6 text-sm sm:text-base text-gray-700 outline-none focus:border-gray-600 focus:ring-0 appearance-none cursor-pointer rounded"
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
                  className="w-full h-12 sm:h-14 px-6 text-white bg-black text-sm sm:text-base font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-800 transition-all duration-200 rounded-md tracking-wide"
                  style={{ fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}
                >
                  {loading ? 'Comparing...' : 'Compare Stores'}
                </button>
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
                 <thead className="bg-gray-50 border-b-2 border-gray-200">
                   <tr className="[&>th]:px-4 [&>th]:py-3 [&>th]:align-middle [&>th]:border-r [&>th]:border-gray-200 [&>th:first-child]:border-r-0 [&>th:last-child]:border-r-0 [&>th]:h-16">
                     <th className="w-[16%] text-left font-semibold text-gray-900 sticky left-0 bg-gray-50 z-10">Store</th>
                     {sortedRows.map((row, i) => {
                       const s: Signals = row.signals || {};
                       return (
                         <th key={i} className="w-[10%] text-center">
                           <div className="flex flex-col items-center gap-2 p-1">
                             <div className="h-10 w-10 flex-shrink-0 overflow-hidden bg-white rounded-lg shadow-sm border border-gray-200">
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
                             <div className="flex items-center gap-1">
                     <a
                       href={validationUrl(row.domain, row.country)}
                       target="_blank"
                       rel="noopener noreferrer"
                       className="flex items-center gap-1 text-sm font-semibold text-gray-900 hover:text-blue-600 transition-colors"
                       title="Open source URL"
                     >
                       <span className="truncate max-w-[120px] text-center">
                         {s?.store_name || row.domain}
                       </span>
                       <span className="text-black text-xs">↗</span>
                     </a>
                             </div>
                           </div>
                         </th>
                       );
                     })}
                   </tr>
                 </thead>
                 <tbody className="text-sm text-slate-800 bg-white">
                   {/* TSQ Score Row */}
                   <tr className="[&>td]:px-4 [&>td]:py-3 [&>td]:align-middle hover:bg-blue-50 [&>td]:border-r [&>td]:border-gray-200 [&>td:first-child]:border-r-0 [&>td:last-child]:border-r-0 [&>td:first-child]:sticky [&>td:first-child]:left-0 [&>td:first-child]:z-10 [&>td]:h-16">
                     <td className="text-left font-semibold text-gray-900">Score (out of 100)</td>
                     {sortedRows.map((row, i) => {
                       const tsqScore = row.signals ? computeTsqScore(row.signals) : 0;
                       return (
                         <td key={i} className="text-center">
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
                       );
                     })}
                   </tr>
                   
                   {/* Top Quality Store Row */}
                   <tr className="[&>td]:px-4 [&>td]:py-3 [&>td]:align-middle hover:bg-blue-50 [&>td]:border-r [&>td]:border-gray-200 [&>td:first-child]:border-r-0 [&>td:last-child]:border-r-0 [&>td:first-child]:sticky [&>td:first-child]:left-0 [&>td:first-child]:z-10 [&>td]:h-16">
                     <td className="text-left font-semibold text-gray-900">Top Quality Store</td>
                     {sortedRows.map((row, i) => {
                       const tqs = row.signals?.tqs_badge;
                       return (
                         <td key={i} className="text-center">
                           {row.error
                             ? badge('Error', 'red')
                             : tqs === true
                               ? badge('Yes', 'green')
                               : tqs === false
                                 ? badge('No', 'red')
                                 : badge('—', 'slate')}
                         </td>
                       );
                     })}
                   </tr>
                   
                   {/* Shipping Quality Row */}
                   <tr className="[&>td]:px-4 [&>td]:py-3 [&>td]:align-middle hover:bg-blue-50 [&>td]:border-r [&>td]:border-gray-200 [&>td:first-child]:border-r-0 [&>td:last-child]:border-r-0 [&>td:first-child]:sticky [&>td:first-child]:left-0 [&>td:first-child]:z-10 [&>td]:h-16">
                     <td className="text-left font-semibold text-gray-900">Shipping (quality)</td>
                     {sortedRows.map((row, i) => {
                       const s = row.signals;
                       const shipGrade = getAny(s, ['section_grades.shipping','shipping_quality','shippingGrade']);
                       const delivery = getAny(s, ['delivery_time','deliveryTime','delivery_estimate']);
                       const shippingDetails = getAny(s, ['shipping_details','shippingDetails']);
                       return (
                         <td key={i} className="text-center">
                           <div className="flex flex-col items-center justify-center gap-1 min-h-[60px]">
                             {shipGrade && shipGrade !== '—' ? badge(shipGrade, qualityTone(shipGrade)) : null}
                             {shippingDetails && shippingDetails !== '—' && (
                               <div className="text-xs text-slate-600 font-medium text-center leading-tight">
                                 {shippingDetails}
                               </div>
                             )}
                           </div>
                         </td>
                       );
                     })}
                   </tr>
                   
                   {/* Returns Quality Row */}
                   <tr className="[&>td]:px-4 [&>td]:py-3 [&>td]:align-middle hover:bg-blue-50 [&>td]:border-r [&>td]:border-gray-200 [&>td:first-child]:border-r-0 [&>td:last-child]:border-r-0 [&>td:first-child]:sticky [&>td:first-child]:left-0 [&>td:first-child]:z-10 [&>td]:h-16">
                     <td className="text-left font-semibold text-gray-900">Returns (quality)</td>
                     {sortedRows.map((row, i) => {
                       const s = row.signals;
                       const returnsGrade = getAny(s, ['section_grades.returns','returns_quality','returnsGrade']);
                       const returnWindow = getAny(s, ['return_window','returnWindow','returns_window']);
                       const returnDetails = getAny(s, ['return_details','returnDetails']);
                       return (
                         <td key={i} className="text-center">
                           <div className="flex flex-col items-center justify-center gap-1 min-h-[60px]">
                             {returnsGrade && returnsGrade !== '—' ? badge(returnsGrade, qualityTone(returnsGrade)) : null}
                             {returnDetails && returnDetails !== '—' && (
                               <div className="text-xs text-slate-600 font-medium text-center leading-tight">
                                 {returnDetails}
                               </div>
                             )}
                           </div>
                         </td>
                       );
                     })}
                   </tr>
                   
                   {/* Competitive Pricing Row */}
                   <tr className="[&>td]:px-4 [&>td]:py-3 [&>td]:align-middle hover:bg-blue-50 [&>td]:border-r [&>td]:border-gray-200 [&>td:first-child]:border-r-0 [&>td:last-child]:border-r-0 [&>td:first-child]:sticky [&>td:first-child]:left-0 [&>td:first-child]:z-10 [&>td]:h-16">
                     <td className="text-left font-semibold text-gray-900">Competitive pricing</td>
                     {sortedRows.map((row, i) => {
                       const pricingGrade = getAny(row.signals, ['section_grades.pricing','pricing_quality','pricingGrade']);
                       return (
                         <td key={i} className="text-center">
                           {badge(pricingGrade, qualityTone(pricingGrade))}
                         </td>
                       );
                     })}
                   </tr>
                   
                   {/* Website Quality Row */}
                   <tr className="[&>td]:px-4 [&>td]:py-3 [&>td]:align-middle hover:bg-blue-50 [&>td]:border-r [&>td]:border-gray-200 [&>td:first-child]:border-r-0 [&>td:last-child]:border-r-0 [&>td:first-child]:sticky [&>td:first-child]:left-0 [&>td:first-child]:z-10 [&>td]:h-16">
                     <td className="text-left font-semibold text-gray-900">Website quality</td>
                     {sortedRows.map((row, i) => {
                       const websiteGrade = getAny(row.signals, ['section_grades.website','website_quality','websiteGrade']);
                       return (
                         <td key={i} className="text-center">
                           {badge(websiteGrade, qualityTone(websiteGrade))}
                         </td>
                       );
                     })}
                   </tr>
                   
                   {/* Payment Wallets Row */}
                   <tr className="[&>td]:px-4 [&>td]:py-3 [&>td]:align-middle hover:bg-blue-50 [&>td]:border-r [&>td]:border-gray-200 [&>td:first-child]:border-r-0 [&>td:last-child]:border-r-0 [&>td:first-child]:sticky [&>td:first-child]:left-0 [&>td:first-child]:z-10 [&>td]:h-16">
                     <td className="text-left font-semibold text-gray-900">Wallets</td>
                     {sortedRows.map((row, i) => {
                       const wallets = getAny(row.signals, ['e_wallets','wallets','payment_wallets']);
                       return (
                         <td key={i} className="text-center">
                           {renderWalletPills(wallets)}
                         </td>
                       );
                     })}
                   </tr>
                   
                   {/* Rating Row */}
                   <tr className="[&>td]:px-4 [&>td]:py-3 [&>td]:align-middle hover:bg-blue-50 [&>td]:border-r [&>td]:border-gray-200 [&>td:first-child]:border-r-0 [&>td:last-child]:border-r-0 [&>td:first-child]:sticky [&>td:first-child]:left-0 [&>td:first-child]:z-10 [&>td]:h-16">
                     <td className="text-left font-semibold text-gray-900">Rating</td>
                     {sortedRows.map((row, i) => {
                       const rating = getAny(row.signals, ['store_rating','rating','storeRating']);
                       return (
                         <td key={i} className="text-center">
                           {badge(rating, 
                             rating && !isNaN(Number(rating)) ? 
                               Number(rating) >= 4.5 ? 'green' :
                               Number(rating) >= 4.0 ? 'yellow' :
                               Number(rating) >= 3.0 ? 'yellow' :
                               'red' : 'slate'
                           )}
                         </td>
                       );
                     })}
                   </tr>
                   
                   {/* Reviews Row */}
                   <tr className="[&>td]:px-4 [&>td]:py-3 [&>td]:align-middle hover:bg-blue-50 [&>td]:border-r [&>td]:border-gray-200 [&>td:first-child]:border-r-0 [&>td:last-child]:border-r-0 [&>td:first-child]:sticky [&>td:first-child]:left-0 [&>td:first-child]:z-10 [&>td]:h-16">
                     <td className="text-left font-semibold text-gray-900">Reviews</td>
                     {sortedRows.map((row, i) => {
                       const reviews = getAny(row.signals, ['review_count','reviews','reviewCount']);
                       return (
                         <td key={i} className="text-center">
                           {badge(reviews, 
                             reviews && !isNaN(Number(reviews)) ? 
                               Number(reviews) >= 1000 ? 'green' :
                               Number(reviews) >= 100 ? 'yellow' :
                               Number(reviews) >= 10 ? 'yellow' :
                               'red' : 'slate'
                           )}
                         </td>
                       );
                     })}
                   </tr>
                 </tbody>
               </table>
            </div>
          </div>

          {/* Copy and Start Again buttons under table, centered */}
          <div className="pt-4 flex flex-col sm:flex-row justify-center gap-3">
            <button
              onClick={copyResults}
              className="inline-flex items-center justify-center gap-2 bg-black px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-gray-800 active:translate-y-px w-full sm:w-auto"
              aria-label="Copy table results"
              title="Copy table results"
            >
              <span className="text-lg">⧉</span>
              {copied ? 'Copied!' : 'Copy Results'}
            </button>
            <button
              onClick={handleStartAgain}
              className="inline-flex items-center justify-center gap-2 bg-black px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-gray-800 active:translate-y-px w-full sm:w-auto"
              aria-label="Start again"
              title="Start again"
            >
              <span className="text-lg">↻</span>
              Start Again
            </button>
          </div>
        </section>
      )}


      {/* Tabbed Information Section */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6 pt-8 pb-16">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 sm:gap-6">
          {/* Left Side - Tab Buttons */}
          <div className="lg:col-span-1">
            <div className="space-y-3">
              <button
                onClick={() => setActiveTab('signals')}
                className={`flex items-center gap-2 px-4 py-3 transition-colors w-full ${
                  activeTab === 'signals' 
                    ? 'text-black border-b-2 border-b-black' 
                    : 'text-gray-600 hover:text-black hover:border-b-2 hover:border-b-black'
                }`}
                style={{ fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}
              >
                <h3 className="font-semibold tracking-wide">How Google Might Interpret These Signals?</h3>
              </button>
              <button
                onClick={() => setActiveTab('scoring')}
                className={`flex items-center gap-2 px-4 py-3 transition-colors w-full ${
                  activeTab === 'scoring' 
                    ? 'text-black border-b-2 border-b-black' 
                    : 'text-gray-600 hover:text-black hover:border-b-2 hover:border-b-black'
                }`}
                style={{ fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}
              >
                <h3 className="font-semibold tracking-wide">How Are These Scores Calculated?</h3>
              </button>
              <button
                onClick={() => setActiveTab('faq')}
                className={`flex items-center gap-2 px-4 py-3 transition-colors w-full ${
                  activeTab === 'faq' 
                    ? 'text-black border-b-2 border-b-black' 
                    : 'text-gray-600 hover:text-black hover:border-b-2 hover:border-b-black'
                }`}
                style={{ fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}
              >
                <h3 className="font-semibold tracking-wide">Frequently Asked Questions</h3>
              </button>
            </div>
          </div>

          {/* Right Side - Tab Content */}
          <div className="lg:col-span-3">
            <div className="border border-gray-300 bg-white rounded-lg shadow-sm p-4 sm:p-6 min-h-[240px]">
              <div className="overflow-x-auto">
                {activeTab === 'signals' && (
                  <table className="min-w-[800px] w-full text-left text-base">
                    <tbody className="divide-y divide-slate-100">
                      {EXPLAINER.map((r, idx) => (
                        <tr key={idx} className="[&>td]:align-middle [&>td]:px-2 sm:[&>td]:px-4 [&>td]:py-4 [&>td]:h-16">
                          <td className="font-medium text-slate-900 text-base">{r.m}</td>
                          <td className="text-slate-700 text-base">{r.w}</td>
                          <td className="text-slate-600 text-base">{r.t}</td>
                          <td className="text-slate-600 text-base">{r.q}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}

                {activeTab === 'scoring' && (
                  <div className="px-6 py-4">
                    <p className="text-slate-700 mb-4 text-base">
                      These are <strong>crude scores</strong> designed to provide a quick comparison between stores based on Google's public quality signals. 
                      The TSQ (Trust & Quality) scoring system uses a weighted approach to evaluate store performance across key metrics.
                      Note: Reviews and ratings are displayed but not factored into the TSQ score to avoid over-weighting star ratings when review counts are missing.
                    </p>
                    
                    <h3 className="text-base font-semibold text-slate-800 mb-3">Scoring Breakdown:</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                      <div className="space-y-3">
                        <div className="flex justify-between items-center py-2 px-3 bg-slate-50 rounded-lg">
                          <span className="font-medium text-slate-700 text-base">Returns Quality</span>
                          <span className="text-slate-600 font-mono text-base">25%</span>
                        </div>
                        <div className="flex justify-between items-center py-2 px-3 bg-slate-50 rounded-lg">
                          <span className="font-medium text-slate-700 text-base">Shipping Quality</span>
                          <span className="text-slate-600 font-mono text-base">20%</span>
                        </div>
                        <div className="flex justify-between items-center py-2 px-3 bg-slate-50 rounded-lg">
                          <span className="font-medium text-slate-700 text-base">Competitive Pricing</span>
                          <span className="text-slate-600 font-mono text-base">20%</span>
                        </div>
                      </div>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center py-2 px-3 bg-slate-50 rounded-lg">
                          <span className="font-medium text-slate-700 text-base">Website Quality</span>
                          <span className="text-slate-600 font-mono text-base">10%</span>
                        </div>
                        <div className="flex justify-between items-center py-2 px-3 bg-slate-50 rounded-lg">
                          <span className="font-medium text-slate-700 text-base">Payment Wallets</span>
                          <span className="text-slate-600 font-mono text-base">5%</span>
                        </div>
                        <div className="flex justify-between items-center py-2 px-3 bg-slate-50 rounded-lg">
                          <span className="font-medium text-slate-700 text-base">Top Quality Store Badge</span>
                          <span className="text-slate-600 font-mono text-base">15%</span>
                        </div>
                      </div>
                    </div>

                    <h3 className="text-base font-semibold text-slate-800 mb-3">Grade Values:</h3>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
                      <div className="text-center py-2 px-3 bg-green-50 rounded-lg border border-green-200">
                        <div className="font-semibold text-green-800 text-base">Exceptional</div>
                        <div className="text-sm text-green-600">100 points</div>
                      </div>
                      <div className="text-center py-2 px-3 bg-green-50 rounded-lg border border-green-200">
                        <div className="font-semibold text-green-800 text-base">Great</div>
                        <div className="text-sm text-green-600">85 points</div>
                      </div>
                      <div className="text-center py-2 px-3 bg-yellow-50 rounded-lg border border-yellow-200">
                        <div className="font-semibold text-yellow-800 text-base">Good</div>
                        <div className="text-sm text-yellow-600">70 points</div>
                      </div>
                      <div className="text-center py-2 px-3 bg-orange-50 rounded-lg border border-orange-200">
                        <div className="font-semibold text-orange-800 text-base">Fair</div>
                        <div className="text-sm text-orange-600">40 points</div>
                      </div>
                      <div className="text-center py-2 px-3 bg-red-50 rounded-lg border border-red-200">
                        <div className="font-semibold text-red-800 text-base">Poor</div>
                        <div className="text-sm text-red-600">20 points</div>
                      </div>
                    </div>

                    <h3 className="text-base font-semibold text-slate-800 mb-3">Bonuses:</h3>
                    <ul className="list-disc list-inside text-slate-700 space-y-2 mb-4 text-base">
                      <li><strong>Return Window Bonus:</strong> +5 points for 30+ days, +3 points for 28+ days</li>
                      <li><strong>Top Quality Store Badge:</strong> +15 points (major weighting)</li>
                      <li><strong>Payment Wallets:</strong> Scored based on unique wallet count (max 3 wallets = 100%)</li>
                    </ul>

                    <p className="text-base text-slate-600 italic">
                      Final scores are capped at 100 points and rounded to the nearest integer. 
                      Stores are ranked by TSQ score, with tie-breakers based on competitive pricing, returns quality, shipping quality, and wallet count.
                    </p>
                  </div>
                )}

                {activeTab === 'faq' && (
                  <div className="divide-y divide-slate-100">
                    <div className="px-5 py-4">
                      <h3 className="font-medium text-slate-900 text-base">Where do these signals come from?</h3>
                      <p className="mt-1 text-base text-slate-600">
                        From Google's public <span className="font-mono">storepages</span> surface for each domain and region. We don't scrape private data or guess values.
                      </p>
                    </div>
                    <div className="px-5 py-4">
                      <h3 className="font-medium text-slate-900 text-base">What does "Top Quality Store" mean?</h3>
                      <p className="mt-1 text-base text-slate-600">
                        It's Google's badge indicating strong trust/quality across core commerce signals (shipping, returns, reviews, policy clarity, payments, etc.).
                      </p>
                    </div>
                    <div className="px-5 py-4">
                      <h3 className="font-medium text-slate-900 text-base">How often are results updated?</h3>
                      <p className="mt-1 text-base text-slate-600">
                        Whenever you click Compare we fetch fresh data. Google's public indicators may change at any time.
                      </p>
                    </div>
                    <div className="px-5 py-4">
                      <h3 className="font-medium text-slate-900 text-base">Why don't I see all wallets or grades for my store?</h3>
                      <p className="mt-1 text-base text-slate-600">
                        Some signals are only shown by Google in certain regions or for eligible stores. If Google doesn't show it, we display a dash (—).
                      </p>
                    </div>
                    <div className="px-5 py-4">
                      <h3 className="font-medium text-slate-900 text-base">Can I export the results?</h3>
                      <p className="mt-1 text-base text-slate-600">
                        You can copy the table using the "Copy results" button and paste into a spreadsheet. CSV export is on the roadmap.
                      </p>
                    </div>
                    <div className="px-5 py-4">
                      <h3 className="font-medium text-slate-900 text-base">Why does a store have a rating but no review count?</h3>
                      <p className="mt-1 text-base text-slate-600">
                        Because Google can show a seller rating based on a longer time period, but usually needs around 10 recent reviews before showing a review count.
                      </p>
                    </div>
                    <div className="px-5 py-4">
                      <h3 className="font-medium text-slate-900 text-base">How do we collect and display the quality signals for store websites from google.com/storepages?</h3>
                      <p className="mt-1 text-base text-slate-600">
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

      {/* About Slider */}
      {showAboutSlider && (
        <>
          {/* Overlay */}
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-40"
            onClick={() => setShowAboutSlider(false)}
          />
          
          {/* Slider */}
          <div className="fixed top-0 right-0 h-full w-full sm:w-96 bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-in-out">
            <div className="p-6 h-full overflow-y-auto">
              {/* Close Button */}
              <div className="flex justify-end mb-6">
                <button
                  onClick={() => setShowAboutSlider(false)}
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                >
                  ×
                </button>
              </div>
              
              {/* Content */}
              <div className="text-center">
                {/* Image */}
                <div className="mb-6">
                  <img
                    src="/carl-social.jpeg"
                    alt="Carl Hendy"
                    className="w-32 h-32 rounded-full mx-auto object-cover"
                  />
                </div>
                
                {/* Text Content */}
                <div className="space-y-4">
                  <h2 className="text-2xl font-bold text-black" style={{ fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
                    Carl Hendy
                  </h2>
                  
                  <p className="text-gray-700 leading-relaxed" style={{ fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
                    A vibe coding project of Carl Hendy, founder of <a href="https://audits.com" className="text-black font-semibold hover:underline">audits.com</a> who specialises in ecommerce SEO audits for brands as John Lewis, Ralph Lauren, Marks and Spencer and Groupon.
                  </p>
                  
                  {/* LinkedIn Link */}
                  <div className="pt-4">
                    <a
                      href="https://www.linkedin.com/in/carlhendy/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
                    >
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.338 16.338H13.67V12.16c0-.995-.017-2.277-1.387-2.277-1.39 0-1.601 1.086-1.601 2.207v4.248H8.014v-8.59h2.559v1.174h.037c.356-.675 1.227-1.387 2.526-1.387 2.703 0 3.203 1.778 3.203 4.092v4.711zM5.005 6.575a1.548 1.548 0 11-.003-3.096 1.548 1.548 0 01.003 3.096zm-1.337 9.763H6.34v-8.59H3.667v8.59zM17.668 1H2.328C1.595 1 1 1.581 1 2.298v15.403C1 18.418 1.595 19 2.328 19h15.34c.734 0 1.332-.582 1.332-1.299V2.298C19 1.581 18.402 1 17.668 1z" clipRule="evenodd" />
                      </svg>
                      Connect on LinkedIn
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Footer */}
      <footer className="border-t border-black py-16 px-4 sm:px-6 text-center text-black bg-white">
        <div className="mb-4 text-base">
          <div>
            Badly vibe coded by{' '}
            <a href="https://carlhendy.com" target="_blank" rel="noreferrer" className="text-black underline hover:no-underline font-normal inline-block">
              Carl Hendy
            </a>
            {' '}founder of{' '}
            <a href="https://audits.com" target="_blank" rel="noreferrer" className="text-black underline hover:no-underline font-normal inline-block">
              Audits.com
            </a>.
          </div>
        </div>
        <p className="mx-auto max-w-3xl text-sm text-black">
          Disclaimer: This is a non‑profit, non‑commercial demo. Ratings, review counts and quality grades are displayed from Google's public
          <span className="font-mono"> storepages </span> surface (per region) and may change at any time. This site is not affiliated with Google.
        </p>
      </footer>
    </main>
    </>
  );
}

