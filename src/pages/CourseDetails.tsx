import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import { Star, Clock, Users, PlayCircle, CheckCircle, FileText, Award } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function CourseDetails() {
  return (
    <div className="flex min-h-screen bg-slate-50 font-sans text-slate-900">
      <Sidebar />
      <main className="flex-1 ml-64">
        <Header />
        
        {/* Hero Section */}
        <div className="bg-slate-900 text-white py-16 px-8 relative overflow-hidden">
          <div className="absolute inset-0 opacity-20">
            <img src="https://images.unsplash.com/photo-1555099962-4199c345e5dd?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80" alt="Background" className="w-full h-full object-cover" />
          </div>
          <div className="max-w-5xl mx-auto relative z-10 flex flex-col md:flex-row gap-8 items-center">
            <div className="flex-1">
              <div className="flex items-center gap-2 text-blue-400 font-bold text-sm mb-4">
                <span className="bg-blue-500/20 px-2.5 py-1 rounded-md">Development</span>
                <span>•</span>
                <span>Advanced</span>
              </div>
              <h1 className="text-4xl md:text-5xl font-bold mb-4 leading-tight">Advanced React Patterns & Best Practices</h1>
              <p className="text-lg text-slate-300 mb-6 line-clamp-2">Master modern React by learning advanced design patterns, performance optimization techniques, and state management strategies used by top engineering teams.</p>
              
              <div className="flex flex-wrap items-center gap-6 text-sm text-slate-300 mb-8">
                <div className="flex items-center gap-1 text-amber-400 font-bold">
                  <Star className="w-5 h-5 fill-current" /> 4.9 <span className="text-slate-400 font-normal">(2.4k reviews)</span>
                </div>
                <div className="flex items-center gap-2"><Users className="w-5 h-5" /> 12,450 students</div>
                <div className="flex items-center gap-2"><Clock className="w-5 h-5" /> 18h 30m total</div>
              </div>
              
              <div className="flex items-center gap-4">
                <img src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?ixlib=rb-4.0.3&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80" alt="Instructor" className="w-12 h-12 rounded-full border-2 border-slate-700" />
                <div>
                  <p className="text-sm text-slate-400">Created by</p>
                  <p className="font-bold">Sarah Chen</p>
                </div>
              </div>
            </div>
            
            {/* Pricing Card */}
            <div className="w-full md:w-80 bg-white rounded-2xl p-6 text-slate-900 shadow-2xl">
              <div className="text-3xl font-bold mb-4">$89.99</div>
              <Link to="/checkout/1" className="block w-full py-3 px-4 bg-blue-600 text-white text-center font-bold rounded-xl hover:bg-blue-700 transition-colors mb-4 shadow-sm">
                Enroll Now
              </Link>
              <p className="text-xs text-center text-slate-500 mb-6">30-Day Money-Back Guarantee</p>
              
              <div className="space-y-3 text-sm font-medium text-slate-700">
                <div className="flex items-center gap-3"><PlayCircle className="w-5 h-5 text-blue-600" /> 18.5 hours on-demand video</div>
                <div className="flex items-center gap-3"><FileText className="w-5 h-5 text-blue-600" /> 24 downloadable resources</div>
                <div className="flex items-center gap-3"><Award className="w-5 h-5 text-blue-600" /> Certificate of completion</div>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-5xl mx-auto px-8 py-12 grid grid-cols-1 lg:grid-cols-3 gap-12">
          <div className="lg:col-span-2 space-y-12">
            {/* What you'll learn */}
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
              <h2 className="text-2xl font-bold mb-6">What you'll learn</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  'Build scalable React applications using modern architecture',
                  'Implement advanced hooks and custom hook patterns',
                  'Optimize performance with useMemo, useCallback, and React.memo',
                  'Manage complex state with Redux Toolkit and Context API',
                  'Write clean, maintainable, and testable React code',
                  'Master Server-Side Rendering (SSR) concepts'
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                    <span className="text-slate-700 text-sm leading-relaxed">{item}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Syllabus */}
            <div>
              <h2 className="text-2xl font-bold mb-6">Course Content</h2>
              <div className="space-y-4">
                {[
                  { title: 'Module 1: React Fundamentals Deep Dive', lessons: 5, time: '1h 45m' },
                  { title: 'Module 2: Advanced Hook Patterns', lessons: 8, time: '2h 30m' },
                  { title: 'Module 3: Performance Optimization', lessons: 6, time: '2h 15m' },
                  { title: 'Module 4: State Management at Scale', lessons: 10, time: '3h 20m' },
                ].map((module, i) => (
                  <div key={i} className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                    <div className="p-5 bg-slate-50 flex justify-between items-center cursor-pointer hover:bg-slate-100 transition-colors">
                      <h3 className="font-bold text-slate-900">{module.title}</h3>
                      <span className="text-sm text-slate-500">{module.lessons} lessons • {module.time}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
