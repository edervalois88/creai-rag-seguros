"""Capture completed OpenTelemetry spans for one demo request."""
from threading import Lock

from opentelemetry.sdk.trace import SpanProcessor


class TraceCapture(SpanProcessor):
    def __init__(self):
        self._active = {}
        self._lock = Lock()

    def start(self, trace_id):
        with self._lock:
            self._active[trace_id] = []

    def finish(self, trace_id):
        with self._lock:
            return sorted(self._active.pop(trace_id), key=lambda item: item["start_ns"])

    def on_end(self, span):
        context = span.context
        with self._lock:
            steps = self._active.get(context.trace_id) if context else None
            if steps is not None:
                steps.append({
                    "name": span.name,
                    "span_id": f"{context.span_id:016x}",
                    "start_ns": span.start_time,
                    "duration_ms": round((span.end_time - span.start_time) / 1_000_000, 3),
                    "reason": span.attributes.get("insurance.reason"),
                })
