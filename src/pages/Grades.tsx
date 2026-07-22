import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import { Award, TrendingUp, BookOpen, Download, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import { clsx } from 'clsx';

const courses = [
  {
    id: 1,
    name: 'Advanced React Patterns',
    code: 'CS-401',
    instructor: 'Sarah Chen',
    credits: 4,
    grade: 'A',
    percentage: 94,
    status: 'In Progress',
    assignments: [
      { name: 'Component Lifecycle Quiz', score: 95, total: 100, weight: '15%' },
      { name: 'Hooks Deep Dive', score: 92, total: 100, weight: '25%' },
      { name: 'Midterm Project', score: 96, total: 100, weight: '30%' },
    ]
  },
  {
    id: 2,
    name: 'Machine Learning Basics',
    code: 'DS-201',
    instructor: 'Dr. Marcus Vance',
    credits: 3,
    grade: 'B+',
    percentage: 88,
    status: 'In Progress',
    assignments: [
      { name: 'Linear Regression Quiz', score: 85, total: 100, weight: '20%' },
      { name: 'Data Cleaning Lab', score: 90, total: 100, weight: '20%' },
      { name: 'Classification Project', score: 88, total: 100, weight: '30%' },
    ]
  },
  {
    id: 3,
    name: 'User Experience Foundations',
    code: 'DES-101',
    instructor: 'Jason Keller',
    credits: 3,
    grade: 'A-',
    percentage: 91,
    status: 'In Progress',
    assignments: [
      { name: 'User Persona Research', score: 92, total: 100, weight: '25%' },
      { name: 'Wireframing Basics', score: 89, total: 100, weight: '25%' },
      { name: 'Prototyping Lab', score: 94, total: 100, weight: '25%' },
    ]
  },
  {
    id: 4,
    name: 'Academic Writing',
    code: 'ENG-202',
    instructor: 'Prof. Hugh Grant',
    credits: 2,
    grade: 'A',
    percentage: 98,
    status: 'Completed',
    assignments: [
      { name: 'Research Paper 1', score: 98, total: 100, weight: '40%' },
      { name: 'Final Essay', score: 97, total: 100, weight: '60%' },
    ]
  }
];

export default function Grades() {
  const [expandedCourse, setExpandedCourse] = useState<number | null>(null);

  const toggleCourse = (id: number) => {
    setExpandedCourse(expandedCourse === id ? null : id);
  };

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans text-slate-900">
      <Sidebar />
      
      <main className="flex-1 ml-64">
        <Header />
        
        <div className="p-8 max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Grades & Performance</h1>
              <p className="text-slate-500 mt-1">Track your academic progress and GPA.</p>
            </div>
            <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors">
              <Download className="w-4 h-4" />
              Download Transcript
            </button>
          </div>

          {/* GPA Overview Card */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl p-8 text-white shadow-lg mb-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/3 blur-3xl"></div>
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-black/10 rounded-full translate-y-1/2 -translate-x-1/3 blur-3xl"></div>
            
            <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
              <div className="flex items-center gap-6">
                <div className="w-24 h-24 rounded-full border-4 border-white/20 flex items-center justify-center bg-white/10 backdrop-blur-sm">
                  <div className="text-center">
                    <span className="block text-3xl font-bold">3.8</span>
                    <span className="block text-[10px] font-bold uppercase tracking-wider opacity-80">GPA</span>
                  </div>
                </div>
                <div>
                  <h2 className="text-2xl font-bold mb-1">Excellent Standing</h2>
                  <p className="text-blue-100 max-w-md">You're in the top 10% of your class. Keep up the great work to maintain your Dean's List status.</p>
                </div>
              </div>
              
              <div className="flex gap-8 text-center">
                <div>
                  <p className="text-3xl font-bold">12</p>
                  <p className="text-xs font-bold uppercase tracking-wider opacity-70 mt-1">Courses</p>
                </div>
                <div>
                  <p className="text-3xl font-bold">36</p>
                  <p className="text-xs font-bold uppercase tracking-wider opacity-70 mt-1">Credits</p>
                </div>
                <div>
                  <p className="text-3xl font-bold">94%</p>
                  <p className="text-xs font-bold uppercase tracking-wider opacity-70 mt-1">Avg Score</p>
                </div>
              </div>
            </div>
          </div>

          {/* Grades List */}
          <div className="space-y-4">
            {courses.map((course) => (
              <div key={course.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden transition-all">
                <div 
                  className="p-6 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors"
                  onClick={() => toggleCourse(course.id)}
                >
                  <div className="flex items-center gap-4 flex-1">
                    <div className={clsx(
                      "w-12 h-12 rounded-lg flex items-center justify-center text-lg font-bold",
                      course.grade.startsWith('A') ? "bg-green-100 text-green-700" :
                      course.grade.startsWith('B') ? "bg-blue-100 text-blue-700" :
                      "bg-yellow-100 text-yellow-700"
                    )}>
                      {course.grade}
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-lg">{course.name}</h3>
                      <p className="text-sm text-slate-500">{course.code} • {course.instructor} • {course.credits} Credits</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-8">
                    <div className="text-right hidden md:block">
                      <p className="text-sm font-bold text-slate-900">{course.percentage}%</p>
                      <p className="text-xs text-slate-500">Overall Score</p>
                    </div>
                    <div className="text-right hidden md:block">
                      <span className={clsx(
                        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold",
                        course.status === 'Completed' ? "bg-slate-100 text-slate-600" : "bg-blue-50 text-blue-600"
                      )}>
                        {course.status}
                      </span>
                    </div>
                    {expandedCourse === course.id ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
                  </div>
                </div>

                {expandedCourse === course.id && (
                  <div className="border-t border-slate-100 bg-slate-50 p-6">
                    <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4">Assignment Breakdown</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {course.assignments.map((assignment, idx) => (
                        <div key={idx} className="bg-white p-4 rounded-lg border border-slate-200">
                          <div className="flex justify-between items-start mb-2">
                            <span className="font-bold text-slate-700 text-sm">{assignment.name}</span>
                            <span className="text-xs font-medium text-slate-400 bg-slate-100 px-2 py-1 rounded">{assignment.weight}</span>
                          </div>
                          <div className="flex items-end gap-2">
                            <span className="text-2xl font-bold text-slate-900">{assignment.score}</span>
                            <span className="text-sm text-slate-400 mb-1">/ {assignment.total}</span>
                          </div>
                          <div className="w-full bg-slate-100 h-1.5 rounded-full mt-3 overflow-hidden">
                            <div 
                              className={clsx("h-full rounded-full", assignment.score >= 90 ? "bg-green-500" : "bg-blue-500")} 
                              style={{ width: `${(assignment.score / assignment.total) * 100}%` }}
                            ></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
