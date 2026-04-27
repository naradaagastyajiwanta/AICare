const BASE = '/api'

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(err.error ?? 'Request failed')
  }
  return res.json()
}

export const api = {
  getStats:      ()           => request('/stats'),
  getPatients:   ()           => request('/patients'),
  getPatient:    (id)         => request(`/patients/${id}`),
  createPatient: (data)       => request('/patients', { method: 'POST', body: JSON.stringify(data) }),
  updatePatient: (id, data)   => request(`/patients/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deletePatient: (id)         => request(`/patients/${id}`, { method: 'DELETE' }),
  getCompliance: (days = 30)  => request(`/compliance?days=${days}`),
  getBroadcasts: ()           => request('/broadcasts'),
  sendBroadcast: (data)       => request('/broadcasts', { method: 'POST', body: JSON.stringify(data) }),
}
