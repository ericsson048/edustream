import Sidebar from '../../components/Sidebar';
import Header from '../../components/Header';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Users, Compass, MessagesSquare, MessageCircle, Heart, StickyNote, ShieldQuestion, GraduationCap, Briefcase, Lightbulb, PencilLine, Sparkles, MessagesSquare as GroupIcon } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { communityService, type DiscussionItem, type StudyGroupItem } from '../../services/communityService';
import { useToast } from '../../contexts/ToastContext';

const categoryConfig: Record<string, { icon: LucideIcon; color: string; bg: string }> = {
  "Aide aux devoirs": { icon: ShieldQuestion, color: 'text-blue-600', bg: 'bg-blue-100 dark:bg-blue-900/30' },
  "Orientation": { icon: Compass, color: 'text-purple-600', bg: 'bg-purple-100 dark:bg-purple-900/30' },
  "Carrière": { icon: Briefcase, color: 'text-amber-600', bg: 'bg-amber-100 dark:bg-amber-900/30' },
  "Tutos & Astuces": { icon: Lightbulb, color: 'text-green-600', bg: 'bg-green-100 dark:bg-green-900/30' },
  "Sciences": { icon: GraduationCap, color: 'text-emerald-600', bg: 'bg-emerald-100 dark:bg-emerald-900/30' },
  "Général": { icon: MessagesSquare, color: 'text-slate-600', bg: 'bg-slate-100 dark:bg-slate-800' },
};

export default function Community() {
  const navigate = useNavigate();
  const [discussions, setDiscussions] = useState<DiscussionItem[]>([]);
  const [groups, setGroups] = useState<StudyGroupItem[]>([]);
  const [filteredDiscussions, setFilteredDiscussions] = useState<DiscussionItem[]>([]);
  const [filteredGroups, setFilteredGroups] = useState<StudyGroupItem[]>([]);
  const [showPostDialog, setShowPostDialog] = useState(false);
  const [showGroupDialog, setShowGroupDialog] = useState(false);
  const [newPostTitle, setNewPostTitle] = useState('');
  const [newPostContent, setNewPostContent] = useState('');
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDesc, setNewGroupDesc] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'my-groups'>('all');
  const [loading, setLoading] = useState(true);
  const communitySocketRef = useRef<WebSocket | null>(null);
  const { showToast } = useToast();

  useEffect(() => {
    setLoading(true);
    Promise.all([communityService.listDiscussions(), communityService.listStudyGroups()])
      .then(([discussionItems, groupItems]) => {
        setDiscussions(discussionItems);
        setGroups(groupItems);
        setFilteredDiscussions(discussionItems);
        setFilteredGroups(groupItems);
      })
      .catch(() => showToast('Impossible de charger la communaute.', 'error'))
      .finally(() => setLoading(false));

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
    const query = searchQuery.toLowerCase();
    setFilteredDiscussions(
      discussions.filter((d) => d.title.toLowerCase().includes(query) || d.content.toLowerCase().includes(query))
    );
    setFilteredGroups(
      groups.filter((g) => g.name.toLowerCase().includes(query) || g.description.toLowerCase().includes(query))
    );
  }, [searchQuery, discussions, groups]);

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-50 font-sans text-slate-900">
      <Sidebar />
      <main className="flex-1 ml-64">
        <Header />
        <div className="p-8 max-w-7xl mx-auto space-y-8">
          {/* Header Section */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl shadow-lg p-8 text-white">
            <h1 className="text-4xl font-bold mb-2">Communauté Éducative</h1>
            <p className="text-blue-100">Connectez-vous avec d'autres apprenants, partagez vos connaissances et collaborez</p>
          </div>

          {/* Search & Action Buttons */}
          <div className="space-y-4">
            <div className="relative">
              <Search className="w-5 h-5 text-slate-400 absolute left-5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Rechercher des discussions, groupes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-14 pr-5 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm hover:shadow-md transition-shadow"
              />
            </div>

            <div className="flex gap-3 flex-wrap">
              <button
                onClick={() => setShowPostDialog(true)}
                className="inline-flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl text-sm font-semibold hover:shadow-lg hover:scale-105 transition-all duration-200"
              >
                <span>+</span>
                Nouveau Post
              </button>
              <button
                onClick={() => setShowGroupDialog(true)}
                className="inline-flex items-center gap-2 px-5 py-3 bg-slate-900 text-white rounded-xl text-sm font-semibold hover:shadow-lg hover:scale-105 transition-all duration-200"
              >
                <span>+</span>
                Nouveau Groupe
              </button>
            </div>
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
              <p className="text-slate-600 text-sm font-medium">Discussions</p>
              <p className="text-2xl font-bold text-blue-600 mt-1">{discussions.length}</p>
            </div>
            <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
              <p className="text-slate-600 text-sm font-medium">Groupes Actifs</p>
              <p className="text-2xl font-bold text-emerald-600 mt-1">{groups.length}</p>
            </div>
            <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
              <p className="text-slate-600 text-sm font-medium">Total Membres</p>
              <p className="text-2xl font-bold text-purple-600 mt-1">{groups.reduce((acc, g) => acc + (g.members_count || 0), 0)}</p>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 border-b border-slate-200">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-4 py-3 font-semibold text-sm transition-all border-b-2 ${
                activeTab === 'all'
                  ? 'text-blue-600 border-blue-600'
                  : 'text-slate-600 border-transparent hover:text-slate-900'
              }`}
            >
              Tout
            </button>
            <button
              onClick={() => setActiveTab('my-groups')}
              className={`px-4 py-3 font-semibold text-sm transition-all border-b-2 ${
                activeTab === 'my-groups'
                  ? 'text-blue-600 border-blue-600'
                  : 'text-slate-600 border-transparent hover:text-slate-900'
              }`}
            >
              Mes Groupes
            </button>
          </div>

          {/* Content */}
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="text-center space-y-4">
                <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto"></div>
                <p className="text-slate-600">Chargement de la communauté...</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              {/* Discussions Section */}
              <section className="xl:col-span-2">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                    <MessagesSquare className="w-7 h-7 text-blue-600" />
                    Discussions
                  </h2>
                  <span className="text-sm text-slate-500 bg-slate-100 px-3 py-1 rounded-full">{filteredDiscussions.length}</span>
                </div>
                <div className="space-y-4">
                  {filteredDiscussions.length > 0 ? (
                    filteredDiscussions.map((discussion) => (
                      <article
                        key={discussion.id}
                        className="bg-white border border-slate-200 rounded-xl p-5 hover:shadow-lg hover:border-blue-300 transition-all duration-200 cursor-pointer group"
                      >
                        <div className="flex items-start gap-4">
                          <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white flex-shrink-0">
                            <MessagesSquare className="w-5 h-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-1">{discussion.title}</h3>
                            <p className="text-sm text-slate-600 mt-2 line-clamp-2">{discussion.content}</p>
                            <div className="flex items-center gap-3 mt-3 flex-wrap">
                              <span className="inline-block px-2.5 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full">{discussion.category}</span>
                              <span className="text-xs text-slate-500"><Heart className="w-3.5 h-3.5 inline-block mr-1 text-red-500" />{discussion.likes_count} likes</span>
                              <span className="text-xs text-slate-400">•</span>
                              <span className="text-xs text-slate-500"><MessageCircle className="w-3.5 h-3.5 inline-block mr-1 text-slate-400" />{Math.floor(Math.random() * 50)} commentaires</span>
                            </div>
                          </div>
                        </div>
                      </article>
                    ))
                  ) : (
                    <div className="bg-white rounded-xl p-12 text-center border border-dashed border-slate-300">
                      <p className="text-slate-500 font-medium">Aucune discussion trouvée</p>
                      <p className="text-slate-400 text-sm mt-1">Soyez le premier à lancer une discussion !</p>
                    </div>
                  )}
                </div>
              </section>

              {/* Study Groups Section */}
              <section className="xl:col-span-1">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-bold text-slate-900"><Users className="w-6 h-6 inline-block mr-2 text-emerald-600" />Groupes</h2>
                  <span className="text-sm text-slate-500 bg-slate-100 px-3 py-1 rounded-full">{filteredGroups.length}</span>
                </div>
                <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
                  {filteredGroups.length > 0 ? (
                    filteredGroups.map((group) => (
                      <div
                        key={group.id}
                        className="bg-white border border-slate-200 rounded-xl p-4 hover:shadow-lg hover:border-emerald-300 transition-all duration-200 cursor-pointer group"
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-full flex items-center justify-center text-white flex-shrink-0">
                            <Users className="w-5 h-5 text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-bold text-slate-900 group-hover:text-emerald-600 transition-colors truncate">{group.name}</h3>
                            <p className="text-xs text-slate-600 mt-1 line-clamp-2">{group.description}</p>
                            <div className="flex items-center justify-between mt-3">
                              <span className="text-xs text-slate-500"><Users className="w-3.5 h-3.5 inline-block mr-1 text-emerald-500" />{group.members_count || 0} membres</span>
                              <button
                                onClick={() => navigate(`/community/groups/${group.id}`)}
                                className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-700 transition-colors"
                              >
                                Voir
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="bg-white rounded-xl p-8 text-center border border-dashed border-slate-300">
                      <p className="text-slate-500 font-medium text-sm">Aucun groupe trouvé</p>
                      <p className="text-slate-400 text-xs mt-1">Créez un groupe pour commencer !</p>
                    </div>
                  )}
                </div>
              </section>
            </div>
          )}
        </div>
      </main>

      {/* Post Dialog */}
      {showPostDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setShowPostDialog(false)}>
          <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-lg mx-4 space-y-6 animate-in fade-in zoom-in-95" onClick={(e) => e.stopPropagation()}>
            <div>
              <h2 className="text-2xl font-bold text-slate-900"><PencilLine className="w-6 h-6 inline-block mr-2 text-blue-600" />Créer une Discussion</h2>
              <p className="text-slate-500 text-sm mt-1">Partagez votre question ou votre connaissance avec la communauté</p>
            </div>
            
            <input
              value={newPostTitle}
              onChange={(e) => setNewPostTitle(e.target.value)}
              placeholder="Titre de votre discussion..."
              className="w-full border border-slate-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-slate-50"
            />
            
            <textarea
              value={newPostContent}
              onChange={(e) => setNewPostContent(e.target.value)}
              placeholder="Décrivez votre sujet en détail..."
              rows={5}
              className="w-full border border-slate-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-slate-50 resize-none"
            />
            
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowPostDialog(false)}
                className="px-5 py-2.5 text-sm text-slate-700 hover:bg-slate-100 rounded-lg transition-colors font-medium"
              >
                Annuler
              </button>
              <button
                className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg text-sm font-semibold hover:shadow-lg transition-all"
                onClick={async () => {
                  if (!newPostTitle.trim() || !newPostContent.trim()) {
                    showToast('Veuillez remplir tous les champs.', 'error');
                    return;
                  }
                  try {
                    const created = await communityService.createDiscussion({ title: newPostTitle, content: newPostContent });
                    setDiscussions((prev) => [created, ...prev]);
                    setNewPostTitle('');
                    setNewPostContent('');
                    setShowPostDialog(false);
                    showToast('Discussion créée avec succès !', 'success');
                  } catch {
                    showToast('Erreur lors de la création de la discussion.', 'error');
                  }
                }}
              >
                Publier
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Group Dialog */}
      {showGroupDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setShowGroupDialog(false)}>
          <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-lg mx-4 space-y-6 animate-in fade-in zoom-in-95" onClick={(e) => e.stopPropagation()}>
            <div>
              <h2 className="text-2xl font-bold text-slate-900">👥 Créer un Groupe</h2>
              <p className="text-slate-500 text-sm mt-1">Réunissez des apprenants autour d'un sujet commun</p>
            </div>
            
            <input
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              placeholder="Nom du groupe..."
              className="w-full border border-slate-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-slate-50"
            />
            
            <textarea
              value={newGroupDesc}
              onChange={(e) => setNewGroupDesc(e.target.value)}
              placeholder="Décrivez l'objectif et la description du groupe..."
              rows={4}
              className="w-full border border-slate-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-slate-50 resize-none"
            />
            
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowGroupDialog(false)}
                className="px-5 py-2.5 text-sm text-slate-700 hover:bg-slate-100 rounded-lg transition-colors font-medium"
              >
                Annuler
              </button>
              <button
                className="px-5 py-2.5 bg-slate-900 text-white rounded-lg text-sm font-semibold hover:shadow-lg transition-all"
                onClick={async () => {
                  if (!newGroupName.trim() || !newGroupDesc.trim()) {
                    showToast('Veuillez remplir tous les champs.', 'error');
                    return;
                  }
                  try {
                    const created = await communityService.createStudyGroup({ name: newGroupName, description: newGroupDesc });
                    setGroups((prev) => [created, ...prev]);
                    setNewGroupName('');
                    setNewGroupDesc('');
                    setShowGroupDialog(false);
                    showToast('Groupe créé avec succès !', 'success');
                  } catch {
                    showToast('Erreur lors de la création du groupe.', 'error');
                  }
                }}
              >
                Créer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

