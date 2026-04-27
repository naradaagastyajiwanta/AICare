import './globals.css'
import Sidebar from '../components/Sidebar'

export const metadata = {
  title: 'AICare Dashboard',
  description: 'Sistem Monitoring Kepatuhan Minum Obat Posyandu',
}

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <body className="bg-gray-50 flex min-h-screen">
        <Sidebar />
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </body>
    </html>
  )
}
