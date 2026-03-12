import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import { Calendar as CalendarIcon, Clock, Video, Users, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const upcomingSessions = [
  { id: 1, title: 'Advanced React Patterns - Q&A', course: 'React Development', date: 'Today', time: '10:00 AM - 11:30 AM', instructor: 'Sarah Chen', status: 'live' },
  { id: 2, title: 'Project Architecture Review', course: 'Full-Stack Node.js', date: 'Tomorrow', time: '2:00 PM - 3:00 PM', instructor: 'Mike Johnson', status: 'upcoming' },
  { id: 3, title: 'Weekly Office Hours', course: 'UI/UX Design', date: 'Oct 28, 2024', time: '4:00 PM - 5:00 PM', instructor: 'Emma Davis', status: 'upcoming' },
];

export default function StudentSchedule() {
  return (
    <div className="flex min-h-screen bg-slate-50 font-sans text-slate-900">
      <Sidebar />
      <main className="flex-1 ml-64">
        <Header />
        <div className="p-8 max-w-5xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Live Sessions</h1>
              <p className="text-slate-500 mt-1">Join interactive classes and office hours.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main List */}
            <div className="lg:col-span-2 space-y-6">
              <h2 className="text-lg font-bold mb-4">Upcoming Schedule</h2>
              
              {upcomingSessions.map((session) => (
                <div key={session.id} className={`bg-white rounded-2xl p-6 border transition-shadow hover:shadow-md ${session.status === 'live' ? 'border-red-200 shadow-sm ring-1 ring-red-100' : 'border-slate-200 shadow-sm'}`}>
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${session.status === 'live' ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'}`}>
                        <Video className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="font-bold text-lg text-slate-900">{session.title}</h3>
                        <p className="text-sm text-slate-500">{session.course}</p>
                      </div>
                    </div>
                    {session.status === 'live' && (
                      <span className="flex items-center gap-1.5 bg-red-100 text-red-700 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                        <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                        Live Now
                      </span>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 mb-6 p-4 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <CalendarIcon className="w-4 h-4 text-slate-400" />
                      <span className="font-medium">{session.date}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Clock className="w-4 h-4 text-slate-400" />
                      <span className="font-medium">{session.time}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-600 col-span-2">
                      <Users className="w-4 h-4 text-slate-400" />
                      <span className="font-medium">Instructor: {session.instructor}</span>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    {session.status === 'live' ? (
                      <Link to={`/live/${session.id}`} className="flex items-center gap-2 px-6 py-2.5 bg-red-600 text-white rounded-xl text-sm font-bold hover:bg-red-700 transition-colors shadow-sm">
                        Join Meeting <ArrowRight className="w-4 h-4" />
                      </Link>
                    ) : (
                      <button className="px-6 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl text-sm font-bold hover:bg-slate-50 transition-colors">
                        Add to Calendar
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Sidebar Calendar Widget */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sticky top-24">
                <h3 className="font-bold text-lg mb-4">October 2024</h3>
                {/* Simple Calendar Mockup */}
                <div className="grid grid-cols-7 gap-1 text-center text-xs mb-4">
                  {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
                    <div key={d} className="font-bold text-slate-400 py-1">{d}</div>
                  ))}
                  {Array.from({ length: 31 }).map((_, i) => (
                    <div 
                      key={i} 
                      className={`py-2 rounded-lg font-medium cursor-pointer ${
                        i + 1 === 24 ? 'bg-blue-600 text-white shadow-sm' : 
                        [25, 28].includes(i + 1) ? 'bg-blue-50 text-blue-600 font-bold' : 
                        'text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {i + 1}
                    </div>
                  ))}
                </div>
                <div className="pt-4 border-t border-slate-100">
                  <p className="text-sm text-slate-500 mb-2">Upcoming this week</p>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-bold text-slate-900">3 Live Sessions</span>
                    <span className="text-blue-600 font-medium">View all</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
