import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import { Search, Filter, Star, Clock, BookOpen } from 'lucide-react';
import { Link } from 'react-router-dom';

const catalogCourses = [
  { id: 1, title: 'Complete Python Bootcamp', instructor: 'Dr. Angela Yu', rating: 4.8, reviews: '12k', duration: '22h 30m', level: 'Beginner', image: 'https://images.unsplash.com/photo-1526379095098-d400fd0bfce8?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80', price: '$49.99' },
  { id: 2, title: 'Advanced UX/UI Design', instructor: 'Gary Simon', rating: 4.9, reviews: '8k', duration: '15h 45m', level: 'Advanced', image: 'https://images.unsplash.com/photo-1561070791-2526d30994b5?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80', price: '$89.99' },
  { id: 3, title: 'Machine Learning A-Z', instructor: 'Kirill Eremenko', rating: 4.7, reviews: '24k', duration: '44h 10m', level: 'Intermediate', image: 'https://images.unsplash.com/photo-1555949963-aa79dcee981c?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80', price: '$94.99' },
  { id: 4, title: 'Digital Marketing Masterclass', instructor: 'Evan Kim', rating: 4.6, reviews: '5k', duration: '12h 20m', level: 'Beginner', image: 'https://images.unsplash.com/photo-1432888498266-38ffec3eaf0a?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80', price: '$39.99' },
  { id: 5, title: 'iOS App Development with Swift', instructor: 'Angela Yu', rating: 4.9, reviews: '18k', duration: '55h 00m', level: 'All Levels', image: 'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80', price: '$79.99' },
  { id: 6, title: 'Financial Analysis & Valuation', instructor: '365 Careers', rating: 4.7, reviews: '9k', duration: '18h 15m', level: 'Intermediate', image: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80', price: '$59.99' },
];

export default function Catalog() {
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

          <div className="flex flex-col md:flex-row gap-4 mb-8">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
              <input 
                type="text" 
                placeholder="Search for courses, skills, or instructors..." 
                className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
              />
            </div>
            <button className="flex items-center gap-2 px-6 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 hover:bg-slate-50 transition-colors shadow-sm">
              <Filter className="w-4 h-4" />
              Filters
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {catalogCourses.map((course) => (
              <div key={course.id} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-all group flex flex-col">
                <div className="h-48 overflow-hidden relative">
                  <img src={course.image} alt={course.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm px-2.5 py-1 rounded-lg text-xs font-bold text-slate-900 shadow-sm">
                    {course.level}
                  </div>
                </div>
                <div className="p-5 flex flex-col flex-1">
                  <h3 className="font-bold text-lg text-slate-900 mb-1 line-clamp-2">{course.title}</h3>
                  <p className="text-sm text-slate-500 mb-3">{course.instructor}</p>
                  
                  <div className="flex items-center gap-4 text-sm text-slate-600 mb-4">
                    <div className="flex items-center gap-1 text-amber-500 font-bold">
                      <Star className="w-4 h-4 fill-current" />
                      {course.rating} <span className="text-slate-400 font-normal">({course.reviews})</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4 text-slate-400" />
                      {course.duration}
                    </div>
                  </div>

                  <div className="mt-auto pt-4 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-xl font-bold text-slate-900">{course.price}</span>
                    <Link to={`/course/${course.id}`} className="px-4 py-2 bg-blue-50 text-blue-600 rounded-lg text-sm font-bold hover:bg-blue-100 transition-colors">
                      Enroll Now
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
