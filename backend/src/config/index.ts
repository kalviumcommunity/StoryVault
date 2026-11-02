import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { z } from 'zod';
import type { SignOptions } from 'jsonwebtoken';

// Prefer backend settings, while allowing the project-root .env to supply the shared Gemini key.
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
if (!process.env.GEMINI_API_KEY) {
  const projectEnvPath = path.resolve(__dirname, '../../../.env');
  if (fs.existsSync(projectEnvPath)) {
    const projectEnv = dotenv.parse(fs.readFileSync(projectEnvPath));
    if (projectEnv.GEMINI_API_KEY) process.env.GEMINI_API_KEY = projectEnv.GEMINI_API_KEY;
  }
}

const envSchema = z.object({
  PORT: z.string().default('5000').transform((val) => parseInt(val, 10)),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  JWT_SECRET: z.string().min(8, 'JWT_SECRET must be at least 8 characters long'),
  JWT_EXPIRES_IN: z
    .string()
    .default('7d')
    .transform((value) => value as SignOptions['expiresIn']),
  GEMINI_API_KEY: z.string().min(1, 'GEMINI_API_KEY is required'),
  GEMINI_MODEL: z.string().default('gemini-3.8-flash'),
  GEMINI_EMBEDDING_MODEL: z.string().default('gemini-embedding-2'),
  GEMINI_EMBEDDING_DIMENSIONS: z.string().default('768').transform((val) => parseInt(val, 10)),
  CHUNK_SIZE: z.string().default('1000').transform((val) => parseInt(val, 10)),
  CHUNK_OVERLAP: z.string().default('200').transform((val) => parseInt(val, 10)),
  UPLOAD_DIR: z.string().default('./uploads'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment variables:', parsed.error.format());
  throw new Error('Environment configuration validation failed.');
}

export const config = parsed.data;
