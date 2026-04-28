'use client'
import { useEffect, useState } from 'react'
import { api } from '../../lib/api'

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
      ? p.reminder_times.map(rt => ({ time: rt.time.slice(0, 5), label: rt.label || '', category: rt.category || 'medication' }))
      : [{ time: (p.reminder_time ?? '08:00').slice(0, 5), label: '', category: 'medication' }],
  }
}

function Modal({ patient, onClose, onSave }) {
  const [form, setForm] = useState(normalizePatient(patient))
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState(null)

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
      } else {
        await api.createPatient(payload)
      }
      onSave()
    } catch (err) {
      setErr(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-800">
            {patient?.id ? 'Edit Pasien' : 'Tambah Pasien'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-3">
          {err && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{err}</p>}

          <div className="grid grid-cols-2 gap-3">
            <Field label="Nama Lengkap *" value={form.name} onChange={set('name')} required />
            <Field label="No. WhatsApp *" value={form.phone} onChange={set('phone')} placeholder="628xxx" required />
            <Field label="Nama Obat *" value={form.medicine_name} onChange={set('medicine_name')} required />
            <Field label="Nama Wali" value={form.guardian_name} onChange={set('guardian_name')} />
            <Field label="No. WA Wali" value={form.guardian_phone} onChange={set('guardian_phone')} placeholder="628xxx" />
          </div>

          {/* Multiple Reminder Times */}
          <div className="border border-gray-200 rounded-lg p-3 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-gray-600">Jam Pengingat per Kategori</label>
              <button
                type="button"
                onClick={addReminderTime}
                className="text-xs text-green-600 hover:text-green-700 font-medium"
              >
                + Tambah Jam
              </button>
            </div>
            {form.reminder_times.map((rt, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <input
                  type="time"
                  value={rt.time}
                  onChange={(e) => updateReminderTime(idx, 'time', e.target.value)}
                  className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 w-24"
                />
                <select
                  value={rt.category || 'medication'}
                  onChange={(e) => updateReminderTime(idx, 'category', e.target.value)}
                  className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 w-28"
                >
                  <option value="medication">Obat 💊</option>
                  <option value="activity">Aktivitas 🏃</option>
                  <option value="diet">Pola Makan 🥗</option>
                </select>
                <input
                  type="text"
                  value={rt.label}
                  onChange={(e) => updateReminderTime(idx, 'label', e.target.value)}
                  placeholder="Label (opsional)"
                  className="flex-1 border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                />
                {form.reminder_times.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeReminderTime(idx)}
                    className="text-red-400 hover:text-red-600 text-sm px-2"
                  >
                    &times;
                  </button>
                )}
              </div>
            ))}
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Catatan</label>
            <textarea
              value={form.notes}
              onChange={set('notes')}
              rows={2}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              id="is_active"
              type="checkbox"
              checked={form.is_active}
              onChange={toggle('is_active')}
              className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-400"
            />
            <label htmlFor="is_active" className="text-sm text-gray-700 select-none cursor-pointer">
              Pasien aktif (menerima reminder)
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg border border-gray-200">
              Batal
            </button>
            <button type="submit" disabled={saving}
              className="px-4 py-2 text-sm text-white bg-green-600 hover:bg-green-700 rounded-lg disabled:opacity-60">
              {saving ? 'Menyimpan...' : 'Simpan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function Field({ label, ...props }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      <input
        {...props}
        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
      />
    </div>
  )
}

export default function PatientsPage() {
  const [patients, setPatients] = useState([])
  const [loading, setLoading]  = useState(true)
  const [modal, setModal]      = useState(null)

  function load() {
    setLoading(true)
    api.getPatients()
      .then(setPatients)
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  async function handleToggleStatus(id, currentName, willBeActive) {
    const action = willBeActive ? 'Aktifkan' : 'Nonaktifkan'
    if (!confirm(`${action} pasien "${currentName}"?`)) return
    await api.togglePatientStatus(id)
    load()
  }

  function closeModal() { setModal(null); load() }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Daftar Pasien</h1>
        <button
          onClick={() => setModal('add')}
          className="px-4 py-2 text-sm text-white bg-green-600 hover:bg-green-700 rounded-lg"
        >
          + Tambah Pasien
        </button>
      </div>

      {loading ? (
        <p className="text-gray-500">Memuat...</p>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
              <tr>
                {['Nama', 'No. WA', 'Obat', 'Jam Reminder', 'Wali', 'Kepatuhan', 'Status', ''].map(h => (
                  <th key={h} className="px-4 py-3 text-left font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {patients.map(p => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-800">{p.name}</td>
                  <td className="px-4 py-3 text-gray-500">{p.phone}</td>
                  <td className="px-4 py-3 text-gray-600">{p.medicine_name}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {(p.reminder_times || []).map((rt, i) => {
                      const catColor = rt.category === 'activity' ? 'bg-orange-50 text-orange-700' :
                                       rt.category === 'diet' ? 'bg-emerald-50 text-emerald-700' :
                                       'bg-blue-50 text-blue-700'
                      const catEmoji = rt.category === 'activity' ? '🏃' :
                                       rt.category === 'diet' ? '🥗' : '💊'
                      return (
                        <span key={i} className={`px-2 py-0.5 rounded text-xs ${catColor}`}>
                          {catEmoji} {rt.time}{rt.label ? ` (${rt.label})` : ''}
                        </span>
                      )
                    })}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{p.guardian_name || '–'}</td>
                  <td className="px-4 py-3">
                    <span className={`font-semibold ${
                      Number(p.compliance_rate) >= 80 ? 'text-green-600' :
                      Number(p.compliance_rate) >= 50 ? 'text-yellow-600' : 'text-red-500'
                    }`}>
                      {p.compliance_rate != null ? `${p.compliance_rate}%` : '–'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      p.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {p.is_active ? 'Aktif' : 'Nonaktif'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right space-x-2">
                    <button onClick={() => setModal(p)}
                      className="text-blue-500 hover:text-blue-700 text-xs">Edit</button>
                    {p.is_active ? (
                      <button onClick={() => handleToggleStatus(p.id, p.name, false)}
                        className="text-red-400 hover:text-red-600 text-xs">Nonaktifkan</button>
                    ) : (
                      <button onClick={() => handleToggleStatus(p.id, p.name, true)}
                        className="text-green-600 hover:text-green-700 text-xs font-medium">Aktifkan</button>
                    )}
                  </td>
                </tr>
              ))}
              {patients.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-400">
                    Belum ada pasien terdaftar
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <Modal
          patient={modal === 'add' ? null : modal}
          onClose={() => setModal(null)}
          onSave={closeModal}
        />
      )}
    </div>
  )
}
