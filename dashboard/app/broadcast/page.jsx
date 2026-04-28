'use client'
import { useEffect, useState } from 'react'
import { api } from '../../lib/api'
import Card from '../../components/ui/Card'
import Badge from '../../components/ui/Badge'
import { useToast } from '../../components/ui/Toast'
import { Megaphone, Send, CheckCircle2, AlertTriangle, Loader2, Clock } from 'lucide-react'

export default function BroadcastPage() {
  const [form,        setForm]        = useState({ title: '', message: '' })
  const [result,      setResult]      = useState(null)
  const [sending,     setSending]     = useState(false)
  const [error,       setError]       = useState(null)
  const [history,     setHistory]     = useState([])
  const [loadingHist, setLoadingHist] = useState(true)
  const [education,   setEducation]   = useState([])
  const { addToast } = useToast()

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
    setForm(f => ({ ...f, title: material.title, message: material.content }))
    addToast('Template diterapkan', 'info')
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
      addToast(`Broadcast terkirim ke ${res.sent} pasien`, 'success')
    } catch (err) {
      setError(err.message)
      addToast(err.message, 'error')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-surface-900 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center">
            <Megaphone className="w-5 h-5 text-primary-600" />
          </div>
          Broadcast Pesan
        </h1>
        <p className="text-sm text-surface-500 mt-2">Kirim pesan ke semua pasien aktif via WhatsApp</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Compose Form */}
        <Card padding="lg">
          <h2 className="text-sm font-semibold text-surface-800 mb-5">Tulis Pesan</h2>

          <form onSubmit={handleSend} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-surface-600 mb-1.5">Judul (opsional)</label>
              <input value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder="contoh: Jadwal Posyandu Bulan Ini" className="input" />
            </div>

            <div>
              <label className="block text-xs font-medium text-surface-600 mb-1.5">Pesan *</label>
              <textarea value={form.message}
                onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                rows={7} required placeholder="Tulis pesan broadcast di sini..."
                className="input resize-none" />
              <p className="text-xs text-surface-400 mt-1.5 text-right">{form.message.length} karakter</p>
            </div>

            {error && (
              <div className="flex items-center gap-2 text-sm text-danger-700 bg-danger-50 rounded-lg px-3 py-2.5 border border-danger-200">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}

            {result && (
              <div className="bg-primary-50 rounded-lg px-4 py-3 border border-primary-200">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-primary-600" />
                  <p className="text-sm font-semibold text-primary-800">Broadcast terkirim!</p>
                </div>
                <p className="text-xs text-primary-600 mt-1">
                  {result.sent} pasien berhasil dikirim
                  {result.failed > 0 && `, ${result.failed} gagal`}
                </p>
              </div>
            )}

            <button type="submit" disabled={sending || !form.message.trim()} className="w-full btn-primary py-3">
              {sending ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Mengirim...</>
              ) : (
                <><Send className="w-4 h-4" /> Kirim ke Semua Pasien</>
              )}
            </button>
          </form>

          {/* Education templates */}
          {education.filter(m => m.is_active).length > 0 && (
            <div className="mt-6 pt-5 border-t border-surface-100">
              <p className="text-xs font-medium text-surface-500 mb-3">Gunakan template materi edukasi:</p>
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {education.filter(m => m.is_active).map(m => (
                  <button key={m.id} type="button" onClick={() => useTemplate(m)}
                    className="w-full text-left px-3 py-2.5 rounded-lg border border-surface-200 hover:border-primary-300 hover:bg-primary-50/50 transition-colors">
                    <p className="text-xs font-semibold text-surface-700 truncate">{m.title}</p>
                    <p className="text-xs text-surface-400 mt-0.5 line-clamp-1">{m.content}</p>
                  </button>
                ))}
              </div>
            </div>
          )}
        </Card>

        {/* Broadcast History */}
        <Card padding="lg">
          <h2 className="text-sm font-semibold text-surface-800 mb-5">Riwayat Broadcast</h2>

          {loadingHist ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-20 bg-surface-100 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-12 text-surface-400">
              <Megaphone className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">Belum ada broadcast</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
              {history.map(b => (
                <div key={b.id} className="border border-surface-100 rounded-lg p-3.5 hover:bg-surface-50/50 transition-colors">
                  {b.title && (
                    <p className="text-xs font-semibold text-surface-700 mb-1">{b.title}</p>
                  )}
                  <p className="text-sm text-surface-600 whitespace-pre-line line-clamp-3">{b.message}</p>
                  <div className="flex items-center justify-between mt-2.5 text-xs text-surface-400">
                    <Badge variant="outline">{b.recipient_count} penerima</Badge>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(b.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
