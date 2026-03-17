/**
 * billing.js — Capa HTTP para suscripciones y pagos Stripe.
 * Los endpoints están deshabilitados en el backend hasta integrar Stripe.
 */

export const billingApi = {
  getSubscription: (api) =>
    api.get('/api/billing/subscription').then(r => r.data),

  createCheckout: (api, plan) =>
    api.post('/api/billing/checkout', { plan }).then(r => r.data),

  portal: (api) =>
    api.post('/api/billing/portal').then(r => r.data),
}
