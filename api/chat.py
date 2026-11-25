"""Vercel Python endpoint and loopback API for Vite development."""
import json
import logging
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

from demo import Assistant, CUSTOMER, PUBLIC, REVIEWER

MAX_JSON_BYTES = 8192
MAX_QUESTION_LENGTH = 1500
RULES = {
    "riesgo_inmediato": ("Urgencia primero", "El flujo de urgencia se aplica antes de consultar el contrato."),
    "contexto_no_autorizado": ("Acceso a la póliza", "La consulta privada requiere una sesión con acceso a la póliza."),
    "fecha_faltante_o_invalida": ("Fecha del siniestro", "La selección de cláusulas requiere una fecha válida."),
    "fuera_de_alcance": ("Alcance del asistente", "La consulta no coincide con reporte, deducible o grúa."),
    "sin_clausula_aplicable": ("Vigencia del contrato", "La búsqueda no encontró una cláusula aplicable a la fecha seleccionada."),
    "fuentes_en_conflicto": ("Conflicto de fuentes", "Las fuentes aplicables requieren revisión de la aseguradora."),
    "dictamen_reservado": ("Revisión del ajustador", "El grafo pausó la consulta para revisión humana."),
    "acuse_humano_simulado": ("Acuse del ajustador", "El rol de ajustador reanudó la revisión simulada."),
    "fuentes_autorizadas": ("Fuente aplicable", "La búsqueda devolvió evidencia autorizada para el tema y la fecha."),
}


def error(code, message):
    return {"error": {"code": code, "message": message}}


def parse_request(body):
    if not isinstance(body, dict) or body.keys() - {"question", "profile", "incidentDate", "simulateAck"}:
        raise ValueError
    question = body.get("question")
    profile = body.get("profile")
    incident_date = body.get("incidentDate")
    simulate_ack = body.get("simulateAck", False)
    if not isinstance(question, str) or not question.strip() or len(question) > MAX_QUESTION_LENGTH:
        raise ValueError
    if profile not in ("customer", "public") or not isinstance(simulate_ack, bool):
        raise ValueError
    if incident_date is not None and (not isinstance(incident_date, str) or len(incident_date) > 10):
        raise ValueError
    return question, profile, incident_date, simulate_ack


def response(result, bot):
    title, description = RULES[result["reason"]]
    if result["superseded"]:
        title = "Precedencia del endoso"
        description = "El endoso vigente reemplaza explícitamente la cláusula base para este evento."
    answer = result["answer"]
    if result["status"] == "clarify_date":
        answer = "Selecciona la fecha del siniestro en el campo Fecha del siniestro y vuelve a enviar la pregunta."
    return {
        "answer": answer,
        "status": result["status"],
        "citations": [{**cite, "text": bot.docs[cite["id"]]["text"]} for cite in result["citations"]],
        "rule": {"code": result["reason"], "title": title, "description": description,
                 "version": result["ruleset"], "superseded": result["superseded"]},
        "trace": {"id": result["trace_id"], "requestId": result["request_id"],
                  "previousId": result["previous_trace_id"], "durationMs": result["duration_ms"],
                  "steps": [{"name": step["name"], "id": step["span_id"], "durationMs": step["duration_ms"]}
                            for step in result["steps"]]},
    }


def chat(body):
    return run_chat(*parse_request(body))


def run_chat(question, profile, incident_date, simulate_ack):
    bot = Assistant(None)
    try:
        result = bot.ask(question, CUSTOMER if profile == "customer" else PUBLIC, incident_date)
        results = [response(result, bot)]
        if simulate_ack and result["status"] == "pending_review":
            results.append(response(bot.mark_received(result["case_id"], REVIEWER), bot))
        return {"replies": results}
    finally:
        bot.close()


class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        if self.headers.get_content_type() != "application/json":
            return self.reply(415, error("unsupported_media_type", "Envía un cuerpo JSON."))
        try:
            length = int(self.headers.get("Content-Length", "0"))
        except ValueError:
            return self.reply(400, error("invalid_length", "Revisa el tamaño de la consulta."))
        if not 0 < length <= MAX_JSON_BYTES:
            return self.reply(413, error("request_size", "El tamaño de la consulta está fuera del límite."))
        try:
            body = json.loads(self.rfile.read(length))
            inputs = parse_request(body)
        except (ValueError, RecursionError):
            return self.reply(400, error("invalid_request", "Revisa la pregunta y la fecha del siniestro."))
        try:
            return self.reply(200, run_chat(*inputs))
        except Exception:
            logging.getLogger(__name__).error("insurance_web_chat_failed")
            return self.reply(500, error("chat_unavailable", "Intenta enviar la pregunta de nuevo."))

    def do_GET(self):
        self.reply(405, error("method_not_allowed", "Usa POST para consultar el asistente."))

    def reply(self, status, body):
        encoded = json.dumps(body, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(encoded)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(encoded)

    def log_message(self, *_args):
        # Keep user-supplied request paths and content out of logs.
        return


if __name__ == "__main__":
    ThreadingHTTPServer(("127.0.0.1", 8765), handler).serve_forever()
