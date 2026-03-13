import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useApi } from '../lib/api'
import toast from 'react-hot-toast'

// ── Patients ──────────────────────────────────────
export function usePatients({ search = '', limit = 200 } = {}) {
  const api = useApi()
  return useQuery({
    queryKey: ['patients', search, limit],
    queryFn: () => api.get('/api/patients', { params: { search, limit } }).then(r => r.data),
  })
}

export function usePatient(id) {
  const api = useApi()
  return useQuery({
    queryKey: ['patients', id],
    queryFn: () => api.get(`/api/patients/${id}`).then(r => r.data),
    enabled: !!id,
  })
}

export function useCreatePatient() {
  const api = useApi()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data) => api.post('/api/patients', data).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries(['patients']); toast.success('Paciente creado') },
    onError: (e) => toast.error(e.message),
  })
}

export function useUpdatePatient() {
  const api = useApi()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }) => api.patch(`/api/patients/${id}`, data).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries(['patients']); toast.success('Paciente actualizado') },
    onError: (e) => toast.error(e.message),
  })
}

// ── Appointments ──────────────────────────────────
export function useAppointments(filters = {}) {
  const api = useApi()
  return useQuery({
    queryKey: ['appointments', filters],
    queryFn: () => api.get('/api/appointments', { params: filters }).then(r => r.data),
  })
}

export function useCreateAppointment() {
  const api = useApi()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data) => api.post('/api/appointments', data).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries(['appointments']); toast.success('Cita creada') },
    onError: (e) => toast.error(e.message),
  })
}

export function useUpdateAppointment() {
  const api = useApi()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }) => api.patch(`/api/appointments/${id}`, data).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries(['appointments']); toast.success('Cita actualizada') },
    onError: (e) => toast.error(e.message),
  })
}

// ── Medical Records ───────────────────────────────
export function useMedicalRecords(patientId) {
  const api = useApi()
  return useQuery({
    queryKey: ['records', patientId],
    queryFn: () => api.get(`/api/records/${patientId}`).then(r => r.data),
    enabled: !!patientId,
  })
}

export function useCreateRecord() {
  const api = useApi()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data) => api.post('/api/records', data).then(r => r.data),
    onSuccess: (_, vars) => { qc.invalidateQueries(['records', vars.patient_id]); toast.success('Registro creado') },
    onError: (e) => toast.error(e.message),
  })
}

export function useUploadAttachment() {
  const api = useApi()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ recordId, patientId, file }) => {
      const form = new FormData()
      form.append('file', file)
      return api.post(`/api/records/${recordId}/attachments`, form).then(r => r.data)
    },
    onSuccess: (_, { patientId }) => {
      qc.invalidateQueries(['records', patientId])
      toast.success('Archivo subido')
    },
    onError: (e) => toast.error(e.response?.data?.detail || e.message),
  })
}

export function useDeleteAttachment() {
  const api = useApi()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ attachmentId }) => api.delete(`/api/records/attachments/${attachmentId}`),
    onSuccess: (_, { patientId }) => {
      qc.invalidateQueries(['records', patientId])
      toast.success('Archivo eliminado')
    },
    onError: (e) => toast.error(e.response?.data?.detail || e.message),
  })
}

// ── Me (perfil actual) ────────────────────────────
export function useMe() {
  const api = useApi()
  return useQuery({
    queryKey: ['me'],
    queryFn: () => api.get('/api/auth/me').then(r => r.data),
    staleTime: 1000 * 60 * 10,
    retry: false,
  })
}

// ── Team (gestión de equipo) ──────────────────────
export function useTeamMembers() {
  const api = useApi()
  return useQuery({
    queryKey: ['team'],
    queryFn: () => api.get('/api/settings/users').then(r => r.data),
  })
}

export function useAddTeamMember() {
  const api = useApi()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data) => api.post('/api/settings/users', data).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries(['team']); toast.success('Usuario agregado') },
    onError: (e) => toast.error(e.message),
  })
}

export function useRemoveTeamMember() {
  const api = useApi()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (userId) => api.delete(`/api/settings/users/${userId}`),
    onSuccess: () => { qc.invalidateQueries(['team']); toast.success('Usuario eliminado') },
    onError: (e) => toast.error(e.message),
  })
}

// ── Invoices ──────────────────────────────────────
export function useInvoices(filters = {}) {
  const api = useApi()
  return useQuery({
    queryKey: ['invoices', filters],
    queryFn: () => api.get('/api/invoices', { params: filters }).then(r => r.data),
  })
}

export function useCreateInvoice() {
  const api = useApi()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data) => api.post('/api/invoices', data).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries(['invoices']); toast.success('Factura creada') },
    onError: (e) => toast.error(e.message),
  })
}

export function useRegisterPayment() {
  const api = useApi()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ invoiceId, ...data }) => api.post(`/api/invoices/${invoiceId}/pay`, data).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries(['invoices']); toast.success('Pago registrado') },
    onError: (e) => toast.error(e.message),
  })
}

// ── Reports ───────────────────────────────────────
export function useDashboardStats() {
  const api = useApi()
  return useQuery({
    queryKey: ['reports', 'dashboard'],
    queryFn: () => api.get('/api/reports/dashboard').then(r => r.data),
    staleTime: 5 * 60 * 1000,
  })
}

export function useFinancialReport({ dateFrom, dateTo } = {}) {
  const api = useApi()
  return useQuery({
    queryKey: ['reports', 'financial', dateFrom, dateTo],
    queryFn: () =>
      api.get('/api/reports/financial', {
        params: { date_from: dateFrom || undefined, date_to: dateTo || undefined },
      }).then(r => r.data),
  })
}

function triggerCsvDownload(blob, filename) {
  const url = window.URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  window.URL.revokeObjectURL(url)
}

export function useDownloadInvoicesCSV() {
  const api = useApi()
  return async ({ dateFrom, dateTo, status } = {}) => {
    try {
      const res = await api.get('/api/reports/export/invoices', {
        params: { date_from: dateFrom || undefined, date_to: dateTo || undefined, status: status || undefined },
        responseType: 'blob',
      })
      triggerCsvDownload(res.data, `facturas_${new Date().toISOString().split('T')[0]}.csv`)
      toast.success('CSV de facturas descargado')
    } catch {
      toast.error('Error al descargar el CSV')
    }
  }
}

export function useDownloadPaymentsCSV() {
  const api = useApi()
  return async ({ dateFrom, dateTo } = {}) => {
    try {
      const res = await api.get('/api/reports/export/payments', {
        params: { date_from: dateFrom || undefined, date_to: dateTo || undefined },
        responseType: 'blob',
      })
      triggerCsvDownload(res.data, `pagos_${new Date().toISOString().split('T')[0]}.csv`)
      toast.success('CSV de pagos descargado')
    } catch {
      toast.error('Error al descargar el CSV')
    }
  }
}

// ── Billing / Suscripciones ───────────────────────
export function useSubscription() {
  const api = useApi()
  return useQuery({
    queryKey: ['billing', 'subscription'],
    queryFn: () => api.get('/api/billing/subscription').then(r => r.data),
    retry: false,
  })
}

export function useCreateCheckoutSession() {
  const api = useApi()
  return useMutation({
    mutationFn: (plan) => api.post('/api/billing/checkout', { plan }).then(r => r.data),
    onSuccess: ({ checkout_url }) => { window.location.href = checkout_url },
    onError: (e) => toast.error(e.message),
  })
}

export function useCustomerPortal() {
  const api = useApi()
  return useMutation({
    mutationFn: () => api.post('/api/billing/portal').then(r => r.data),
    onSuccess: ({ portal_url }) => { window.location.href = portal_url },
    onError: (e) => toast.error(e.message),
  })
}

// ── Clinic settings ───────────────────────────────
export function useClinicSettings() {
  const api = useApi()
  return useQuery({
    queryKey: ['clinic'],
    queryFn: () => api.get('/api/settings/clinic').then(r => r.data),
    staleTime: 1000 * 60 * 5,
  })
}

export function useUpdateClinic() {
  const api = useApi()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data) => api.patch('/api/settings/clinic', data).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries(['clinic']); qc.invalidateQueries(['me']); toast.success('Clínica actualizada') },
    onError: (e) => toast.error(e.message),
  })
}

// ── Doctors ───────────────────────────────────────
export function useDoctors() {
  const api = useApi()
  return useQuery({
    queryKey: ['doctors'],
    queryFn: () => api.get('/api/settings/users').then(r => r.data?.filter(u => u.role === 'doctor') ?? []),
  })
}

export function useUpdateTeamMember() {
  const api = useApi()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }) => api.patch(`/api/settings/users/${id}`, data).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries(['team']); qc.invalidateQueries(['doctors']); toast.success('Usuario actualizado') },
    onError: (e) => toast.error(e.message),
  })
}

// ── Audit logs ────────────────────────────────────
export function useAuditLogs({ dateFrom, dateTo } = {}) {
  const api = useApi()
  return useQuery({
    queryKey: ['audit', dateFrom, dateTo],
    queryFn: () => api.get('/api/audit', {
      params: { date_from: dateFrom || undefined, date_to: dateTo || undefined }
    }).then(r => r.data),
    staleTime: 1000 * 60 * 2,
  })
}

// ── Reports: Appointments ─────────────────────────
export function useAppointmentsReport({ dateFrom, dateTo, doctorId } = {}) {
  const api = useApi()
  return useQuery({
    queryKey: ['reports', 'appointments', dateFrom, dateTo, doctorId],
    queryFn: () => api.get('/api/reports/appointments', {
      params: { date_from: dateFrom || undefined, date_to: dateTo || undefined, doctor_id: doctorId || undefined }
    }).then(r => r.data),
  })
}

// ── Reports: Patients ─────────────────────────────
export function usePatientsReport({ dateFrom, dateTo } = {}) {
  const api = useApi()
  return useQuery({
    queryKey: ['reports', 'patients', dateFrom, dateTo],
    queryFn: () => api.get('/api/reports/patients', {
      params: { date_from: dateFrom || undefined, date_to: dateTo || undefined }
    }).then(r => r.data),
  })
}

// ── Reports: Doctors ──────────────────────────────
export function useDoctorsReport({ dateFrom, dateTo } = {}) {
  const api = useApi()
  return useQuery({
    queryKey: ['reports', 'doctors', dateFrom, dateTo],
    queryFn: () => api.get('/api/reports/doctors', {
      params: { date_from: dateFrom || undefined, date_to: dateTo || undefined }
    }).then(r => r.data),
  })
}
