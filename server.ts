import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';

// Import API handlers
import { GET as getRokuFeed } from './api/roku-feed.js';
import { GET as getRokuDirectFeed } from './api/roku-direct-publisher-feed.js';
import { GET as getWatchPartyStatus } from './api/get-watch-party-status.js';
import { POST as getSalesData } from './api/get-sales-data.js';
import { POST as getGrowthAnalytics } from './api/get-growth-analytics.js';
import { POST as trackView } from './api/track-view.js';
import { POST as getRecommendations } from './api/get-recommendations.js';
import { POST as createPoll } from './api/create-poll.js';
import { POST as votePoll } from './api/vote-poll.js';
import { POST as endPoll } from './api/end-poll.js';
import { POST as claimTicketStub } from './api/claim-ticket-stub.js';
import { GET as generateHighlights } from './api/generate-highlights.js';
import { POST as toggleQA } from './api/toggle-qa.js';
import { POST as sendChatMessage } from './api/send-chat-message.js';
import { POST as clearChat } from './api/clear-chat.js';
import { POST as toggleLike } from './api/toggle-like.js';
import { POST as rokuToggleWatchlist } from './api/roku-toggle-watchlist.js';
import { POST as updatePlaybackProgress } from './api/update-playback-progress.js';
import { POST as trackSubscription } from './api/track-subscription.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const port = 3000;

  // Security headers
  app.use(helmet({
    contentSecurityPolicy: false, // Disable CSP for now to avoid breaking Vite/External assets
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: false
  }));

  app.use(cors());
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
  app.get('/api/get-watch-party-status', wrapHandler(getWatchPartyStatus));
  app.post('/api/get-sales-data', wrapHandler(getSalesData));
  app.post('/api/get-growth-analytics', wrapHandler(getGrowthAnalytics));
  app.post('/api/track-view', wrapHandler(trackView));
  app.post('/api/get-recommendations', wrapHandler(getRecommendations));
  app.post('/api/create-poll', wrapHandler(createPoll));
  app.post('/api/vote-poll', wrapHandler(votePoll));
  app.post('/api/end-poll', wrapHandler(endPoll));
  app.post('/api/claim-ticket-stub', wrapHandler(claimTicketStub));
  app.get('/api/generate-highlights', wrapHandler(generateHighlights));
  app.post('/api/toggle-qa', wrapHandler(toggleQA));
  app.post('/api/send-chat-message', wrapHandler(sendChatMessage));
  app.post('/api/clear-chat', wrapHandler(clearChat));
  app.post('/api/toggle-like', wrapHandler(toggleLike));
  app.post('/api/roku-toggle-watchlist', wrapHandler(rokuToggleWatchlist));
  app.post('/api/update-playback-progress', wrapHandler(updatePlaybackProgress));
  app.post('/api/track-subscription', wrapHandler(trackSubscription));

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
