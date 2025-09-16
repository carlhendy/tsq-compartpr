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
        <link href="https://fonts.googleapis.com/css2?family=Sofia+Sans:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet" />
      </head>
      <body style={{ fontFamily: 'Sofia Sans, sans-serif' }}>
        {/* Simple Header */}
        <header className="px-6 py-6 border-b border-white" style={{ backgroundColor: '#0a4bf1' }}>
          <div className="max-w-6xl mx-auto flex items-center">
            <a href="https://audits.com" className="flex items-center">
              <img 
                src="https://audits.com/wp-content/uploads/2024/04/logo_light.svg?t=1757915579" 
                alt="Audits.com" 
                className="h-10 w-auto"
              />
            </a>
          </div>
        </header>
        {children}
      </body>
    </html>
  )
}