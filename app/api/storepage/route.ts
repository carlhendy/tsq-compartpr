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

function allMatches(text: string, re: RegExp): number[] {
  const idxs: number[] = [];
  const g = new RegExp(re.source, re.flags.includes("g") ? re.flags : re.flags + "g");
  let m: RegExpExecArray | null;
  while ((m = g.exec(text))) {
    idxs.push(m.index);
    if (m.index === g.lastIndex) g.lastIndex++;
  }
  return idxs;
}

function windowAround(s: string, i: number, radius: number) {
  const start = Math.max(0, i - radius);
  const end = Math.min(s.length, i + radius);
  return s.slice(start, end);
}

function extractSignalsFromHtml(html: string, domain: string, debugMode = false) {
  const notes: string[] = [];
  const visibleAll = stripVisible(html);
  const domRe = new RegExp("\\b(?:https?:\\/\\/)?(?:www\\.)?" + escapeRe(domain) + "\\b", "i");
  const hits = allMatches(visibleAll, domRe);
  if (hits.length === 0) notes.push("domain not found in visible text; falling back to whole page");

  // Build windows around each domain mention and analyze the best one
  const windows = (hits.length ? hits : [0]).map((i) => {
    const vis = windowAround(visibleAll, i, 3000);
    const rawIdx = Math.max(0, html.search(domRe));
    const raw = windowAround(html, rawIdx, 5000);
    return { i, vis, raw };
  });

  // Choose the window that contains the most relevant keywords
  let best = windows[0];
  let bestScore = -1;
  for (const w of windows) {
    let score = 0;
    if (/\bTop\s+Quality\s+Store\b/i.test(w.vis)) score += 3;
    if (/store\s*rating/i.test(w.vis)) score += 2;
    if (/\breviews?\b/i.test(w.vis)) score += 2;
    if (/Apple Pay|Google Pay|Shop Pay|PayPal|Afterpay|Klarna/i.test(w.vis)) score += 1;
    if (score > bestScore) { best = w; bestScore = score; }
  }

  // TQS must be within a tight window near the domain so other cards don't leak
  const nearVis = windowAround(best.vis, Math.max(0, best.i - 1500), 2000);
  const nearRaw = best.raw;
  const tqs_badge =
    /\baria-label\s*=\s*["']Top\s+Quality\s+Store["']/i.test(nearRaw) ||
    /\balt\s*=\s*["']Top\s+Quality\s+Store["']/i.test(nearRaw) ||
    /\bTop\s+Quality\s+Store\b/.test(nearVis);

  // Delivery / Shipping
  const delivery_time = pickFirst(nearVis, [
    /(\d+\s*(?:–|-|to)?\s*\d*\s*(?:business\s*)?(?:working\s*)?day[s]?)[^\n]{0,60}?(delivery|shipping)/i,
    /(delivery|shipping)[^\n]{0,100}?(?:time|speed)[^\n]{0,40}?(\d+\s*(?:–|-|to)?\s*\d*\s*(?:business\s*)?(?:working\s*)?day[s]?)/i
  ], 1);

  const shipping_cost_free = /\bfree\s+(?:shipping|delivery)\b/i.test(nearVis);

  // Returns
  const return_window = pickFirst(nearVis, [
    /(\d+\s*(?:–|-|to)?\s*\d*\s*day[s]?)[^\n]{0,60}?\breturn/i,
    /(return|refund)[^\n]{0,80}?(window|period)[^\n]{0,40}?(\d+\s*(?:–|-|to)?\s*\d*\s*day[s]?)/i
  ], 1) || pickFirst(nearVis, [/\b([0-9]+\s*day[s]?)\s*returns?\b/i], 1);

  const return_cost_free = /\bfree\s+returns?\b|\bfree\s+return\s+shipping\b/i.test(nearVis);

  // Wallets
  const walletsSet = new Set(Array.from(nearVis.matchAll(/(Apple Pay|Google Pay|Shop Pay|PayPal|Afterpay|Klarna)/gi)).map(m => m[1]));
  const e_wallets = Array.from(walletsSet).join(", ");

  // Rating and reviews — try near window first
  let store_rating = pickFirst(nearVis, [
    /(\d\.\d)\s*★/,
    /(\d\.\d)\s*\/\s*5/,
    /store\s*rating[^]{0,60}?(\d\.\d)/i
  ], 1);

  let review_count = pickFirst(nearVis, [
    /(\d{1,3}(?:,\d{3})*)\s*(?:reviews|ratings)/i,
    /based\s+on\s+(\d{1,3}(?:,\d{3})*)\s*(?:reviews|ratings)/i
  ], 1);

  // Fallback: domain-bounded search across the whole visible page
  if (!store_rating) {
    const m = visibleAll.match(new RegExp("(?:\\b" + escapeRe(domain) + "\\b)[\\s\\S]{0,800}?(\\d\\.\\d)\\s*(?:★|/\\s*5)", "i"));
    if (m) store_rating = m[1];
  }
  if (!review_count) {
    const m = visibleAll.match(new RegExp("(?:\\b" + escapeRe(domain) + "\\b)[\\s\\S]{0,900}?(\\d{1,3}(?:,\\d{3})*)\\s*(?:reviews|ratings)", "i"));
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
    review_count,
  };

  if (debugMode) {
    payload.debug = {
      notes,
      domainHits: hits.length,
      pickedScore: bestScore,
      nearSample: nearVis.slice(0, 240)
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
    return new Response(JSON.stringify({ error: "Missing domain" }), { status: 400, headers: { "Content-Type": "application/json" } });
  }

  const target = `https://www.google.com/storepages?q=${encodeURIComponent(domain)}&c=${country}&v=19`;
  try {
    const res = await fetch(target, { headers: { "User-Agent": "Mozilla/5.0" }, cache: "no-store" });
    if (!res.ok) throw new Error(`Upstream ${res.status}`);
    const html = await res.text();
    const signals = extractSignalsFromHtml(html, domain, debug);
    return new Response(JSON.stringify({ signals }), {
      headers: { "Content-Type": "application/json", "Cache-Control": "public, max-age=60, s-maxage=300, stale-while-revalidate=300" }
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
}
