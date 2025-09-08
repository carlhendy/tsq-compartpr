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
function win(s: string, i: number, radius: number) { const a = Math.max(0, i - radius); const b = Math.min(s.length, i + radius); return s.slice(a, b); }

function extractInsights(vis: string) {
  // Normalise spacing and split into pseudo-lines to find sections
  const norm = vis.replace(/\s{2,}/g, " ").replace(/\s*([:.])\s*/g, "$1 ");
  function sectionAfter(header: string) {
    const re = new RegExp("\\b" + header + "\\b\\s*(.*?)(?=\\b(Shipping|Returns?|Payment options|Website quality|Competitive pricing)\\b|$)", "i");
    const m = norm.match(re);
    return m ? m[1].trim() : "";
  }

  const shippingTxt = sectionAfter("Shipping");
  const returnsTxt  = sectionAfter("Returns?");
  const payTxt      = sectionAfter("Payment options");

  // Shipping
  const delivery_time = pickFirst(shippingTxt, [
    /(\d+\s*(?:–|-|to)?\s*\d*\s*day[s]?)\s*(?:delivery|ship|shipping)/i,
    /deliver[s]?\s+in\s+(\d+\s*(?:–|-|to)?\s*\d*\s*day[s]?)/i
  ], 1);
  const shipping_cost_free = /\bfree\s+(?:delivery|shipping)\b/i.test(shippingTxt) || /\b(?:delivery|shipping)\s*(?:cost|price)?[:\s-]*\s*free\b/i.test(shippingTxt);

  // Returns
  const return_window = pickFirst(returnsTxt, [
    /(\d+\s*(?:–|-|to)?\s*\d*\s*day[s]?)\s*returns?\b/i,
    /returns?\s*(?:within|in)?\s*(\d+\s*(?:–|-|to)?\s*\d*\s*day[s]?)/i,
    /return\s*(?:window|period)[:\s-]*\s*(\d+\s*(?:–|-|to)?\s*\d*\s*day[s]?)/i
  ], 1);
  const return_cost_free = /\bfree\s+returns?\b/i.test(returnsTxt) || /\breturn\s*(?:shipping|cost)[:\s-]*\s*free\b/i.test(returnsTxt);

  // Payments
  const walletsSet = new Set(Array.from(payTxt.matchAll(/\b(Apple Pay|Google Pay|Shop Pay|PayPal|Afterpay|Klarna)\b/gi)).map(m => m[1]));
  const e_wallets = Array.from(walletsSet).join(", ");

  return { delivery_time, shipping_cost_free, return_window, return_cost_free, e_wallets };
}

function extractSignalsFromHtml(html: string, domain: string) {
  const visAll = stripVisible(html);
  const domRe = new RegExp("\\b(?:https?:\\/\\/)?(?:www\\.)?" + esc(domain) + "\\b", "i");
  const domIdx = visAll.search(domRe);

  // TQS near domain using special class / aria / alt
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

  // Windows
  const visNear = domIdx >= 0 ? stripVisible(win(visAll, domIdx, 6000)) : visAll;

  // ---- Insights detection (GB phrasing) ----
  let insightsVis = "";
  if (domIdx >= 0) {
    const near = win(visAll, domIdx, 6000);
    const header = near.search(/\b(Store\s+Insights|Shopping\s+experience|Experience\s+scorecard)\b/i);
    if (header >= 0) insightsVis = near.slice(header);
  } else {
    const idx = visAll.search(/\b(Store\s+Insights|Shopping\s+experience|Experience\s+scorecard)\b/i);
    if (idx >= 0) insightsVis = win(visAll, idx, 4000);
  }
  const ins = insightsVis ? extractInsights(insightsVis) : { delivery_time:"", shipping_cost_free:false, return_window:"", return_cost_free:false, e_wallets:"" };

  // ---- H1 rating near the domain (wider window) ----
  const h1Win = domIdx >= 0 ? stripVisible(win(visAll, domIdx, 4000)) : visNear;
  let store_rating = pickFirst(h1Win, [
    /(\d(?:\.\d)?)\s*[★⭐]\s*store\s*rating/i,
    /(\d(?:\.\d)?)\s*\/\s*5\s*store\s*rating/i,
    /store\s*rating[^\d]{0,50}(\d(?:\.\d)?)/i
  ], 1);
  let review_count = pickFirst(h1Win, [
    /\(\s*(\d{1,3}(?:,\d{3})*)\s*reviews?\s*\)/i,
    /(\d{1,3}(?:,\d{3})*)\s*(?:reviews|ratings)/i
  ], 1);

  // Fallbacks domain-bounded
  if (!store_rating) {
    store_rating = pickFirst(visAll, [new RegExp("(?:\\b" + esc(domain) + "\\b)[\\s\\S]{0,2000}?(\\d(?:\\.\\d)?)\\s*(?:[★⭐]|/\\s*5)?\\s*store\\s*rating", "i")], 1);
  }
  if (!review_count) {
    review_count = pickFirst(visAll, [new RegExp("(?:\\b" + esc(domain) + "\\b)[\\s\\S]{0,2200}?(\\d{1,3}(?:,\\d{3})*)\\s*(?:reviews|ratings)", "i")], 1);
  }

  // Generic fallbacks if Insights absent
  const gen_delivery = pickFirst(visNear, [
    /(\d+\s*(?:–|-|to)?\s*\d*\s*(?:business\s*)?(?:working\s*)?day[s]?)[^\n]{0,140}?(delivery|shipping)/i,
    /(delivery|shipping)[^\n]{0,160}?(?:time|speed)[^\n]{0,80}?(\d+\s*(?:–|-|to)?\s*\d*\s*(?:business\s*)?(?:working\s*)?day[s]?)/i
  ], 1);
  const gen_free_ship = /\bfree\s+(?:shipping|delivery)\b/i.test(visNear);
  const gen_return_window = pickFirst(visNear, [
    /(\d+\s*(?:–|-|to)?\s*\d*\s*(?:business\s*)?day[s]?)[^\n]{0,140}?\breturn/i,
    /(return|refund)[^\n]{0,160}?(window|period)[^\n]{0,80}?(\d+\s*(?:–|-|to)?\s*\d*\s*(?:business\s*)?day[s]?)/i
  ], 1) || pickFirst(visNear, [/\b([0-9]+\s*day[s]?)\s*returns?\b/i], 1);
  const gen_free_returns = /\bfree\s+returns?\b|\bfree\s+return\s+shipping\b/i.test(visNear);
  const gen_wallets = Array.from(new Set(Array.from(visNear.matchAll(/\b(Apple Pay|Google Pay|Shop Pay|PayPal|Afterpay|Klarna)\b/gi)).map(m => m[1]))).join(", ");

  // Merge preferring Insights
  const delivery_time = ins.delivery_time || gen_delivery || "";
  const shipping_cost_free = (ins.shipping_cost_free ? true : gen_free_ship) || false;
  const return_window = ins.return_window || gen_return_window || "";
  const return_cost_free = (ins.return_cost_free ? true : gen_free_returns) || false;
  const e_wallets = ins.e_wallets || gen_wallets || "";

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
