'use client'
import { useEffect, useRef, useState } from 'react'
import { api } from '../../lib/api'

const CATEGORIES = {
  penyakit:    { label: 'Penyakit',    color: 'bg-red-100 text-red-700 border-red-200' },
  obat:        { label: 'Obat',        color: 'bg-blue-100 text-blue-700 border-blue-200' },
  gaya_hidup:  { label: 'Gaya Hidup', color: 'bg-green-100 text-green-700 border-green-200' },
  posyandu:    { label: 'Posyandu',   color: 'bg-purple-100 text-purple-700 border-purple-200' },
  umum:        { label: 'Umum',        color: 'bg-gray-100 text-gray-700 border-gray-200' },
}

const EMPTY = { title: '', content: '', category: 'penyakit' }

export default function KnowledgePage() {
  const [items,     setItems]     = useState([])
  const [loading,   setLoading]   = useState(true)
  const [modal,     setModal]     = useState(false)   // false | 'add' | item (edit)
  const [form,      setForm]      = useState(EMPTY)
  const [saving,    setSaving]    = useState(false)
  const [filter,    setFilter]    = useState('all')
  const [search,    setSearch]    = useState('')
  const [deleting,  setDeleting]  = useState(null)

  // DOCX upload state
  const [docxModal,     setDocxModal]     = useState(false)
  const [docxParsing,   setDocxParsing]   = useState(false)
  const [docxChunks,    setDocxChunks]    = useState([])
  const [docxName,      setDocxName]      = useState('')
  const [docxCategory,  setDocxCategory]  = useState('umum')
  const [docxSelected,  setDocxSelected]  = useState([])
  const [docxSaving,    setDocxSaving]    = useState(false)
  const [docxResult,    setDocxResult]    = useState(null)
  const docxRef = useRef()

  function load() {
    setLoading(true)
    api.getKnowledge().then(setItems).finally(() => setLoading(false))
  }
  useEffect(load, [])

  // ── Manual add/edit ──────────────────────────────────────────────────────────
  function openAdd() { setForm(EMPTY); setModal('add') }
  function openEdit(item) {
    setForm({ title: item.title, content: item.content, category: item.category })
    setModal(item)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    try {
      if (modal === 'add') await api.createKnowledge(form)
      else await api.updateKnowledge(modal.id, form)
      setModal(false)
      load()
    } catch (err) { alert(err.message) }
    finally { setSaving(false) }
  }

  async function handleToggle(id) {
    await api.toggleKnowledge(id).catch(() => {})
    load()
  }

  async function handleDelete(id) {
    if (!confirm('Hapus dokumen ini dari knowledge base?')) return
    setDeleting(id)
    await api.deleteKnowledge(id).catch(() => {})
    setDeleting(null)
    load()
  }

  // ── DOCX upload flow ─────────────────────────────────────────────────────────
  async function handleDocxPick(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setDocxParsing(true)
    setDocxChunks([])
    setDocxResult(null)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const { docName, chunks } = await api.parseDocx(fd)
      setDocxName(docName)
      setDocxChunks(chunks)
      setDocxSelected(chunks.map((_, i) => i))   // select all by default
      setDocxModal(true)
    } catch (err) {
      alert('Gagal parse DOCX: ' + err.message)
    } finally {
      setDocxParsing(false)
      e.target.value = ''   // reset file input
    }
  }

  function toggleChunk(i) {
    setDocxSelected(sel =>
      sel.includes(i) ? sel.filter(x => x !== i) : [...sel, i]
    )
  }

  async function handleDocxSave() {
    const selected = docxChunks
      .filter((_, i) => docxSelected.includes(i))
      .map(c => ({ title: c.title, content: c.content }))
    if (selected.length === 0) return
    setDocxSaving(true)
    try {
      const res = await api.bulkSaveKnowledge({ chunks: selected, category: docxCategory })
      setDocxResult(res)
      load()
    } catch (err) {
      alert(err.message)
    } finally {
      setDocxSaving(false)
    }
  }

  // ── Derived data ─────────────────────────────────────────────────────────────
  const filtered = items
    .filter(i => filter === 'all' || i.category === filter)
    .filter(i => !search ||
      i.title.toLowerCase().includes(search.toLowerCase()) ||
      i.content.toLowerCase().includes(search.toLowerCase())
    )
  const totalActive = items.filter(i => i.is_active).length

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Knowledge Base</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Dokumen referensi AI —{' '}
            <span className="font-medium text-green-600">{totalActive} aktif</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => docxRef.current?.click()}
            disabled={docxParsing}
            className="px-4 py-2 text-sm font-medium text-green-700 bg-green-50 hover:bg-green-100 border border-green-200 rounded-lg transition-colors flex items-center gap-1.5 disabled:opacity-60"
          >
            {docxParsing ? (
              <>
                <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                </svg>
                Memproses...
              </>
            ) : '📄 Upload DOCX'}
          </button>
          <input ref={docxRef} type="file" accept=".docx" onChange={handleDocxPick} className="hidden" />
          <button
            onClick={openAdd}
            className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors"
          >
            + Tambah Manual
          </button>
        </div>
      </div>

      {/* Info banner */}
      <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 mb-6 flex items-start gap-3">
        <span className="text-lg mt-0.5">🧠</span>
        <div className="text-xs text-blue-800">
          <p className="font-semibold mb-0.5">Cara kerja RAG</p>
          <p>Saat pasien bertanya, AI mencari dokumen paling relevan menggunakan OpenAI Embeddings lalu menggunakannya sebagai referensi. Upload DOCX untuk import banyak dokumen sekaligus — otomatis dipecah per paragraf.</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
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
                <span className="ml-1 opacity-60">{items.filter(i => i.category === key).length}</span>
              )}
            </button>
          ))}
        </div>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Cari judul atau konten..."
          className="ml-auto border border-gray-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-green-400 w-52"
        />
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center h-48 text-gray-400">Memuat...</div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 text-gray-400">
          <p className="text-4xl mb-2">📭</p>
          <p className="text-sm">Belum ada dokumen di knowledge base</p>
          <div className="flex gap-3 mt-3">
            <button onClick={() => docxRef.current?.click()} className="text-xs text-green-600 hover:underline">Upload DOCX</button>
            <span className="text-xs text-gray-300">atau</span>
            <button onClick={openAdd} className="text-xs text-green-600 hover:underline">Tambah manual</button>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 w-8">#</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Judul & Konten</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 w-28">Kategori</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 w-20">Status</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 w-28">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((item, idx) => {
                const cat = CATEGORIES[item.category] || CATEGORIES.umum
                return (
                  <tr key={item.id} className={`hover:bg-gray-50 transition-colors ${!item.is_active ? 'opacity-50' : ''}`}>
                    <td className="px-4 py-3 text-xs text-gray-400">{idx + 1}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-800 mb-0.5">{item.title}</p>
                      <p className="text-xs text-gray-400 line-clamp-2 leading-relaxed">{item.content}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${cat.color}`}>
                        {cat.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleToggle(item.id)}
                        className={`px-2 py-0.5 rounded-full text-xs border ${
                          item.is_active
                            ? 'bg-green-50 text-green-700 border-green-200'
                            : 'bg-gray-50 text-gray-500 border-gray-200'
                        }`}
                      >
                        {item.is_active ? 'Aktif' : 'Nonaktif'}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => openEdit(item)}
                          className="text-xs text-blue-500 hover:text-blue-700 px-2 py-1 rounded hover:bg-blue-50">
                          Edit
                        </button>
                        <button onClick={() => handleDelete(item.id)} disabled={deleting === item.id}
                          className="text-xs text-red-400 hover:text-red-600 px-2 py-1 rounded hover:bg-red-50 disabled:opacity-50">
                          {deleting === item.id ? '...' : 'Hapus'}
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── DOCX Preview Modal ───────────────────────────────────────────────── */}
      {docxModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between shrink-0">
              <div>
                <h2 className="text-base font-semibold text-gray-800">Preview: {docxName}</h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  {docxChunks.length} chunks ditemukan — pilih yang ingin disimpan
                </p>
              </div>
              <button onClick={() => { setDocxModal(false); setDocxResult(null) }}
                className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
            </div>

            {docxResult ? (
              <div className="flex-1 flex flex-col items-center justify-center p-8 gap-3">
                <p className="text-4xl">🎉</p>
                <p className="text-base font-semibold text-gray-800">
                  {docxResult.saved} dokumen berhasil disimpan
                </p>
                {docxResult.failed > 0 && (
                  <p className="text-sm text-red-500">{docxResult.failed} gagal</p>
                )}
                <button
                  onClick={() => { setDocxModal(false); setDocxResult(null) }}
                  className="mt-2 px-5 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg"
                >
                  Tutup
                </button>
              </div>
            ) : (
              <>
                {/* Category + select all */}
                <div className="px-6 py-3 border-b border-gray-100 flex items-center gap-4 shrink-0">
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-medium text-gray-600">Kategori:</label>
                    <select
                      value={docxCategory}
                      onChange={e => setDocxCategory(e.target.value)}
                      className="border border-gray-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-green-400"
                    >
                      {Object.entries(CATEGORIES).map(([k, v]) => (
                        <option key={k} value={k}>{v.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-center gap-3 ml-auto text-xs text-gray-500">
                    <button onClick={() => setDocxSelected(docxChunks.map((_, i) => i))}
                      className="hover:text-green-600">Pilih semua</button>
                    <button onClick={() => setDocxSelected([])}
                      className="hover:text-red-500">Hapus semua pilihan</button>
                    <span className="text-green-600 font-medium">{docxSelected.length} dipilih</span>
                  </div>
                </div>

                {/* Chunk list */}
                <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
                  {docxChunks.map((chunk, i) => {
                    const selected = docxSelected.includes(i)
                    return (
                      <div
                        key={i}
                        onClick={() => toggleChunk(i)}
                        className={`rounded-xl border p-4 cursor-pointer transition-colors select-none ${
                          selected
                            ? 'border-green-400 bg-green-50'
                            : 'border-gray-200 bg-white hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`mt-0.5 w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center ${
                            selected ? 'bg-green-600 border-green-600' : 'border-gray-300'
                          }`}>
                            {selected && <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-gray-700 mb-1 truncate">{chunk.title}</p>
                            <p className="text-xs text-gray-500 line-clamp-3 leading-relaxed">{chunk.content}</p>
                            <p className="text-xs text-gray-300 mt-1">{chunk.content.length} karakter</p>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between shrink-0">
                  <p className="text-xs text-gray-400">
                    Embedding akan digenerate untuk setiap chunk yang dipilih
                  </p>
                  <div className="flex gap-3">
                    <button onClick={() => setDocxModal(false)}
                      className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg border border-gray-200">
                      Batal
                    </button>
                    <button
                      onClick={handleDocxSave}
                      disabled={docxSaving || docxSelected.length === 0}
                      className="px-5 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg disabled:opacity-60 flex items-center gap-2"
                    >
                      {docxSaving ? (
                        <>
                          <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                          </svg>
                          Generating embeddings...
                        </>
                      ) : `Simpan ${docxSelected.length} chunk`}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Add / Edit Modal ─────────────────────────────────────────────────── */}
      {modal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[92vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white rounded-t-2xl">
              <div>
                <h2 className="text-base font-semibold text-gray-800">
                  {modal === 'add' ? 'Tambah Dokumen' : 'Edit Dokumen'}
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">Embedding digenerate otomatis via OpenAI</p>
              </div>
              <button onClick={() => setModal(false)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
            </div>

            <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
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
                  placeholder="contoh: Cara Minum Obat Hipertensi"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Konten *
                  <span className="ml-1 text-gray-400 font-normal">— satu topik per dokumen</span>
                </label>
                <textarea
                  value={form.content}
                  onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
                  required rows={8}
                  placeholder={`Contoh:\nHipertensi adalah tekanan darah tinggi (≥140/90 mmHg). Gejala: sakit kepala, pusing. Penanganan: minum obat rutin, kurangi garam, olahraga, hindari stres.`}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 resize-none"
                />
                <p className="text-xs text-gray-400 mt-1">{form.content.length} karakter</p>
              </div>
              <div className="flex justify-end gap-3 pt-1">
                <button type="button" onClick={() => setModal(false)}
                  className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg border border-gray-200">
                  Batal
                </button>
                <button type="submit" disabled={saving}
                  className="px-5 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg disabled:opacity-60 flex items-center gap-2">
                  {saving ? (
                    <>
                      <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                      </svg>
                      Generating embedding...
                    </>
                  ) : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
