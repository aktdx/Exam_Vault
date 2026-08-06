const fs = require('fs');
let code = fs.readFileSync('src/db/schema.ts', 'utf8');

const yearCheckTarget = "check('question_paper_year_check', sql`year >= 2000 AND year <= ${new Date().getFullYear()}`)";
const yearCheckReplacement = "check('question_paper_year_check', sql.raw(`year >= 2000 AND year <= ${new Date().getFullYear()}`))";

code = code.replace(yearCheckTarget, yearCheckReplacement);
fs.writeFileSync('src/db/schema.ts', code);
