import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import { CheckCircle, Lock, Star, Trophy } from 'lucide-react';

const skills = [
  { id: 1, title: 'HTML & CSS Basics', status: 'completed', x: 50, y: 10 },
  { id: 2, title: 'JavaScript Fundamentals', status: 'completed', x: 50, y: 30 },
  { id: 3, title: 'React Basics', status: 'in-progress', x: 30, y: 50 },
  { id: 4, title: 'Node.js & Express', status: 'locked', x: 70, y: 50 },
  { id: 5, title: 'Advanced React Patterns', status: 'locked', x: 30, y: 70 },
  { id: 6, title: 'Full-Stack Architecture', status: 'locked', x: 50, y: 90 },
];

export default function SkillTree() {
  return (
    <div className="flex min-h-screen bg-slate-50 font-sans text-slate-900">
      <Sidebar />
      <main className="flex-1 ml-64">
        <Header />
        <div className="p-8 max-w-5xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Skill Tree</h1>
              <p className="text-slate-500 mt-1">Track your progress and unlock new abilities.</p>
            </div>
            <div className="flex items-center gap-2 bg-amber-50 text-amber-700 px-4 py-2 rounded-lg border border-amber-200 font-bold text-sm">
              <Trophy className="w-4 h-4" /> Level 12 Developer
            </div>
          </div>

          <div className="bg-slate-900 rounded-3xl shadow-xl overflow-hidden relative h-[800px] p-8 border border-slate-800">
            {/* Background Grid */}
            <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(#fff 1px, transparent 1px)', backgroundSize: '30px 30px' }}></div>
            
            {/* SVG Lines connecting nodes */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none">
              <path d="M 50% 10% L 50% 30%" stroke="#3b82f6" strokeWidth="4" fill="none" className="opacity-50" />
              <path d="M 50% 30% L 30% 50%" stroke="#3b82f6" strokeWidth="4" fill="none" className="opacity-50" />
              <path d="M 50% 30% L 70% 50%" stroke="#475569" strokeWidth="4" fill="none" strokeDasharray="8 8" />
              <path d="M 30% 50% L 30% 70%" stroke="#475569" strokeWidth="4" fill="none" strokeDasharray="8 8" />
              <path d="M 30% 70% L 50% 90%" stroke="#475569" strokeWidth="4" fill="none" strokeDasharray="8 8" />
              <path d="M 70% 50% L 50% 90%" stroke="#475569" strokeWidth="4" fill="none" strokeDasharray="8 8" />
            </svg>

            {/* Nodes */}
            {skills.map((skill) => (
              <div 
                key={skill.id}
                className="absolute transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center group cursor-pointer"
                style={{ left: `${skill.x}%`, top: `${skill.y}%` }}
              >
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg transition-transform group-hover:scale-110 relative z-10 ${
                  skill.status === 'completed' ? 'bg-blue-600 text-white shadow-blue-600/50' :
                  skill.status === 'in-progress' ? 'bg-amber-500 text-white shadow-amber-500/50 ring-4 ring-amber-500/30' :
                  'bg-slate-800 text-slate-500 border-2 border-slate-700'
                }`}>
                  {skill.status === 'completed' && <CheckCircle className="w-8 h-8" />}
                  {skill.status === 'in-progress' && <Star className="w-8 h-8 fill-current" />}
                  {skill.status === 'locked' && <Lock className="w-8 h-8" />}
                </div>
                <div className="mt-3 bg-slate-800/90 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-slate-700 text-center whitespace-nowrap">
                  <p className={`text-sm font-bold ${skill.status === 'locked' ? 'text-slate-400' : 'text-white'}`}>{skill.title}</p>
                  <p className="text-xs text-slate-500 uppercase tracking-wider mt-0.5">{skill.status}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
