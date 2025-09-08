"use client";
import React,{useState,useMemo} from "react";
import {Loader2,Globe2,Crown,AlertTriangle} from "lucide-react";

type StoreRow={domain:string;country:string;url:string;signals:any;error?:string};
const API_BASE="/api";

async function fetchStorePage(domain:string,country:string):Promise<StoreRow>{
  const url=`https://www.google.com/storepages?q=${encodeURIComponent(domain)}&c=${country}&v=19`;
  try{
    const res=await fetch(`${API_BASE}/storepage?domain=${encodeURIComponent(domain)}&country=${country}`);
    if(!res.ok)throw new Error("API "+res.status);
    const data=await res.json();
    return{domain,country,url,signals:data.signals,error:data.error};
  }catch(e:any){return{domain,country,url,signals:null,error:e.message};}
}

export default function Page(){
  const [country,setCountry]=useState("US");
  const [domains,setDomains]=useState<string[]>(["","","","",""]);
  const [rows,setRows]=useState<StoreRow[]|null>(null);
  const [loading,setLoading]=useState(false);
  const activeDomains=useMemo(()=>domains.map(d=>d.trim()).filter(Boolean).slice(0,5),[domains]);
  async function onCompare(e:React.FormEvent){e.preventDefault();setLoading(true);try{const results=await Promise.all(activeDomains.map(d=>fetchStorePage(d,country)));setRows(results);}finally{setLoading(false);}}
  return(<div className="p-6">
    <h1 className="text-2xl font-bold mb-4">TQS Comparator</h1>
    <form onSubmit={onCompare} className="mb-4"><div>{domains.map((d,i)=>(<input key={i} value={d} onChange={e=>setDomains(arr=>arr.map((v,idx)=>idx===i?e.target.value:v))} placeholder="domain.com" className="border p-1 mr-2"/>))}</div>
    <select value={country} onChange={e=>setCountry(e.target.value)} className="border p-1"><option>US</option><option>GB</option><option>AU</option><option>NZ</option><option>CA</option><option>DE</option></select>
    <button type="submit" className="ml-2 px-3 py-1 bg-black text-white">{loading?<Loader2 className="animate-spin h-4 w-4"/>:"Compare"}</button></form>
    {rows&&rows.map((r,i)=>(<div key={i} className="border p-3 mb-2"><h2>{r.domain} · {r.country}</h2>{r.signals?(<div>{r.signals.tqs_badge?<span className="text-amber-700 flex items-center"><Crown className="h-4 w-4"/>TQS</span>:<span className="flex items-center text-gray-600"><AlertTriangle className="h-4 w-4"/>No TQS</span>}</div>):<div>{r.error||"No data"}</div>}</div>))}
  </div>);
}
