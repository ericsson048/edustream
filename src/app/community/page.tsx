import Sidebar from '../../components/Sidebar';
import Header from '../../components/Header';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { communityService, type DiscussionItem, type StudyGroupItem } from '../../services/communityService';
import { useToast } from '../../contexts/ToastContext';

export default function Community() {
  const navigate = useNavigate();
  const [discussions, setDiscussions] = useState<DiscussionItem[]>([]);
  const [groups, setGroups] = useState<StudyGroupItem[]>([]);
  const [showPostDialog, setShowPostDialog] = useState(false);
  const [showGroupDialog, setShowGroupDialog] = useState(false);
  const [newPostTitle, setNewPostTitle] = useState('');
  const [newPostContent, setNewPostContent] = useState('');
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDesc, setNewGroupDesc] = useState('');
  const communitySocketRef = useRef<WebSocket | null>(null);
  const { showToast } = useToast();

  useEffect(() => {
    Promise.all([communityService.listDiscussions(), communityService.listStudyGroups()])
      .then(([discussionItems, groupItems]) => {
        setDiscussions(discussionItems);
        setGroups(groupItems);
      })
      .catch(() => showToast('Impossible de charger la communaute.', 'error'));

    const socket = communityService.createCommunitySocket();
    communitySocketRef.current = socket;
    socket.onmessage = (event) => {
      const payload = JSON.parse(event.data) as { kind?: string; discussion?: DiscussionItem; group?: StudyGroupItem };
      if (payload.kind === 'discussion_created' && payload.discussion) {
        setDiscussions((prev) => [payload.discussion!, ...prev.filter((item) => item.id !== payload.discussion?.id)]);
      }
      if (payload.kind === 'study_group_created' && payload.group) {
        setGroups((prev) => [payload.group!, ...prev.filter((item) => item.id !== payload.group?.id)]);
      }
    };
    return () => socket.close();
  }, [showToast]);

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans text-slate-900">
      <Sidebar />
      <main className="flex-1 ml-64">
        <Header />
        <div className="p-8 max-w-7xl mx-auto space-y-8">
          <div>
            <h1 className="text-3xl font-bold">Community</h1>
            <p className="text-slate-500">Discussions, groupes et chat temps reel.</p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setShowPostDialog(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors"
            >
              + Nouveau Post
            </button>
            <button
              onClick={() => setShowGroupDialog(true)}
              className="px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-semibold hover:bg-slate-800 transition-colors"
            >
              + Nouveau Groupe
            </button>
          </div>

          <section className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <section>
              <h2 className="text-xl font-bold mb-3">Discussions</h2>
              <div className="space-y-3">
                {discussions.map((discussion) => (
                  <article key={discussion.id} className="bg-white border border-slate-200 rounded-xl p-4">
                    <h3 className="font-bold">{discussion.title}</h3>
                    <p className="text-sm text-slate-600 mt-1">{discussion.content}</p>
                    <p className="text-xs text-slate-400 mt-2">{discussion.category} • {discussion.likes_count} likes</p>
                  </article>
                ))}
              </div>
            </section>

            <section>
              <h2 className="text-xl font-bold mb-3">Study Groups</h2>
              <div className="grid grid-cols-1 gap-4">
                {groups.map((group) => (
                  <div
                    key={group.id}
                    className="bg-white border border-slate-200 rounded-xl p-4"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <h3 className="font-bold truncate">{group.name}</h3>
                        <p className="text-sm text-slate-600 mt-1 line-clamp-2">{group.description}</p>
                        <p className="text-xs text-slate-400 mt-2">{group.members_count || 0} members</p>
                      </div>
                      <button
                        onClick={() => navigate(`/community/groups/${group.id}`)}
                        className="shrink-0 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 transition-colors"
                      >
                        Voir
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </section>
        </div>
      </main>

      {showPostDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowPostDialog(false)}>
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md mx-4 space-y-4" onClick={(e) => e.stopPropagation()}>
            <h2 className="font-bold text-lg">Nouveau Post</h2>
            <input value={newPostTitle} onChange={(e) => setNewPostTitle(e.target.value)} placeholder="Titre" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <textarea value={newPostContent} onChange={(e) => setNewPostContent(e.target.value)} placeholder="Contenu" rows={4} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowPostDialog(false)} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">Annuler</button>
              <button
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors"
                onClick={async () => {
                  try {
                    const created = await communityService.createDiscussion({ title: newPostTitle, content: newPostContent });
                    setDiscussions((prev) => [created, ...prev]);
                    setNewPostTitle('');
                    setNewPostContent('');
                    setShowPostDialog(false);
                    showToast('Post cree.', 'success');
                  } catch {
                    showToast('Creation du post impossible.', 'error');
                  }
                }}
              >
                Publier
              </button>
            </div>
          </div>
        </div>
      )}

      {showGroupDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowGroupDialog(false)}>
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md mx-4 space-y-4" onClick={(e) => e.stopPropagation()}>
            <h2 className="font-bold text-lg">Nouveau Groupe</h2>
            <input value={newGroupName} onChange={(e) => setNewGroupName(e.target.value)} placeholder="Nom du groupe" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <textarea value={newGroupDesc} onChange={(e) => setNewGroupDesc(e.target.value)} placeholder="Description" rows={3} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowGroupDialog(false)} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">Annuler</button>
              <button
                className="px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-semibold hover:bg-slate-800 transition-colors"
                onClick={async () => {
                  try {
                    const created = await communityService.createStudyGroup({ name: newGroupName, description: newGroupDesc });
                    setGroups((prev) => [created, ...prev]);
                    setNewGroupName('');
                    setNewGroupDesc('');
                    setShowGroupDialog(false);
                    showToast('Groupe cree.', 'success');
                  } catch {
                    showToast('Creation du groupe impossible.', 'error');
                  }
                }}
              >
                Creer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

