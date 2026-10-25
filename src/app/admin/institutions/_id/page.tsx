import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Plus, Users, UserCheck, Trash2, X, Save, Search, Building2, GraduationCap } from 'lucide-react';
import AdminSidebar from '../../../../components/AdminSidebar';
import Header from '../../../../components/Header';
import { useToast } from '../../../../contexts/ToastContext';
import { useAuth } from '../../../../contexts/AuthContext';
import { institutionService, type Institution } from '../../../../services/institutionService';
import type { AuthUser } from '../../../../types/auth';

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md border border-slate-200 dark:border-slate-700">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-700">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">{title}</h2>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

const ROLE_LABELS: Record<string, string> = {
  STUDENT: 'Étudiant', INSTRUCTOR: 'Instructeur', INSTITUTION_ADMIN: 'Admin institution', ADMIN: 'Admin',
};
const ROLE_COLORS: Record<string, string> = {
  STUDENT: 'bg-blue-100 text-blue-700', INSTRUCTOR: 'bg-violet-100 text-violet-700',
  INSTITUTION_ADMIN: 'bg-amber-100 text-amber-700', ADMIN: 'bg-red-100 text-red-700',
};

export default function InstitutionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { showToast } = useToast();
  const { user } = useAuth();
  const [institution, setInstitution] = useState<Institution | null>(null);
  const [members, setMembers] = useState<AuthUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ email: '', full_name: '', role: 'INSTRUCTOR' as 'INSTRUCTOR' | 'STUDENT' });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [inst, mems] = await Promise.all([
        institutionService.getInstitution(id),
        institutionService.listMembers(id),
      ]);
      setInstitution(inst);
      setMembers(mems);
    } catch {
      showToast('Erreur de chargement', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [id]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setSaving(true);
    try {
      const created = await institutionService.createMember(id, form);
      showToast(
        created.credentials_email_sent
          ? 'Compte créé. Le changement de mot de passe sera exigé à la première connexion.'
          : 'Compte créé, mais le courriel n’a pas pu être envoyé. Mot de passe temporaire : password123. Il devra être changé à la première connexion.',
        created.credentials_email_sent ? 'success' : 'info',
      );
      setShowModal(false);
      setForm({ email: '', full_name: '', role: 'INSTRUCTOR' });
      load();
    } catch (err: any) {
      showToast(err?.response?.data?.email?.[0] || err?.response?.data?.detail || 'Erreur lors de la création.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const filtered = members.filter(m => {
    const matchQ = `${m.full_name} ${m.email}`.toLowerCase().includes(query.toLowerCase());
    const matchR = !roleFilter || m.role === roleFilter;
    return matchQ && matchR;
  });

  const instructors = members.filter(m => m.role === 'INSTRUCTOR').length;
  const students = members.filter(m => m.role === 'STUDENT').length;

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white">
      <AdminSidebar />
      <main className="flex-1 ml-64">
        <Header />
        <div className="p-8 max-w-5xl mx-auto">
          <Link to="/admin/institutions" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 mb-6 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Retour aux institutions
          </Link>

          {loading ? (
            <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>
          ) : !institution ? (
            <p className="text-slate-500">Institution introuvable.</p>
          ) : (
            <>
              {/* Header */}
              <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-6 text-white mb-8 shadow-lg">
                <div className="flex items-center gap-4">
                  {institution.logo_url
                    ? <img src={institution.logo_url} alt="" className="w-16 h-16 rounded-xl object-cover border-2 border-white/30" />
                    : <div className="w-16 h-16 rounded-xl bg-white/20 flex items-center justify-center"><Building2 className="w-8 h-8" /></div>
                  }
                  <div>
                    <h1 className="text-2xl font-bold">{institution.name}</h1>
                    {institution.country && <p className="text-blue-200 text-sm">{institution.country}</p>}
                    {institution.description && <p className="text-blue-100 text-sm mt-1">{institution.description}</p>}
                  </div>
                </div>
                <div className="flex gap-6 mt-4">
                  <div className="flex items-center gap-2 text-sm"><GraduationCap className="w-4 h-4 text-blue-200" /><span>{instructors} instructeur{instructors !== 1 ? 's' : ''}</span></div>
                  <div className="flex items-center gap-2 text-sm"><Users className="w-4 h-4 text-blue-200" /><span>{students} étudiant{students !== 1 ? 's' : ''}</span></div>
                </div>
              </div>

              {/* Controls */}
              <div className="flex flex-col sm:flex-row gap-3 mb-6">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                  <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Rechercher un membre..."
                    className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)}
                  className="px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">Tous les rôles</option>
                  <option value="INSTRUCTOR">Instructeurs</option>
                  <option value="STUDENT">Étudiants</option>
                  <option value="INSTITUTION_ADMIN">Admins</option>
                </select>
                <button onClick={() => setShowModal(true)}
                  className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-colors shadow-sm whitespace-nowrap">
                  <Plus className="w-4 h-4" /> Ajouter un membre
                </button>
              </div>

              {/* Members table */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
                {filtered.length === 0 ? (
                  <div className="text-center py-12 text-slate-400">
                    <Users className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    <p>Aucun membre trouvé</p>
                  </div>
                ) : (
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-100 dark:border-slate-700 text-left">
                        <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Membre</th>
                        <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Rôle</th>
                        <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Statut</th>
                        <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Mdp initial</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                      {filtered.map(m => (
                        <tr key={m.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0 overflow-hidden">
                                {m.avatar_url
                                  ? <img src={m.avatar_url} alt="" className="w-full h-full object-cover" />
                                  : <span className="text-sm font-bold text-blue-600">{m.full_name?.[0]?.toUpperCase()}</span>
                                }
                              </div>
                              <div>
                                <p className="text-sm font-semibold text-slate-900 dark:text-white">{m.full_name}</p>
                                <p className="text-xs text-slate-500">{m.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${ROLE_COLORS[m.role] || 'bg-slate-100 text-slate-600'}`}>
                              {ROLE_LABELS[m.role] || m.role}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${m.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'}`}>
                              {m.is_active ? 'Actif' : 'Inactif'}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            {(m as any).must_change_password
                              ? <span className="text-xs text-amber-600 font-semibold">À changer à la première connexion</span>
                              : <span className="text-xs text-slate-400">—</span>
                            }
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </>
          )}
        </div>
      </main>

      {showModal && (
        <Modal title="Ajouter un membre" onClose={() => setShowModal(false)}>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-200 mb-1">Nom complet *</label>
              <input required value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
                placeholder="Dr. Jean Ndayizeye"
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white" />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-200 mb-1">Email *</label>
              <input required type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                placeholder="jean@universite.bi"
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white" />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-200 mb-1">Rôle *</label>
              <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value as any }))}
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white">
                <option value="INSTRUCTOR">Instructeur (Professeur)</option>
                <option value="STUDENT">Étudiant</option>
              </select>
            </div>
            <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800">
              <p className="text-xs text-amber-700 dark:text-amber-300 font-semibold">
                Un mot de passe temporaire unique sera envoyé par e-mail. Son remplacement sera exigé à la première connexion.
              </p>
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">L'utilisateur devra le changer à la première connexion.</p>
            </div>
            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => setShowModal(false)}
                className="px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">Annuler</button>
              <button type="submit" disabled={saving}
                className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-colors disabled:opacity-50">
                {saving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
                {saving ? 'Création...' : 'Créer le compte'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
