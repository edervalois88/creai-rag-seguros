import { useRef, useState } from "react";
import { ChatPanel } from "@/features/insurance-chat/components/ChatPanel";
import { EvidencePanel } from "@/features/insurance-chat/components/EvidencePanel";
import { ScenarioControls } from "@/features/insurance-chat/components/ScenarioControls";
import {
  type ChatRequest,
  type Profile,
  sendQuestion,
  type Turn,
} from "@/features/insurance-chat/services/chatService";

export function InsuranceChatPage() {
  const [profile, setProfile] = useState<Profile>("customer");
  const [incidentDate, setDate] = useState("2026-01-01");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [pending, setPending] = useState("");
  const [failed, setFailed] = useState<ChatRequest | null>(null);
  const [error, setError] = useState("");
  const sending = useRef(false);
  const handleSelect = (id: string) => {
    setSelectedId(id);
    document.getElementById("evidence-title")?.focus();
  };
  const selected = turns
    .flatMap((turn) => turn.replies)
    .find((reply) => reply.trace.id === selectedId);

  const handleSend = async (request: ChatRequest) => {
    if (sending.current) return;
    sending.current = true;
    setPending(request.question);
    setError("");
    setFailed(null);
    setProfile(request.profile);
    setDate(request.incidentDate ?? "");
    try {
      const replies = await sendQuestion(request, AbortSignal.timeout(20000));
      const first = replies[0];
      if (!first) throw new Error("Respuesta vacía");
      setTurns((previous) => [
        ...previous,
        { id: first.trace.requestId, request, replies },
      ]);
      setSelectedId(first.trace.id);
    } catch {
      setFailed(request);
      setError("No se completó la consulta. Puedes volver a intentarlo.");
    } finally {
      sending.current = false;
      setPending("");
    }
  };

  return (
    <>
      <header className="masthead">
        <div className="masthead-inner">
          <div className="brand">
            <span className="brand-symbol" aria-hidden="true">
              §
            </span>{" "}
            Seguro de auto
          </div>
          <span className="environment">Demostración con datos ficticios</span>
        </div>
      </header>
      <main className="workspace">
        <div className="intro">
          <h1>Asistente de pólizas</h1>
          <p>
            Consulta el contrato y revisa qué evidencia usó el asistente para
            responder.
          </p>
        </div>
        <ScenarioControls
          profile={profile}
          incidentDate={incidentDate}
          busy={Boolean(pending)}
          onProfile={setProfile}
          onDate={setDate}
          onScenario={handleSend}
        />
        <div className="workspace-grid">
          <ChatPanel
            turns={turns}
            selectedId={selectedId}
            pending={pending}
            error={error}
            onSelect={handleSelect}
            onSend={(question) =>
              handleSend({
                question,
                profile,
                incidentDate: incidentDate || null,
                simulateAck: true,
              })
            }
            onRetry={failed ? () => handleSend(failed) : undefined}
          />
          <EvidencePanel selected={selected} />
        </div>
      </main>
    </>
  );
}
