import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { BookMarked, ArrowLeft, ChevronRight } from 'lucide-react';

export function Subjects() {
  const { branchId, semesterId } = useParams();
  const [subjects, setSubjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/v1/branches/${branchId}/semesters/${semesterId}/subjects`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setSubjects(data);
        } else {
          setSubjects([]);
        }
        setLoading(false);
      })
      .catch(() => {
        setSubjects([]);
        setLoading(false);
      });
  }, [semesterId]);

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto w-full">
      <div className="mb-4">
        <button onClick={() => window.history.back()} className="inline-flex items-center text-sm font-bold text-indigo-600 hover:underline mb-2 transition-colors">
          <ArrowLeft className="w-4 h-4 mr-1" /> Back
        </button>
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <span className="w-2.5 h-10 bg-indigo-600 rounded-full"></span> 
            Select Subject
          </h2>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center p-12"><div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full"></div></div>
      ) : subjects.length === 0 ? (
        <div className="text-center p-12 bg-white rounded-3xl border border-dashed border-slate-300 text-slate-500">
          No subjects found for this semester.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {subjects.map(subject => (
            <Link 
              key={subject.id} 
              to={`/subjects/${subject.id}/papers`}
              className="bg-white p-6 rounded-3xl border-2 border-transparent hover:border-indigo-600 hover:shadow-xl transition-all group cursor-pointer shadow-sm flex items-center justify-between"
            >
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <BookMarked className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-800">{subject.name}</h3>
                  <p className="text-sm text-slate-500 font-semibold mt-1">{subject.code}</p>
                </div>
              </div>
              <ChevronRight className="w-6 h-6 text-slate-300 group-hover:text-indigo-600 transition-colors" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
