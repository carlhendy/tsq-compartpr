import "./globals.css";

export const metadata = {
  title: "TQS Scorecard Comparator",
  description: "Compare up to five stores' public Google Store Pages signals by region.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
