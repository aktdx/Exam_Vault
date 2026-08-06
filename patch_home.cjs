const fs = require('fs');
let code = fs.readFileSync('src/pages/Home.tsx', 'utf8');

const target2 = `        </div>                      </div>`;

const replacement2 = `        </div>
        
        <div className="relative z-10 text-center w-full md:w-auto">
          <div className="bg-white/10 backdrop-blur-md px-8 py-6 rounded-2xl border border-white/20">
            <div className="text-4xl font-black text-white">{stats.totalPapers > 0 ? stats.totalPapers : '...'}</div>
            <div className="text-indigo-100 text-sm font-bold uppercase tracking-widest mt-1">PDF Papers</div>
          </div>
        </div>
      </div>`;

code = code.replace(/<\/div>\s*<\/div>\s*<div className="flex items-center justify-center mt-4">/, `</div>
        <div className="relative z-10 text-center w-full md:w-auto">
          <div className="bg-white/10 backdrop-blur-md px-8 py-6 rounded-2xl border border-white/20">
            <div className="text-4xl font-black text-white">{stats.totalPapers > 0 ? stats.totalPapers : '...'}</div>
            <div className="text-indigo-100 text-sm font-bold uppercase tracking-widest mt-1">PDF Papers</div>
          </div>
        </div>
      </div>
      <div className="flex items-center justify-center mt-4">`);

fs.writeFileSync('src/pages/Home.tsx', code);
