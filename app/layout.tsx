import "./globals.css";

export const metadata={
  title:"Compare Google Store Ratings – Bulk & Free",
  icons: {
    icon: "https://audits.com/wp-content/uploads/2024/05/Favicon-Solid-Blue__Square.png"
  }
};
export default function RootLayout({children}:{children:React.ReactNode}){
  return(
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet" />
      </head>
      <body style={{ fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
        {/* Simple Header */}
        <header className="px-6 py-6 border-b border-gray-200 bg-white">
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            <a href="https://storeratings.co" className="flex items-center">
              <span className="text-black text-2xl tracking-tight" style={{ fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
                storeratings.co
              </span>
            </a>
            <a href="https://storeratings.co/about/" className="bg-black text-white px-4 py-2 rounded-md text-sm font-semibold hover:bg-gray-800 transition-colors tracking-wide" style={{ fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
              about
            </a>
          </div>
        </header>
        {children}
      </body>
    </html>
  )
}