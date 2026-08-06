import { sql } from 'drizzle-orm';
console.log(sql`year >= 2000 AND year <= EXTRACT(year FROM CURRENT_DATE)`);
