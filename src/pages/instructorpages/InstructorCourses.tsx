import InstructorSidebar from '../../components/InstructorSidebar';
import Header from '../../components/Header';
import { ArrowRight, Plus, Sparkles } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { courseService } from '../../services/courseService';
import type { Course } from '../../types/lms';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';

export default function InstructorCourses() {
  const [courses, setCourses] = useState<Course[]>([]);
  const { user } = useAuth();
  const { showToast } = useToast();

  useEffect(() => {
    if (!user?.id) return;
    courseService
      .listCourses({ instructor: user.id })
      .then(setCourses)
      .catch(() => showToast('Impossible de charger les cours instructeur.', 'error'));
  }, [showToast, user?.id]);

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900 transition-colors dark:bg-slate-950 dark:text-slate-100">
      <InstructorSidebar />
      <main className="ml-64 flex-1">
        <Header />
        <div className="mx-auto max-w-7xl px-8 py-8">
          <section className="rounded-[30px] border border-slate-200 bg-gradient-to-br from-white via-slate-50 to-teal-50 p-6 shadow-sm dark:border-slate-800 dark:from-slate-900 dark:via-slate-900 dark:to-slate-950">
            <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
              <div className="max-w-3xl">
                <p className="text-xs font-bold uppercase tracking-[0.35em] text-teal-700 dark:text-teal-300">Instructor Studio</p>
                <h1 className="mt-3 text-4xl font-black tracking-tight">My Courses</h1>
                <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
                  Creez un nouveau cours avec un wizard guide en plusieurs etapes, laissez l&apos;IA vous assister a chaque phase, puis finalisez les modules, lessons, quiz et ressources dans le builder detaille.
                </p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Link
                  to="/instructor/courses/new"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-orange-500 px-5 py-3 text-sm font-bold text-white transition hover:bg-orange-400"
                >
                  <Sparkles className="h-4 w-4" />
                  Creation guidee
                </Link>
                <Link
                  to="/instructor/courses/new"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-900 transition hover:border-teal-300 hover:bg-teal-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:border-teal-500/40 dark:hover:bg-slate-800"
                >
                  <Plus className="h-4 w-4" />
                  Nouveau cours
                </Link>
              </div>
            </div>
          </section>

          <section className="mt-8 grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-slate-500 dark:text-slate-400">Cours</p>
                <p className="mt-3 text-3xl font-black">{courses.length}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-slate-500 dark:text-slate-400">Publies</p>
                <p className="mt-3 text-3xl font-black">{courses.filter((course) => course.is_published).length}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-slate-500 dark:text-slate-400">Brouillons</p>
                <p className="mt-3 text-3xl font-black">{courses.filter((course) => !course.is_published).length}</p>
            </div>
          </section>

          <section className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2">
            {courses.map((course) => (
              <Link
                key={course.id}
                to={`/instructor/courses/edit/${course.id}`}
                className="group block rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-teal-400 hover:shadow-lg dark:border-slate-800 dark:bg-slate-900 dark:hover:border-teal-500/50"
              >
                <img
                  src={course.thumbnail || course.thumbnail_url || 'https://images.unsplash.com/photo-1555099962-4199c345e5dd?auto=format&fit=crop&w=800&q=80'}
                  alt={course.title}
                  className="mb-4 h-44 w-full rounded-[18px] object-cover"
                />
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-xl font-bold">{course.title}</h3>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                      {course.category} • ${course.price}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-bold ${
                      course.is_published
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300'
                        : 'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300'
                    }`}
                  >
                    {course.is_published ? 'Published' : 'Draft'}
                  </span>
                </div>
                <div className="mt-4 flex items-center justify-between text-sm font-semibold text-teal-700 dark:text-teal-300">
                  <span>Edit course, modules and lessons</span>
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </div>
              </Link>
            ))}
          </section>
        </div>
      </main>
    </div>
  );
}
