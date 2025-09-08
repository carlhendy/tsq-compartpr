export const runtime="nodejs";
export const preferredRegion=["iad1"];
export async function GET(){const r=await fetch("https://api64.ipify.org?format=json");const ip=await r.json();return Response.json(ip);}
