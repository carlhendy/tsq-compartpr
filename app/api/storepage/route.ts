// Force US execution on Vercel
export const runtime = "nodejs";
export const preferredRegion = ["iad1", "sfo1"]; // or: export const regions = ["iad1"];

import { NextRequest } from "next/server";

/** Safely pick the first matching capture group from a list of regexes */
function pickFirst(html: string, patterns: RegExp[], groupIndex = 1): string {
  for (const re of patterns) {
    const m = html.match(re);
    if (m && m[groupIndex]) return m[groupIndex].trim();
  }
  return "";
}

/** Extract visible text and scorecard-like signals from Google Store Pages HTML */
function extractSignalsFromHtml(html: string, debugMode = false) {
  const matches: string[] = [];

  // Build a visible-text version of the page to avoid false positives in scripts/styles
  const visible = html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<\/?[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  // Strict TQS detection: visible text or explicit alt/aria-label only
  const tqs_badge =
    /\baria-label\s*=\s*["']Top\s+Quality\s+Store["']/i.test(html) ||
    /\balt\s*=\s*["']Top\s+Quality\s+Store["']/i.test(html) ||
    /\bTop\s+Quality\s+Store\b/.test(visible);
  if (tqs_badge) matches.push("badge:TQS");

  const delivery_time = pickFirst(visible, [
    /(\d+\s*(?:–|-|to)?\s*\d*\s*(?:business\s*)?(?:working\s*)?day[s]?)[^\n]{0,40}?(delivery|shipping)/i,
    /(delivery|shipping)[^\n]{0,80}?(?:time|speed)[^\n]{0,40}?(\d+\s*(?:–|-|to)?\s*\d*\s*(?:business\s*)?(?:working\s*)?day[s]?)/i
  ], 1);

  const shipping_cost_free = /\bfree\s+(?:shipping|delivery)\b/i.test(visible);
  if (shipping_cost_free) matches.push("free_shipping:true");

  const return_window = pickFirst(visible, [
    /(\d+\s*(?:–|-|to)?\s*\d*\s*day[s]?)[^\n]{0,40}?\breturn/i,
    /(return|refund)[^\n]{0,80}?(window|period)[^\n]{0,40}?(\d+\s*(?:–|-|to)?\s*\d*\s*day[s]?)/i
  ], 1) || pickFirst(visible, [/\b([0-9]+\s*day[s]?)\s*returns?\b/i], 1);

  const return_cost_free = /\bfree\s+returns?\b|\bfree\s+return\s+shipping\b/i.test(visible);
  if (return_cost_free) matches.push("free_returns:true");

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
  if (debugMode) payload.debug = { matchedPhrases: matches.slice(0, 20) };
  return payload;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const domain = searchParams.get("domain");
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
    const res = await fetch(target, {
      headers: { "User-Agent": "Mozilla/5.0" },
      cache: "no-store"
    });
    if (!res.ok) throw new Error(`Upstream ${res.status}`);
    const html = await res.text();
    const signals = extractSignalsFromHtml(html, debug);
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
