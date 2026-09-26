// Vercel serverless function: GET /api/config
import { publicConfig } from '../backend/negotiate.js';

export default function handler(req, res) {
  res.status(200).json(publicConfig());
}
