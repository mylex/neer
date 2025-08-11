import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { propertyRoutes } from './routes';
import schedulerRoutes from './routes/scheduler';
import monitoringRoutes from './routes/monitoring';
import { errorHandler, notFoundHandler } from './middleware';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env['PORT'] || 3001;

// Security middleware
app.use(helmet());

// CORS configuration
app.use(cors({
  origin: process.env['FRONTEND_URL'] || 'http://localhost:3000',
  credentials: true
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint
app.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// API routes
app.use('/api', propertyRoutes);
app.use('/api/scheduler', schedulerRoutes);
app.use('/api/monitoring', monitoringRoutes);

// Error handling middleware
app.use(notFoundHandler);
app.use(errorHandler);

// Start server
if (process.env['NODE_ENV'] !== 'test') {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Environment: ${process.env['NODE_ENV'] || 'development'}`);
  });
}

export default app;