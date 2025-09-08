// Force US execution on Vercel
export const runtime = "nodejs";
export const preferredRegion = ["iad1", "sfo1"];

import { NextRequest } from "next/server";

function esc(s: string) { return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }
function stripVisible(html: string) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<\/?[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
function sanitizeNoise(s: string) {
  // remove "+ 2 more" etc so it can't be mistaken for rating
  return s.replace(/\+\s*\d+\s*more/gi, "");
}
function pickFirst(text: string, patterns: RegExp[], groupIndex = 1): string {
  for (const re of patterns) {
    const m = text.match(re);
    if (m && m[groupIndex]) return (m[groupIndex] + "").trim();
  } return "";
}
function allIdx(text: string, re: RegExp) {
  const out: number[] = []; const g = new RegExp(re.source, re.flags.includes("g") ? re.flags : re.flags + "g");
  let m: RegExpExecArray | null; while ((m = g.exec(text))) out.push(m.index); return out;
}
function win(s: string, i: number, radius: number) { const a = Math.max(0, i - radius); const b = Math.min(s.length, i + radius); return s.slice(a, b); }

function extractSignalsFromHtml(html: string, domain: string) {
  const visAllRaw = stripVisible(html);
  const visAll = sanitizeNoise(visAllRaw);
  const domRe = new RegExp("\\b(?:https?:\\/\\/)?(?:www\\.)?" + esc(domain) + "\\b", "i");
  const domIdx = visAll.search(domRe);

  // TQS strict near domain
  const tqsMarkers: number[] = [];
  for (const re of [
    /<span[^>]*class=["'][^"']*gmceHc-V1ur5d-fmcmS[^"']*["'][^>]*>Top\s+Quality\s+Store<\/span>/gi,
    /\b(?:aria-label|alt)\s*=\s*["']Top\s+Quality\s+Store["']/gi,
  ]) tqsMarkers.push(...allIdx(html, re));
  let tqs_badge = false;
  for (const p of tqsMarkers) {
    const wnd = win(html, p, 1200);
    const wndVis = stripVisible(wnd);
    if (domRe.test(wnd) || domRe.test(wndVis)) { tqs_badge = true; break; }
  }

  const visNear = domIdx >= 0 ? sanitizeNoise(stripVisible(win(visAll, domIdx, 6000))) : visAll;

  // ---- H1 rating extraction (robust) ----
  // Only accept digits that are adjacent to "store rating" context and stars or /5
  const h1Win = domIdx >= 0 ? sanitizeNoise(stripVisible(win(visAll, domIdx, 3000))) : visNear;

  let store_rating = pickFirst(h1Win, [
    /(?:\b|^)(\d\.\d|\d)\s*[★⭐]\s*store\s*rating\b/i,
    /(?:\b|^)(\d\.\d|\d)\s*\/\s*5\s*store\s*rating\b/i,
    /\bstore\s*rating\b[^0-9]{0,10}(\d\.\d|\d)(?=\s*(?:[★⭐]|\/\s*5|\b))/i
  ], 1);

  let review_count = pickFirst(h1Win, [
    /\(\s*(\d{1,3}(?:,\d{3})*)\s*reviews?\s*\)/i,
    /(\d{1,3}(?:,\d{3})*)\s*(?:reviews|ratings)/i
  ], 1);

  // Fallbacks bounded by domain
  if (!store_rating) {
    store_rating = pickFirst(visAll, [new RegExp("(?:\\b" + esc(domain) + "\\b)[\\s\\S]{0,1500}?(\\d\\.\\d|\\d)\\s*(?:[★⭐]|/\\s*5)?\\s*store\\s*rating\\b", "i")], 1);
  }
  if (!review_count) {
    review_count = pickFirst(visAll, [new RegExp("(?:\\b" + esc(domain) + "\\b)[\\s\\S]{0,1500}?(\\d{1,3}(?:,\\d{3})*)\\s*(?:reviews|ratings)", "i")], 1);
  }

  // ---- Insights (reuse previous GB parser lite) ----
  const nearForInsights = domIdx >= 0 ? win(visAll, domIdx, 6000) : visAll;
  const header = nearForInsights.search(/\b(Store\s+Insights|Shopping\s+experience|Experience\s+scorecard)\b/i);
  let insights = "";
  if (header >= 0) insights = nearForInsights.slice(header);

  function pick(text: string, patterns: RegExp[], gi = 1) { return pickFirst(text || "", patterns, gi); }
  function bool(text: string, re: RegExp) { return re.test(text || ""); }

  let delivery_time = "", shipping_cost_free = false, return_window = "", return_cost_free = false, e_wallets = "";
  if (insights) {
    const shipping = pick(insights, [/\bShipping\b\s*(.*?)(?=\bReturns?\b|\bPayment options\b|$)/i], 1);
    const returns = pick(insights, [/\bReturns?\b\s*(.*?)(?=\bPayment options\b|\bWebsite quality\b|$)/i], 1);
    const payments = pick(insights, [/\bPayment options\b\s*(.*?)(?=\bWebsite quality\b|$)/i], 1);

    delivery_time = pick(shipping, [
      /(\d+\s*(?:–|-|to)?\s*\d*\s*day[s]?)\s*(?:delivery|ship|shipping)/i,
      /deliver[s]?\s+in\s+(\d+\s*(?:–|-|to)?\s*\d*\s*day[s]?)/i
    ], 1);
    shipping_cost_free = bool(shipping, /\bfree\s+(?:delivery|shipping)\b/i) || bool(shipping, /\b(?:delivery|shipping)\s*(?:cost|price)?[:\s-]*\s*free\b/i);

    return_window = pick(returns, [
      /(\d+\s*(?:–|-|to)?\s*\d*\s*day[s]?)\s*returns?\b/i,
      /returns?\s*(?:within|in)?\s*(\d+\s*(?:–|-|to)?\s*\d*\s*day[s]?)/i,
      /return\s*(?:window|period)[:\s-]*\s*(\d+\s*(?:–|-|to)?\s*\d*\s*day[s]?)/i
    ], 1);
    return_cost_free = bool(returns, /\bfree\s+returns?\b/i) || bool(returns, /\breturn\s*(?:shipping|cost)[:\s-]*\s*free\b/i);

    const walletsSet = new Set(Array.from((payments || "").matchAll(/\b(Apple Pay|Google Pay|Shop Pay|PayPal|Afterpay|Klarna)\b/gi)).map(m => m[1]));
    e_wallets = Array.from(walletsSet).join(", ");
  }

  return { tqs_badge, delivery_time, shipping_cost_free, return_window, return_cost_free, e_wallets, store_rating, review_count };
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
    const signals = extractSignalsFromHtml(html, domain);
    return new Response(JSON.stringify({ signals }), {
      headers: { "Content-Type": "application/json", "Cache-Control": "public, max-age=60, s-maxage=300, stale-while-revalidate=300" }
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
}
