import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import { useEffect, useState } from 'react';
import { learningService, type AssignmentItem, type SubmissionItem } from '../services/learningService';
import { useToast } from '../contexts/ToastContext';

export default function Assignments() {
  const [assignments, setAssignments] = useState<AssignmentItem[]>([]);
  const [submissions, setSubmissions] = useState<SubmissionItem[]>([]);
  const { showToast } = useToast();

  useEffect(() => {
    Promise.all([learningService.listAssignments(), learningService.listSubmissions()])
      .then(([a, s]) => {
        setAssignments(a);
        setSubmissions(s);
      })
      .catch(() => showToast('Impossible de charger les assignments.', 'error'));
  }, [showToast]);

  const submissionByAssignment = Object.fromEntries(submissions.map((s) => [s.assignment, s]));

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans text-slate-900">
      <Sidebar />
      <main className="flex-1 ml-64">
        <Header />
        <div className="p-8 max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold mb-2">Assignments</h1>
          <p className="text-slate-500 mb-6">Vos devoirs reels depuis l'API.</p>
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-6 py-4">Title</th>
                  <th className="px-6 py-4">Type</th>
                  <th className="px-6 py-4">Due Date</th>
                  <th className="px-6 py-4">Points</th>
                  <th className="px-6 py-4">Status</th>
                </tr>
              </thead>
              <tbody>
                {assignments.map((a) => {
                  const sub = submissionByAssignment[a.id];
                  return (
                    <tr key={a.id} className="border-t border-slate-100">
                      <td className="px-6 py-4 font-semibold">{a.title}</td>
                      <td className="px-6 py-4">{a.type}</td>
                      <td className="px-6 py-4">{new Date(a.due_date).toLocaleString()}</td>
                      <td className="px-6 py-4">{a.points}</td>
                      <td className="px-6 py-4">{sub?.status || 'PENDING'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
