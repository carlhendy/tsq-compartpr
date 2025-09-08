// Force US execution on Vercel
export const runtime = "nodejs";
export const preferredRegion = ["iad1", "sfo1"];

import { NextRequest } from "next/server";

function escapeRe(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function stripVisible(html: string) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<\/?[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function pickFirst(text: string, patterns: RegExp[], groupIndex = 1): string {
  for (const re of patterns) {
    const m = text.match(re);
    if (m && m[groupIndex]) return (m[groupIndex] + "").trim();
  }
  return "";
}

function allIdx(text: string, re: RegExp) {
  const out: number[] = [];
  const g = new RegExp(re.source, re.flags.includes("g") ? re.flags : re.flags + "g");
  let m: RegExpExecArray | null;
  while ((m = g.exec(text))) out.push(m.index);
  return out;
}

function slice(s: string, i: number, radius: number) {
  const start = Math.max(0, i - radius);
  const end = Math.min(s.length, i + radius);
  return s.slice(start, end);
}

function extractSignalsFromHtml(html: string, domain: string, debugMode = false) {
  const visibleAll = stripVisible(html);
  const domRe = new RegExp("\\b(?:https?:\\/\\/)?(?:www\\.)?" + escapeRe(domain) + "\\b", "i");

  // --- TQS detection ---
  // Accept any of:
  //  - explicit span with known class
  //  - aria/alt attribute
  //  - visible text "Top Quality Store"
  // BUT only if a mention of the queried domain appears within +/- 1000 chars of the marker (to ensure it's the same card).
  const tqsMarkers: number[] = [];
  const classIdx = allIdx(html, /<span[^>]*class=["'][^"']*gmceHc-V1ur5d-fmcmS[^"']*["'][^>]*>Top\s+Quality\s+Store<\/span>/gi);
  tqsMarkers.push(...classIdx);
  const ariaAltIdx = allIdx(html, /\b(?:aria-label|alt)\s*=\s*["']Top\s+Quality\s+Store["']/gi);
  tqsMarkers.push(...ariaAltIdx);
  const textIdx = allIdx(visibleAll, /\bTop\s+Quality\s+Store\b/gi);
  tqsMarkers.push(...textIdx);

  let tqs_badge = false;
  for (const pos of tqsMarkers) {
    const windowRaw = slice(html, pos, 1000);
    const windowVis = stripVisible(windowRaw);
    if (domRe.test(windowRaw) || domRe.test(windowVis)) {
      tqs_badge = true; break;
    }
  }

  // --- Signals ---
  // Prefer a window around the first domain mention, else whole page visible text
  const domHitRaw = html.search(domRe);
  const visWin = domHitRaw >= 0 ? stripVisible(slice(html, domHitRaw, 5000)) : visibleAll;

  const delivery_time = pickFirst(visWin, [
    /(\d+\s*(?:–|-|to)?\s*\d*\s*(?:business\s*)?(?:working\s*)?day[s]?)[^\n]{0,80}?(delivery|shipping)/i,
    /(delivery|shipping)[^\n]{0,120}?(?:time|speed)[^\n]{0,60}?(\d+\s*(?:–|-|to)?\s*\d*\s*(?:business\s*)?(?:working\s*)?day[s]?)/i
  ], 1);

  const shipping_cost_free = /\bfree\s+(?:shipping|delivery)\b/i.test(visWin);

  const return_window = pickFirst(visWin, [
    /(\d+\s*(?:–|-|to)?\s*\d*\s*day[s]?)[^\n]{0,80}?\breturn/i,
    /(return|refund)[^\n]{0,120}?(window|period)[^\n]{0,60}?(\d+\s*(?:–|-|to)?\s*\d*\s*day[s]?)/i
  ], 1) || pickFirst(visWin, [/\b([0-9]+\s*day[s]?)\s*returns?\b/i], 1);

  const return_cost_free = /\bfree\s+returns?\b|\bfree\s+return\s+shipping\b/i.test(visWin);

  const walletsSet = new Set(Array.from(visWin.matchAll(/(Apple Pay|Google Pay|Shop Pay|PayPal|Afterpay|Klarna)/gi)).map(m => m[1]));
  const e_wallets = Array.from(walletsSet).join(", ");

  let store_rating = pickFirst(visWin, [
    /(\d\.\d)\s*★/,
    /(\d\.\d)\s*\/\s*5/,
    /store\s*rating[^]{0,80}?(\d\.\d)/i
  ], 1);

  let review_count = pickFirst(visWin, [
    /(\d{1,3}(?:,\d{3})*)\s*(?:reviews|ratings)/i,
    /based\s+on\s+(\d{1,3}(?:,\d{3})*)\s*(?:reviews|ratings)/i
  ], 1);

  // Final fallback: domain-bounded on full visible text
  if (!store_rating) {
    const m = visibleAll.match(new RegExp("(?:\\b" + escapeRe(domain) + "\\b)[\\s\\S]{0,900}?(\\d\\.\\d)\\s*(?:★|/\\s*5)", "i"));
    if (m) store_rating = m[1];
  }
  if (!review_count) {
    const m = visibleAll.match(new RegExp("(?:\\b" + escapeRe(domain) + "\\b)[\\s\\S]{0,1000}?(\\d{1,3}(?:,\\d{3})*)\\s*(?:reviews|ratings)", "i"));
    if (m) review_count = m[1];
  }

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

  return payload;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const domain = (searchParams.get("domain") || "").trim();
  const country = searchParams.get("country") || "US";

  if (!domain) {
    return new Response(JSON.stringify({ error: "Missing domain" }), { status: 400, headers: { "Content-Type": "application/json" } });
  }

  const target = `https://www.google.com/storepages?q=${encodeURIComponent(domain)}&c=${country}&v=19`;
  try {
    const res = await fetch(target, { headers: { "User-Agent": "Mozilla/5.0" }, cache: "no-store" });
    if (!res.ok) throw new Error(`Upstream ${res.status}`);
    const html = await res.text();
    const signals = extractSignalsFromHtml(html, domain, false);
    return new Response(JSON.stringify({ signals }), {
      headers: { "Content-Type": "application/json", "Cache-Control": "public, max-age=60, s-maxage=300, stale-while-revalidate=300" }
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
}
