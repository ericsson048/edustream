import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import { Star, Users, PlayCircle, MapPin, Globe, Twitter, Linkedin, BookOpen } from 'lucide-react';
import { useParams, Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { authService } from '../services/authService';
import { courseService } from '../services/courseService';
import type { AuthUser } from '../types/auth';
import type { Course } from '../types/lms';

export default function InstructorProfile() {
  const { id = '' } = useParams();
  const [instructor, setInstructor] = useState<AuthUser | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [studentCount, setStudentCount] = useState(0);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) { setError('No instructor ID provided.'); return; }

    authService.getUser(id)
      .then(setInstructor)
      .catch(() => setError('Instructor not found.'));

    courseService.listCourses({ instructor: id, is_published: true })
      .then(setCourses)
      .catch(() => {});

    courseService.listEnrollments({ is_active: true })
      .then((enrollments) => {
        const instrCourseIds = new Set<string>();
        setCourses(prev => {
          prev.forEach(c => instrCourseIds.add(c.id));
          return prev;
        });
        if (instrCourseIds.size === 0) {
          courseService.listCourses({ instructor: id }).then(cs => {
            cs.forEach(c => instrCourseIds.add(c.id));
            setStudentCount(enrollments.filter(e => instrCourseIds.has(e.course)).length);
          });
        } else {
          setStudentCount(enrollments.filter(e => instrCourseIds.has(e.course)).length);
        }
      })
      .catch(() => {});
  }, [id]);

  if (error) {
    return (
      <div className="flex min-h-screen bg-slate-50 font-sans text-slate-900">
        <Sidebar />
        <main className="flex-1 ml-64">
          <Header />
          <div className="grid place-items-center h-96 text-red-600">{error}</div>
        </main>
      </div>
    );
  }

  if (!instructor) {
    return (
      <div className="flex min-h-screen bg-slate-50 font-sans text-slate-900">
        <Sidebar />
        <main className="flex-1 ml-64">
          <Header />
          <div className="grid place-items-center h-96 text-slate-500">Loading...</div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans text-slate-900">
      <Sidebar />
      <main className="flex-1 ml-64">
        <Header />

        <div className="h-64 bg-slate-800 w-full relative">
          <img
            src="https://images.unsplash.com/photo-1516321318423-f06f85e504b3?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80"
            alt="Cover"
            className="w-full h-full object-cover opacity-50"
          />
        </div>

        <div className="max-w-5xl mx-auto px-8 pb-12">
          <div className="relative -mt-20 flex flex-col md:flex-row gap-6 items-end mb-10">
            <img
              src={instructor.avatar_url || 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?ixlib=rb-4.0.3&auto=format&fit=crop&w=256&q=80'}
              alt={instructor.full_name}
              className="w-40 h-40 rounded-2xl border-4 border-white shadow-xl object-cover bg-white"
            />
            <div className="flex-1 pb-2">
              <h1 className="text-4xl font-bold text-slate-900">{instructor.full_name}</h1>
              <p className="text-lg text-slate-600 font-medium">{instructor.title || 'Instructor'}</p>
              <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-slate-500">
                {instructor.location && (
                  <span className="flex items-center gap-1"><MapPin className="w-4 h-4" /> {instructor.location}</span>
                )}
                {instructor.website && (
                  <a href={instructor.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:text-blue-600"><Globe className="w-4 h-4" /> {instructor.website.replace(/^https?:\/\//, '')}</a>
                )}
                <div className="flex gap-2 ml-auto">
                  <a href="#" className="p-2 bg-slate-100 rounded-full hover:bg-blue-100 hover:text-blue-600 transition-colors"><Twitter className="w-4 h-4" /></a>
                  <a href="#" className="p-2 bg-slate-100 rounded-full hover:bg-blue-100 hover:text-blue-600 transition-colors"><Linkedin className="w-4 h-4" /></a>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1 space-y-6">
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <h3 className="font-bold text-lg mb-4">About Me</h3>
                <p className="text-slate-600 text-sm leading-relaxed mb-6">
                  {instructor.bio || 'No bio available.'}
                </p>
                <div className="space-y-4 pt-4 border-t border-slate-100">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 text-sm flex items-center gap-2"><Users className="w-4 h-4" /> Total Students</span>
                    <span className="font-bold">{studentCount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 text-sm flex items-center gap-2"><BookOpen className="w-4 h-4" /> Courses</span>
                    <span className="font-bold">{courses.length}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-2">
              <h2 className="text-2xl font-bold text-slate-900 mb-6">Courses by {instructor.full_name.split(' ')[0]}</h2>
              {courses.length === 0 ? (
                <p className="text-slate-500">No published courses yet.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {courses.map((course) => (
                    <Link key={course.id} to={`/course/${course.id}`} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-shadow group block">
                      <div className="h-40 overflow-hidden">
                        <img
                          src={course.thumbnail_url || 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'}
                          alt={course.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      </div>
                      <div className="p-5">
                        <h3 className="font-bold text-slate-900 mb-2 line-clamp-1">{course.title}</h3>
                        <div className="flex items-center gap-4 text-sm text-slate-600">
                          <span className="flex items-center gap-1"><PlayCircle className="w-4 h-4" /> {course.modules?.length || 0} modules</span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
