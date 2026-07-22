import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import { PlayCircle, Clock, Video, Star, Filter, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';

const courses = [
  {
    id: 1,
    title: 'Advanced UI Design with Tailwind CSS',
    instructor: 'Sarah Chen',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
    category: 'Programming',
    image: 'https://images.unsplash.com/photo-1587620962725-abab7fe55159?ixlib=rb-4.0.3&auto=format&fit=crop&w=1631&q=80',
    progress: 65,
    color: 'bg-blue-600',
    status: 'In Progress'
  },
  {
    id: 2,
    title: 'Data Science for Business Leaders',
    instructor: 'Dr. Marcus Vance',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
    category: 'Business',
    image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?ixlib=rb-4.0.3&auto=format&fit=crop&w=1740&q=80',
    progress: 28,
    color: 'bg-green-500',
    status: 'In Progress'
  },
  {
    id: 3,
    title: 'Growth Hacking: Mastering SEO & PPC',
    instructor: 'Emily Rodriguez',
    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
    category: 'Marketing',
    image: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?ixlib=rb-4.0.3&auto=format&fit=crop&w=1615&q=80',
    rating: 4.9,
    lessons: 48,
    duration: '12h 45m',
    color: 'bg-orange-500',
    status: 'Not Started'
  },
  {
    id: 4,
    title: 'User Experience Foundations',
    instructor: 'Jason Keller',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
    category: 'Design',
    image: 'https://images.unsplash.com/photo-1586717791821-3f44a5638d48?ixlib=rb-4.0.3&auto=format&fit=crop&w=1740&q=80',
    rating: 4.7,
    lessons: 62,
    duration: '18h 20m',
    color: 'bg-purple-600',
    status: 'Not Started'
  },
  {
    id: 5,
    title: 'Python for Machine Learning & AI',
    instructor: 'Amelia Tan',
    avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
    category: 'Programming',
    image: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?ixlib=rb-4.0.3&auto=format&fit=crop&w=1740&q=80',
    progress: 82,
    color: 'bg-blue-600',
    status: 'In Progress'
  },
  {
    id: 6,
    title: 'Academic Writing & Research Methods',
    instructor: 'Prof. Hugh Grant',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
    category: 'Completed',
    image: 'https://images.unsplash.com/photo-1456324504439-367cee101252?ixlib=rb-4.0.3&auto=format&fit=crop&w=1740&q=80',
    status: 'Completed'
  }
];

export default function MyCourses() {
  return (
    <div className="flex min-h-screen bg-slate-50 font-sans text-slate-900">
      <Sidebar />
      
      <main className="flex-1 ml-64">
        <Header />
        
        <div className="p-8 max-w-7xl mx-auto">
          {/* Page Header */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 tracking-tight">My Learning Journey</h1>
              <p className="text-slate-500 mt-1">Continue where you left off or explore new horizons.</p>
            </div>
            <div className="flex items-center gap-3">
              <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors">
                <Filter className="w-4 h-4" />
                Filter
              </button>
              <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 transition-colors">
                <Plus className="w-4 h-4" />
                Browse Courses
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-slate-200 mb-8 overflow-x-auto">
            {['All Courses', 'In Progress', 'Completed', 'Wishlist'].map((tab, i) => (
              <button 
                key={tab}
                className={`px-6 py-3 text-sm font-semibold border-b-2 whitespace-nowrap transition-colors ${
                  i === 0 ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Course Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {courses.map((course) => (
              <div key={course.id} className={`bg-white rounded-xl border border-slate-200 overflow-hidden group flex flex-col h-full hover:shadow-lg transition-shadow duration-300 ${course.status === 'Completed' ? 'opacity-90 grayscale-[0.2]' : ''}`}>
                <div className="relative h-48 overflow-hidden">
                  <img 
                    src={course.image} 
                    alt={course.title} 
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                  {course.status === 'Completed' ? (
                    <div className="absolute inset-0 bg-slate-900/40 flex items-center justify-center backdrop-blur-[2px]">
                      <div className="bg-green-500 text-white px-4 py-2 rounded-lg font-bold text-xs uppercase flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        Completed
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className={`absolute top-3 left-3 px-2 py-1 ${course.color || 'bg-slate-800'} text-white text-[10px] font-bold rounded uppercase tracking-wider`}>
                        {course.category}
                      </div>
                      {course.rating && (
                        <div className="absolute top-3 right-3 px-2 py-1 bg-white/90 text-slate-900 text-xs font-bold rounded shadow-sm flex items-center gap-1">
                          <Star className="w-3 h-3 text-yellow-500 fill-current" />
                          {course.rating}
                        </div>
                      )}
                    </>
                  )}
                </div>

                <div className="p-6 flex flex-col flex-1">
                  <h3 className="text-lg font-bold text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-2">{course.title}</h3>
                  
                  <div className="flex items-center gap-2 mt-3 mb-4">
                    <img src={course.avatar} alt={course.instructor} className="w-6 h-6 rounded-full" />
                    <span className="text-xs text-slate-500">{course.instructor}</span>
                  </div>

                  {course.status === 'In Progress' && (
                    <div className="mt-auto">
                      <div className="flex justify-between items-center text-xs font-semibold mb-2">
                        <span className="text-slate-600">Progress</span>
                        <span className="text-blue-600">{course.progress}%</span>
                      </div>
                      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden mb-6">
                        <div className="bg-blue-600 h-full rounded-full" style={{ width: `${course.progress}%` }}></div>
                      </div>
                      <Link to="/player" className="w-full py-2.5 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 transition-all flex items-center justify-center gap-2">
                        Continue Learning
                        <PlayCircle className="w-4 h-4" />
                      </Link>
                    </div>
                  )}

                  {course.status === 'Not Started' && (
                    <div className="mt-auto">
                      <div className="flex items-center gap-4 text-xs text-slate-500 mb-6">
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {course.duration}</span>
                        <span className="flex items-center gap-1"><Video className="w-3 h-3" /> {course.lessons} lessons</span>
                      </div>
                      <div className="flex gap-3">
                        <button className="flex-1 py-2.5 bg-blue-50 text-blue-600 rounded-lg text-sm font-bold hover:bg-blue-100 transition-all">Details</button>
                        <button className="flex-[2] py-2.5 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 transition-all">Enroll Now</button>
                      </div>
                    </div>
                  )}

                  {course.status === 'Completed' && (
                    <div className="mt-auto pt-4">
                      <Link to="/certificate" className="w-full py-2.5 border border-slate-200 text-slate-700 rounded-lg text-sm font-bold hover:bg-slate-50 transition-all flex items-center justify-center gap-2">
                        View Certificate
                        <Star className="w-4 h-4" />
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          <div className="mt-12 flex items-center justify-between border-t border-slate-200 pt-6">
            <p className="text-sm text-slate-500">Showing 6 of 24 courses</p>
            <div className="flex items-center gap-2">
              <button className="w-10 h-10 flex items-center justify-center rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors text-slate-500">
                &larr;
              </button>
              <button className="w-10 h-10 flex items-center justify-center rounded-lg bg-blue-600 text-white font-bold text-sm">1</button>
              <button className="w-10 h-10 flex items-center justify-center rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors text-sm font-medium text-slate-600">2</button>
              <button className="w-10 h-10 flex items-center justify-center rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors text-sm font-medium text-slate-600">3</button>
              <button className="w-10 h-10 flex items-center justify-center rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors text-slate-500">
                &rarr;
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
