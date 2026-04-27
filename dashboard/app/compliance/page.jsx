'use client'
import { useEffect, useState } from 'react'
import { api } from '../../lib/api'

const ANSWER_STYLE = {
  YES:     'bg-green-100 text-green-700',
  NO:      'bg-red-100   text-red-600',
  UNCLEAR: 'bg-yellow-100 text-yellow-700',
  null:    'bg-gray-100  text-gray-400',
}
const ANSWER_LABEL = { YES: 'Sudah', NO: 'Belum', UNCLEAR: 'Tidak Jelas', null: '–' }

function groupByPatient(rows) {
  const map = new Map()
  const dates = new Set()

  for (const row of rows) {
    const date = row.scheduled_date?.slice(0, 10)
    dates.add(date)

    if (!map.has(row.patient_id)) {
      map.set(row.patient_id, { id: row.patient_id, name: row.patient_name, medicine: row.medicine_name, days: {} })
    }
    map.get(row.patient_id).days[date] = row.answer
  }

  const sortedDates = [...dates].filter(Boolean).sort().reverse()
  return { patients: [...map.values()], dates: sortedDates }
}

export default function CompliancePage() {
  const [data,    setData]    = useState([])
  const [days,    setDays]    = useState(14)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    api.getCompliance(days)
      .then(setData)
      .finally(() => setLoading(false))
  }, [days])

  const { patients, dates } = groupByPatient(data)

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Kepatuhan Minum Obat</h1>
        <select
          value={days}
          onChange={e => setDays(Number(e.target.value))}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
        >
          <option value={7}>7 hari terakhir</option>
          <option value={14}>14 hari terakhir</option>
          <option value={30}>30 hari terakhir</option>
        </select>
      </div>

      {loading ? (
        <p className="text-gray-500">Memuat...</p>
      ) : patients.length === 0 ? (
        <p className="text-gray-400">Belum ada data reminder terkirim</p>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
          <table className="text-sm min-w-full">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
              <tr>
                <th className="px-4 py-3 text-left font-medium sticky left-0 bg-gray-50 z-10">Pasien</th>
                {dates.map(d => (
                  <th key={d} className="px-3 py-3 text-center font-medium whitespace-nowrap">
                    {d?.slice(5)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {patients.map(p => {
                const total = dates.length
                const yes   = dates.filter(d => p.days[d] === 'YES').length
                const pct   = total > 0 ? Math.round((yes / total) * 100) : null

                return (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 sticky left-0 bg-white hover:bg-gray-50 z-10">
                      <p className="font-medium text-gray-800">{p.name}</p>
                      <p className="text-xs text-gray-400">{p.medicine}</p>
                    </td>
                    {dates.map(d => {
                      const ans = p.days[d] ?? null
                      return (
                        <td key={d} className="px-3 py-3 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${ANSWER_STYLE[ans]}`}>
                            {ANSWER_LABEL[ans]}
                          </span>
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-4 flex items-center gap-4 text-xs text-gray-500">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-green-500 inline-block"/> Sudah minum
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-red-400 inline-block"/> Belum minum
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-yellow-400 inline-block"/> Tidak jelas
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-gray-300 inline-block"/> Tidak merespons
        </span>
      </div>
    </div>
  )
}
