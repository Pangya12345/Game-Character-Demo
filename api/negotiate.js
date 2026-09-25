// Vercel serverless function: POST /api/negotiate
import { negotiate } from '../backend/negotiate.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'method_not_allowed' });
  }
  try {
    const ip = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown';
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
    const { status, json } = await negotiate(body, ip);
    return res.status(status).json(json);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'server_error' });
  }
}
