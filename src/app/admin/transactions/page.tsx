import AdminSidebar from '../../../components/AdminSidebar';
import Pagination from '../../../components/Pagination';
import Header from '../../../components/Header';
import { useEffect, useMemo, useState } from 'react';
import { adminService, type AdminTransaction } from '../../../services/adminService';
import { useToast } from '../../../contexts/ToastContext';

export default function AdminTransactions() {
  const [transactions, setTransactions] = useState<AdminTransaction[]>([]);
  const [page, setPage] = useState(1);
  const [refundingId, setRefundingId] = useState<string | null>(null);
  const { showToast } = useToast();
  const PAGE_SIZE = 10;

  useEffect(() => {
    adminService
      .listTransactions()
      .then(setTransactions)
      .catch(() => showToast('Impossible de charger les transactions.', 'error'));
  }, [showToast]);

  const totalPages = Math.ceil(transactions.length / PAGE_SIZE) || 1;
  const paginatedTrx = transactions.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleRefund = async (trx: AdminTransaction) => {
    if (!confirm(`Refund $${trx.amount_paid} for transaction ${trx.id.slice(0, 8)}?`)) return;
    setRefundingId(trx.id);
    try {
      await adminService.refundTransaction(trx.id);
      setTransactions((prev) => prev.map((t) => t.id === trx.id ? { ...t, status: 'REFUNDED' } : t));
      showToast('Transaction refunded.', 'success');
    } catch {
      showToast('Failed to refund.', 'error');
    } finally {
      setRefundingId(null);
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950">
      <AdminSidebar />
      <main className="flex-1 ml-64">
        <Header />
        <div className="p-8 max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold mb-6 dark:text-white">Transactions</h1>
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-slate-50 dark:bg-slate-800/50 text-xs uppercase text-slate-500 dark:text-slate-400">
                <tr>
                  <th className="px-6 py-4">ID</th>
                  <th className="px-6 py-4">Course</th>
                  <th className="px-6 py-4">Amount</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {paginatedTrx.map((trx) => (
                  <tr key={trx.id} className="border-t border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/30">
                    <td className="px-6 py-4 font-medium text-slate-900 dark:text-slate-100">{trx.id.slice(0, 8)}</td>
                    <td className="px-6 py-4 text-slate-700 dark:text-slate-300">{trx.course_title || '-'}</td>
                    <td className="px-6 py-4 text-slate-700 dark:text-slate-300">${trx.amount_paid}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                        trx.status === 'COMPLETED' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' :
                        trx.status === 'REFUNDED' ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400' :
                        'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                      }`}>{trx.status}</span>
                    </td>
                    <td className="px-6 py-4 text-slate-700 dark:text-slate-300">{new Date(trx.created_at).toLocaleString()}</td>
                    <td className="px-6 py-4 text-right">
                      {trx.status === 'COMPLETED' && (
                        <button
                          onClick={() => handleRefund(trx)}
                          disabled={refundingId === trx.id}
                          className="px-3 py-1.5 rounded-lg text-xs font-bold bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-800/50 transition-colors disabled:opacity-50"
                        >
                          Refund
                        </button>
                      )}
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

