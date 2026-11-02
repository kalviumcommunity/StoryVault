import app from './app';
import { config } from './config';
import { logger } from './lib/logger';
import { prisma } from './lib/prisma';

const connectWithRetry = async (retries = 5, delayMs = 1500): Promise<void> => {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await prisma.$connect();
      logger.info('Connected to PostgreSQL database successfully.');
      return;
    } catch (err: any) {
      if (attempt === retries) {
        throw err;
      }
      logger.warn(
        `Database connection attempt ${attempt}/${retries} failed (${err.message}). Retrying in ${delayMs / 1000}s...`
      );
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
};

const startServer = async () => {
  try {
    // Connect to database with retry tolerance
    await connectWithRetry();

    const host = '0.0.0.0';
    app.listen(config.PORT, host, () => {
      logger.info(`StoryVault API Server running on port ${config.PORT} (${host})`);
      logger.info(`Accessible locally at http://127.0.0.1:${config.PORT} or http://localhost:${config.PORT}`);
      logger.info(`Interactive API Docs available at http://127.0.0.1:${config.PORT}/api/docs`);
      logger.info(`AI provider: Google Gemini (${config.GEMINI_MODEL})`);
    });
  } catch (error: any) {
    logger.error('Failed to start server:', error.message);
    process.exit(1);
  }
};

startServer();
