# Chatbot de seguros de auto con LangGraph

Demostración para una junta técnica. El corpus y las identidades son ficticios. No se conecta a ninguna aseguradora ni aprueba, rechaza o paga siniestros. Lee [JUNTA.md](JUNTA.md) antes de presentarla.

## Ejecutar en Windows

Desde esta carpeta, con Python 3.13. Solo la instalación inicial necesita acceso a PyPI.

```powershell
py -3.13 -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe -X utf8 demo.py
```

El comando ejecuta el recorrido completo, incluso el acuse del ajustador simulado. No necesita API key, modelo ni servicios. Para conversar, agrega `--chat`. Escribe `/fecha 2026-01-01` y pregunta «¿Cuál es el límite de grúa?». Si quieres mostrar una sesión no autenticada, usa `--chat --publico`. Cada pregunta abre una ejecución y el modo interactivo conserva únicamente la fecha configurada, no un historial conversacional. El acuse del ajustador se muestra en el recorrido automático.

```powershell
.\.venv\Scripts\python.exe -X utf8 -m unittest -v
.\.venv\Scripts\python.exe -X utf8 demo.py --otel --audit evidencia.jsonl 2> otel.txt
```

Con `--otel` se exportan spans y métricas al cerrar el proceso. Busca en `otel.txt` la traza que imprime el bot. La auditoría JSONL, habilitada sin `--otel`, registra código de decisión, fuente/versión/cláusula, sustituciones, hash del corpus, versión de reglas, duración e IDs de correlación. No guarda el mensaje, el cuerpo de la respuesta ni el texto de la cláusula. El span del acuse se liga al anterior por `request_id` y `previous_trace_id` entre ejecuciones.

```powershell
$events = Get-Content -Encoding UTF8 evidencia.jsonl | ForEach-Object { $_ | ConvertFrom-Json }
$events | Group-Object status | Select-Object Name, Count
$events | Where-Object { $_.superseded.Count -gt 0 } | Select-Object status, citations, superseded, trace_id
$events | Where-Object { $_.status -in 'pending_review','received' } | Select-Object request_id, status, trace_id, previous_trace_id
```

### Modelo opcional

Si ya tienes Ollama corriendo **en local y sin funciones cloud** con un modelo descargado (ver `ollama list`), agrega `--ollama nombre-del-modelo`. Usa únicamente este corpus ficticio. El adaptador llama a `127.0.0.1:11434`, sin proxy ni redirecciones. Recibe temas normalizados y cláusulas ya autorizadas, no el mensaje original. El modelo produce un plan JSON con una introducción preaprobada y el orden de todas las fuentes. El código verifica exactamente esos IDs y renderiza las cláusulas textuales. Si el modelo está caído o el plan es inválido, el bot conserva la respuesta con citas y señala `extractive_fallback` en la auditoría.

**Alcance de la verificación**. El recorrido offline y la instrumentación se prueban de extremo a extremo. Las pruebas del plan opcional simulan la respuesta y el timeout del proveedor. No se verificó inferencia con un modelo local instalado. El modo base es recuperación y respuesta extractiva. El modo con modelo añade generación estructurada de la presentación, no síntesis libre de cláusulas.

## Cómo funciona

```text
Mensaje → señales permitidas → dispatch (LangGraph)
    ├─ Riesgo inmediato / falta identidad o fecha → mensaje controlado
    ├─ Solicitud de dictamen → interrupt → acuse del rol ajustador
    └─ Tema admitido → recuperar por póliza, tema y vigencia
                        ├─ Sin evidencia o conflicto → abstenerse
                        └─ Fuente aplicable → componer + citar
Cada recorrido → OpenTelemetry + recibo local de auditoría
```

- **Autorización y jurisdicción.** La identidad viene del canal simulado, nunca del texto del chat. Consulta privada con ámbito explícito y una sola póliza, o guía pública de México. Hay una cláusula señuelo de otra aseguradora con el mismo ID de póliza para demostrar el aislamiento. No hay proveedor de identidad, autenticación real ni API de pólizas.
- **Fecha de corte y precedencia.** El contrato usa la fecha del incidente. En este corpus los periodos son `[desde, hasta)`, y un endoso solo reemplaza una cláusula si referencia explícitamente a una base vigente del mismo ámbito y tema. Las reglas reales las define la aseguradora para cada producto y versión. No se escoge por el mejor score si hay conflicto.
- **Control de salida.** No se habilita ninguna herramienta que escriba en el core. El bot solo presenta fuentes o mensajes fijos. La separación entre datos y control no depende del prompt. No hay crawling, documentos subidos por usuarios ni ejecución de instrucciones recuperadas.
- **Intervención humana.** `interrupt()` de LangGraph con `InMemorySaver` y reanudación con `Command`. La demo solo acusa recepción y evita repetir el acuse en el mismo proceso. Reiniciar pierde casos pendientes. No es una cola, ni un expediente, ni un SLA.
- **Evaluación.** `unittest` cubre autorizaciones, fechas, un endoso que sustituye a la base, fuentes conflictivas, ausencia de evidencia, urgencia, el flujo del ajustador, la degradación del modelo y la ausencia del texto del chat en las salidas de telemetría. El reconocimiento de intención es léxico y deliberadamente acotado. No detecta todas las formas de describir un incidente ni debe usarse como filtro real de emergencias.

## Archivos

- `demo.py` contiene la orquestación, la recuperación de fuentes, el CLI y la telemetría.
- `corpus.json` mantiene las cláusulas sintéticas y sus metadatos de vigencia y precedencia.
- `test_demo.py` contiene pruebas reproducibles.
- `requirements.txt` fija las dependencias verificadas en Windows y Python 3.13. `requirements.in` declara las dependencias directas.
- `JUNTA.md` trae el guion, la evidencia sobre CREAI y el plan para un piloto.
