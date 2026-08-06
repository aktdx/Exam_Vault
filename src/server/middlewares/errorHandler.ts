import multer from 'multer';
import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger.ts';
import { ApiError } from '../errors/ApiError.ts';

export const errorHandler = (err: unknown, req: Request, res: Response, next: NextFunction) => {
  let status = 500;
  let message = 'Internal Server Error';
  let errorCode = 'INTERNAL_ERROR';
  let details: unknown = null;

  if (err instanceof Error) {
    logger.error(`${err.message} - ${req.method} ${req.originalUrl} - ${req.ip}`);
    // Do NOT expose generic internal error messages to the client
  } else {
    logger.error(`Unknown error - ${req.method} ${req.originalUrl} - ${req.ip}`);
  }

  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      status = 400;
      message = 'File size exceeds the 20MB limit.';
      errorCode = 'VALIDATION_ERROR';
    } else {
      status = 400;
      message = err.message;
      errorCode = 'UPLOAD_ERROR';
    }
  } else if (err instanceof ApiError) {
    status = err.status;
    message = err.message;
    errorCode = err.errorCode;
    details = err.details || null;
  } else if (
    err !== null &&
    typeof err === 'object' &&
    'code' in err &&
    (err as { code: unknown }).code === '23505'
  ) {
    // Handle PostgreSQL unique constraint violation
    const constraint = 'constraint' in err ? (err as { constraint?: unknown }).constraint : undefined;
    status = 409;
    message = 'A record with this information already exists.';
    errorCode = 'DUPLICATE_RECORD';
    
    if (constraint === 'question_paper_unique') {
      message = 'Question paper already exists.';
      errorCode = 'DUPLICATE_PAPER';
    }
  }

  res.status(status).json({
    success: false,
    message,
    errorCode,
    details
  });
};
