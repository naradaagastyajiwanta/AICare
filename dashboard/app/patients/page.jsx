'use client'
import { useEffect, useState, useMemo } from 'react'
import { api } from '../../lib/api'
import Badge from '../../components/ui/Badge'
import Avatar from '../../components/ui/Avatar'
import { SkeletonTable } from '../../components/ui/Skeleton'
import { useToast } from '../../components/ui/Toast'
import {
  Search,
  Plus,
  Edit3,
  Power,
  PowerOff,
  Pill,
  Clock,
  UserCheck,
  Filter,
  X,
  ChevronDown,
  AlertTriangle,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

const EMPTY = {
  name: '', phone: '', guardian_name: '', guardian_phone: '',
  medicine_name: '', notes: '', is_active: true,
  reminder_times: [{ time: '08:00', label: '', category: 'medication' }],
}

function normalizePatient(p) {
  if (!p) return EMPTY
  return {
    ...p,
    reminder_times: p.reminder_times?.length > 0
      ? p.reminder_times.map(rt => ({ time: rt.time?.slice(0, 5) ?? '08:00', label: rt.label || '', category: rt.category || 'medication' }))
      : [{ time: (p.reminder_time ?? '08:00').slice(0, 5), label: '', category: 'medication' }],
  }
}

const CATEGORY_EMOJI = { medication: '💊', activity: '🏃', diet: '🥗' }
const CATEGORY_COLORS = {
  medication: 'bg-primary-50 text-primary-700 ring-primary-200',
  activity: 'bg-warning-50 text-warning-700 ring-warning-200',
  diet: 'bg-info-50 text-info-700 ring-info-200',
}

function Modal({ patient, onClose, onSave }) {
  const [form, setForm] = useState(normalizePatient(patient))
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState(null)
  const { addToast } = useToast()

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))
  const toggle = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.checked }))

  function addReminderTime() {
    setForm(f => ({ ...f, reminder_times: [...f.reminder_times, { time: '08:00', label: '', category: 'medication' }] }))
  }

  function removeReminderTime(idx) {
    setForm(f => ({ ...f, reminder_times: f.reminder_times.filter((_, i) => i !== idx) }))
  }

  function updateReminderTime(idx, field, value) {
    setForm(f => ({
      ...f,
      reminder_times: f.reminder_times.map((rt, i) => i === idx ? { ...rt, [field]: value } : rt)
    }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    setErr(null)
    try {
      const payload = {
        ...form,
        reminder_times: form.reminder_times.map(rt => ({
          time: rt.time,
          label: rt.label || null,
          category: rt.category || 'medication',
        })),
      }
      if (patient?.id) {
        await api.updatePatient(patient.id, payload)
        addToast('Data pasien berhasil diperbarui', 'success')
      } else {
        await api.createPatient(payload)
        addToast('Pasien baru berhasil ditambahkan', 'success')
      }
      onSave()
    } catch (err) {
      setErr(err.message)
      addToast(err.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        transition={{ duration: 0.2 }}
        className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
      >
        <div className="px-4 sm:px-6 py-4 border-b border-surface-100 flex items-center justify-between sticky top-0 bg-white z-10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary-50 flex items-center justify-center">
              {patient?.id ? <Edit3 className="w-4 h-4 text-primary-600" /> : <Plus className="w-4 h-4 text-primary-600" />}
            </div>
            <h2 className="text-base font-semibold text-surface-800">
              {patient?.id ? 'Edit Pasien' : 'Tambah Pasien Baru'}
            </h2>
          </div>
          <button onClick={onClose} className="text-surface-400 hover:text-surface-600 transition-colors p-2 -mr-2">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-4 sm:px-6 py-5 space-y-5">
          {err && (
            <div className="flex items-center gap-2 text-sm text-danger-700 bg-danger-50 rounded-lg px-3 py-2.5 border border-danger-200">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              {err}
            </div>
          )}

          {/* Section: Data Pribadi */}
          <div>
            <h3 className="text-xs font-semibold text-surface-500 uppercase tracking-wider mb-3 flex items-center gap-2">
              <UserCheck className="w-3.5 h-3.5" />
              Data Pribadi
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Nama Lengkap *" value={form.name} onChange={set('name')} required />
              <Field label="No. WhatsApp *" value={form.phone} onChange={set('phone')} placeholder="628xxx" required />
              <Field label="Nama Obat *" value={form.medicine_name} onChange={set('medicine_name')} required />
              <Field label="Catatan" value={form.notes} onChange={set('notes')} />
            </div>
          </div>

          {/* Section: Wali */}
          <div>
            <h3 className="text-xs font-semibold text-surface-500 uppercase tracking-wider mb-3">Data Wali</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Nama Wali" value={form.guardian_name} onChange={set('guardian_name')} />
              <Field label="No. WA Wali" value={form.guardian_phone} onChange={set('guardian_phone')} placeholder="628xxx" />
            </div>
          </div>

          {/* Section: Reminder Times */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold text-surface-500 uppercase tracking-wider flex items-center gap-2">
                <Clock className="w-3.5 h-3.5" />
                Jadwal Pengingat
              </h3>
              <button type="button" onClick={addReminderTime}
                className="text-xs font-medium text-primary-600 hover:text-primary-700 flex items-center gap-1">
                <Plus className="w-3 h-3" /> Tambah Jam
              </button>
            </div>
            <div className="space-y-2">
              {form.reminder_times.map((rt, idx) => (
                <div key={idx} className="flex items-center gap-2 bg-surface-50 rounded-lg px-3 py-2">
                  <input type="time" value={rt.time}
                    onChange={(e) => updateReminderTime(idx, 'time', e.target.value)}
                    className="input w-24 py-1.5" />
                  <select value={rt.category || 'medication'}
                    onChange={(e) => updateReminderTime(idx, 'category', e.target.value)}
                    className="input w-28 py-1.5 text-xs">
                    <option value="medication">Obat 💊</option>
                    <option value="activity">Aktivitas 🏃</option>
                    <option value="diet">Pola Makan 🥗</option>
                  </select>
                  <input type="text" value={rt.label}
                    onChange={(e) => updateReminderTime(idx, 'label', e.target.value)}
                    placeholder="Label (opsional)"
                    className="input flex-1 py-1.5 text-xs" />
                  {form.reminder_times.length > 1 && (
                    <button type="button" onClick={() => removeReminderTime(idx)}
                      className="text-surface-300 hover:text-danger-500 transition-colors p-1">
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Status Toggle */}
          <label className="flex items-center gap-3 p-3 bg-surface-50 rounded-lg cursor-pointer">
            <input id="is_active" type="checkbox" checked={form.is_active} onChange={toggle('is_active')}
              className="w-4 h-4 text-primary-600 border-surface-300 rounded focus:ring-primary-400" />
            <span className="text-sm text-surface-700">Pasien aktif (menerima reminder)</span>
          </label>

          <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-2 border-t border-surface-100">
            <button type="button" onClick={onClose} className="btn-secondary w-full sm:w-auto">
              Batal
            </button>
            <button type="submit" disabled={saving} className="btn-primary w-full sm:w-auto">
              {saving ? 'Menyimpan...' : 'Simpan'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  )
}

function Field({ label, ...props }) {
  return (
    <div>
      <label className="block text-xs font-medium text-surface-600 mb-1.5">{label}</label>
      <input {...props} className="input" />
    </div>
  )
}

export default function PatientsPage() {
  const [patients, setPatients] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all') // all | active | inactive
  const { addToast } = useToast()

  function load() {
    setLoading(true)
    api.getPatients()
      .then(setPatients)
      .catch(e => addToast(e.message, 'error'))
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  async function handleToggleStatus(id, currentName, willBeActive) {
    try {
      await api.togglePatientStatus(id)
      addToast(
        willBeActive ? `Pasien "${currentName}" diaktifkan` : `Pasien "${currentName}" dinonaktifkan`,
        'success'
      )
      load()
    } catch (e) {
      addToast(e.message, 'error')
    }
  }

  const filteredPatients = useMemo(() => {
    let result = patients
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(p =>
        p.name?.toLowerCase().includes(q) ||
        p.phone?.includes(q) ||
        p.medicine_name?.toLowerCase().includes(q)
      )
    }
    if (statusFilter !== 'all') {
      result = result.filter(p => p.is_active === (statusFilter === 'active'))
    }
    return result
  }, [patients, search, statusFilter])

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 mb-5 sm:mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-surface-900">Daftar Pasien</h1>
          <p className="text-sm text-surface-500 mt-1">Kelola data pasien dan jadwal pengingat</p>
        </div>
        <button onClick={() => setModal('add')} className="btn-primary">
          <Plus className="w-4 h-4" />
          Tambah Pasien
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1 sm:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
          <input
            type="text"
            placeholder="Cari nama, nomor WA, atau obat..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-9"
          />
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <Filter className="w-4 h-4 text-surface-400 shrink-0" />
          {['all', 'active', 'inactive'].map(f => (
            <button
              key={f}
              onClick={() => setStatusFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                statusFilter === f
                  ? 'bg-surface-800 text-white shadow-sm'
                  : 'bg-white text-surface-600 border border-surface-200 hover:bg-surface-50'
              }`}
            >
              {f === 'all' ? 'Semua' : f === 'active' ? 'Aktif' : 'Nonaktif'}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <SkeletonTable rows={6} cols={7} />
      ) : (
        <div className="bg-white rounded-xl border border-surface-200 shadow-sm overflow-hidden -mx-2 sm:mx-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[720px]">
              <thead>
                <tr className="bg-surface-50 border-b border-surface-200">
                  {['Pasien', 'No. WA', 'Obat', 'Jam', 'Wali', 'Kepatuhan', 'Status', ''].map(h => (
                    <th key={h} className="px-3 sm:px-4 py-3 text-left text-xs font-semibold text-surface-500 uppercase tracking-wider whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-100">
                {filteredPatients.map(p => {
                  const rate = p.compliance_rate != null ? Number(p.compliance_rate) : null
                  const rateColor = rate >= 80 ? 'success' : rate >= 50 ? 'warning' : 'danger'

                  return (
                    <tr key={p.id} className="group hover:bg-surface-50/80 transition-colors">
                      <td className="px-3 sm:px-4 py-3.5">
                        <div className="flex items-center gap-2.5 sm:gap-3">
                          <Avatar name={p.name} size="sm" />
                          <span className="font-semibold text-surface-800 text-sm">{p.name}</span>
                        </div>
                      </td>
                      <td className="px-3 sm:px-4 py-3.5 text-surface-500 font-mono text-xs">{p.phone}</td>
                      <td className="px-3 sm:px-4 py-3.5">
                        <div className="flex items-center gap-1.5">
                          <Pill className="w-3.5 h-3.5 text-primary-500 shrink-0" />
                          <span className="text-surface-700 text-xs sm:text-sm">{p.medicine_name}</span>
                        </div>
                      </td>
                      <td className="px-3 sm:px-4 py-3.5">
                        <div className="flex flex-wrap gap-1">
                          {(p.reminder_times || []).map((rt, i) => (
                            <span key={i} className={`inline-flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded-md text-[10px] sm:text-[11px] font-medium ring-1 ${CATEGORY_COLORS[rt.category] || CATEGORY_COLORS.medication}`}>
                              <span className="hidden sm:inline">{CATEGORY_EMOJI[rt.category]}</span> {rt.time}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-3 sm:px-4 py-3.5 text-surface-500 text-xs sm:text-sm">{p.guardian_name || '–'}</td>
                      <td className="px-3 sm:px-4 py-3.5">
                        {rate != null ? (
                          <Badge variant={rateColor} dot>{rate}%</Badge>
                        ) : (
                          <span className="text-xs text-surface-400">–</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        <button
                          onClick={() => handleToggleStatus(p.id, p.name, !p.is_active)}
                          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-200 ${
                            p.is_active ? 'bg-primary-500' : 'bg-surface-300'
                          }`}
                        >
                          <span
                            className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform duration-200 ${
                              p.is_active ? 'translate-x-5' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </td>
                      <td className="px-3 sm:px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                          <button onClick={() => setModal(p)}
                            className="p-1.5 text-surface-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                            title="Edit">
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleToggleStatus(p.id, p.name, !p.is_active)}
                            className={`p-1.5 rounded-lg transition-colors ${
                              p.is_active
                                ? 'text-surface-400 hover:text-danger-600 hover:bg-danger-50'
                                : 'text-surface-400 hover:text-primary-600 hover:bg-primary-50'
                            }`}
                            title={p.is_active ? 'Nonaktifkan' : 'Aktifkan'}>
                            {p.is_active ? <PowerOff className="w-4 h-4" /> : <Power className="w-4 h-4" />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
                {filteredPatients.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center">
                      <div className="flex flex-col items-center text-surface-400">
                        <Search className="w-8 h-8 mb-2 opacity-40" />
                        <p className="text-sm">{search ? 'Tidak ada pasien yang cocok' : 'Belum ada pasien terdaftar'}</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Footer count */}
      {!loading && (
        <p className="text-xs text-surface-400 mt-3">
          Menampilkan {filteredPatients.length} dari {patients.length} pasien
        </p>
      )}

      {/* Modal */}
      <AnimatePresence>
        {modal && (
          <Modal
            patient={modal === 'add' ? null : modal}
            onClose={() => setModal(null)}
            onSave={() => { setModal(null); load() }}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
