import rateLimit from 'express-rate-limit';
import helmet from 'helmet';

export const securityHeaders = helmet({
  contentSecurityPolicy: false, // let Vite handle CSP in dev, or configure properly for prod
  crossOriginEmbedderPolicy: false
});

export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again after 15 minutes',
  validate: {
    xForwardedForHeader: false
  }
});
