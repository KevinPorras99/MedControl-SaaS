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
