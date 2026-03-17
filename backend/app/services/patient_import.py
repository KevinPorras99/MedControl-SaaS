"""
Servicio de importación masiva de pacientes desde CSV / Excel.
Toda la lógica de parseo, validación y deduplicación vive aquí — no en el router.
"""
from __future__ import annotations

import csv
import io
import re
from datetime import date, datetime
from typing import Any

# openpyxl solo se importa si el archivo es .xlsx
try:
    import openpyxl
    _XLSX_AVAILABLE = True
except ImportError:
    _XLSX_AVAILABLE = False


# ── Columnas del template ──────────────────────────────────────────────────────
# Mapeamos nombres en español tal como están en la plantilla → campo interno
COLUMN_ALIASES: dict[str, str] = {
    # nombre completo (una sola columna)
    "nombre_completo": "full_name",
    "nombre completo": "full_name",
    "full_name": "full_name",
    "nombre": "_first_name",
    "apellido": "_last_name",
    # contacto
    "telefono": "phone",
    "teléfono": "phone",
    "phone": "phone",
    "celular": "phone",
    "email": "email",
    "correo": "email",
    "correo_electronico": "email",
    # fecha
    "fecha_nacimiento": "birth_date",
    "fecha de nacimiento": "birth_date",
    "birthdate": "birth_date",
    "dob": "birth_date",
    # género
    "genero": "gender",
    "género": "gender",
    "sexo": "gender",
    "gender": "gender",
    # dirección
    "direccion": "address",
    "dirección": "address",
    "address": "address",
    # notas
    "notas": "notes",
    "observaciones": "notes",
    "notes": "notes",
}

REQUIRED_FIELDS = {"full_name"}

DATE_FORMATS = ["%Y-%m-%d", "%d/%m/%Y", "%d-%m-%Y", "%m/%d/%Y"]
GENDER_ALIASES = {
    "m": "masculino", "masculino": "masculino", "male": "masculino",
    "f": "femenino", "femenino": "femenino", "female": "femenino",
    "o": "otro", "otro": "otro", "other": "otro",
}


# ── Plantilla CSV ──────────────────────────────────────────────────────────────
TEMPLATE_HEADERS = [
    "nombre", "apellido", "telefono", "email",
    "fecha_nacimiento", "genero", "direccion", "notas",
]

TEMPLATE_EXAMPLES = [
    ["Juan", "Pérez", "88001234", "juan.perez@email.com", "1985-03-15", "masculino", "San José, Costa Rica", ""],
    ["María", "González", "87654321", "maria.g@email.com", "1992-07-20", "femenino", "Alajuela", "Alergia a penicilina"],
    ["Carlos", "Rodríguez", "86543210", "", "1978-11-05", "masculino", "", ""],
]


def generate_csv_template() -> bytes:
    """Genera la plantilla CSV lista para descargar."""
    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow(TEMPLATE_HEADERS)
    writer.writerows(TEMPLATE_EXAMPLES)
    return buf.getvalue().encode("utf-8-sig")  # BOM para compatibilidad con Excel


# ── Parseo de archivos ─────────────────────────────────────────────────────────

def _normalize_header(h: str) -> str:
    return h.strip().lower().replace(" ", "_")


def parse_file(content: bytes, filename: str) -> tuple[list[dict[str, str]], str | None]:
    """
    Parsea CSV o XLSX. Devuelve (filas_como_dicts, error_message).
    Si error_message no es None, el archivo es inválido.
    """
    ext = filename.lower().rsplit(".", 1)[-1] if "." in filename else ""

    if ext in ("csv", "txt"):
        return _parse_csv(content)
    elif ext in ("xlsx", "xls"):
        return _parse_xlsx(content)
    else:
        return [], f"Formato '{ext}' no soportado. Usá CSV o XLSX."


def _parse_csv(content: bytes) -> tuple[list[dict[str, str]], str | None]:
    try:
        # Intentar UTF-8 con BOM primero, luego latin-1
        for enc in ("utf-8-sig", "utf-8", "latin-1"):
            try:
                text = content.decode(enc)
                break
            except UnicodeDecodeError:
                continue
        else:
            return [], "No se pudo decodificar el archivo. Guardalo en formato UTF-8."

        reader = csv.DictReader(io.StringIO(text))
        rows = list(reader)
        if not rows:
            return [], "El archivo está vacío."
        return rows, None
    except Exception as e:
        return [], f"Error al leer el CSV: {e}"


def _parse_xlsx(content: bytes) -> tuple[list[dict[str, str]], str | None]:
    if not _XLSX_AVAILABLE:
        return [], "Soporte para Excel no instalado en el servidor."
    try:
        wb = openpyxl.load_workbook(io.BytesIO(content), read_only=True, data_only=True)
        ws = wb.active
        rows_iter = iter(ws.rows)
        headers = [str(cell.value or "").strip() for cell in next(rows_iter)]
        if not any(headers):
            return [], "El archivo no tiene encabezados en la primera fila."
        rows = []
        for row in rows_iter:
            row_dict = {headers[i]: str(cell.value or "").strip() for i, cell in enumerate(row) if i < len(headers)}
            if any(row_dict.values()):  # skip empty rows
                rows.append(row_dict)
        return rows, None
    except Exception as e:
        return [], f"Error al leer el Excel: {e}"


# ── Mapeo de columnas ──────────────────────────────────────────────────────────

def map_columns(raw_row: dict[str, str]) -> dict[str, str]:
    """Normaliza los nombres de columna del archivo al esquema interno."""
    mapped: dict[str, str] = {}
    for key, val in raw_row.items():
        normalized = _normalize_header(key)
        internal = COLUMN_ALIASES.get(normalized) or COLUMN_ALIASES.get(key.lower().strip())
        if internal:
            mapped[internal] = val.strip()
    return mapped


# ── Validación de una fila ─────────────────────────────────────────────────────

def _parse_date(value: str) -> date | None:
    for fmt in DATE_FORMATS:
        try:
            return datetime.strptime(value, fmt).date()
        except ValueError:
            continue
    return None


def _clean_phone(phone: str) -> str | None:
    digits = re.sub(r"[^\d+]", "", phone)
    return digits if len(digits) >= 6 else None


def validate_row(mapped: dict[str, str], row_num: int) -> tuple[dict[str, Any] | None, list[str]]:
    """
    Valida y normaliza una fila ya mapeada.
    Retorna (patient_data_dict, errors_list).
    Si hay errores, patient_data es None.
    """
    errors: list[str] = []

    # Construir full_name
    if "full_name" in mapped and mapped["full_name"]:
        full_name = mapped["full_name"].strip()
    elif "_first_name" in mapped or "_last_name" in mapped:
        parts = [mapped.get("_first_name", ""), mapped.get("_last_name", "")]
        full_name = " ".join(p.strip() for p in parts if p.strip())
    else:
        full_name = ""

    if len(full_name) < 2:
        errors.append("Nombre requerido (mínimo 2 caracteres)")
    elif len(full_name) > 200:
        errors.append("El nombre supera los 200 caracteres")

    # Email
    email_raw = mapped.get("email", "").strip()
    email: str | None = None
    if email_raw:
        email_pattern = re.compile(r"^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$")
        if email_pattern.match(email_raw):
            email = email_raw.lower()
        else:
            errors.append(f"Email inválido: '{email_raw}'")

    # Teléfono
    phone_raw = mapped.get("phone", "").strip()
    phone: str | None = _clean_phone(phone_raw) if phone_raw else None
    if phone_raw and not phone:
        errors.append(f"Teléfono inválido: '{phone_raw}'")

    # Fecha de nacimiento
    birth_raw = mapped.get("birth_date", "").strip()
    birth_date: date | None = None
    if birth_raw:
        birth_date = _parse_date(birth_raw)
        if birth_date is None:
            errors.append(f"Fecha inválida '{birth_raw}' — usá formato YYYY-MM-DD")
        elif birth_date > date.today():
            errors.append("La fecha de nacimiento no puede ser futura")
        elif birth_date.year < 1900:
            errors.append("Fecha de nacimiento demasiado antigua")

    # Género
    gender_raw = mapped.get("gender", "").strip().lower()
    gender: str | None = None
    if gender_raw:
        gender = GENDER_ALIASES.get(gender_raw)
        if gender is None:
            errors.append(f"Género inválido '{gender_raw}' — usá: masculino, femenino, otro")

    # Dirección / notas
    address = (mapped.get("address") or "").strip() or None
    notes = (mapped.get("notes") or "").strip() or None

    if errors:
        return None, errors

    return {
        "full_name": full_name,
        "email": email,
        "phone": phone,
        "birth_date": birth_date.isoformat() if birth_date else None,
        "gender": gender,
        "address": address,
        "notes": notes,
    }, []


# ── Resultado de la previsualización ──────────────────────────────────────────

class PreviewResult:
    def __init__(self):
        self.valid: list[dict] = []
        self.invalid: list[dict] = []
        self.duplicates: list[dict] = []

    def to_dict(self) -> dict:
        return {
            "total_rows": len(self.valid) + len(self.invalid),
            "valid_count": len(self.valid),
            "invalid_count": len(self.invalid),
            "duplicate_count": len(self.duplicates),
            "valid": self.valid,
            "invalid": self.invalid,
            "duplicates": self.duplicates,
        }


def build_preview(rows: list[dict[str, str]], existing_emails: set[str], existing_phones: set[str]) -> PreviewResult:
    """
    Clasifica todas las filas en: válidas, inválidas y duplicadas.
    existing_emails/phones son los ya registrados en la clínica (verificados en el router).
    """
    result = PreviewResult()
    seen_emails: set[str] = set()
    seen_phones: set[str] = set()

    for i, raw_row in enumerate(rows, start=2):  # fila 2 = primera de datos (1 = header)
        mapped = map_columns(raw_row)
        patient, errors = validate_row(mapped, i)

        if errors:
            result.invalid.append({"row": i, "errors": errors, "raw": dict(raw_row)})
            continue

        # Detectar duplicados con registros existentes en DB
        dup_reason: str | None = None
        if patient["email"] and patient["email"] in existing_emails:
            dup_reason = f"Email ya registrado: {patient['email']}"
        elif patient["phone"] and patient["phone"] in existing_phones:
            dup_reason = f"Teléfono ya registrado: {patient['phone']}"
        # Detectar duplicados dentro del mismo CSV
        elif patient["email"] and patient["email"] in seen_emails:
            dup_reason = f"Email duplicado en el archivo: {patient['email']}"
        elif patient["phone"] and patient["phone"] in seen_phones:
            dup_reason = f"Teléfono duplicado en el archivo: {patient['phone']}"

        if dup_reason:
            result.duplicates.append({
                "row": i,
                "reason": dup_reason,
                "patient": patient,
                "raw": dict(raw_row),
            })
        else:
            result.valid.append({"row": i, "patient": patient})

        if patient["email"]:
            seen_emails.add(patient["email"])
        if patient["phone"]:
            seen_phones.add(patient["phone"])

    return result
