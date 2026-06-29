import { useEffect, useState } from 'react';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import { CheckCircle, Lock, Star, Trophy, Loader2 } from 'lucide-react';
import { skillService } from '../services/skillService';
import { courseService } from '../services/courseService';
import type { Skill, UserSkill } from '../services/skillService';

export default function SkillTree() {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [userSkills, setUserSkills] = useState<UserSkill[]>([]);
  const [totalCompleted, setTotalCompleted] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      skillService.listSkills(),
      skillService.listUserSkills(),
      courseService.listProgress({ is_completed: true }),
    ])
      .then(([allSkills, usk, progress]) => {
        setSkills(allSkills);
        setUserSkills(usk);
        setTotalCompleted(progress.length);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const getStatus = (skillId: string): 'LOCKED' | 'IN_PROGRESS' | 'COMPLETED' => {
    const found = userSkills.find((us) => us.skill === skillId);
    return found ? found.status : 'LOCKED';
  };

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
              <Trophy className="w-4 h-4" /> Level {Math.floor(totalCompleted / 5) || 1} Learner
            </div>
          </div>

          {loading ? (
            <div className="h-[800px] grid place-items-center">
              <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
            </div>
          ) : (
            <div className="bg-slate-900 rounded-3xl shadow-xl overflow-hidden relative h-[800px] p-8 border border-slate-800">
              <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(#fff 1px, transparent 1px)', backgroundSize: '30px 30px' }}></div>

              <svg className="absolute inset-0 w-full h-full pointer-events-none">
                {skills.slice(0, -1).map((sk, i) => {
                  const next = skills[i + 1];
                  if (!next) return null;
                  const isComplete = getStatus(sk.id) === 'COMPLETED';
                  return (
                    <path
                      key={`line-${i}`}
                      d={`M ${sk.position_x}% ${sk.position_y}% L ${next.position_x}% ${next.position_y}%`}
                      stroke={isComplete ? '#3b82f6' : '#475569'}
                      strokeWidth="4"
                      fill="none"
                      strokeDasharray={isComplete ? '' : '8 8'}
                      className={isComplete ? 'opacity-50' : ''}
                    />
                  );
                })}
              </svg>

              {skills.map((skill) => {
                const status = getStatus(skill.id);

                return (
                  <div
                    key={skill.id}
                    className="absolute transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center group cursor-pointer"
                    style={{ left: `${skill.position_x}%`, top: `${skill.position_y}%` }}
                  >
                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg transition-transform group-hover:scale-110 relative z-10 ${
                      status === 'COMPLETED' ? 'bg-blue-600 text-white shadow-blue-600/50' :
                      status === 'IN_PROGRESS' ? 'bg-amber-500 text-white shadow-amber-500/50 ring-4 ring-amber-500/30' :
                      'bg-slate-800 text-slate-500 border-2 border-slate-700'
                    }`}>
                      {status === 'COMPLETED' && <CheckCircle className="w-8 h-8" />}
                      {status === 'IN_PROGRESS' && <Star className="w-8 h-8 fill-current" />}
                      {status === 'LOCKED' && <Lock className="w-8 h-8" />}
                    </div>
                    <div className="mt-3 bg-slate-800/90 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-slate-700 text-center whitespace-nowrap">
                      <p className={`text-sm font-bold ${status === 'LOCKED' ? 'text-slate-400' : 'text-white'}`}>{skill.title}</p>
                      <p className="text-xs text-slate-500 uppercase tracking-wider mt-0.5">{status === 'IN_PROGRESS' ? 'In Progress' : status}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
