import { useState } from 'react';
import { Mic, MicOff, Video as VideoIcon, VideoOff, MonitorUp, PhoneOff, MessageSquare, Users, Settings, Hand, MoreVertical } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function LiveMeeting() {
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [activeTab, setActiveTab] = useState<'chat' | 'participants'>('chat');
  const navigate = useNavigate();

  return (
    <div className="flex h-screen bg-slate-900 text-slate-100 font-sans overflow-hidden">
      {/* Main Video Area */}
      <div className="flex-1 flex flex-col relative">
        {/* Header */}
        <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center z-10 bg-gradient-to-b from-slate-900/80 to-transparent">
          <div>
            <h1 className="text-lg font-bold text-white">Advanced React Patterns - Q&A Session</h1>
            <p className="text-xs text-slate-300">Instructor: Sarah Chen • 00:45:12</p>
          </div>
          <div className="flex items-center gap-2 bg-red-500/20 text-red-500 px-3 py-1 rounded-full text-xs font-bold border border-red-500/30">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
            REC
          </div>
        </div>

        {/* Video Grid */}
        <div className="flex-1 p-4 pt-20 pb-24 flex items-center justify-center">
          <div className="w-full h-full max-w-6xl grid grid-cols-3 grid-rows-2 gap-4">
            {/* Instructor (Large) */}
            <div className="col-span-2 row-span-2 bg-slate-800 rounded-2xl overflow-hidden relative border border-slate-700 shadow-2xl">
              <img src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?ixlib=rb-4.0.3&auto=format&fit=crop&w=1600&q=80" alt="Instructor" className="w-full h-full object-cover" />
              <div className="absolute bottom-4 left-4 bg-slate-900/80 backdrop-blur-md px-3 py-1.5 rounded-lg text-sm font-bold flex items-center gap-2">
                Sarah Chen (Host)
              </div>
            </div>
            
            {/* Students (Small) */}
            {[
              { name: 'Alex Johnson', img: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=400&h=400&q=80' },
              { name: 'Maria Garcia', img: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=400&h=400&q=80' },
            ].map((student, i) => (
              <div key={i} className="bg-slate-800 rounded-2xl overflow-hidden relative border border-slate-700">
                <img src={student.img} alt={student.name} className="w-full h-full object-cover" />
                <div className="absolute bottom-3 left-3 bg-slate-900/80 backdrop-blur-md px-2 py-1 rounded-md text-xs font-bold">
                  {student.name}
                </div>
                {i === 0 && (
                  <div className="absolute top-3 right-3 bg-slate-900/80 p-1.5 rounded-md text-red-500">
                    <MicOff className="w-3 h-3" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Bottom Controls */}
        <div className="absolute bottom-0 left-0 right-0 h-20 bg-slate-900 border-t border-slate-800 flex items-center justify-between px-8">
          <div className="flex items-center gap-4 text-sm font-medium text-slate-400">
            <span>24 Participants</span>
          </div>
          
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsMuted(!isMuted)}
              className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${isMuted ? 'bg-red-500/20 text-red-500 hover:bg-red-500/30' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
            >
              {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </button>
            <button 
              onClick={() => setIsVideoOff(!isVideoOff)}
              className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${isVideoOff ? 'bg-red-500/20 text-red-500 hover:bg-red-500/30' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
            >
              {isVideoOff ? <VideoOff className="w-5 h-5" /> : <VideoIcon className="w-5 h-5" />}
            </button>
            <button className="w-12 h-12 rounded-full bg-slate-800 text-slate-300 flex items-center justify-center hover:bg-slate-700 transition-colors">
              <MonitorUp className="w-5 h-5" />
            </button>
            <button className="w-12 h-12 rounded-full bg-slate-800 text-slate-300 flex items-center justify-center hover:bg-slate-700 transition-colors">
              <Hand className="w-5 h-5" />
            </button>
            <button className="w-12 h-12 rounded-full bg-slate-800 text-slate-300 flex items-center justify-center hover:bg-slate-700 transition-colors">
              <MoreVertical className="w-5 h-5" />
            </button>
            <button 
              onClick={() => navigate(-1)}
              className="w-16 h-12 rounded-2xl bg-red-600 text-white flex items-center justify-center hover:bg-red-700 transition-colors ml-4"
            >
              <PhoneOff className="w-5 h-5" />
            </button>
          </div>

          <div className="flex items-center gap-4">
            <button className="w-10 h-10 rounded-full bg-slate-800 text-slate-300 flex items-center justify-center hover:bg-slate-700 transition-colors">
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Right Sidebar (Chat & Participants) */}
      <div className="w-80 bg-slate-900 border-l border-slate-800 flex flex-col">
        <div className="flex p-2 gap-2 border-b border-slate-800">
          <button 
            onClick={() => setActiveTab('chat')}
            className={`flex-1 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-colors ${activeTab === 'chat' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'}`}
          >
            <MessageSquare className="w-4 h-4" /> Chat
          </button>
          <button 
            onClick={() => setActiveTab('participants')}
            className={`flex-1 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-colors ${activeTab === 'participants' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'}`}
          >
            <Users className="w-4 h-4" /> People
          </button>
        </div>

        {activeTab === 'chat' ? (
          <>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-xs font-bold shrink-0">SC</div>
                <div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-sm font-bold text-slate-200">Sarah Chen</span>
                    <span className="text-xs text-slate-500">10:02 AM</span>
                  </div>
                  <p className="text-sm text-slate-300 mt-1">Welcome everyone! We'll start in 2 minutes. Feel free to drop your questions here.</p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center text-xs font-bold shrink-0">AJ</div>
                <div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-sm font-bold text-slate-200">Alex Johnson</span>
                    <span className="text-xs text-slate-500">10:05 AM</span>
                  </div>
                  <p className="text-sm text-slate-300 mt-1">Can we go over the cleanup function again?</p>
                </div>
              </div>
            </div>
            <div className="p-4 border-t border-slate-800">
              <div className="relative">
                <input 
                  type="text" 
                  placeholder="Type a message..." 
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-4 pr-10 py-3 text-sm text-white focus:outline-none focus:border-blue-500"
                />
                <button className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                  <MessageSquare className="w-4 h-4" />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {[
              { name: 'Sarah Chen', role: 'Host', isMuted: false },
              { name: 'Alex Johnson', role: 'Student', isMuted: true },
              { name: 'Maria Garcia', role: 'Student', isMuted: false },
              { name: 'James Smith', role: 'Student', isMuted: true },
            ].map((user, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${user.role === 'Host' ? 'bg-blue-600' : 'bg-slate-700'}`}>
                    {user.name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-200">{user.name}</p>
                    <p className="text-xs text-slate-500">{user.role}</p>
                  </div>
                </div>
                {user.isMuted ? <MicOff className="w-4 h-4 text-red-500" /> : <Mic className="w-4 h-4 text-slate-400" />}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
