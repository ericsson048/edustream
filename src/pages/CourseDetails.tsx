import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import { Star, Clock, Users, PlayCircle, CheckCircle, FileText, Award } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { courseService } from '../services/courseService';
import type { Course } from '../types/lms';

export default function CourseDetails() {
  const { id = '' } = useParams();
  const [course, setCourse] = useState<Course | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    courseService
      .getCourse(id)
      .then(setCourse)
      .catch(() => setError('Cours introuvable ou inaccessible.'));
  }, [id]);

  if (error) {
    return <div className="min-h-screen grid place-items-center text-red-600">{error}</div>;
  }

  if (!course) {
    return <div className="min-h-screen grid place-items-center text-slate-500">Loading...</div>;
  }

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans text-slate-900">
      <Sidebar />
      <main className="flex-1 ml-64">
        <Header />

        <div className="bg-slate-900 text-white py-16 px-8 relative overflow-hidden">
          <div className="absolute inset-0 opacity-20">
            <img src={course.thumbnail_url || 'https://images.unsplash.com/photo-1555099962-4199c345e5dd?auto=format&fit=crop&w=2000&q=80'} alt="Background" className="w-full h-full object-cover" />
          </div>
          <div className="max-w-5xl mx-auto relative z-10 flex flex-col md:flex-row gap-8 items-center">
            <div className="flex-1">
              <div className="flex items-center gap-2 text-blue-400 font-bold text-sm mb-4">
                <span className="bg-blue-500/20 px-2.5 py-1 rounded-md">{course.category || 'General'}</span>
                <span>•</span>
                <span>{course.level}</span>
              </div>
              <h1 className="text-4xl md:text-5xl font-bold mb-4 leading-tight">{course.title}</h1>
              <p className="text-lg text-slate-300 mb-6 line-clamp-2">{course.description || 'Course description is being prepared.'}</p>

              <div className="flex flex-wrap items-center gap-6 text-sm text-slate-300 mb-8">
                <div className="flex items-center gap-1 text-amber-400 font-bold">
                  <Star className="w-5 h-5 fill-current" /> 4.9
                </div>
                <div className="flex items-center gap-2"><Users className="w-5 h-5" /> 12,450 students</div>
                <div className="flex items-center gap-2"><Clock className="w-5 h-5" /> 18h total</div>
              </div>

              <div className="flex items-center gap-4">
                <img src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80" alt="Instructor" className="w-12 h-12 rounded-full border-2 border-slate-700" />
                <div>
                  <p className="text-sm text-slate-400">Created by</p>
                  <p className="font-bold">{course.instructor_name || 'Instructor'}</p>
                </div>
              </div>
            </div>

            <div className="w-full md:w-80 bg-white rounded-2xl p-6 text-slate-900 shadow-2xl">
              <div className="text-3xl font-bold mb-4">${course.price}</div>
              <Link to={`/checkout/${course.id}`} className="block w-full py-3 px-4 bg-blue-600 text-white text-center font-bold rounded-xl hover:bg-blue-700 transition-colors mb-4 shadow-sm">
                Enroll Now
              </Link>
              <p className="text-xs text-center text-slate-500 mb-6">30-Day Money-Back Guarantee</p>

              <div className="space-y-3 text-sm font-medium text-slate-700">
                <div className="flex items-center gap-3"><PlayCircle className="w-5 h-5 text-blue-600" /> On-demand video</div>
                <div className="flex items-center gap-3"><FileText className="w-5 h-5 text-blue-600" /> Downloadable resources</div>
                <div className="flex items-center gap-3"><Award className="w-5 h-5 text-blue-600" /> Certificate of completion</div>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-5xl mx-auto px-8 py-12 grid grid-cols-1 lg:grid-cols-3 gap-12">
          <div className="lg:col-span-2 space-y-12">
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
              <h2 className="text-2xl font-bold mb-6">What you'll learn</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  'Build practical skills with guided lessons',
                  'Understand concepts through real-world examples',
                  'Follow a structured and scalable learning path',
                  'Apply best practices used in production teams',
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                    <span className="text-slate-700 text-sm leading-relaxed">{item}</span>
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
