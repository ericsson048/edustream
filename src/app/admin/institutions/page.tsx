import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Building2, Users, Globe, Pencil, Trash2, X, Save, Search, Check, ChevronLeft, ChevronRight, UserRound, Upload, Image as ImageIcon } from 'lucide-react';
import AdminSidebar from '../../../components/AdminSidebar';
import Header from '../../../components/Header';
import { useToast } from '../../../contexts/ToastContext';
import { useAuth } from '../../../contexts/AuthContext';
import { institutionService, type Institution } from '../../../services/institutionService';
import { getApiErrorMessage } from '../../../services/apiClient';

function Modal({ title, onClose, children, closeDisabled = false }: { title: string; onClose: () => void; children: React.ReactNode; closeDisabled?: boolean }) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const frame = window.requestAnimationFrame(() => {
      const initialTarget = dialogRef.current?.querySelector<HTMLElement>('[data-dialog-autofocus]');
      (initialTarget || dialogRef.current)?.focus();
    });
    return () => {
      window.cancelAnimationFrame(frame);
      previouslyFocused?.focus();
    };
  }, []);

  const handleDialogKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      if (!closeDisabled) onClose();
      return;
    }
    if (event.key !== 'Tab' || !dialogRef.current) return;

    const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    )).filter(element => element.offsetParent !== null);
    if (!focusable.length) {
      event.preventDefault();
      dialogRef.current.focus();
      return;
    }
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && (document.activeElement === first || !dialogRef.current.contains(document.activeElement))) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && (document.activeElement === last || !dialogRef.current.contains(document.activeElement))) {
      event.preventDefault();
      first.focus();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 backdrop-blur-sm p-3 sm:p-6" role="presentation">
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="institution-modal-title" tabIndex={-1} onKeyDown={handleDialogKeyDown} className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[calc(100vh-1.5rem)] overflow-y-auto border border-slate-200 dark:border-slate-700 focus:outline-none">
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 sm:px-8 py-5 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-700">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-600 dark:text-blue-400">EduStream · Administration</p>
            <h2 id="institution-modal-title" className="text-xl font-bold text-slate-900 dark:text-white mt-1">{title}</h2>
          </div>
          <button type="button" onClick={onClose} disabled={closeDisabled} aria-label="Fermer" className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 sm:p-8">{children}</div>
      </div>
    </div>
  );
}

const EMPTY: Partial<Institution> = { name: '', description: '', country: '', website: '', logo_url: '', is_active: true };
type InstitutionFieldErrors = { name?: string; adminName?: string; adminEmail?: string };

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
  const [step, setStep] = useState(0);
  const [reviewConfirmed, setReviewConfirmed] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<InstitutionFieldErrors>({});
  const [saving, setSaving] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoUploadProgress, setLogoUploadProgress] = useState(0);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [logoUploadError, setLogoUploadError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    institutionService.listInstitutions()
      .then(setInstitutions)
      .catch(() => showToast('Erreur de chargement', 'error'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (!logoPreview?.startsWith('blob:')) return;
    return () => URL.revokeObjectURL(logoPreview);
  }, [logoPreview]);

  useEffect(() => {
    if (!showModal) return;
    const frame = window.requestAnimationFrame(() => {
      document.querySelector<HTMLElement>('[data-dialog-autofocus]')?.focus();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [showModal, step]);

  const openCreate = () => { setEditing(null); setForm({ ...EMPTY, admin: { full_name: '', email: '' } }); setLogoPreview(null); setLogoUploadError(null); setLogoUploadProgress(0); setStep(0); setReviewConfirmed(false); setFieldErrors({}); setShowModal(true); };
  const openEdit = (i: Institution) => { setEditing(i); setForm({ ...i, admin: undefined }); setLogoPreview(i.logo_url || null); setLogoUploadError(null); setLogoUploadProgress(0); setStep(0); setReviewConfirmed(false); setFieldErrors({}); setShowModal(true); };

  const handleLogoUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setLogoUploadError('Choisissez un fichier image.');
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      setLogoUploadError('Le fichier image ne peut pas dépasser 50 Mo.');
      return;
    }
    const previousUrl = form.logo_url || '';
    const localPreview = URL.createObjectURL(file);
    setLogoPreview(localPreview);
    setLogoUploadError(null);
    setLogoUploadProgress(0);
    setIsUploadingLogo(true);
    try {
      const url = await institutionService.uploadLogo(file, setLogoUploadProgress);
      setForm(current => ({ ...current, logo_url: url }));
      setLogoPreview(url);
      setLogoUploadProgress(100);
    } catch (error) {
      setLogoPreview(previousUrl || null);
      setLogoUploadError(getApiErrorMessage(error, 'Impossible de téléverser le logo.'));
    } finally {
      setIsUploadingLogo(false);
    }
  };

  const steps = editing
    ? [{ title: 'Informations', detail: 'Identité et coordonnées' }, { title: 'Vérification', detail: 'Confirmez les modifications' }]
    : [{ title: 'Institution', detail: 'Identité et coordonnées' }, { title: 'Administrateur', detail: 'Compte de gestion' }, { title: 'Vérification', detail: 'Confirmez la création' }];

  const handleContinue = () => {
    if (isUploadingLogo) return;
    if (step === 0 && !form.name?.trim()) {
      setFieldErrors(errors => ({ ...errors, name: 'Le nom de l’institution est requis.' }));
      document.getElementById('institution-name')?.focus();
      return;
    }
    if (!editing && step === 1) {
      const adminEmail = form.admin?.email?.trim() || '';
      const nextErrors: InstitutionFieldErrors = {};
      if (!form.admin?.full_name?.trim()) nextErrors.adminName = 'Le nom complet est requis.';
      if (!adminEmail) nextErrors.adminEmail = 'L’adresse e-mail est requise.';
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(adminEmail)) nextErrors.adminEmail = 'Saisissez une adresse e-mail valide.';
      if (nextErrors.adminName || nextErrors.adminEmail) {
        setFieldErrors(nextErrors);
        document.getElementById(nextErrors.adminName ? 'institution-admin-name' : 'institution-admin-email')?.focus();
        return;
      }
    }
    setFieldErrors({});
    setStep(current => {
      const next = Math.min(current + 1, steps.length - 1);
      if (next === steps.length - 1) setReviewConfirmed(false);
      return next;
    });
  };

  const handleSave = async () => {
    if (!reviewConfirmed) return;
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
        <Modal title={editing ? "Modifier l'institution" : 'Nouvelle institution'} closeDisabled={saving || isUploadingLogo} onClose={() => setShowModal(false)}>
          <div className="mb-8 rounded-xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-700 dark:bg-slate-800/50">
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">Progression</p>
              <p className="text-xs font-semibold text-blue-700 dark:text-blue-300">Étape {step + 1} sur {steps.length}</p>
            </div>
            <div role="progressbar" aria-label="Progression de la configuration" aria-valuemin={1} aria-valuemax={steps.length} aria-valuenow={step + 1} className="mb-4 h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
              <div className="h-full rounded-full bg-blue-600 transition-all duration-300" style={{ width: `${((step + 1) / steps.length) * 100}%` }} />
            </div>
            <ol aria-label="Étapes du formulaire" className="grid gap-2" style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}>
            {steps.map((item, index) => {
              const complete = index < step;
              const current = index === step;
              return <li key={item.title} aria-current={current ? 'step' : undefined} className="relative min-w-0 text-center">
                {index < steps.length - 1 && <span aria-hidden="true" style={{ left: 'calc(50% + 1rem)', right: 'calc(-50% + 1rem)' }} className={`absolute top-4 z-0 h-0.5 rounded-full ${complete ? 'bg-emerald-400' : 'bg-slate-200 dark:bg-slate-700'}`} />}
                <span className={`relative z-10 mx-auto flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${complete ? 'bg-emerald-100 text-emerald-700 ring-2 ring-emerald-200 dark:bg-emerald-900/50 dark:text-emerald-300 dark:ring-emerald-800' : current ? 'bg-blue-600 text-white ring-4 ring-blue-100 dark:ring-blue-900/40' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'}`}>
                    {complete ? <Check className="h-4 w-4" /> : index + 1}
                </span>
                <p className={`mt-2 truncate text-xs font-bold sm:text-sm ${current ? 'text-blue-700 dark:text-blue-300' : complete ? 'text-emerald-700 dark:text-emerald-300' : 'text-slate-500'}`}>{item.title}</p>
                <p className="hidden truncate text-xs text-slate-500 md:block">{item.detail}</p>
              </li>;
            })}
            </ol>
          </div>

          <form onSubmit={e => e.preventDefault()}>
            {step === 0 && <section aria-labelledby="institution-details-heading">
              <div className="mb-6">
                <p className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">Étape 1 · Institution</p>
                <h3 id="institution-details-heading" className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">Présentez l'organisation</h3>
                <p className="mt-1 text-sm text-slate-500">Ces informations seront visibles dans les espaces liés à l'institution.</p>
              </div>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label htmlFor="institution-name" className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-200">Nom de l'institution <span className="text-rose-500">*</span></label>
                  <input id="institution-name" data-dialog-autofocus type="text" required aria-invalid={Boolean(fieldErrors.name)} aria-describedby={fieldErrors.name ? 'institution-name-error' : undefined} placeholder="Université du Burundi" value={form.name || ''} onChange={e => { setForm(f => ({ ...f, name: e.target.value })); setFieldErrors(errors => ({ ...errors, name: undefined })); }} className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
                  {fieldErrors.name && <p id="institution-name-error" role="alert" className="mt-1.5 text-sm font-medium text-rose-600 dark:text-rose-400">{fieldErrors.name}</p>}
                </div>
                <div>
                  <label htmlFor="institution-country" className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-200">Pays</label>
                  <input id="institution-country" type="text" placeholder="Burundi" value={form.country || ''} onChange={e => setForm(f => ({ ...f, country: e.target.value }))} className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
                </div>
                <div>
                  <label htmlFor="institution-website" className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-200">Site web</label>
                  <input id="institution-website" type="url" placeholder="https://universite.bi" value={form.website || ''} onChange={e => setForm(f => ({ ...f, website: e.target.value }))} className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
                </div>
                <div className="sm:col-span-2">
                  <p className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">Logo <span className="font-normal text-slate-400">(facultatif)</span></p>
                  <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/60 sm:flex-row sm:items-center">
                    <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
                      {logoPreview ? <img src={logoPreview} alt="Aperçu du logo" className="h-full w-full object-contain" /> : <ImageIcon className="h-8 w-8 text-slate-300" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <label htmlFor="institution-logo-file" className={`inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 ${isUploadingLogo ? 'pointer-events-none opacity-50' : ''}`}>
                        <Upload className="h-4 w-4" /> Choisir une image
                      </label>
                      <input id="institution-logo-file" type="file" accept="image/*" disabled={isUploadingLogo} onChange={e => { const file = e.target.files?.[0]; if (file) void handleLogoUpload(file); e.currentTarget.value = ''; }} className="sr-only" />
                      <p className="mt-1.5 text-xs text-slate-500">PNG, JPG, GIF, WebP ou SVG. Vous pouvez aussi saisir une URL ci-dessous.</p>
                      {isUploadingLogo && <div className="mt-3" aria-live="polite"><div className="mb-1 flex justify-between text-xs font-medium text-blue-700 dark:text-blue-300"><span>Téléversement en cours…</span><span>{logoUploadProgress}%</span></div><div role="progressbar" aria-label="Téléversement du logo" aria-valuemin={0} aria-valuemax={100} aria-valuenow={logoUploadProgress} className="h-1.5 overflow-hidden rounded-full bg-blue-100 dark:bg-slate-700"><div className="h-full bg-blue-600 transition-all" style={{ width: `${logoUploadProgress}%` }} /></div></div>}
                      {logoUploadError && <p role="alert" className="mt-2 text-sm font-medium text-rose-600 dark:text-rose-400">{logoUploadError}</p>}
                    </div>
                  </div>
                  <label htmlFor="institution-logo" className="mb-1.5 mt-4 block text-sm font-medium text-slate-600 dark:text-slate-300">Ou URL du logo</label>
                  <input id="institution-logo" type="url" disabled={isUploadingLogo} placeholder="https://exemple.bi/logo.png" value={form.logo_url || ''} onChange={e => { setForm(f => ({ ...f, logo_url: e.target.value })); setLogoPreview(e.target.value || null); setLogoUploadError(null); }} className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
                </div>
                <div className="sm:col-span-2">
                  <label htmlFor="institution-description" className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-200">Description <span className="font-normal text-slate-400">(facultatif)</span></label>
                  <textarea id="institution-description" rows={3} placeholder="Quelques mots sur l'institution et ses activités..." value={form.description || ''} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="w-full resize-y rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
                </div>
                <label className="sm:col-span-2 flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/70">
                  <span><span className="block text-sm font-semibold text-slate-800 dark:text-slate-100">Institution active</span><span className="mt-0.5 block text-xs text-slate-500">Les membres peuvent accéder aux services de leur institution.</span></span>
                  <input type="checkbox" checked={form.is_active ?? true} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                </label>
              </div>
            </section>}

            {!editing && step === 1 && <section aria-labelledby="institution-admin-heading">
              <div className="mb-6">
                <p className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">Étape 2 · Accès</p>
                <h3 id="institution-admin-heading" className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">Désignez l'administrateur</h3>
                <p className="mt-1 text-sm text-slate-500">Cette personne gérera les membres et les activités de l'institution.</p>
              </div>
              <div className="rounded-xl border border-blue-100 bg-blue-50/70 p-4 text-sm text-blue-900 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-200">Un mot de passe temporaire sera généré automatiquement. L'administrateur devra le modifier lors de sa première connexion.</div>
              <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2">
                <div>
                  <label htmlFor="institution-admin-name" className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-200">Nom complet <span className="text-rose-500">*</span></label>
                  <input id="institution-admin-name" type="text" required aria-invalid={Boolean(fieldErrors.adminName)} aria-describedby={fieldErrors.adminName ? 'institution-admin-name-error' : undefined} placeholder="Jean Martin" value={form.admin?.full_name || ''} onChange={e => { setForm(f => ({ ...f, admin: { ...(f.admin as any), full_name: e.target.value } })); setFieldErrors(errors => ({ ...errors, adminName: undefined })); }} className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
                  {fieldErrors.adminName && <p id="institution-admin-name-error" role="alert" className="mt-1.5 text-sm font-medium text-rose-600 dark:text-rose-400">{fieldErrors.adminName}</p>}
                </div>
                <div>
                  <label htmlFor="institution-admin-email" className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-200">Adresse e-mail <span className="text-rose-500">*</span></label>
                  <input id="institution-admin-email" data-dialog-autofocus type="email" required aria-invalid={Boolean(fieldErrors.adminEmail)} aria-describedby={fieldErrors.adminEmail ? 'institution-admin-email-error' : undefined} placeholder="jean.martin@universite.bi" value={form.admin?.email || ''} onChange={e => { setForm(f => ({ ...f, admin: { ...(f.admin as any), email: e.target.value } })); setFieldErrors(errors => ({ ...errors, adminEmail: undefined })); }} className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
                  {fieldErrors.adminEmail && <p id="institution-admin-email-error" role="alert" className="mt-1.5 text-sm font-medium text-rose-600 dark:text-rose-400">{fieldErrors.adminEmail}</p>}
                </div>
              </div>
            </section>}

            {step === steps.length - 1 && <section aria-labelledby="institution-review-heading">
              <div className="mb-6">
                <p className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">Étape {steps.length} · Confirmation</p>
                <h3 id="institution-review-heading" className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">Vérifiez les informations</h3>
                <p className="mt-1 text-sm text-slate-500">Vous pourrez modifier les coordonnées de l'institution après sa création.</p>
              </div>
              <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-3 bg-slate-50 px-5 py-4 dark:bg-slate-800/70">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300"><Building2 className="h-5 w-5" /></span>
                  <div className="min-w-0 flex-1"><p className="truncate font-bold text-slate-900 dark:text-white">{form.name || "Nom de l'institution"}</p><p className="text-sm text-slate-500">{form.country || 'Pays non renseigné'}</p></div>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${form.is_active ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' : 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300'}`}>{form.is_active ? 'Active' : 'Inactive'}</span>
                </div>
                <dl className="grid grid-cols-1 gap-x-6 gap-y-4 p-5 sm:grid-cols-2">
                  <div><dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">Site web</dt><dd className="mt-1 break-all text-sm text-slate-700 dark:text-slate-200">{form.website || 'Non renseigné'}</dd></div>
                  <div><dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">Logo</dt><dd className="mt-1 break-all text-sm text-slate-700 dark:text-slate-200">{form.logo_url || 'Non renseigné'}</dd></div>
                  <div className="sm:col-span-2"><dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">Description</dt><dd className="mt-1 whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-200">{form.description || 'Aucune description'}</dd></div>
                </dl>
                {!editing && <div className="border-t border-blue-200 bg-blue-50/70 px-5 py-5 dark:border-blue-900 dark:bg-blue-950/30">
                  <div className="flex items-start gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-blue-700 shadow-sm dark:bg-slate-900 dark:text-blue-300"><UserRound className="h-4 w-4" /></span>
                    <div className="min-w-0">
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white">Accès administrateur</h4>
                      <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Compte associé à cette institution</p>
                      <p className="mt-3 truncate text-sm font-semibold text-slate-800 dark:text-slate-100">{form.admin?.full_name || 'Nom complet'}</p>
                      <p className="break-all text-sm text-slate-600 dark:text-slate-300">{form.admin?.email || 'Adresse e-mail'}</p>
                    </div>
                  </div>
                </div>}
              </div>
              <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-200">
                <input type="checkbox" checked={reviewConfirmed} onChange={event => setReviewConfirmed(event.target.checked)} className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                <span>{editing ? "J'ai vérifié les informations et confirme les modifications." : "J'ai vérifié les informations et confirme la création de l'institution."}</span>
              </label>
            </section>}

            <div className="mt-8 flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 dark:border-slate-700 sm:flex-row sm:items-center sm:justify-between">
              <button type="button" onClick={() => setShowModal(false)} disabled={saving || isUploadingLogo} className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50 dark:text-slate-300 dark:hover:bg-slate-800">Annuler</button>
              <div className="flex items-center justify-end gap-2">
                {step > 0 && <button type="button" disabled={saving || isUploadingLogo} onClick={() => { setReviewConfirmed(false); setStep(current => Math.max(0, current - 1)); }} className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"><ChevronLeft className="h-4 w-4" /> Précédent</button>}
                {step < steps.length - 1 ? <button type="button" disabled={isUploadingLogo} onClick={handleContinue} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-500/20 disabled:cursor-wait disabled:opacity-60">{isUploadingLogo ? 'Téléversement…' : 'Continuer'} <ChevronRight className="h-4 w-4" /></button> : <button type="button" onClick={() => void handleSave()} disabled={saving || isUploadingLogo || !reviewConfirmed} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-500/20 disabled:cursor-wait disabled:opacity-60">{saving ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> : <Save className="h-4 w-4" />}{saving ? 'Enregistrement...' : editing ? 'Enregistrer les modifications' : "Créer l'institution"}</button>}
              </div>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
