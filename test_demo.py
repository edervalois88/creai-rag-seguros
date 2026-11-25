import json
import io
import tempfile
import unittest
from contextlib import redirect_stderr
from pathlib import Path
from unittest.mock import patch

from demo import Assistant, Principal, PUBLIC, CUSTOMER, OTHER, REVIEWER


class DemoTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.audit = Path(self.tmp.name) / 'audit.jsonl'
        self.bot = Assistant(self.audit)
        self.addCleanup(self.bot.close)

    def test_public_orientation(self):
        out = self.bot.ask('¿Cómo reporto un choque?', PUBLIC)
        self.assertEqual(out['status'], 'answered')
        self.assertEqual([x['id'] for x in out['citations']], ['GUIA-v1-1'])

    def test_contract_requires_authorization(self):
        out = self.bot.ask('¿Qué deducible establece mi póliza?', OTHER, '2026-05-02')
        self.assertEqual(out['status'], 'auth_required')
        self.assertEqual(out['citations'], [])

    def test_missing_date_is_not_guessed(self):
        self.assertEqual(self.bot.ask('¿Qué deducible aplica?', CUSTOMER)['status'], 'clarify_date')

    def test_invalid_date_is_not_guessed(self):
        self.assertEqual(self.bot.ask('¿Qué deducible aplica?', CUSTOMER, '2026-02-30')['status'], 'clarify_date')

    def test_date_selects_version_and_endorsement(self):
        query = '¿Cuál es el límite de grúa?'
        old = self.bot.ask(query, CUSTOMER, '2025-12-31')
        new = self.bot.ask(query, CUSTOMER, '2026-01-01')
        self.assertIn('50 km', old['answer'])
        self.assertIn('100 km', new['answer'])
        self.assertEqual([x['id'] for x in new['citations']], ['END-v2-7'])
        self.assertEqual(new['citations'][0]['clause'], '§7')

    def test_outside_term_no_inference(self):
        out = self.bot.ask('¿Qué deducible aplica?', CUSTOMER, '2024-11-25')
        self.assertEqual(out['status'], 'no_evidence')
        self.assertEqual(out['citations'], [])

    def test_grounded_contract(self):
        out = self.bot.ask('¿Qué deducible aplica?', CUSTOMER, '2026-11-25')
        self.assertIn('5 %', out['answer'])
        self.assertNotIn('99 %', out['answer'])
        self.assertEqual(out['citations'][0]['id'], 'AUTO-v2-4')

    def test_no_evidence(self):
        self.assertEqual(self.bot.ask('¿Cuánto cuesta renovar?', CUSTOMER)['status'], 'no_evidence')

    def test_adjuster_interrupt_and_authorization(self):
        out = self.bot.ask('¿Me van a pagar el siniestro?', CUSTOMER, '2026-11-25')
        self.assertEqual(out['status'], 'pending_review')
        with self.assertRaises(PermissionError):
            self.bot.mark_received(out['case_id'], CUSTOMER)
        ack = self.bot.mark_received(out['case_id'], REVIEWER)
        self.assertEqual(ack['status'], 'received')
        self.assertEqual(ack, self.bot.mark_received(out['case_id'], REVIEWER))

    def test_emergency_bypasses_model_and_auth(self):
        self.assertEqual(self.bot.ask('Hay heridos en el choque', PUBLIC)['status'], 'urgent')

    def test_audit_does_not_store_chat_text(self):
        marker = 'NO-REGISTRAR-ESTE-TEXTO'
        out = self.bot.ask(f'¿Cómo reporto un choque? {marker}', PUBLIC)
        raw = self.audit.read_text(encoding='utf-8')
        self.assertNotIn(marker, raw)
        event = json.loads(raw)
        self.assertEqual(event['request_id'], out['request_id'])
        self.assertEqual(event['citations'][0]['id'], 'GUIA-v1-1')
        self.assertRegex(event['trace_id'], r'^[0-9a-f]{32}$')

    def test_conflicting_sources_are_not_ranked_away(self):
        docs = json.loads(Path(__file__).with_name('corpus.json').read_text(encoding='utf-8'))
        template = next(d for d in docs if d['id'] == 'END-v2-7')
        corpus = Path(self.tmp.name) / 'conflict.json'
        corpus.write_text(json.dumps([*docs, {**template, 'id': 'END-v2-8', 'text': 'Límite de 200 km.'}]),
                          encoding='utf-8')
        bot = Assistant(self.audit, corpus=corpus)
        self.addCleanup(bot.close)
        out = bot.ask('¿Cuál es el límite de grúa?', CUSTOMER, '2026-01-01')
        self.assertEqual(out['status'], 'conflict')
        self.assertFalse(out['citations'])

    def test_other_authenticated_tenant_with_same_policy_id_is_rejected(self):
        other = Principal(OTHER.tenant, 'customer', CUSTOMER.policies)
        self.assertEqual(self.bot.ask('Deducible', other, '2026-01-01')['status'], 'auth_required')

    def test_valid_model_plan_only_changes_presentation(self):
        self.bot.model = 'simulado'
        with patch('demo.ollama_plan', return_value={'order': ['END-v2-7', 'AUTO-v2-4'], 'intro': 'referencia'}):
            out = self.bot.ask('Deducible y grúa', CUSTOMER, '2026-01-01')
        self.assertEqual(out['mode'], 'ollama_grounded')
        self.assertIn('100 km', out['answer'])
        self.assertIn('5 %', out['answer'])
        self.assertEqual([c['id'] for c in out['citations']], ['END-v2-7', 'AUTO-v2-4'])

    def test_model_cannot_add_unauthorized_ids(self):
        self.bot.model = 'simulado'
        with patch('demo.ollama_plan', return_value={'order': ['OTRO-v2-4'], 'intro': 'referencia'}):
            out = self.bot.ask('Deducible', CUSTOMER, '2026-01-01')
        self.assertEqual(out['mode'], 'extractive_fallback')
        self.assertNotIn('99 %', out['answer'])

    def test_model_cannot_invent_an_intro(self):
        self.bot.model = 'simulado'
        with patch('demo.ollama_plan', return_value={'order': ['AUTO-v2-4'], 'intro': 'Pago aprobado'}):
            out = self.bot.ask('Deducible', CUSTOMER, '2026-01-01')
        self.assertEqual(out['mode'], 'extractive_fallback')
        self.assertNotIn('Pago aprobado', out['answer'])

    def test_model_timeout_falls_back_to_authorized_clause(self):
        self.bot.model = 'simulado'
        with patch('demo.ollama_plan', side_effect=TimeoutError):
            out = self.bot.ask('Deducible', CUSTOMER, '2026-01-01')
        self.assertEqual(out['mode'], 'extractive_fallback')
        self.assertEqual(out['citations'][0]['id'], 'AUTO-v2-4')

    def test_otel_metrics_and_spans_do_not_store_chat_or_clause_body(self):
        buffer = io.StringIO()
        with redirect_stderr(buffer):
            bot = Assistant(self.audit, export=True)
            try:
                out = bot.ask('Deducible MARCADOR-PRIVADO', CUSTOMER, '2026-01-01')
            finally:
                bot.close()
        exported = buffer.getvalue()
        self.assertIn('insurance.run.duration', exported)
        self.assertIn(out['trace_id'], exported)
        self.assertIn('AUTO-v2-4', exported)
        self.assertNotIn('MARCADOR-PRIVADO', exported)
        self.assertNotIn('valor comercial', exported)


if __name__ == '__main__':
    unittest.main()
