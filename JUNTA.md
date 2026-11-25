# Junta con CREAI · RAG para seguros de auto

## Qué pude verificar sobre CREAI

Creai se presenta como una empresa nacida en México y fundada en 2023. Seguros es una vertical comprobable. Su caso con **INTER** describe el uso de IA para integrar validación regulatoria, cotizaciones y flujos de pólizas con trazabilidad. Creai reporta **57 % menos esfuerzo manual de validación** en ese caso. Es una cifra publicada por el proveedor y no demuestra el impacto de este bot. [Sobre Creai](https://www.creai.mx/es-mx/about-us) · [Caso INTER](https://www.creai.mx/success-stories/accelerating-insurance-operations-through-ai-powered-compliance-and-orchestration)

**No pude verificar que seguros sea su principal vertical**, ni que INTER sea su cliente más grande. Su catálogo incluye a Sura, pero clasifica ese trabajo como servicios financieros y lo describe como inteligencia para inversiones, no como automatización de siniestros. También publica casos de logística y recursos humanos. [Casos de éxito](https://www.creai.mx/es-mx/success-stories)

## Guion de tres minutos

> En su caso con INTER, lo que me llamó la atención fue la trazabilidad. Quise aplicar esa misma idea a la atención de siniestros: que el bot pueda explicar qué documento usó y por qué aplicaba en esa fecha.

| Muéstrales | Lo que demuestra |
| --- | --- |
| «¿Cuál es el límite de grúa?» con fecha 31/12/2025 y luego 01/01/2026 | Cambia de **50 km** a **100 km**. En 2026 las condiciones base dicen 75 km, pero un endoso explícito las sustituye. Abre la auditoría y muestra `END-v2-7` y `superseded: ["AUTO-v2-8"]`. |
| «¿Cuál es el deducible?» sin fecha, y luego en una sesión pública | Si está autenticado pero falta la fecha, la pide. Sin autorización, manda al canal autenticado y no recupera el contrato. No pide documentos por chat. |
| «¿Me van a pagar el siniestro?» | LangGraph pausa el caso y el ajustador simulado acusa recepción. El bot no decide procedencia ni promete pago. Muestra la correlación de ambas trazas. |

**La pregunta que llevaría a la junta.** «Si cambia un endoso después de un siniestro, ¿cómo reconstruyen qué documento y qué versión de reglas usó el agente cuando respondió? ¿Dónde viven esas reglas hoy, en Silia o en un servicio de la aseguradora?». Silia anuncia monitoreo, revisión de acciones y toma de control por humanos. Vale la pena ver cómo se implementan esos controles con un ejemplo real. [Silia](https://www.creai.mx/services/silia)

## Propuesta para un piloto real

Empezaría con un asistente interno para agentes de **auto** en modo sombra. El agente humano ve la respuesta y su fuente, pero el cliente no la recibe automáticamente. Medir contra la atención actual antes de habilitar respuestas públicas de bajo riesgo. Dejar fuera autorizaciones, rechazos, pagos, fraude, reclamaciones y datos médicos hasta que tengan procesos propios validados.

| Capa | Implementación recomendada y responsable |
| --- | --- |
| Ingesta y publicación | Operaciones y Jurídico aprueban la fuente maestra: carátula, condiciones y endosos, expediente y procedencia. Validar OCR contra original, detectar páginas incompletas y guardar motivo de aprobación, fechas, versión, hash, localizador de página y política de precedencia. Publicar snapshots reproducibles, retirar versiones incorrectas sin perder evidencia histórica según política de retención. |
| Identidad y recuperación | Integrar con el proveedor de identidad y un API de pólizas de solo lectura. Verificar pertenencia, rol, canal y vigencia antes de consultar. Separar índices/espacios por aseguradora y aplicar ACL antes del ranking. Buscar por texto y significado, con búsqueda léxica + embeddings (PostgreSQL FTS y pgvector son una opción), reranking solo entre candidatos autorizados. No meter expedientes en un índice público. |
| Respuesta y acciones | Separar clasificación, reglas deterministas, recuperación, composición y validación. Toda afirmación contractual debe apuntar a un extracto vigente. Si falta un dato permitido, pedirlo una vez. Si hay ambigüedad, conflictos o una petición de dictamen, derivar con un código de motivo. El contenido externo se trata como datos, nunca como instrucciones. Herramientas de bajo privilegio con parámetros tipados y autorización independiente. |
| Derivación humana | Usar una cola durable y checkpoints cifrados. Enviar únicamente motivo, fuente y referencia mínima del caso a la bandeja autenticada del ajustador. Confirmar creación con folio real antes de anunciarla. Definir SLA, reintentos acotados, idempotencia por evento/caso y reconciliación si falla la integración. Una queja se dirige al proceso formal aplicable, no a un simple fallback de chat. |
| Diagnóstico y auditoría | OpenTelemetry → Collector/Grafana Tempo para spans y Prometheus/Grafana para métricas. Separar depuración técnica de auditoría de negocio de acceso restringido y registro protegido contra alteraciones. Correlacionar canal, grafo, versión de regla, modelo y plantilla, copia del índice, cita, traspaso y resultado. No registrar prompts, tokens, identificadores directos o expedientes por defecto. Si se usa LangSmith, iniciar con datasets sintéticos y evaluar el filtrado antes de permitir trazas de uso real. |
| Privacidad y resiliencia | Definir responsables y encargados, finalidades, aviso, retención y borrado, encargados/subencargados y transferencias con Privacidad. Cambios versionados y revisados, secretos fuera de código, cifrado, roles, cuotas, timeouts y fallback a canal humano. Procedimiento para detener respuestas contractuales si se publica una versión incorrecta o hay acceso indebido. Mantener orientación pública separada. |

### Criterios propuestos antes de abrir el canal

- Evaluar con un conjunto adjudicado por ajustadores, versionado y reservado para regresión. Incluir límites de vigencia, endosos concurrentes, negaciones y mensajes ambiguos, diferencias de producto, fuentes contradictorias, pérdida de un backend y aislamiento entre aseguradoras.
- Medir **Recall@k de la cláusula correcta** en recuperación, **exactitud de cita y vigencia** en la respuesta, **abstención correcta**, **derivaciones recibidas y fuera de SLA**, **p95** por etapa y costo por conversación. Aparte medir el tiempo de atención y la corrección de respuestas en modo sombra. No premiar la reducción de derivaciones si bajó la exactitud.
- Proponer como puertas duras **cero cruces de autorización y cero dictámenes automáticos observados** en pruebas, y que **toda afirmación contractual evaluada tenga cita aplicable y validada**. Fijar metas operativas y tamaño de muestra con la aseguradora. Cero incidentes en una muestra no prueba riesgo cero.
- Si suben los casos `sin_clausula_aplicable`, clasificar por producto y por versión del índice. Revisar primero ingesta, vigencias y ACL. Si aparecen respuestas sin evidencia o una fuga, activar el apagado de consultas privadas, preservar evidencia autorizada y seguir el procedimiento de incidentes. Hacer rollback a snapshots y reglas aprobados juntos.

## Referencias de diseño y alcance legal

Para México, antes de usar datos reales, Jurídico y Privacidad deben asignar los requisitos concretos a este flujo considerando el producto, canal, finalidades, proveedores y transferencias. La demo no acredita cumplimiento ni sustituye los documentos del seguro. [Ley sobre el Contrato de Seguro](https://www.diputados.gob.mx/LeyesBiblio/pdf/211.pdf) · [LISF/CUSF en CNSF](https://lisfcusf.cnsf.gob.mx/landing.html) · [LFPDPPP](https://www.diputados.gob.mx/LeyesBiblio/pdf/LFPDPPP.pdf)

Como referencias de buenas prácticas, el documento de la IAIS cubre gobernanza, robustez, transparencia y vías de reparación. NIST da un marco de gestión del riesgo de IA generativa y OWASP documenta riesgos como inyección de instrucciones, exposición de datos y debilidades de los índices vectoriales. [IAIS](https://www.iais.org/2025/07/the-iais-publishes-application-paper-on-the-supervision-of-artificial-intelligence/) · [NIST AI 600-1](https://doi.org/10.6028/NIST.AI.600-1) · [OWASP GenAI](https://genai.owasp.org/llm-top-10/)

Referencias técnicas: [LangGraph interrupt](https://docs.langchain.com/oss/python/langgraph/interrupts) · [Persistencia LangGraph](https://docs.langchain.com/oss/python/langgraph/persistence) · [OpenTelemetry GenAI](https://opentelemetry.io/docs/specs/semconv/gen-ai/) · [Evaluación LangSmith](https://docs.langchain.com/langsmith/evaluation) · [Privacidad en LangSmith](https://docs.langchain.com/langsmith/mask-inputs-outputs) · [Ollama Structured Outputs](https://docs.ollama.com/capabilities/structured-outputs) · [911 México](https://www.gob.mx/911/articulos/que-es-el-911emergencias?idiom=es).
