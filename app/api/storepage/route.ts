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

function idxOfAll(text: string, re: RegExp) {
  const out: number[] = [];
  const g = new RegExp(re.source, re.flags.includes("g") ? re.flags : re.flags + "g");
  let m: RegExpExecArray | null;
  while ((m = g.exec(text))) out.push(m.index);
  return out;
}

function sliceWin(s: string, center: number, radius: number) {
  const start = Math.max(0, center - radius);
  const end = Math.min(s.length, center + radius);
  return { start, end, text: s.slice(start, end) };
}

function extractSignalsFromHtml(html: string, domain: string, debugMode = false) {
  const visibleAll = stripVisible(html);
  const domRe = new RegExp("\\b(?:https?:\\/\\/)?(?:www\\.)?" + escapeRe(domain) + "\\b", "i");
  const domIdxs = idxOfAll(visibleAll, domRe);

  // window near domain
  let visNear = visibleAll;
  let htmlNear = html;
  let domIdx = -1;
  if (domIdxs.length) {
    domIdx = domIdxs[0];
    const v = sliceWin(visibleAll, domIdx, 1200);
    visNear = v.text;
    const rawIdx = html.search(domRe);
    const h = sliceWin(html, rawIdx >= 0 ? rawIdx : 0, 3000);
    htmlNear = h.text;
  }

  // --- TQS detection (very strict) ---
  // 1) Find "Top Quality Store" in nearby text
  const tqsIdxVisible = visNear.search(/\bTop\s+Quality\s+Store\b/i);

  // Consider it a badge only if:
  // - the phrase is within 120 characters of the domain mention (proximity),
  // - and not inside boilerplate "About this page" / "badge is earned" text,
  // - OR appears as alt/aria attributes in raw HTML near the domain.
  let tqs_badge = false;
  if (tqsIdxVisible >= 0 && domIdx >= 0) {
    const proximity = Math.abs(tqsIdxVisible - Math.min(tqsIdxVisible, 120)); // local index within window
    const rawSnippet = visNear.slice(Math.max(0, tqsIdxVisible - 160), tqsIdxVisible + 160);
    const isBoilerplate = /About this (store|page)|badge is earned|Store ratings are based/i.test(rawSnippet);
    const isVeryClose = tqsIdxVisible <= 120; // because window starts near domain
    if (isVeryClose && !isBoilerplate) tqs_badge = true;
  }
  // alt/aria near domain
  if (!tqs_badge) {
    const ariaAltNear = htmlNear.match(/\b(?:aria-label|alt)\s*=\s*["']Top\s+Quality\s+Store["']/i);
    if (ariaAltNear) tqs_badge = true;
  }

  // --- Other fields (use near window first, then fallback to full page bounded by domain) ---
  const delivery_time = pickFirst(visNear, [
    /(\d+\s*(?:–|-|to)?\s*\d*\s*(?:business\s*)?(?:working\s*)?day[s]?)[^\n]{0,80}?(delivery|shipping)/i,
    /(delivery|shipping)[^\n]{0,120}?(?:time|speed)[^\n]{0,60}?(\d+\s*(?:–|-|to)?\s*\d*\s*(?:business\s*)?(?:working\s*)?day[s]?)/i
  ], 1);

  const shipping_cost_free = /\bfree\s+(?:shipping|delivery)\b/i.test(visNear);

  const return_window = pickFirst(visNear, [
    /(\d+\s*(?:–|-|to)?\s*\d*\s*day[s]?)[^\n]{0,80}?\breturn/i,
    /(return|refund)[^\n]{0,120}?(window|period)[^\n]{0,60}?(\d+\s*(?:–|-|to)?\s*\d*\s*day[s]?)/i
  ], 1) || pickFirst(visNear, [/\b([0-9]+\s*day[s]?)\s*returns?\b/i], 1);

  const return_cost_free = /\bfree\s+returns?\b|\bfree\s+return\s+shipping\b/i.test(visNear);

  const walletsSet = new Set(Array.from(visNear.matchAll(/(Apple Pay|Google Pay|Shop Pay|PayPal|Afterpay|Klarna)/gi)).map(m => m[1]));
  const e_wallets = Array.from(walletsSet).join(", ");

  // Ratings / reviews near domain first
  let store_rating = pickFirst(visNear, [
    /(\d\.\d)\s*★/,
    /(\d\.\d)\s*\/\s*5/,
    /store\s*rating[^]{0,80}?(\d\.\d)/i
  ], 1);
  let review_count = pickFirst(visNear, [
    /(\d{1,3}(?:,\d{3})*)\s*(?:reviews|ratings)/i,
    /based\s+on\s+(\d{1,3}(?:,\d{3})*)\s*(?:reviews|ratings)/i
  ], 1);

  // Fallback: domain-bounded search across whole page
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
    review_count
  };

  if (debugMode) {
    payload.debug = {
      visNearSample: visNear.slice(0, 260),
      domFound: domIdx >= 0,
      tqsMatched: tqs_badge
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
