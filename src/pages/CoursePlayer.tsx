import { Play, Pause, Volume2, Settings, Maximize, ChevronRight, CheckCircle, Circle, Lock, MessageSquare, FileText, Download, Clock, Search, Bell, BookOpen } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';

export default function CoursePlayer() {
  const [isPlaying, setIsPlaying] = useState(false);

  return (
    <div className="flex flex-col h-screen bg-slate-50 font-sans">
      {/* Top Navigation Bar */}
      <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 sticky top-0 z-30">
        <div className="flex items-center gap-8">
          <Link to="/dashboard" className="flex items-center gap-2">
            <div className="bg-blue-600 p-1.5 rounded-lg text-white">
              <BookOpen className="w-5 h-5" />
            </div>
            <span className="font-bold text-lg tracking-tight text-slate-900">EduStream LMS</span>
          </Link>
          
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
            <Link to="/dashboard" className="text-slate-500 hover:text-slate-900 transition-colors">Dashboard</Link>
            <Link to="/courses" className="text-blue-600 font-bold">My Courses</Link>
            <a href="#" className="text-slate-500 hover:text-slate-900 transition-colors">Resources</a>
          </nav>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="relative hidden md:block w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input 
              type="text" 
              placeholder="Search lessons..." 
              className="w-full pl-9 pr-4 py-2 bg-slate-100 border-none rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button className="p-2 text-slate-500 hover:bg-slate-100 rounded-full transition-colors relative">
            <Bell className="w-5 h-5" />
            <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
          </button>
          <div className="w-9 h-9 rounded-full bg-slate-200 overflow-hidden border border-slate-200">
             <img src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80" alt="User" />
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Main Content Area */}
        <div className="flex-1 flex flex-col overflow-y-auto">
          <div className="p-6 max-w-5xl mx-auto w-full">
            {/* Breadcrumbs */}
            <div className="flex items-center gap-2 text-sm text-slate-500 mb-6">
              <Link to="/courses" className="hover:text-blue-600 transition-colors">React Development</Link>
              <ChevronRight className="w-4 h-4" />
              <span>Advanced Hooks</span>
              <ChevronRight className="w-4 h-4" />
              <span className="font-bold text-slate-900">Mastering useEffect</span>
            </div>

            {/* Video Player */}
            <div className="aspect-video bg-black rounded-2xl overflow-hidden shadow-xl relative group">
              <img 
                src="https://images.unsplash.com/photo-1555099962-4199c345e5dd?ixlib=rb-4.0.3&auto=format&fit=crop&w=1740&q=80" 
                alt="Video thumbnail" 
                className="w-full h-full object-cover opacity-60"
              />
              
              {/* Overlay Controls */}
              <div className="absolute inset-0 flex items-center justify-center">
                <button 
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="w-20 h-20 bg-blue-600/90 hover:bg-blue-600 text-white rounded-full flex items-center justify-center transition-transform hover:scale-110 shadow-lg backdrop-blur-sm"
                >
                  {isPlaying ? <Pause className="w-8 h-8 fill-current" /> : <Play className="w-8 h-8 fill-current ml-1" />}
                </button>
              </div>

              {/* Bottom Bar */}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent p-6 opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="w-full bg-white/20 h-1.5 rounded-full mb-4 cursor-pointer overflow-hidden">
                  <div className="bg-blue-500 h-full w-[35%] relative">
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-md scale-0 group-hover/bar:scale-100 transition-transform"></div>
                  </div>
                </div>
                
                <div className="flex items-center justify-between text-white">
                  <div className="flex items-center gap-6">
                    <button onClick={() => setIsPlaying(!isPlaying)}>
                      {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current" />}
                    </button>
                    <div className="flex items-center gap-2 group/vol">
                      <Volume2 className="w-5 h-5" />
                      <div className="w-0 overflow-hidden group-hover/vol:w-20 transition-all duration-300">
                        <div className="w-20 h-1 bg-white/30 rounded-full ml-2">
                          <div className="w-[70%] h-full bg-white rounded-full"></div>
                        </div>
                      </div>
                    </div>
                    <span className="text-sm font-medium font-mono">08:24 / 24:15</span>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <Settings className="w-5 h-5 cursor-pointer hover:rotate-45 transition-transform" />
                    <Maximize className="w-5 h-5 cursor-pointer hover:scale-110 transition-transform" />
                  </div>
                </div>
              </div>
            </div>

            {/* Lesson Info */}
            <div className="mt-8 flex items-start justify-between">
              <div>
                <h1 className="text-3xl font-bold text-slate-900 mb-2">Understanding the useEffect Hook</h1>
                <div className="flex items-center gap-4 text-sm text-slate-500">
                  <span className="flex items-center gap-1"><Clock className="w-4 h-4" /> 24 mins</span>
                  <span className="flex items-center gap-1"><Settings className="w-4 h-4" /> Advanced</span>
                  <span>Updated Jan 2024</span>
                </div>
              </div>
              <button className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold text-sm shadow-lg shadow-blue-600/20 hover:bg-blue-700 transition-all flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                Ask Instructor
              </button>
            </div>

            {/* Tabs */}
            <div className="mt-10 border-b border-slate-200">
              <div className="flex gap-8">
                {['Course Content', 'Notes', 'Discussion', 'Resources'].map((tab, i) => (
                  <button 
                    key={tab}
                    className={`pb-4 text-sm font-bold border-b-2 transition-colors ${
                      i === 0 
                        ? 'border-blue-600 text-blue-600' 
                        : 'border-transparent text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            {/* Tab Content */}
            <div className="mt-8">
              <h3 className="text-lg font-bold mb-4">About this lesson</h3>
              <p className="text-slate-600 leading-relaxed max-w-3xl">
                In this lesson, we'll dive deep into the lifecycle of a component using the useEffect hook. 
                We will explore how to manage side effects, clean up intervals and subscriptions, and optimize performance by correctly managing the dependency array.
                By the end of this module, you'll be able to handle complex asynchronous operations within your React functional components with confidence.
              </p>
            </div>
          </div>
        </div>

        {/* Right Sidebar - Course Content */}
        <aside className="w-96 bg-white border-l border-slate-200 flex flex-col h-full overflow-hidden shrink-0">
          <div className="p-6 border-b border-slate-100">
            <h3 className="font-bold text-lg">Course Content</h3>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Module 1 */}
            <div className="bg-slate-50 rounded-xl border border-slate-100 overflow-hidden">
              <div className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-100 transition-colors">
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Module 1</p>
                  <h4 className="font-bold text-slate-900">Introduction to Hooks</h4>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-400 rotate-90" />
              </div>
              <div className="border-t border-slate-100">
                {[
                  { title: 'Why Hooks?', duration: '05:12', completed: true },
                  { title: 'useState Fundamentals', duration: '12:45', completed: true },
                ].map((lesson, i) => (
                  <div key={i} className="flex items-start gap-3 p-4 hover:bg-white transition-colors cursor-pointer border-b border-slate-100 last:border-0">
                    <CheckCircle className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-slate-900">{lesson.title}</p>
                      <p className="text-xs text-slate-500 mt-1">{lesson.duration}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Module 2 - Active */}
            <div className="bg-blue-50/50 rounded-xl border border-blue-100 overflow-hidden ring-2 ring-blue-600/20">
              <div className="p-4 flex items-center justify-between cursor-pointer bg-blue-50">
                <div>
                  <p className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-1">Module 2</p>
                  <h4 className="font-bold text-slate-900">Side Effects with useEffect</h4>
                </div>
                <ChevronRight className="w-5 h-5 text-blue-600 rotate-90" />
              </div>
              <div className="border-t border-blue-100">
                <div className="flex items-start gap-3 p-4 bg-blue-100/50 cursor-pointer border-l-4 border-blue-600">
                  <div className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center shrink-0 mt-0.5">
                    <Play className="w-2.5 h-2.5 text-white fill-current ml-0.5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-blue-900">Mastering useEffect</p>
                    <p className="text-xs text-blue-600 mt-1">24:15</p>
                  </div>
                </div>
                {[
                  { title: 'Cleanup Functions', duration: '10:30' },
                  { title: 'Dependency Best Practices', duration: '18:20' },
                ].map((lesson, i) => (
                  <div key={i} className="flex items-start gap-3 p-4 hover:bg-blue-50 transition-colors cursor-pointer border-b border-blue-100/50 last:border-0">
                    <Circle className="w-5 h-5 text-slate-300 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-slate-700">{lesson.title}</p>
                      <p className="text-xs text-slate-500 mt-1">{lesson.duration}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Module 3 - Locked */}
            <div className="bg-white rounded-xl border border-slate-100 overflow-hidden opacity-60">
              <div className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Module 3</p>
                  <h4 className="font-bold text-slate-900">Performance Hooks</h4>
                </div>
                <Lock className="w-4 h-4 text-slate-400" />
              </div>
            </div>
          </div>
          
          <div className="p-4 border-t border-slate-200 bg-slate-50">
            <div className="flex items-center justify-between text-xs font-bold text-slate-500 mb-2">
              <span>Course Progress</span>
              <span className="text-blue-600">45%</span>
            </div>
            <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
              <div className="bg-blue-600 h-full w-[45%] rounded-full"></div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
