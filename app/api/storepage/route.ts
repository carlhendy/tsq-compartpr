// Force US execution on Vercel
export const runtime = "nodejs";
export const preferredRegion = ["iad1", "sfo1"];

import { NextRequest } from "next/server";

function esc(s: string) { return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }
function stripTags(html: string) { return html.replace(/<script[\s\S]*?<\/script>/gi, "").replace(/<style[\s\S]*?<\/style>/gi, "").replace(/<\/?[^>]+>/g, " ").replace(/\s+/g, " ").trim(); }
function sanitizeNoise(s: string) { return s.replace(/\+\s*\d+\s*more/gi, ""); }
function pick(text: string, res: RegExp[], gi = 1) {
  for (const re of res) { const m = text.match(re); if (m && m[gi]) return m[gi].trim(); }
  return "";
}
function allIdx(text: string, re: RegExp) {
  const out: number[] = []; const g = new RegExp(re.source, re.flags.includes("g") ? re.flags : re.flags + "g");
  let m: RegExpExecArray | null; while ((m = g.exec(text))) out.push(m.index); return out;
}
function win(s: string, i: number, radius: number) { const a = Math.max(0, i - radius); const b = Math.min(s.length, i + radius); return s.slice(a, b); }

function textContent(html: string) { return sanitizeNoise(stripTags(html)); }

function extractStructuredInsights(htmlNear: string) {
  // Shipping
  const shipBlock = htmlNear.match(/<div[^>]*class=["']hnGZye["'][^>]*>\s*Shipping\s*<\/div>\s*<div[^>]*class=["']KtbsVc-ij8cu-fmcmS["'][^>]*>([\s\S]*?)<\/div>/i);
  const shippingRaw = shipBlock ? stripTags(shipBlock[1]) : "";
  // Returns
  const retBlock  = htmlNear.match(/<div[^>]*class=["']hnGZye["'][^>]*>\s*Returns?\s*<\/div>\s*<div[^>]*class=["']KtbsVc-ij8cu-fmcmS["'][^>]*>([\s\S]*?)<\/div>/i);
  const returnsRaw = retBlock ? stripTags(retBlock[1]) : "";
  // Payment options: prefer the "NBMhyb" (expanded) span if present, else visible jsname=u5tB8
  let paymentsRaw = "";
  const payBlock = htmlNear.match(/<div[^>]*class=["']hnGZye["'][^>]*>\s*Payment options\s*<\/div>\s*<span[^>]*class=["']KtbsVc-ij8cu-fmcmS["'][^>]*>([\s\S]*?)<\/span>/i);
  if (payBlock) {
    const expanded = payBlock[1].match(/<span[^>]*class=["']NBMhyb["'][^>]*>([\s\S]*?)<\/span>/i);
    const primary  = payBlock[1].match(/<span[^>]*jsname=["']u5tB8["'][^>]*>([\s\S]*?)<\/span>/i);
    paymentsRaw = stripTags((expanded && expanded[1]) || (primary && primary[1]) || payBlock[1]);
  }

  // Delivery time extraction
  const delivery_time = pick([shippingRaw, returnsRaw, paymentsRaw].join(" "), [
    /(?:£|\$|€)\s*\d+(?:\.\d{2})?[^a-zA-Z]{0,6}(\d+\s*(?:–|-|to)?\s*\d*\s*day[s]?)\s*(?:delivery|ship|shipping)/i,
    /(\d+\s*(?:–|-|to)?\s*\d*\s*day[s]?)\s*(?:delivery|ship|shipping)/i,
    /deliver[s]?\s+in\s+(\d+\s*(?:–|-|to)?\s*\d*\s*day[s]?)/i
  ], 1);

  const shipping_cost_free = /(^|\b)free\s+(delivery|shipping)\b/i.test(shippingRaw);

  const return_window = pick(returnsRaw, [
    /(\d+\s*(?:–|-|to)?\s*\d*\s*day[s]?)\s*returns?\b/i,
    /returns?\s*(?:within|in)?\s*(\d+\s*(?:–|-|to)?\s*\d*\s*day[s]?)/i,
    /return\s*(?:window|period)[:\s-]*\s*(\d+\s*(?:–|-|to)?\s*\d*\s*day[s]?)/i
  ], 1);
  const return_cost_free = /\bfree\s+returns?\b/i.test(returnsRaw) || /\breturn\s*(?:shipping|cost)[:\s-]*\s*free\b/i.test(returnsRaw);

  // Wallets list
  const wallets = Array.from(new Set(Array.from(paymentsRaw.matchAll(/\b(Apple Pay|Google Pay|Shop Pay|PayPal|Afterpay|Klarna)\b/gi)).map(m => m[1])));
  const e_wallets = wallets.join(", ");

  return { delivery_time, shipping_cost_free, return_window, return_cost_free, e_wallets };
}

function extractSignalsFromHtml(html: string, domain: string) {
  const visAll = textContent(html);
  const domRe = new RegExp("\\b(?:https?:\\/\\/)?(?:www\\.)?" + esc(domain) + "\\b", "i");
  const domIdxVis = visAll.search(domRe);
  const domIdxRaw = html.search(domRe);
  const htmlNear = domIdxRaw >= 0 ? win(html, domIdxRaw, 8000) : html;

  // TQS: specific span or aria/alt near the same segment
  const tqsMarkers: number[] = [];
  for (const re of [
    /<span[^>]*class=["'][^"']*gmceHc-V1ur5d-fmcmS[^"']*["'][^>]*>Top\s+Quality\s+Store<\/span>/gi,
    /\b(?:aria-label|alt)\s*=\s*["']Top\s+Quality\s+Store["']/gi,
  ]) tqsMarkers.push(...allIdx(html, re));
  let tqs_badge = false;
  for (const p of tqsMarkers) {
    const wnd = win(html, p, 1500);
    if (domRe.test(wnd)) { tqs_badge = true; break; }
  }

  // Parse the structured "Store Insights" HTML in the same segment
  const ins = extractStructuredInsights(htmlNear);

  // H1 rating next to domain (authoritative)
  const h1Win = domIdxVis >= 0 ? win(visAll, domIdxVis, 3500) : visAll;
  let store_rating = pick(h1Win, [
    /(?:^|\b)(\d\.\d|\d)\s*[★⭐]\s*store\s*rating\b/i,
    /(?:^|\b)(\d\.\d|\d)\s*\/\s*5\s*store\s*rating\b/i,
    /\bstore\s*rating\b[^0-9]{0,10}(\d\.\d|\d)(?=\s*(?:[★⭐]|\/\s*5|\b))/i
  ], 1);
  let review_count = pick(h1Win, [/\(\s*(\d{1,3}(?:,\d{3})*)\s*reviews?\s*\)/i, /(\d{1,3}(?:,\d{3})*)\s*(?:reviews|ratings)/i], 1);

  // Fallbacks
  if (!store_rating) {
    store_rating = pick(visAll, [new RegExp("(?:\\b" + esc(domain) + "\\b)[\\s\\S]{0,1600}?(\\d\\.\\d|\\d)\\s*(?:[★⭐]|/\\s*5)?\\s*store\\s*rating\\b", "i")], 1);
  }
  if (!review_count) {
    review_count = pick(visAll, [new RegExp("(?:\\b" + esc(domain) + "\\b)[\\s\\S]{0,2000}?(\\d{1,3}(?:,\\d{3})*)\\s*(?:reviews|ratings)", "i")], 1);
  }

  return {
    tqs_badge: tqs_badge,
    delivery_time: ins.delivery_time || "",
    shipping_cost_free: ins.shipping_cost_free || false,
    return_window: ins.return_window || "",
    return_cost_free: ins.return_cost_free || false,
    e_wallets: ins.e_wallets || "",
    store_rating: store_rating || "",
    review_count: review_count || ""
  };
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
