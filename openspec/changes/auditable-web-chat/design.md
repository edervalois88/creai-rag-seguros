# Auditable web chat

Issue #1. This feature pairs each LangGraph response with its applied source, rule and OpenTelemetry spans. Earlier responses remain selectable. The synthetic demonstration covers historical versions, an explicit endorsement, missing context, unauthorized access and a simulated human acknowledgement.

The browser uses feature-scoped React components and a same-origin typed HTTP adapter. Python owns rules and evidence selection. The adapter validates inputs and gives each request its own in-memory graph state. Human simulation completes in the same request and returns linked traces. The web UI keeps the exchange in browser memory while displaying it.

Verification covers tracing, authorization, endorsement precedence, keyboard access and layout at desktop and mobile widths. Deployment targets the owner’s Pro team in Vercel. Publishing the review revision for the interview leaves integration and review to the maintainers.
