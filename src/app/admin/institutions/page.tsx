import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Building2, Users, Globe, Pencil, Trash2, X, Save, Search } from 'lucide-react';
import AdminSidebar from '../../../components/AdminSidebar';
import Header from '../../../components/Header';
import { useToast } from '../../../contexts/ToastContext';
import { useAuth } from '../../../contexts/AuthContext';
import { institutionService, type Institution } from '../../../services/institutionService';

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg border border-slate-200 dark:border-slate-700">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-700">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">{title}</h2>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

const EMPTY: Partial<Institution> = { name: '', description: '', country: '', website: '', logo_url: '', is_active: true };

export default function InstitutionsPage() {
  const { showToast } = useToast();
  const { user } = useAuth();
  const canManageInstitutions = user?.role === 'ADMIN';
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Institution | null>(null);
  const [form, setForm] = useState<Partial<Institution>>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    institutionService.listInstitutions()
      .then(setInstitutions)
      .catch(() => showToast('Erreur de chargement', 'error'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => { setEditing(null); setForm({ ...EMPTY, admin: { full_name: '', email: '' } }); setShowModal(true); };
  const openEdit = (i: Institution) => { setEditing(i); setForm({ ...i, admin: undefined }); setShowModal(true); };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name?.trim()) return;
    if (!editing && (!form.admin?.full_name?.trim() || !form.admin?.email?.trim())) {
      showToast('Les informations de l\'administrateur institutionnel sont requises.', 'error');
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        const { admin, ...payload } = form as any;
        await institutionService.updateInstitution(editing.id, payload);
        showToast('Institution mise à jour.', 'success');
      } else {
        await institutionService.createInstitution(form);
        showToast('Institution et compte administrateur créés.', 'success');
      }
      setShowModal(false);
      load();
    } catch (err: any) {
      const msg = err?.response?.data?.detail ||
        err?.response?.data?.name?.[0] ||
        err?.response?.data?.admin?.[0] ||
        err?.response?.data?.non_field_errors?.[0] ||
        'Erreur lors de la sauvegarde.';
      showToast(msg, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Supprimer cette institution ? Cette action est irréversible.')) return;
    setDeleting(id);
    try {
      await institutionService.deleteInstitution(id);
      showToast('Institution supprimée.', 'success');
      load();
    } catch {
      showToast('Erreur lors de la suppression.', 'error');
    } finally {
      setDeleting(null);
    }
  };

  const filtered = institutions.filter(i =>
    `${i.name} ${i.country}`.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white">
      <AdminSidebar />
      <main className="flex-1 ml-64">
        <Header />
        <div className="p-8 max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Institutions</h1>
              <p className="text-slate-500 mt-1">Gérez les universités et organisations partenaires.</p>
            </div>
            {canManageInstitutions && <button onClick={openCreate}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-colors shadow-sm">
              <Plus className="w-4 h-4" /> Nouvelle institution
            </button>}
          </div>

          {/* Search */}
          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Rechercher..."
              className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>

          {loading ? (
            <div className="flex justify-center py-16">
              <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <Building2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="font-semibold">Aucune institution</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filtered.map(inst => (
                <div key={inst.id} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-all p-5 flex flex-col gap-3">
                  <div className="flex items-start gap-3">
                    {inst.logo_url
                      ? <img src={inst.logo_url} alt="" className="w-12 h-12 rounded-xl object-cover flex-shrink-0" />
                      : <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                          <Building2 className="w-6 h-6 text-blue-600" />
                        </div>
                    }
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-slate-900 dark:text-white truncate">{inst.name}</h3>
                      {inst.country && <p className="text-xs text-slate-500">{inst.country}</p>}
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${inst.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'}`}>
                      {inst.is_active ? 'Actif' : 'Inactif'}
                    </span>
                  </div>

                  {inst.description && <p className="text-sm text-slate-500 line-clamp-2">{inst.description}</p>}

                  <div className="flex items-center gap-4 text-xs text-slate-500">
                    <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" />{inst.members_count} membre{inst.members_count !== 1 ? 's' : ''}</span>
                    {inst.website && <a href={inst.website} target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:text-blue-600 transition-colors"><Globe className="w-3.5 h-3.5" />Site web</a>}
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-700">
                    <Link to={`/admin/institutions/${inst.id}`}
                      className="flex-1 text-center py-2 text-xs font-bold text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors">
                      Gérer les membres
                    </Link>
                    {canManageInstitutions && <button onClick={() => openEdit(inst)}
                      className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors">
                      <Pencil className="w-4 h-4" />
                    </button>}
                    {canManageInstitutions && <button onClick={() => handleDelete(inst.id)} disabled={deleting === inst.id}
                      className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-40">
                      <Trash2 className="w-4 h-4" />
                    </button>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {showModal && (
        <Modal title={editing ? 'Modifier l\'institution' : 'Nouvelle institution'} onClose={() => setShowModal(false)}>
          <form onSubmit={handleSave} className="space-y-4">
            {[
              { label: 'Nom *', key: 'name', type: 'text', required: true, placeholder: 'Université du Burundi' },
              { label: 'Pays', key: 'country', type: 'text', placeholder: 'Burundi' },
              { label: 'Site web', key: 'website', type: 'url', placeholder: 'https://...' },
              { label: 'URL du logo', key: 'logo_url', type: 'url', placeholder: 'https://...' },
            ].map(({ label, key, type, required, placeholder }) => (
              <div key={key}>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-200 mb-1">{label}</label>
                <input type={type} required={required} placeholder={placeholder}
                  value={(form as any)[key] || ''}
                  onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white" />
              </div>
            ))}
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-200 mb-1">Description</label>
              <textarea rows={3} value={form.description || ''} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white resize-none" />
            </div>
            {!editing && (
              <div className="space-y-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                <div>
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">Administrateur institutionnel *</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Ce compte permettra à l'université de se connecter.</p>
                </div>
                <div className="grid grid-cols-1 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">Nom complet *</label>
                    <input type="text" required placeholder="Jean Martin"
                      value={(form.admin as any)?.full_name || ''}
                      onChange={e => setForm(f => ({ ...f, admin: { ...(f.admin as any), full_name: e.target.value } }))}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">Email *</label>
                    <input type="email" required placeholder="jean.martin@universite.fr"
                      value={(form.admin as any)?.email || ''}
                      onChange={e => setForm(f => ({ ...f, admin: { ...(f.admin as any), email: e.target.value } }))}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white" />
                  </div>
                </div>
              </div>
            )}
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.is_active ?? true} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} className="rounded" />
              <span className="text-sm text-slate-700 dark:text-slate-200">Active</span>
            </label>
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => setShowModal(false)}
                className="px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">Annuler</button>
              <button type="submit" disabled={saving}
                className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-colors disabled:opacity-50">
                {saving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
                {saving ? 'Sauvegarde...' : 'Sauvegarder'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
