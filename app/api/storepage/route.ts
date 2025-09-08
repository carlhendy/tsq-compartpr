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
function win(s: string, i: number, radius: number) {
  const start = Math.max(0, i - radius); const end = Math.min(s.length, i + radius); return s.slice(start, end);
}
function prefer(a?: string|boolean, b?: string|boolean) { return (b ? b : a) as any; }

function extractFromInsights(vis: string) {
  const delivery_time = pickFirst(vis, [
    /delivery\s*time[:\s-]*\s*(\d+\s*(?:–|-|to)?\s*\d*\s*(?:business\s*)?(?:working\s*)?day[s]?)/i,
    /usually\s+deliver[s]?\s+in\s+(\d+\s*(?:–|-|to)?\s*\d*\s*(?:business\s*)?(?:working\s*)?day[s]?)/i,
    /ships\s+in\s+(\d+\s*(?:–|-|to)?\s*\d*\s*(?:business\s*)?day[s]?)/i
  ], 1);

  const shipping_cost_free = /\b(?:delivery|shipping)\s*(?:cost|price)?[:\s-]*\s*free\b/i.test(vis) || /\bfree\s+(?:shipping|delivery)\b/i.test(vis);

  const return_window = pickFirst(vis, [
    /return\s*(?:window|period)[:\s-]*\s*(\d+\s*(?:–|-|to)?\s*\d*\s*day[s]?)/i,
    /returns?\s*within\s*(\d+\s*(?:–|-|to)?\s*\d*\s*day[s]?)/i,
    /(\d+\s*day[s]?)\s*return[s]?\b/i
  ], 1);

  const return_cost_free = /\b(?:return\s*(?:cost|shipping)[:\s-]*\s*free|free\s+returns?)\b/i.test(vis);

  const e_wallets_set = new Set(Array.from(vis.matchAll(/\b(Apple Pay|Google Pay|Shop Pay|PayPal|Afterpay|Klarna)\b/gi)).map(m => m[1]));
  const e_wallets = Array.from(e_wallets_set).join(", ");

  const store_rating = pickFirst(vis, [
    /(\d\.\d)\s*★/,
    /(\d\.\d)\s*\/\s*5/,
    /store\s*rating[^]{0,60}?(\d\.\d)/i
  ], 1);

  const review_count = pickFirst(vis, [
    /(\d{1,3}(?:,\d{3})*)\s*(?:reviews|ratings)/i,
    /based\s+on\s+(\d{1,3}(?:,\d{3})*)\s*(?:reviews|ratings)/i
  ], 1);

  return { delivery_time, shipping_cost_free, return_window, return_cost_free, e_wallets, store_rating, review_count };
}

function extractSignalsFromHtml(html: string, domain: string) {
  const visibleAll = stripVisible(html);
  const domRe = new RegExp("\\b(?:https?:\\/\\/)?(?:www\\.)?" + esc(domain) + "\\b", "i");

  // --- TQS detection: class, aria/alt, or text tied to the same page segment as the domain ---
  const markers: number[] = [];
  for (const re of [
    /<span[^>]*class=["'][^"']*gmceHc-V1ur5d-fmcmS[^"']*["'][^>]*>Top\s+Quality\s+Store<\/span>/gi,
    /\b(?:aria-label|alt)\s*=\s*["']Top\s+Quality\s+Store["']/gi,
  ]) { markers.push(...allIdx(html, re)); }
  let tqs_badge = false;
  for (const pos of markers) {
    const windowRaw = win(html, pos, 1000);
    const windowVis = stripVisible(windowRaw);
    if (domRe.test(windowRaw) || domRe.test(windowVis)) { tqs_badge = true; break; }
  }

  // --- Windows near domain and near "Insights" ---
  const domHitRaw = html.search(domRe);
  const visNear = domHitRaw >= 0 ? stripVisible(win(html, domHitRaw, 5000)) : visibleAll;

  // Insights window: prefer text blocks that literally contain "Insights" or "Shopping experience"
  const insightsIdxs = allIdx(visibleAll, /\b(Insights|Shopping\s+experience|Experience\s+scorecard)\b/i);
  let insightsVis = "";
  if (insightsIdxs.length) {
    const best = insightsIdxs.reduce((a, b) => (Math.abs(b - Math.max(0, domHitRaw)) < Math.abs(a - Math.max(0, domHitRaw)) ? b : a), insightsIdxs[0]);
    insightsVis = stripVisible(win(visibleAll, best, 2500));
  }

  // --- Extract from general near window ---
  const gen_delivery = pickFirst(visNear, [
    /(\d+\s*(?:–|-|to)?\s*\d*\s*(?:business\s*)?(?:working\s*)?day[s]?)[^\n]{0,80}?(delivery|shipping)/i,
    /(delivery|shipping)[^\n]{0,120}?(?:time|speed)[^\n]{0,60}?(\d+\s*(?:–|-|to)?\s*\d*\s*(?:business\s*)?(?:working\s*)?day[s]?)/i
  ], 1);
  const gen_free_ship = /\bfree\s+(?:shipping|delivery)\b/i.test(visNear);
  const gen_return_window = pickFirst(visNear, [
    /(\d+\s*(?:–|-|to)?\s*\d*\s*day[s]?)[^\n]{0,80}?\breturn/i,
    /(return|refund)[^\n]{0,120}?(window|period)[^\n]{0,60}?(\d+\s*(?:–|-|to)?\s*\d*\s*day[s]?)/i
  ], 1) || pickFirst(visNear, [/\b([0-9]+\s*day[s]?)\s*returns?\b/i], 1);
  const gen_free_returns = /\bfree\s+returns?\b|\bfree\s+return\s+shipping\b/i.test(visNear);
  const gen_wallets = Array.from(new Set(Array.from(visNear.matchAll(/\b(Apple Pay|Google Pay|Shop Pay|PayPal|Afterpay|Klarna)\b/gi)).map(m => m[1]))).join(", ");
  const gen_rating = pickFirst(visNear, [/(\d\.\d)\s*★/, /(\d\.\d)\s*\/\s*5/, /store\s*rating[^]{0,60}?(\d\.\d)/i], 1);
  const gen_reviews = pickFirst(visNear, [/(\d{1,3}(?:,\d{3})*)\s*(?:reviews|ratings)/i, /based\s+on\s+(\d{1,3}(?:,\d{3})*)\s*(?:reviews|ratings)/i], 1);

  // --- Extract from Insights window (if found) ---
  const ins = insightsVis ? extractFromInsights(insightsVis) : {} as any;

  // Fallbacks scoped to whole page but bound to domain
  const fallback_rating = pickFirst(visibleAll, [new RegExp("(?:\\b" + esc(domain) + "\\b)[\\s\\S]{0,900}?(\\d\\.\\d)\\s*(?:★|/\\s*5)", "i")], 1);
  const fallback_reviews = pickFirst(visibleAll, [new RegExp("(?:\\b" + esc(domain) + "\\b)[\\s\\S]{0,1000}?(\\d{1,3}(?:,\\d{3})*)\\s*(?:reviews|ratings)", "i")], 1);

  // Merge: prefer insights, then general, then fallback
  const delivery_time = ins.delivery_time || gen_delivery || "";
  const shipping_cost_free = ins.shipping_cost_free ?? gen_free_ship ?? false;
  const return_window = ins.return_window || gen_return_window || "";
  const return_cost_free = ins.return_cost_free ?? gen_free_returns ?? false;
  const e_wallets = ins.e_wallets || gen_wallets || "";
  const store_rating = ins.store_rating || gen_rating || fallback_rating || "";
  const review_count = ins.review_count || gen_reviews || fallback_reviews || "";

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
