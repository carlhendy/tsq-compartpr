// Force US execution on Vercel
export const runtime="nodejs";
export const preferredRegion=["iad1","sfo1"];
import {NextRequest} from "next/server";

function pickFirst(html:string,patterns:RegExp[],groupIndex=1){for(const re of patterns){const m=html.match(re);if(m&&m[groupIndex])return m[groupIndex].trim();}return"";}
function extractSignalsFromHtml(html:string){
  const visible=html.replace(/<script[\s\S]*?<\/script>/gi,"").replace(/<style[\s\S]*?<\/style>/gi,"").replace(/<\/?[^>]+>/g," ").replace(/\s+/g," ").trim();
  const tqs_badge=/\baria-label\s*=\s*["']Top\s+Quality\s+Store["']/i.test(html)||/\balt\s*=\s*["']Top\s+Quality\s+Store["']/i.test(html)||/\bTop\s+Quality\s+Store\b/.test(visible);
  const delivery_time=pickFirst(visible,[/(\d+\s*(?:–|-|to)?\s*\d*\s*(?:business\s*)?(?:working\s*)?day[s]?)[^\n]{0,40}?(delivery|shipping)/i],1);
  const shipping_cost_free=/\bfree\s+(?:shipping|delivery)\b/i.test(visible);
  const return_window=pickFirst(visible,[/(\d+\s*(?:–|-|to)?\s*\d*\s*day[s]?)[^\n]{0,40}?\breturn/i],1);
  const return_cost_free=/\bfree\s+returns?\b|\bfree\s+return\s+shipping\b/i.test(visible);
  const wallets=Array.from(new Set(Array.from(visible.matchAll(/(Apple Pay|Google Pay|Shop Pay|PayPal|Afterpay|Klarna)/gi)).map(m=>m[1]))).join(", ");
  const store_rating=pickFirst(visible,[/(\d\.\d)\s*\/\s*5/],1);
  const review_count=pickFirst(visible,[/(\d{2,}(?:,\d{3})*)\s*(?:reviews|ratings)/i],1);
  return{tqs_badge,delivery_time,shipping_cost_free,return_window,return_cost_free,e_wallets:wallets,store_rating,review_count};
}
export async function GET(req:NextRequest){
  const {searchParams}=new URL(req.url);
  const domain=searchParams.get("domain");const country=searchParams.get("country")||"US";
  if(!domain)return new Response(JSON.stringify({error:"Missing domain"}),{status:400,headers:{"Content-Type":"application/json"}});
  const target=`https://www.google.com/storepages?q=${encodeURIComponent(domain)}&c=${country}&v=19`;
  try{const res=await fetch(target,{headers:{"User-Agent":"Mozilla/5.0"},cache:"no-store"});if(!res.ok)throw new Error("Upstream "+res.status);const html=await res.text();const signals=extractSignalsFromHtml(html);return new Response(JSON.stringify({signals}),{headers:{"Content-Type":"application/json"}});}catch(e:any){return new Response(JSON.stringify({error:e.message}),{status:500,headers:{"Content-Type":"application/json"}});}}
