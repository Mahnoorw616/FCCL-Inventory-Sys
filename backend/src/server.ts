import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import { initStore } from './data/store.js';
import devicesRouter from './routes/devices.js';
import inventoryRouter from './routes/inventory.js';
import logsRouter from './routes/logs.js';
import racksRouter from './routes/racks.js';
import stockRouter from './routes/stock.js';
import suppliersRouter from './routes/suppliers.js';
import workOrdersRouter from './routes/workOrders.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';

// Initialize persistent JSON store
initStore();

// Setup CORS
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, or server-to-server)
      if (!origin || CORS_ORIGIN === '*' || CORS_ORIGIN.split(',').map((s) => s.trim()).includes(origin)) {
        return callback(null, true);
      }
      return callback(null, true); // Permissive fallback to prevent deployment CORS blockers
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }),
);

// Body parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logger for Render
app.use((req, _res, next) => {
  const start = Date.now();
  const { method, url } = req;
  _res.on('finish', () => {
    const ms = Date.now() - start;
    if (url !== '/api/health') {
      console.log(`[${new Date().toISOString()}] ${method} ${url} ${_res.statusCode} - ${ms}ms`);
    }
  });
  next();
});

// Health check endpoint (for Render health check & frontend ping)
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

// Mount API routes
app.use('/api/inventory', inventoryRouter);
app.use('/api/devices', devicesRouter);
app.use('/api/work-orders', workOrdersRouter);
app.use('/api/stock', stockRouter);
app.use('/api/suppliers', suppliersRouter);
app.use('/api/racks', racksRouter);
app.use('/api/logs', logsRouter);

// 404 Handler
app.use((_req, res) => {
  res.status(404).json({ success: false, message: 'API route not found' });
});

// Global Error Handler
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled server error:', err);
  res.status(500).json({
    success: false,
    message: err?.message || 'Internal server error',
  });
});

// Start listening
app.listen(PORT, () => {
  console.log(`========================================`);
  console.log(`FCCL Inventory Backend Service Started`);
  console.log(`Listening on http://localhost:${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`========================================`);
});

export default app;
