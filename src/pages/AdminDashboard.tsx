import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../lib/firebase';
import { signOut, onAuthStateChanged, User } from 'firebase/auth';

export function AdminDashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        const t = await u.getIdToken();
        setToken(t);
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
        <button 
          onClick={() => signOut(auth)}
          className="text-sm text-red-600 hover:text-white border-2 border-red-100 hover:bg-red-600 px-6 py-2 rounded-xl font-bold transition-all shadow-sm"
        >
          Sign Out
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        <UploadPaperForm token={token} />
        <ManageEntitiesForm token={token} />
      </div>
    </div>
  );
}

function ManageEntitiesForm({ token }: { token: string }) {
  const [entityType, setEntityType] = useState('branches');
  const [formData, setFormData] = useState<any>({});
  const [submitting, setSubmitting] = useState(false);
  const [branches, setBranches] = useState<any[]>([]);
  const [semesters, setSemesters] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [existingEntities, setExistingEntities] = useState<any[]>([]);

  const fetchExistingEntities = () => {
    fetch(`/api/v1/admin/${entityType}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setExistingEntities(data);
      })
      .catch(console.error);
  };

  useEffect(() => {
    fetchExistingEntities();
  }, [entityType, token]);

  useEffect(() => {
    fetch('/api/v1/branches')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setBranches(data);
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (formData.branchId) {
      fetch(`/api/v1/branches/${formData.branchId}/semesters`)
        .then(res => res.json())
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

    if (entityType === 'branches') payload.collegeId = 1;

    if (entityType === 'semesters' && !payload.number) {
      setError("Could not automatically determine semester number from the name. Please include a number in the name (e.g. 'Semester 1').");
      setSubmitting(false);
      return;
    }

    if (entityType === 'exam-types') {
      try {
        const checkRes = await fetch(`/api/v1/admin/exam-types`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const existing = await checkRes.json();
        if (Array.isArray(existing) && existing.some(e => e.name.toLowerCase() === payload.name.toLowerCase())) {
          setError(`Exam type '${payload.name}' already exists.`);
          setSubmitting(false);
          return;
        }
      } catch (err) {
        console.error("Error checking for existing exam types", err);
      }
    }

    try {
      const res = await fetch(`/api/v1/admin/${entityType}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error(await res.text());
      setSuccess(`${entityType} added successfully!`);
      setFormData({});
      fetchExistingEntities();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to add entity');
      setTimeout(() => setError(null), 3000);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      const res = await fetch(`/api/v1/admin/${entityType}/${id}`, {
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
      case 'branches':
        return (
          <>
            <div><label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Name (e.g. Computer Engineering)</label><input type="text" required className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl p-3 focus:outline-none focus:border-indigo-500" value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} /></div>
            <div><label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Code (e.g. COMP)</label><input type="text" required className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl p-3 focus:outline-none focus:border-indigo-500" value={formData.code || ''} onChange={e => setFormData({...formData, code: e.target.value})} /></div>
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
                  `${ent.subject?.name} (${ent.year} ${ent.session}) - ${ent.branch?.name}, ${ent.semester?.name}, ${ent.examType?.name}` : 
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
    branchId: '',
    semesterId: '',
    subjectId: '',
    examTypeId: '',
    year: new Date().getFullYear().toString(),
    session: 'Winter',
    notes: ''
  });
  const [submitting, setSubmitting] = useState(false);

  const [branches, setBranches] = useState<any[]>([]);
  const [semesters, setSemesters] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [examTypes, setExamTypes] = useState<any[]>([]);

  useEffect(() => {
    fetch('/api/v1/branches')
      .then(res => res.json())
      .then(data => { if (Array.isArray(data)) setBranches(data); })
      .catch(console.error);

    fetch('/api/v1/admin/exam-types', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => { if (Array.isArray(data)) setExamTypes(data); })
      .catch(console.error);
  }, [token]);

  useEffect(() => {
    if (formData.branchId) {
      fetch(`/api/v1/branches/${formData.branchId}/semesters`)
        .then(res => res.json())
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
      fetch(`/api/v1/branches/${formData.branchId}/semesters/${formData.semesterId}/subjects`)
        .then(res => res.json())
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
    // Don't append branchId and semesterId to the final form data for question papers as they are not in the schema
    const { branchId, semesterId, ...submitData } = formData;
    Object.entries(submitData).forEach(([k, v]) => data.append(k, String(v)));

    try {
      const res = await fetch('/api/v1/admin/question-papers', {
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
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Branch</label>
          <select 
            required 
            className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl p-3 focus:outline-none focus:border-indigo-500 focus:bg-white transition-colors text-slate-800 font-medium appearance-none" 
            value={formData.branchId} 
            onChange={e => setFormData({...formData, branchId: e.target.value})}
          >
            <option value="">Select Branch</option>
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
