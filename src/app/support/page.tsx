import { useEffect, useState } from 'react';
import Sidebar from '../../components/Sidebar';
import Header from '../../components/Header';
import {
  Plus, X, MessageSquare, CheckCircle, Clock,
  AlertCircle, XCircle, Send,
} from 'lucide-react';
import { adminService, type SupportTicket } from '../../services/adminService';
import { useToast } from '../../contexts/ToastContext';

const STATUS_CONFIG: Record<string, { label: string; icon: typeof AlertCircle; color: string; bg: string }> = {
  OPEN:        { label: 'Ouvert',   icon: AlertCircle, color: 'text-red-600',    bg: 'bg-red-100' },
  IN_PROGRESS: { label: 'En cours', icon: Clock,       color: 'text-amber-600',  bg: 'bg-amber-100' },
  RESOLVED:    { label: 'Résolu',   icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-100' },
  CLOSED:      { label: 'Fermé',    icon: XCircle,     color: 'text-slate-500',   bg: 'bg-slate-100' },
};

const PRIORITY_LABELS: Record<string, string> = { LOW: 'Basse', MEDIUM: 'Moyenne', HIGH: 'Haute' };

export default function SupportPage() {
  const { showToast } = useToast();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<SupportTicket | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ subject: '', message: '', priority: 'MEDIUM' as SupportTicket['priority'] });
  const [submitting, setSubmitting] = useState(false);

  const load = () => {
    setLoading(true);
    adminService.listMyTickets()
      .then(setTickets)
      .catch(() => showToast('Erreur de chargement.', 'error'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.subject.trim() || !form.message.trim()) return;
    setSubmitting(true);
    try {
      const created = await adminService.submitTicket(form);
      setTickets(prev => [created, ...prev]);
      setShowForm(false);
      setForm({ subject: '', message: '', priority: 'MEDIUM' });
      showToast('Ticket soumis. L\'équipe support vous répondra bientôt.', 'success');
    } catch {
      showToast('Erreur lors de la soumission.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white">
      <Sidebar />
      <main className="flex-1 ml-64">
        <Header />
        <div className="p-8 max-w-4xl mx-auto">

          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Support</h1>
              <p className="text-slate-500 dark:text-slate-400 mt-1">Posez vos questions ou signalez un problème.</p>
            </div>
            <button onClick={() => setShowForm(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-colors shadow-sm">
              <Plus className="w-4 h-4" /> Nouveau ticket
            </button>
          </div>

          {/* New ticket form */}
          {showForm && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 mb-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold">Nouveau ticket</h2>
                <button onClick={() => setShowForm(false)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"><X className="w-4 h-4" /></button>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-200 mb-1">Sujet *</label>
                  <input required value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
                    placeholder="Décrivez le problème brièvement"
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-200 mb-1">Message *</label>
                  <textarea required rows={5} value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                    placeholder="Décrivez le problème en détail..."
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white resize-none" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-200 mb-1">Priorité</label>
                  <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value as SupportTicket['priority'] }))}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white">
                    <option value="LOW">Basse — question générale</option>
                    <option value="MEDIUM">Moyenne — problème mineur</option>
                    <option value="HIGH">Haute — problème bloquant</option>
                  </select>
                </div>
                <div className="flex justify-end gap-3">
                  <button type="button" onClick={() => setShowForm(false)}
                    className="px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors">Annuler</button>
                  <button type="submit" disabled={submitting}
                    className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-colors disabled:opacity-50">
                    {submitting ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Send className="w-4 h-4" />}
                    {submitting ? 'Envoi...' : 'Soumettre'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Tickets list */}
          {loading ? (
            <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>
          ) : tickets.length === 0 ? (
            <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700">
              <MessageSquare className="w-12 h-12 mx-auto mb-3 text-slate-300 dark:text-slate-600" />
              <p className="font-bold text-slate-700 dark:text-slate-300 mb-1">Aucun ticket</p>
              <p className="text-sm text-slate-500">Cliquez sur "Nouveau ticket" pour contacter le support.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {tickets.map(ticket => {
                const sc = STATUS_CONFIG[ticket.status] || STATUS_CONFIG.OPEN;
                const isOpen = selected?.id === ticket.id;
                return (
                  <div key={ticket.id} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                    <button
                      onClick={() => setSelected(isOpen ? null : ticket)}
                      className="w-full flex items-center gap-4 p-5 text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                    >
                      <div className={`w-10 h-10 rounded-xl ${sc.bg} dark:bg-opacity-20 flex items-center justify-center flex-shrink-0`}>
                        <sc.icon className={`w-5 h-5 ${sc.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <p className="font-bold text-slate-900 dark:text-white truncate">{ticket.subject}</p>
                          {ticket.admin_reply && (
                            <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-xs font-bold rounded-full flex-shrink-0">
                              Répondu
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-slate-500">
                          <span className={`font-semibold ${sc.color}`}>{sc.label}</span>
                          <span>·</span>
                          <span>Priorité {PRIORITY_LABELS[ticket.priority]}</span>
                          <span>·</span>
                          <span>{new Date(ticket.created_at).toLocaleDateString('fr-FR')}</span>
                        </div>
                      </div>
                    </button>

                    {isOpen && (
                      <div className="px-5 pb-5 border-t border-slate-100 dark:border-slate-700 pt-4 space-y-4">
                        {/* User message */}
                        <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4">
                          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Votre message</p>
                          <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{ticket.message}</p>
                        </div>

                        {/* Admin reply */}
                        {ticket.admin_reply ? (
                          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
                            <p className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                              <CheckCircle className="w-3.5 h-3.5" />
                              Réponse du support{ticket.replied_by_name ? ` (${ticket.replied_by_name})` : ''}
                            </p>
                            <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{ticket.admin_reply}</p>
                            {ticket.replied_at && (
                              <p className="text-xs text-slate-400 mt-2">{new Date(ticket.replied_at).toLocaleString('fr-FR')}</p>
                            )}
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 bg-amber-50 dark:bg-amber-900/10 rounded-xl p-4">
                            <Clock className="w-4 h-4 text-amber-500 flex-shrink-0" />
                            <p>En attente de réponse du support. Nous répondons généralement sous 24–48h.</p>
                          </div>
                        )}
                      </div>
                    )}
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
