import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/auth';
import { aiProvider } from '../services/aiProvider';

const router = Router();

const completionSchema = z
  .object({
    messages: z
      .array(
        z.object({
          role: z.enum(['system', 'user', 'assistant']),
          content: z.string().min(1).max(4000),
        })
      )
      .min(1)
      .max(20),
  })
  .superRefine(({ messages }, context) => {
    if (!messages.some((message) => message.role !== 'system')) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'At least one user or assistant message is required.',
      });
    }
    if (messages.reduce((total, message) => total + message.content.length, 0) > 24000) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Combined message content must not exceed 24,000 characters.',
      });
    }
  });

router.post(
  '/completion',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { messages } = completionSchema.parse(req.body);
      res.json(await aiProvider.generateCompletion(messages));
    } catch (error) {
      next(error);
    }
  }
);

export default router;
