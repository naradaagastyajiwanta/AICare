import './globals.css'
import Sidebar from '../components/Sidebar'
import MobileNav from '../components/MobileNav'
import { ToastProvider } from '../components/ui/Toast'

export const metadata = {
  title: 'AICare Dashboard',
  description: 'Sistem Monitoring Kepatuhan Minum Obat Posyandu',
}

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <body className="min-h-screen">
        <ToastProvider>
          {/* Mobile Header + Drawer */}
          <MobileNav />

          <div className="flex min-h-screen">
            {/* Desktop Sidebar — hidden on mobile */}
            <div className="hidden lg:block">
              <Sidebar />
            </div>

            {/* Main Content */}
            <main className="flex-1 overflow-auto min-w-0">
              {children}
            </main>
          </div>
        </ToastProvider>
      </body>
    </html>
  )
}
