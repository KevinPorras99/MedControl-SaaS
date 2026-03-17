"""
pdf_consent.py — Generación de PDF de consentimiento informado digital.
"""
import asyncio
import base64
import io
from datetime import datetime
from fpdf import FPDF

_GOLD   = (217, 119, 6)
_DARK   = (31, 41, 55)
_GRAY   = (107, 114, 128)
_LIGHT  = (249, 250, 251)
_BORDER = (229, 231, 235)


def _safe(text: str) -> str:
    if not text:
        return ""
    return text.encode("latin-1", "replace").decode("latin-1")


def _build_consent_pdf(
    *,
    clinic_name: str,
    clinic_address: str | None,
    template_title: str,
    template_content: str,
    patient_name: str,
    signed_at: datetime,
    signer_name: str,
    signature_png_bytes: bytes,
) -> bytes:
    pdf = FPDF(orientation="P", unit="mm", format="A4")
    pdf.set_auto_page_break(auto=True, margin=20)
    pdf.add_page()

    # Header
    pdf.set_fill_color(*_DARK)
    pdf.rect(0, 0, 210, 38, "F")
    pdf.set_xy(0, 7)
    pdf.set_font("Helvetica", "B", 20)
    pdf.set_text_color(*_GOLD)
    pdf.cell(210, 9, _safe("MedControl"), align="C", new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("Helvetica", "", 11)
    pdf.set_text_color(209, 213, 219)
    pdf.cell(210, 6, _safe(clinic_name), align="C", new_x="LMARGIN", new_y="NEXT")
    if clinic_address:
        pdf.set_font("Helvetica", "", 8)
        pdf.set_text_color(156, 163, 175)
        pdf.cell(210, 5, _safe(clinic_address), align="C", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(6)

    # Title
    pdf.set_font("Helvetica", "B", 14)
    pdf.set_text_color(*_DARK)
    pdf.cell(210, 8, "CONSENTIMIENTO INFORMADO", align="C", new_x="LMARGIN", new_y="NEXT")
    pdf.set_draw_color(*_GOLD)
    pdf.set_line_width(0.8)
    pdf.line(15, pdf.get_y(), 195, pdf.get_y())
    pdf.ln(3)
    pdf.set_font("Helvetica", "B", 11)
    pdf.set_x(15)
    pdf.cell(180, 7, _safe(template_title), align="C", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(4)

    # Info box
    pdf.set_fill_color(*_LIGHT)
    pdf.set_draw_color(*_BORDER)
    y_start = pdf.get_y()
    pdf.rect(15, y_start, 180, 22, "FD")
    pdf.set_xy(20, y_start + 4)

    def _info_row(label, value):
        pdf.set_x(20)
        pdf.set_font("Helvetica", "B", 9)
        pdf.set_text_color(*_GRAY)
        pdf.cell(45, 5, _safe(label + ":"))
        pdf.set_font("Helvetica", "", 9)
        pdf.set_text_color(*_DARK)
        pdf.cell(0, 5, _safe(str(value) if value else "—"), new_x="LMARGIN", new_y="NEXT")

    _info_row("Paciente", patient_name)
    _info_row("Fecha", signed_at.strftime("%d de %B de %Y, %H:%M"))
    pdf.ln(8)

    # Content
    pdf.set_x(15)
    pdf.set_font("Helvetica", "B", 10)
    pdf.set_text_color(*_GOLD)
    pdf.cell(0, 6, "Contenido del consentimiento:", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(2)
    pdf.set_x(15)
    pdf.set_font("Helvetica", "", 10)
    pdf.set_text_color(*_DARK)
    pdf.multi_cell(180, 6, _safe(template_content))
    pdf.ln(10)

    # Signature section
    pdf.set_draw_color(*_GOLD)
    pdf.set_line_width(0.5)
    pdf.line(15, pdf.get_y(), 195, pdf.get_y())
    pdf.ln(4)
    pdf.set_font("Helvetica", "B", 10)
    pdf.set_text_color(*_DARK)
    pdf.set_x(15)
    pdf.cell(0, 6, "Firma del paciente:", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(2)

    sig_buf = io.BytesIO(signature_png_bytes)
    sig_y = pdf.get_y()
    pdf.image(sig_buf, x=20, y=sig_y, h=30)
    pdf.ln(35)

    pdf.set_draw_color(*_DARK)
    pdf.set_line_width(0.3)
    pdf.line(15, pdf.get_y(), 105, pdf.get_y())
    pdf.set_x(15)
    pdf.set_font("Helvetica", "", 8)
    pdf.set_text_color(*_GRAY)
    pdf.cell(90, 4, _safe(f"Firma del paciente: {patient_name}"), align="C")
    pdf.ln(10)

    # Footer
    pdf.set_y(-20)
    pdf.set_draw_color(*_BORDER)
    pdf.line(15, pdf.get_y(), 195, pdf.get_y())
    pdf.ln(2)
    pdf.set_font("Helvetica", "", 7)
    pdf.set_text_color(*_GRAY)
    pdf.cell(
        0, 4,
        _safe(f"Documento generado por MedControl | {clinic_name} | {datetime.now().strftime('%d/%m/%Y %H:%M')}"),
        align="C"
    )

    return bytes(pdf.output())


async def generate_consent_pdf(
    *,
    clinic_name: str,
    clinic_address: str | None,
    template_title: str,
    template_content: str,
    patient_name: str,
    signed_at: datetime,
    signer_name: str,
    signature_data_url: str,
) -> bytes:
    b64_data = signature_data_url.split(",", 1)[1]
    signature_png_bytes = base64.b64decode(b64_data)
    return await asyncio.to_thread(
        _build_consent_pdf,
        clinic_name=clinic_name,
        clinic_address=clinic_address,
        template_title=template_title,
        template_content=template_content,
        patient_name=patient_name,
        signed_at=signed_at,
        signer_name=signer_name,
        signature_png_bytes=signature_png_bytes,
    )
