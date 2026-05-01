'use client'
import { useEffect, useState } from 'react'
import Card from '../../components/ui/Card'
import Badge from '../../components/ui/Badge'
import {
  MessageCircle, RefreshCw, QrCode, CheckCircle2,
  WifiOff, Loader2, Smartphone, LogOut,
} from 'lucide-react'

const STATUS_CONFIG = {
  unknown:      { text: 'Memeriksa...',         color: 'gray',    icon: Loader2,      spin: true  },
  starting:     { text: 'Menghubungkan...',      color: 'warning', icon: Loader2,      spin: true  },
  qr:           { text: 'Menunggu scan QR',      color: 'primary', icon: QrCode,       spin: false },
  connected:    { text: 'Terhubung',             color: 'success', icon: CheckCircle2, spin: false },
  disconnected: { text: 'Terputus',              color: 'danger',  icon: WifiOff,      spin: false },
  stopped:      { text: 'Tidak berjalan',        color: 'danger',  icon: WifiOff,      spin: false },
  error:        { text: 'Error',                 color: 'danger',  icon: WifiOff,      spin: false },
}

export default function WhatsAppPage() {
  const [state, setState] = useState({ status: 'unknown', qrDataUrl: null })
  const [restarting, setRestarting] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  const [startingTimeout, setStartingTimeout] = useState(false)

  useEffect(() => {
    let es
    let closed = false

    function connect() {
      if (closed) return
      es = new EventSource('/api/wa/events')
      es.onmessage = (e) => {
        try { setState(JSON.parse(e.data)) } catch {}
      }
      es.onerror = () => {
        setState(s => ({
          ...s,
          status: s.status === 'connected' ? 'disconnected' : s.status === 'starting' ? 'starting' : 'error',
        }))
        // EventSource auto-reconnects — no manual retry needed
      }
    }

    connect()
    return () => {
      closed = true
      es?.close()
    }
  }, [])

  // Surface the restart button if stuck in starting/unknown for >20s
  useEffect(() => {
    if (state.status !== 'starting' && state.status !== 'unknown') {
      setStartingTimeout(false)
      return
    }
    const t = setTimeout(() => setStartingTimeout(true), 20_000)
    return () => clearTimeout(t)
  }, [state.status])

  const handleRestart = async () => {
    setRestarting(true)
    setStartingTimeout(false)
    setState(s => ({ ...s, status: 'starting', qrDataUrl: null }))
    await fetch('/api/wa/restart', { method: 'POST' }).catch(() => {})
    // Backend will broadcast real status via SSE; clear spinner after a safe window
    setTimeout(() => setRestarting(false), 3000)
  }

  const handleLogout = async () => {
    setLoggingOut(true)
    setStartingTimeout(false)
    setState({ status: 'starting', qrDataUrl: null })
    await fetch('/api/wa/logout', { method: 'POST' }).catch(() => {})
    setTimeout(() => setLoggingOut(false), 3000)
  }

  const { status, qrDataUrl } = state
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.unknown
  const StatusIcon = config.icon
  const busy = restarting || loggingOut

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
            <StatusIcon className={`w-3.5 h-3.5 mr-1 ${config.spin ? 'animate-spin' : ''}`} />
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
            <Loader2 className="w-5 h-5 text-warning-600 animate-spin shrink-0" />
            <div>
              <p className="text-sm font-bold text-warning-800">Menghubungkan ke WhatsApp...</p>
              <p className="text-xs text-warning-600 font-medium">
                {startingTimeout
                  ? 'Butuh waktu lebih lama — klik tombol di bawah untuk coba lagi.'
                  : 'Menunggu respons dari server, ini bisa 10–30 detik.'}
              </p>
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

      {/* Primary: reconnect with existing session */}
      <button
        onClick={handleRestart}
        disabled={busy}
        className="w-full btn-primary py-3 mb-3"
      >
        {restarting ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Menghubungkan ulang...
          </>
        ) : (
          <>
            <RefreshCw className="w-4 h-4" />
            Hubungkan Ulang
          </>
        )}
      </button>

      {/* Secondary: clear session → always shows fresh QR */}
      <button
        onClick={handleLogout}
        disabled={busy}
        className="w-full btn-secondary py-3"
      >
        {loggingOut ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Menghapus sesi...
          </>
        ) : (
          <>
            <LogOut className="w-4 h-4" />
            Hapus Sesi &amp; Tampilkan QR Baru
          </>
        )}
      </button>

      <p className="text-xs text-surface-400 text-center mt-4 font-medium">
        <strong>Hubungkan Ulang</strong> — coba sambung dengan sesi yang ada.<br />
        <strong>Hapus Sesi</strong> — paksa QR baru, perlu scan ulang di HP.
      </p>
    </div>
  )
}
