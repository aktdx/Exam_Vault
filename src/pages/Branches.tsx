import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FolderGit2, ChevronRight } from 'lucide-react';

export function Branches() {
  const [branches, setBranches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/v1/branches')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setBranches(data);
        } else {
          console.error("Failed to load branches:", data);
          setBranches([]);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error("Error fetching branches:", err);
        setBranches([]);
        setLoading(false);
      });
  }, []);

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto w-full">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-2">
        <h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
          <span className="w-2.5 h-10 bg-indigo-600 rounded-full"></span> 
          Browse by Engineering Branch
        </h2>
      </div>

      {loading ? (
        <div className="flex justify-center p-12"><div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full"></div></div>
      ) : branches.length === 0 ? (
        <div className="text-center p-12 bg-white rounded-3xl border border-dashed border-slate-300 text-slate-500">
          No branches available yet. Admin needs to add them.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {branches.map((branch, index) => {
            const colors = [
              { bg: 'bg-blue-100', text: 'text-blue-600', tagBg: 'bg-blue-50', tagText: 'text-blue-700' },
              { bg: 'bg-orange-100', text: 'text-orange-600', tagBg: 'bg-orange-50', tagText: 'text-orange-700' },
              { bg: 'bg-teal-100', text: 'text-teal-600', tagBg: 'bg-teal-50', tagText: 'text-teal-700' },
              { bg: 'bg-purple-100', text: 'text-purple-600', tagBg: 'bg-purple-50', tagText: 'text-purple-700' },
            ];
            const color = colors[index % colors.length];

            return (
              <Link 
                key={branch.id} 
                to={`/branches/${branch.id}/semesters`}
                className="bg-white p-6 rounded-3xl border-2 border-transparent hover:border-indigo-600 hover:shadow-xl transition-all group cursor-pointer shadow-sm flex flex-col items-start"
              >
                <div className={`w-14 h-14 ${color.bg} rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                  <FolderGit2 className={`w-8 h-8 ${color.text}`} />
                </div>
                <h3 className="text-lg font-black text-slate-800 mb-1">{branch.name}</h3>
                <p className="text-sm text-slate-500 font-semibold mb-4">View Semesters</p>
                <span className={`px-3 py-1 ${color.tagBg} ${color.tagText} text-[10px] font-black uppercase tracking-tighter rounded-full mt-auto`}>
                  Branch: {branch.code}
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
