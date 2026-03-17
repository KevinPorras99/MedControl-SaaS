/**
 * hooks/index.js — Wrappers de React Query.
 *
 * Responsabilidad única: gestión de cache, invalidaciones y feedback con toast.
 * Toda la lógica HTTP está en src/api/*.js — este archivo NO contiene URLs ni FormData.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { useApi } from '../lib/api'
import { patientsApi }     from '../api/patients'
import { appointmentsApi } from '../api/appointments'
import { recordsApi }      from '../api/records'
import { invoicesApi }     from '../api/invoices'
import { reportsApi }      from '../api/reports'
import { settingsApi }     from '../api/settings'
import { authApi }         from '../api/auth'
import { billingApi }      from '../api/billing'
import { remindersApi }   from '../api/reminders'
import { consentsApi }    from '../api/consents'

// ─────────────────────────────────────────────────────────────────────────────
// Auth
// ─────────────────────────────────────────────────────────────────────────────

export function useMe() {
  const api = useApi()
  return useQuery({
    queryKey: ['me'],
    queryFn: () => authApi.me(api),
    staleTime: 1000 * 60 * 10,
    retry: false,
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Patients
// ─────────────────────────────────────────────────────────────────────────────

export function usePatients({ search = '', limit = 200 } = {}) {
  const api = useApi()
  return useQuery({
    queryKey: ['patients', search, limit],
    queryFn: () => patientsApi.list(api, { search, limit }),
  })
}

export function usePatient(id) {
  const api = useApi()
  return useQuery({
    queryKey: ['patients', id],
    queryFn: () => patientsApi.get(api, id),
    enabled: !!id,
  })
}

export function useCreatePatient() {
  const api = useApi()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data) => patientsApi.create(api, data),
    onSuccess: () => { qc.invalidateQueries(['patients']); toast.success('Paciente creado') },
    onError: (e) => toast.error(e.message),
  })
}

export function useUpdatePatient() {
  const api = useApi()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload) => patientsApi.update(api, payload),
    onSuccess: () => { qc.invalidateQueries(['patients']); toast.success('Paciente actualizado') },
    onError: (e) => toast.error(e.message),
  })
}

export function useDeletePatient() {
  const api = useApi()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id) => patientsApi.delete(api, id),
    onSuccess: () => { qc.invalidateQueries(['patients']); toast.success('Paciente eliminado') },
    onError: (e) => toast.error(e.message),
  })
}

export function useGeneratePortalToken() {
  const api = useApi()
  return useMutation({
    mutationFn: (patientId) => patientsApi.generatePortalToken(api, patientId),
    onSuccess: ({ portal_url }) => {
      navigator.clipboard.writeText(portal_url)
      toast.success('Link del portal copiado al portapapeles')
    },
    onError: (e) => toast.error(e.message),
  })
}

// ── Importación masiva ────────────────────────────

export function useDownloadImportTemplate() {
  const api = useApi()
  return async () => {
    try {
      await patientsApi.downloadTemplate(api)
      toast.success('Plantilla descargada')
    } catch {
      toast.error('Error al descargar la plantilla')
    }
  }
}

export function useImportPreview() {
  const api = useApi()
  return useMutation({
    mutationFn: (file) => patientsApi.importPreview(api, file),
    onError: (e) => toast.error(e.message),
  })
}

export function useImportConfirm() {
  const api = useApi()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body) => patientsApi.importConfirm(api, body),
    onSuccess: (data) => {
      qc.invalidateQueries(['patients'])
      toast.success(`${data.imported} paciente(s) importados correctamente`)
    },
    onError: (e) => toast.error(e.message),
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Appointments
// ─────────────────────────────────────────────────────────────────────────────

export function useAppointments(filters = {}) {
  const api = useApi()
  return useQuery({
    queryKey: ['appointments', filters],
    queryFn: () => appointmentsApi.list(api, filters),
  })
}

export function useCreateAppointment() {
  const api = useApi()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data) => appointmentsApi.create(api, data),
    onSuccess: () => { qc.invalidateQueries(['appointments']); toast.success('Cita creada') },
    onError: (e) => toast.error(e.message),
  })
}

export function useUpdateAppointment() {
  const api = useApi()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload) => appointmentsApi.update(api, payload),
    onSuccess: () => { qc.invalidateQueries(['appointments']); toast.success('Cita actualizada') },
    onError: (e) => toast.error(e.message),
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Medical Records
// ─────────────────────────────────────────────────────────────────────────────

export function useMedicalRecords(patientId) {
  const api = useApi()
  return useQuery({
    queryKey: ['records', patientId],
    queryFn: () => recordsApi.list(api, patientId),
    enabled: !!patientId,
  })
}

export function useCreateRecord() {
  const api = useApi()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data) => recordsApi.create(api, data),
    onSuccess: (_, vars) => {
      qc.invalidateQueries(['records', vars.patient_id])
      toast.success('Registro creado')
    },
    onError: (e) => toast.error(e.message),
  })
}

export function useUploadAttachment() {
  const api = useApi()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload) => recordsApi.uploadAttachment(api, payload),
    onSuccess: (_, { patientId }) => {
      qc.invalidateQueries(['records', patientId])
      toast.success('Archivo subido')
    },
    onError: (e) => toast.error(e.message),
  })
}

export function useDeleteAttachment() {
  const api = useApi()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ attachmentId }) => recordsApi.deleteAttachment(api, attachmentId),
    onSuccess: (_, { patientId }) => {
      qc.invalidateQueries(['records', patientId])
      toast.success('Archivo eliminado')
    },
    onError: (e) => toast.error(e.message),
  })
}

export function useExportRecordPdf() {
  const api = useApi()
  return useMutation({
    mutationFn: (patientId) => recordsApi.exportPdf(api, patientId),
    onSuccess: () => toast.success('PDF generado'),
    onError: (e) => toast.error(e.message),
  })
}

export function usePrintPrescription() {
  const api = useApi()
  return useMutation({
    mutationFn: (recordId) => recordsApi.printPrescription(api, recordId),
    onError: (e) => toast.error(e.message || 'Error al generar la receta'),
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Follow-up Reminders
// ─────────────────────────────────────────────────────────────────────────────

export function useReminders(filters = {}) {
  const api = useApi()
  return useQuery({
    queryKey: ['reminders', filters],
    queryFn: () => remindersApi.list(api, filters),
  })
}

export function useCreateReminder() {
  const api = useApi()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data) => remindersApi.create(api, data),
    onSuccess: () => { qc.invalidateQueries(['reminders']); toast.success('Seguimiento programado') },
    onError: (e) => toast.error(e.message),
  })
}

export function useUpdateReminder() {
  const api = useApi()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload) => remindersApi.update(api, payload),
    onSuccess: () => { qc.invalidateQueries(['reminders']); toast.success('Seguimiento actualizado') },
    onError: (e) => toast.error(e.message),
  })
}

export function useDeleteReminder() {
  const api = useApi()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id) => remindersApi.remove(api, id),
    onSuccess: () => { qc.invalidateQueries(['reminders']); toast.success('Seguimiento eliminado') },
    onError: (e) => toast.error(e.message),
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Invoices
// ─────────────────────────────────────────────────────────────────────────────

export function useInvoices(filters = {}) {
  const api = useApi()
  return useQuery({
    queryKey: ['invoices', filters],
    queryFn: () => invoicesApi.list(api, filters),
  })
}

export function useCreateInvoice() {
  const api = useApi()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data) => invoicesApi.create(api, data),
    onSuccess: () => { qc.invalidateQueries(['invoices']); toast.success('Factura creada') },
    onError: (e) => toast.error(e.message),
  })
}

export function useRegisterPayment() {
  const api = useApi()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload) => invoicesApi.pay(api, payload),
    onSuccess: () => { qc.invalidateQueries(['invoices']); toast.success('Pago registrado') },
    onError: (e) => toast.error(e.message),
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Reports
// ─────────────────────────────────────────────────────────────────────────────

export function useDashboardStats() {
  const api = useApi()
  return useQuery({
    queryKey: ['reports', 'dashboard'],
    queryFn: () => reportsApi.dashboard(api),
    staleTime: 5 * 60 * 1000,
  })
}

export function useFinancialReport({ dateFrom, dateTo } = {}) {
  const api = useApi()
  return useQuery({
    queryKey: ['reports', 'financial', dateFrom, dateTo],
    queryFn: () => reportsApi.financial(api, { dateFrom, dateTo }),
    staleTime: 1000 * 60 * 3,
  })
}

export function useAppointmentsReport({ dateFrom, dateTo, doctorId } = {}) {
  const api = useApi()
  return useQuery({
    queryKey: ['reports', 'appointments', dateFrom, dateTo, doctorId],
    queryFn: () => reportsApi.appointments(api, { dateFrom, dateTo, doctorId }),
    staleTime: 1000 * 60 * 3,
  })
}

export function usePatientsReport({ dateFrom, dateTo } = {}) {
  const api = useApi()
  return useQuery({
    queryKey: ['reports', 'patients', dateFrom, dateTo],
    queryFn: () => reportsApi.patients(api, { dateFrom, dateTo }),
    staleTime: 1000 * 60 * 3,
  })
}

export function useDoctorsReport({ dateFrom, dateTo } = {}) {
  const api = useApi()
  return useQuery({
    queryKey: ['reports', 'doctors', dateFrom, dateTo],
    queryFn: () => reportsApi.doctors(api, { dateFrom, dateTo }),
    staleTime: 1000 * 60 * 3,
  })
}

export function useDownloadInvoicesCSV() {
  const api = useApi()
  return useMutation({
    mutationFn: (filters) => reportsApi.downloadInvoicesCsv(api, filters),
    onSuccess: () => toast.success('CSV de facturas descargado'),
    onError: () => toast.error('Error al descargar el CSV'),
  })
}

export function useDownloadPaymentsCSV() {
  const api = useApi()
  return useMutation({
    mutationFn: (filters) => reportsApi.downloadPaymentsCsv(api, filters),
    onSuccess: () => toast.success('CSV de pagos descargado'),
    onError: () => toast.error('Error al descargar el CSV'),
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Settings — Clínica, Equipo, Auditoría
// ─────────────────────────────────────────────────────────────────────────────

export function useClinicSettings() {
  const api = useApi()
  return useQuery({
    queryKey: ['clinic'],
    queryFn: () => settingsApi.getClinic(api),
    staleTime: 1000 * 60 * 5,
  })
}

export function useUpdateClinic() {
  const api = useApi()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data) => settingsApi.updateClinic(api, data),
    onSuccess: () => {
      qc.invalidateQueries(['clinic'])
      qc.invalidateQueries(['me'])
      toast.success('Clínica actualizada')
    },
    onError: (e) => toast.error(e.message),
  })
}

export function useTeamMembers() {
  const api = useApi()
  return useQuery({
    queryKey: ['team'],
    queryFn: () => settingsApi.getTeam(api),
  })
}

export function useDoctors() {
  const api = useApi()
  return useQuery({
    queryKey: ['doctors'],
    queryFn: () => settingsApi.getTeam(api, { role: 'doctor' }),
  })
}

export function useAddTeamMember() {
  const api = useApi()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data) => settingsApi.addMember(api, data),
    onSuccess: () => { qc.invalidateQueries(['team']); toast.success('Usuario agregado') },
    onError: (e) => toast.error(e.message),
  })
}

export function useUpdateTeamMember() {
  const api = useApi()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload) => settingsApi.updateMember(api, payload),
    onSuccess: () => {
      qc.invalidateQueries(['team'])
      qc.invalidateQueries(['doctors'])
      toast.success('Usuario actualizado')
    },
    onError: (e) => toast.error(e.message),
  })
}

export function useRemoveTeamMember() {
  const api = useApi()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (userId) => settingsApi.removeMember(api, userId),
    onSuccess: () => { qc.invalidateQueries(['team']); toast.success('Usuario eliminado') },
    onError: (e) => toast.error(e.message),
  })
}

export function useAuditLogs({ dateFrom, dateTo } = {}) {
  const api = useApi()
  return useQuery({
    queryKey: ['audit', dateFrom, dateTo],
    queryFn: () => settingsApi.getAuditLogs(api, { dateFrom, dateTo }),
    staleTime: 1000 * 60 * 2,
  })
}

export function useAppConfig() {
  const api = useApi()
  return useQuery({
    queryKey: ['app-config'],
    queryFn: () => settingsApi.getConfig(api),
    staleTime: Infinity,
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Billing
// ─────────────────────────────────────────────────────────────────────────────

export function useSubscription() {
  const api = useApi()
  return useQuery({
    queryKey: ['billing', 'subscription'],
    queryFn: () => billingApi.getSubscription(api),
    retry: false,
  })
}

export function useCreateCheckoutSession() {
  const api = useApi()
  return useMutation({
    mutationFn: (plan) => billingApi.createCheckout(api, plan),
    onSuccess: ({ checkout_url }) => { window.location.href = checkout_url },
    onError: (e) => toast.error(e.message),
  })
}

export function useCustomerPortal() {
  const api = useApi()
  return useMutation({
    mutationFn: () => billingApi.portal(api),
    onSuccess: ({ portal_url }) => { window.location.href = portal_url },
    onError: (e) => toast.error(e.message),
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Consent Templates
// ─────────────────────────────────────────────────────────────────────────────

export function useConsentTemplates({ includeInactive = false } = {}) {
  const api = useApi()
  return useQuery({
    queryKey: ['consent-templates', includeInactive],
    queryFn: () => consentsApi.listTemplates(api, { includeInactive }),
  })
}

export function useCreateConsentTemplate() {
  const api = useApi()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data) => consentsApi.createTemplate(api, data),
    onSuccess: () => { qc.invalidateQueries(['consent-templates']); toast.success('Plantilla creada') },
    onError: (e) => toast.error(e.message),
  })
}

export function useUpdateConsentTemplate() {
  const api = useApi()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload) => consentsApi.updateTemplate(api, payload),
    onSuccess: () => { qc.invalidateQueries(['consent-templates']); toast.success('Plantilla actualizada') },
    onError: (e) => toast.error(e.message),
  })
}

export function useDeleteConsentTemplate() {
  const api = useApi()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id) => consentsApi.deleteTemplate(api, id),
    onSuccess: () => { qc.invalidateQueries(['consent-templates']); toast.success('Plantilla desactivada') },
    onError: (e) => toast.error(e.message),
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Patient Consents
// ─────────────────────────────────────────────────────────────────────────────

export function usePatientConsents(patientId) {
  const api = useApi()
  return useQuery({
    queryKey: ['consents', patientId],
    queryFn: () => consentsApi.listPatientConsents(api, patientId),
    enabled: !!patientId,
  })
}

export function useSignConsent() {
  const api = useApi()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data) => consentsApi.signConsent(api, data),
    onSuccess: (_, vars) => {
      qc.invalidateQueries(['consents', vars.patient_id])
      toast.success('Consentimiento firmado y guardado')
    },
    onError: (e) => toast.error(e.message),
  })
}
