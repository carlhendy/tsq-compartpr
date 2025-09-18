// app/api/storepage/route.ts
export const runtime = "nodejs";
export const preferredRegion = ["iad1", "sfo1"];

import { NextRequest } from "next/server";

import * as cheerio from 'cheerio';

function esc(s: string) { return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }
function decodeHtmlEntities(str: string) {
  return str
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, "/")
    .replace(/&#x60;/g, "`")
    .replace(/&#x3D;/g, "=");
}
function stripTags(html: string) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<\/?[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
function sanitizeNoise(s: string) { return s.replace(/\+\s*\d+\s*more/gi, ""); }
function textContent(html: string) { return sanitizeNoise(stripTags(html)); }
function pick(text: string, res: RegExp[], gi = 1) {
  for (const re of res) { const m = text.match(re); if (m && m[gi]) return (""+m[gi]).trim(); }
  return "";
}
function allIdx(text: string, re: RegExp) {
  const out: number[] = []; const g = new RegExp(re.source, re.flags.includes("g") ? re.flags : re.flags + "g");
  let m: RegExpExecArray | null; while ((m = g.exec(text))) out.push(m.index); return out;
}
function win(s: string, i: number, radius: number) { const a = Math.max(0, i - radius); const b = Math.min(s.length, i + radius); return s.slice(a, b); }

function extractStructuredInsights(html: string, scopeHint?: { start: number; end: number }) {
  const segment = scopeHint ? html.slice(scopeHint.start, scopeHint.end) : html;

  // New XPath-based extraction using cheerio
  function extractWithXPath(html: string, xpathSelectors: string[], fieldType: string): string {
    const $ = cheerio.load(html);
    
    for (const selector of xpathSelectors) {
      try {
        // Convert XPath-like selectors to CSS selectors for cheerio
        const cssSelector = convertXPathToCSS(selector);
        const element = $(cssSelector);
        
        if (element.length > 0) {
          const text = element.text().trim();
          if (text) {
            // Only return text that looks like legitimate shipping/returns/payments info
            if (isLegitimateFieldContent(text, fieldType)) {
              return text;
            }
          }
        }
      } catch (e) {
        // If selector fails, try next one
        continue;
      }
    }
    
    return ""; // If nothing found, return empty
  }

  // Check if content is legitimate for the specific field type
  function isLegitimateFieldContent(text: string, fieldType: string): boolean {
    const lowerText = text.toLowerCase();
    
    if (fieldType === 'shipping') {
      // Only accept text that contains shipping-related patterns
      const shippingPatterns = [
        /\d+\s*day/i,                    // "1 day", "2 days", "0-2 days"
        /\d+\s*hour/i,                   // "24 hour", "48 hours"
        /£\d+/i,                         // "£5", "£10"
        /\$\d+/i,                        // "$5", "$10"
        /free\s+delivery/i,              // "free delivery"
        /standard\s+delivery/i,          // "standard delivery"
        /express\s+delivery/i,           // "express delivery"
        /next\s+day/i,                   // "next day"
        /same\s+day/i,                   // "same day"
        /\d+\s*week/i,                   // "1 week", "2 weeks"
        /delivery/i,                     // "delivery"
        /shipping/i                      // "shipping"
      ];
      
      return shippingPatterns.some(pattern => pattern.test(text));
    }
    
    if (fieldType === 'returns') {
      // Only accept text that contains returns-related patterns
      const returnsPatterns = [
        /\d+\s*day\s*return/i,           // "30 day return"
        /return\s+window/i,              // "return window"
        /return\s+policy/i,              // "return policy"
        /return\s+experience/i,          // "return experience"
        /no\s+return/i,                  // "no return"
        /returns?/i                      // "returns", "return"
      ];
      
      return returnsPatterns.some(pattern => pattern.test(text));
    }
    
    if (fieldType === 'payments') {
      // Only accept text that contains payment-related patterns
      const paymentPatterns = [
        /apple\s+pay/i,                  // "Apple Pay"
        /google\s+pay/i,                 // "Google Pay"
        /paypal/i,                       // "PayPal"
        /afterpay/i,                     // "Afterpay"
        /klarna/i,                       // "Klarna"
        /credit\s+card/i,                // "credit card"
        /debit\s+card/i,                 // "debit card"
        /payment/i                       // "payment"
      ];
      
      return paymentPatterns.some(pattern => pattern.test(text));
    }
    
    return false;
  }

  // Convert XPath to CSS selector (simplified version)
  function convertXPathToCSS(xpath: string): string {
    // Handle the specific XPath pattern you provided
    if (xpath.includes('//*[@id="yDmH0d"]')) {
      return '#yDmH0d c-wiz div div:nth-child(2) c-wiz section:nth-child(3) c-wiz div:nth-child(3) div span:nth-child(1) div:nth-child(2)';
    }
    
    // Convert common XPath patterns to CSS
    return xpath
      .replace(/\/\//g, ' ')  // // becomes space
      .replace(/\[@id="([^"]+)"\]/g, '#$1')  // [@id="x"] becomes #x
      .replace(/\[@class="([^"]+)"\]/g, '.$1')  // [@class="x"] becomes .x
      .replace(/\[(\d+)\]/g, ':nth-child($1)')  // [1] becomes :nth-child(1)
      .replace(/\//g, ' > ')  // / becomes >
      .replace(/\s+/g, ' ')   // normalize spaces
      .trim();
  }

  // XPath selectors for shipping information - ONLY target specific shipping elements
  const shippingXPaths = [
    '//*[@id="yDmH0d"]/c-wiz/div/div[2]/c-wiz/section[3]/c-wiz/div[3]/div/span[1]/div[2]',
    '//div[contains(@class, "hnGZye") and contains(text(), "Shipping")]/following-sibling::div[contains(@class, "KtbsVc-ij8cu-fmcmS")]',
    '//span[contains(@class, "hnGZye") and contains(text(), "Shipping")]/following-sibling::span[contains(@class, "KtbsVc-ij8cu-fmcmS")]'
  ];

  // XPath selectors for returns information - ONLY use XPath, no regex fallbacks
  const returnsXPaths = [
    '//div[contains(@class, "hnGZye") and contains(text(), "Returns")]/following-sibling::div[contains(@class, "KtbsVc-ij8cu-fmcmS")]',
    '//span[contains(@class, "hnGZye") and contains(text(), "Returns")]/following-sibling::span[contains(@class, "KtbsVc-ij8cu-fmcmS")]',
    '//div[contains(text(), "Return")]/following-sibling::div[1]',
    '//span[contains(text(), "Return")]/following-sibling::span[1]'
  ];

  // XPath selectors for payments information - ONLY use XPath, no regex fallbacks
  const paymentsXPaths = [
    '//div[contains(@class, "hnGZye") and contains(text(), "Payment")]/following-sibling::div[contains(@class, "KtbsVc-ij8cu-fmcmS")]',
    '//span[contains(@class, "hnGZye") and contains(text(), "Payment")]/following-sibling::span[contains(@class, "KtbsVc-ij8cu-fmcmS")]',
    '//div[contains(text(), "Payment")]/following-sibling::div[1]',
    '//span[contains(text(), "Payment")]/following-sibling::span[1]'
  ];

  // Extract using ONLY XPath - no regex fallbacks
  const shippingRaw = extractWithXPath(segment, shippingXPaths, 'shipping');
  const returnsRaw = extractWithXPath(segment, returnsXPaths, 'returns');
  const paymentsRaw = extractWithXPath(segment, paymentsXPaths, 'payments');
  

  // Extract shipping details using ONLY XPath - no regex fallbacks
  let shippingAdditional = shippingRaw;
  
  // Extract returns details using ONLY XPath - no regex fallbacks
  let returnsAdditional = returnsRaw;
  
  // Extract payments details using ONLY XPath - no regex fallbacks
  // paymentsRaw is already extracted above using XPath

  // XPath-based grade extraction - no regex
  function gradeFor(seg: string, headerPattern: string): string {
    const $ = cheerio.load(seg);
    
    // Convert header pattern to XPath-like selectors
    const gradeSelectors = [
      `div.hnGZye:contains("${headerPattern}") + div span.rMOWke-uDEFge.hnGZye`,
      `span.hnGZye:contains("${headerPattern}") + span span.rMOWke-uDEFge.hnGZye`,
      `div:contains("${headerPattern}") + div span:contains("Exceptional"), div:contains("${headerPattern}") + div span:contains("Great"), div:contains("${headerPattern}") + div span:contains("Good"), div:contains("${headerPattern}") + div span:contains("Fair"), div:contains("${headerPattern}") + div span:contains("Poor")`
    ];
    
    for (const selector of gradeSelectors) {
      const element = $(selector);
      if (element.length > 0) {
        const text = element.text().trim();
        if (text && /^(Exceptional|Great|Good|Fair|Poor)$/i.test(text)) {
          return text;
        }
      }
    }
    
    return "";
  }

  // Extract delivery time using ONLY XPath results - no regex fallbacks
  let delivery_time = "";
  if (shippingRaw) {
    // Only look in shipping-specific data, don't search elsewhere
    const timeMatch = shippingRaw.match(/(\d+\s*(?:–|-|to)?\s*\d*\s*-?\s*day[s]?)/i);
    if (timeMatch) {
      delivery_time = timeMatch[1];
    } else if (/\bfree\s+delivery\b/i.test(shippingRaw)) {
      delivery_time = "Free delivery";
    }
  }

  // Extract shipping cost info using ONLY XPath results
  const shipping_cost_free = shippingRaw ? 
    (/\bfree\s+(delivery|shipping)\b/i.test(shippingRaw) ||
     /\b(?:delivery|shipping)\s*(?:cost|price)?[:\s-]*\s*free\b/i.test(shippingRaw)) : false;

  // Extract return window using ONLY XPath results
  let return_window = "";
  if (returnsRaw) {
    const returnMatch = returnsRaw.match(/(\d+\s*(?:–|-|to)?\s*\d*\s*-?\s*day[s]?)\s*returns?\b/i);
    if (returnMatch) {
      return_window = returnMatch[1];
    }
  }
  
  // Extract return cost info using ONLY XPath results
  const return_cost_free = returnsRaw ?
    (/\bfree\s+returns?\b/i.test(returnsRaw) ||
     /\breturn\s*(?:shipping|cost)[:\s-]*\s*free\b/i.test(returnsRaw)) : false;

  // Extract e-wallets using ONLY XPath results
  const wallets = paymentsRaw ? 
    Array.from(new Set(Array.from(paymentsRaw.matchAll(/\b(Apple Pay|Google Pay|Shop Pay|PayPal|Afterpay|Klarna)\b/gi)).map(m => m[1]))) : [];
  const e_wallets = wallets.join(", ");

  const section_grades = {
    shipping: gradeFor(segment, "Shipping"),
    returns: gradeFor(segment, "Returns?|Return\\s+policy|Returns\\s+policy"),
    pricing: gradeFor(segment, "Competitive\\s+pricing"),
    payments: gradeFor(segment, "Payment\\s+options|Payment\\s+methods"),
    website: gradeFor(segment, "Website\\s+quality")
  };

  return { 
    delivery_time, 
    shipping_cost_free, 
    shippingAdditional,
    return_window, 
    return_cost_free, 
    returnsAdditional,
    e_wallets, 
    section_grades 
  };
}

function extractSignalsFromHtml(html: string, domain: string) {
  const visAll = textContent(html);
  const domRe = new RegExp("\\b(?:https?:\\/\\/)?(?:www\\.)?" + esc(domain) + "\\b", "i");
  const domIdxVis = visAll.search(domRe);
  const domIdxRaw = html.search(domRe);

  const near = domIdxRaw >= 0 ? ((s: string) => ({ start: Math.max(0, domIdxRaw - 32000), end: Math.min(s.length, domIdxRaw + 32000) }))(html) : null;
  const htmlNear = near ? html.slice(near.start, near.end) : html;

  // Logo (page image) or favicon fallback
  let logoMatch = htmlNear.match(/<img[^>]*class=["'][^"']*Kl6mye-l4eHX[^"']*["'][^>]*src=["']([^"']+)["'][^>]*>/i) || html.match(/<img[^>]*class=["'][^"']*Kl6mye-l4eHX[^"']*["'][^>]*src=["']([^"']+)["'][^>]*>/i);
  let logo_url = logoMatch ? logoMatch[1] : `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=64`;

  // Store name from h1 element
  let store_name = "";
  const storeNameMatch = htmlNear.match(/<h1[^>]*class=["'][^"']*Kl6mye-KVuj8d-V1ur5d[^"']*["'][^>]*>([^<]+)<\/h1>/i) || 
                       html.match(/<h1[^>]*class=["'][^"']*Kl6mye-KVuj8d-V1ur5d[^"']*["'][^>]*>([^<]+)<\/h1>/i);
  if (storeNameMatch) {
    store_name = decodeHtmlEntities(stripTags(storeNameMatch[1])).trim();
  }

  // TQS
  const tqsMarkers: number[] = [];
  for (const re of [
    /<span[^>]*class=["'][^"']*gmceHc-V1ur5d-fmcmS[^"']*["'][^>]*>Top\s+Quality\s+Store<\/span>/gi,
    /\b(?:aria-label|alt)\s*=\s*["']Top\s+Quality\s+Store["']/gi
  ]) tqsMarkers.push(...allIdx(html, re));
  let tqs_badge = false;
  for (const p of tqsMarkers) { const wnd = win(html, p, 2200); if (domRe.test(wnd)) { tqs_badge = true; break; } }

  // Insights
  let ins = extractStructuredInsights(html, near || undefined);
  if (!ins.delivery_time && !ins.return_window && !ins.e_wallets) ins = extractStructuredInsights(html);

  // Ratings/Reviews — robust Next-style fallbacks
  const h1Win = domIdxVis >= 0 ? win(visAll, domIdxVis, 9000) : visAll;

  // Rating candidates:
  let store_rating =
    // aria-label anywhere: “overall score ... X out of 5”
    pick(htmlNear, [/aria-label=["'][^"']*overall\s+score[^"']*?(\d+(?:\.\d+)?)\s+out\s+of\s+5[^"']*["']/i], 1) ||
    pick(html,     [/aria-label=["'][^"']*overall\s+score[^"']*?(\d+(?:\.\d+)?)\s+out\s+of\s+5[^"']*["']/i], 1) ||
    // Visible within TRyy9 block (with or without aria-label)
    pick(htmlNear, [/<div[^>]*class=["'][^"']*TRyy9-sM5MNb[^"']*["'][\s\S]{0,800}?<p[^>]*class=["'][^"']*TRyy9-TY4T7c[^"']*["'][^>]*>[\s\S]{0,120}?<span[^>]*?(?:aria-label=["'][^"']*?(\d+(?:\.\d+)?)\s+out\s+of\s+5[^"']*["'][^>]*)?[^>]*>\s*(\d+(?:\.\d+)?)?\s*<\/span>/i], 1) ||
    pick(html,     [/<div[^>]*class=["'][^"']*TRyy9-sM5MNb[^"']*["'][\s\S]{0,800}?<p[^>]*class=["'][^"']*TRyy9-TY4T7c[^"']*["'][^>]*>[\s\S]{0,120}?<span[^>]*?(?:aria-label=["'][^"']*?(\d+(?:\.\d+)?)\s+out\s+of\s+5[^"']*["'][^>]*)?[^>]*>\s*(\d+(?:\.\d+)?)?\s*<\/span>/i], 1) ||
    // Classic variants
    pick(h1Win, [
      /(?:^|\b)(\d\.\d|\d)\s*[★⭐]\s*store\s*rating\b/i,
      /(?:^|\b)(\d\.\d|\d)\s*\/\s*5\s*store\s*rating\b/i,
      /\bstore\s*rating\b[^0-9]{0,10}(\d\.\d|\d)(?=\s*(?:[★⭐]|\/\s*5|\b))/i
    ], 1) ||
    pick(visAll, [new RegExp("(?:\\b" + esc(domain) + "\\b)[\\s\\S]{0,4000}?(\\d\\.\\d|\\d)\\s*(?:[★⭐]|/\\s*5)?\\s*store\\s*rating\\b", "i")], 1);

  // Reviews candidates:
  let review_count =
    pick(htmlNear, [/store\s+rating\s*\(\s*<[^>]*>\s*([\d,]+)\s+reviews?\s*<\/span>\s*\)/i, /store\s+rating\s*\(\s*([\d,]+)\s+reviews?\s*\)/i], 1) ||
    pick(html,     [/<span[^>]*class=["'][^"']*dXIow-NnAfwf[^"']*["'][^>]*>\s*([\d,]+)\s+reviews?\s*<\/span>/i], 1) ||
    pick(h1Win,    [/\(\s*(\d{1,3}(?:,\d{3})*)\s*reviews?\s*\)/i, /(\d{1,3}(?:,\d{3})*)\s*(?:reviews|ratings)/i], 1) ||
    pick(visAll,   [new RegExp("(?:\\b" + esc(domain) + "\\b)[\\s\\S]{0,5000}?(\\d{1,3}(?:,\\d{3})*)\\s*(?:reviews|ratings)", "i")], 1);

  // Prefer numeric text inside span if aria-label wasn't captured
  if (!store_rating) {
    const numericInSpan =
      pick(htmlNear, [/<p[^>]*class=["'][^"']*TRyy9-TY4T7c[^"']*["'][^>]*>[\s\S]{0,120}?<span[^>]*>\s*(\d+(?:\.\d+)?)\s*<\/span>/i], 1) ||
      pick(html,     [/<p[^>]*class=["'][^"']*TRyy9-TY4T7c[^"']*["'][^>]*>[\s\S]{0,120}?<span[^>]*>\s*(\d+(?:\.\d+)?)\s*<\/span>/i], 1);
    if (numericInSpan) store_rating = numericInSpan;
  }

  // Extract ScamAdviser trust score if available
  let scamadviser_score = "";
  const scamadviserMatch = html.match(/ScamAdviser trust score[^>]*>[\s\S]*?<span[^>]*>(\d+)\/100<\/span>/i);
  if (scamadviserMatch) {
    scamadviser_score = scamadviserMatch[1];
  }

  const result = {
    tqs_badge,
    delivery_time: ins.delivery_time || "",
    shipping_cost_free: ins.shipping_cost_free || false,
    shipping_details: ins.shippingAdditional || "",
    return_window: ins.return_window || "",
    return_cost_free: ins.return_cost_free || false,
    return_details: ins.returnsAdditional || "",
    e_wallets: ins.e_wallets || "",
    store_rating: store_rating || "",
    review_count: review_count || "",
    scamadviser_score: scamadviser_score || "",
    section_grades: ins.section_grades,
    logo_url,
    store_name: store_name || domain
  };
  
  
  return result;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const domain = (searchParams.get("domain") || "").trim();
  const country = (searchParams.get("country") || "US").trim().toUpperCase();

  if (!domain) {
    return new Response(JSON.stringify({ error: "Missing domain" }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }

  const target = `https://www.google.com/storepages?q=${encodeURIComponent(domain)}&c=${country}&v=19`;
  try {
    const res = await fetch(target, {
      headers: { "User-Agent": "Mozilla/5.0" },
      cache: "no-store"
    });
    if (!res.ok) throw new Error(`Upstream ${res.status}`);
    const html = await res.text();
    
    
    const signals = extractSignalsFromHtml(html, domain);
    
    return new Response(JSON.stringify({ signals }), {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=60, s-maxage=300, stale-while-revalidate=300"
      }
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
