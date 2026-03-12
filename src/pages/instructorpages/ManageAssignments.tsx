import InstructorSidebar from '../../components/InstructorSidebar';
import Header from '../../components/Header';
import { useEffect, useState } from 'react';
import { learningService, type SubmissionItem } from '../../services/learningService';
import { useToast } from '../../contexts/ToastContext';

export default function ManageAssignments() {
  const [submissions, setSubmissions] = useState<SubmissionItem[]>([]);
  const { showToast } = useToast();

  useEffect(() => {
    learningService
      .listSubmissions()
      .then(setSubmissions)
      .catch(() => showToast('Impossible de charger les submissions.', 'error'));
  }, [showToast]);

  return (
    <div className="flex min-h-screen bg-slate-50">
      <InstructorSidebar />
      <main className="flex-1 ml-64">
        <Header />
        <div className="p-8 max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold mb-6">Grading & Assignments</h1>
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-6 py-4">Assignment</th>
                  <th className="px-6 py-4">Student</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Grade</th>
                </tr>
              </thead>
              <tbody>
                {submissions.map((sub) => (
                  <tr key={sub.id} className="border-t border-slate-100">
                    <td className="px-6 py-4">{sub.assignment}</td>
                    <td className="px-6 py-4">{sub.student}</td>
                    <td className="px-6 py-4">{sub.status}</td>
                    <td className="px-6 py-4">{sub.grade ?? '-'}</td>
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
