// Local / Render server. On Vercel the same logic runs from /api/*.js instead.
import 'dotenv/config';
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { negotiate, publicConfig } from './negotiate.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

app.disable('x-powered-by');
app.set('trust proxy', 1);
app.use(express.json({ limit: '32kb' }));

app.get('/api/config', (req, res) => res.json(publicConfig()));

app.post('/api/negotiate', async (req, res) => {
  try {
    const { status, json } = await negotiate(req.body, req.ip);
    res.status(status).json(json);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'server_error' });
  }
});

// no-cache: browsers re-check files on each load, so edits show up without a hard refresh
app.use(express.static(path.join(__dirname, '..', 'public'), { setHeaders: (res) => res.setHeader('Cache-Control', 'no-cache') }));

const port = Number(process.env.PORT) || 3000;
app.listen(port, () => {
  const { provider, model } = publicConfig();
  console.log(`Haggle Market running at http://localhost:${port}  (AI: ${provider}${model ? ` / ${model}` : ''})`);
});
