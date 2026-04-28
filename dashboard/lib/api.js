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
  getStats:           ()           => request('/stats'),
  getPatients:        ()           => request('/patients'),
  getPatient:         (id)         => request(`/patients/${id}`),
  createPatient:      (data)       => request('/patients', { method: 'POST', body: JSON.stringify(data) }),
  updatePatient:      (id, data)   => request(`/patients/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deletePatient:      (id)         => request(`/patients/${id}`, { method: 'DELETE' }),
  togglePatientStatus:(id)         => request(`/patients/${id}/status`, { method: 'PATCH' }),
  getPatientReminders:(id)         => request(`/patients/${id}/reminders`),
  addPatientReminder:(id, data)    => request(`/patients/${id}/reminders`, { method: 'POST', body: JSON.stringify(data) }),
  deletePatientReminder:(pid, rid) => request(`/patients/${pid}/reminders/${rid}`, { method: 'DELETE' }),
  getCompliance:      (days = 30)  => request(`/compliance?days=${days}`),
  getBroadcasts:      ()           => request('/broadcasts'),
  sendBroadcast:      (data)       => request('/broadcasts', { method: 'POST', body: JSON.stringify(data) }),
  sendBroadcastWithImage: (data)   => request('/broadcasts', { method: 'POST', body: JSON.stringify(data) }),

  // Self-reports
  getSelfReports:     (days = 7)   => request(`/self-reports?days=${days}`),
  getPatientReports:  (id)         => request(`/self-reports/${id}`),

  // Knowledge base (RAG)
  getKnowledge:       ()           => request('/knowledge'),
  createKnowledge:    (data)       => request('/knowledge', { method: 'POST', body: JSON.stringify(data) }),
  updateKnowledge:    (id, data)   => request(`/knowledge/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  toggleKnowledge:    (id)         => request(`/knowledge/${id}/status`, { method: 'PATCH' }),
  deleteKnowledge:    (id)         => request(`/knowledge/${id}`, { method: 'DELETE' }),
  parseDocx:          (formData)   => fetch('/api/knowledge/parse-docx', { method: 'POST', body: formData }).then(r => r.ok ? r.json() : r.json().then(e => Promise.reject(new Error(e.error)))),
  bulkSaveKnowledge:  (data)       => request('/knowledge/bulk', { method: 'POST', body: JSON.stringify(data) }),

  // Education materials
  getEducation:       ()           => request('/education'),
  createEducation:    (formData)   => fetch('/api/education', { method: 'POST', body: formData }).then(r => r.ok ? r.json() : r.json().then(e => Promise.reject(new Error(e.error)))),
  uploadEducationImage: (id, formData) => fetch(`/api/education/${id}/image`, { method: 'PATCH', body: formData }).then(r => r.ok ? r.json() : r.json().then(e => Promise.reject(new Error(e.error)))),
  deleteEducation:    (id)         => request(`/education/${id}`, { method: 'DELETE' }),
  toggleEducation:    (id)         => request(`/education/${id}/status`, { method: 'PATCH' }),
}
