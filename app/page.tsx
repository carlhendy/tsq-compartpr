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
    <div className="flex items-center gap-2 sm:gap-3 md:gap-5 flex-wrap justify-center">
      {brands.map((brand, index) => (
        <div 
          key={brand} 
          className="h-12 w-12 sm:h-16 sm:w-16 md:h-20 md:w-20 lg:h-24 lg:w-24 rounded-lg overflow-hidden bg-white shadow-sm border border-gray-200 flex items-center justify-center cursor-pointer hover:shadow-md transition-shadow duration-200"
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
  const [selectedCountry, setSelectedCountry] = useState<CountryKey>('UK');
  const [showAboutSlider, setShowAboutSlider] = useState<boolean>(false);
  const [openAccordion, setOpenAccordion] = useState<string | null>(null);
  const resultsTableRef = useRef<HTMLDivElement>(null);
  const aboutButtonRef = useRef<HTMLButtonElement>(null);

  // Accordion toggle function
  const toggleAccordion = (section: string) => {
    setOpenAccordion(openAccordion === section ? null : section);
  };

  // Move about button to header and set up event listeners
  useEffect(() => {
    const placeholder = document.getElementById('about-button-placeholder');
    if (placeholder && aboutButtonRef.current) {
      placeholder.appendChild(aboutButtonRef.current);
      // Show the button only after it's been moved to the header
      aboutButtonRef.current.style.display = 'block';
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
    
    // Start comparison (don't wait for it)
    compareWithValues(brands, countryCode);
    
    // Scroll to results table immediately
    setTimeout(() => {
      if (resultsTableRef.current) {
        resultsTableRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 200);
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
        className="bg-black text-white px-6 py-3 rounded-md text-base font-semibold hover:bg-gray-800 transition-colors tracking-wide min-w-[100px]" 
        style={{ fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', display: 'none' }}
      >
        about
      </button>

    <main className="min-h-screen bg-gray-100">
      {/* Header with About Button */}
      <header className="w-full bg-gray-100 py-4 px-6">
        <div className="max-w-4xl mx-auto flex justify-end">
          <div id="about-button-placeholder"></div>
        </div>
      </header>
      
      {/* Hero - Centered Layout */}
      <section className="pt-6 sm:pt-8 pb-16 px-6 bg-gray-100">
        <div className="mx-auto max-w-4xl">
          {/* Centered Text Content */}
          <div className="text-center mb-12">
            <h1 className="text-black mb-6 leading-tight text-4xl sm:text-4xl md:text-6xl tracking-tight font-black" style={{ fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', lineHeight: '1.1', fontWeight: '900' }}>
              Compare Google Store Ratings
            </h1>
            <p className="text-base sm:text-lg text-gray-700 mb-8 sm:mb-12 font-medium" style={{ fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
              Benchmark your rating against competitors - using hidden Google insights.
            </p>
            
            {/* Two Large Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 justify-center items-center">
              <button
                onClick={() => {
                  const element = document.getElementById('examples-section');
                  if (element) {
                    element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }
                }}
                className="w-full sm:w-auto px-8 py-4 bg-white text-black border-2 border-black rounded-lg text-lg font-bold hover:bg-black hover:text-white transition-all duration-200 tracking-wide"
                style={{ fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}
              >
                See Examples
              </button>
              <button
                onClick={() => {
                  const element = document.getElementById('examples-section');
                  if (element) {
                    element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }
                }}
                className="w-full sm:w-auto px-8 py-4 bg-black text-white border-2 border-black rounded-lg text-lg font-bold hover:bg-white hover:text-black transition-all duration-200 tracking-wide"
                style={{ fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}
              >
                Create Your Own
              </button>
            </div>
          </div>
          
          {/* Why Care About Google Store Ratings Section - Full Width White Background */}
          <div className="w-full bg-white border border-gray-300 rounded-lg shadow-sm py-6 sm:py-8 mb-0">
            {/* Header */}
            <div className="text-center mb-6 sm:mb-8 px-6">
              <h1 className="text-2xl sm:text-2xl md:text-3xl text-black font-black tracking-tight" style={{ fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', fontWeight: '900' }}>
                Why Care About Google Store Ratings?
              </h1>
            </div>
          
            {/* Stats Section */}
            <div className="max-w-4xl mx-auto px-6">
              <div className="flex flex-col md:grid md:grid-cols-2 gap-8 md:gap-12 items-center">
                {/* Text Column */}
                <div className="flex justify-center order-2 md:order-1">
                  <div className="text-center px-4 py-6 bg-white max-w-md mx-auto">
                    <div className="text-xl sm:text-2xl md:text-3xl mb-4 sm:mb-6 leading-relaxed text-center max-w-4xl mx-auto">
                      <div className="border-l-4 border-green-500 pl-6 italic">
                        <div>"Businesses using the Top Quality Store widget saw an <span className="font-bold text-green-600">8% increase</span> in sales."</div>
                      </div>
                    </div>
                    <div className="text-base sm:text-lg md:text-xl flex items-center justify-center" style={{ color: '#666' }}>
                      <img src="https://www.google.com/images/branding/googlelogo/2x/googlelogo_color_272x92dp.png" alt="Google" className="h-4 sm:h-5 md:h-6 mr-2" />
                      September 2025
                    </div>
                  </div>
                </div>
                
                {/* Image Column */}
                <div className="flex justify-center md:justify-end order-1 md:order-2">
                  <img 
                    src="/top-quality-store-widget-embedded.gif" 
                    alt="Widget Preview" 
                    className="w-full max-w-sm sm:max-w-md md:max-w-lg h-auto rounded-lg shadow-sm"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      
      {/* NEW Examples vs Create Your Own Section */}
      <div id="examples-section" className="w-full py-6 sm:py-8 mb-4 sm:mb-8 -mt-2 sm:-mt-1">
        <div className="max-w-4xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Examples Column */}
            <div className="text-center">
              <h2 className="text-xl sm:text-2xl font-bold text-black mb-6" style={{ fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
                Examples
              </h2>
              <div className="mb-6">
                <p className="text-gray-600 text-sm sm:text-base">
                  Click on any of the examples:
                </p>
              </div>
              <div className="flex flex-col items-center">
                <div className="flex items-center relative before:content-[''] before:absolute before:left-0 before:right-0 before:bottom-0 before:h-px before:bg-gray-300">
                  <button
                    onClick={() => setSelectedCountry('UK')}
                    className={`px-4 py-3 transition-all duration-200 flex items-center justify-center rounded-t-lg ${
                      selectedCountry === 'UK'
                        ? 'bg-white text-black font-bold border border-gray-300 border-b-0 relative z-[2] after:content-[""] after:absolute after:left-0 after:right-0 after:-bottom-[1px] after:h-[2px] after:bg-white'
                        : 'bg-transparent text-gray-700 hover:text-black border-0 shadow-none'
                    }`}
                  >
                    <span className="text-3xl sm:text-4xl">🇬🇧</span>
                  </button>
                  <button
                    onClick={() => setSelectedCountry('US')}
                    className={`px-4 py-3 transition-all duration-200 flex items-center justify-center rounded-t-lg ${
                      selectedCountry === 'US'
                        ? 'bg-white text-black font-bold border border-gray-300 border-b-0 relative z-[2] after:content-[""] after:absolute after:left-0 after:right-0 after:-bottom-[1px] after:h-[2px] after:bg-white'
                        : 'bg-transparent text-gray-700 hover:text-black border-0 shadow-none'
                    }`}
                  >
                    <span className="text-3xl sm:text-4xl">🇺🇸</span>
                  </button>
                  <button
                    onClick={() => setSelectedCountry('AU')}
                    className={`px-4 py-3 transition-all duration-200 flex items-center justify-center rounded-t-lg ${
                      selectedCountry === 'AU'
                        ? 'bg-white text-black font-bold border border-gray-300 border-b-0 relative z-[2] after:content-[""] after:absolute after:left-0 after:right-0 after:-bottom-[1px] after:h-[2px] after:bg-white'
                        : 'bg-transparent text-gray-700 hover:text-black border-0 shadow-none'
                    }`}
                  >
                    <span className="text-3xl sm:text-4xl">🇦🇺</span>
                  </button>
                </div>
                <div className="px-4 py-3 border border-gray-300 relative z-[1] -mt-px bg-white rounded-lg">
                  <div className="flex items-center justify-center gap-1 sm:gap-2 flex-nowrap">
                    {(selectedCountry === 'UK' ? QUICK_START_CATEGORIES.UK['Home & Garden'] :
                      selectedCountry === 'US' ? QUICK_START_CATEGORIES.US['Fashion'] :
                      QUICK_START_CATEGORIES.AU['Electronics']).map((brand, index) => (
                      <button 
                        key={brand} 
                        className="h-10 w-10 sm:h-12 sm:w-12 md:h-14 md:w-14 lg:h-16 lg:w-16 rounded-lg overflow-hidden bg-white shadow-sm border border-gray-200 flex items-center justify-center cursor-pointer hover:shadow-md transition-shadow duration-200"
                        onClick={() => {
                          const category = selectedCountry === 'UK' ? 'Home & Garden' :
                                        selectedCountry === 'US' ? 'Fashion' : 'Electronics';
                          handleQuickStart(selectedCountry, category);
                        }}
                        title={`Click to analyze ${brand}`}
                      >
                        <img
                          src={getFaviconUrlWithFallback(brand)}
                          alt={brand}
                          className="h-full w-full object-contain pointer-events-none"
                        />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            
            {/* Create Your Own Column */}
            <div className="text-center">
              <h2 className="text-xl sm:text-2xl font-bold text-black mb-4" style={{ fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
                Create Your Own
              </h2>
              <p className="text-gray-600 text-sm sm:text-base mb-6">
                Enter your own domains below to compare your store ratings with competitors.
              </p>
              <div className="bg-white p-4 sm:p-6 border border-gray-300 rounded-lg shadow-sm">
                <div className="space-y-3 mb-4">
                  {domains.map((domain, i) => (
                    <div key={i} className="relative">
                      <input
                        type="text"
                        value={domain}
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
                      <option value="ES">Spain</option>
                      <option value="IT">Italy</option>
                      <option value="NL">Netherlands</option>
                      <option value="SE">Sweden</option>
                      <option value="NO">Norway</option>
                      <option value="DK">Denmark</option>
                      <option value="FI">Finland</option>
                      <option value="PL">Poland</option>
                      <option value="CZ">Czech Republic</option>
                      <option value="HU">Hungary</option>
                      <option value="RO">Romania</option>
                      <option value="BG">Bulgaria</option>
                      <option value="HR">Croatia</option>
                      <option value="SI">Slovenia</option>
                      <option value="SK">Slovakia</option>
                      <option value="LT">Lithuania</option>
                      <option value="LV">Latvia</option>
                      <option value="EE">Estonia</option>
                      <option value="GR">Greece</option>
                      <option value="PT">Portugal</option>
                      <option value="LU">Luxembourg</option>
                      <option value="MT">Malta</option>
                      <option value="CY">Cyprus</option>
                    </select>
                  </div>
                </div>
                <button
                  onClick={compare}
                  disabled={loading || domains.some(d => !d.trim())}
                  className="w-full h-12 sm:h-14 bg-black text-white font-semibold rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Comparing...' : '→ Compare'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Results */}
      {hasCompared && (
        <section ref={resultsTableRef} className="mx-auto max-w-6xl px-6 pb-12 mt-8">
          <div className="border border-gray-300 bg-white rounded-lg shadow-sm p-2">
            <div className="overflow-x-auto">
               <table className="min-w-[1000px] w-full table-fixed text-left">
                 <thead className="bg-gray-50 border-b-2 border-gray-200">
                   <tr className="[&>th]:px-4 [&>th]:py-3 [&>th]:align-middle [&>th]:border-r [&>th]:border-gray-200 [&>th:first-child]:border-r-0 [&>th:last-child]:border-r-0 [&>th]:h-16">
                     <th className="w-[12%] text-left font-semibold text-gray-900 sticky left-0 bg-gray-50 z-10">Store</th>
                     {sortedRows.map((row, i) => {
                       const s: Signals = row.signals || {};
                       return (
                         <th key={i} className="w-[11%] text-center">
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
                   <tr className="[&>td]:px-4 [&>td]:py-3 [&>td]:align-middle hover:bg-blue-50 [&>td]:border-r [&>td]:border-gray-200 [&>td:first-child]:border-r-0 [&>td:last-child]:border-r-0 [&>td:first-child]:sticky [&>td:first-child]:left-0 [&>td:first-child]:z-10 [&>td:first-child]:bg-white [&>td]:h-16">
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
                   <tr className="[&>td]:px-4 [&>td]:py-3 [&>td]:align-middle hover:bg-blue-50 [&>td]:border-r [&>td]:border-gray-200 [&>td:first-child]:border-r-0 [&>td:last-child]:border-r-0 [&>td:first-child]:sticky [&>td:first-child]:left-0 [&>td:first-child]:z-10 [&>td:first-child]:bg-white [&>td]:h-16">
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
                   <tr className="[&>td]:px-4 [&>td]:py-3 [&>td]:align-middle hover:bg-blue-50 [&>td]:border-r [&>td]:border-gray-200 [&>td:first-child]:border-r-0 [&>td:last-child]:border-r-0 [&>td:first-child]:sticky [&>td:first-child]:left-0 [&>td:first-child]:z-10 [&>td:first-child]:bg-white [&>td]:h-16">
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
                   <tr className="[&>td]:px-4 [&>td]:py-3 [&>td]:align-middle hover:bg-blue-50 [&>td]:border-r [&>td]:border-gray-200 [&>td:first-child]:border-r-0 [&>td:last-child]:border-r-0 [&>td:first-child]:sticky [&>td:first-child]:left-0 [&>td:first-child]:z-10 [&>td:first-child]:bg-white [&>td]:h-16">
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
                   <tr className="[&>td]:px-4 [&>td]:py-3 [&>td]:align-middle hover:bg-blue-50 [&>td]:border-r [&>td]:border-gray-200 [&>td:first-child]:border-r-0 [&>td:last-child]:border-r-0 [&>td:first-child]:sticky [&>td:first-child]:left-0 [&>td:first-child]:z-10 [&>td:first-child]:bg-white [&>td]:h-16">
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
                   <tr className="[&>td]:px-4 [&>td]:py-3 [&>td]:align-middle hover:bg-blue-50 [&>td]:border-r [&>td]:border-gray-200 [&>td:first-child]:border-r-0 [&>td:last-child]:border-r-0 [&>td:first-child]:sticky [&>td:first-child]:left-0 [&>td:first-child]:z-10 [&>td:first-child]:bg-white [&>td]:h-16">
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
                   <tr className="[&>td]:px-4 [&>td]:py-3 [&>td]:align-middle hover:bg-blue-50 [&>td]:border-r [&>td]:border-gray-200 [&>td:first-child]:border-r-0 [&>td:last-child]:border-r-0 [&>td:first-child]:sticky [&>td:first-child]:left-0 [&>td:first-child]:z-10 [&>td:first-child]:bg-white [&>td]:h-16">
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
                   <tr className="[&>td]:px-4 [&>td]:py-3 [&>td]:align-middle hover:bg-blue-50 [&>td]:border-r [&>td]:border-gray-200 [&>td:first-child]:border-r-0 [&>td:last-child]:border-r-0 [&>td:first-child]:sticky [&>td:first-child]:left-0 [&>td:first-child]:z-10 [&>td:first-child]:bg-white [&>td]:h-16">
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
                   <tr className="[&>td]:px-4 [&>td]:py-3 [&>td]:align-middle hover:bg-blue-50 [&>td]:border-r [&>td]:border-gray-200 [&>td:first-child]:border-r-0 [&>td:last-child]:border-r-0 [&>td:first-child]:sticky [&>td:first-child]:left-0 [&>td:first-child]:z-10 [&>td:first-child]:bg-white [&>td]:h-16">
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


      {/* Resources header */}
      <div className="mb-2 sm:mb-3 text-center">
        <h1 className="text-2xl sm:text-2xl md:text-3xl text-black font-black tracking-tight" style={{ fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', fontWeight: '900' }}>
          Resources
        </h1>
      </div>

      {/* FAQ Block Section */}
      <section className="mx-auto max-w-4xl px-4 sm:px-6 pt-8 pb-16">
        <div className="space-y-6">
          {/* FAQ Block 1: How Google Might Interpret These Signals */}
          <div className="border border-gray-300 bg-white rounded-lg shadow-sm">
              <button
              onClick={() => toggleAccordion('signals')}
              className="w-full p-6 text-left flex items-center justify-between hover:bg-gray-50 transition-colors"
            >
              <h3 className="text-xl font-bold text-black" style={{ fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
                How Google Might Interpret These Signals?
              </h3>
              <svg
                className={`w-5 h-5 text-gray-500 transition-transform duration-200 ${
                  openAccordion === 'signals' ? 'rotate-180' : ''
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
              </button>
            {openAccordion === 'signals' && (
              <div className="px-6 pb-6">
              <div className="overflow-x-auto">
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
                </div>
              </div>
            )}
          </div>

          {/* FAQ Block 2: How Are These Scores Calculated */}
          <div className="border border-gray-300 bg-white rounded-lg shadow-sm">
            <button
              onClick={() => toggleAccordion('scoring')}
              className="w-full p-6 text-left flex items-center justify-between hover:bg-gray-50 transition-colors"
            >
              <h3 className="text-xl font-bold text-black" style={{ fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
                How Are These Scores Calculated?
              </h3>
              <svg
                className={`w-5 h-5 text-gray-500 transition-transform duration-200 ${
                  openAccordion === 'scoring' ? 'rotate-180' : ''
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {openAccordion === 'scoring' && (
              <div className="px-6 pb-6">
                    <p className="text-slate-700 mb-4 text-base">
                      These are <strong>crude scores</strong> designed to provide a quick comparison between stores based on Google's public quality signals. 
                      The TSQ (Trust & Quality) scoring system uses a weighted approach to evaluate store performance across key metrics.
                      Note: Reviews and ratings are displayed but not factored into the TSQ score to avoid over-weighting star ratings when review counts are missing.
                    </p>
                    
              <h4 className="text-base font-semibold text-slate-800 mb-3">Scoring Breakdown:</h4>
                    
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
                    <span className="text-slate-600 font-mono text-base">15%</span>
                  </div>
                  <div className="flex justify-between items-center py-2 px-3 bg-slate-50 rounded-lg">
                    <span className="font-medium text-slate-700 text-base">Website Quality</span>
                    <span className="text-slate-600 font-mono text-base">15%</span>
                        </div>
                      </div>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center py-2 px-3 bg-slate-50 rounded-lg">
                    <span className="font-medium text-slate-700 text-base">Wallets</span>
                          <span className="text-slate-600 font-mono text-base">10%</span>
                        </div>
                        <div className="flex justify-between items-center py-2 px-3 bg-slate-50 rounded-lg">
                    <span className="font-medium text-slate-700 text-base">Rating</span>
                    <span className="text-slate-600 font-mono text-base">10%</span>
                        </div>
                        <div className="flex justify-between items-center py-2 px-3 bg-slate-50 rounded-lg">
                    <span className="font-medium text-slate-700 text-base">Reviews</span>
                    <span className="text-slate-600 font-mono text-base">5%</span>
                        </div>
                      </div>
                    </div>

              <p className="text-slate-600 text-sm">
                <strong>Note:</strong> These percentages are estimates based on observed patterns in Google's scoring. The actual algorithm may vary.
                    </p>
                  </div>
                )}
          </div>

          {/* FAQ Block 3: Frequently Asked Questions */}
          <div className="border border-gray-300 bg-white rounded-lg shadow-sm">
            <button
              onClick={() => toggleAccordion('faq')}
              className="w-full p-6 text-left flex items-center justify-between hover:bg-gray-50 transition-colors"
            >
              <h3 className="text-xl font-bold text-black" style={{ fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
                Frequently Asked Questions
              </h3>
              <svg
                className={`w-5 h-5 text-gray-500 transition-transform duration-200 ${
                  openAccordion === 'faq' ? 'rotate-180' : ''
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {openAccordion === 'faq' && (
              <div className="px-6 pb-6">
              <div className="space-y-6">
                <div>
                  <h4 className="font-medium text-slate-900 text-base mb-2">Where do these signals come from?</h4>
                  <p className="text-base text-slate-600">
                        From Google's public <span className="font-mono">storepages</span> surface for each domain and region. We don't scrape private data or guess values.
                      </p>
                    </div>
                <div>
                  <h4 className="font-medium text-slate-900 text-base mb-2">What does "Top Quality Store" mean?</h4>
                  <p className="text-base text-slate-600">
                        It's Google's badge indicating strong trust/quality across core commerce signals (shipping, returns, reviews, policy clarity, payments, etc.).
                      </p>
                    </div>
                <div>
                  <h4 className="font-medium text-slate-900 text-base mb-2">How often are results updated?</h4>
                  <p className="text-base text-slate-600">
                        Whenever you click Compare we fetch fresh data. Google's public indicators may change at any time.
                      </p>
                    </div>
                <div>
                  <h4 className="font-medium text-slate-900 text-base mb-2">Why don't I see all wallets or grades for my store?</h4>
                  <p className="text-base text-slate-600">
                        Some signals are only shown by Google in certain regions or for eligible stores. If Google doesn't show it, we display a dash (—).
                      </p>
                    </div>
                <div>
                  <h4 className="font-medium text-slate-900 text-base mb-2">Can I export the results?</h4>
                  <p className="text-base text-slate-600">
                        You can copy the table using the "Copy results" button and paste into a spreadsheet. CSV export is on the roadmap.
                      </p>
                    </div>
                <div>
                  <h4 className="font-medium text-slate-900 text-base mb-2">Why does a store have a rating but no review count?</h4>
                  <p className="text-base text-slate-600">
                        Because Google can show a seller rating based on a longer time period, but usually needs around 10 recent reviews before showing a review count.
                      </p>
                    </div>
                <div>
                  <h4 className="font-medium text-slate-900 text-base mb-2">How do we collect and display the quality signals for store websites from google.com/storepages?</h4>
                  <p className="text-base text-slate-600">
                        We query <span className="font-mono">google.com/storepages</span> for each domain (per region) via a US‑based serverless API. Displayed "quality" grades
                        (Exceptional/Great/Good/etc.) are Google's public indicators on the Store page.
                      </p>
                </div>
                    </div>
                  </div>
                )}
              </div>

          {/* FAQ Block 4: How to Get a Google Top Quality Store Badge */}
          <div className="border border-gray-300 bg-white rounded-lg shadow-sm">
            <button
              onClick={() => toggleAccordion('badge')}
              className="w-full p-6 text-left flex items-center justify-between hover:bg-gray-50 transition-colors"
            >
              <h3 className="text-xl font-bold text-black" style={{ fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
                How to Get a Google Top Quality Store Badge
              </h3>
              <svg
                className={`w-5 h-5 text-gray-500 transition-transform duration-200 ${
                  openAccordion === 'badge' ? 'rotate-180' : ''
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {openAccordion === 'badge' && (
              <div className="px-6 pb-6">
              <div className="space-y-6">
                <div>
                  <h4 className="font-medium text-slate-900 text-base mb-2">What is the Top Quality Store badge?</h4>
                  <p className="text-base text-slate-600">
                    The Top Quality Store badge highlights online stores that provide an excellent shopping experience, based on Google's quality signals such as delivery speed, return policies, and customer satisfaction.
                  </p>
            </div>
                <div>
                  <h4 className="font-medium text-slate-900 text-base mb-2">Which countries can get the badge?</h4>
                  <p className="text-base text-slate-600 mb-2">
                    Currently, the Top Quality Store badge is available only in the following countries:
                  </p>
                  <p className="text-base text-slate-600 mb-2">
                    <strong>AU, CA, GB, IN, JP, NZ, US</strong> — Quality signals available, Overall Quality Score, Top Quality Store badge eligibility
                  </p>
                  <p className="text-base text-slate-600 mb-2">
                    <strong>Rest of World</strong> — Quality signals available, Overall Quality Score, No badge available
                  </p>
                  <p className="text-base text-slate-600">
                    Check <a href="https://developers.google.com/shopping-content/guides/top-quality-store" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Google's official documentation</a> for country-specific availability.
                  </p>
          </div>
                <div>
                  <h4 className="font-medium text-slate-900 text-base mb-2">How do I qualify for the badge?</h4>
                  <p className="text-base text-slate-600 mb-2">
                    Your store needs to meet Google's high standards across key signals, such as:
                  </p>
                  <ul className="text-base text-slate-600 list-disc list-inside space-y-1 mb-2">
                    <li>Fast and reliable delivery times</li>
                    <li>Clear, customer-friendly return policies</li>
                    <li>Good review scores and ratings</li>
                    <li>Smooth checkout experience (wallets, payment options)</li>
                  </ul>
                  <p className="text-base text-slate-600">
                    See <a href="https://brodieclark.com/google-top-quality-store-badge/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Brodie Clark's guide</a> for a detailed breakdown of what's measured.
                  </p>
        </div>
                <div>
                  <h4 className="font-medium text-slate-900 text-base mb-2">How can I display the badge on my site?</h4>
                  <p className="text-base text-slate-600">
                    Once you qualify, you can use <a href="https://developers.google.com/shopping-content/guides/top-quality-store" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Google's Top Quality Store widget</a> to showcase your badge on your website.
                  </p>
                </div>
                <div>
                  <h4 className="font-medium text-slate-900 text-base mb-2">How often is my eligibility updated?</h4>
                  <p className="text-base text-slate-600">
                    Google updates quality scores regularly. If you improve your shipping, returns, or reviews, you may become eligible for the badge in the next update cycle.
                  </p>
                </div>
              </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* About Slider */}      {showAboutSlider && (
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
                  
                  {/* Connect Buttons */}
                  <div className="pt-2 space-y-3">
                    <a
                      href="https://www.linkedin.com/in/carlhendy/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors w-full justify-center"
                    >
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.338 16.338H13.67V12.16c0-.995-.017-2.277-1.387-2.277-1.39 0-1.601 1.086-1.601 2.207v4.248H8.014v-8.59h2.559v1.174h.037c.356-.675 1.227-1.387 2.526-1.387 2.703 0 3.203 1.778 3.203 4.092v4.711zM5.005 6.575a1.548 1.548 0 11-.003-3.096 1.548 1.548 0 01.003 3.096zm-1.337 9.763H6.34v-8.59H3.667v8.59zM17.668 1H2.328C1.595 1 1 1.581 1 2.298v15.403C1 18.418 1.595 19 2.328 19h15.34c.734 0 1.332-.582 1.332-1.299V2.298C19 1.581 18.402 1 17.668 1z" clipRule="evenodd" />
                      </svg>
                      Connect on LinkedIn
                    </a>
                    
                    <a
                      href="https://audits.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 bg-black text-white px-4 py-2 rounded-md hover:bg-gray-800 transition-colors w-full justify-center"
                    >
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M12.586 4.586a2 2 0 112.828 2.828l-3 3a2 2 0 01-2.828 0 1 1 0 00-1.414 1.414 4 4 0 005.656 0l3-3a4 4 0 00-5.656-5.656l-1.5 1.5a1 1 0 101.414 1.414l1.5-1.5zm-5 5a2 2 0 012.828 0 1 1 0 101.414-1.414 4 4 0 00-5.656 0l-3 3a4 4 0 105.656 5.656l1.5-1.5a1 1 0 10-1.414-1.414l-1.5 1.5a2 2 0 11-2.828-2.828l3-3z" clipRule="evenodd" />
                      </svg>
                      Visit Audits.com
                    </a>
                  </div>
                  
                  <p className="text-gray-700 leading-relaxed" style={{ fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
                    A vibe coding project of Carl Hendy, founder of <a href="https://audits.com" className="text-black font-semibold hover:underline">audits.com</a> who specialises in ecommerce SEO audits for brands as John Lewis, Ralph Lauren, Marks and Spencer and Groupon.
                  </p>
                  
                  <p className="text-gray-700 leading-relaxed" style={{ fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
                    Acted as an advisor to several global Venture Capital and Private Equity firms, supporting portfolio companies with organic growth through due diligence assessments and strategic guidance.
                  </p>
                  
                  <p className="text-gray-700 leading-relaxed" style={{ fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
                    Previously served as Co-Owner, Strategist, and Board Member at an award-winning SEO agency (later acquired by a leading digital group). He has also held senior roles including Global Head of SEO at the UK's largest SEO agency and VP of SEO at Europe's largest independent digital marketing agency.
                  </p>
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



