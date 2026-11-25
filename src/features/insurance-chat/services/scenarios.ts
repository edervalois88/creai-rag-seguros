import type { ChatRequest } from "@/features/insurance-chat/services/chatService";

interface Scenario extends ChatRequest {
  id: string;
  label: string;
}

export const scenarios: Scenario[] = [
  {
    id: "endorsement",
    label: "Grúa con endoso",
    question: "¿Cuál es el límite de grúa?",
    profile: "customer",
    incidentDate: "2026-01-01",
  },
  {
    id: "historical",
    label: "Grúa antes del endoso",
    question: "¿Cuál era el límite de grúa en 2025?",
    profile: "customer",
    incidentDate: "2025-12-31",
  },
  {
    id: "date",
    label: "Consulta sin fecha",
    question: "¿Qué deducible indica mi póliza?",
    profile: "customer",
    incidentDate: null,
  },
  {
    id: "public",
    label: "Sin acceso a la póliza",
    question: "¿Qué deducible indica mi póliza?",
    profile: "public",
    incidentDate: "2026-01-01",
  },
  {
    id: "adjuster",
    label: "Revisión humana",
    question: "¿Me van a pagar el siniestro?",
    profile: "customer",
    incidentDate: "2026-01-01",
    simulateAck: true,
  },
];
