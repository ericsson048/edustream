import { useEffect, useMemo, useState } from 'react';
import AdminSidebar from '../../../components/AdminSidebar';
import Pagination from '../../../components/Pagination';
import Header from '../../../components/Header';
import {
  Search, AlertCircle, CheckCircle, Clock, XCircle,
  Plus, X, MessageSquare, Send, ChevronDown,
} from 'lucide-react';
import { adminService, type SupportTicket } from '../../../services/adminService';
import { useToast } from '../../../contexts/ToastContext';

// ── helpers ──────────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<string, { label: string; icon: typeof AlertCircle; color: string; bg: string }> = {
  OPEN:        { label: 'Ouvert',      icon: AlertCircle,  color: 'text-red-600 dark:text-red-400',    bg: 'bg-red-100 dark:bg-red-900/30' },
  IN_PROGRESS: { label: 'En cours',    icon: Clock,        color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-100 dark:bg-amber-900/30' },
  RESOLVED:    { label: 'Résolu',      icon: CheckCircle,  color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-100 dark:bg-emerald-900/30' },
  CLOSED:      { label: 'Fermé',       icon: XCircle,      color: 'text-slate-500 dark:text-slate-400', bg: 'bg-slate-100 dark:bg-slate-800' },
};
const PRIORITY_CONFIG: Record<string, { label: string; color: string }> = {
  HIGH:   { label: 'Haute',  color: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400' },
  MEDIUM: { label: 'Moyenne', color: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400' },
  LOW:    { label: 'Basse',  color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' },
};

function Avatar({ name, avatar }: { name: string; avatar?: string }) {
  if (avatar) return <img src={avatar} alt="" className="w-9 h-9 rounded-full object-cover flex-shrink-0" />;
  return (
    <div className="w-9 h-9 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-sm font-bold text-blue-600 flex-shrink-0">
      {name?.[0]?.toUpperCase() || '?'}
    </div>
  );
}

function Modal({ title, onClose, children, wide = false }: { title: string; onClose: () => void; children: React.ReactNode; wide?: boolean }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className={`bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 w-full ${wide ? 'max-w-2xl' : 'max-w-lg'} max-h-[90vh] flex flex-col`}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex-shrink-0">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">{title}</h2>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function AdminSupport() {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [page, setPage] = useState(1);
  const { showToast } = useToast();
  const PAGE_SIZE = 10;

  // Modals
  const [viewTicket, setViewTicket] = useState<SupportTicket | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [replyStatus, setReplyStatus] = useState<SupportTicket['status']>('IN_PROGRESS');
  const [replying, setReplying] = useState(false);

  const [newTicket, setNewTicket] = useState({ subject: '', message: '', priority: 'MEDIUM' as SupportTicket['priority'] });
  const [creating, setCreating] = useState(false);

  const load = () => {
    setLoading(true);
    adminService.listSupportTickets()
      .then(setTickets)
      .catch(() => showToast('Erreur de chargement des tickets.', 'error'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => tickets.filter(t => {
    if (statusFilter && t.status !== statusFilter) return false;
    if (priorityFilter && t.priority !== priorityFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!t.subject.toLowerCase().includes(q) && !t.user_full_name.toLowerCase().includes(q) && !t.user_email.toLowerCase().includes(q)) return false;
    }
    return true;
  }), [tickets, search, statusFilter, priorityFilter]);

  useEffect(() => setPage(1), [search, statusFilter, priorityFilter]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE) || 1;
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Stats
  const openCount = tickets.filter(t => t.status === 'OPEN').length;
  const inProgressCount = tickets.filter(t => t.status === 'IN_PROGRESS').length;
  const resolvedCount = tickets.filter(t => t.status === 'RESOLVED').length;

  const openModal = (ticket: SupportTicket) => {
    setViewTicket(ticket);
    setReplyText(ticket.admin_reply || '');
    setReplyStatus(ticket.status === 'RESOLVED' || ticket.status === 'CLOSED' ? 'RESOLVED' : 'IN_PROGRESS');
  };

  const handleReply = async () => {
    if (!viewTicket || !replyText.trim()) return;
    setReplying(true);
    try {
      const updated = await adminService.replySupportTicket(viewTicket.id, replyText.trim(), replyStatus);
      setTickets(prev => prev.map(t => t.id === updated.id ? updated : t));
      setViewTicket(updated);
      showToast('Réponse envoyée.', 'success');
    } catch {
      showToast('Erreur lors de l\'envoi de la réponse.', 'error');
    } finally {
      setReplying(false);
    }
  };

  const handleStatusChange = async (ticket: SupportTicket, newStatus: SupportTicket['status']) => {
    try {
      const updated = await adminService.updateSupportTicket(ticket.id, { status: newStatus });
      setTickets(prev => prev.map(t => t.id === updated.id ? updated : t));
      if (viewTicket?.id === ticket.id) setViewTicket(updated);
    } catch {
      showToast('Erreur lors de la mise à jour.', 'error');
    }
  };

  const handleCreate = async () => {
    if (!newTicket.subject.trim() || !newTicket.message.trim()) {
      showToast('Sujet et message requis.', 'error'); return;
    }
    setCreating(true);
    try {
      const created = await adminService.createSupportTicket(newTicket);
      setTickets(prev => [created, ...prev]);
      setShowCreate(false);
      setNewTicket({ subject: '', message: '', priority: 'MEDIUM' });
      showToast('Ticket créé.', 'success');
    } catch {
      showToast('Erreur lors de la création.', 'error');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white">
      <AdminSidebar />
      <main className="flex-1 ml-64">
        <Header />
        <div className="p-8 max-w-7xl mx-auto">

          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Support Tickets</h1>
              <p className="text-slate-500 dark:text-slate-400 mt-1">Gérez les demandes et questions des utilisateurs.</p>
            </div>
            <button onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-colors shadow-sm">
              <Plus className="w-4 h-4" /> Nouveau ticket
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            {[
              { label: 'Ouverts',   value: openCount,       color: 'bg-red-500' },
              { label: 'En cours',  value: inProgressCount, color: 'bg-amber-500' },
              { label: 'Résolus',   value: resolvedCount,   color: 'bg-emerald-500' },
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm flex items-center gap-4">
                <div className={`w-10 h-10 ${color} rounded-xl flex items-center justify-center`}>
                  <MessageSquare className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-xs text-slate-500">{label}</p>
                  <p className="text-2xl font-bold">{value}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">

            {/* Filters */}
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-wrap gap-3">
              <div className="relative flex-1 min-w-48">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                <input type="text" placeholder="Rechercher par sujet, nom ou email..."
                  value={search} onChange={e => setSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white" />
              </div>
              <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
                className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white">
                <option value="">Tous les statuts</option>
                <option value="OPEN">Ouvert</option>
                <option value="IN_PROGRESS">En cours</option>
                <option value="RESOLVED">Résolu</option>
                <option value="CLOSED">Fermé</option>
              </select>
              <select value={priorityFilter} onChange={e => setPriorityFilter(e.target.value)}
                className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white">
                <option value="">Toutes les priorités</option>
                <option value="HIGH">Haute</option>
                <option value="MEDIUM">Moyenne</option>
                <option value="LOW">Basse</option>
              </select>
            </div>

            {loading ? (
              <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>
            ) : paginated.length === 0 ? (
              <div className="text-center py-16 text-slate-400">
                <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>Aucun ticket trouvé</p>
              </div>
            ) : (
              <table className="w-full text-left">
                <thead className="bg-slate-50 dark:bg-slate-800/50 text-xs uppercase text-slate-500 border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="px-6 py-3">Utilisateur</th>
                    <th className="px-6 py-3">Sujet</th>
                    <th className="px-6 py-3">Priorité</th>
                    <th className="px-6 py-3">Statut</th>
                    <th className="px-6 py-3">Date</th>
                    <th className="px-6 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {paginated.map(ticket => {
                    const sc = STATUS_CONFIG[ticket.status] || STATUS_CONFIG.OPEN;
                    const pc = PRIORITY_CONFIG[ticket.priority] || PRIORITY_CONFIG.MEDIUM;
                    return (
                      <tr key={ticket.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors cursor-pointer" onClick={() => openModal(ticket)}>
                        <td className="px-6 py-3">
                          <div className="flex items-center gap-3">
                            <Avatar name={ticket.user_full_name} avatar={ticket.user_avatar} />
                            <div>
                              <p className="text-sm font-semibold">{ticket.user_full_name}</p>
                              <p className="text-xs text-slate-500">{ticket.user_email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-3">
                          <p className="text-sm font-medium text-slate-900 dark:text-white max-w-xs truncate">{ticket.subject}</p>
                          {ticket.admin_reply && (
                            <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-0.5 flex items-center gap-1">
                              <CheckCircle className="w-3 h-3" /> Répondu
                            </p>
                          )}
                        </td>
                        <td className="px-6 py-3">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${pc.color}`}>{pc.label}</span>
                        </td>
                        <td className="px-6 py-3">
                          <span className={`flex items-center gap-1.5 text-xs font-semibold ${sc.color}`}>
                            <sc.icon className="w-3.5 h-3.5" />{sc.label}
                          </span>
                        </td>
                        <td className="px-6 py-3 text-xs text-slate-500">
                          {new Date(ticket.created_at).toLocaleDateString('fr-FR')}
                        </td>
                        <td className="px-6 py-3 text-right" onClick={e => e.stopPropagation()}>
                          <select value={ticket.status}
                            onChange={e => handleStatusChange(ticket, e.target.value as SupportTicket['status'])}
                            className="px-2 py-1.5 text-xs font-bold bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg border-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500">
                            <option value="OPEN">Ouvert</option>
                            <option value="IN_PROGRESS">En cours</option>
                            <option value="RESOLVED">Résolu</option>
                            <option value="CLOSED">Fermé</option>
                          </select>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
            {!loading && <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />}
          </div>
        </div>
      </main>

      {/* ── View + Reply modal ── */}
      {viewTicket && (
        <Modal title="Détail du ticket" onClose={() => setViewTicket(null)} wide>
          <div className="space-y-5">
            {/* User info */}
            <div className="flex items-center gap-3">
              <Avatar name={viewTicket.user_full_name} avatar={viewTicket.user_avatar} />
              <div>
                <p className="font-bold text-slate-900 dark:text-white">{viewTicket.user_full_name}</p>
                <p className="text-xs text-slate-500">{viewTicket.user_email}</p>
              </div>
              <div className="ml-auto flex items-center gap-2">
                <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${PRIORITY_CONFIG[viewTicket.priority]?.color}`}>
                  {PRIORITY_CONFIG[viewTicket.priority]?.label}
                </span>
                <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${STATUS_CONFIG[viewTicket.status]?.bg} ${STATUS_CONFIG[viewTicket.status]?.color}`}>
                  {STATUS_CONFIG[viewTicket.status]?.label}
                </span>
              </div>
            </div>

            {/* Subject + message */}
            <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Sujet</p>
              <p className="font-bold text-slate-900 dark:text-white mb-3">{viewTicket.subject}</p>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Message</p>
              <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{viewTicket.message}</p>
              <p className="text-xs text-slate-400 mt-2">{new Date(viewTicket.created_at).toLocaleString('fr-FR')}</p>
            </div>

            {/* Existing reply */}
            {viewTicket.admin_reply && (
              <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4">
                <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                  <CheckCircle className="w-3.5 h-3.5" /> Réponse de {viewTicket.replied_by_name || 'l\'admin'}
                </p>
                <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{viewTicket.admin_reply}</p>
                {viewTicket.replied_at && <p className="text-xs text-slate-400 mt-1">{new Date(viewTicket.replied_at).toLocaleString('fr-FR')}</p>}
              </div>
            )}

            {/* Reply form */}
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-200 mb-2">
                {viewTicket.admin_reply ? 'Modifier la réponse' : 'Répondre au ticket'}
              </label>
              <textarea rows={4} value={replyText} onChange={e => setReplyText(e.target.value)}
                placeholder="Écrivez votre réponse..."
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white resize-none" />
            </div>

            <div className="flex items-center gap-3">
              <div className="flex-1">
                <label className="block text-xs font-bold text-slate-500 mb-1">Statut après réponse</label>
                <select value={replyStatus} onChange={e => setReplyStatus(e.target.value as SupportTicket['status'])}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white">
                  <option value="IN_PROGRESS">En cours</option>
                  <option value="RESOLVED">Résolu</option>
                  <option value="CLOSED">Fermé</option>
                </select>
              </div>
              <div className="flex gap-2 mt-5">
                <button onClick={() => setViewTicket(null)}
                  className="px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors">
                  Fermer
                </button>
                <button onClick={handleReply} disabled={replying || !replyText.trim()}
                  className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-colors disabled:opacity-50">
                  {replying ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Send className="w-4 h-4" />}
                  {replying ? 'Envoi...' : 'Envoyer'}
                </button>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Create ticket modal ── */}
      {showCreate && (
        <Modal title="Créer un ticket" onClose={() => setShowCreate(false)}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-200 mb-1">Sujet *</label>
              <input value={newTicket.subject} onChange={e => setNewTicket(f => ({ ...f, subject: e.target.value }))}
                placeholder="Décrivez le problème en quelques mots"
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white" />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-200 mb-1">Message *</label>
              <textarea rows={4} value={newTicket.message} onChange={e => setNewTicket(f => ({ ...f, message: e.target.value }))}
                placeholder="Décrivez le problème en détail..."
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white resize-none" />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-200 mb-1">Priorité</label>
              <select value={newTicket.priority} onChange={e => setNewTicket(f => ({ ...f, priority: e.target.value as SupportTicket['priority'] }))}
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white">
                <option value="LOW">Basse</option>
                <option value="MEDIUM">Moyenne</option>
                <option value="HIGH">Haute</option>
              </select>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => setShowCreate(false)}
                className="px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">Annuler</button>
              <button onClick={handleCreate} disabled={creating}
                className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-colors disabled:opacity-50">
                {creating ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Plus className="w-4 h-4" />}
                {creating ? 'Création...' : 'Créer'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
