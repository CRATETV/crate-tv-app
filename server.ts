import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';

// Import API handlers
import { GET as getRokuFeed } from './api/roku-feed.js';
import { GET as getRokuDirectFeed } from './api/roku-direct-publisher-feed.js';
import { POST as getSalesData } from './api/get-sales-data.js';
import { POST as getGrowthAnalytics } from './api/get-growth-analytics.js';
import { POST as trackView } from './api/track-view.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const port = 3000;

  app.use(express.json());

  // Helper to wrap Vercel-style handlers for Express
  const wrapHandler = (handler: any) => async (req: express.Request, res: express.Response) => {
    try {
      // Construct a Request-like object for the handler
      const url = `${req.protocol}://${req.get('host')}${req.originalUrl}`;
      const requestObj = new Request(url, {
        method: req.method,
        headers: new Headers(req.headers as any),
        body: ['POST', 'PUT', 'PATCH'].includes(req.method) ? JSON.stringify(req.body) : undefined
      });

      const response = await handler(requestObj);
      const contentType = response.headers.get('Content-Type') || 'application/json';
      const body = await response.text();

      res.status(response.status).set('Content-Type', contentType).send(body);
    } catch (error) {
      console.error('API Error:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  };

  // Explicit API Routes
  app.get('/api/roku-feed', wrapHandler(getRokuFeed));
  app.get('/api/roku-direct-publisher-feed', wrapHandler(getRokuDirectFeed));
  app.post('/api/get-sales-data', wrapHandler(getSalesData));
  app.post('/api/get-growth-analytics', wrapHandler(getGrowthAnalytics));
  app.post('/api/track-view', wrapHandler(trackView));

  // Health check
  app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`Server running at http://0.0.0.0:${port}`);
  });
}

startServer();
