import './globals.css'
import Sidebar from '../components/Sidebar'
import MobileHeader from '../components/MobileHeader'
import BottomNavWrapper from '../components/BottomNavWrapper'
import { ToastProvider } from '../components/ui/Toast'

export const metadata = {
  title: 'AICare Dashboard',
  description: 'Sistem Monitoring Kepatuhan Minum Obat Posyandu',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'AICare',
  },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: '48x48 32x32 16x16', type: 'image/x-icon' },
      { url: '/icon-192x192.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: '/apple-touch-icon.png',
  },
  manifest: '/manifest.json',
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
  themeColor: '#2563EB',
}

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <body className="min-h-screen">
        <ToastProvider>
          <div className="lg:flex min-h-screen">
            {/* Desktop Sidebar */}
            <div className="hidden lg:block">
              <Sidebar />
            </div>

            {/* Right side: mobile header + main content */}
            <div className="flex-1 flex flex-col min-w-0">
              <MobileHeader />
              {/* pb-24 on mobile clears bottom nav */}
              <main className="flex-1 min-w-0 pb-24 lg:pb-0">
                {children}
              </main>
            </div>
          </div>

          {/* Mobile Bottom Navigation + More Sheet (fixed, outside flow) */}
          <BottomNavWrapper />
        </ToastProvider>
      </body>
    </html>
  )
}
