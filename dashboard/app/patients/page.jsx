'use client'
import { useEffect, useState } from 'react'
import { api } from '../../lib/api'

const EMPTY = {
  name: '', phone: '', guardian_name: '', guardian_phone: '',
  medicine_name: '', reminder_time: '08:00', notes: '', is_active: true,
}

function normalizePatient(p) {
  if (!p) return EMPTY
  return { ...p, reminder_time: (p.reminder_time ?? '08:00').slice(0, 5) }
}

function Modal({ patient, onClose, onSave }) {
  const [form, setForm] = useState(normalizePatient(patient))
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState(null)

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    setErr(null)
    try {
      if (patient?.id) {
        await api.updatePatient(patient.id, form)
      } else {
        await api.createPatient(form)
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
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">
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
            <Field label="Jam Reminder" type="time" value={form.reminder_time} onChange={set('reminder_time')} />
            <Field label="Nama Wali" value={form.guardian_name} onChange={set('guardian_name')} />
            <Field label="No. WA Wali" value={form.guardian_phone} onChange={set('guardian_phone')} placeholder="628xxx" />
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
  const [modal, setModal]      = useState(null)  // null | 'add' | patient object

  function load() {
    setLoading(true)
    api.getPatients()
      .then(setPatients)
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  async function handleDeactivate(id) {
    if (!confirm('Nonaktifkan pasien ini?')) return
    await api.deletePatient(id)
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
                {['Nama', 'No. WA', 'Obat', 'Wali', 'Kepatuhan', 'Status', ''].map(h => (
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
                    {p.is_active && (
                      <button onClick={() => handleDeactivate(p.id)}
                        className="text-red-400 hover:text-red-600 text-xs">Nonaktifkan</button>
                    )}
                  </td>
                </tr>
              ))}
              {patients.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
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
