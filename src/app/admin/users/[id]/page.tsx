import { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import AdminSidebar from '../../../../components/AdminSidebar';
import Header from '../../../../components/Header';
import { adminService } from '../../../../services/adminService';
import { authService } from '../../../../services/authService';
import { useToast } from '../../../../contexts/ToastContext';
import type { AuthUser, UserRole } from '../../../../types/auth';
import { ArrowLeft, Mail, MapPin, Globe, Calendar, Shield, Building2, BookOpen, Award, CheckSquare } from 'lucide-react';

const ROLES: UserRole[] = ['STUDENT', 'INSTRUCTOR', 'INSTITUTION_ADMIN', 'ADMIN'];
const ROLE_LABELS: Record<string, string> = {
  STUDENT: 'Étudiant', INSTRUCTOR: 'Instructeur',
  INSTITUTION_ADMIN: 'Institution Admin', ADMIN: 'Admin',
};
const ROLE_COLORS: Record<string, string> = {
  ADMIN: 'bg-purple-100 text-purple-700', INSTRUCTOR: 'bg-blue-100 text-blue-700',
  INSTITUTION_ADMIN: 'bg-amber-100 text-amber-700', STUDENT: 'bg-emerald-100 text-emerald-700',
};

interface UserStats {
  courses_enrolled: number;
  courses_completed: number;
  certificates_count: number;
  assignments_submitted: number;
  quiz_attempts: number;
}

export default function UserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      authService.getUser(id),
    ])
      .then(([u]) => { setUser(u); })
      .catch(() => showToast('Utilisateur introuvable.', 'error'))
      .finally(() => setLoading(false));
  }, [id, showToast]);

  const handleRoleChange = async (newRole: UserRole) => {
    if (!user || updating) return;
    setUpdating(true);
    try {
      const updated = await adminService.updateUser(user.id, { role: newRole });
      setUser(updated);
      showToast('Rôle mis à jour.', 'success');
    } catch {
      showToast('Erreur lors de la mise à jour du rôle.', 'error');
    } finally {
      setUpdating(false);
    }
  };

  const handleToggleActive = async () => {
    if (!user || updating) return;
    setUpdating(true);
    try {
      const updated = await adminService.updateUser(user.id, { is_active: !(user as any).is_active });
      setUser(updated);
      showToast(`Compte ${(updated as any).is_active ? 'activé' : 'désactivé'}.`, 'success');
    } catch {
      showToast('Erreur lors de la mise à jour.', 'error');
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950">
        <AdminSidebar />
        <main className="flex-1 ml-64 flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </main>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950">
        <AdminSidebar />
        <main className="flex-1 ml-64 p-8 text-center text-slate-500">Utilisateur introuvable.</main>
      </div>
    );
  }

  const isActive = (user as any).is_active !== false;
  const avatarSrc = user.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.full_name)}&background=2563eb&color=fff&size=128`;

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white">
      <AdminSidebar />
      <main className="flex-1 ml-64">
        <Header />
        <div className="p-8 max-w-4xl mx-auto">

          <button onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 mb-6 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Retour
          </button>

          {/* Profile banner */}
          <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-6 text-white mb-6 shadow-lg">
            <div className="flex items-center gap-5">
              <img src={avatarSrc} alt="" className="w-20 h-20 rounded-full object-cover border-4 border-white/30 shadow-xl" />
              <div className="flex-1">
                <h1 className="text-2xl font-bold">{user.full_name}</h1>
                {user.title && <p className="text-blue-200 text-sm">{user.title}</p>}
                <div className="flex flex-wrap gap-3 mt-2 text-sm text-blue-100">
                  <span className="flex items-center gap-1"><Mail className="w-3.5 h-3.5" />{user.email}</span>
                  {user.location && <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{user.location}</span>}
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${ROLE_COLORS[user.role] || 'bg-white/20 text-white'}`}>
                    {ROLE_LABELS[user.role] || user.role}
                  </span>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${isActive ? 'bg-emerald-500/30' : 'bg-red-500/30'}`}>
                    {isActive ? 'Actif' : 'Inactif'}
                  </span>
                  {(user as any).must_change_password && (
                    <span className="px-2.5 py-0.5 bg-amber-500/30 rounded-full text-xs font-bold">Mdp à changer</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            {/* Role management */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <Shield className="w-5 h-5 text-blue-600" />
                <h2 className="text-base font-bold">Rôle</h2>
              </div>
              <div className="flex flex-wrap gap-2">
                {ROLES.map(role => (
                  <button key={role} disabled={updating} onClick={() => handleRoleChange(role)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                      user.role === role
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}>
                    {ROLE_LABELS[role]}
                  </button>
                ))}
              </div>
            </div>

            {/* Account status */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
              <h2 className="text-base font-bold mb-4">Statut du compte</h2>
              <div className="flex items-center justify-between">
                <div>
                  <span className={`px-3 py-1.5 rounded-full text-sm font-bold ${
                    isActive ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                              : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                  }`}>{isActive ? 'Actif' : 'Inactif'}</span>
                  {(user as any).must_change_password && (
                    <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">⚠ Doit changer son mot de passe</p>
                  )}
                </div>
                <button disabled={updating} onClick={handleToggleActive}
                  className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors ${
                    isActive ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-emerald-500 hover:bg-emerald-600 text-white'
                  } disabled:opacity-50`}>
                  {isActive ? 'Désactiver' : 'Activer'}
                </button>
              </div>
            </div>

            {/* Profile info */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
              <h2 className="text-base font-bold mb-4">Informations</h2>
              <dl className="space-y-3 text-sm">
                {[
                  { icon: Mail, label: 'Email', value: user.email },
                  { icon: MapPin, label: 'Localisation', value: user.location },
                  { icon: Globe, label: 'Site web', value: user.website },
                  { icon: Building2, label: 'Institution', value: (user as any).institution_name },
                  { icon: Calendar, label: 'Inscrit le', value: user.date_joined ? new Date(user.date_joined).toLocaleDateString('fr-FR') : null },
                ].map(({ icon: Icon, label, value }) => value ? (
                  <div key={label} className="flex items-start gap-3">
                    <Icon className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <span className="text-xs text-slate-400 block">{label}</span>
                      <span className="text-slate-700 dark:text-slate-200">{value}</span>
                    </div>
                  </div>
                ) : null)}
              </dl>
            </div>

            {/* Bio */}
            {user.bio && (
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
                <h2 className="text-base font-bold mb-3">Biographie</h2>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{user.bio}</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
