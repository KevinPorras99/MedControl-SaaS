import json
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
import httpx
from app.config import settings
from app.dependencies import get_current_user
from app.limiter import limiter

router = APIRouter(prefix="/api/assistant", tags=["Asistente"])

GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"

SYSTEM_PROMPT = """Eres MedTron, el asistente médico virtual de MedControl SaaS.

Ayudas a médicos, recepcionistas y administradores de clínicas con:
- Consultas sobre pacientes, citas y expedientes médicos
- Orientación sobre cómo usar el sistema MedControl
- Dudas sobre facturación y pagos pendientes
- Consejos generales de gestión clínica

Responde siempre en español, de forma clara, profesional y empática.
Nunca des diagnósticos médicos ni reemplaces la consulta de un profesional de la salud.
Si no sabes algo sobre el sistema, sugiere contactar al administrador."""


class Message(BaseModel):
    role: str = Field(..., pattern="^(user|assistant)$")
    content: str = Field(..., min_length=1, max_length=4000)


class ChatRequest(BaseModel):
    # Max 20 turns to cap token usage and prevent abuse
    messages: list[Message] = Field(..., min_length=1, max_length=20)


@router.post("/chat")
@limiter.limit("20/minute")
async def chat(request: Request, body: ChatRequest, user=Depends(get_current_user)):
    if not settings.groq_api_key:
        raise HTTPException(status_code=503, detail="Asistente no configurado")

    payload = {
        "model":    "llama-3.3-70b-versatile",
        "stream":   True,
        "messages": [{"role": "system", "content": SYSTEM_PROMPT}]
                   + [{"role": m.role, "content": m.content} for m in body.messages],
    }

    async def generate():
        async with httpx.AsyncClient(timeout=60.0) as client:
            async with client.stream(
                "POST", GROQ_URL,
                headers={"Authorization": f"Bearer {settings.groq_api_key}",
                         "Content-Type": "application/json"},
                json=payload,
            ) as resp:
                async for line in resp.aiter_lines():
                    if not line.startswith("data: "):
                        continue
                    data = line[6:]
                    if data == "[DONE]":
                        yield "data: [DONE]\n\n"
                        break
                    try:
                        chunk = json.loads(data)
                        text  = chunk["choices"][0]["delta"].get("content", "")
                        if text:
                            yield f"data: {json.dumps({'text': text})}\n\n"
                    except Exception:
                        pass

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
