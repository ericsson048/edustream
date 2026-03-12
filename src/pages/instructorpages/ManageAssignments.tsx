import InstructorSidebar from '../../components/InstructorSidebar';
import Header from '../../components/Header';
import { CheckCircle, Clock, FileText } from 'lucide-react';

const submissions = [
  { id: 1, student: 'Alex Johnson', course: 'React Patterns', assignment: 'Hooks Project', submittedAt: '2 hours ago', status: 'Needs Grading' },
  { id: 2, student: 'Maria Garcia', course: 'React Patterns', assignment: 'Hooks Project', submittedAt: '5 hours ago', status: 'Needs Grading' },
  { id: 3, student: 'James Smith', course: 'React Patterns', assignment: 'Hooks Project', submittedAt: '1 day ago', status: 'Graded' },
];

export default function ManageAssignments() {
  return (
    <div className="flex min-h-screen bg-slate-50 font-sans text-slate-900">
      <InstructorSidebar />
      <main className="flex-1 ml-64">
        <Header />
        <div className="p-8 max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Grading & Assignments</h1>
            <p className="text-slate-500 mt-1">Review student submissions and provide feedback.</p>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                  <th className="px-6 py-4">Student</th>
                  <th className="px-6 py-4">Assignment</th>
                  <th className="px-6 py-4">Submitted</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {submissions.map((sub) => (
                  <tr key={sub.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 font-medium text-slate-900">{sub.student}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-slate-400" />
                        <span className="text-slate-700">{sub.assignment}</span>
                      </div>
                      <div className="text-xs text-slate-500 mt-1">{sub.course}</div>
                    </td>
                    <td className="px-6 py-4 text-slate-500 text-sm">{sub.submittedAt}</td>
                    <td className="px-6 py-4">
                      {sub.status === 'Needs Grading' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-700">
                          <Clock className="w-3 h-3" /> Needs Grading
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700">
                          <CheckCircle className="w-3 h-3" /> Graded
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button className="px-4 py-2 bg-blue-50 text-blue-600 rounded-lg text-sm font-bold hover:bg-blue-100 transition-colors">
                        {sub.status === 'Needs Grading' ? 'Grade Now' : 'View'}
                      </button>
                    </td>
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
