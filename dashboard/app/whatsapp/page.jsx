'use client'
import { useEffect, useState } from 'react'
import Card from '../../components/ui/Card'
import Badge from '../../components/ui/Badge'
import {
  MessageCircle, RefreshCw, QrCode, CheckCircle2,
  WifiOff, Loader2, Smartphone,
} from 'lucide-react'

const STATUS_CONFIG = {
  unknown:      { text: 'Memeriksa...',         color: 'gray',   icon: Loader2,      spin: true },
  starting:     { text: 'Menghubungkan...',      color: 'warning', icon: Loader2,      spin: true },
  qr:           { text: 'Menunggu scan QR',      color: 'primary', icon: QrCode,       spin: false },
  connected:    { text: 'Terhubung',             color: 'success', icon: CheckCircle2, spin: false },
  disconnected: { text: 'Terputus',              color: 'danger', icon: WifiOff,      spin: false },
  stopped:      { text: 'Tidak berjalan',        color: 'danger', icon: WifiOff,      spin: false },
  error:        { text: 'Error',                 color: 'danger', icon: WifiOff,      spin: false },
}

export default function WhatsAppPage() {
  const [state, setState] = useState({ status: 'unknown', qrDataUrl: null })
  const [restarting, setRestarting] = useState(false)

  useEffect(() => {
    const es = new EventSource('/api/wa/events')
    es.onmessage = (e) => {
      try { setState(JSON.parse(e.data)) } catch {}
    }
    es.onerror = () => setState(s => ({ ...s, status: s.status === 'connected' ? 'disconnected' : s.status }))
    return () => es.close()
  }, [])

  const handleRestart = async () => {
    setRestarting(true)
    await fetch('/api/wa/restart', { method: 'POST' }).catch(() => {})
    setTimeout(() => setRestarting(false), 3000)
  }

  const { status, qrDataUrl } = state
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.unknown
  const StatusIcon = config.icon

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-xl mx-auto">
      <div className="mb-8">
        <h1 className="text-xl sm:text-2xl font-bold text-surface-900 tracking-tight flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center">
            <MessageCircle className="w-5 h-5 text-primary-600" />
          </div>
          WhatsApp
        </h1>
        <p className="text-sm text-surface-500 mt-2">Kelola koneksi WhatsApp AICare untuk kirim dan terima pesan</p>
      </div>

      {/* Status Card */}
      <Card padding="lg" className="mb-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          <span className="text-sm font-bold text-surface-600 uppercase tracking-wider">Status Koneksi</span>
          <Badge
            variant={config.color}
            dot
            pulse={config.spin || status === 'qr'}
            className="capitalize"
          >
            {config.text}
          </Badge>
        </div>

        {status === 'connected' && (
          <div className="flex flex-col sm:flex-row items-center gap-4 p-4 bg-success-50 rounded-xl border border-success-100">
            <div className="w-12 h-12 rounded-xl bg-success-100 flex items-center justify-center">
              <Smartphone className="w-6 h-6 text-success-600" />
            </div>
            <div>
              <p className="text-sm font-bold text-success-800">WhatsApp Aktif</p>
              <p className="text-xs text-success-600 font-medium">AICare siap menerima dan membalas pesan pasien 24/7</p>
            </div>
            <CheckCircle2 className="w-5 h-5 text-success-500 ml-auto" />
          </div>
        )}

        {status === 'qr' && qrDataUrl && (
          <div className="text-center">
            <p className="text-sm text-surface-600 mb-4">
              Buka WhatsApp di HP → <strong>Perangkat Tertaut</strong> → <strong>Tautkan Perangkat</strong>
            </p>
            <div className="inline-block p-4 bg-white border-2 border-dashed border-surface-300 rounded-2xl">
              <img src={qrDataUrl} alt="WhatsApp QR Code" className="w-56 h-56" />
            </div>
            <p className="text-xs text-surface-400 mt-3">QR berlaku beberapa menit. Klik tombol di bawah jika kadaluarsa.</p>
          </div>
        )}

        {status === 'qr' && !qrDataUrl && (
          <div className="flex flex-col items-center py-8 text-surface-400">
            <Loader2 className="w-8 h-8 animate-spin mb-2" />
            <p className="text-sm">Menunggu QR code dari server...</p>
          </div>
        )}

        {(status === 'starting' || status === 'unknown') && (
          <div className="flex flex-col sm:flex-row items-center gap-4 p-4 bg-warning-50 rounded-xl border border-warning-100">
            <Loader2 className="w-5 h-5 text-warning-600 animate-spin" />
            <div>
              <p className="text-sm font-bold text-warning-800">Menghubungkan ke WhatsApp...</p>
              <p className="text-xs text-warning-600 font-medium">Ini bisa memakan waktu 10-30 detik</p>
            </div>
          </div>
        )}

        {(status === 'disconnected' || status === 'stopped' || status === 'error') && (
          <div className="flex flex-col sm:flex-row items-center gap-4 p-4 bg-danger-50 rounded-xl border border-danger-100">
            <WifiOff className="w-5 h-5 text-danger-600" />
            <div>
              <p className="text-sm font-bold text-danger-800">WhatsApp Tidak Terhubung</p>
              <p className="text-xs text-danger-600 font-medium">Klik tombol di bawah untuk menghubungkan ulang</p>
            </div>
          </div>
        )}
      </Card>

      <button
        onClick={handleRestart}
        disabled={restarting || status === 'starting'}
        className="w-full btn-primary py-3"
      >
        {restarting ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Menghubungkan ulang...
          </>
        ) : (
          <>
            <RefreshCw className="w-4 h-4" />
            Hubungkan Ulang / Tampilkan QR Baru
          </>
        )}
      </button>

      <p className="text-xs text-surface-400 text-center mt-4 font-medium">
        Tombol ini akan merestart koneksi dan menampilkan QR baru untuk di-scan
      </p>
    </div>
  )
}
