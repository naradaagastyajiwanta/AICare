'use client'
import { useEffect, useState } from 'react'
import { api } from '../../lib/api'

const SCORE_STYLE = {
  green: 'bg-green-100 text-green-700',
  yellow: 'bg-yellow-100 text-yellow-700',
  red: 'bg-red-100 text-red-600',
}

function scoreClass(total) {
  if (total >= 200) return SCORE_STYLE.green
  if (total >= 100) return SCORE_STYLE.yellow
  return SCORE_STYLE.red
}

export default function SelfReportsPage() {
  const [data, setData] = useState([])
  const [days, setDays] = useState(7)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    api.getSelfReports(days)
      .then(setData)
      .finally(() => setLoading(false))
  }, [days])

  // Group by date
  const byDate = {}
  for (const row of data) {
    const d = row.score_date?.slice(0, 10)
    if (!byDate[d]) byDate[d] = []
    byDate[d].push(row)
  }
  const dates = Object.keys(byDate).sort().reverse()

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Laporan Harian Pasien</h1>
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
      ) : dates.length === 0 ? (
        <p className="text-gray-400">Belum ada data laporan</p>
      ) : (
        <div className="space-y-6">
          {dates.map(date => (
            <div key={date} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
                <h2 className="text-sm font-semibold text-gray-700">
                  {new Date(date + 'T00:00:00').toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </h2>
              </div>
              <table className="w-full text-sm">
                <thead className="text-gray-500 text-xs uppercase">
                  <tr>
                    <th className="px-4 py-2 text-left font-medium">Pasien</th>
                    <th className="px-3 py-2 text-center font-medium">Obat</th>
                    <th className="px-3 py-2 text-center font-medium">Aktivitas</th>
                    <th className="px-3 py-2 text-center font-medium">Pola Makan</th>
                    <th className="px-3 py-2 text-center font-medium">Total</th>
                    <th className="px-3 py-2 text-center font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {byDate[date].map(row => (
                    <tr key={row.id} className="hover:bg-gray-50">
                      <td className="px-4 py-2 font-medium text-gray-800">{row.patient_name}</td>
                      <td className="px-3 py-2 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${row.medication_score >= 100 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'}`}>
                          {row.medication_score >= 100 ? '✅' : '–'}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${row.activity_score >= 100 ? 'bg-green-100 text-green-700' : row.activity_score >= 50 ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-400'}`}>
                          {row.activity_score >= 100 ? '💯' : row.activity_score >= 50 ? '50%' : '–'}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${row.diet_score >= 100 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'}`}>
                          {row.diet_score >= 100 ? '✅' : '–'}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${scoreClass(row.total_score)}`}>
                          {row.total_score}/300
                        </span>
                      </td>
                      <td className="px-3 py-2 text-center">
                        {row.all_positive ? (
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">🌟 Luar Biasa</span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-400">–</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
