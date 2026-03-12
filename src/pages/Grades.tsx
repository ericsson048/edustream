import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import { useEffect, useMemo, useState } from 'react';
import { learningService, type SubmissionItem } from '../services/learningService';
import { useToast } from '../contexts/ToastContext';

export default function Grades() {
  const [submissions, setSubmissions] = useState<SubmissionItem[]>([]);
  const { showToast } = useToast();

  useEffect(() => {
    learningService
      .listSubmissions()
      .then(setSubmissions)
      .catch(() => showToast('Impossible de charger les notes.', 'error'));
  }, [showToast]);

  const average = useMemo(() => {
    const graded = submissions.filter((s) => s.grade !== null && s.grade !== undefined);
    if (!graded.length) return 0;
    const total = graded.reduce((sum, s) => sum + Number(s.grade), 0);
    return Math.round((total / graded.length) * 100) / 100;
  }, [submissions]);

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans text-slate-900">
      <Sidebar />
      <main className="flex-1 ml-64">
        <Header />
        <div className="p-8 max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold mb-1">Grades</h1>
          <p className="text-slate-500 mb-6">Average: {average || 0}</p>
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-6 py-4">Submission</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Grade</th>
                  <th className="px-6 py-4">Submitted At</th>
                </tr>
              </thead>
              <tbody>
                {submissions.map((s) => (
                  <tr key={s.id} className="border-t border-slate-100">
                    <td className="px-6 py-4">{s.assignment}</td>
                    <td className="px-6 py-4">{s.status}</td>
                    <td className="px-6 py-4">{s.grade ?? '-'}</td>
                    <td className="px-6 py-4">{new Date(s.submitted_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
