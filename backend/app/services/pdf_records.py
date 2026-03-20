"""
pdf_records.py — Generación de PDF del expediente clínico completo.
Usa fpdf2 (puro Python, sin dependencias del sistema).
"""
import asyncio
from datetime import datetime
from fpdf import FPDF

_GOLD = (217, 119, 6)
_DARK = (31, 41, 55)
_GRAY = (107, 114, 128)
_LIGHT = (249, 250, 251)
_BORDER = (229, 231, 235)


def _safe(text: str) -> str:
    """Convierte texto a latin-1 seguro para las fuentes integradas de fpdf2."""
    if not text:
        return ""
    return text.encode("latin-1", "replace").decode("latin-1")


def _build_pdf(patient, records, clinic_name: str) -> bytes:
    pdf = FPDF(orientation="P", unit="mm", format="A4")
    pdf.set_auto_page_break(auto=True, margin=20)
    pdf.add_page()

    # ── Header ────────────────────────────────────────────────────────────────
    pdf.set_fill_color(*_DARK)
    pdf.rect(0, 0, 210, 35, "F")

    pdf.set_xy(0, 8)
    pdf.set_font("Helvetica", "B", 18)
    pdf.set_text_color(217, 119, 6)
    pdf.cell(210, 8, _safe("MedControl"), align="C", new_x="LMARGIN", new_y="NEXT")

    pdf.set_font("Helvetica", "", 10)
    pdf.set_text_color(209, 213, 219)
    pdf.cell(210, 6, _safe(clinic_name), align="C", new_x="LMARGIN", new_y="NEXT")

    pdf.set_xy(15, 42)

    # ── Título ────────────────────────────────────────────────────────────────
    pdf.set_font("Helvetica", "B", 14)
    pdf.set_text_color(*_DARK)
    pdf.cell(0, 8, "Expediente Clinico Completo", new_x="LMARGIN", new_y="NEXT")

    pdf.set_font("Helvetica", "", 9)
    pdf.set_text_color(*_GRAY)
    pdf.cell(0, 5, _safe(f"Generado el {datetime.now().strftime('%d/%m/%Y %H:%M')}"), new_x="LMARGIN", new_y="NEXT")
    pdf.ln(4)

    # ── Datos del paciente ────────────────────────────────────────────────────
    pdf.set_fill_color(*_LIGHT)
    pdf.set_draw_color(*_BORDER)
    pdf.rect(15, pdf.get_y(), 180, 40, "FD")
    pdf.set_xy(20, pdf.get_y() + 4)

    pdf.set_font("Helvetica", "B", 10)
    pdf.set_text_color(*_DARK)
    pdf.cell(0, 5, "Datos del Paciente", new_x="LMARGIN", new_y="NEXT")
    pdf.set_x(20)
    pdf.set_font("Helvetica", "", 9)
    pdf.set_text_color(*_GRAY)

    def _row(label, value):
        pdf.set_x(20)
        pdf.set_font("Helvetica", "B", 9)
        pdf.set_text_color(*_GRAY)
        pdf.cell(40, 5, _safe(label + ":"))
        pdf.set_font("Helvetica", "", 9)
        pdf.set_text_color(*_DARK)
        pdf.cell(0, 5, _safe(str(value) if value else "—"), new_x="LMARGIN", new_y="NEXT")

    _row("Nombre", patient.full_name)
    _row("Fecha de nacimiento", patient.birth_date.strftime("%d/%m/%Y") if patient.birth_date else None)
    _row("Genero", patient.gender)
    _row("Telefono", patient.phone)
    _row("Email", patient.email)

    pdf.ln(8)

    # ── Estadísticas rápidas ──────────────────────────────────────────────────
    pdf.set_font("Helvetica", "", 9)
    pdf.set_text_color(*_GRAY)
    total = len(records)
    pdf.cell(0, 5, _safe(f"Total de consultas: {total}"), new_x="LMARGIN", new_y="NEXT")
    pdf.ln(4)

    # ── Registros médicos ─────────────────────────────────────────────────────
    for idx, rec in enumerate(sorted(records, key=lambda r: r.created_at), 1):
        # Encabezado del registro
        pdf.set_fill_color(*_DARK)
        pdf.set_text_color(255, 255, 255)
        pdf.set_font("Helvetica", "B", 9)
        date_str = rec.created_at.strftime("%d/%m/%Y %H:%M")
        doctor_name = rec.doctor.full_name if rec.doctor else "Medico"
        pdf.cell(
            180, 7,
            _safe(f"  Consulta #{idx}  |  {date_str}  |  Dr. {doctor_name}"),
            fill=True, new_x="LMARGIN", new_y="NEXT"
        )
        pdf.set_x(15)

        def _section(title, content):
            if not content:
                return
            pdf.set_x(15)
            pdf.set_font("Helvetica", "B", 8)
            pdf.set_text_color(*_GOLD)
            pdf.cell(0, 5, _safe(title), new_x="LMARGIN", new_y="NEXT")
            pdf.set_x(15)
            pdf.set_font("Helvetica", "", 9)
            pdf.set_text_color(*_DARK)
            pdf.multi_cell(180, 5, _safe(content))
            pdf.ln(1)

        _section("Diagnostico", rec.diagnosis)
        _section("Tratamiento", rec.treatment)
        _section("Notas", rec.notes)
        _section("Receta", rec.prescription)

        # Adjuntos
        if rec.attachments:
            pdf.set_x(15)
            pdf.set_font("Helvetica", "B", 8)
            pdf.set_text_color(*_GRAY)
            pdf.cell(0, 5, _safe(f"Archivos adjuntos ({len(rec.attachments)}):"), new_x="LMARGIN", new_y="NEXT")
            for att in rec.attachments:
                pdf.set_x(20)
                pdf.set_font("Helvetica", "", 8)
                pdf.set_text_color(*_GRAY)
                pdf.cell(0, 4, _safe(f"• {att.file_name}"), new_x="LMARGIN", new_y="NEXT")

        pdf.ln(4)
        pdf.set_draw_color(*_BORDER)
        pdf.set_x(15)
        pdf.cell(180, 0, "", border="T", new_x="LMARGIN", new_y="NEXT")
        pdf.ln(4)

    return bytes(pdf.output())


async def generate_patient_record_pdf(patient, records: list, clinic_name: str) -> bytes:
    """Genera el PDF del expediente completo. Corre en thread para no bloquear el event loop."""
    return await asyncio.to_thread(_build_pdf, patient, records, clinic_name)
