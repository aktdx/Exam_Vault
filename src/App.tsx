/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { Home } from './pages/Home';
import { Branches } from './pages/Branches';
import { Semesters } from './pages/Semesters';
import { Subjects } from './pages/Subjects';
import { Papers } from './pages/Papers';
import { PaperDetail } from './pages/PaperDetail';
import { AdminLogin } from './pages/AdminLogin';
import { AdminDashboard } from './pages/AdminDashboard';

export default function App() {
  return (
    <BrowserRouter>
      <div className="flex flex-col min-h-screen w-full bg-[#F0F4F8] text-[#1E293B] font-sans">
        <header className="bg-white border-b border-slate-200 px-4 md:px-8 py-4 flex items-center justify-between shadow-sm sticky top-0 z-[100]">
          <div className="flex items-center gap-2">
            <Link to="/" className="flex items-center gap-2 group">
              <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200 group-hover:scale-105 transition-transform">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z"></path>
                </svg>
              </div>
              <span className="text-2xl font-black tracking-tight text-indigo-950 underline decoration-indigo-500/30 decoration-4 underline-offset-4 hidden sm:block">ExamVault</span>
            </Link>
          </div>
          <div className="flex items-center gap-6">
            <div className="flex gap-4 text-sm font-bold uppercase tracking-wider text-slate-500">
              <Link to="/branches" className="hover:text-indigo-600 transition-colors">Browse</Link>
            </div>
            <Link to="/admin" className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-full font-bold text-sm transition-all flex items-center gap-2">
              Admin <svg className="w-4 h-4 hidden sm:block" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
            </Link>
          </div>
        </header>

        <main className="flex-1 flex flex-col p-4 md:p-8 max-w-7xl mx-auto w-full gap-8">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/branches" element={<Branches />} />
            <Route path="/branches/:branchId/semesters" element={<Semesters />} />
            <Route path="/branches/:branchId/semesters/:semesterId/subjects" element={<Subjects />} />
            <Route path="/subjects/:subjectId/papers" element={<Papers />} />
            <Route path="/papers/:id" element={<PaperDetail />} />
            
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/admin/*" element={<AdminDashboard />} />
          </Routes>
        </main>
        
        <footer className="bg-white border-t border-slate-200 px-4 md:px-8 py-4 flex flex-col sm:flex-row items-center justify-between text-slate-400 text-[11px] font-bold uppercase tracking-widest gap-2">
          <div>&copy; {new Date().getFullYear()} ExamVault By Aamin Khan</div>
          <div className="flex flex-wrap justify-center gap-4 sm:gap-6">
            <span>Production Ready</span>
            <span className="text-indigo-400">System Status: Optimal</span>
          </div>
        </footer>
      </div>
    </BrowserRouter>
  );
}

