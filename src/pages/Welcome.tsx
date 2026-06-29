import { useEffect, useState } from 'react';
import { ArrowRight, Sparkles, Video, Code2, BrainCircuit, GraduationCap, Users, BookOpen, DollarSign, Route } from 'lucide-react';
import { Link } from 'react-router-dom';
import PublicNavbar from '../components/PublicNavbar';
import { authService } from '../services/authService';
import { courseService } from '../services/courseService';
import type { LearningPath } from '../types/lms';

export default function Welcome() {
  const [stats, setStats] = useState({ total_courses: 0, total_instructors: 0, total_students: 0, total_payouts: 0 });
  const [learningPaths, setLearningPaths] = useState<LearningPath[]>([]);

  useEffect(() => {
    authService.getPublicStats().then(setStats).catch(() => {});
    courseService.listLearningPaths({ is_active: true }).then(setLearningPaths).catch(() => {});
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-50 font-sans selection:bg-blue-500/30">
      <PublicNavbar />

      <section className="pt-32 pb-20 px-6 relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-blue-500/20 dark:bg-blue-600/10 blur-[120px] rounded-full pointer-events-none"></div>
        <div className="max-w-7xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-medium text-sm mb-8 border border-blue-100 dark:border-blue-800/50">
            <Sparkles className="w-4 h-4" />
            <span>Now with Unlimited AI Tutor & Live Streams</span>
          </div>
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-8 leading-[1.1]">
            Master any skill with <br className="hidden md:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400">
              AI-Powered Learning
            </span>
          </h1>
          <p className="text-lg md:text-xl text-slate-600 dark:text-slate-400 mb-10 max-w-2xl mx-auto leading-relaxed">
            EduStream is the next-generation LMS. Get personalized help from our AI Tutor, write code in our Live IDE, and join interactive WebRTC live classes.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/register" className="w-full sm:w-auto flex items-center justify-center gap-2 bg-blue-600 text-white px-8 py-4 rounded-full font-bold text-lg hover:bg-blue-700 transition-all shadow-xl shadow-blue-600/20 hover:scale-105">
              Start Learning for Free
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link to="/pricing" className="w-full sm:w-auto flex items-center justify-center gap-2 bg-white dark:bg-slate-900 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-800 px-8 py-4 rounded-full font-bold text-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-all">
              View Plans
            </Link>
          </div>

          <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-6 max-w-3xl mx-auto">
            <div className="bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm rounded-2xl p-4 border border-slate-200 dark:border-slate-800">
              <Users className="w-6 h-6 text-blue-500 mx-auto mb-2" />
              <p className="text-2xl font-bold">{stats.total_students.toLocaleString()}+</p>
              <p className="text-xs text-slate-500">Learners</p>
            </div>
            <div className="bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm rounded-2xl p-4 border border-slate-200 dark:border-slate-800">
              <BookOpen className="w-6 h-6 text-indigo-500 mx-auto mb-2" />
              <p className="text-2xl font-bold">{stats.total_courses.toLocaleString()}+</p>
              <p className="text-xs text-slate-500">Courses</p>
            </div>
            <div className="bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm rounded-2xl p-4 border border-slate-200 dark:border-slate-800">
              <GraduationCap className="w-6 h-6 text-emerald-500 mx-auto mb-2" />
              <p className="text-2xl font-bold">{stats.total_instructors.toLocaleString()}+</p>
              <p className="text-xs text-slate-500">Instructors</p>
            </div>
            <div className="bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm rounded-2xl p-4 border border-slate-200 dark:border-slate-800">
              <DollarSign className="w-6 h-6 text-amber-500 mx-auto mb-2" />
              <p className="text-2xl font-bold">${(stats.total_payouts / 1000).toFixed(0)}K+</p>
              <p className="text-xs text-slate-500">Paid to Instructors</p>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="py-24 bg-white dark:bg-slate-900 border-y border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Everything you need to succeed</h2>
            <p className="text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">We've combined the best tools into one seamless platform.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-slate-50 dark:bg-slate-950 p-8 rounded-3xl border border-slate-100 dark:border-slate-800 hover:border-blue-500/50 transition-colors group">
              <div className="w-14 h-14 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <BrainCircuit className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold mb-3">Contextual AI Tutor</h3>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                Stuck on a concept? Our Gemini-powered AI knows exactly which video and timestamp you're watching to give you perfect, contextual answers.
              </p>
            </div>

            <div className="bg-slate-50 dark:bg-slate-950 p-8 rounded-3xl border border-slate-100 dark:border-slate-800 hover:border-indigo-500/50 transition-colors group">
              <div className="w-14 h-14 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Video className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold mb-3">WebRTC Live Streams</h3>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                Join interactive, ultra-low latency live classes. Ask questions in real-time, share your screen, and collaborate with peers seamlessly.
              </p>
            </div>

            <div className="bg-slate-50 dark:bg-slate-950 p-8 rounded-3xl border border-slate-100 dark:border-slate-800 hover:border-emerald-500/50 transition-colors group">
              <div className="w-14 h-14 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Code2 className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold mb-3">Live IDE Integration</h3>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                Practice coding directly in the browser while watching lessons. Real-time execution and error highlighting without leaving the platform.
              </p>
            </div>
          </div>
        </div>
      </section>

      {learningPaths.length > 0 && (
        <section className="py-24 px-6 bg-white dark:bg-slate-900">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-12">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.3em] text-blue-600 dark:text-blue-400">Parcours</p>
                <h2 className="text-3xl md:text-4xl font-black mt-2">Learning Paths</h2>
                <p className="text-slate-500 dark:text-slate-400 mt-2">Des parcours guides pour atteindre vos objectifs.</p>
              </div>
              <Route className="w-12 h-12 text-blue-600/20 dark:text-blue-400/10" />
            </div>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {learningPaths.slice(0, 3).map((path) => (
                <Link
                  key={path.id}
                  to="/catalog"
                  className="group rounded-[28px] border border-slate-200 bg-slate-50 p-6 transition hover:border-blue-300 hover:shadow-lg dark:border-slate-800 dark:bg-slate-950 dark:hover:border-blue-500/40"
                >
                  <img src={path.thumbnail_url || 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=800&q=80'} alt={path.title} className="h-40 w-full rounded-2xl object-cover mb-5" />
                  <h3 className="text-xl font-black">{path.title}</h3>
                  <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 line-clamp-2">{path.description}</p>
                  <p className="mt-4 text-sm font-bold text-blue-600 dark:text-blue-400">{path.courses.length} courses</p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      <section id="instructors" className="py-24 px-6">
        <div className="max-w-5xl mx-auto bg-slate-900 dark:bg-slate-950 rounded-[3rem] p-10 md:p-16 text-center text-white relative overflow-hidden border border-slate-800">
          <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/20 blur-[100px] rounded-full pointer-events-none"></div>
          <div className="relative z-10">
            <Users className="w-16 h-16 mx-auto mb-6 text-blue-400" />
            <h2 className="text-3xl md:text-5xl font-bold mb-6">Become an Instructor</h2>
            <p className="text-lg text-slate-300 mb-10 max-w-2xl mx-auto">
              Share your knowledge with the world. Our marketplace model lets you keep 70% of every sale, while we handle the hosting, AI costs, and payments.
            </p>
            <Link to="/pricing" className="inline-flex items-center gap-2 bg-white text-slate-900 px-8 py-4 rounded-full font-bold text-lg hover:bg-slate-100 transition-transform hover:scale-105">
              See Instructor Plans
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>

      <footer className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 py-12">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <GraduationCap className="w-6 h-6 text-blue-600" />
            <span className="font-bold text-xl tracking-tight">EduStream</span>
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-sm">
            © 2026 EduStream LMS. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
