import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import dotenv from 'dotenv';

// Import routes
import authRoutes from './routes/auth';
import sectionsRoutes from './routes/sections';
import doctorsRoutes from './routes/doctors';
import schedulesRoutes from './routes/schedules';
import settingsRoutes from './routes/settings';
import usersRoutes from './routes/users';
import specialtiesRoutes from './routes/specialties';
import reportsRoutes from './routes/reports';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3002;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:5174', 
    'http://localhost:5175',
    'http://localhost:5176',
    'http://localhost:5177'
  ],
  credentials: true
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Compression middleware
app.use(compression());

// Logging middleware
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'TUASUSALUD Medical API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    version: '2.0.0'
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/sections', sectionsRoutes);
app.use('/api/doctors', doctorsRoutes);
app.use('/api/schedules', schedulesRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/specialties', specialtiesRoutes);
app.use('/api/reports', reportsRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'TUASUSALUD Medical Schedule Management API',
    version: '2.0.0',
    endpoints: {
      auth: '/api/auth',
      sections: '/api/sections',
      doctors: '/api/doctors',
      schedules: '/api/schedules',
      settings: '/api/settings',
      health: '/health'
    }
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    path: req.originalUrl
  });
});

// Global error handler
app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Global error handler:', error);
  
  res.status(error.status || 500).json({
    success: false,
    error: error.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
  });
});

// Start server
app.listen(PORT, () => {
  console.log('🏥 ===============================================');
  console.log('🏥 TUASUSALUD Medical Schedule Management API');
  console.log('🏥 ===============================================');
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🌐 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:5173'}`);
  console.log(`💡 Health check: http://localhost:${PORT}/health`);
  console.log(`📋 API Documentation: http://localhost:${PORT}/`);
  console.log('🏥 ===============================================');
});

export default app;
