import { type FormEvent, useEffect, useRef, useState } from "react";
import type { Turn } from "@/features/insurance-chat/services/chatService";

interface Props {
  turns: Turn[];
  pending: string;
  error: string;
  selectedId: string;
  onSelect: (id: string) => void;
  onSend: (question: string) => void;
  onRetry?: () => void;
}

export function ChatPanel({
  turns,
  pending,
  error,
  selectedId,
  onSelect,
  onSend,
  onRetry,
}: Props) {
  const [draft, setDraft] = useState("");
  const history = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!pending && turns.length === 0) return;
    const element = history.current;
    if (element) element.scrollTop = element.scrollHeight;
  }, [turns, pending]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const question = draft.trim();
    if (!question || pending) return;
    setDraft("");
    onSend(question);
  };

  return (
    <section className="panel chat" aria-labelledby="chat-title">
      <header className="panel-header">
        <h2 id="chat-title">Conversación</h2>
        <span className="subtle">Seguro de auto</span>
      </header>
      <div
        role="log"
        aria-live="polite"
        className="history"
        ref={history}
        // biome-ignore lint/a11y/noNoninteractiveTabindex: keyboard users can scroll the chat history.
        tabIndex={0}
        aria-label="Historial del chat"
      >
        {turns.length === 0 && !pending && (
          <div className="greeting">
            <h3>¿Qué quieres consultar?</h3>
            <p>
              Elige un escenario de ejemplo o escribe una pregunta sobre
              reporte, deducible o grúa.
            </p>
          </div>
        )}
        {turns.map((turn) => (
          <article className="turn" key={turn.id}>
            <div className="question">
              <span className="message-label">Tú</span>
              <p>{turn.request.question}</p>
            </div>
            {turn.replies.map((reply) => (
              <div className="answer" key={reply.trace.id}>
                <span className="message-label">
                  {reply.status === "received"
                    ? "Ajustador simulado"
                    : "Asistente"}
                </span>
                <p>{reply.answer}</p>
                <button
                  type="button"
                  className="evidence-button"
                  aria-pressed={selectedId === reply.trace.id}
                  aria-controls="evidence-panel"
                  onClick={() => onSelect(reply.trace.id)}
                >
                  Ver evidencia
                </button>
              </div>
            ))}
          </article>
        ))}
        {pending && (
          <div className="question">
            <span className="message-label">Tú</span>
            <p>{pending}</p>
            <span className="subtle">Consultando…</span>
          </div>
        )}
      </div>
      {error && (
        <div className="error" role="alert">
          {error}
          {onRetry && (
            <button type="button" onClick={onRetry}>
              Reintentar
            </button>
          )}
        </div>
      )}
      <form className="composer" onSubmit={handleSubmit}>
        <label htmlFor="question" className="visually-hidden">
          Escribe una pregunta
        </label>
        <input
          id="question"
          placeholder="Escribe una pregunta…"
          maxLength={1500}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
        />
        <button
          className="send-button"
          type="submit"
          disabled={Boolean(pending) || !draft.trim()}
        >
          Enviar
        </button>
      </form>
      <p className="chat-note">
        Usa preguntas ficticias. Evita introducir datos personales.
      </p>
    </section>
  );
}
