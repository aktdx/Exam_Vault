import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../lib/firebase';
import { signOut, onAuthStateChanged, User } from 'firebase/auth';
import { apiFetch } from '../lib/api';

export function AdminDashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (u) {
        try {
          const t = await u.getIdToken();
          const res = await apiFetch('/api/v1/auth/me', {
            headers: { 'Authorization': `Bearer ${t}` }
          });
          const data = await res.json();
          if (res.ok && data.user?.isAdmin) {
            setUser(u);
            setToken(t);
          } else {
            await signOut(auth);
            navigate('/admin/login');
          }
        } catch (e) {
          console.error("Failed to verify admin status on dashboard:", e);
          // Don't sign out immediately on network errors, just show error state
          navigate('/admin/login');
        }
      } else {
        navigate('/admin/login');
      }
      setLoading(false);
    });
    return unsub;
  }, [navigate]);

  if (loading) return <div className="p-12 text-center">Loading...</div>;
  if (!user) return null;

  return (
    <div className="py-8 max-w-7xl mx-auto w-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 mb-2">Admin Dashboard</h1>
          <p className="text-sm text-slate-500 font-semibold">Logged in as {user.email}</p>
        </div>
        <div className="flex items-center gap-3">
          {user.email?.toLowerCase() === 'aaminkhansohel@gmail.com' && (
            <ManageAdminsButton token={token} />
          )}
          <button 
            onClick={() => signOut(auth)}
            className="text-sm text-red-600 hover:text-white border-2 border-red-100 hover:bg-red-600 px-6 py-2 rounded-xl font-bold transition-all shadow-sm"
          >
            Sign Out
          </button>
        </div>
      </div>

      <AdminMetrics />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start mb-8">
        <UploadPaperForm token={token} />
        <ManageEntitiesForm token={token} />
      </div>

      <div className="grid grid-cols-1 gap-8 items-start">
        <ManageTrashForm token={token} />
      </div>
    </div>
  );
}

function ManageEntitiesForm({ token }: { token: string }) {
  const [entityType, setEntityType] = useState('colleges');
  const [formData, setFormData] = useState<any>({});
  const [submitting, setSubmitting] = useState(false);
  const [colleges, setColleges] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [semesters, setSemesters] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [existingEntities, setExistingEntities] = useState<any[]>([]);

  const fetchExistingEntities = () => {
    apiFetch(`/api/v1/admin/${entityType}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => { if (!res.ok) throw new Error("API Error"); return res.json(); })
      .then(data => {
        if (Array.isArray(data)) setExistingEntities(data);
      })
      .catch(console.error);
  };

  useEffect(() => {
    fetchExistingEntities();
  }, [entityType, token]);

  useEffect(() => {
    apiFetch('/api/v1/colleges')
      .then(res => { if (!res.ok) throw new Error("API Error"); return res.json(); })
      .then(data => { if (Array.isArray(data)) setColleges(data); })
      .catch(console.error);
  }, []);

  useEffect(() => {
    apiFetch('/api/v1/branches')
      .then(res => { if (!res.ok) throw new Error("API Error"); return res.json(); })
      .then(data => {
        if (Array.isArray(data)) setBranches(data);
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (formData.branchId) {
      apiFetch(`/api/v1/branches/${formData.branchId}/semesters`)
        .then(res => { if (!res.ok) throw new Error("API Error"); return res.json(); })
        .then(data => {
          if (Array.isArray(data)) setSemesters(data);
          else setSemesters([]);
        })
        .catch(console.error);
    } else {
      setSemesters([]);
    }
  }, [formData.branchId]);

  const toTitleCase = (str: string) => {
    if (!str) return str;
    return str.split(/([ -])/).map(part => 
      part.match(/[ -]/) ? part : part.charAt(0).toUpperCase() + part.substring(1).toLowerCase()
    ).join('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    
    // Add default collegeId = 1 for branches to simplify MVP
    const payload = { ...formData };
    
    // Apply title case to relevant string fields
    if (typeof payload.name === 'string') payload.name = toTitleCase(payload.name);
    if (typeof payload.code === 'string') payload.code = payload.code.toUpperCase();

    if (entityType === 'branches') {
      if (!payload.collegeId) {
        setError("Please select a college.");
        setSubmitting(false);
        return;
      }
    }

    if (entityType === 'semesters' && !payload.number) {
      setError("Could not automatically determine semester number from the name. Please include a number in the name (e.g. 'Semester 1').");
      setSubmitting(false);
      return;
    }

    try {
      const res = await apiFetch(`/api/v1/admin/${entityType}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        // Try to parse a structured error message from the server
        let message = 'Failed to add entity';
        try {
          const errData = await res.json();
          if (res.status === 409) {
            message = `This ${entityType.replace('-', ' ').replace(/s$/, '')} already exists. Check the list below.`;
          } else {
            message = errData.message || errData.error || message;
          }
        } catch {
          // non-JSON body — use status text
          message = res.statusText || message;
        }
        throw new Error(message);
      }
      setSuccess(`Added successfully!`);
      setFormData({});
      fetchExistingEntities();
      // Refresh colleges/branches lists used in dependent selectors
      if (entityType === 'colleges') {
        apiFetch('/api/v1/colleges')
          .then(res => res.json())
          .then(data => { if (Array.isArray(data)) setColleges(data); })
          .catch(console.error);
      }
      if (entityType === 'branches') {
        apiFetch('/api/v1/branches')
          .then(res => res.json())
          .then(data => { if (Array.isArray(data)) setBranches(data); })
          .catch(console.error);
      }
      setTimeout(() => setSuccess(null), 4000);
    } catch (err: any) {
      setError(err.message || 'Failed to add entity');
      setTimeout(() => setError(null), 6000);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      const res = await apiFetch(`/api/v1/admin/${entityType}/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to delete');
      }
      setSuccess('Entity deleted successfully!');
      setTimeout(() => setSuccess(null), 3000);
      setConfirmDeleteId(null);
      fetchExistingEntities();
    } catch (err: any) {
      setError(`Failed to delete: ${err.message}`);
      setTimeout(() => setError(null), 3000);
    }
  };

  const renderFields = () => {
    switch (entityType) {
      case 'colleges':
        return (
          <>
            <div><label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Name (e.g. MMIT College)</label><input type="text" required className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl p-3 focus:outline-none focus:border-teal-500" value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} /></div>
            <div><label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Code (e.g. MMIT)</label><input type="text" required className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl p-3 focus:outline-none focus:border-teal-500" value={formData.code || ''} onChange={e => setFormData({...formData, code: e.target.value})} /></div>
          </>
        );
      case 'branches':
        return (
          <>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">College</label>
              <select
                required
                className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl p-3 font-bold text-slate-700 outline-none focus:border-teal-500 appearance-none"
                value={formData.collegeId || ''}
                onChange={e => setFormData({...formData, collegeId: Number(e.target.value)})}
              >
                <option value="">Select a College</option>
                {colleges.map(c => <option key={c.id} value={c.id}>{c.name} ({c.code})</option>)}
              </select>
            </div>
            <div><label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Name (e.g. Computer Engineering)</label><input type="text" required className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl p-3 focus:outline-none focus:border-teal-500" value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} /></div>
            <div><label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Code (e.g. COMP)</label><input type="text" required className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl p-3 focus:outline-none focus:border-teal-500" value={formData.code || ''} onChange={e => setFormData({...formData, code: e.target.value})} /></div>
          </>
        );
      case 'academic-years':
        return (
          <>
            <div><label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Name (e.g. First Year)</label><input type="text" required className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl p-3 focus:outline-none focus:border-indigo-500" value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} /></div>
            <div><label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Level (e.g. 1)</label><input type="number" required className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl p-3 focus:outline-none focus:border-indigo-500" value={formData.level || ''} onChange={e => setFormData({...formData, level: Number(e.target.value)})} /></div>
          </>
        );
      case 'semesters':
        return (
          <>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Branch</label>
              <select 
                required 
                className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl p-3 font-bold text-slate-700 outline-none focus:border-indigo-500 appearance-none" 
                value={formData.branchId || ''} 
                onChange={e => setFormData({...formData, branchId: Number(e.target.value)})}
              >
                <option value="">Select a Branch</option>
                {branches.map(b => <option key={b.id} value={b.id}>{b.code} ({b.id})</option>)}
              </select>
            </div>
            <div><label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Academic Year ID (Optional)</label><input type="number" className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl p-3 focus:outline-none focus:border-indigo-500" value={formData.academicYearId || ''} onChange={e => setFormData({...formData, academicYearId: Number(e.target.value)})} /></div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Name (e.g. Semester 1)</label>
              <input 
                type="text" 
                required 
                className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl p-3 focus:outline-none focus:border-indigo-500" 
                value={formData.name || ''} 
                onChange={e => {
                  const newName = e.target.value;
                  const match = newName.match(/\d+/);
                  const parsedNumber = match ? parseInt(match[0], 10) : undefined;
                  const newData = { ...formData, name: newName };
                  if (parsedNumber !== undefined) {
                    newData.number = parsedNumber;
                  } else {
                    delete newData.number;
                  }
                  setFormData(newData);
                }} 
              />
            </div>
          </>
        );
      case 'subjects':
        return (
          <>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Branch</label>
              <select 
                required 
                className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl p-3 font-bold text-slate-700 outline-none focus:border-indigo-500 appearance-none" 
                value={formData.branchId || ''} 
                onChange={e => setFormData({...formData, branchId: Number(e.target.value)})}
              >
                <option value="">Select a Branch</option>
                {branches.map(b => <option key={b.id} value={b.id}>{b.code}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Semester</label>
              <select 
                required 
                className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl p-3 font-bold text-slate-700 outline-none focus:border-indigo-500 appearance-none disabled:opacity-50" 
                value={formData.semesterId || ''} 
                onChange={e => setFormData({...formData, semesterId: Number(e.target.value)})}
                disabled={!formData.branchId || semesters.length === 0}
              >
                <option value="">{formData.branchId ? (semesters.length > 0 ? 'Select a Semester' : 'No semesters found') : 'Select a Branch first'}</option>
                {semesters.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div><label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Name (e.g. Data Structures)</label><input type="text" required className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl p-3 focus:outline-none focus:border-indigo-500" value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} /></div>
            <div><label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Code (e.g. DSA-101)</label><input type="text" required className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl p-3 focus:outline-none focus:border-indigo-500" value={formData.code || ''} onChange={e => setFormData({...formData, code: e.target.value})} /></div>
          </>
        );
      case 'exam-types':
        return (
          <div><label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Name (e.g. In-Semester)</label><input type="text" required className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl p-3 focus:outline-none focus:border-indigo-500" value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} /></div>
        );
    }
  };

  return (
    <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-xl shadow-slate-200/50">
      <h2 className="text-xl font-black text-slate-900 mb-6 flex items-center gap-2">
        <span className="w-2 h-6 bg-teal-500 rounded-full"></span> Manage Entities
      </h2>
      <div className="mb-6">
        <select 
          className="w-full bg-slate-100 border-2 border-slate-200 rounded-xl p-3 font-bold text-slate-700 outline-none focus:border-teal-500 appearance-none"
          value={entityType}
          onChange={(e) => { setEntityType(e.target.value); setFormData({}); setError(null); }}
        >
          <option value="colleges">Colleges</option>
          <option value="branches">Branches</option>
          <option value="academic-years">Academic Years</option>
          <option value="semesters">Semesters</option>
          <option value="subjects">Subjects</option>
          <option value="exam-types">Exam Types</option>
          <option value="question-papers">Question Papers</option>
        </select>
      </div>
      
      {entityType !== 'question-papers' && (
        <form onSubmit={handleSubmit} className="space-y-5 mb-8">
          {renderFields()}
          {error && <div className="text-red-500 font-bold text-sm bg-red-50 p-4 rounded-xl border border-red-100">{error}</div>}
          {success && <div className="text-green-600 font-bold text-sm bg-green-50 p-4 rounded-xl border border-green-100">{success}</div>}
          <button disabled={submitting} className="w-full bg-slate-900 text-white font-bold py-4 px-6 rounded-2xl hover:bg-slate-800 hover:shadow-lg transition-all disabled:opacity-50 mt-4">
            {submitting ? 'Adding...' : 'Add Entity'}
          </button>
        </form>
      )}

      <div>
        <h3 className="font-bold text-slate-800 mb-4 border-b pb-2 flex items-center justify-between">
          <span>Existing {entityType}</span>
          {(error || success) && entityType === 'question-papers' && (
            <span className={`text-xs px-3 py-1 rounded-full font-semibold ${error ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
              {error || success}
            </span>
          )}
        </h3>
        <div className="max-h-64 overflow-y-auto pr-2 space-y-2">
          {existingEntities.map(ent => (
            <div key={ent.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
              <div className="text-sm font-medium text-slate-700">
                {entityType === 'question-papers' ? 
                  `${ent.subject?.name} (${ent.year} ${ent.session}) - ${ent.branch?.name}, ${ent.semester?.name}, ${ent.examType?.name} (Downloads: ${ent.downloadsCount || 0})` : 
                 entityType === 'colleges' ?
                  `${ent.name} (${ent.code})` :
                 entityType === 'semesters' ?
                  `${ent.name} (${branches.find(b => b.id === ent.branchId)?.name || 'Unknown Branch'})` :
                 entityType === 'subjects' ?
                  `${ent.name} (${ent.code}) - ${branches.find(b => b.id === ent.branchId)?.name || ''}` :
                  (ent.name || ent.code || `ID: ${ent.id}`)}
              </div>
              {confirmDeleteId === ent.id ? (
                <div className="flex gap-2">
                  <button 
                    onClick={() => setConfirmDeleteId(null)}
                    type="button"
                    className="text-slate-500 hover:bg-slate-100 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={() => handleDelete(ent.id)}
                    type="button"
                    className="bg-red-500 text-white hover:bg-red-600 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors shadow-sm shadow-red-200"
                  >
                    Confirm Delete
                  </button>
                </div>
              ) : (
                <button 
                  onClick={() => setConfirmDeleteId(ent.id)}
                  type="button"
                  className="text-red-500 hover:bg-red-50 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors"
                >
                  Delete
                </button>
              )}
            </div>
          ))}
          {existingEntities.length === 0 && (
            <div className="text-sm text-slate-500 italic p-4 text-center">No existing records found.</div>
          )}
        </div>
      </div>
    </div>
  );
}

function UploadPaperForm({ token }: { token: string }) {
  const [file, setFile] = useState<File | null>(null);
  const [formData, setFormData] = useState({
    collegeId: '',
    branchId: '',
    semesterId: '',
    subjectId: '',
    examTypeId: '',
    year: new Date().getFullYear().toString(),
    session: 'Winter',
    notes: ''
  });
  const [submitting, setSubmitting] = useState(false);

  const [colleges, setColleges] = useState<any[]>([]);
  const [allBranches, setAllBranches] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [semesters, setSemesters] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [examTypes, setExamTypes] = useState<any[]>([]);

  useEffect(() => {
    apiFetch('/api/v1/colleges')
      .then(res => { if (!res.ok) throw new Error("API Error"); return res.json(); })
      .then(data => { if (Array.isArray(data)) setColleges(data); })
      .catch(console.error);

    apiFetch('/api/v1/branches')
      .then(res => { if (!res.ok) throw new Error("API Error"); return res.json(); })
      .then(data => { if (Array.isArray(data)) setAllBranches(data); })
      .catch(console.error);

    apiFetch('/api/v1/admin/exam-types', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => { if (!res.ok) throw new Error("API Error"); return res.json(); })
      .then(data => { if (Array.isArray(data)) setExamTypes(data); })
      .catch(console.error);
  }, [token]);

  // Filter branches by selected college
  useEffect(() => {
    if (formData.collegeId) {
      setBranches(allBranches.filter(b => String(b.collegeId) === formData.collegeId));
    } else {
      setBranches(allBranches);
    }
    setFormData(prev => ({ ...prev, branchId: '', semesterId: '', subjectId: '' }));
    setSemesters([]);
    setSubjects([]);
  }, [formData.collegeId, allBranches]);

  useEffect(() => {
    if (formData.branchId) {
      apiFetch(`/api/v1/branches/${formData.branchId}/semesters`)
        .then(res => { if (!res.ok) throw new Error("API Error"); return res.json(); })
        .then(data => {
          if (Array.isArray(data)) setSemesters(data);
          else setSemesters([]);
          setFormData(prev => ({ ...prev, semesterId: '', subjectId: '' }));
        })
        .catch(console.error);
    } else {
      setSemesters([]);
      setFormData(prev => ({ ...prev, semesterId: '', subjectId: '' }));
    }
  }, [formData.branchId]);

  useEffect(() => {
    if (formData.branchId && formData.semesterId) {
      apiFetch(`/api/v1/branches/${formData.branchId}/semesters/${formData.semesterId}/subjects`)
        .then(res => { if (!res.ok) throw new Error("API Error"); return res.json(); })
        .then(data => {
          if (Array.isArray(data)) setSubjects(data);
          else setSubjects([]);
          setFormData(prev => ({ ...prev, subjectId: '' }));
        })
        .catch(console.error);
    } else {
      setSubjects([]);
      setFormData(prev => ({ ...prev, subjectId: '' }));
    }
  }, [formData.branchId, formData.semesterId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return alert('Please select a file');
    
    setSubmitting(true);
    const data = new FormData();
    data.append('file', file);
    // Don't append branchId, collegeId and semesterId to the final form data for question papers as they are not in the schema
    const { branchId, semesterId, collegeId, ...submitData } = formData;
    Object.entries(submitData).forEach(([k, v]) => data.append(k, String(v)));

    try {
      const res = await apiFetch('/api/v1/admin/question-papers', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: data
      });
      if (!res.ok) throw new Error(await res.text());
      alert('Paper uploaded successfully!');
      setFile(null);
      setFormData({
        collegeId: '',
        branchId: '',
        semesterId: '',
        subjectId: '',
        examTypeId: '',
        year: new Date().getFullYear().toString(),
        session: 'Winter',
        notes: ''
      });
      const fileInput = document.getElementById('file-upload') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
    } catch (err: any) {
      alert(err.message || 'Upload failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-xl shadow-slate-200/50">
      <h2 className="text-xl font-black text-slate-900 mb-6 flex items-center gap-2">
        <span className="w-2 h-6 bg-indigo-600 rounded-full"></span> Upload Question Paper
      </h2>
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">College</label>
          <select
            required
            className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl p-3 focus:outline-none focus:border-indigo-500 focus:bg-white transition-colors text-slate-800 font-medium appearance-none"
            value={formData.collegeId}
            onChange={e => setFormData({...formData, collegeId: e.target.value})}
          >
            <option value="">Select College</option>
            {colleges.map(c => <option key={c.id} value={c.id}>{c.name} ({c.code})</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Branch</label>
          <select 
            required 
            className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl p-3 focus:outline-none focus:border-indigo-500 focus:bg-white transition-colors text-slate-800 font-medium appearance-none" 
            value={formData.branchId} 
            onChange={e => setFormData({...formData, branchId: e.target.value})}
            disabled={!formData.collegeId || branches.length === 0}
          >
            <option value="">{formData.collegeId ? (branches.length > 0 ? 'Select Branch' : 'No branches found') : 'Select College first'}</option>
            {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Semester</label>
          <select 
            required 
            className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl p-3 focus:outline-none focus:border-indigo-500 focus:bg-white transition-colors text-slate-800 font-medium appearance-none" 
            value={formData.semesterId} 
            onChange={e => setFormData({...formData, semesterId: e.target.value})}
            disabled={!formData.branchId || semesters.length === 0}
          >
            <option value="">{formData.branchId ? (semesters.length > 0 ? 'Select Semester' : 'No semesters found') : 'Select Branch first'}</option>
            {semesters.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Subject</label>
          <select 
            required 
            className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl p-3 focus:outline-none focus:border-indigo-500 focus:bg-white transition-colors text-slate-800 font-medium appearance-none" 
            value={formData.subjectId} 
            onChange={e => setFormData({...formData, subjectId: e.target.value})}
            disabled={!formData.semesterId || subjects.length === 0}
          >
            <option value="">{formData.semesterId ? (subjects.length > 0 ? 'Select Subject' : 'No subjects found') : 'Select Semester first'}</option>
            {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Exam Type</label>
          <select 
            required 
            className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl p-3 focus:outline-none focus:border-indigo-500 focus:bg-white transition-colors text-slate-800 font-medium appearance-none" 
            value={formData.examTypeId} 
            onChange={e => setFormData({...formData, examTypeId: e.target.value})}
          >
            <option value="">Select Exam Type</option>
            {examTypes.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Year</label>
            <input type="number" required className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl p-3 focus:outline-none focus:border-indigo-500 focus:bg-white transition-colors text-slate-800 font-medium" value={formData.year} onChange={e => setFormData({...formData, year: e.target.value})} />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Session</label>
            <select className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl p-3 focus:outline-none focus:border-indigo-500 focus:bg-white transition-colors text-slate-800 font-medium appearance-none" value={formData.session} onChange={e => setFormData({...formData, session: e.target.value})}>
              <option value="Winter">Winter</option>
              <option value="Summer">Summer</option>
            </select>
          </div>
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">PDF File</label>
          <input id="file-upload" type="file" accept="application/pdf" required onChange={e => setFile(e.target.files?.[0] || null)} className="w-full file:mr-4 file:py-2.5 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-bold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 transition-colors text-slate-600 text-sm" />
        </div>
        <button disabled={submitting} className="w-full bg-indigo-600 text-white font-bold py-4 px-6 rounded-2xl hover:bg-indigo-700 hover:shadow-lg shadow-indigo-200 transition-all disabled:opacity-50 mt-2">
          {submitting ? 'Uploading...' : 'Upload Paper'}
        </button>
      </form>
    </div>
  );
}

function ManageAdminsButton({ token }: { token: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/api/v1/admin/users', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (Array.isArray(data)) setUsers(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchUsers();
      setErrorMsg('');
      setNewAdminEmail('');
    }
  }, [isOpen, token]);

  const toggleAdmin = async (uid: string, currentStatus: boolean) => {
    try {
      const res = await apiFetch(`/api/v1/admin/users/${uid}/toggle-admin`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ isAdmin: !currentStatus })
      });
      if (!res.ok) throw new Error(await res.text());
      fetchUsers();
    } catch (err: any) {
      alert(err.message || 'Failed to update admin status');
    }
  };

  const handleAddAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAdminEmail) return;
    setSubmitting(true);
    setErrorMsg('');
    try {
      const res = await apiFetch('/api/v1/admin/users/add-admin', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email: newAdminEmail })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to add admin');
      setNewAdminEmail('');
      fetchUsers();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to add admin');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="text-sm text-indigo-600 hover:text-white border-2 border-indigo-100 hover:bg-indigo-600 px-4 py-2 rounded-xl font-bold transition-all shadow-sm flex items-center gap-2"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path>
        </svg>
        Manage Admins
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl border border-slate-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h2 className="text-xl font-black text-slate-900">Manage Administrators</h2>
              <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-slate-600 p-2 rounded-full hover:bg-slate-200 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1">
              <form onSubmit={handleAddAdmin} className="mb-8">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Add New Admin</label>
                <div className="flex gap-2">
                  <input 
                    type="email" 
                    required 
                    placeholder="Enter email address"
                    className="flex-1 bg-slate-50 border-2 border-slate-100 rounded-xl p-3 focus:outline-none focus:border-indigo-500 focus:bg-white transition-colors text-slate-800 font-medium"
                    value={newAdminEmail}
                    onChange={(e) => setNewAdminEmail(e.target.value)}
                  />
                  <button 
                    type="submit"
                    disabled={submitting || !newAdminEmail}
                    className="bg-indigo-600 text-white font-bold px-6 rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-colors whitespace-nowrap"
                  >
                    {submitting ? 'Adding...' : 'Add Admin'}
                  </button>
                </div>
                {errorMsg && <p className="mt-2 text-sm text-red-600 font-medium">{errorMsg}</p>}
                <p className="mt-2 text-xs text-slate-500">The user must have logged in at least once or exist in the authentication system.</p>
              </form>

              <div>
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Current Users</h3>
                {loading ? (
                  <div className="text-center py-8 text-slate-500">Loading...</div>
                ) : (
                  <div className="space-y-3">
                    {users.map(u => (
                      <div key={u.uid} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                        <div>
                          <p className="font-bold text-slate-900">{u.email}</p>
                          <p className="text-xs text-slate-500 mt-0.5">UID: {u.uid}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          {u.isAdmin && <span className="px-2.5 py-1 bg-indigo-100 text-indigo-700 text-xs font-bold rounded-lg uppercase tracking-wider">Admin</span>}
                          
                          {u.email.toLowerCase() !== 'aaminkhansohel@gmail.com' ? (
                            <button
                              onClick={() => toggleAdmin(u.uid, u.isAdmin)}
                              className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${
                                u.isAdmin 
                                  ? 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-200' 
                                  : 'bg-white border-2 border-slate-200 text-slate-600 hover:border-indigo-600 hover:text-indigo-600'
                              }`}
                            >
                              {u.isAdmin ? 'Revoke Admin' : 'Make Admin'}
                            </button>
                          ) : (
                            <span className="px-4 py-2 text-sm font-bold text-slate-400 bg-slate-100 rounded-lg">Super Admin</span>
                          )}
                        </div>
                      </div>
                    ))}
                    {users.length === 0 && <p className="text-slate-500 text-center py-4">No users found.</p>}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function ManageTrashForm({ token }: { token: string }) {
  const [trashedPapers, setTrashedPapers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmHardDeleteId, setConfirmHardDeleteId] = useState<number | null>(null);

  const fetchTrash = async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/api/v1/admin/question-papers/trash', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (Array.isArray(data)) setTrashedPapers(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrash();
  }, [token]);

  const handleRestore = async (id: number) => {
    try {
      const res = await apiFetch(`/api/v1/admin/question-papers/${id}/restore`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error(await res.text());
      fetchTrash();
    } catch (err: any) {
      alert(err.message || 'Restore failed');
    }
  };

  const handleHardDelete = async (id: number) => {
    try {
      const res = await apiFetch(`/api/v1/admin/question-papers/${id}/hard`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error(await res.text());
      fetchTrash();
      setConfirmHardDeleteId(null);
    } catch (err: any) {
      alert(err.message || 'Hard delete failed');
    }
  };

  return (
    <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-xl shadow-slate-200/50">
      <h2 className="text-xl font-black text-slate-900 mb-6 flex items-center gap-2">
        <span className="w-2 h-6 bg-red-600 rounded-full"></span> Trash (Soft Deleted Papers)
      </h2>
      
      {loading ? (
        <div className="text-center py-4 text-slate-500">Loading trash...</div>
      ) : trashedPapers.length === 0 ? (
        <div className="text-center py-4 text-slate-500 font-medium">No soft-deleted papers found.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b-2 border-slate-100">
                <th className="py-4 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">ID</th>
                <th className="py-4 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Paper Details</th>
                <th className="py-4 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {trashedPapers.map(paper => (
                <tr key={paper.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors group">
                  <td className="py-4 px-4 text-sm font-bold text-slate-400">#{paper.id}</td>
                  <td className="py-4 px-4">
                    <div className="font-bold text-slate-800">{paper.subject?.name}</div>
                    <div className="text-xs text-slate-500 mt-1 flex flex-wrap gap-2">
                      <span className="bg-slate-100 px-2 py-0.5 rounded-md">{paper.examType?.name}</span>
                      <span>{paper.session} {paper.year}</span>
                      <span>{paper.branch?.name}</span>
                      <span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-md">Downloads: {paper.downloadsCount || 0}</span>
                    </div>
                  </td>
                  <td className="py-4 px-4 text-right">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      {confirmHardDeleteId === paper.id ? (
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => setConfirmHardDeleteId(null)}
                            className="p-2 text-slate-500 hover:bg-slate-50 rounded-lg transition-colors font-bold text-sm"
                          >
                            Cancel
                          </button>
                          <button 
                            onClick={() => handleHardDelete(paper.id)}
                            className="p-2 text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors font-bold text-sm"
                          >
                            Confirm
                          </button>
                        </div>
                      ) : (
                        <>
                          <button 
                            onClick={() => handleRestore(paper.id)}
                            className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors font-bold text-sm"
                            title="Restore"
                          >
                            Restore
                          </button>
                          <button 
                            onClick={() => setConfirmHardDeleteId(paper.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors font-bold text-sm"
                            title="Delete Permanently"
                          >
                            Delete Permanently
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function AdminMetrics() {
  const [stats, setStats] = useState({ totalPapers: 0, totalDownloads: 0 });

  useEffect(() => {
    apiFetch('/api/v1/stats')
      .then(res => { if (!res.ok) throw new Error("API Error"); return res.json(); })
      .then(data => setStats(data))
      .catch(console.error);
  }, []);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
      <div className="bg-indigo-600 rounded-3xl p-6 shadow-xl shadow-indigo-200 text-white">
        <div className="text-4xl font-black">{stats.totalPapers}</div>
        <div className="text-indigo-200 font-bold uppercase tracking-widest mt-1 text-sm">Total Papers</div>
      </div>
      <div className="bg-indigo-600 rounded-3xl p-6 shadow-xl shadow-indigo-200 text-white">
        <div className="text-4xl font-black">{stats.totalDownloads}</div>
        <div className="text-indigo-200 font-bold uppercase tracking-widest mt-1 text-sm">Total Downloads</div>
      </div>
    </div>
  );
}
