'use client'
import { useEffect, useRef, useState } from 'react'
import { api } from '../../lib/api'

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001'

const CATEGORIES = {
  dos_donts:  { label: "Do's & Don'ts", color: 'bg-blue-100 text-blue-700 border-blue-200' },
  motivation: { label: 'Motivasi',      color: 'bg-purple-100 text-purple-700 border-purple-200' },
  nutrition:  { label: 'Nutrisi',       color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  activity:   { label: 'Aktivitas',     color: 'bg-orange-100 text-orange-700 border-orange-200' },
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
      load()
    } catch (err) {
      alert(err.message)
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
    } catch (err) {
      setBroadcastResult(r => ({ ...r, [material.id]: { ok: false, err: err.message } }))
    } finally {
      setBroadcasting(null)
    }
  }

  const filtered = filter === 'all' ? materials : materials.filter(m => m.category === filter)

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Materi Edukasi</h1>
          <p className="text-sm text-gray-500 mt-0.5">Kelola konten edukasi untuk dikirim ke pasien via WhatsApp</p>
        </div>
        <button
          onClick={openModal}
          className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors"
        >
          + Tambah Materi
        </button>
      </div>

      {/* Category filter tabs */}
      <div className="flex items-center gap-2 mb-6 flex-wrap">
        {[['all', 'Semua'], ...Object.entries(CATEGORIES).map(([k, v]) => [k, v.label])].map(([key, label]) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
              filter === key
                ? 'bg-green-600 text-white border-green-600'
                : 'bg-white text-gray-600 border-gray-200 hover:border-green-400'
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
        <div className="flex items-center justify-center h-48 text-gray-400">Memuat...</div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 text-gray-400">
          <p className="text-4xl mb-2">📭</p>
          <p className="text-sm">Belum ada materi edukasi</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filtered.map(m => {
            const cat = CATEGORIES[m.category] || { label: m.category, color: 'bg-gray-100 text-gray-600 border-gray-200' }
            const bResult = broadcastResult[m.id]
            return (
              <div
                key={m.id}
                className={`bg-white rounded-2xl border overflow-hidden flex flex-col transition-shadow hover:shadow-md ${
                  m.is_active ? 'border-gray-200' : 'border-gray-100 opacity-60'
                }`}
              >
                {/* Image */}
                {imageUrl(m.image_url) ? (
                  <div className="h-44 bg-gray-100 overflow-hidden">
                    <img
                      src={imageUrl(m.image_url)}
                      alt={m.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="h-24 bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center text-3xl">
                    {m.category === 'dos_donts' ? '✅' : m.category === 'motivation' ? '💪' : m.category === 'nutrition' ? '🥗' : '🏃'}
                  </div>
                )}

                {/* Body */}
                <div className="p-4 flex flex-col flex-1">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${cat.color}`}>
                      {cat.label}
                    </span>
                    <button
                      onClick={() => handleToggle(m.id)}
                      className={`text-xs px-2 py-0.5 rounded-full border ${
                        m.is_active
                          ? 'bg-green-50 text-green-700 border-green-200'
                          : 'bg-gray-50 text-gray-500 border-gray-200'
                      }`}
                    >
                      {m.is_active ? 'Aktif' : 'Nonaktif'}
                    </button>
                  </div>

                  <h3 className="font-semibold text-gray-800 mb-1 leading-snug">{m.title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed line-clamp-3 flex-1">
                    {m.content}
                  </p>

                  {/* Broadcast result feedback */}
                  {bResult && (
                    <div className={`mt-3 px-3 py-2 rounded-lg text-xs ${bResult.ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
                      {bResult.ok
                        ? `✅ Terkirim ke ${bResult.sent} pasien${bResult.failed > 0 ? `, ${bResult.failed} gagal` : ''}`
                        : `❌ ${bResult.err}`}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-2 mt-4 pt-3 border-t border-gray-100">
                    <button
                      onClick={() => handleBroadcast(m)}
                      disabled={!m.is_active || broadcasting === m.id}
                      className="flex-1 py-2 text-xs font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 rounded-lg transition-colors"
                    >
                      {broadcasting === m.id ? 'Mengirim...' : '📢 Broadcast'}
                    </button>
                    <button
                      onClick={() => handleDelete(m.id)}
                      className="px-3 py-2 text-xs text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      Hapus
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Add Modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[92vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white rounded-t-2xl">
              <h2 className="text-base font-semibold text-gray-800">Tambah Materi Edukasi</h2>
              <button onClick={() => setModal(false)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
            </div>

            <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
              {/* Image upload area */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-2">Gambar / Poster (opsional)</label>
                <div
                  onClick={() => fileRef.current?.click()}
                  className="border-2 border-dashed border-gray-200 rounded-xl overflow-hidden cursor-pointer hover:border-green-400 transition-colors"
                >
                  {imgPreview ? (
                    <img src={imgPreview} alt="preview" className="w-full h-48 object-cover" />
                  ) : (
                    <div className="h-32 flex flex-col items-center justify-center text-gray-400 gap-1">
                      <span className="text-2xl">🖼️</span>
                      <p className="text-xs">Klik untuk upload gambar</p>
                      <p className="text-xs opacity-60">JPG, PNG, WebP — maks 10MB</p>
                    </div>
                  )}
                </div>
                <input ref={fileRef} type="file" accept="image/*" onChange={handleImagePick} className="hidden" />
                {imgPreview && (
                  <button type="button" onClick={() => { setImgFile(null); setImgPreview(null) }}
                    className="mt-1 text-xs text-red-400 hover:text-red-600">
                    Hapus gambar
                  </button>
                )}
                {!imgFile && (
                  <div className="mt-2">
                    <input
                      value={form.image_url}
                      onChange={e => setForm(f => ({ ...f, image_url: e.target.value }))}
                      placeholder="Atau masukkan URL gambar (https://...)"
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-green-400"
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Kategori *</label>
                <select
                  value={form.category}
                  onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                >
                  {Object.entries(CATEGORIES).map(([k, v]) => (
                    <option key={k} value={k}>{v.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Judul *</label>
                <input
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  required
                  placeholder="contoh: Tips Minum Obat Teratur"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Konten / Pesan *</label>
                <textarea
                  value={form.content}
                  onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
                  required
                  rows={5}
                  placeholder="Tulis isi pesan yang akan dikirim ke pasien via WhatsApp..."
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 resize-none"
                />
                <p className="text-xs text-gray-400 mt-1">Pesan ini yang akan dikirim saat broadcast</p>
              </div>

              <div className="flex justify-end gap-3 pt-1">
                <button type="button" onClick={() => setModal(false)}
                  className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg border border-gray-200">
                  Batal
                </button>
                <button type="submit" disabled={saving}
                  className="px-5 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg disabled:opacity-60">
                  {saving ? 'Menyimpan...' : 'Simpan Materi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
