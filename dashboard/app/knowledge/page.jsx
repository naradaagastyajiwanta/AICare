'use client'
import { useEffect, useRef, useState } from 'react'
import { api } from '../../lib/api'
import Badge from '../../components/ui/Badge'
import { useToast } from '../../components/ui/Toast'
import { Brain, Plus, Search, X, Loader2, FileText, Trash2, Edit3, CheckSquare, CheckCircle2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

const CATEGORIES = {
  penyakit:    { label: 'Penyakit',    color: 'bg-danger-50 text-danger-700 ring-danger-200', dot: '#ef4e3f' },
  obat:        { label: 'Obat',        color: 'bg-info-50 text-info-700 ring-info-200', dot: '#3b82f6' },
  gaya_hidup:  { label: 'Gaya Hidup',  color: 'bg-primary-50 text-primary-700 ring-primary-200', dot: '#16a34a' },
  posyandu:    { label: 'Posyandu',   color: 'bg-purple-50 text-purple-700 ring-purple-200', dot: '#9333ea' },
  umum:        { label: 'Umum',        color: 'bg-surface-100 text-surface-700 ring-surface-200', dot: '#a3a39a' },
}

const EMPTY = { title: '', content: '', category: 'penyakit' }

export default function KnowledgePage() {
  const [items,     setItems]     = useState([])
  const [loading,   setLoading]   = useState(true)
  const [modal,     setModal]     = useState(false)
  const [form,      setForm]      = useState(EMPTY)
  const [saving,    setSaving]    = useState(false)
  const [filter,    setFilter]    = useState('all')
  const [search,    setSearch]    = useState('')
  const [deleting,  setDeleting]  = useState(null)
  const [selected,  setSelected]  = useState(new Set())
  const [bulkDeleting, setBulkDeleting] = useState(false)
  const { addToast } = useToast()

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

  function openAdd() { setForm(EMPTY); setModal('add') }
  function openEdit(item) {
    setForm({ title: item.title, content: item.content, category: item.category })
    setModal(item)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    try {
      if (modal === 'add') {
        await api.createKnowledge(form)
        addToast('Dokumen berhasil ditambahkan', 'success')
      } else {
        await api.updateKnowledge(modal.id, form)
        addToast('Dokumen berhasil diperbarui', 'success')
      }
      setModal(false)
      load()
    } catch (err) {
      addToast(err.message, 'error')
    } finally {
      setSaving(false)
    }
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
    setSelected(s => { const n = new Set(s); n.delete(id); return n })
    addToast('Dokumen dihapus', 'success')
    load()
  }

  async function handleBulkDelete() {
    const ids = [...selected]
    if (!confirm(`Hapus ${ids.length} dokumen yang dipilih?`)) return
    setBulkDeleting(true)
    try {
      const res = await api.bulkDeleteKnowledge(ids)
      setSelected(new Set())
      addToast(`${res.deleted} dokumen berhasil dihapus`, 'success')
      load()
    } catch (err) {
      addToast(err.message, 'error')
    } finally {
      setBulkDeleting(false)
    }
  }

  function toggleSelect(id) {
    setSelected(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })
  }

  function toggleSelectAll() {
    if (selected.size === filtered.length && filtered.length > 0) {
      setSelected(new Set())
    } else {
      setSelected(new Set(filtered.map(i => i.id)))
    }
  }

  // DOCX upload flow
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
      setDocxSelected(chunks.map((_, i) => i))
      setDocxModal(true)
    } catch (err) {
      addToast('Gagal parse DOCX: ' + err.message, 'error')
    } finally {
      setDocxParsing(false)
      e.target.value = ''
    }
  }

  function toggleChunk(i) {
    setDocxSelected(sel => sel.includes(i) ? sel.filter(x => x !== i) : [...sel, i])
  }

  async function handleDocxSave() {
    const selected = docxChunks.filter((_, i) => docxSelected.includes(i)).map(c => ({ title: c.title, content: c.content }))
    if (selected.length === 0) return
    setDocxSaving(true)
    try {
      const res = await api.bulkSaveKnowledge({ chunks: selected, category: docxCategory })
      setDocxResult(res)
      addToast(`${res.saved} dokumen berhasil disimpan`, 'success')
      load()
    } catch (err) {
      addToast(err.message, 'error')
    } finally {
      setDocxSaving(false)
    }
  }

  const filtered = items
    .filter(i => filter === 'all' || i.category === filter)
    .filter(i => !search || i.title.toLowerCase().includes(search.toLowerCase()) || i.content.toLowerCase().includes(search.toLowerCase()))
  const totalActive = items.filter(i => i.is_active).length

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-surface-900 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center">
              <Brain className="w-5 h-5 text-primary-600" />
            </div>
            Knowledge Base
          </h1>
          <p className="text-sm text-surface-500 mt-2">
            Dokumen referensi AI — <span className="font-medium text-primary-600">{totalActive} aktif</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => docxRef.current?.click()} disabled={docxParsing}
            className="btn-secondary text-xs py-2 disabled:opacity-60">
            {docxParsing ? (
              <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Memproses...</>
            ) : (
              <><FileText className="w-3.5 h-3.5" /> Upload DOCX</>
            )}
          </button>
          <input ref={docxRef} type="file" accept=".docx" onChange={handleDocxPick} className="hidden" />
          <button onClick={openAdd} className="btn-primary text-xs py-2">
            <Plus className="w-3.5 h-3.5" /> Tambah Manual
          </button>
        </div>
      </div>

      {/* Info banner */}
      <div className="bg-info-50 border border-info-200 rounded-xl px-4 py-3 mb-6 flex items-start gap-3">
        <Brain className="w-4 h-4 text-info-600 mt-0.5 shrink-0" />
        <div className="text-xs text-info-800">
          <p className="font-semibold mb-0.5">Cara kerja RAG</p>
          <p className="leading-relaxed">Saat pasien bertanya, AI mencari dokumen paling relevan menggunakan OpenAI Embeddings lalu menggunakannya sebagai referensi. Upload DOCX untuk import banyak dokumen sekaligus.</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          {[['all', 'Semua'], ...Object.entries(CATEGORIES).map(([k, v]) => [k, v.label])].map(([key, label]) => (
            <button key={key} onClick={() => setFilter(key)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                filter === key
                  ? 'bg-surface-800 text-white border-surface-800 shadow-sm'
                  : 'bg-white text-surface-600 border-surface-200 hover:border-surface-300'
              }`}>
              {label}
              {key !== 'all' && <span className="ml-1 opacity-60">{items.filter(i => i.category === key).length}</span>}
            </button>
          ))}
        </div>
        <div className="relative ml-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-surface-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Cari judul atau konten..."
            className="input pl-8 text-xs py-1.5 w-52" />
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-16 bg-surface-100 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-surface-200 p-12 text-center">
          <Brain className="w-10 h-10 text-surface-300 mx-auto mb-3" />
          <p className="text-sm text-surface-500 font-medium">Belum ada dokumen di knowledge base</p>
          <div className="flex gap-3 justify-center mt-3">
            <button onClick={() => docxRef.current?.click()} className="text-xs text-primary-600 hover:underline font-medium">Upload DOCX</button>
            <span className="text-xs text-surface-300">atau</span>
            <button onClick={openAdd} className="text-xs text-primary-600 hover:underline font-medium">Tambah manual</button>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-surface-200 shadow-sm overflow-hidden">
          {/* Bulk action bar */}
          {selected.size > 0 && (
            <div className="flex items-center justify-between px-4 py-2.5 bg-primary-50 border-b border-primary-100">
              <span className="text-xs font-medium text-primary-700">
                <CheckSquare className="w-3.5 h-3.5 inline mr-1.5 -mt-0.5" />
                {selected.size} dokumen dipilih
              </span>
              <div className="flex items-center gap-2">
                <button onClick={() => setSelected(new Set())}
                  className="text-xs text-primary-600 hover:text-primary-800 px-2 py-1 rounded hover:bg-primary-100 transition-colors">
                  Batalkan pilihan
                </button>
                <button onClick={handleBulkDelete} disabled={bulkDeleting}
                  className="flex items-center gap-1.5 text-xs text-white bg-danger-600 hover:bg-danger-700 disabled:opacity-60 px-3 py-1.5 rounded-lg transition-colors font-medium">
                  {bulkDeleting
                    ? <><Loader2 className="w-3 h-3 animate-spin" /> Menghapus...</>
                    : <><Trash2 className="w-3 h-3" /> Hapus {selected.size} dokumen</>}
                </button>
              </div>
            </div>
          )}

          <table className="w-full text-sm">
            <thead>
              <tr className="bg-surface-50 border-b border-surface-200">
                <th className="px-4 py-3 w-10">
                  <input
                    type="checkbox"
                    checked={filtered.length > 0 && selected.size === filtered.length}
                    ref={el => { if (el) el.indeterminate = selected.size > 0 && selected.size < filtered.length }}
                    onChange={toggleSelectAll}
                    className="w-3.5 h-3.5 rounded border-surface-300 text-primary-600 cursor-pointer"
                  />
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-surface-500 uppercase tracking-wider">Judul & Konten</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-surface-500 uppercase tracking-wider w-28">Kategori</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-surface-500 uppercase tracking-wider w-20">Status</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-surface-500 uppercase tracking-wider w-24">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-100">
              {filtered.map((item) => {
                const cat = CATEGORIES[item.category] || CATEGORIES.umum
                const isSelected = selected.has(item.id)
                return (
                  <tr key={item.id} className={`transition-colors ${isSelected ? 'bg-primary-50/50' : 'hover:bg-surface-50/60'} ${!item.is_active ? 'opacity-50' : ''}`}>
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelect(item.id)}
                        className="w-3.5 h-3.5 rounded border-surface-300 text-primary-600 cursor-pointer"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-surface-800 mb-0.5">{item.title}</p>
                      <p className="text-xs text-surface-400 line-clamp-2 leading-relaxed">{item.content}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium ring-1 ${cat.color}`}>
                        <span className="w-1.5 h-1.5 rounded-full" style={{ background: cat.dot }} />
                        {cat.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => handleToggle(item.id)}
                        className={`text-xs px-2 py-0.5 rounded-full ring-1 transition-colors ${
                          item.is_active
                            ? 'bg-primary-50 text-primary-700 ring-primary-200'
                            : 'bg-surface-100 text-surface-500 ring-surface-200'
                        }`}>
                        {item.is_active ? 'Aktif' : 'Nonaktif'}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => openEdit(item)}
                          className="p-1.5 text-surface-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors">
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => handleDelete(item.id)} disabled={deleting === item.id}
                          className="p-1.5 text-surface-400 hover:text-danger-600 hover:bg-danger-50 rounded-lg transition-colors disabled:opacity-50">
                          {deleting === item.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
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

      {/* DOCX Preview Modal */}
      <AnimatePresence>
        {docxModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.2 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[92vh] flex flex-col"
            >
              <div className="px-6 py-4 border-b border-surface-100 flex items-center justify-between shrink-0">
                <div>
                  <h2 className="text-base font-semibold text-surface-800">Preview: {docxName}</h2>
                  <p className="text-xs text-surface-400 mt-0.5">{docxChunks.length} chunks ditemukan — pilih yang ingin disimpan</p>
                </div>
                <button onClick={() => { setDocxModal(false); setDocxResult(null) }}
                  className="text-surface-400 hover:text-surface-600 transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {docxResult ? (
                <div className="flex-1 flex flex-col items-center justify-center p-8 gap-3">
                  <div className="w-14 h-14 rounded-full bg-primary-50 flex items-center justify-center">
                    <CheckCircle2 className="w-7 h-7 text-primary-600" />
                  </div>
                  <p className="text-base font-semibold text-surface-800">{docxResult.saved} dokumen berhasil disimpan</p>
                  {docxResult.failed > 0 && <p className="text-sm text-danger-500">{docxResult.failed} gagal</p>}
                  <button onClick={() => { setDocxModal(false); setDocxResult(null) }} className="btn-primary mt-2">
                    Tutup
                  </button>
                </div>
              ) : (
                <>
                  <div className="px-6 py-3 border-b border-surface-100 flex items-center gap-4 shrink-0">
                    <div className="flex items-center gap-2">
                      <label className="text-xs font-medium text-surface-600">Kategori:</label>
                      <select value={docxCategory} onChange={e => setDocxCategory(e.target.value)}
                        className="input text-xs py-1 w-32">
                        {Object.entries(CATEGORIES).map(([k, v]) => (
                          <option key={k} value={k}>{v.label}</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex items-center gap-3 ml-auto text-xs text-surface-500">
                      <button onClick={() => setDocxSelected(docxChunks.map((_, i) => i))} className="hover:text-primary-600">Pilih semua</button>
                      <button onClick={() => setDocxSelected([])} className="hover:text-danger-500">Hapus semua</button>
                      <span className="text-primary-600 font-medium">{docxSelected.length} dipilih</span>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
                    {docxChunks.map((chunk, i) => {
                      const selected = docxSelected.includes(i)
                      return (
                        <div key={i} onClick={() => toggleChunk(i)}
                          className={`rounded-xl border p-4 cursor-pointer transition-colors select-none ${
                            selected ? 'border-primary-400 bg-primary-50' : 'border-surface-200 bg-white hover:border-surface-300'
                          }`}>
                          <div className="flex items-start gap-3">
                            <div className={`mt-0.5 w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center ${
                              selected ? 'bg-primary-600 border-primary-600' : 'border-surface-300'
                            }`}>
                              {selected && <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold text-surface-700 mb-1 truncate">{chunk.title}</p>
                              <p className="text-xs text-surface-500 line-clamp-3 leading-relaxed">{chunk.content}</p>
                              <p className="text-xs text-surface-300 mt-1">{chunk.content.length} karakter</p>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  <div className="px-6 py-4 border-t border-surface-100 flex items-center justify-between shrink-0">
                    <p className="text-xs text-surface-400">Embedding akan digenerate untuk setiap chunk yang dipilih</p>
                    <div className="flex gap-3">
                      <button onClick={() => setDocxModal(false)} className="btn-secondary text-xs py-2">Batal</button>
                      <button onClick={handleDocxSave} disabled={docxSaving || docxSelected.length === 0} className="btn-primary text-xs py-2">
                        {docxSaving ? (
                          <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Generating...</>
                        ) : `Simpan ${docxSelected.length} chunk`}
                      </button>
                    </div>
                  </div>
                </>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add / Edit Modal */}
      <AnimatePresence>
        {modal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.2 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-xl mx-auto max-h-[92vh] overflow-y-auto"
            >
              <div className="px-6 py-4 border-b border-surface-100 flex items-center justify-between sticky top-0 bg-white z-10">
                <div>
                  <h2 className="text-base font-semibold text-surface-800">{modal === 'add' ? 'Tambah Dokumen' : 'Edit Dokumen'}</h2>
                  <p className="text-xs text-surface-400 mt-0.5">Embedding digenerate otomatis via OpenAI</p>
                </div>
                <button onClick={() => setModal(false)} className="text-surface-400 hover:text-surface-600 transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
                <div>
                  <label className="block text-xs font-medium text-surface-600 mb-1">Kategori *</label>
                  <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} className="input">
                    {Object.entries(CATEGORIES).map(([k, v]) => (
                      <option key={k} value={k}>{v.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-surface-600 mb-1">Judul *</label>
                  <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                    required placeholder="contoh: Cara Minum Obat Hipertensi" className="input" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-surface-600 mb-1">
                    Konten * <span className="text-surface-400 font-normal">— satu topik per dokumen</span>
                  </label>
                  <textarea value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
                    required rows={8}
                    placeholder={`Contoh:\nHipertensi adalah tekanan darah tinggi (≥140/90 mmHg). Gejala: sakit kepala, pusing. Penanganan: minum obat rutin, kurangi garam, olahraga, hindari stres.`}
                    className="input resize-none" />
                  <p className="text-xs text-surface-400 mt-1">{form.content.length} karakter</p>
                </div>
                <div className="flex justify-end gap-3 pt-1">
                  <button type="button" onClick={() => setModal(false)} className="btn-secondary">Batal</button>
                  <button type="submit" disabled={saving} className="btn-primary">
                    {saving ? 'Menyimpan...' : 'Simpan'}
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
