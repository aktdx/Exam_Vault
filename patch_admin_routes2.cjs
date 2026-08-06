const fs = require('fs');
let code = fs.readFileSync('src/server/routes/adminRoutes.ts', 'utf8');

// replace res.json(result) with res.json({ success: true, message: '...', data: result }) in addPaper and updatePaper
code = code.replace(
  `const result = await AdminService.addPaper(`,
  `const result = await AdminService.addPaper(`
);

code = code.replace(
  /res\.json\(result\);/g,
  `res.json({ success: true, message: 'Operation successful', data: result });`
);

fs.writeFileSync('src/server/routes/adminRoutes.ts', code);
