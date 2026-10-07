import Sidebar from '../../components/Sidebar';
import Header from '../../components/Header';
import {
  User, Mail, Camera, Save, Lock, Bell, Eye, EyeOff,
  Shield, MapPin, Globe, Briefcase, FileText,
  BookOpen, Award, CheckSquare, TrendingUp, Flame, Clock,
  CheckCircle, AlertCircle,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { apiClient } from '../../services/apiClient';
import { authService } from '../../services/authService';

type ProfileTab = 'personal' | 'security' | 'notifications';

interface MyStats {
  courses_enrolled: number;
  courses_completed: number;
  certificates_count: number;
  assignments_submitted: number;
  quiz_attempts: number;
  total_focus_minutes: number;
  streak_days: number;
}

interface NotifPrefs {
  notif_email: boolean;
  notif_push: boolean;
  notif_new_course: boolean;
  notif_assignments: boolean;
  notif_grades: boolean;
  notif_messages: boolean;
  notif_live: boolean;
}

const DEFAULT_PREFS: NotifPrefs = {
  notif_email: true,
  notif_push: true,
  notif_new_course: true,
  notif_assignments: true,
  notif_grades: true,
  notif_messages: true,
  notif_live: true,
};

// ── Password strength ───────────────────────────────────────────────────────
function getPasswordStrength(pw: string): { score: number; label: string; color: string } {
  if (!pw) return { score: 0, label: '', color: '' };
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  if (score <= 1) return { score, label: 'Faible', color: 'bg-red-500' };
  if (score <= 3) return { score, label: 'Moyen', color: 'bg-amber-500' };
  return { score, label: 'Fort', color: 'bg-emerald-500' };
}

// ── Toggle switch ───────────────────────────────────────────────────────────
function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className={`relative w-11 h-6 rounded-full transition-colors ${value ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-600'}`}
    >
      <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${value ? 'translate-x-5' : ''}`} />
    </button>
  );
}

// ── Stat card ───────────────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, color }: { icon: typeof BookOpen; label: string; value: string | number; color: string }) {
  return (
    <div className="flex flex-col items-center gap-1 p-4 bg-slate-50 dark:bg-slate-800 rounded-xl">
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${color}`}>
        <Icon className="w-4 h-4 text-white" />
      </div>
      <span className="text-xl font-bold text-slate-900 dark:text-white">{value}</span>
      <span className="text-xs text-slate-500 dark:text-slate-400 text-center">{label}</span>
    </div>
  );
}

// ── Main component ──────────────────────────────────────────────────────────
export default function Profile() {
  const { user, updateMe, changePassword, refreshMe } = useAuth();
  const { showToast } = useToast();
  const [tab, setTab] = useState<ProfileTab>('personal');

  // ── Personal fields ──
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [title, setTitle] = useState('');
  const [bio, setBio] = useState('');
  const [location, setLocation] = useState('');
  const [website, setWebsite] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Security fields ──
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);

  // ── Notifications ──
  const [prefs, setPrefs] = useState<NotifPrefs>(DEFAULT_PREFS);
  const [prefsLoading, setPrefsLoading] = useState(false);
  const [prefsSaving, setPrefsSaving] = useState(false);

  // ── Stats ──
  const [stats, setStats] = useState<MyStats | null>(null);

  // Init from user
  useEffect(() => {
    if (!user) return;
    setFullName(user.full_name || '');
    setEmail(user.email || '');
    setTitle(user.title || '');
    setBio(user.bio || '');
    setLocation(user.location || '');
    setWebsite(user.website || '');
  }, [user]);

  // Load stats & prefs on mount
  useEffect(() => {
    authService.getMyStats().then(setStats).catch(() => {});
    setPrefsLoading(true);
    authService.getMyPreferences()
      .then((p) => setPrefs({ ...DEFAULT_PREFS, ...(p as Partial<NotifPrefs>) }))
      .catch(() => {})
      .finally(() => setPrefsLoading(false));
  }, []);

  // ── Handlers ──
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      await updateMe({ full_name: fullName.trim(), email, title, bio, location, website });
      showToast('Profil mis à jour.', 'success');
    } catch {
      showToast('Erreur de mise à jour.', 'error');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleAvatarUpload = async (file: File) => {
    if (file.size > 2 * 1024 * 1024) { showToast("L'image doit faire moins de 2 Mo.", 'error'); return; }
    setAvatarUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      const { data } = await apiClient.post<{ url: string }>('/upload-image/', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      await updateMe({ avatar_url: data.url });
      await refreshMe();
      showToast('Avatar mis à jour.', 'success');
    } catch {
      showToast("Erreur lors de l'upload.", 'error');
    } finally {
      setAvatarUploading(false);
    }
  };

  const handleRemoveAvatar = async () => {
    try {
      await updateMe({ avatar_url: '' });
      await refreshMe();
      showToast('Avatar supprimé.', 'success');
    } catch {
      showToast('Erreur lors de la suppression.', 'error');
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) { showToast('Les mots de passe ne correspondent pas.', 'error'); return; }
    if (newPassword.length < 8) { showToast('Le mot de passe doit faire au moins 8 caractères.', 'error'); return; }
    setPasswordLoading(true);
    try {
      await changePassword(currentPassword, newPassword);
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
      showToast('Mot de passe modifié.', 'success');
    } catch (err: any) {
      showToast(err?.response?.data?.detail || 'Erreur lors du changement de mot de passe.', 'error');
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleSavePrefs = async () => {
    setPrefsSaving(true);
    try {
      const saved = await authService.updateMyPreferences(prefs as unknown as Record<string, boolean>);
      setPrefs({ ...DEFAULT_PREFS, ...(saved as Partial<NotifPrefs>) });
      showToast('Préférences sauvegardées.', 'success');
    } catch {
      showToast('Erreur lors de la sauvegarde.', 'error');
    } finally {
      setPrefsSaving(false);
    }
  };

  const pwStrength = getPasswordStrength(newPassword);

  const tabs: { key: ProfileTab; label: string; icon: typeof Shield }[] = [
    { key: 'personal', label: 'Informations personnelles', icon: User },
    { key: 'security', label: 'Sécurité', icon: Shield },
    { key: 'notifications', label: 'Notifications', icon: Bell },
  ];

  const avatarSrc = user?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.full_name || 'U')}&background=2563eb&color=fff&size=128`;

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950 font-sans text-slate-900 dark:text-white">
      <Sidebar />
      <main className="flex-1 ml-64">
        <Header />
        <div className="p-8 max-w-4xl mx-auto">

          {/* ── Header banner ── */}
          <div className="relative mb-8 rounded-2xl overflow-hidden bg-gradient-to-br from-blue-600 to-indigo-700 p-8 text-white shadow-lg">
            <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 80% 20%, white 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
            <div className="relative flex items-center gap-6">
              {/* Avatar */}
              <div className="relative flex-shrink-0">
                <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-white/30 shadow-xl">
                  <img src={avatarSrc} alt={user?.full_name} className="w-full h-full object-cover" />
                </div>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={avatarUploading}
                  className="absolute -bottom-1 -right-1 w-8 h-8 bg-white text-blue-600 rounded-full flex items-center justify-center shadow-lg hover:bg-blue-50 transition-colors border-2 border-blue-100 disabled:opacity-50"
                >
                  {avatarUploading
                    ? <div className="w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                    : <Camera className="w-3.5 h-3.5" />
                  }
                </button>
                <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/gif,image/webp" className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleAvatarUpload(f); e.target.value = ''; }} />
              </div>

              {/* User info */}
              <div className="flex-1 min-w-0">
                <h1 className="text-2xl font-bold truncate">{user?.full_name || 'Utilisateur'}</h1>
                {user?.title && <p className="text-blue-200 text-sm mt-0.5">{user.title}</p>}
                <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-blue-100">
                  <span className="flex items-center gap-1"><Mail className="w-3.5 h-3.5" />{user?.email}</span>
                  {user?.location && <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{user.location}</span>}
                  {user?.website && <a href={user.website} target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:text-white"><Globe className="w-3.5 h-3.5" />{user.website.replace(/^https?:\/\//, '')}</a>}
                </div>
                <div className="flex items-center gap-2 mt-3">
                  <span className="px-2.5 py-0.5 bg-white/20 rounded-full text-xs font-bold uppercase tracking-wide">{user?.role}</span>
                  {user?.email_verified
                    ? <span className="flex items-center gap-1 px-2.5 py-0.5 bg-emerald-500/30 rounded-full text-xs font-bold"><CheckCircle className="w-3 h-3" />Email vérifié</span>
                    : <span className="flex items-center gap-1 px-2.5 py-0.5 bg-amber-500/30 rounded-full text-xs font-bold"><AlertCircle className="w-3 h-3" />Email non vérifié</span>
                  }
                </div>
              </div>
            </div>
          </div>

          {/* ── Stats bar ── */}
          {stats && (
            <div className="grid grid-cols-4 sm:grid-cols-7 gap-3 mb-8">
              <StatCard icon={BookOpen}     label="Cours suivis"     value={stats.courses_enrolled}     color="bg-blue-500" />
              <StatCard icon={TrendingUp}   label="Complétés"        value={stats.courses_completed}    color="bg-emerald-500" />
              <StatCard icon={Award}        label="Certificats"      value={stats.certificates_count}   color="bg-amber-500" />
              <StatCard icon={CheckSquare}  label="Devoirs rendus"   value={stats.assignments_submitted} color="bg-violet-500" />
              <StatCard icon={FileText}     label="Quiz passés"      value={stats.quiz_attempts}        color="bg-pink-500" />
              <StatCard icon={Clock}        label="Min. focus"       value={stats.total_focus_minutes}  color="bg-cyan-500" />
              <StatCard icon={Flame}        label="Jours consécutifs" value={stats.streak_days}         color="bg-orange-500" />
            </div>
          )}

          {/* ── Tabs card ── */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="flex border-b border-slate-200 dark:border-slate-700 overflow-x-auto">
              {tabs.map((t) => (
                <button key={t.key} onClick={() => setTab(t.key)}
                  className={`px-6 py-4 text-sm font-bold border-b-2 whitespace-nowrap flex items-center gap-2 transition-colors ${
                    tab === t.key
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                  }`}
                >
                  <t.icon className="w-4 h-4" />
                  {t.label}
                </button>
              ))}
            </div>

            <div className="p-8">

              {/* ── PERSONAL TAB ── */}
              {tab === 'personal' && (
                <form className="space-y-6" onSubmit={handleSaveProfile}>
                  {/* Avatar actions */}
                  <div className="flex items-center gap-4 pb-6 border-b border-slate-100 dark:border-slate-700">
                    <img src={avatarSrc} alt="" className="w-16 h-16 rounded-full object-cover border-2 border-slate-200 dark:border-slate-600" />
                    <div>
                      <p className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-1">Photo de profil</p>
                      <p className="text-xs text-slate-500 mb-2">JPG, PNG, GIF ou WebP — 2 Mo max</p>
                      <div className="flex gap-3">
                        <button type="button" onClick={() => fileInputRef.current?.click()} className="text-xs font-bold text-blue-600 hover:text-blue-700">Changer</button>
                        {user?.avatar_url && <button type="button" onClick={handleRemoveAvatar} className="text-xs font-bold text-red-500 hover:text-red-600">Supprimer</button>}
                      </div>
                    </div>
                  </div>

                  {/* Name */}
                  <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-200 mb-2">Nom complet</label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                      <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} required
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white transition-colors" />
                    </div>
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-200 mb-2">Email</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                      <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white transition-colors" />
                    </div>
                  </div>

                  {/* Title */}
                  <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-200 mb-2">Titre professionnel</label>
                    <div className="relative">
                      <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                      <input type="text" value={title} onChange={(e) => setTitle(e.target.value)}
                        placeholder="ex: Développeur Full Stack & Enseignant"
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white transition-colors" />
                    </div>
                  </div>

                  {/* Bio */}
                  <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-200 mb-2">Biographie</label>
                    <div className="relative">
                      <FileText className="absolute left-3 top-3 text-slate-400 w-4 h-4" />
                      <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={4}
                        placeholder="Décrivez-vous en quelques mots..."
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white transition-colors resize-none" />
                    </div>
                    <p className="text-xs text-slate-400 mt-1 text-right">{bio.length}/500 caractères</p>
                  </div>

                  {/* Location + Website */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-bold text-slate-700 dark:text-slate-200 mb-2">Localisation</label>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                        <input type="text" value={location} onChange={(e) => setLocation(e.target.value)}
                          placeholder="ex: Douala, Cameroun"
                          className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white transition-colors" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 dark:text-slate-200 mb-2">Site web</label>
                      <div className="relative">
                        <Globe className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                        <input type="url" value={website} onChange={(e) => setWebsite(e.target.value)}
                          placeholder="https://monsite.com"
                          className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white transition-colors" />
                      </div>
                    </div>
                  </div>

                  <div className="pt-6 border-t border-slate-100 dark:border-slate-700 flex justify-end">
                    <button type="submit" disabled={savingProfile}
                      className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50">
                      {savingProfile
                        ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        : <Save className="w-4 h-4" />
                      }
                      {savingProfile ? 'Sauvegarde...' : 'Sauvegarder'}
                    </button>
                  </div>
                </form>
              )}

              {/* ── SECURITY TAB ── */}
              {tab === 'security' && (
                <form className="space-y-6 max-w-lg" onSubmit={handleChangePassword}>
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
                      <Lock className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white">Changer le mot de passe</h3>
                      <p className="text-sm text-slate-500">Mettez à jour régulièrement votre mot de passe.</p>
                    </div>
                  </div>

                  {/* Current password */}
                  <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-200 mb-2">Mot de passe actuel</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                      <input type={showCurrent ? 'text' : 'password'} value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required
                        className="w-full pl-10 pr-10 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white transition-colors" />
                      <button type="button" onClick={() => setShowCurrent(!showCurrent)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                        {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* New password */}
                  <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-200 mb-2">Nouveau mot de passe</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                      <input type={showNew ? 'text' : 'password'} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required
                        className="w-full pl-10 pr-10 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white transition-colors" />
                      <button type="button" onClick={() => setShowNew(!showNew)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                        {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {/* Strength bar */}
                    {newPassword && (
                      <div className="mt-2">
                        <div className="flex gap-1 mb-1">
                          {[1, 2, 3, 4, 5].map((i) => (
                            <div key={i} className={`h-1.5 flex-1 rounded-full transition-all ${i <= pwStrength.score ? pwStrength.color : 'bg-slate-200 dark:bg-slate-600'}`} />
                          ))}
                        </div>
                        <p className={`text-xs font-semibold ${pwStrength.score <= 1 ? 'text-red-500' : pwStrength.score <= 3 ? 'text-amber-500' : 'text-emerald-500'}`}>
                          Force : {pwStrength.label}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Confirm */}
                  <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-200 mb-2">Confirmer le nouveau mot de passe</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                      <input type={showConfirm ? 'text' : 'password'} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required
                        className={`w-full pl-10 pr-10 py-2.5 bg-slate-50 dark:bg-slate-800 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white transition-colors ${
                          confirmPassword && confirmPassword !== newPassword
                            ? 'border-red-400 bg-red-50 dark:bg-red-900/20'
                            : 'border-slate-200 dark:border-slate-600'
                        }`} />
                      <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                        {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {confirmPassword && confirmPassword !== newPassword && (
                      <p className="text-xs text-red-500 mt-1">Les mots de passe ne correspondent pas</p>
                    )}
                  </div>

                  <div className="pt-6 border-t border-slate-100 dark:border-slate-700 flex justify-end">
                    <button type="submit" disabled={passwordLoading || (!!confirmPassword && confirmPassword !== newPassword)}
                      className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50">
                      {passwordLoading
                        ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        : <Lock className="w-4 h-4" />
                      }
                      {passwordLoading ? 'Mise à jour...' : 'Mettre à jour'}
                    </button>
                  </div>
                </form>
              )}

              {/* ── NOTIFICATIONS TAB ── */}
              {tab === 'notifications' && (
                <div className="space-y-6 max-w-lg">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
                      <Bell className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white">Préférences de notification</h3>
                      <p className="text-sm text-slate-500">Choisissez comment être notifié. Sauvegardé en base de données.</p>
                    </div>
                  </div>

                  {prefsLoading ? (
                    <div className="flex items-center justify-center py-10">
                      <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                  ) : (
                    <>
                      {/* Channels */}
                      <div className="space-y-1">
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Canaux</h4>
                        {([
                          { key: 'notif_email', label: 'Notifications par email', desc: 'Recevez les alertes par email' },
                          { key: 'notif_push',  label: 'Notifications push',       desc: 'Alertes sur votre appareil' },
                        ] as { key: keyof NotifPrefs; label: string; desc: string }[]).map(({ key, label, desc }) => (
                          <div key={key} className="flex items-center justify-between py-3 border-b border-slate-100 dark:border-slate-700 last:border-0">
                            <div>
                              <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{label}</p>
                              <p className="text-xs text-slate-400">{desc}</p>
                            </div>
                            <Toggle value={prefs[key]} onChange={(v) => setPrefs((p) => ({ ...p, [key]: v }))} />
                          </div>
                        ))}
                      </div>

                      {/* Events */}
                      <div className="space-y-1">
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Événements</h4>
                        {([
                          { key: 'notif_new_course',   label: 'Nouveaux cours publiés',       desc: 'Lorsqu\'un nouveau cours est disponible' },
                          { key: 'notif_assignments',  label: 'Mises à jour des devoirs',     desc: 'Nouveaux devoirs ou modifications' },
                          { key: 'notif_grades',       label: 'Notes publiées',               desc: 'Lorsqu\'une note est disponible' },
                          { key: 'notif_messages',     label: 'Nouveaux messages',            desc: 'Messages directs et conversations' },
                          { key: 'notif_live',         label: 'Sessions live',                desc: 'Début d\'une session live de vos cours' },
                        ] as { key: keyof NotifPrefs; label: string; desc: string }[]).map(({ key, label, desc }) => (
                          <div key={key} className="flex items-center justify-between py-3 border-b border-slate-100 dark:border-slate-700 last:border-0">
                            <div>
                              <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{label}</p>
                              <p className="text-xs text-slate-400">{desc}</p>
                            </div>
                            <Toggle value={prefs[key]} onChange={(v) => setPrefs((p) => ({ ...p, [key]: v }))} />
                          </div>
                        ))}
                      </div>

                      <div className="pt-6 border-t border-slate-100 dark:border-slate-700 flex justify-end">
                        <button onClick={handleSavePrefs} disabled={prefsSaving}
                          className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50">
                          {prefsSaving
                            ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            : <Save className="w-4 h-4" />
                          }
                          {prefsSaving ? 'Sauvegarde...' : 'Sauvegarder'}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}

            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
