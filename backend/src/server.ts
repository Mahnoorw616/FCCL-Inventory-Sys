import cors from 'cors';
import dotenv from 'dotenv';
import express, { type NextFunction, type Request, type Response } from 'express';
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

// Initialize persistent JSON store
initStore();

// Setup CORS - allow Vercel domain, localhost, and all origins
app.use(
  cors({
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      // Allow all incoming origins dynamically so Vercel preview/production and localhost work
      callback(null, true);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  }),
);

// Body parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logger for Render
app.use((req: Request, _res: Response, next: NextFunction) => {
  const start = Date.now();
  const { method, url } = req;
  _res.on('finish', () => {
    const ms = Date.now() - start;
    if (url !== '/api/health' && url !== '/health') {
      console.log(`[${new Date().toISOString()}] ${method} ${url} ${_res.statusCode} - ${ms}ms`);
    }
  });
  next();
});

// Health check endpoints (for Render health check & frontend ping)
app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

// Create shared router mounted on both /api and root /
const apiRouter = express.Router();
apiRouter.use('/inventory', inventoryRouter);
apiRouter.use('/devices', devicesRouter);
apiRouter.use('/work-orders', workOrdersRouter);
apiRouter.use('/stock', stockRouter);
apiRouter.use('/suppliers', suppliersRouter);
apiRouter.use('/racks', racksRouter);
apiRouter.use('/logs', logsRouter);

// Support BOTH /api/* and /* so requests work regardless of whether client sends /api prefix
app.use('/api', apiRouter);
app.use('/', apiRouter);

// 404 Handler
app.use((req: Request, res: Response) => {
  res.status(404).json({ success: false, message: `API route not found: ${req.method} ${req.originalUrl}` });
});

// Global Error Handler
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
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
