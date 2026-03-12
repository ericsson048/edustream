import InstructorSidebar from '../../components/InstructorSidebar';
import Header from '../../components/Header';
import { Calendar as CalendarIcon, Clock, Video, Users, Plus, MoreVertical } from 'lucide-react';
import { Link } from 'react-router-dom';

const mySessions = [
  { id: 1, title: 'Advanced React Patterns - Q&A', course: 'React Development', date: 'Today', time: '10:00 AM - 11:30 AM', students: 45, status: 'live' },
  { id: 2, title: 'Week 3 Code Review', course: 'React Development', date: 'Tomorrow', time: '2:00 PM - 3:30 PM', students: 32, status: 'upcoming' },
  { id: 3, title: 'State Management Workshop', course: 'React Development', date: 'Oct 28, 2024', time: '4:00 PM - 6:00 PM', students: 50, status: 'upcoming' },
];

export default function InstructorSchedule() {
  return (
    <div className="flex min-h-screen bg-slate-50 font-sans text-slate-900">
      <InstructorSidebar />
      <main className="flex-1 ml-64">
        <Header />
        <div className="p-8 max-w-6xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Schedule & Live Sessions</h1>
              <p className="text-slate-500 mt-1">Manage your upcoming classes and office hours.</p>
            </div>
            <button className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-colors shadow-sm">
              <Plus className="w-4 h-4" />
              Schedule New Session
            </button>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-6 border-b border-slate-200 bg-slate-50/50 flex gap-4">
              <button className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-700 shadow-sm">Upcoming</button>
              <button className="px-4 py-2 text-slate-500 hover:text-slate-900 text-sm font-bold transition-colors">Past Sessions</button>
              <button className="px-4 py-2 text-slate-500 hover:text-slate-900 text-sm font-bold transition-colors">Recordings</button>
            </div>

            <div className="divide-y divide-slate-100">
              {mySessions.map((session) => (
                <div key={session.id} className="p-6 hover:bg-slate-50 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div className="flex items-start gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${session.status === 'live' ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'}`}>
                      <Video className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="font-bold text-lg text-slate-900">{session.title}</h3>
                        {session.status === 'live' && (
                          <span className="flex items-center gap-1.5 bg-red-100 text-red-700 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
                            Live Now
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-slate-500 mb-3">{session.course}</p>
                      
                      <div className="flex flex-wrap items-center gap-4 text-sm text-slate-600">
                        <div className="flex items-center gap-1.5">
                          <CalendarIcon className="w-4 h-4 text-slate-400" />
                          <span className="font-medium">{session.date}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-4 h-4 text-slate-400" />
                          <span className="font-medium">{session.time}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Users className="w-4 h-4 text-slate-400" />
                          <span className="font-medium">{session.students} Enrolled</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 md:ml-auto">
                    {session.status === 'live' ? (
                      <Link to={`/live/${session.id}`} className="px-6 py-2.5 bg-red-600 text-white rounded-xl text-sm font-bold hover:bg-red-700 transition-colors shadow-sm">
                        Enter Room
                      </Link>
                    ) : (
                      <button className="px-6 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl text-sm font-bold hover:bg-slate-50 transition-colors shadow-sm">
                        Edit Details
                      </button>
                    )}
                    <button className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                      <MoreVertical className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
