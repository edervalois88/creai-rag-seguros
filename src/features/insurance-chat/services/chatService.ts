import { z } from "zod";

export type Profile = "customer" | "public";
const reply = z.object({
  answer: z.string(),
  status: z.string(),
  citations: z.array(
    z.object({
      id: z.string(),
      source: z.string(),
      clause: z.string(),
      version: z.string(),
      text: z.string(),
      from: z.string(),
      to: z.string().nullable(),
    }),
  ),
  rule: z.object({
    code: z.string(),
    title: z.string(),
    description: z.string(),
    version: z.string(),
    superseded: z.array(z.string()),
  }),
  trace: z.object({
    id: z.string(),
    requestId: z.string(),
    previousId: z.string().nullable(),
    durationMs: z.number(),
    steps: z.array(
      z.object({ name: z.string(), id: z.string(), durationMs: z.number() }),
    ),
  }),
});

export type Reply = z.infer<typeof reply>;
export interface ChatRequest {
  question: string;
  profile: Profile;
  incidentDate: string | null;
  simulateAck?: boolean;
}

export interface Turn {
  id: string;
  request: ChatRequest;
  replies: Reply[];
}

const envelope = z.object({ replies: z.array(reply).min(1) });
const failure = z.object({ error: z.object({ message: z.string() }) });

export async function sendQuestion(request: ChatRequest, signal: AbortSignal) {
  const response = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
    signal,
  });
  const data: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const parsed = failure.safeParse(data);
    throw new Error(
      parsed.success
        ? parsed.data.error.message
        : "El asistente no respondió. Inténtalo de nuevo.",
    );
  }
  return envelope.parse(data).replies;
}
