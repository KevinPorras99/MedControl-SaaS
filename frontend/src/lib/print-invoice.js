/**
 * Genera y abre una ventana de impresión con el recibo de factura.
 * No requiere dependencias externas — usa el print nativo del navegador.
 */
export function printInvoice({ invoice, clinic, patientName, items }) {
  const issued = new Date(invoice.issued_at).toLocaleDateString('es-CR', {
    year: 'numeric', month: 'long', day: 'numeric',
  })

  const itemRows = items.map(item => {
    const qty = parseInt(item.quantity) || 1
    const price = parseFloat(item.unit_price) || 0
    const line = qty * price
    return `
      <tr>
        <td>${item.description || '—'}</td>
        <td class="center">${qty}</td>
        <td class="right">₡${price.toFixed(2)}</td>
        <td class="right">₡${line.toFixed(2)}</td>
      </tr>`
  }).join('')

  const subtotal = parseFloat(invoice.subtotal)
  const tax = parseFloat(invoice.tax)
  const total = parseFloat(invoice.total)

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <title>Factura ${invoice.invoice_number}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Segoe UI', Arial, sans-serif;
      color: #1a1a1a;
      padding: 40px;
      max-width: 720px;
      margin: 0 auto;
      font-size: 13px;
    }

    /* ── Encabezado ── */
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 32px; }
    .clinic-name { font-size: 22px; font-weight: 700; color: #1e3a5f; }
    .clinic-info { margin-top: 4px; color: #555; line-height: 1.6; }
    .invoice-meta { text-align: right; }
    .invoice-number { font-size: 18px; font-weight: 700; color: #1e3a5f; }
    .invoice-date { color: #666; margin-top: 4px; }

    /* ── Divisor ── */
    hr { border: none; border-top: 2px solid #e2e8f0; margin: 20px 0; }

    /* ── Paciente ── */
    .section-label { font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: #888; margin-bottom: 4px; }
    .patient-name { font-size: 15px; font-weight: 600; }

    /* ── Tabla de ítems ── */
    .items-table { width: 100%; border-collapse: collapse; margin: 24px 0; }
    .items-table thead tr { background: #1e3a5f; color: white; }
    .items-table th { padding: 10px 12px; text-align: left; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; }
    .items-table th.right, .items-table td.right { text-align: right; }
    .items-table th.center, .items-table td.center { text-align: center; }
    .items-table tbody tr { border-bottom: 1px solid #e2e8f0; }
    .items-table tbody tr:last-child { border-bottom: none; }
    .items-table tbody tr:nth-child(even) { background: #f8fafc; }
    .items-table td { padding: 10px 12px; }

    /* ── Totales ── */
    .totals { display: flex; justify-content: flex-end; margin-top: 8px; }
    .totals-box { width: 260px; }
    .totals-row { display: flex; justify-content: space-between; padding: 5px 0; color: #444; }
    .totals-row.total {
      font-size: 15px; font-weight: 700; color: #1e3a5f;
      border-top: 2px solid #1e3a5f; margin-top: 6px; padding-top: 10px;
    }

    /* ── Pie ── */
    .footer { margin-top: 48px; text-align: center; color: #aaa; font-size: 11px; border-top: 1px solid #e2e8f0; padding-top: 16px; }

    /* ── Print ── */
    @media print {
      body { padding: 20px; }
      @page { margin: 15mm; }
    }
  </style>
</head>
<body>

  <div class="header">
    <div>
      <div class="clinic-name">${clinic?.name || 'MedControl'}</div>
      <div class="clinic-info">
        ${clinic?.email ? `${clinic.email}<br/>` : ''}
        ${clinic?.phone ? `${clinic.phone}<br/>` : ''}
        ${clinic?.address ? clinic.address : ''}
      </div>
    </div>
    <div class="invoice-meta">
      <div class="invoice-number">FACTURA #${invoice.invoice_number}</div>
      <div class="invoice-date">Fecha: ${issued}</div>
      <div class="invoice-date" style="margin-top:8px; padding: 4px 10px; background:#f0fdf4; color:#15803d; border-radius:4px; font-weight:600;">
        ${invoice.status === 'pagada' ? '✓ Pagada' : invoice.status === 'pendiente' ? '⏳ Pendiente' : invoice.status}
      </div>
    </div>
  </div>

  <hr />

  <div>
    <div class="section-label">Paciente</div>
    <div class="patient-name">${patientName || '—'}</div>
  </div>

  <table class="items-table">
    <thead>
      <tr>
        <th>Descripción del servicio</th>
        <th class="center">Cant.</th>
        <th class="right">P. unitario</th>
        <th class="right">Subtotal</th>
      </tr>
    </thead>
    <tbody>
      ${itemRows}
    </tbody>
  </table>

  <div class="totals">
    <div class="totals-box">
      <div class="totals-row">
        <span>Subtotal</span>
        <span>₡${subtotal.toFixed(2)}</span>
      </div>
      <div class="totals-row">
        <span>IVA (13%)</span>
        <span>₡${tax.toFixed(2)}</span>
      </div>
      <div class="totals-row total">
        <span>TOTAL</span>
        <span>₡${total.toFixed(2)}</span>
      </div>
    </div>
  </div>

  <div class="footer">
    Este documento es un comprobante de servicio emitido por ${clinic?.name || 'MedControl'}.
    Gracias por su confianza.
  </div>

  <script>window.onload = () => { window.print(); }</script>
</body>
</html>`

  const win = window.open('', '_blank', 'width=820,height=700')
  if (!win) { alert('Permitir ventanas emergentes para generar el PDF.'); return }
  win.document.write(html)
  win.document.close()
}
