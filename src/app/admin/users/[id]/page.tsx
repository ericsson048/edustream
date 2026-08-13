import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import AdminSidebar from '../../../../components/AdminSidebar';
import Header from '../../../../components/Header';
import { adminService } from '../../../../services/adminService';
import { useToast } from '../../../../contexts/ToastContext';
import type { AuthUser, UserRole } from '../../../../types/auth';

export default function UserDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (!id) return;
    adminService.listUsers().then((users) => {
      const found = users.find((u) => u.id === id);
      if (found) setUser(found);
      else showToast('User not found.', 'error');
    }).catch(() => showToast('Failed to load user.', 'error'))
    .finally(() => setLoading(false));
  }, [id, showToast]);

  const handleRoleChange = async (newRole: UserRole) => {
    if (!user) return;
    setUpdating(true);
    try {
      const updated = await adminService.updateUser(user.id, { role: newRole });
      setUser(updated);
      showToast('Role updated.', 'success');
    } catch {
      showToast('Failed to update role.', 'error');
    } finally {
      setUpdating(false);
    }
  };

  const handleToggleActive = async () => {
    if (!user) return;
    setUpdating(true);
    try {
      const updated = await adminService.updateUser(user.id, { is_active: !user.is_active });
      setUser(updated);
      showToast(`User ${updated.is_active ? 'activated' : 'deactivated'}.`, 'success');
    } catch {
      showToast('Failed to update status.', 'error');
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950">
        <AdminSidebar />
        <main className="flex-1 ml-64 p-8 text-center text-slate-500">Loading...</main>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950">
        <AdminSidebar />
        <main className="flex-1 ml-64 p-8 text-center text-slate-500">User not found.</main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950">
      <AdminSidebar />
      <main className="flex-1 ml-64">
        <Header />
        <div className="p-8 max-w-4xl mx-auto">
          <button onClick={() => navigate(-1)} className="text-sm text-blue-600 dark:text-blue-400 hover:underline mb-4">&larr; Back</button>
          <div className="flex items-center gap-6 mb-8">
            <div className="w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center text-xl font-bold text-blue-600 dark:text-blue-400">
              {user.full_name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 className="text-3xl font-bold dark:text-white">{user.full_name}</h1>
              <p className="text-slate-500 dark:text-slate-400">{user.email}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-6">
              <h2 className="text-lg font-semibold mb-4 dark:text-white">Role</h2>
              <div className="flex gap-2">
                {(['STUDENT', 'INSTRUCTOR', 'ADMIN'] as UserRole[]).map((role) => (
                  <button
                    key={role}
                    disabled={updating}
                    onClick={() => handleRoleChange(role)}
                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${
                      user.role === role
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    {role.charAt(0) + role.slice(1).toLowerCase()}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-6">
              <h2 className="text-lg font-semibold mb-4 dark:text-white">Account Status</h2>
              <div className="flex items-center justify-between">
                <span className={`px-3 py-1.5 rounded-full text-sm font-bold ${
                  user.is_active !== false
                    ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                    : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                }`}>
                  {user.is_active !== false ? 'Active' : 'Inactive'}
                </span>
                <button
                  onClick={handleToggleActive}
                  disabled={updating}
                  className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${
                    user.is_active !== false
                      ? 'bg-red-500 hover:bg-red-600 text-white'
                      : 'bg-emerald-500 hover:bg-emerald-600 text-white'
                  }`}
                >
                  {user.is_active !== false ? 'Deactivate' : 'Activate'}
                </button>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-6">
              <h2 className="text-lg font-semibold mb-4 dark:text-white">Details</h2>
              <dl className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <dt className="text-slate-500 dark:text-slate-400">Location</dt>
                  <dd className="dark:text-slate-200">{user.location || '-'}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-500 dark:text-slate-400">Title</dt>
                  <dd className="dark:text-slate-200">{user.title || '-'}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-500 dark:text-slate-400">Joined</dt>
                  <dd className="dark:text-slate-200">{user.date_joined ? new Date(user.date_joined).toLocaleDateString() : '-'}</dd>
                </div>
              </dl>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
