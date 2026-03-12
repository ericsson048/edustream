import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import { useEffect, useState } from 'react';
import { communityService, type DiscussionItem, type StudyGroupItem } from '../services/communityService';
import { useToast } from '../contexts/ToastContext';

export default function Community() {
  const [discussions, setDiscussions] = useState<DiscussionItem[]>([]);
  const [groups, setGroups] = useState<StudyGroupItem[]>([]);
  const { showToast } = useToast();

  useEffect(() => {
    Promise.all([communityService.listDiscussions(), communityService.listStudyGroups()])
      .then(([d, g]) => {
        setDiscussions(d);
        setGroups(g);
      })
      .catch(() => showToast('Impossible de charger la communaute.', 'error'));
  }, [showToast]);

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans text-slate-900">
      <Sidebar />
      <main className="flex-1 ml-64">
        <Header />
        <div className="p-8 max-w-7xl mx-auto space-y-8">
          <div>
            <h1 className="text-3xl font-bold">Community</h1>
            <p className="text-slate-500">Discussions et groupes reels depuis l'API.</p>
          </div>

          <section>
            <h2 className="text-xl font-bold mb-3">Discussions</h2>
            <div className="space-y-3">
              {discussions.map((d) => (
                <article key={d.id} className="bg-white border border-slate-200 rounded-xl p-4">
                  <h3 className="font-bold">{d.title}</h3>
                  <p className="text-sm text-slate-600 mt-1">{d.content}</p>
                  <p className="text-xs text-slate-400 mt-2">{d.category} • {d.likes_count} likes</p>
                </article>
              ))}
            </div>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">Study Groups</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {groups.map((g) => (
                <article key={g.id} className="bg-white border border-slate-200 rounded-xl p-4">
                  <h3 className="font-bold">{g.name}</h3>
                  <p className="text-sm text-slate-600 mt-1">{g.description}</p>
                  <p className="text-xs text-slate-400 mt-2">{g.next_session_at ? new Date(g.next_session_at).toLocaleString() : 'No upcoming session'}</p>
                </article>
              ))}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
