import express from 'express';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
import { errorHandler } from './middleware/errorHandler';

// Route imports
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import documentRoutes from './routes/document.routes';
import searchRoutes from './routes/search.routes';
import researchRoutes from './routes/research.routes';
import briefRoutes from './routes/brief.routes';
import collectionRoutes from './routes/collection.routes';
import timelineRoutes from './routes/timeline.routes';
import ingestionRoutes from './routes/ingestion.routes';
import adminRoutes from './routes/admin.routes';
import healthRoutes from './routes/health.routes';
import aiRoutes from './routes/ai.routes';

const app = express();

// Middlewares
app.use(
  cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// OpenAPI / Swagger Documentation
const swaggerSpec = {
  openapi: '3.0.0',
  info: {
    title: 'StoryVault API',
    version: '1.0.0',
    description:
      'AI-Powered Media Archive Search & Context Retrieval Platform REST API. Provides evidence-grounded search, citation verification, research briefs, and media archiving.',
  },
  servers: [{ url: '/api', description: 'StoryVault API Base' }],
  components: {
    securitySchemes: {
      BearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
  },
  paths: {
    '/health': {
      get: { summary: 'API health and database connectivity check', responses: { '200': { description: 'OK' } } },
    },
    '/auth/register': {
      post: { summary: 'Register a new user account', responses: { '201': { description: 'Created' } } },
    },
    '/auth/login': {
      post: { summary: 'Authenticate user and obtain JWT token', responses: { '200': { description: 'Success' } } },
    },
    '/search': {
      post: { summary: 'Universal archive search with hybrid/keyword/semantic ranking', responses: { '200': { description: 'Success' } } },
    },
    '/research/ask': {
      post: { summary: 'Ask grounded research assistant with verified citations', responses: { '200': { description: 'Success' } } },
    },
    '/ai/completion': {
      post: {
        summary: 'Generate a Gemini completion for authenticated workspace clients',
        security: [{ BearerAuth: [] }],
        responses: { '200': { description: 'Success' } },
      },
    },
    '/documents': {
      get: { summary: 'List and filter archive documents', responses: { '200': { description: 'Success' } } },
    },
    '/briefs/generate': {
      post: { summary: 'Generate structured 8-section research brief with source citations', responses: { '200': { description: 'Success' } } },
    },
    '/timeline': {
      get: { summary: 'Get chronological historical events from archive', responses: { '200': { description: 'Success' } } },
    },
  },
};

app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.get('/api/docs-json', (req, res) => res.json(swaggerSpec));

// Mount REST API endpoints
app.use('/api/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/users', userRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/research', researchRoutes);
app.use('/api/briefs', briefRoutes);
app.use('/api/collections', collectionRoutes);
app.use('/api/timeline', timelineRoutes);
app.use('/api/ingestion', ingestionRoutes);
app.use('/api/admin', adminRoutes);

// Error handling middleware
app.use(errorHandler);

export default app;
