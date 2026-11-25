import type {
  ChatRequest,
  Profile,
} from "@/features/insurance-chat/services/chatService";
import { scenarios } from "@/features/insurance-chat/services/scenarios";

interface Props {
  profile: Profile;
  incidentDate: string;
  busy: boolean;
  onProfile: (profile: Profile) => void;
  onDate: (value: string) => void;
  onScenario: (request: ChatRequest) => void;
}

export function ScenarioControls({
  profile,
  incidentDate,
  busy,
  onProfile,
  onDate,
  onScenario,
}: Props) {
  return (
    <section className="controls" aria-labelledby="context-title">
      <h2 id="context-title">Datos de la consulta</h2>
      <div className="fields">
        <label>
          Sesión de prueba
          <select
            value={profile}
            disabled={busy}
            onChange={(event) =>
              onProfile(event.target.value === "public" ? "public" : "customer")
            }
          >
            <option value="customer">Con acceso a la póliza</option>
            <option value="public">Sesión pública</option>
          </select>
        </label>
        <label>
          Fecha del siniestro
          <input
            type="date"
            value={incidentDate}
            disabled={busy}
            onChange={(event) => onDate(event.target.value)}
          />
        </label>
      </div>
      <fieldset className="scenarios">
        <legend className="scenario-title">Casos de ejemplo</legend>
        {scenarios.map(
          ({ id, label, question, profile, incidentDate, simulateAck }) => (
            <button
              className="scenario-button"
              disabled={busy}
              key={id}
              type="button"
              onClick={() =>
                onScenario({ question, profile, incidentDate, simulateAck })
              }
            >
              {label}
            </button>
          ),
        )}
      </fieldset>
    </section>
  );
}
