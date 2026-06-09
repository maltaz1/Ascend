#!/usr/bin/env node

import crypto from 'node:crypto';

const DEFAULT_URL = process.env.LOCAL_WEBHOOK_URL || 'http://localhost:3000/api/cakto/webhook';
const secret = process.env.CAKTO_WEBHOOK_SECRET;

if (!secret) {
  console.error('❌ CAKTO_WEBHOOK_SECRET não configurada.');
  console.error('Defina a variável e rode: CAKTO_WEBHOOK_SECRET=... node scripts/test-cakto-webhook.mjs');
  process.exit(1);
}

const payload = {
  id: 'evt_local_test_001',
  event_type: 'payment.succeeded',
  status: 'approved',
  created_at: new Date().toISOString(),
  customer: {
    email: 'cliente@exemplo.com',
  },
  payment: {
    id: 'pay_local_test_001',
  },
  subscription: {
    id: 'sub_local_test_001',
    status: 'active',
  },
  metadata: {
    plan: 'pro',
  },
};

const rawBody = JSON.stringify(payload);
const signature = crypto.createHmac('sha256', secret).update(rawBody, 'utf8').digest('hex');

const response = await fetch(DEFAULT_URL, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-cakto-signature': `sha256=${signature}`,
  },
  body: rawBody,
});

const responseText = await response.text();

console.log('URL:', DEFAULT_URL);
console.log('Status:', response.status);
console.log('Resposta:', responseText);

if (!response.ok) {
  process.exit(1);
}
