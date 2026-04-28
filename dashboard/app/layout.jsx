import './globals.css'
import Sidebar from '../components/Sidebar'
import { ToastProvider } from '../components/ui/Toast'

export const metadata = {
  title: 'AICare Dashboard',
  description: 'Sistem Monitoring Kepatuhan Minum Obat Posyandu',
}

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <body className="bg-surface-50 flex min-h-screen">
        <ToastProvider>
          <Sidebar />
          <main className="flex-1 overflow-auto">
            {children}
          </main>
        </ToastProvider>
      </body>
    </html>
  )
}
