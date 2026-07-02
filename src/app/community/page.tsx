import Sidebar from '../../components/Sidebar';
import Header from '../../components/Header';
import { useEffect, useRef, useState } from 'react';
import { communityService, type DiscussionItem, type StudyGroupItem, type StudyGroupMessageItem } from '../../services/communityService';
import { useToast } from '../../contexts/ToastContext';

export default function Community() {
  const [discussions, setDiscussions] = useState<DiscussionItem[]>([]);
  const [groups, setGroups] = useState<StudyGroupItem[]>([]);
  const [activeGroup, setActiveGroup] = useState<StudyGroupItem | null>(null);
  const [groupMessages, setGroupMessages] = useState<StudyGroupMessageItem[]>([]);
  const [newPostTitle, setNewPostTitle] = useState('');
  const [newPostContent, setNewPostContent] = useState('');
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDesc, setNewGroupDesc] = useState('');
  const [newGroupMessage, setNewGroupMessage] = useState('');
  const communitySocketRef = useRef<WebSocket | null>(null);
  const groupSocketRef = useRef<WebSocket | null>(null);
  const { showToast } = useToast();

  useEffect(() => {
    Promise.all([communityService.listDiscussions(), communityService.listStudyGroups()])
      .then(([discussionItems, groupItems]) => {
        setDiscussions(discussionItems);
        setGroups(groupItems);
        if (groupItems.length) setActiveGroup(groupItems[0]);
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

  useEffect(() => {
    if (!activeGroup) return;
    communityService
      .listStudyGroupMessages(activeGroup.id)
      .then(setGroupMessages)
      .catch(() => showToast('Impossible de charger les messages du groupe.', 'error'));

    groupSocketRef.current?.close();
    const socket = communityService.createStudyGroupSocket(activeGroup.id);
    groupSocketRef.current = socket;
    socket.onmessage = (event) => {
      const payload = JSON.parse(event.data) as { kind?: string; message?: StudyGroupMessageItem };
      if (payload.kind === 'study_group_message_created' && payload.message) {
        setGroupMessages((prev) => (prev.some((item) => item.id === payload.message?.id) ? prev : [...prev, payload.message]));
      }
    };
    socket.onerror = () => showToast('Connexion temps reel groupe indisponible.', 'error');
    return () => socket.close();
  }, [activeGroup, showToast]);

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

          <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
              <h2 className="font-bold">Nouveau Post</h2>
              <input value={newPostTitle} onChange={(e) => setNewPostTitle(e.target.value)} placeholder="Titre" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" />
              <textarea value={newPostContent} onChange={(e) => setNewPostContent(e.target.value)} placeholder="Contenu" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" />
              <button
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold"
                onClick={async () => {
                  try {
                    const created = await communityService.createDiscussion({ title: newPostTitle, content: newPostContent });
                    setDiscussions((prev) => [created, ...prev]);
                    setNewPostTitle('');
                    setNewPostContent('');
                    showToast('Post cree.', 'success');
                  } catch {
                    showToast('Creation du post impossible.', 'error');
                  }
                }}
              >
                Publier
              </button>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
              <h2 className="font-bold">Nouveau Groupe</h2>
              <input value={newGroupName} onChange={(e) => setNewGroupName(e.target.value)} placeholder="Nom du groupe" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" />
              <textarea value={newGroupDesc} onChange={(e) => setNewGroupDesc(e.target.value)} placeholder="Description" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" />
              <button
                className="px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-semibold"
                onClick={async () => {
                  try {
                    const created = await communityService.createStudyGroup({ name: newGroupName, description: newGroupDesc });
                    setGroups((prev) => [created, ...prev]);
                    setActiveGroup(created);
                    setNewGroupName('');
                    setNewGroupDesc('');
                    showToast('Groupe cree.', 'success');
                  } catch {
                    showToast('Creation du groupe impossible.', 'error');
                  }
                }}
              >
                Creer
              </button>
            </div>
          </section>

          <section className="grid grid-cols-1 xl:grid-cols-[0.9fr,1.1fr] gap-6">
            <div className="space-y-6">
              <section>
                <h2 className="text-xl font-bold mb-3">Discussions</h2>
                <div className="space-y-3">
                  {discussions.map((discussion) => (
                    <article key={discussion.id} className="bg-white border border-slate-200 rounded-xl p-4">
                      <h3 className="font-bold">{discussion.title}</h3>
                      <p className="text-sm text-slate-600 mt-1">{discussion.content}</p>
                      <p className="text-xs text-slate-400 mt-2">{discussion.category} ÔÇó {discussion.likes_count} likes</p>
                    </article>
                  ))}
                </div>
              </section>

              <section>
                <h2 className="text-xl font-bold mb-3">Study Groups</h2>
                <div className="grid grid-cols-1 gap-4">
                  {groups.map((group) => (
                    <button
                      key={group.id}
                      onClick={() => setActiveGroup(group)}
                      className={`bg-white border rounded-xl p-4 text-left ${activeGroup?.id === group.id ? 'border-blue-500 bg-blue-50' : 'border-slate-200'}`}
                    >
                      <h3 className="font-bold">{group.name}</h3>
                      <p className="text-sm text-slate-600 mt-1">{group.description}</p>
                      <p className="text-xs text-slate-400 mt-2">{group.members_count || 0} members</p>
                    </button>
                  ))}
                </div>
              </section>
            </div>

            <section className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col min-h-[480px]">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <div>
                  <h2 className="font-bold text-lg">{activeGroup?.name || 'Select a group'}</h2>
                  <p className="text-sm text-slate-500">{activeGroup?.description || 'Open a study group to chat in real time.'}</p>
                </div>
                {activeGroup && (
                  <button
                    className="px-3 py-2 bg-slate-900 text-white rounded-lg text-sm font-semibold"
                    onClick={async () => {
                      try {
                        await communityService.joinStudyGroup(activeGroup.id);
                        setActiveGroup((current) => (current ? { ...current } : current));
                        showToast('Groupe rejoint.', 'success');
                      } catch {
                        showToast('Impossible de rejoindre ce groupe.', 'error');
                      }
                    }}
                  >
                    Rejoindre
                  </button>
                )}
              </div>
              <div className="flex-1 overflow-y-auto py-4 space-y-3">
                {groupMessages.map((message) => (
                  <div key={message.id} className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                    <p className="text-sm font-semibold">{message.sender_name || 'Member'}</p>
                    <p className="text-sm text-slate-700">{message.content}</p>
                  </div>
                ))}
              </div>
              {activeGroup && (
                <div className="pt-4 border-t border-slate-200 flex gap-2">
                  <input
                    value={newGroupMessage}
                    onChange={(e) => setNewGroupMessage(e.target.value)}
                    placeholder="Message du groupe..."
                    className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm"
                  />
                  <button
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold"
                    onClick={() => {
                      if (!newGroupMessage.trim() || !groupSocketRef.current || groupSocketRef.current.readyState !== WebSocket.OPEN) return;
                      groupSocketRef.current.send(JSON.stringify({ content: newGroupMessage.trim() }));
                      setNewGroupMessage('');
                    }}
                  >
                    Envoyer
                  </button>
                </div>
              )}
            </section>
          </section>
        </div>
      </main>
    </div>
  );
}

