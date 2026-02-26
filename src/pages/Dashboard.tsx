import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import { PlayCircle, CheckCircle, Star, MoreHorizontal, ArrowRight } from 'lucide-react';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Link } from 'react-router-dom';

const data = [
  { name: 'Mon', hours: 2.5 },
  { name: 'Tue', hours: 3.8 },
  { name: 'Wed', hours: 5.2 },
  { name: 'Thu', hours: 3.0 },
  { name: 'Fri', hours: 4.5 },
  { name: 'Sat', hours: 1.8 },
  { name: 'Sun', hours: 1.2 },
];

export default function Dashboard() {
  return (
    <div className="flex min-h-screen bg-slate-50 font-sans text-slate-900">
      <Sidebar />
      
      <main className="flex-1 ml-64">
        <Header />
        
        <div className="p-8 max-w-7xl mx-auto">
          {/* Welcome Section */}
          <div className="mb-8">
            <h2 className="text-3xl font-extrabold text-slate-900 mb-1">Welcome back, Alex! 👋</h2>
            <p className="text-slate-500">You've completed 85% of your weekly goal. Keep it up!</p>
          </div>

          {/* Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {[
              { label: 'Courses in Progress', value: '4', icon: PlayCircle, color: 'text-blue-600', bg: 'bg-blue-100', badge: '+1 this week' },
              { label: 'Completed Courses', value: '12', icon: CheckCircle, color: 'text-purple-600', bg: 'bg-purple-100', badge: '+2 this month' },
              { label: 'Average Score', value: '92%', icon: Star, color: 'text-amber-600', bg: 'bg-amber-100', badge: '+5% avg' },
            ].map((stat, i) => (
              <div key={i} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                <div className="flex items-center justify-between mb-4">
                  <div className={`w-12 h-12 ${stat.bg} ${stat.color} rounded-xl flex items-center justify-center`}>
                    <stat.icon className="w-6 h-6" />
                  </div>
                  <span className="text-emerald-600 text-xs font-bold bg-emerald-50 px-2 py-1 rounded-lg">{stat.badge}</span>
                </div>
                <p className="text-slate-500 text-sm font-medium">{stat.label}</p>
                <p className="text-3xl font-bold mt-1">{stat.value}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column: Recent Courses & Chart */}
            <div className="lg:col-span-2 space-y-8">
              {/* Recent Courses */}
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold">Recent Courses</h3>
                  <Link to="/courses" className="text-blue-600 text-sm font-bold hover:underline">View All</Link>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Course Card 1 */}
                  <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-100 group">
                    <div className="h-40 bg-slate-200 relative overflow-hidden">
                      <img 
                        src="https://images.unsplash.com/photo-1555099962-4199c345e5dd?ixlib=rb-4.0.3&auto=format&fit=crop&w=1740&q=80" 
                        alt="Code" 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                      <span className="absolute bottom-3 left-4 px-2 py-1 bg-blue-600 text-white text-[10px] font-bold rounded uppercase tracking-wider">Development</span>
                    </div>
                    <div className="p-5">
                      <h4 className="font-bold text-lg mb-1">Advanced React Patterns</h4>
                      <p className="text-slate-500 text-sm mb-4">Section 4: Custom Hooks & Performance</p>
                      
                      <div className="flex items-center gap-4 mb-4">
                        <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-blue-600 w-[75%] rounded-full"></div>
                        </div>
                        <span className="text-xs font-bold text-slate-700">75%</span>
                      </div>
                      
                      <Link to="/player" className="block w-full py-2.5 bg-slate-900 text-white text-center rounded-xl text-sm font-bold hover:bg-blue-600 transition-colors">
                        Continue Lesson
                      </Link>
                    </div>
                  </div>

                  {/* Course Card 2 */}
                  <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-100 group">
                    <div className="h-40 bg-slate-200 relative overflow-hidden">
                      <img 
                        src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?ixlib=rb-4.0.3&auto=format&fit=crop&w=1740&q=80" 
                        alt="Data" 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                      <span className="absolute bottom-3 left-4 px-2 py-1 bg-emerald-500 text-white text-[10px] font-bold rounded uppercase tracking-wider">Data Science</span>
                    </div>
                    <div className="p-5">
                      <h4 className="font-bold text-lg mb-1">Machine Learning Basics</h4>
                      <p className="text-slate-500 text-sm mb-4">Section 2: Linear Regression</p>
                      
                      <div className="flex items-center gap-4 mb-4">
                        <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-emerald-500 w-[30%] rounded-full"></div>
                        </div>
                        <span className="text-xs font-bold text-slate-700">30%</span>
                      </div>
                      
                      <button className="w-full py-2.5 bg-slate-900 text-white rounded-xl text-sm font-bold hover:bg-blue-600 transition-colors">
                        Continue Lesson
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Study Activity Chart */}
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-bold">Study Activity</h3>
                  <select className="bg-slate-50 border-none text-xs font-bold text-slate-500 rounded-lg py-1 px-2 outline-none">
                    <option>This Week</option>
                    <option>Last Week</option>
                  </select>
                </div>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data} barSize={40}>
                      <XAxis 
                        dataKey="name" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 500 }} 
                        dy={10}
                      />
                      <Tooltip 
                        cursor={{ fill: 'transparent' }}
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      />
                      <Bar dataKey="hours" radius={[6, 6, 6, 6]}>
                        {data.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.name === 'Wed' ? '#2563eb' : '#e2e8f0'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-8">
              {/* Learning Goal */}
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 text-center">
                <h3 className="text-lg font-bold mb-6 text-left">Learning Goal</h3>
                <div className="relative w-40 h-40 mx-auto mb-6">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle cx="80" cy="80" r="70" fill="transparent" stroke="#f1f5f9" strokeWidth="12" />
                    <circle 
                      cx="80" 
                      cy="80" 
                      r="70" 
                      fill="transparent" 
                      stroke="#2563eb" 
                      strokeWidth="12" 
                      strokeDasharray={440} 
                      strokeDashoffset={440 - (440 * 0.85)} 
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-4xl font-extrabold text-slate-900">85%</span>
                    <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mt-1">Complete</span>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between text-sm p-3 bg-slate-50 rounded-xl">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 bg-blue-600 rounded-full"></span>
                      <span className="text-slate-600 font-medium">Completed</span>
                    </div>
                    <span className="font-bold text-slate-900">24</span>
                  </div>
                  <div className="flex items-center justify-between text-sm p-3 bg-slate-50 rounded-xl">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 bg-slate-300 rounded-full"></span>
                      <span className="text-slate-600 font-medium">Remaining</span>
                    </div>
                    <span className="font-bold text-slate-900">4</span>
                  </div>
                </div>
              </div>

              {/* Upcoming Deadlines */}
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-bold">Upcoming Deadlines</h3>
                  <MoreHorizontal className="text-slate-400 w-5 h-5 cursor-pointer" />
                </div>
                
                <div className="space-y-5">
                  {[
                    { day: '12', month: 'Oct', title: 'Final UX Research Report', course: 'Design Systems 101', color: 'text-rose-600', bg: 'bg-rose-50' },
                    { day: '15', month: 'Oct', title: 'Python Quiz: Arrays', course: 'CS Foundations', color: 'text-blue-600', bg: 'bg-blue-50' },
                    { day: '18', month: 'Oct', title: 'History Essay Draft', course: 'World History II', color: 'text-emerald-600', bg: 'bg-emerald-50' },
                  ].map((task, i) => (
                    <div key={i} className="flex gap-4 items-center group cursor-pointer">
                      <div className={`flex flex-col items-center justify-center w-12 h-12 ${task.bg} ${task.color} rounded-xl group-hover:scale-110 transition-transform`}>
                        <span className="text-[10px] font-bold uppercase">{task.month}</span>
                        <span className="text-lg font-black leading-none">{task.day}</span>
                      </div>
                      <div className="flex-1">
                        <h4 className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors">{task.title}</h4>
                        <p className="text-xs text-slate-500">{task.course}</p>
                      </div>
                    </div>
                  ))}
                </div>
                
                <button className="w-full mt-6 py-3 border border-slate-200 text-slate-600 text-sm font-bold rounded-xl hover:bg-slate-50 transition-colors flex items-center justify-center gap-2">
                  View Full Schedule
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
