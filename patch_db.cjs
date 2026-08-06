const fs = require('fs');
let code = fs.readFileSync('src/db/index.ts', 'utf8');
code = code.replace('const pool = createPool();', 'export const pool = createPool();');
fs.writeFileSync('src/db/index.ts', code);
