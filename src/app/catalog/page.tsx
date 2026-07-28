import Sidebar from '../../components/Sidebar';
import Header from '../../components/Header';
import { Search, Filter, Star, Clock, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import { courseService } from '../../services/courseService';
import type { Course, Enrollment } from '../../types/lms';
import { useToast } from '../../contexts/ToastContext';

const LEVELS = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'ALL'] as const;

export default function Catalog() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [query, setQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [levelFilter, setLevelFilter] = useState<string>('');
  const [priceMax, setPriceMax] = useState<string>('');
  const { showToast } = useToast();

  useEffect(() => {
    Promise.all([
      courseService.listCourses({ is_published: true }),
      courseService.listEnrollments({ is_active: true }),
    ])
      .then(([courseList, enrollmentList]) => {
        setCourses(courseList);
        setEnrollments(enrollmentList);
      })
      .catch(() => {
        showToast('Impossible de charger les cours.', 'error');
      });
  }, [showToast]);

  const enrolledCourseIds = useMemo(() => new Set(enrollments.map((enrollment) => enrollment.course)), [enrollments]);

  const activeFilterCount = (levelFilter ? 1 : 0) + (priceMax ? 1 : 0);

  const filteredCourses = useMemo(
    () =>
      courses.filter((course) => {
        const matchesQuery = `${course.title} ${course.description} ${course.instructor_name || ''}`.toLowerCase().includes(query.toLowerCase());
        const matchesLevel = !levelFilter || course.level === levelFilter;
        const matchesPrice = !priceMax || parseFloat(course.price) <= parseFloat(priceMax);
        return matchesQuery && matchesLevel && matchesPrice;
      }),
    [courses, query, levelFilter, priceMax],
  );

  const clearFilters = () => {
    setLevelFilter('');
    setPriceMax('');
  };

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans text-slate-900">
      <Sidebar />
      <main className="flex-1 ml-64">
        <Header />
        <div className="p-8 max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Course Catalog</h1>
              <p className="text-slate-500 mt-1">Discover new skills and advance your career.</p>
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search for courses, skills, or instructors..."
                className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-6 py-3 bg-white border rounded-xl text-sm font-bold transition-colors shadow-sm ${
                showFilters || activeFilterCount > 0 ? 'border-blue-300 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <Filter className="w-4 h-4" />
              Filters
              {activeFilterCount > 0 && (
                <span className="w-5 h-5 bg-blue-600 text-white rounded-full text-xs flex items-center justify-center">{activeFilterCount}</span>
              )}
            </button>
          </div>

          {showFilters && (
            <div className="bg-white border border-slate-200 rounded-xl p-5 mb-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-slate-700">Filters</h3>
                {activeFilterCount > 0 && (
                  <button onClick={clearFilters} className="text-xs text-blue-600 hover:text-blue-700 font-bold flex items-center gap-1">
                    <X className="w-3 h-3" /> Clear all
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Level</label>
                  <div className="flex flex-wrap gap-2">
                    {LEVELS.map((level) => (
                      <button
                        key={level}
                        onClick={() => setLevelFilter(levelFilter === level ? '' : level)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                          levelFilter === level ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {level === 'ALL' ? 'All Levels' : level.charAt(0) + level.slice(1).toLowerCase()}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Max Price ($)</label>
                  <input
                    type="number"
                    min="0"
                    step="5"
                    value={priceMax}
                    onChange={(e) => setPriceMax(e.target.value)}
                    placeholder="No limit"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCourses.map((course) => {
              const isEnrolled = enrolledCourseIds.has(course.id);
              const rating = course.average_rating ?? null;
              return (
                <div key={course.id} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-all group flex flex-col">
                  <div className="h-48 overflow-hidden relative">
                    <img src={course.thumbnail || course.thumbnail_url || 'https://images.unsplash.com/photo-1526379095098-d400fd0bfce8?auto=format&fit=crop&w=800&q=80'} alt={course.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm px-2.5 py-1 rounded-lg text-xs font-bold text-slate-900 shadow-sm">
                      {course.level === 'ALL' ? 'All Levels' : course.level.charAt(0) + course.level.slice(1).toLowerCase()}
                    </div>
                  </div>
                  <div className="p-5 flex flex-col flex-1">
                    <h3 className="font-bold text-lg text-slate-900 mb-1 line-clamp-2">{course.title}</h3>
                    <p className="text-sm text-slate-500 mb-3">{course.instructor_name || 'Instructor'}</p>

                    <div className="flex items-center gap-4 text-sm text-slate-600 mb-4">
                      {rating != null ? (
                        <div className="flex items-center gap-1 text-amber-500 font-bold">
                          <Star className="w-4 h-4 fill-current" />
                          {rating.toFixed(1)}
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-slate-400 text-xs">No reviews</div>
                      )}
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4 text-slate-400" />
                        Self paced
                      </div>
                    </div>

                    <div className="mt-auto pt-4 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-xl font-bold text-slate-900">${course.price}</span>
                      <Link
                        to={isEnrolled ? `/player/${course.id}` : `/course/${course.id}`}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${
                          isEnrolled ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100' : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                        }`}
                      >
                        {isEnrolled ? 'Continue Learning' : 'Enroll Now'}
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
            {filteredCourses.length === 0 && (
              <div className="col-span-full text-center py-16 text-slate-500">
                <p className="text-lg font-bold mb-1">No courses found</p>
                <p className="text-sm">Try adjusting your search or filters.</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
