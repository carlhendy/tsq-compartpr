import React from "react";

/** Minimal local UI primitives to avoid external deps */
function cx(...classes: Array<string | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function Card({ className = "", children }: { className?: string; children: React.ReactNode }) {
  return <div className={cx("rounded-2xl shadow-md bg-white border border-gray-200", className)}>{children}</div>;
}

function CardContent({ className = "", children }: { className?: string; children: React.ReactNode }) {
  return <div className={cx("p-6", className)}>{children}</div>;
}

type Brand = {
  name: string;
  bg: string;   // Tailwind arbitrary color class, e.g. bg-[#003087]
  text: "white" | "dark"; // pick text color
};

const BRANDS: Brand[] = [
  { name: "PayPal",   bg: "bg-[#003087]", text: "white" },
  { name: "Apple Pay", bg: "bg-[#000000]", text: "white" },
  { name: "Google Pay", bg: "bg-[#4285F4]", text: "white" },
  { name: "Shop Pay", bg: "bg-[#5a31f4]", text: "white" },
  { name: "Afterpay", bg: "bg-[#b2ffe5]", text: "dark" },
  { name: "Klarna",   bg: "bg-[#ffb3c7]", text: "dark" },
];

export default function Page() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-6">
      {/* TQS */}
      <Card>
        <CardContent>
          <h2 className="text-xl font-semibold mb-2">TQS</h2>
          <p className="text-gray-600">Trusted Quality Score explanation.</p>
        </CardContent>
      </Card>

      {/* Delivery Time */}
      <Card>
        <CardContent>
          <h2 className="text-xl font-semibold mb-2">Delivery Time</h2>
          <p className="text-gray-600">Plain English explanation of delivery time.</p>
        </CardContent>
      </Card>

      {/* Shipping (Quality) */}
      <Card>
        <CardContent>
          <h2 className="text-xl font-semibold mb-2">Shipping (Quality)</h2>
          <p className="text-gray-600">Plain English explanation of shipping quality.</p>
        </CardContent>
      </Card>

      {/* Return Window */}
      <Card>
        <CardContent>
          <h2 className="text-xl font-semibold mb-2">Return Window</h2>
          <p className="text-gray-600">Plain English explanation of return window.</p>
        </CardContent>
      </Card>

      {/* Returns (Quality) */}
      <Card>
        <CardContent>
          <h2 className="text-xl font-semibold mb-2">Returns (Quality)</h2>
          <p className="text-gray-600">Plain English explanation of returns quality.</p>
        </CardContent>
      </Card>

      {/* Wallets - Revised with branded text pills (no icons) */}
      <Card className="border-blue-500/40 bg-blue-50/30">
        <CardContent>
          <h2 className="text-xl font-semibold mb-3">Wallets</h2>
          <p className="text-gray-700">Text-based pills using branded colours.</p>

          <div className="flex flex-wrap gap-2 mt-4">
            {BRANDS.map((b) => (
              <span
                key={b.name}
                className={cx(
                  "rounded-full px-3 py-1 text-sm font-medium shadow-sm border border-black/5 transition",
                  b.bg,
                  b.text === "white" ? "text-white" : "text-slate-900 hover:brightness-95"
                )}
                title={b.name}
              >
                {b.name}
              </span>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Rating */}
      <Card>
        <CardContent>
          <h2 className="text-xl font-semibold mb-2">Rating</h2>
          <p className="text-gray-600">Plain English explanation of ratings.</p>
        </CardContent>
      </Card>

      {/* Reviews */}
      <Card>
        <CardContent>
          <h2 className="text-xl font-semibold mb-2">Reviews</h2>
          <p className="text-gray-600">Plain English explanation of reviews.</p>
        </CardContent>
      </Card>
    </div>
  );
}
