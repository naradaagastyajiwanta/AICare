'use client'
import { useEffect, useState } from 'react'

const STATUS_LABEL = {
  unknown:      { text: 'Memeriksa...',         color: 'gray'   },
  starting:     { text: 'Menghubungkan...',      color: 'yellow' },
  qr:           { text: 'Menunggu scan QR',      color: 'blue'   },
  connected:    { text: 'Terhubung',             color: 'green'  },
  disconnected: { text: 'Terputus',              color: 'red'    },
  stopped:      { text: 'Tidak berjalan',        color: 'red'    },
  error:        { text: 'Error',                 color: 'red'    },
}

const DOT_COLOR = {
  gray:   'bg-gray-400',
  yellow: 'bg-yellow-400 animate-pulse',
  blue:   'bg-blue-400 animate-pulse',
  green:  'bg-green-500 animate-pulse',
  red:    'bg-red-500',
}

const BADGE_COLOR = {
  gray:   'bg-gray-100 text-gray-600',
  yellow: 'bg-yellow-100 text-yellow-700',
  blue:   'bg-blue-100 text-blue-700',
  green:  'bg-green-100 text-green-700',
  red:    'bg-red-100 text-red-700',
}

export default function WhatsAppPage() {
  const [state, setState] = useState({ status: 'unknown', qrDataUrl: null, managed: false })
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
  const info = STATUS_LABEL[status] ?? STATUS_LABEL.unknown
  const color = info.color

  return (
    <div className="p-8 max-w-lg">
      <h1 className="text-2xl font-bold text-gray-800 mb-2">WhatsApp</h1>
      <p className="text-sm text-gray-500 mb-8">Kelola koneksi WhatsApp AICare</p>

      {/* Status Card */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm font-medium text-gray-600">Status Koneksi</span>
          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${BADGE_COLOR[color]}`}>
            <span className={`w-2 h-2 rounded-full ${DOT_COLOR[color]}`} />
            {info.text}
          </span>
        </div>

        {status === 'connected' && (
          <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
            <span className="text-2xl">✅</span>
            <div>
              <p className="text-sm font-medium text-green-800">WhatsApp Aktif</p>
              <p className="text-xs text-green-600">AICare siap menerima dan membalas pesan 24/7</p>
            </div>
          </div>
        )}

        {status === 'qr' && qrDataUrl && (
          <div className="text-center">
            <p className="text-sm text-gray-600 mb-4">
              Buka WhatsApp di HP → <strong>Perangkat Tertaut</strong> → <strong>Tautkan Perangkat</strong> → scan QR ini
            </p>
            <div className="inline-block p-3 bg-white border-2 border-gray-200 rounded-xl">
              <img src={qrDataUrl} alt="WhatsApp QR Code" className="w-56 h-56" />
            </div>
            <p className="text-xs text-gray-400 mt-3">QR berlaku beberapa menit. Klik Hubungkan Ulang jika kadaluarsa.</p>
          </div>
        )}

        {status === 'qr' && !qrDataUrl && (
          <div className="text-center py-4 text-gray-500 text-sm">
            Menunggu QR code dari picoclaw...
          </div>
        )}

        {(status === 'starting' || status === 'unknown') && (
          <div className="flex items-center gap-3 p-3 bg-yellow-50 rounded-lg">
            <div className="w-5 h-5 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-yellow-700">Menghubungkan ke WhatsApp...</p>
          </div>
        )}

        {(status === 'disconnected' || status === 'stopped' || status === 'error') && (
          <div className="flex items-center gap-3 p-3 bg-red-50 rounded-lg">
            <span className="text-2xl">⚠️</span>
            <div>
              <p className="text-sm font-medium text-red-800">WhatsApp Tidak Terhubung</p>
              <p className="text-xs text-red-600">Klik tombol di bawah untuk menghubungkan ulang</p>
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <button
        onClick={handleRestart}
        disabled={restarting || status === 'starting'}
        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white text-sm font-medium rounded-lg transition-colors"
      >
        {restarting ? (
          <>
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            Menghubungkan ulang...
          </>
        ) : (
          <>
            <span>🔄</span>
            Hubungkan Ulang / Tampilkan QR Baru
          </>
        )}
      </button>

      <p className="text-xs text-gray-400 text-center mt-4">
        Tombol ini akan merestart koneksi dan menampilkan QR baru untuk di-scan
      </p>
    </div>
  )
}
