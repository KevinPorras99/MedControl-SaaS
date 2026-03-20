export const remindersApi = {
  list: (api, filters = {}) =>
    api.get('/api/reminders', { params: filters }).then(r => r.data),

  create: (api, data) =>
    api.post('/api/reminders', data).then(r => r.data),

  update: (api, { id, ...data }) =>
    api.patch(`/api/reminders/${id}`, data).then(r => r.data),

  remove: (api, id) =>
    api.delete(`/api/reminders/${id}`),
}
