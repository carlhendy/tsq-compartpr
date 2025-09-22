import "./globals.css";

export const metadata={
  title:"Compare Google Store Ratings – Bulk & Free",
  icons: {
    icon: "/shoppingfav.ico"
  }
};
export default function RootLayout({children}:{children:React.ReactNode}){
  return(
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=Manrope:wght@200;300;400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body style={{ fontFamily: 'Manrope, sans-serif', backgroundColor: '#F3F9FF' }}>
        {/* Simple Header */}
        <header className="px-6 py-6 bg-transparent relative" style={{ zIndex: 10 }}>
          <div className="max-w-6xl mx-auto flex items-center justify-between">
          <a href="https://storeratings.co" className="flex items-center gap-1">
            <span className="text-white text-2xl tracking-tight" style={{ fontFamily: 'Manrope, sans-serif' }}>
              STORE RATINGS
            </span>
          </a>
          <div id="about-button-placeholder"></div>
          </div>
        </header>
        {children}
      </body>
    </html>
  )
}