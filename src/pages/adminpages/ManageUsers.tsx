import AdminSidebar from '../../components/AdminSidebar';
import Header from '../../components/Header';
import { useEffect, useState } from 'react';
import { adminService } from '../../services/adminService';
import { useToast } from '../../contexts/ToastContext';
import type { AuthUser } from '../../types/auth';

export default function ManageUsers() {
  const [users, setUsers] = useState<AuthUser[]>([]);
  const { showToast } = useToast();

  useEffect(() => {
    adminService
      .listUsers()
      .then(setUsers)
      .catch(() => showToast('Impossible de charger les utilisateurs.', 'error'));
  }, [showToast]);

  return (
    <div className="flex min-h-screen bg-slate-50">
      <AdminSidebar />
      <main className="flex-1 ml-64">
        <Header />
        <div className="p-8 max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold mb-6">Manage Users</h1>
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-6 py-4">Name</th>
                  <th className="px-6 py-4">Email</th>
                  <th className="px-6 py-4">Role</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-t border-slate-100">
                    <td className="px-6 py-4 font-semibold">{u.full_name}</td>
                    <td className="px-6 py-4">{u.email}</td>
                    <td className="px-6 py-4">{u.role}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
