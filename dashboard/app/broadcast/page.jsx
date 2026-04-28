'use client'
import { useEffect, useState } from 'react'
import { api } from '../../lib/api'

export default function BroadcastPage() {
  const [form,        setForm]        = useState({ title: '', message: '' })
  const [result,      setResult]      = useState(null)
  const [sending,     setSending]     = useState(false)
  const [error,       setError]       = useState(null)
  const [history,     setHistory]     = useState([])
  const [loadingHist, setLoadingHist] = useState(true)
  const [education,   setEducation]   = useState([])

  function loadHistory() {
    api.getBroadcasts()
      .then(setHistory)
      .finally(() => setLoadingHist(false))
  }

  useEffect(() => {
    loadHistory()
    api.getEducation().then(setEducation).catch(() => {})
  }, [])

  function useTemplate(material) {
    setForm(f => ({
      ...f,
      title: material.title,
      message: material.content,
    }))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

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
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Broadcast Pesan</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Compose Form */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-base font-semibold text-gray-700 mb-4">Kirim Pesan ke Semua Pasien</h2>

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
                rows={7}
                required
                placeholder="Tulis pesan broadcast di sini..."
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 resize-none"
              />
              <p className="text-xs text-gray-400 mt-1">{form.message.length} karakter</p>
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
            )}

            {result && (
              <div className="bg-green-50 rounded-lg px-4 py-3 border border-green-100">
                <p className="text-sm font-semibold text-green-700">
                  Broadcast terkirim! ✅
                </p>
                <p className="text-xs text-green-600 mt-1">
                  {result.sent} pasien berhasil dikirim
                  {result.failed > 0 && `, ${result.failed} gagal`}
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={sending || !form.message.trim()}
              className="w-full py-2.5 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg disabled:opacity-60 transition-colors"
            >
              {sending ? 'Mengirim...' : '📢 Kirim ke Semua Pasien'}
            </button>
          </form>

          {/* Education templates */}
          {education.filter(m => m.is_active).length > 0 && (
            <div className="mt-6 pt-5 border-t border-gray-100">
              <p className="text-xs font-medium text-gray-500 mb-3">Gunakan template materi edukasi:</p>
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {education.filter(m => m.is_active).map(m => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => useTemplate(m)}
                    className="w-full text-left px-3 py-2.5 rounded-lg border border-gray-200 hover:border-green-400 hover:bg-green-50 transition-colors"
                  >
                    <p className="text-xs font-semibold text-gray-700 truncate">{m.title}</p>
                    <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{m.content}</p>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Broadcast History */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-base font-semibold text-gray-700 mb-4">Riwayat Broadcast</h2>

          {loadingHist ? (
            <p className="text-gray-400 text-sm">Memuat...</p>
          ) : history.length === 0 ? (
            <p className="text-gray-400 text-sm">Belum ada broadcast</p>
          ) : (
            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
              {history.map(b => (
                <div key={b.id} className="border border-gray-100 rounded-lg p-3">
                  {b.title && (
                    <p className="text-xs font-semibold text-gray-700 mb-1">{b.title}</p>
                  )}
                  <p className="text-sm text-gray-600 whitespace-pre-line line-clamp-3">{b.message}</p>
                  <div className="flex items-center justify-between mt-2 text-xs text-gray-400">
                    <span>{b.recipient_count} penerima</span>
                    <span>{new Date(b.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
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
