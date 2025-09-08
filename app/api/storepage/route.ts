// Force US execution on Vercel
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
  for (const re of res) { const m = text.match(re); if (m && m[gi]) return m[gi].trim(); }
  return "";
}
function allIdx(text: string, re: RegExp) {
  const out: number[] = []; const g = new RegExp(re.source, re.flags.includes("g") ? re.flags : re.flags + "g");
  let m: RegExpExecArray | null; while ((m = g.exec(text))) out.push(m.index); return out;
}
function win(s: string, i: number, radius: number) { const a = Math.max(0, i - radius); const b = Math.min(s.length, i + radius); return s.slice(a, b); }

// ---- Structured Insights parsers ----
function extractStructuredInsights(html: string, scopeHint?: {start: number, end: number}) {
  const segment = scopeHint ? html.slice(scopeHint.start, scopeHint.end) : html;

  // Helper to capture value after a labeled header, being flexible with spans/divs and whitespace
  function afterHeader(seg: string, header: string) {
    const re = new RegExp(
      `<div[^>]*class=["']hnGZye["'][^>]*>\\s*${header}\\s*<\\/div>[\\s\\S]{0,200}?<(?:(?:div)|(?:span))[^>]*class=["']KtbsVc-ij8cu-fmcmS[^"']*["'][^>]*>([\\s\\S]*?)<\\/(?:div|span)>`,
      "i"
    );
    const m = seg.match(re);
    return m ? stripTags(m[1]) : "";
  }

  const shippingRaw = afterHeader(segment, "Shipping");
  const returnsRaw  = afterHeader(segment, "Returns?");
  // Payment options block: inner spans, choose expanded NBMhyb if present
  let paymentsRaw = "";
  const payBlock = segment.match(new RegExp(
    `<div[^>]*class=["']hnGZye["'][^>]*>\\s*Payment options\\s*<\\/div>[\\s\\S]{0,200}?<span[^>]*class=["']KtbsVc-ij8cu-fmcmS[^"']*["'][^>]*>([\\s\\S]*?)<\\/span>`, "i"
  ));
  if (payBlock) {
    const expanded = payBlock[1].match(/<span[^>]*class=["']NBMhyb["'][^>]*>([\s\S]*?)<\/span>/i);
    const primary  = payBlock[1].match(/<span[^>]*jsname=["']u5tB8["'][^>]*>([\s\S]*?)<\/span>/i);
    paymentsRaw = stripTags((expanded && expanded[1]) || (primary && primary[1]) || payBlock[1]);
  }

  // ---- Section grades (Exceptional/Great/Good/Fair/Poor)
  function gradeFor(seg: string, header: string): string {
    const re = new RegExp(
      `<div[^>]*class=["']hnGZye["'][^>]*>\\s*${header}\\s*<\\/div>[\\s\\S]{0,300}?<span[^>]*class=["']rMOWke-uDEFge\\s+hnGZye[^"']*["'][^>]*>\\s*(Exceptional|Great|Good|Fair|Poor)\\s*<\\/span>`,
      "i"
    );
    const m = seg.match(re);
    return m ? stripTags(m[1]) : "";
  }

  // Delivery time: accept "1 day", "1-day", "3–5 days", etc.
  const delivery_time = pick([shippingRaw, returnsRaw, paymentsRaw].join(" "), [
    /(?:£|\$|€)\s*\d+(?:\.\d{2})?[^a-zA-Z]{0,6}(\d+\s*(?:–|-|to)?\s*\d*\s*-?\s*day[s]?)/i,
    /(\d+\s*(?:–|-|to)?\s*\d*\s*-?\s*day[s]?)\s*(?:delivery|ship|shipping)\b/i,
    /deliver[s]?\s+in\s+(\d+\s*(?:–|-|to)?\s*\d*\s*-?\s*day[s]?)/i,
  ], 1);

  const shipping_cost_free = /\bfree\s+(delivery|shipping)\b/i.test(shippingRaw) || /\b(?:delivery|shipping)\s*(?:cost|price)?[:\s-]*\s*free\b/i.test(shippingRaw);

  const return_window = pick(returnsRaw, [
    /(\d+\s*(?:–|-|to)?\s*\d*\s*-?\s*day[s]?)\s*returns?\b/i,
    /returns?\s*(?:within|in)?\s*(\d+\s*(?:–|-|to)?\s*\d*\s*-?\s*day[s]?)/i,
    /return\s*(?:window|period)[:\s-]*\s*(\d+\s*(?:–|-|to)?\s*\d*\s*-?\s*day[s]?)/i
  ], 1);
  const return_cost_free = /\bfree\s+returns?\b/i.test(returnsRaw) || /\breturn\s*(?:shipping|cost)[:\s-]*\s*free\b/i.test(returnsRaw);

  // Wallets list
  const wallets = Array.from(new Set(Array.from((paymentsRaw || "").matchAll(/\b(Apple Pay|Google Pay|Shop Pay|PayPal|Afterpay|Klarna)\b/gi)).map(m => m[1])));
  const e_wallets = wallets.join(", ");

  const section_grades = {
    shipping: gradeFor(segment, "Shipping"),
    returns: gradeFor(segment, "Returns?"),
    pricing: gradeFor(segment, "Competitive\\s+pricing"),
    payments: gradeFor(segment, "Payment options"),
    website: gradeFor(segment, "Website\\s+quality"),
  };

  return { delivery_time, shipping_cost_free, return_window, return_cost_free, e_wallets, section_grades };
}

// ---- Main extraction ----
function extractSignalsFromHtml(html: string, domain: string) {
  const visAll = textContent(html);
  const domRe = new RegExp("\\b(?:https?:\\/\\/)?(?:www\\.)?" + esc(domain) + "\\b", "i");
  const domIdxVis = visAll.search(domRe);
  const domIdxRaw = html.search(domRe);

  // Define a broad window around the domain (±20k chars), plus a global fallback
  const near = domIdxRaw >= 0 ? (s => ({ start: Math.max(0, domIdxRaw - 20000), end: Math.min(s.length, domIdxRaw + 20000) }))(html) : null;

  // Logo in the near segment, else global
  const htmlNear = near ? html.slice(near.start, near.end) : html;
  let logoMatch = htmlNear.match(/<img[^>]*class=["']Kl6mye-l4eHX["'][^>]*src=["']([^"']+)["'][^>]*>/i);
  if (!logoMatch) {
    logoMatch = html.match(/<img[^>]*class=["']Kl6mye-l4eHX["'][^>]*src=["']([^"']+)["'][^>]*>/i);
  }
  const logo_url = logoMatch ? logoMatch[1] : "";

  // TQS detection near same segment
  const tqsMarkers: number[] = [];
  for (const re of [
    /<span[^>]*class=["'][^"']*gmceHc-V1ur5d-fmcmS[^"']*["'][^>]*>Top\s+Quality\s+Store<\/span>/gi,
    /\b(?:aria-label|alt)\s*=\s*["']Top\s+Quality\s+Store["']/gi,
  ]) tqsMarkers.push(...allIdx(html, re));
  let tqs_badge = false;
  for (const p of tqsMarkers) {
    const wnd = win(html, p, 2000);
    if (domRe.test(wnd)) { tqs_badge = true; break; }
  }

  // Structured Insights near domain
  let ins = extractStructuredInsights(html, near || undefined);

  // If missing core fields, do a global fallback parse
  const needsGlobal = (!ins.delivery_time && !ins.return_window && !ins.e_wallets);
  if (needsGlobal) {
    ins = extractStructuredInsights(html);
  }

  // Rating / Reviews from H1 near domain
  const h1Win = domIdxVis >= 0 ? win(visAll, domIdxVis, 4000) : visAll;
  let store_rating = pick(h1Win, [
    /(?:^|\b)(\d\.\d|\d)\s*[★⭐]\s*store\s*rating\b/i,
    /(?:^|\b)(\d\.\d|\d)\s*\/\s*5\s*store\s*rating\b/i,
    /\bstore\s*rating\b[^0-9]{0,10}(\d\.\d|\d)(?=\s*(?:[★⭐]|\/\s*5|\b))/i,
  ], 1);
  let review_count = pick(h1Win, [
    /\(\s*(\d{1,3}(?:,\d{3})*)\s*reviews?\s*\)/i,
    /(\d{1,3}(?:,\d{3})*)\s*(?:reviews|ratings)/i,
  ], 1);

  if (!store_rating) {
    store_rating = pick(visAll, [new RegExp("(?:\\b" + esc(domain) + "\\b)[\\s\\S]{0,2000}?(\\d\\.\\d|\\d)\\s*(?:[★⭐]|/\\s*5)?\\s*store\\s*rating\\b", "i")], 1);
  }
  if (!review_count) {
    review_count = pick(visAll, [new RegExp("(?:\\b" + esc(domain) + "\\b)[\\s\\S]{0,2200}?(\\d{1,3}(?:,\\d{3})*)\\s*(?:reviews|ratings)", "i")], 1);
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
    section_grades: ins.section_grades,
    logo_url,
  };
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const domain = (searchParams.get("domain") || "").trim();
  const country = (searchParams.get("country") || "US").trim().toUpperCase();

  if (!domain) {
    return new Response(JSON.stringify({ error: "Missing domain" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const target = `https://www.google.com/storepages?q=${encodeURIComponent(domain)}&c=${country}&v=19`;
  try {
    const res = await fetch(target, {
      headers: { "User-Agent": "Mozilla/5.0" },
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`Upstream ${res.status}`);
    const html = await res.text();
    const signals = extractSignalsFromHtml(html, domain);
    return new Response(JSON.stringify({ signals }), {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=60, s-maxage=300, stale-while-revalidate=300",
      },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
