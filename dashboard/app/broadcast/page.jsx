'use client'
import { useEffect, useState } from 'react'
import { api } from '../../lib/api'

export default function BroadcastPage() {
  const [form,       setForm]       = useState({ title: '', message: '' })
  const [result,     setResult]     = useState(null)
  const [sending,    setSending]    = useState(false)
  const [error,      setError]      = useState(null)
  const [history,    setHistory]    = useState([])
  const [loadingHist,setLoadingHist]= useState(true)

  function loadHistory() {
    api.getBroadcasts()
      .then(setHistory)
      .finally(() => setLoadingHist(false))
  }

  useEffect(loadHistory, [])

  async function handleSend(e) {
    e.preventDefault()
    if (!form.message.trim()) return
    setSending(true)
    setError(null)
    setResult(null)
    try {
      const res = await api.sendBroadcast(form)
      setResult(res)
      setForm({ title: '', message: '' })
      loadHistory()
    } catch (err) {
      setError(err.message)
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Broadcast Pengumuman</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Compose Form */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-base font-semibold text-gray-700 mb-4">Buat Pesan Baru</h2>

          <form onSubmit={handleSend} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Judul (opsional)</label>
              <input
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder="contoh: Jadwal Posyandu Bulan Ini"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Pesan *</label>
              <textarea
                value={form.message}
                onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                rows={6}
                required
                placeholder="Tulis pengumuman di sini..."
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 resize-none"
              />
              <p className="text-xs text-gray-400 mt-1">{form.message.length} karakter</p>
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
            )}

            {result && (
              <div className="bg-green-50 rounded-lg px-4 py-3 border border-green-100">
                <p className="text-sm font-medium text-green-700">
                  Broadcast tersimpan untuk {result.broadcast.recipient_count} pasien
                </p>
                <p className="text-xs text-green-600 mt-1">
                  Buka PicoClaw dan kirimkan pesan ini ke daftar pasien di bawah.
                </p>
                {result.patients?.length > 0 && (
                  <div className="mt-2 max-h-32 overflow-y-auto space-y-0.5">
                    {result.patients.map(p => (
                      <p key={p.id} className="text-xs text-green-700">{p.name} — {p.phone}</p>
                    ))}
                  </div>
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={sending || !form.message.trim()}
              className="w-full py-2.5 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg disabled:opacity-60 transition-colors"
            >
              {sending ? 'Menyimpan...' : '📢 Simpan & Siapkan Broadcast'}
            </button>
          </form>
        </div>

        {/* Broadcast History */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-base font-semibold text-gray-700 mb-4">Riwayat Broadcast</h2>

          {loadingHist ? (
            <p className="text-gray-400 text-sm">Memuat...</p>
          ) : history.length === 0 ? (
            <p className="text-gray-400 text-sm">Belum ada broadcast</p>
          ) : (
            <div className="space-y-3">
              {history.map(b => (
                <div key={b.id} className="border border-gray-100 rounded-lg p-3">
                  {b.title && (
                    <p className="text-xs font-semibold text-gray-700 mb-1">{b.title}</p>
                  )}
                  <p className="text-sm text-gray-600 line-clamp-2">{b.message}</p>
                  <div className="flex items-center justify-between mt-2 text-xs text-gray-400">
                    <span>{b.recipient_count} penerima</span>
                    <span>{new Date(b.created_at).toLocaleDateString('id-ID')}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
