import Sidebar from '../../components/Sidebar';
import Header from '../../components/Header';
import Pagination from '../../components/Pagination';
import { useEffect, useMemo, useState } from 'react';
import { learningService, type SubmissionItem } from '../../services/learningService';
import { useToast } from '../../contexts/ToastContext';

const PAGE_SIZE = 5;

export default function Grades() {
  const [submissions, setSubmissions] = useState<SubmissionItem[]>([]);
  const [page, setPage] = useState(1);
  const { showToast } = useToast();

  useEffect(() => {
    learningService
      .listSubmissions()
      .then((data) => {
        setSubmissions(data);
        setPage(1);
      })
      .catch(() => showToast('Impossible de charger les notes.', 'error'));
  }, [showToast]);

  const sorted = useMemo(
    () => [...submissions].sort((a, b) => new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime()),
    [submissions],
  );

  const average = useMemo(() => {
    const graded = submissions.filter((s) => s.grade !== null && s.grade !== undefined);
    if (!graded.length) return 0;
    const total = graded.reduce((sum, s) => sum + Number(s.grade), 0);
    return Math.round((total / graded.length) * 100) / 100;
  }, [submissions]);

  const totalPages = Math.ceil(sorted.length / PAGE_SIZE) || 1;
  const paginated = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans text-slate-900">
      <Sidebar />
      <main className="flex-1 ml-64">
        <Header />
        <div className="p-8 max-w-6xl mx-auto">
          <div className="flex justify-between items-end mb-6">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Grades</h1>
              <p className="text-sm text-slate-500 mt-1">{submissions.length} submission(s) · Average: {average || 0}</p>
            </div>
          </div>

          {sorted.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center py-20 bg-white rounded-xl border border-dashed border-slate-300">
              <p className="text-slate-700 font-medium">No submissions yet</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500 tracking-wide">
                  <tr>
                    <th className="px-6 py-4">Submission</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Grade</th>
                    <th className="px-6 py-4">Submitted At</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((s) => (
                    <tr key={s.id} className="border-t border-slate-100 hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-medium text-sm text-slate-900">{s.assignment_title || s.assignment}</div>
                        <div className="text-xs text-slate-500 mt-0.5">{s.course_title || 'Course'}</div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">{s.status}</td>
                      <td className="px-6 py-4 text-sm font-medium text-slate-700">{s.grade ?? '-'}</td>
                      <td className="px-6 py-4 text-sm text-slate-500">{new Date(s.submitted_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

