import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, BookOpen, Clock, FileText } from 'lucide-react';

function formatBytes(bytes: number, decimals = 1) {
  if (!+bytes) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

export function Home() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [stats, setStats] = useState({ totalPapers: 0 });
  const navigate = useNavigate();

  useEffect(() => {
    fetch('/api/v1/stats')
      .then(res => res.json())
      .then(data => setStats(data))
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(`/api/v1/search?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        setResults(data);
      } catch (err) {
        console.error(err);
      } finally {
        setIsSearching(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  return (
    <div className="flex flex-col gap-8 w-full max-w-7xl mx-auto">
      <div className="bg-indigo-600 rounded-3xl p-6 md:p-10 flex flex-col md:flex-row items-center justify-between shadow-2xl shadow-indigo-200 relative">
        <div className="absolute inset-0 overflow-hidden rounded-3xl pointer-events-none">
          <div className="absolute -right-20 -bottom-20 w-80 h-80 bg-indigo-500 rounded-full blur-3xl opacity-50"></div>
          <div className="absolute -left-10 -top-10 w-40 h-40 bg-indigo-700 rounded-full blur-2xl opacity-50"></div>
        </div>
        <div className="relative z-50 w-full md:w-2/3 mb-8 md:mb-0">
          <h1 className="text-4xl md:text-5xl font-black text-white leading-tight mb-4 tracking-tight">
            Find MMIT question papers <br className="hidden md:block" />
            <span className="text-indigo-200">in just 3 clicks.</span>
          </h1>
          <p className="text-indigo-100 mb-6 text-lg max-w-lg">
            Stop wasting time searching through WhatsApp groups. Browse by branch, semester, and subject to find the previous year papers you need instantly.
          </p>
          <div className="relative max-w-md text-left">
            <Search className="w-6 h-6 text-indigo-400 absolute left-4 top-4" />
            <input
              type="text"
              placeholder="Search by subject name or code (e.g. DSA, CN-401)"
              className="w-full py-4 pl-12 pr-4 bg-white rounded-2xl shadow-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-indigo-400/50"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            
            {(query.length >= 2 || isSearching) && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-lg border border-gray-100 p-2 z-20 max-h-60 overflow-y-auto">
                {isSearching ? (
                  <div className="p-4 text-center text-gray-500 text-sm">Searching...</div>
                ) : results.length > 0 ? (
                  results.map(paper => (
                    <Link to={`/papers/${paper.id}`} key={paper.id} className="p-3 hover:bg-gray-50 rounded-lg border-b border-gray-50 last:border-0 flex justify-between items-center group cursor-pointer block">
                      <div>
                        <div className="font-bold text-gray-900 flex items-center gap-2 mb-1">
                          <FileText className="w-4 h-4 text-blue-500" />
                          {paper.subject?.name} ({paper.subject?.code})
                        </div>
                        <div className="text-sm font-medium text-gray-600 flex flex-wrap items-center gap-2">
                          <span className="bg-slate-100 px-2 py-0.5 rounded text-xs">{paper.examType?.name}</span>
                          <span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded text-xs flex items-center gap-1"><Clock className="w-3 h-3" /> {paper.session} {paper.year}</span>
                          <span className="text-gray-400 text-xs">{paper.branch?.code} • {paper.semester?.name}</span>
                          {paper.fileSize && <span className="text-gray-400 text-xs bg-gray-50 border border-gray-100 px-2 py-0.5 rounded">{formatBytes(paper.fileSize)}</span>}
                        </div>
                      </div>
                      <span className="text-blue-600 text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity bg-blue-50 px-3 py-1 rounded-md">
                        View Details
                      </span>
                    </Link>
                  ))
                ) : (
                  <div className="p-4 text-center text-gray-500 text-sm">No papers found for "{query}"</div>
                )}
              </div>
            )}
          </div>
        </div>
        
        <div className="relative z-10 text-center w-full md:w-auto">
          <div className="bg-white/10 backdrop-blur-md px-8 py-6 rounded-2xl border border-white/20">
            <div className="text-4xl font-black text-white">{stats.totalPapers > 0 ? stats.totalPapers : '...'}</div>
            <div className="text-indigo-100 text-sm font-bold uppercase tracking-widest mt-1">PDF Papers</div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center mt-4">
        <Link to="/branches" className="px-8 py-4 inline-flex items-center justify-center rounded-2xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 hover:shadow-lg transition-all">
          Browse All Engineering Branches
        </Link>
      </div>
    </div>
  );
}
