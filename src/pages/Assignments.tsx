import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import { FileText, Calendar, CheckCircle, AlertCircle, Clock, ChevronRight, Upload, Filter } from 'lucide-react';

const assignments = [
  {
    id: 1,
    title: 'Final UX Research Report',
    course: 'Design Systems 101',
    dueDate: 'Oct 12, 2024',
    status: 'Due Soon',
    points: '100 pts',
    type: 'Report'
  },
  {
    id: 2,
    title: 'Python Quiz: Arrays & Lists',
    course: 'CS Foundations',
    dueDate: 'Oct 15, 2024',
    status: 'Upcoming',
    points: '50 pts',
    type: 'Quiz'
  },
  {
    id: 3,
    title: 'History Essay Draft',
    course: 'World History II',
    dueDate: 'Oct 18, 2024',
    status: 'Upcoming',
    points: '75 pts',
    type: 'Essay'
  },
  {
    id: 4,
    title: 'React Component Lifecycle',
    course: 'Advanced React Patterns',
    dueDate: 'Oct 05, 2024',
    status: 'Submitted',
    points: '50 pts',
    type: 'Code'
  },
  {
    id: 5,
    title: 'Linear Regression Analysis',
    course: 'Machine Learning Basics',
    dueDate: 'Sep 28, 2024',
    status: 'Graded',
    grade: '92/100',
    points: '100 pts',
    type: 'Project'
  },
  {
    id: 6,
    title: 'Marketing Strategy Proposal',
    course: 'Growth Hacking',
    dueDate: 'Sep 20, 2024',
    status: 'Missing',
    points: '150 pts',
    type: 'Presentation'
  }
];

const getStatusColor = (status: string) => {
  switch (status) {
    case 'Due Soon': return 'text-amber-600 bg-amber-50 border-amber-100';
    case 'Upcoming': return 'text-blue-600 bg-blue-50 border-blue-100';
    case 'Submitted': return 'text-green-600 bg-green-50 border-green-100';
    case 'Graded': return 'text-purple-600 bg-purple-50 border-purple-100';
    case 'Missing': return 'text-red-600 bg-red-50 border-red-100';
    default: return 'text-slate-600 bg-slate-50 border-slate-100';
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'Due Soon': return <AlertCircle className="w-4 h-4" />;
    case 'Upcoming': return <Calendar className="w-4 h-4" />;
    case 'Submitted': return <CheckCircle className="w-4 h-4" />;
    case 'Graded': return <CheckCircle className="w-4 h-4" />;
    case 'Missing': return <AlertCircle className="w-4 h-4" />;
    default: return <FileText className="w-4 h-4" />;
  }
};

export default function Assignments() {
  return (
    <div className="flex min-h-screen bg-slate-50 font-sans text-slate-900">
      <Sidebar />
      
      <main className="flex-1 ml-64">
        <Header />
        
        <div className="p-8 max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Assignments</h1>
              <p className="text-slate-500 mt-1">Manage your tasks, quizzes, and projects.</p>
            </div>
            <div className="flex items-center gap-3">
              <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors">
                <Filter className="w-4 h-4" />
                Filter
              </button>
              <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 transition-colors">
                <Calendar className="w-4 h-4" />
                Calendar View
              </button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            {[
              { label: 'Upcoming', value: '3', icon: Calendar, color: 'text-blue-600', bg: 'bg-blue-100' },
              { label: 'Submitted', value: '12', icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-100' },
              { label: 'Missing', value: '1', icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-100' },
              { label: 'Average Grade', value: '94%', icon: FileText, color: 'text-purple-600', bg: 'bg-purple-100' },
            ].map((stat, i) => (
              <div key={i} className="bg-white p-5 rounded-xl shadow-sm border border-slate-100 flex items-center gap-4">
                <div className={`w-12 h-12 ${stat.bg} ${stat.color} rounded-lg flex items-center justify-center shrink-0`}>
                  <stat.icon className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">{stat.label}</p>
                  <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Tabs */}
          <div className="flex border-b border-slate-200 mb-6">
            {['All Assignments', 'Upcoming', 'Submitted', 'Graded'].map((tab, i) => (
              <button 
                key={tab}
                className={`px-6 py-3 text-sm font-bold border-b-2 transition-colors ${
                  i === 0 ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Assignments List */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                    <th className="px-6 py-4">Assignment</th>
                    <th className="px-6 py-4">Course</th>
                    <th className="px-6 py-4">Due Date</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Score</th>
                    <th className="px-6 py-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {assignments.map((assignment) => (
                    <tr key={assignment.id} className="hover:bg-slate-50 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500">
                            <FileText className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="font-bold text-slate-900">{assignment.title}</p>
                            <p className="text-xs text-slate-500">{assignment.type}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm font-medium text-slate-700">{assignment.course}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          <Clock className="w-4 h-4 text-slate-400" />
                          {assignment.dueDate}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${getStatusColor(assignment.status)}`}>
                          {getStatusIcon(assignment.status)}
                          {assignment.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm font-bold text-slate-900">
                          {assignment.grade || '-'} 
                          <span className="text-slate-400 font-normal ml-1">/ {assignment.points}</span>
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        {assignment.status === 'Graded' ? (
                          <button className="text-blue-600 hover:text-blue-700 text-sm font-bold hover:underline">View Feedback</button>
                        ) : assignment.status === 'Submitted' ? (
                          <button className="text-slate-500 hover:text-slate-700 text-sm font-medium">View Submission</button>
                        ) : (
                          <button className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 transition-colors">
                            <Upload className="w-4 h-4" />
                            Submit
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-center">
              <button className="text-sm font-bold text-slate-600 hover:text-slate-900 flex items-center gap-1">
                Load More Assignments
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
