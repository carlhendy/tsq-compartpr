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
      <body>
        {/* Simple Header */}
        <header className="px-6 py-6 border-b border-white" style={{ background: 'linear-gradient(to right, #0a4bf1 0%, #0a4bf1 60%, #3b82f6 80%, #60a5fa 100%)' }}>
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            <a href="https://audits.com" className="flex items-center">
              <img 
                src="https://audits.com/wp-content/uploads/2024/04/logo_light.svg?t=1757915579" 
                alt="Audits.com" 
                className="h-10 w-auto"
              />
            </a>
            <a 
              href="https://audits.com" 
              className="bg-white text-black px-4 py-2 rounded text-sm font-medium hover:bg-gray-100 transition-colors"
            >
              Back to Audits.com
            </a>
          </div>
        </header>
        {children}
      </body>
    </html>
  )
}