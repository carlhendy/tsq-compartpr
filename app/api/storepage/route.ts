// Force US execution on Vercel so requests egress from the US
export const runtime = "nodejs";
export const preferredRegion = ["iad1", "sfo1"]; // or: export const regions = ["iad1"];

import { NextRequest } from "next/server";

function extractSignalsFromHtml(html: string) {
  const tqs_badge = /Top\s+Quality\s+Store/i.test(html);
  const deliveryMatch = html.match(/(Delivery|Shipping)[^\n]*?(time|speed)[^\n]*?(\n|.){0,60}?(\d+\s*(?:\u2013|-|to)?\s*\d*\s*(?:business\s*)?days?)/i);
  const freeShip = /free\s+(shipping|delivery)/i.test(html);
  const returnWindow = html.match(/(return|refund)[^\n]*?(window|period)[^\n]*?(\n|.){0,60}?(\d+\s*(?:\u2013|-|to)?\s*\d*\s*days?)/i);
  const freeReturns = /free\s+returns?|free\s+return\s+shipping/i.test(html);
  const wallets = Array.from(html.matchAll(/(Apple Pay|Google Pay|Shop Pay|PayPal|Afterpay|Klarna)/gi)).map(m => m[1]);
  const rating = html.match(/(\d\.\d)\s*\/\s*5/);
  const reviews = html.match(/(\d{2,}(?:,\d{3})*)\s*(reviews|ratings)/i);
  return {
    tqs_badge,
    delivery_time: deliveryMatch?.[4] || "",
    shipping_cost_free: freeShip,
    return_window: returnWindow?.[4] || "",
    return_cost_free: freeReturns,
    e_wallets: Array.from(new Set(wallets)).join(", "),
    store_rating: rating?.[1] || "",
    review_count: reviews?.[1] || "",
  };
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const domain = searchParams.get("domain");
  const country = searchParams.get("country") || "US"; // default to US
  if (!domain) {
    return new Response(JSON.stringify({ error: "Missing domain" }), { status: 400, headers: { "Content-Type": "application/json" }});
  }
  const target = `https://www.google.com/storepages?q=${encodeURIComponent(domain)}&c=${country}&v=19`;
  try {
    const res = await fetch(target, {
      headers: { "User-Agent": "Mozilla/5.0" },
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`Upstream ${res.status}`);
    const html = await res.text();
    const signals = extractSignalsFromHtml(html);
    return new Response(JSON.stringify({ signals }), {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=60, s-maxage=300, stale-while-revalidate=300",
      }
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { "Content-Type": "application/json" }});
  }
}
