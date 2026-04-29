'use client'
import { useEffect, useRef, useState } from 'react'
import { api } from '../../lib/api'
import Card from '../../components/ui/Card'
import Badge from '../../components/ui/Badge'
import { useToast } from '../../components/ui/Toast'
import { BookOpen, Plus, X, Send, Trash2, ImageIcon, Loader2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001'

const CATEGORIES = {
  dos_donts:  { label: "Do's & Don'ts", color: 'bg-primary-50 text-primary-700 ring-primary-200', dot: '#3b82f6' },
  motivation: { label: 'Motivasi',      color: 'bg-purple-50 text-purple-700 ring-purple-200', dot: '#9333ea' },
  nutrition:  { label: 'Nutrisi',       color: 'bg-success-50 text-success-700 ring-success-200', dot: '#10b981' },
  activity:   { label: 'Aktivitas',     color: 'bg-warning-50 text-warning-700 ring-warning-200', dot: '#f59e0b' },
}

const EMPTY_FORM = { title: '', category: 'dos_donts', content: '', image_url: '' }

function imageUrl(url) {
  if (!url) return null
  if (url.startsWith('http')) return url
  return `${BACKEND}${url}`
}

export default function EducationPage() {
  const [materials, setMaterials] = useState([])
  const [loading,   setLoading]   = useState(true)
  const [modal,     setModal]     = useState(false)
  const [form,      setForm]      = useState(EMPTY_FORM)
  const [imgFile,   setImgFile]   = useState(null)
  const [imgPreview,setImgPreview]= useState(null)
  const [saving,    setSaving]    = useState(false)
  const [filter,    setFilter]    = useState('all')
  const [broadcasting, setBroadcasting] = useState(null)
  const [broadcastResult, setBroadcastResult] = useState({})
  const fileRef = useRef()
  const { addToast } = useToast()

  function load() {
    setLoading(true)
    api.getEducation().then(setMaterials).finally(() => setLoading(false))
  }
  useEffect(load, [])

  function openModal() {
    setForm(EMPTY_FORM)
    setImgFile(null)
    setImgPreview(null)
    setModal(true)
  }

  function handleImagePick(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setImgFile(file)
    setImgPreview(URL.createObjectURL(file))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    try {
      const fd = new FormData()
      fd.append('title',    form.title)
      fd.append('category', form.category)
      fd.append('content',  form.content)
      if (form.image_url) fd.append('image_url', form.image_url)
      if (imgFile) fd.append('image', imgFile)
      await api.createEducation(fd)
      setModal(false)
      addToast('Materi edukasi berhasil ditambahkan', 'success')
      load()
    } catch (err) {
      addToast(err.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  async function handleToggle(id) {
    await api.toggleEducation(id).catch(() => {})
    load()
  }

  async function handleDelete(id) {
    if (!confirm('Hapus materi ini?')) return
    await api.deleteEducation(id)
    addToast('Materi dihapus', 'success')
    load()
  }

  async function handleBroadcast(material) {
    if (!confirm(`Kirim "${material.title}" ke semua pasien aktif via WhatsApp?`)) return
    setBroadcasting(material.id)
    setBroadcastResult(r => ({ ...r, [material.id]: null }))
    try {
      const res = await api.sendBroadcast({
        title:     material.title,
        message:   material.content,
        image_url: material.image_url ?? null,
      })
      setBroadcastResult(r => ({ ...r, [material.id]: { ok: true, sent: res.sent, failed: res.failed } }))
      addToast(`Broadcast terkirim ke ${res.sent} pasien`, 'success')
    } catch (err) {
      setBroadcastResult(r => ({ ...r, [material.id]: { ok: false, err: err.message } }))
      addToast(err.message, 'error')
    } finally {
      setBroadcasting(null)
    }
  }

  const filtered = filter === 'all' ? materials : materials.filter(m => m.category === filter)

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-surface-900 tracking-tight">Materi Edukasi</h1>
          <p className="text-sm text-surface-500 mt-1">Kelola konten edukasi untuk dikirim ke pasien via WhatsApp</p>
        </div>
        <button onClick={openModal} className="btn-primary">
          <Plus className="w-4 h-4" />
          Tambah Materi
        </button>
      </div>

      {/* Category filter tabs */}
      <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-1">
        {[['all', 'Semua'], ...Object.entries(CATEGORIES).map(([k, v]) => [k, v.label])].map(([key, label]) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all whitespace-nowrap ${
              filter === key
                ? 'bg-surface-800 text-white border-surface-800 shadow-soft'
                : 'bg-white text-surface-600 border-surface-200 hover:border-surface-300'
            }`}
          >
            {label}
            {key !== 'all' && (
              <span className="ml-1 opacity-60">
                {materials.filter(m => m.category === key).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl shadow-soft h-72 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-soft p-12 text-center">
          <BookOpen className="w-10 h-10 text-surface-300 mx-auto mb-3" />
          <p className="text-sm text-surface-500 font-medium">Belum ada materi edukasi</p>
          <p className="text-xs text-surface-400 mt-1">Tambahkan materi untuk mulai mengedukasi pasien</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filtered.map(m => {
            const cat = CATEGORIES[m.category] || { label: m.category, color: 'bg-surface-100 text-surface-600 ring-surface-200', dot: '#94a3b8' }
            const bResult = broadcastResult[m.id]
            return (
              <Card key={m.id} padding="none" hover className={`overflow-hidden flex flex-col ${!m.is_active ? 'opacity-60' : ''}`}>
                {imageUrl(m.image_url) ? (
                  <div className="h-44 bg-surface-100 overflow-hidden">
                    <img src={imageUrl(m.image_url)} alt={m.title} className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className="h-32 bg-gradient-to-br from-surface-50 to-surface-100 flex items-center justify-center">
                    <ImageIcon className="w-10 h-10 text-surface-300" />
                  </div>
                )}

                <div className="p-5 flex flex-col flex-1">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-semibold ring-1 ${cat.color}`}>
                      <span className="w-1.5 h-1.5 rounded-full mr-1.5" style={{ background: cat.dot }} />
                      {cat.label}
                    </span>
                    <button onClick={() => handleToggle(m.id)}
                      className={`text-xs px-2 py-0.5 rounded-full ring-1 transition-colors font-semibold ${
                        m.is_active
                          ? 'bg-success-50 text-success-700 ring-success-200'
                          : 'bg-surface-100 text-surface-500 ring-surface-200'
                      }`}>
                      {m.is_active ? 'Aktif' : 'Nonaktif'}
                    </button>
                  </div>

                  <h3 className="font-bold text-surface-900 mb-1 leading-snug">{m.title}</h3>
                  <p className="text-sm text-surface-500 leading-relaxed line-clamp-3 flex-1">{m.content}</p>

                  {bResult && (
                    <div className={`mt-3 px-3 py-2 rounded-xl text-xs font-medium ${bResult.ok ? 'bg-success-50 text-success-700 border border-success-200' : 'bg-danger-50 text-danger-700 border border-danger-200'}`}>
                      {bResult.ok
                        ? `Terkirim ke ${bResult.sent} pasien${bResult.failed > 0 ? `, ${bResult.failed} gagal` : ''}`
                        : bResult.err}
                    </div>
                  )}

                  <div className="flex items-center gap-2 mt-4 pt-3 border-t border-surface-100">
                    <button
                      onClick={() => handleBroadcast(m)}
                      disabled={!m.is_active || broadcasting === m.id}
                      className="flex-1 py-2 text-xs font-semibold text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50 rounded-xl transition-colors flex items-center justify-center gap-1.5"
                    >
                      {broadcasting === m.id ? (
                        <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Mengirim...</>
                      ) : (
                        <><Send className="w-3.5 h-3.5" /> Broadcast</>
                      )}
                    </button>
                    <button onClick={() => handleDelete(m.id)}
                      className="px-3 py-2 text-xs text-danger-400 hover:text-danger-600 hover:bg-danger-50 rounded-xl transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {/* Add Modal */}
      <AnimatePresence>
        {modal && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-start sm:items-center justify-center z-[60] p-0 sm:p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.2 }}
              className="bg-white rounded-none sm:rounded-2xl shadow-xl w-full sm:max-w-lg max-h-[100dvh] sm:max-h-[92vh] overflow-y-auto"
            >
              <div className="px-4 sm:px-6 py-4 border-b border-surface-100 flex items-center justify-between sticky top-0 bg-white z-10">
                <h2 className="text-base font-bold text-surface-800">Tambah Materi Edukasi</h2>
                <button onClick={() => setModal(false)} className="text-surface-400 hover:text-surface-600 transition-colors p-2 -mr-2 rounded-xl hover:bg-surface-100">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="px-4 sm:px-6 py-5 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-surface-600 mb-2">Gambar / Poster (opsional)</label>
                  <div onClick={() => fileRef.current?.click()}
                    className="border-2 border-dashed border-surface-200 rounded-xl overflow-hidden cursor-pointer hover:border-primary-400 transition-colors">
                    {imgPreview ? (
                      <img src={imgPreview} alt="preview" className="w-full h-48 object-cover" />
                    ) : (
                      <div className="h-32 flex flex-col items-center justify-center text-surface-400 gap-1">
                        <ImageIcon className="w-8 h-8" />
                        <p className="text-xs">Klik untuk upload gambar</p>
                        <p className="text-xs opacity-60">JPG, PNG, WebP — maks 10MB</p>
                      </div>
                    )}
                  </div>
                  <input ref={fileRef} type="file" accept="image/*" onChange={handleImagePick} className="hidden" />
                  {imgPreview && (
                    <button type="button" onClick={() => { setImgFile(null); setImgPreview(null) }}
                      className="mt-1 text-xs text-danger-500 hover:text-danger-700 font-medium">
                      Hapus gambar
                    </button>
                  )}
                  {!imgFile && (
                    <div className="mt-2">
                      <input value={form.image_url}
                        onChange={e => setForm(f => ({ ...f, image_url: e.target.value }))}
                        placeholder="Atau masukkan URL gambar (https://...)"
                        className="input text-xs py-2" />
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-surface-600 mb-1">Kategori *</label>
                  <select value={form.category}
                    onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                    className="input">
                    {Object.entries(CATEGORIES).map(([k, v]) => (
                      <option key={k} value={k}>{v.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-surface-600 mb-1">Judul *</label>
                  <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                    required placeholder="contoh: Tips Minum Obat Teratur" className="input" />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-surface-600 mb-1">Konten / Pesan *</label>
                  <textarea value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
                    required rows={5} placeholder="Tulis isi pesan yang akan dikirim ke pasien via WhatsApp..."
                    className="input resize-none" />
                  <p className="text-xs text-surface-400 mt-1 font-medium">{form.content.length} karakter</p>
                </div>

                <div className="flex justify-end gap-3 pt-1">
                  <button type="button" onClick={() => setModal(false)} className="btn-secondary">Batal</button>
                  <button type="submit" disabled={saving} className="btn-primary">
                    {saving ? 'Menyimpan...' : 'Simpan Materi'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
