import AdminSidebar from '../../../components/AdminSidebar';
import Pagination from '../../../components/Pagination';
import Header from '../../../components/Header';
import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Search, UserPlus, Download } from 'lucide-react';
import { adminService } from '../../../services/adminService';
import { useToast } from '../../../contexts/ToastContext';
import type { AuthUser } from '../../../types/auth';

const ROLE_COLORS: Record<string, string> = {
  ADMIN: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400',
  INSTRUCTOR: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
  INSTITUTION_ADMIN: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400',
  STUDENT: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400',
};

const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Admin', INSTRUCTOR: 'Instructeur',
  INSTITUTION_ADMIN: 'Institution Admin', STUDENT: 'Étudiant',
};

function Avatar({ user }: { user: AuthUser }) {
  if (user.avatar_url) {
    return <img src={user.avatar_url} alt="" className="w-9 h-9 rounded-full object-cover flex-shrink-0" />;
  }
  return (
    <div className="w-9 h-9 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0 text-sm font-bold text-blue-600 dark:text-blue-400">
      {user.full_name?.[0]?.toUpperCase() || '?'}
    </div>
  );
}

export default function ManageUsers() {
  const [searchParams] = useSearchParams();
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState(searchParams.get('role') || '');
  const [activeFilter, setActiveFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();
  const PAGE_SIZE = 15;

  const load = () => {
    setLoading(true);
    const params: Record<string, string> = {};
    if (search) params.search = search;
    if (roleFilter) params.role = roleFilter;
    if (activeFilter) params.is_active = activeFilter;

    adminService
      .listUsers(params)
      .then(data => { setUsers(data); setTotal(data.length); setPage(1); })
      .catch(() => showToast('Impossible de charger les utilisateurs.', 'error'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [search, roleFilter, activeFilter]);

  const urlRole = searchParams.get('role') || '';
  useEffect(() => { setRoleFilter(urlRole); }, [urlRole]);

  const totalPages = Math.ceil(users.length / PAGE_SIZE) || 1;
  const paginatedUsers = users.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const exportCSV = () => {
    const header = 'Nom,Email,Rôle,Statut,Date inscription';
    const rows = users.map(u =>
      `"${u.full_name}","${u.email}","${u.role}","${(u as any).is_active !== false ? 'Actif' : 'Inactif'}","${u.date_joined ? new Date(u.date_joined).toLocaleDateString('fr-FR') : ''}"`
    );
    const blob = new Blob([[header, ...rows].join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'users.csv'; a.click();
    URL.revokeObjectURL(url);
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
              <h1 className="text-3xl font-bold tracking-tight">Utilisateurs</h1>
              <p className="text-slate-500 dark:text-slate-400 mt-1">{total} utilisateur{total !== 1 ? 's' : ''} au total</p>
            </div>
            <div className="flex gap-2">
              <button onClick={exportCSV} className="flex items-center gap-2 px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                <Download className="w-4 h-4" /> Export CSV
              </button>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-wrap gap-3">
              <div className="relative flex-1 min-w-48">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                <input type="text" placeholder="Rechercher par nom ou email..."
                  value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white" />
              </div>
              <select value={roleFilter} onChange={e => { setRoleFilter(e.target.value); setPage(1); }}
                className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white">
                <option value="">Tous les rôles</option>
                <option value="STUDENT">Étudiant</option>
                <option value="INSTRUCTOR">Instructeur</option>
                <option value="INSTITUTION_ADMIN">Institution Admin</option>
                <option value="ADMIN">Admin</option>
              </select>
              <select value={activeFilter} onChange={e => { setActiveFilter(e.target.value); setPage(1); }}
                className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white">
                <option value="">Tous les statuts</option>
                <option value="true">Actif</option>
                <option value="false">Inactif</option>
              </select>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-16">
                <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <table className="w-full text-left">
                <thead className="bg-slate-50 dark:bg-slate-800/50 text-xs uppercase text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="px-6 py-3">Utilisateur</th>
                    <th className="px-6 py-3">Rôle</th>
                    <th className="px-6 py-3">Institution</th>
                    <th className="px-6 py-3">Statut</th>
                    <th className="px-6 py-3">Inscrit le</th>
                    <th className="px-6 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {paginatedUsers.length === 0 ? (
                    <tr><td colSpan={6} className="text-center py-12 text-slate-400">Aucun utilisateur trouvé</td></tr>
                  ) : paginatedUsers.map(u => (
                    <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar user={u} />
                          <div className="min-w-0">
                            <Link to={`/admin/users/${u.id}`} className="font-semibold text-slate-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors truncate block">
                              {u.full_name}
                            </Link>
                            <p className="text-xs text-slate-500 truncate">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-3">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${ROLE_COLORS[u.role] || 'bg-slate-100 text-slate-600'}`}>
                          {ROLE_LABELS[u.role] || u.role}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-sm text-slate-500">
                        {(u as any).institution_name || '—'}
                      </td>
                      <td className="px-6 py-3">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                          (u as any).is_active !== false
                            ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                            : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                        }`}>{(u as any).is_active !== false ? 'Actif' : 'Inactif'}</span>
                      </td>
                      <td className="px-6 py-3 text-sm text-slate-500">
                        {u.date_joined ? new Date(u.date_joined).toLocaleDateString('fr-FR') : '—'}
                      </td>
                      <td className="px-6 py-3 text-right">
                        <Link to={`/admin/users/${u.id}`}
                          className="px-3 py-1.5 text-xs font-bold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors">
                          Gérer
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {!loading && <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />}
          </div>
        </div>
      </main>
    </div>
  );
}
