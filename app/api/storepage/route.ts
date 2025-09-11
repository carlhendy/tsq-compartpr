// app/api/storepage/route.ts
export const runtime = "nodejs";
export const preferredRegion = ["iad1", "sfo1"];

import { NextRequest } from "next/server";

function esc(s: string) { return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }
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

  // Extract data from the structured insights section based on the actual HTML structure
  function extractInsightData(seg: string, headerPattern: string) {
    // Look for the pattern: header text followed by description and grade
    // Based on the actual HTML structure from Google Store pages
    
    // First, try to find the Store Insights section
    const storeInsightsMatch = seg.match(/Store Insights[\s\S]*?(?=Other ratings|$)/i);
    if (!storeInsightsMatch) {
      // If no Store Insights section found, search the entire segment
      return extractFromSegment(seg, headerPattern);
    }
    
    const insightsSection = storeInsightsMatch[0];
    return extractFromSegment(insightsSection, headerPattern);
  }
  
  function extractFromSegment(segment: string, headerPattern: string) {
    // More flexible patterns to handle variations in HTML structure
    
    // Pattern 1: Match with description - more flexible spacing
    const re1 = new RegExp(
      `<div class="hnGZye">\\s*${headerPattern}\\s*<\/div>\\s*<div class="KtbsVc-ij8cu-fmcmS">\\s*([^<]*?)\\s*<\/div>[\\s\\S]*?<span class="rMOWke-uDEFge hnGZye[^"]*"[^>]*>\\s*([^<]*?)\\s*<\/span>`,
      "i"
    );
    
    // Pattern 2: Match without description - more flexible spacing
    const re2 = new RegExp(
      `<div class="hnGZye">\\s*${headerPattern}\\s*<\/div>[\\s\\S]*?<span class="rMOWke-uDEFge hnGZye[^"]*"[^>]*>\\s*([^<]*?)\\s*<\/span>`,
      "i"
    );
    
    // Pattern 3: Match with span description instead of div
    const re3 = new RegExp(
      `<div class="hnGZye">\\s*${headerPattern}\\s*<\/div>\\s*<span class="KtbsVc-ij8cu-fmcmS">\\s*([^<]*?)\\s*<\/span>[\\s\\S]*?<span class="rMOWke-uDEFge hnGZye[^"]*"[^>]*>\\s*([^<]*?)\\s*<\/span>`,
      "i"
    );
    
    // Pattern 4: Match Payment options with complex nested structure
    const re4 = new RegExp(
      `<div class="hnGZye">\\s*${headerPattern}\\s*<\/div>\\s*<span class="KtbsVc-ij8cu-fmcmS">[\\s\\S]*?<span[^>]*jsname="aWXQDc"[^>]*>\\s*([^<]*?)\\s*<\/span>[\\s\\S]*?<span class="rMOWke-uDEFge hnGZye[^"]*"[^>]*>\\s*([^<]*?)\\s*<\/span>`,
      "i"
    );
    
    // Pattern 4b: Alternative pattern for Payment options
    const re4b = new RegExp(
      `<div class="hnGZye">\\s*${headerPattern}\\s*<\/div>\\s*<span class="KtbsVc-ij8cu-fmcmS">\\s*([^<]*?)\\s*<\/span>[\\s\\S]*?<span class="rMOWke-uDEFge hnGZye[^"]*"[^>]*>\\s*([^<]*?)\\s*<\/span>`,
      "i"
    );
    
    // Pattern 5: Simple text-based fallback
    const re5 = new RegExp(
      `${headerPattern}[\\s\\S]*?([^\\n]*?)[\\s\\S]*?(Exceptional|Great|Good|Fair|Poor)`,
      "i"
    );
    
    // Pattern 6: Specific pattern for fields without descriptions (like Competitive pricing, Website quality)
    // <div class="hnGZye">Competitive pricing</div>...<span class="rMOWke-uDEFge hnGZye">Great</span>
    const re6 = new RegExp(
      `<div class="hnGZye">\\s*${headerPattern}\\s*<\/div>[\\s\\S]*?<span class="rMOWke-uDEFge hnGZye[^"]*"[^>]*>\\s*(Exceptional|Great|Good|Fair|Poor)\\s*<\/span>`,
      "i"
    );
    
    // Pattern 7: More specific pattern for competitive pricing and website quality
    // Based on the actual HTML structure: <div class="hnGZye">Competitive pricing</div>...<span class="rMOWke-uDEFge hnGZye">Good</span>
    const re7 = new RegExp(
      `<div class="hnGZye">\\s*${headerPattern}\\s*<\/div>[\\s\\S]*?<span class="rMOWke-uDEFge hnGZye[^"]*"[^>]*>\\s*(Exceptional|Great|Good|Fair|Poor)\\s*<\/span>`,
      "i"
    );
    
    // Pattern 8: Even more flexible pattern for competitive pricing and website quality
    const re8 = new RegExp(
      `${headerPattern}[\\s\\S]*?<span[^>]*class="rMOWke-uDEFge hnGZye[^"]*"[^>]*>\\s*(Exceptional|Great|Good|Fair|Poor)\\s*<\/span>`,
      "i"
    );
    
    // Pattern 9: Very specific pattern for competitive pricing and website quality
    // Based on the exact HTML structure from the user's example
    const re9 = new RegExp(
      `<div class="hnGZye">\\s*${headerPattern}\\s*<\/div>[\\s\\S]*?<span class="rMOWke-uDEFge hnGZye[^"]*"[^>]*>\\s*(Exceptional|Great|Good|Fair|Poor)\\s*<\/span>`,
      "i"
    );
    
    // Pattern 10: Fallback pattern that looks for the header followed by any grade
    const re10 = new RegExp(
      `${headerPattern}[\\s\\S]*?(Exceptional|Great|Good|Fair|Poor)`,
      "i"
    );
    
    let m = segment.match(re1);
    if (!m) {
      m = segment.match(re2);
    }
    if (!m) {
      m = segment.match(re3);
    }
    if (!m) {
      m = segment.match(re4);
    }
    if (!m) {
      m = segment.match(re4b);
    }
    if (!m) {
      m = segment.match(re5);
    }
    if (!m) {
      m = segment.match(re6);
    }
    if (!m) {
      m = segment.match(re7);
    }
    if (!m) {
      m = segment.match(re8);
    }
    if (!m) {
      m = segment.match(re9);
    }
    if (!m) {
      m = segment.match(re10);
    }
    
    return {
      description: m && m[1] ? stripTags(m[1]) : "",
      grade: m && m[2] ? stripTags(m[2]) : ""
    };
  }

  // Debug: Log the segment we're working with
  console.log(`Working with segment length: ${segment.length}`);
  console.log(`Segment contains 'Competitive pricing': ${segment.includes('Competitive pricing')}`);
  console.log(`Segment contains 'Website quality': ${segment.includes('Website quality')}`);
  console.log(`Segment contains 'Payment options': ${segment.includes('Payment options')}`);

  // Extract shipping data
  const shippingData = extractInsightData(segment, "Shipping");
  const shippingRaw = shippingData.description;
  const shippingGrade = shippingData.grade;

  // Extract returns data
  const returnsData = extractInsightData(segment, "Returns");
  const returnsRaw = returnsData.description;
  const returnsGrade = returnsData.grade;

  // Extract payment options data
  const paymentsData = extractInsightData(segment, "Payment options");
  const paymentsRaw = paymentsData.description;
  const paymentsGrade = paymentsData.grade;
  
  // Debug: Log what we're getting for payment options
  console.log(`Payment options - description: "${paymentsData.description}", grade: "${paymentsData.grade}"`);

  // Extract website quality data
  const websiteData = extractInsightData(segment, "Website quality");
  const websiteGrade = websiteData.grade;
  
  // Debug: Log what we're getting for website quality
  console.log(`Website quality - description: "${websiteData.description}", grade: "${websiteData.grade}"`);

  // Extract competitive pricing data
  const pricingData = extractInsightData(segment, "Competitive pricing");
  const pricingGrade = pricingData.grade;
  
  // Debug: Log what we're getting for competitive pricing
  console.log(`Competitive pricing - description: "${pricingData.description}", grade: "${pricingData.grade}"`);

  // Delivery time - extract from shipping description
  let delivery_time = "";
  if (shippingRaw) {
    // Look for time patterns in shipping description
    const timeMatch = shippingRaw.match(/(\d+\s*(?:–|-|to)?\s*\d*\s*-?\s*day[s]?)/i);
    if (timeMatch) {
      delivery_time = timeMatch[1];
    } else if (/\bfree\s+delivery\b/i.test(shippingRaw)) {
      delivery_time = "Free delivery";
    }
  }

  const shipping_cost_free =
    /\bfree\s+(delivery|shipping)\b/i.test(shippingRaw) ||
    /\b(?:delivery|shipping)\s*(?:cost|price)?[:\s-]*\s*free\b/i.test(shippingRaw);

  // Return window - extract from returns description
  let return_window = "";
  if (returnsRaw) {
    const timeMatch = returnsRaw.match(/(\d+\s*(?:–|-|to)?\s*\d*\s*-?\s*day[s]?)/i);
    if (timeMatch) {
      return_window = timeMatch[1];
    }
  }

  const return_cost_free =
    /\bfree\s+returns?\b/i.test(returnsRaw) ||
    /\breturn\s*(?:shipping|cost)[:\s-]*\s*free\b/i.test(returnsRaw);

  // Extract payment wallets from the payment options description
  const wallets = Array.from(new Set(Array.from((paymentsRaw || "").matchAll(/\b(Apple Pay|Google Pay|Shop Pay|PayPal|Afterpay|Klarna|Stripe|Square)\b/gi)).map(m => m[1])));
  const e_wallets = wallets.join(", ");

  const section_grades = {
    shipping: shippingGrade,
    returns: returnsGrade,
    pricing: pricingGrade,
    payments: paymentsGrade,
    website: websiteGrade
  };

  return { delivery_time, shipping_cost_free, return_window, return_cost_free, e_wallets, section_grades };
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

  return {
    tqs_badge,
    delivery_time: ins.delivery_time || "",
    shipping_cost_free: ins.shipping_cost_free || false,
    return_window: ins.return_window || "",
    return_cost_free: ins.return_cost_free || false,
    e_wallets: ins.e_wallets || "",
    store_rating: store_rating || "",
    review_count: review_count || "",
    scamadviser_score: scamadviser_score || "",
    section_grades: ins.section_grades,
    logo_url
  };
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
