import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { auth } from '../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';

export function PaperDetail() {
  const { id } = useParams();
  const [paper, setPaper] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [pdfCacheBuster, setPdfCacheBuster] = useState(Date.now());
  const [adminToken, setAdminToken] = useState<string | null>(null);
  
  const [isEditingPaper, setIsEditingPaper] = useState(false);
  const [editFormData, setEditFormData] = useState({
    year: '',
    session: '',
    notes: ''
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (u) {
        setIsAdmin(true);
        const t = await u.getIdToken();
        setAdminToken(t);
      } else {
        setIsAdmin(false);
        setAdminToken(null);
      }
    });
    return unsub;
  }, []);

  useEffect(() => {
    fetch(`/api/v1/question-papers/${id}`)
      .then(res => {
        if (!res.ok) throw new Error('Paper not found');
        return res.json();
      })
      .then(data => {
        setPaper(data);
        setEditFormData({
          year: data.year?.toString() || '',
          session: data.session || '',
          notes: data.notes || ''
        });
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, [id]);

  const handleSavePaperDetails = async () => {
    if (!adminToken) return;
    setIsSaving(true);
    try {
      const res = await fetch(`/api/v1/admin/question-papers/${id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          year: parseInt(editFormData.year),
          session: editFormData.session,
          notes: editFormData.notes
        })
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to update details');
      }

      const updatedData = await res.json();
      setPaper((prev: any) => ({
        ...prev,
        year: updatedData.year,
        session: updatedData.session,
        notes: updatedData.notes
      }));
      setIsEditingPaper(false);
      alert('Paper details updated successfully!');
    } catch (err: any) {
      alert(`Error updating details: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      alert('Only PDF files are allowed');
      return;
    }

    if (!adminToken) {
      alert('You must be logged in as admin to do this.');
      return;
    }

    setIsUploading(true);
    
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch(`/api/v1/admin/question-papers/${id}/file`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${adminToken}`
        },
        body: formData
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to update document');
      }

      const updatedData = await res.json();
      
      setPaper((prev: any) => ({
        ...prev,
        fileUrl: updatedData.fileUrl,
        fileSize: updatedData.fileSize
      }));
      setPdfCacheBuster(Date.now());

      alert('Document updated successfully!');
    } catch (err: any) {
      alert(`Error updating document: ${err.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 opacity-50 animate-pulse">
        <div className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
        <div className="mt-6 font-bold text-slate-400 uppercase tracking-widest text-sm">Loading Paper Details</div>
      </div>
    );
  }

  if (error || !paper) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <div className="text-red-500 mb-4">
          <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
          </svg>
        </div>
        <h2 className="text-2xl font-black text-slate-800 mb-2">Paper Not Found</h2>
        <p className="text-slate-500 mb-6">{error || 'The requested paper could not be found or has been removed.'}</p>
        <Link to="/" className="px-6 py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-colors">Return Home</Link>
      </div>
    );
  }

  // Format the file size
  const formatSize = (bytes: number) => {
    if (!bytes) return 'Unknown Size';
    const mb = bytes / (1024 * 1024);
    if (mb >= 1) return mb.toFixed(1) + ' MB';
    return Math.round(bytes / 1024) + ' KB';
  };

  const getS3Url = (fileUrl: string) => {
     // Check if it's already a full URL
    if (fileUrl.startsWith('http')) return fileUrl;
    
    // Otherwise construct the S3 URL
    return `https://s3.ap-south-1.amazonaws.com/examvault.in/${fileUrl}`;
  }

  const pdfUrl = getS3Url(paper.fileUrl);

  return (
    <div className="flex flex-col gap-8 w-full max-w-5xl mx-auto">
      {/* Breadcrumb Navigation */}
      <div className="flex flex-wrap items-center gap-2 text-sm font-medium text-slate-500">
        <Link to="/branches" className="hover:text-indigo-600 transition-colors">Branches</Link>
        <svg className="w-4 h-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
        <Link to={`/branches/${paper.branch?.id}/semesters`} className="hover:text-indigo-600 transition-colors truncate max-w-[150px]">{paper.branch?.name}</Link>
        <svg className="w-4 h-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
        <Link to={`/branches/${paper.branch?.id}/semesters/${paper.semester?.id}/subjects`} className="hover:text-indigo-600 transition-colors truncate max-w-[150px]">{paper.semester?.name}</Link>
        <svg className="w-4 h-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
        <Link to={`/subjects/${paper.subject?.id}/papers`} className="hover:text-indigo-600 transition-colors truncate max-w-[150px]">{paper.subject?.name}</Link>
      </div>

      <div className="bg-white rounded-3xl p-6 sm:p-10 shadow-sm border border-slate-200">
        <div className="flex flex-col gap-10">
          
          {/* Left Column: Metadata */}
          <div className="flex-1 flex flex-col gap-6">
            {isEditingPaper ? (
              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 flex flex-col gap-4">
                <h3 className="font-bold text-slate-800 text-lg mb-2">Edit Paper Details</h3>
                
                <div>
                  <label className="block text-sm font-bold text-slate-600 mb-1">Year</label>
                  <input 
                    type="number"
                    value={editFormData.year}
                    onChange={(e) => setEditFormData({...editFormData, year: e.target.value})}
                    className="w-full px-4 py-2 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-bold text-slate-600 mb-1">Session</label>
                  <select
                    value={editFormData.session}
                    onChange={(e) => setEditFormData({...editFormData, session: e.target.value})}
                    className="w-full px-4 py-2 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                  >
                    <option value="">Select Session</option>
                    <option value="Winter">Winter</option>
                    <option value="Summer">Summer</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-bold text-slate-600 mb-1">Notes</label>
                  <textarea
                    value={editFormData.notes}
                    onChange={(e) => setEditFormData({...editFormData, notes: e.target.value})}
                    className="w-full px-4 py-2 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none h-24"
                    placeholder="Optional notes..."
                  ></textarea>
                </div>

                <div className="flex gap-3 mt-2">
                  <button
                    onClick={() => setIsEditingPaper(false)}
                    className="flex-1 px-4 py-2 bg-white border border-slate-300 rounded-xl font-bold text-slate-600 hover:bg-slate-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSavePaperDetails}
                    disabled={isSaving}
                    className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                  >
                    {isSaving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex justify-between items-start gap-4">
                  <div>
                    <div className="inline-flex items-center justify-center px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-bold uppercase tracking-widest mb-4">
                      {paper.examType?.name} Examination
                    </div>
                    <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight leading-tight">
                      {paper.subject?.name}
                    </h1>
                    <div className="mt-3 text-lg font-bold text-slate-500">
                      {paper.session} {paper.year}
                    </div>
                  </div>
                  {isAdmin && (
                    <button
                      onClick={() => setIsEditingPaper(true)}
                      className="shrink-0 p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                      title="Edit Paper Details"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path>
                      </svg>
                    </button>
                  )}
                </div>

                <div className="h-px bg-slate-100 my-2"></div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Subject Code</div>
                    <div className="font-mono text-slate-800 font-bold">{paper.subject?.code}</div>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Semester</div>
                    <div className="font-bold text-slate-800">{paper.semester?.name}</div>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Branch</div>
                    <div className="font-bold text-slate-800">{paper.branch?.name} ({paper.branch?.code})</div>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">File Size</div>
                    <div className="font-bold text-slate-800">{formatSize(paper.fileSize)}</div>
                  </div>
                </div>

                {paper.notes && (
                  <div className="bg-amber-50 p-5 rounded-2xl border border-amber-100 mt-2">
                    <div className="flex items-start gap-3">
                      <svg className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                      </svg>
                      <div>
                        <div className="text-sm font-bold text-amber-800 mb-1">Notes</div>
                        <div className="text-sm text-amber-700 leading-relaxed">{paper.notes}</div>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}

            <div className="mt-auto pt-6 flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <a 
                  href={`/api/v1/question-papers/${paper.id}/download`} 
                  className="flex-1 flex items-center justify-center gap-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 px-6 rounded-2xl transition-all shadow-lg shadow-indigo-200"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
                  </svg>
                  Download PDF
                </a>
                <a 
                  href={pdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-4 px-6 rounded-2xl transition-all"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path>
                  </svg>
                  Open in New Tab
                </a>
              </div>
              
              {isAdmin && (
                <div className="relative mt-2">
                  <input
                    type="file"
                    accept="application/pdf"
                    onChange={handleFileUpload}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    disabled={isUploading}
                    title="Upload Replacement PDF"
                  />
                  <button
                    disabled={isUploading}
                    className="w-full flex items-center justify-center gap-2 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 text-indigo-700 font-bold py-3 px-6 rounded-2xl transition-all shadow-sm"
                  >
                    {isUploading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-indigo-300 border-t-indigo-700 rounded-full animate-spin"></div>
                        Uploading new PDF...
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path>
                        </svg>
                        Upload Replacement PDF
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
}
