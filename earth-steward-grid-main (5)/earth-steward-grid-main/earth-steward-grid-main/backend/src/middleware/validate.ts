import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

type ValidateTarget = 'body' | 'query' | 'params';

export function validate(schema: ZodSchema, target: ValidateTarget = 'body') {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req[target]);
    if (!result.success) {
      const errors = result.error.errors.map(e => ({
        field: e.path.join('.'),
        message: e.message,
      }));
      return res.status(400).json({ error: 'Validation failed', details: errors });
    }
    req[target] = result.data;
    next();
  };
}

export function errorHandler(err: any, req: Request, res: Response, next: NextFunction) {
  if (err instanceof ZodError) {
    return res.status(400).json({ error: 'Validation error', details: err.errors });
  }
  if (err.name === 'MulterError') {
    return res.status(400).json({ error: err.message });
  }
  if (err.message === 'Invalid file type. Only PDF, JPG, and PNG are allowed.') {
    return res.status(400).json({ error: err.message });
  }
  console.error('Unhandled error:', err);
  return res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
}
