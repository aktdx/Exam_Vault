import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Layers, ChevronRight, ArrowLeft } from 'lucide-react';

export function Semesters() {
  const { branchId } = useParams();
  const [semesters, setSemesters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/v1/branches/${branchId}/semesters`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setSemesters(data);
        } else {
          setSemesters([]);
        }
        setLoading(false);
      })
      .catch(() => {
        setSemesters([]);
        setLoading(false);
      });
  }, [branchId]);

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto w-full">
      <div className="mb-4">
        <Link to="/branches" className="inline-flex items-center text-sm font-bold text-indigo-600 hover:underline mb-2 transition-colors">
          <ArrowLeft className="w-4 h-4 mr-1" /> Back to Branches
        </Link>
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <span className="w-2.5 h-10 bg-indigo-600 rounded-full"></span> 
            Select Semester
          </h2>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center p-12"><div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full"></div></div>
      ) : semesters.length === 0 ? (
        <div className="text-center p-12 bg-white rounded-3xl border border-dashed border-slate-300 text-slate-500">
          No semesters found.
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
          {semesters.sort((a,b)=>a.number - b.number).map(semester => (
            <Link 
              key={semester.id} 
              to={`/branches/${branchId}/semesters/${semester.id}/subjects`}
              className="bg-white p-6 rounded-3xl border-2 border-transparent hover:border-indigo-600 hover:shadow-xl transition-all group cursor-pointer shadow-sm flex flex-col items-center text-center"
            >
              <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Layers className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-black text-slate-800">{semester.name}</h3>
              <p className="text-sm text-slate-500 font-semibold mt-1">Sem {semester.number}</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
