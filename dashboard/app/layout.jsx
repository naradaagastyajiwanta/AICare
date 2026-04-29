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
    apple: '/icon-192x192.png',
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
          {/* Desktop Sidebar */}
          <div className="hidden lg:block">
            <Sidebar />
          </div>

          {/* Mobile Header */}
          <MobileHeader />

          {/* Main Content — pb-24 on mobile clears bottom nav */}
          <main className="flex-1 overflow-auto min-w-0 pb-24 lg:pb-0">
            {children}
          </main>

          {/* Mobile Bottom Navigation + More Sheet */}
          <BottomNavWrapper />
        </ToastProvider>
      </body>
    </html>
  )
}
