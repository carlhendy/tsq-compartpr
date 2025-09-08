// Force US execution on Vercel
export const runtime = "nodejs";
export const preferredRegion = ["iad1", "sfo1"]; // or: export const regions = ["iad1"];

import { NextRequest } from "next/server";

/** Escape string for RegExp */
function escapeRe(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Pick first capture from patterns */
function pickFirst(text: string, patterns: RegExp[], groupIndex = 1): string {
  for (const re of patterns) {
    const m = text.match(re);
    if (m && m[groupIndex]) return m[groupIndex].trim();
  }
  return "";
}

/** Extract visible text and signals scoped to the card that mentions the queried domain */
function extractSignalsFromHtml(html: string, domain: string, debugMode = false) {
  // Build visible text
  const visibleAll = html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<\/?[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  // Find the part of the page that actually mentions the queried domain
  const domRe = new RegExp("\\b(?:www\\.)?" + escapeRe(domain) + "\\b", "i");
  const hit = visibleAll.search(domRe);
  let visible = visibleAll;
  let htmlScope = html;
  if (hit >= 0) {
    const start = Math.max(0, hit - 1500);
    const end = Math.min(visibleAll.length, hit + 1500);
    visible = visibleAll.slice(start, end);
    // For HTML, scope a larger window to keep attributes
    const rawHit = html.search(domRe);
    const rStart = Math.max(0, rawHit >= 0 ? rawHit - 5000 : 0);
    const rEnd = Math.min(html.length, rawHit >= 0 ? rawHit + 5000 : html.length);
    htmlScope = html.slice(rStart, rEnd);
  }

  // Strict TQS detection: only within the domain-scoped segment
  const tqs_badge =
    /\baria-label\s*=\s*["']Top\s+Quality\s+Store["']/i.test(htmlScope) ||
    /\balt\s*=\s*["']Top\s+Quality\s+Store["']/i.test(htmlScope) ||
    /\bTop\s+Quality\s+Store\b/.test(visible);

  // Other fields (also scoped)
  const delivery_time = pickFirst(visible, [
    /(\d+\s*(?:–|-|to)?\s*\d*\s*(?:business\s*)?(?:working\s*)?day[s]?)[^\n]{0,40}?(delivery|shipping)/i,
    /(delivery|shipping)[^\n]{0,80}?(?:time|speed)[^\n]{0,40}?(\d+\s*(?:–|-|to)?\s*\d*\s*(?:business\s*)?(?:working\s*)?day[s]?)/i
  ], 1);

  const shipping_cost_free = /\bfree\s+(?:shipping|delivery)\b/i.test(visible);

  const return_window = pickFirst(visible, [
    /(\d+\s*(?:–|-|to)?\s*\d*\s*day[s]?)[^\n]{0,40}?\breturn/i,
    /(return|refund)[^\n]{0,80}?(window|period)[^\n]{0,40}?(\d+\s*(?:–|-|to)?\s*\d*\s*day[s]?)/i
  ], 1) || pickFirst(visible, [/\b([0-9]+\s*day[s]?)\s*returns?\b/i], 1);

  const return_cost_free = /\bfree\s+returns?\b|\bfree\s+return\s+shipping\b/i.test(visible);

  const walletsSet = new Set(Array.from(visible.matchAll(/(Apple Pay|Google Pay|Shop Pay|PayPal|Afterpay|Klarna)/gi)).map(m => m[1]));
  const e_wallets = Array.from(walletsSet).join(", ");

  const store_rating = pickFirst(visible, [
    /(\d\.\d)\s*\/\s*5/,
    /rating[^\n]{0,40}?(\d\.\d)/i
  ], 1);

  const review_count = pickFirst(visible, [
    /(\d{2,}(?:,\d{3})*)\s*(?:reviews|ratings)/i,
    /based\s+on\s+(\d{2,}(?:,\d{3})*)/i
  ], 1);

  const payload: any = {
    tqs_badge,
    delivery_time,
    shipping_cost_free,
    return_window,
    return_cost_free,
    e_wallets,
    store_rating,
    review_count
  };

  if (debugMode) {
    payload.debug = {
      windowed: hit >= 0,
      sample: visible.slice(0, 240)
    };
  }
  return payload;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const domain = (searchParams.get("domain") || "").trim();
  const country = searchParams.get("country") || "US";
  const debug = !!searchParams.get("debug");

  if (!domain) {
    return new Response(JSON.stringify({ error: "Missing domain" }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }

  const target = `https://www.google.com/storepages?q=${encodeURIComponent(domain)}&c=${country}&v=19`;
  try {
    const res = await fetch(target, { headers: { "User-Agent": "Mozilla/5.0" }, cache: "no-store" });
    if (!res.ok) throw new Error(`Upstream ${res.status}`);
    const html = await res.text();
    const signals = extractSignalsFromHtml(html, domain, debug);
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
