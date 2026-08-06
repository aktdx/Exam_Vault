const fs = require('fs');
let code = fs.readFileSync('src/server/middlewares/errorHandler.ts', 'utf8');

const target = `  if (err.code === '23505') {
    status = 409;
    message = 'Question paper already exists.';
    errorCode = 'DUPLICATE_PAPER';
  }`;

const replacement = `  if (err.code === '23505') {
    status = 409;
    message = 'A record with this information already exists.';
    errorCode = 'DUPLICATE_RECORD';
    
    if (err.constraint === 'question_paper_unique') {
      message = 'Question paper already exists.';
      errorCode = 'DUPLICATE_PAPER';
    }
  }`;

code = code.replace(target, replacement);
fs.writeFileSync('src/server/middlewares/errorHandler.ts', code);
