import AdminSidebar from '../../../components/AdminSidebar';
import Pagination from '../../../components/Pagination';
import Header from '../../../components/Header';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search } from 'lucide-react';
import { adminService } from '../../../services/adminService';
import { useToast } from '../../../contexts/ToastContext';
import type { AuthUser } from '../../../types/auth';

export default function ManageUsers() {
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [activeFilter, setActiveFilter] = useState('');
  const { showToast } = useToast();
  const PAGE_SIZE = 10;

  useEffect(() => {
    const params: Record<string, string> = {};
    if (search) params.search = search;
    if (roleFilter) params.role = roleFilter;
    if (activeFilter) params.is_active = activeFilter;

    adminService
      .listUsers(params)
      .then(setUsers)
      .catch(() => showToast('Impossible de charger les utilisateurs.', 'error'));
  }, [showToast, search, roleFilter, activeFilter]);

  const totalPages = Math.ceil(users.length / PAGE_SIZE) || 1;
  const paginatedUsers = users.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950">
      <AdminSidebar />
      <main className="flex-1 ml-64">
        <Header />
        <div className="p-8 max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold mb-6 dark:text-white">Manage Users</h1>
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex gap-4">
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search users..."
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <select
                value={roleFilter}
                onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}
                className="bg-slate-50 dark:bg-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Roles</option>
                <option value="STUDENT">Student</option>
                <option value="INSTRUCTOR">Instructor</option>
                <option value="ADMIN">Admin</option>
              </select>
              <select
                value={activeFilter}
                onChange={(e) => { setActiveFilter(e.target.value); setPage(1); }}
                className="bg-slate-50 dark:bg-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Status</option>
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </select>
            </div>
            <table className="w-full text-left">
              <thead className="bg-slate-50 dark:bg-slate-800/50 text-xs uppercase text-slate-500 dark:text-slate-400">
                <tr>
                  <th className="px-6 py-4">Name</th>
                  <th className="px-6 py-4">Email</th>
                  <th className="px-6 py-4">Role</th>
                  <th className="px-6 py-4">Status</th>
                </tr>
              </thead>
              <tbody>
                {paginatedUsers.map((u) => (
                  <tr key={u.id} className="border-t border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/30">
                    <td className="px-6 py-4">
                      <Link to={`/admin/users/${u.id}`} className="font-semibold text-slate-900 dark:text-slate-100 hover:text-blue-600 dark:hover:text-blue-400">
                        {u.full_name}
                      </Link>
                    </td>
                    <td className="px-6 py-4 text-slate-700 dark:text-slate-300">{u.email}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                        u.role === 'ADMIN' ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400' :
                        u.role === 'INSTRUCTOR' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' :
                        'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                      }`}>{u.role}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                        (u as any).is_active !== false ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' :
                        'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                      }`}>{(u as any).is_active !== false ? 'Active' : 'Inactive'}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
          </div>
        </div>
      </main>
    </div>
  );
}

