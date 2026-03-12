import AdminSidebar from '../../components/AdminSidebar';
import Header from '../../components/Header';
import { useEffect, useState } from 'react';
import { adminService, type AdminTransaction } from '../../services/adminService';
import { useToast } from '../../contexts/ToastContext';

export default function AdminTransactions() {
  const [transactions, setTransactions] = useState<AdminTransaction[]>([]);
  const { showToast } = useToast();

  useEffect(() => {
    adminService
      .listTransactions()
      .then(setTransactions)
      .catch(() => showToast('Impossible de charger les transactions.', 'error'));
  }, [showToast]);

  return (
    <div className="flex min-h-screen bg-slate-50">
      <AdminSidebar />
      <main className="flex-1 ml-64">
        <Header />
        <div className="p-8 max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold mb-6">Transactions</h1>
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-6 py-4">ID</th>
                  <th className="px-6 py-4">Course</th>
                  <th className="px-6 py-4">Amount</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Date</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((trx) => (
                  <tr key={trx.id} className="border-t border-slate-100">
                    <td className="px-6 py-4 font-medium">{trx.id.slice(0, 8)}</td>
                    <td className="px-6 py-4">{trx.course_title || '-'}</td>
                    <td className="px-6 py-4">${trx.amount_paid}</td>
                    <td className="px-6 py-4">{trx.status}</td>
                    <td className="px-6 py-4">{new Date(trx.created_at).toLocaleString()}</td>
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
