import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { FileText, ArrowLeft, Download, Eye } from 'lucide-react';

function formatBytes(bytes: number, decimals = 1) {
  if (!+bytes) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

export function Papers() {
  const { subjectId } = useParams();
  const [papers, setPapers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/v1/subjects/${subjectId}/question-papers`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setPapers(data);
        } else {
          setPapers([]);
        }
        setLoading(false);
      })
      .catch(() => {
        setPapers([]);
        setLoading(false);
      });
  }, [subjectId]);

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto w-full">
      <div className="mb-4">
        <button onClick={() => window.history.back()} className="inline-flex items-center text-sm font-bold text-indigo-600 hover:underline mb-2 transition-colors">
          <ArrowLeft className="w-4 h-4 mr-1" /> Back to Subjects
        </button>
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <span className="w-2.5 h-10 bg-indigo-600 rounded-full"></span> 
            Question Papers
          </h2>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center p-12"><div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full"></div></div>
      ) : papers.length === 0 ? (
        <div className="text-center p-12 bg-white rounded-3xl border border-dashed border-slate-300 text-slate-500">
          No papers uploaded yet for this subject.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {papers.map(paper => (
            <div 
              key={paper.id} 
              className="bg-white p-6 rounded-3xl border-2 border-transparent hover:border-indigo-600 hover:shadow-xl transition-all flex flex-col justify-between shadow-sm group"
            >
              <div>
                <div className="flex items-start justify-between mb-4">
                  <div className="w-14 h-14 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                    <FileText className="w-8 h-8" />
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className="px-3 py-1 bg-slate-100 text-slate-700 text-[10px] font-black rounded-full uppercase tracking-widest">
                      {paper.examType?.name}
                    </span>
                    <span className="px-3 py-1 bg-indigo-50 text-indigo-700 text-[10px] font-black rounded-full uppercase tracking-widest">
                      {paper.session} {paper.year}
                    </span>
                    {paper.fileSize && (
                      <span className="px-3 py-1 bg-gray-50 border border-gray-100 text-gray-500 text-[10px] font-black rounded-full uppercase tracking-widest">
                        {formatBytes(paper.fileSize)}
                      </span>
                    )}
                  </div>
                </div>
                <h3 className="text-xl font-black text-slate-800 mb-1">
                  {paper.subject?.name} ({paper.subject?.code})
                </h3>
                <div className="text-sm font-semibold text-slate-500 mb-2">
                  {paper.branch?.name} • {paper.semester?.name}
                </div>
                {paper.notes && <p className="text-sm text-slate-500 font-semibold mb-3 line-clamp-2">{paper.notes}</p>}
              </div>
              <div className="mt-6 pt-4 border-t border-slate-100 flex gap-3">
                <Link 
                  to={`/papers/${paper.id}`}
                  className="flex-1 flex items-center justify-center gap-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 py-3 px-4 rounded-xl font-bold transition-colors"
                >
                  <Eye className="w-5 h-5" /> View Details
                </Link>
                <a 
                  href={`/api/v1/question-papers/${paper.id}/download`}
                  target="_blank"
                  className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white py-3 px-4 rounded-xl font-bold transition-colors shadow-lg shadow-indigo-200"
                >
                  <Download className="w-5 h-5" /> Download
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
