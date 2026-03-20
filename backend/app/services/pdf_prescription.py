"""
pdf_prescription.py — Generación de PDF de receta médica digital.
Incluye QR de verificación.
"""
import asyncio
import io
from datetime import datetime
from fpdf import FPDF

_GOLD = (217, 119, 6)
_DARK = (31, 41, 55)
_GRAY = (107, 114, 128)
_LIGHT = (249, 250, 251)
_BORDER = (229, 231, 235)


def _safe(text: str) -> str:
    if not text:
        return ""
    return text.encode("latin-1", "replace").decode("latin-1")


def _build_prescription_pdf(record, patient, doctor, clinic, frontend_url: str) -> bytes:
    import qrcode

    pdf = FPDF(orientation="P", unit="mm", format="A4")
    pdf.set_auto_page_break(auto=True, margin=20)
    pdf.add_page()

    # ── Header: membrete de la clínica ────────────────────────────────────────
    pdf.set_fill_color(*_DARK)
    pdf.rect(0, 0, 210, 38, "F")

    pdf.set_xy(0, 7)
    pdf.set_font("Helvetica", "B", 20)
    pdf.set_text_color(*_GOLD)
    pdf.cell(210, 9, _safe("MedControl"), align="C", new_x="LMARGIN", new_y="NEXT")

    pdf.set_font("Helvetica", "", 11)
    pdf.set_text_color(209, 213, 219)
    pdf.cell(210, 6, _safe(clinic.name), align="C", new_x="LMARGIN", new_y="NEXT")

    if clinic.address:
        pdf.set_font("Helvetica", "", 8)
        pdf.set_text_color(156, 163, 175)
        pdf.cell(210, 5, _safe(clinic.address), align="C", new_x="LMARGIN", new_y="NEXT")

    pdf.ln(6)

    # ── Título ────────────────────────────────────────────────────────────────
    pdf.set_font("Helvetica", "B", 14)
    pdf.set_text_color(*_DARK)
    pdf.cell(210, 8, "RECETA MEDICA", align="C", new_x="LMARGIN", new_y="NEXT")

    pdf.set_draw_color(*_GOLD)
    pdf.set_line_width(0.8)
    pdf.line(15, pdf.get_y(), 195, pdf.get_y())
    pdf.ln(5)

    # ── Info paciente / médico / fecha ────────────────────────────────────────
    pdf.set_fill_color(*_LIGHT)
    pdf.set_draw_color(*_BORDER)
    y_start = pdf.get_y()
    pdf.rect(15, y_start, 180, 28, "FD")
    pdf.set_xy(20, y_start + 4)

    def _info_row(label, value):
        pdf.set_x(20)
        pdf.set_font("Helvetica", "B", 9)
        pdf.set_text_color(*_GRAY)
        pdf.cell(45, 5, _safe(label + ":"))
        pdf.set_font("Helvetica", "", 9)
        pdf.set_text_color(*_DARK)
        pdf.cell(0, 5, _safe(str(value) if value else "—"), new_x="LMARGIN", new_y="NEXT")

    _info_row("Paciente", patient.full_name)
    _info_row("Medico", f"Dr. {doctor.full_name}" if doctor else "—")
    _info_row("Fecha", record.created_at.strftime("%d de %B de %Y"))

    pdf.ln(10)

    # ── Prescripción ─────────────────────────────────────────────────────────
    pdf.set_x(15)
    pdf.set_font("Helvetica", "B", 10)
    pdf.set_text_color(*_GOLD)
    pdf.cell(0, 6, "Prescripcion:", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(2)

    pdf.set_x(15)
    pdf.set_font("Helvetica", "", 10)
    pdf.set_text_color(*_DARK)
    pdf.multi_cell(180, 6, _safe(record.prescription or ""))
    pdf.ln(8)

    # ── Firma (línea) ─────────────────────────────────────────────────────────
    pdf.set_draw_color(*_DARK)
    pdf.set_line_width(0.3)
    pdf.line(120, pdf.get_y(), 190, pdf.get_y())
    pdf.set_x(120)
    pdf.set_font("Helvetica", "", 8)
    pdf.set_text_color(*_GRAY)
    pdf.cell(70, 5, _safe(f"Dr. {doctor.full_name}" if doctor else "Firma"), align="C")
    pdf.ln(10)

    # ── QR de verificación ────────────────────────────────────────────────────
    verification_url = f"{frontend_url}/verify/prescription/{record.id}"
    qr_img = qrcode.make(verification_url)
    buf = io.BytesIO()
    qr_img.save(buf, format="PNG")
    buf.seek(0)

    qr_y = pdf.get_y()
    pdf.image(buf, x=15, y=qr_y, w=25)
    pdf.set_xy(42, qr_y + 3)
    pdf.set_font("Helvetica", "", 7)
    pdf.set_text_color(*_GRAY)
    pdf.multi_cell(100, 4, _safe(
        "Verificacion digital de receta\n"
        f"ID: {str(record.id)[:8].upper()}\n"
        "Escanea el QR para verificar la autenticidad de esta receta."
    ))

    # ── Footer ────────────────────────────────────────────────────────────────
    pdf.set_y(-20)
    pdf.set_draw_color(*_BORDER)
    pdf.line(15, pdf.get_y(), 195, pdf.get_y())
    pdf.ln(2)
    pdf.set_font("Helvetica", "", 7)
    pdf.set_text_color(*_GRAY)
    pdf.cell(
        0, 4,
        _safe(f"Documento generado por MedControl | {clinic.name} | {datetime.now().strftime('%d/%m/%Y %H:%M')}"),
        align="C"
    )

    return bytes(pdf.output())


async def generate_prescription_pdf(record, patient, doctor, clinic, frontend_url: str) -> bytes:
    """Genera el PDF de la receta. Corre en thread para no bloquear el event loop."""
    return await asyncio.to_thread(
        _build_prescription_pdf, record, patient, doctor, clinic, frontend_url
    )
