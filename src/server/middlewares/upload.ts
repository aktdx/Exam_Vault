import multer from 'multer';
import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../errors/ApiError.ts';

export const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 20 * 1024 * 1024 // 20MB limit
  }
});

export const validatePdfHeader = (req: Request, res: Response, next: NextFunction) => {
  if (!req.file) {
    return next(new ApiError(400, "VALIDATION_ERROR", "PDF file is required"));
  }
  
  if (req.file.mimetype !== 'application/pdf') {
    return next(new ApiError(400, "VALIDATION_ERROR", "Only PDFs are allowed"));
  }
  
  const buffer = req.file.buffer;
  if (buffer.length < 4) {
    return next(new ApiError(400, "VALIDATION_ERROR", "Invalid file"));
  }
  
  // Check for %PDF signature (25 50 44 46)
  if (buffer[0] !== 0x25 || buffer[1] !== 0x50 || buffer[2] !== 0x44 || buffer[3] !== 0x46) {
    return next(new ApiError(400, "VALIDATION_ERROR", "Invalid PDF signature"));
  }
  
  next();
};
