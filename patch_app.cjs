const fs = require('fs');
let code = fs.readFileSync('src/server/app.ts', 'utf8');

const target = `export async function createApp() {
  const app = express();
  
  // Middlewares`;

const replacement = `export async function createApp() {
  const app = express();
  
  app.set("trust proxy", 1);
  // Middlewares`;

code = code.replace(target, replacement);
fs.writeFileSync('src/server/app.ts', code);
