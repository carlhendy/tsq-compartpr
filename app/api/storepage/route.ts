// app/api/storepage/route.ts
export const runtime = "nodejs";
export const preferredRegion = ["iad1", "sfo1"];

import { NextRequest } from "next/server";

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

  function afterHeader(seg: string, headerPattern: string) {
    const re = new RegExp(
      `<(?:div|span)[^>]*class=["']hnGZye["'][^>]*>\\s*(?:${headerPattern})\\s*<\\/(?:div|span)>[\\s\\S]{0,280}?<(?:(?:div)|(?:span))[^>]*class=["']KtbsVc-ij8cu-fmcmS[^"']*["'][^>]*>([\\s\\S]*?)<\\/(?:div|span)>`,
      "i"
    );
    const m = seg.match(re);
    return m ? stripTags(m[1]) : "";
  }

  const shippingRaw = afterHeader(segment, "Shipping");
  const returnsRaw  = afterHeader(segment, "Returns?|Return\\s+policy|Returns\\s+policy");
  let paymentsRaw = "";
  const payBlock = segment.match(
    new RegExp(
      `<(?:div|span)[^>]*class=["']hnGZye["'][^>]*>\\s*(?:Payment\\s+options|Payment\\s+methods)\\s*<\\/(?:div|span)>[\\s\\S]{0,280}?<span[^>]*class=["']KtbsVc-ij8cu-fmcmS[^"']*["'][^>]*>([\\s\\S]*?)<\\/span>`,
      "i"
    )
  );
  if (payBlock) {
    const expanded = payBlock[1].match(/<span[^>]*class=["']NBMhyb["'][^>]*>([\s\S]*?)<\/span>/i);
    const primary  = payBlock[1].match(/<span[^>]*jsname=["']u5tB8["'][^>]*>([\s\S]*?)<\/span>/i);
    paymentsRaw = stripTags((expanded && expanded[1]) || (primary && primary[1]) || payBlock[1]);
  }

  function gradeFor(seg: string, headerPattern: string): string {
    const re = new RegExp(
      `<(?:div|span)[^>]*class=["']hnGZye["'][^>]*>\\s*(?:${headerPattern})\\s*<\\/(?:div|span)>[\\s\\S]{0,420}?<span[^>]*class=["']rMOWke-uDEFge\\s+hnGZye[^"']*["'][^>]*>\\s*(Exceptional|Great|Good|Fair|Poor)\\s*<\\/span>`,
      "i"
    );
    const m = seg.match(re);
    return m ? stripTags(m[1]) : "";
  }

  // Delivery time
  let delivery_time = pick(
    [shippingRaw, returnsRaw, paymentsRaw].join(" "),
    [
      /(?:£|\$|€)\s*\d+(?:\.\d{2})?[^a-zA-Z]{0,6}(\d+\s*(?:–|-|to)?\s*\d*\s*-?\s*day[s]?)/i,
      /(\d+\s*(?:–|-|to)?\s*\d*\s*-?\s*day[s]?)\s*(?:delivery|ship|shipping)\b/i,
      /deliver[s]?\s+in\s+(\d+\s*(?:–|-|to)?\s*\d*\s*-?\s*day[s]?)/i
    ],
    1
  );
  if (!delivery_time && /\bfree\s+delivery\b/i.test(shippingRaw)) {
    delivery_time = "Free delivery";
  }

  const shipping_cost_free =
    /\bfree\s+(delivery|shipping)\b/i.test(shippingRaw) ||
    /\b(?:delivery|shipping)\s*(?:cost|price)?[:\s-]*\s*free\b/i.test(shippingRaw);

  const return_window = pick(
    returnsRaw,
    [
      /(\d+\s*(?:–|-|to)?\s*\d*\s*-?\s*day[s]?)\s*returns?\b/i,
      /returns?\s*(?:within|in)?\s*(\d+\s*(?:–|-|to)?\s*\d*\s*-?\s*day[s]?)/i,
      /return\s*(?:window|period|policy)[:\s-]*\s*(\d+\s*(?:–|-|to)?\s*\d*\s*-?\s*day[s]?)/i
    ],
    1
  );
  const return_cost_free =
    /\bfree\s+returns?\b/i.test(returnsRaw) ||
    /\breturn\s*(?:shipping|cost)[:\s-]*\s*free\b/i.test(returnsRaw);

  const wallets = Array.from(new Set(Array.from((paymentsRaw || "").matchAll(/\b(Apple Pay|Google Pay|Shop Pay|PayPal|Afterpay|Klarna)\b/gi)).map(m => m[1])));
  const e_wallets = wallets.join(", ");

  const section_grades = {
    shipping: gradeFor(segment, "Shipping"),
    returns: gradeFor(segment, "Returns?|Return\\s+policy|Returns\\s+policy"),
    pricing: gradeFor(segment, "Competitive\\s+pricing"),
    payments: gradeFor(segment, "Payment\\s+options|Payment\\s+methods"),
    website: gradeFor(segment, "Website\\s+quality")
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
    logo_url,
    store_name: store_name || domain
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
