const fs = require('fs');
let code = fs.readFileSync('src/server/middlewares/security.ts', 'utf8');

const target = `export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again after 15 minutes'
});`;

const replacement = `export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again after 15 minutes',
  validate: {
    xForwardedForHeader: false
  }
});`;

code = code.replace(target, replacement);
fs.writeFileSync('src/server/middlewares/security.ts', code);
