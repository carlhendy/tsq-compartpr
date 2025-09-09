import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Wallet } from "lucide-react";

export default function Page() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-6">
      {/* TQS */}
      <Card className="rounded-2xl shadow-md">
        <CardContent className="p-6">
          <h2 className="text-xl font-semibold mb-2">TQS</h2>
          <p className="text-gray-600">Trusted Quality Score explanation.</p>
        </CardContent>
      </Card>

      {/* Delivery Time */}
      <Card className="rounded-2xl shadow-md">
        <CardContent className="p-6">
          <h2 className="text-xl font-semibold mb-2">Delivery Time</h2>
          <p className="text-gray-600">Plain English explanation of delivery time.</p>
        </CardContent>
      </Card>

      {/* Shipping (Quality) */}
      <Card className="rounded-2xl shadow-md">
        <CardContent className="p-6">
          <h2 className="text-xl font-semibold mb-2">Shipping (Quality)</h2>
          <p className="text-gray-600">Plain English explanation of shipping quality.</p>
        </CardContent>
      </Card>

      {/* Return Window */}
      <Card className="rounded-2xl shadow-md">
        <CardContent className="p-6">
          <h2 className="text-xl font-semibold mb-2">Return Window</h2>
          <p className="text-gray-600">Plain English explanation of return window.</p>
        </CardContent>
      </Card>

      {/* Returns (Quality) */}
      <Card className="rounded-2xl shadow-md">
        <CardContent className="p-6">
          <h2 className="text-xl font-semibold mb-2">Returns (Quality)</h2>
          <p className="text-gray-600">Plain English explanation of returns quality.</p>
        </CardContent>
      </Card>

      {/* Wallets - Revised with branded colours */}
      <Card className="rounded-2xl shadow-md border border-blue-500 bg-blue-50">
        <CardContent className="p-6">
          <div className="flex items-center gap-3 mb-2">
            <Wallet className="text-blue-600" />
            <h2 className="text-xl font-semibold text-blue-700">Wallets</h2>
          </div>
          <p className="text-blue-800">Plain English explanation of wallets with branded styling.</p>
          <div className="flex gap-2 mt-4">
            <Button className="bg-blue-600 text-white hover:bg-blue-700 rounded-full px-4 py-2 shadow">Add Wallet</Button>
            <Button className="bg-blue-100 text-blue-700 hover:bg-blue-200 rounded-full px-4 py-2 shadow">Manage</Button>
          </div>
        </CardContent>
      </Card>

      {/* Rating */}
      <Card className="rounded-2xl shadow-md">
        <CardContent className="p-6">
          <h2 className="text-xl font-semibold mb-2">Rating</h2>
          <p className="text-gray-600">Plain English explanation of ratings.</p>
        </CardContent>
      </Card>

      {/* Reviews */}
      <Card className="rounded-2xl shadow-md">
        <CardContent className="p-6">
          <h2 className="text-xl font-semibold mb-2">Reviews</h2>
          <p className="text-gray-600">Plain English explanation of reviews.</p>
        </CardContent>
      </Card>
    </div>
  );
}
