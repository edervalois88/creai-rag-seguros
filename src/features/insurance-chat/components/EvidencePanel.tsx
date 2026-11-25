import type { Reply } from "@/features/insurance-chat/services/chatService";

interface Props {
  selected?: Reply;
}

const steps: Record<string, string> = {
  dispatch: "Evaluar la consulta",
  retrieve: "Buscar cláusula aplicable",
  compose: "Redactar con evidencia",
  guide: "Emitir mensaje de protocolo",
  review: "Revisar con ajustador",
};

export function EvidencePanel({ selected }: Props) {
  return (
    <aside
      className="panel evidence"
      id="evidence-panel"
      aria-labelledby="evidence-title"
    >
      <header className="panel-header evidence-header">
        <h2 id="evidence-title" tabIndex={-1}>
          Evidencia de la respuesta
        </h2>
        {selected && (
          <span className="subtle">
            {selected.trace.durationMs.toFixed(1)} ms
          </span>
        )}
      </header>
      {!selected ? (
        <div className="evidence-empty">
          <p>Selecciona un caso o envía una pregunta.</p>
          <p className="subtle">
            Aquí verás la cláusula consultada, la regla aplicada y la traza de
            la respuesta.
          </p>
        </div>
      ) : (
        <>
          <section className="evidence-section" aria-labelledby="clause-title">
            <h3 id="clause-title">Cláusula</h3>
            {selected.citations.length === 0 && (
              <p className="subtle">Esta respuesta no usó cláusulas.</p>
            )}
            {selected.citations.map((cite) => (
              <div className="document" key={cite.id}>
                <p className="document-name">{cite.source}</p>
                <p className="subtle">
                  {cite.clause} · Versión {cite.version} ·{" "}
                  <code>{cite.id}</code>
                </p>
                <blockquote>{cite.text}</blockquote>
                <p className="subtle">
                  Vigencia desde {cite.from}
                  {cite.to && ` hasta ${cite.to} (excluida)`}
                </p>
              </div>
            ))}
          </section>
          <section className="evidence-section" aria-labelledby="rule-title">
            <h3 id="rule-title">Regla aplicada</h3>
            <p className="rule-title">{selected.rule.title}</p>
            <p>{selected.rule.description}</p>
            {selected.rule.superseded.length > 0 && (
              <p>
                Reemplaza <code>{selected.rule.superseded.join(", ")}</code>
              </p>
            )}
            <p className="subtle">
              Versión <code>{selected.rule.version}</code>
            </p>
          </section>
          <section
            className="evidence-section trace-section"
            aria-labelledby="trace-title"
          >
            <h3 id="trace-title">
              Traza <span className="subtle">OpenTelemetry</span>
            </h3>
            <ol className="trace-list">
              {selected.trace.steps.map((step) => (
                <li key={step.id}>
                  <span>{steps[step.name] ?? step.name}</span>
                  <code>{step.durationMs.toFixed(3)} ms</code>
                </li>
              ))}
            </ol>
            <details>
              <summary>Identificadores de ejecución</summary>
              <dl className="trace-ids">
                <dt>Traza</dt>
                <dd>
                  <code>{selected.trace.id}</code>
                </dd>
                <dt>Solicitud</dt>
                <dd>
                  <code>{selected.trace.requestId}</code>
                </dd>
                {selected.trace.previousId && (
                  <>
                    <dt>Traza anterior</dt>
                    <dd>
                      <code>{selected.trace.previousId}</code>
                    </dd>
                  </>
                )}
              </dl>
            </details>
          </section>
        </>
      )}
    </aside>
  );
}
