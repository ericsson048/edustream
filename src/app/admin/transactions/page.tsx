import AdminSidebar from '../../../components/AdminSidebar';
import Pagination from '../../../components/Pagination';
import Header from '../../../components/Header';
import { useEffect, useMemo, useState } from 'react';
import { Search, Download, DollarSign, TrendingUp, RefreshCw } from 'lucide-react';
import { adminService, type AdminTransaction } from '../../../services/adminService';
import { useToast } from '../../../contexts/ToastContext';

const STATUS_COLORS: Record<string, string> = {
  COMPLETED: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400',
  REFUNDED: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
  PENDING: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400',
  FAILED: 'bg-slate-100 dark:bg-slate-800 text-slate-500',
  MOCK: 'bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400',
};

export default function AdminTransactions() {
  const [transactions, setTransactions] = useState<AdminTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [refundingId, setRefundingId] = useState<string | null>(null);
  const { showToast } = useToast();
  const PAGE_SIZE = 15;

  useEffect(() => {
    setLoading(true);
    adminService.listTransactions()
      .then(setTransactions)
      .catch(() => showToast('Impossible de charger les transactions.', 'error'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => transactions.filter(t => {
    const matchQ = !query || `${t.course_title || ''} ${t.id}`.toLowerCase().includes(query.toLowerCase());
    const matchS = !statusFilter || t.status === statusFilter;
    return matchQ && matchS;
  }), [transactions, query, statusFilter]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE) || 1;
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Summary stats
  const totalRevenue = transactions.filter(t => t.status === 'COMPLETED').reduce((s, t) => s + parseFloat(t.amount_paid), 0);
  const totalRefunded = transactions.filter(t => t.status === 'REFUNDED').reduce((s, t) => s + parseFloat(t.amount_paid), 0);
  const completedCount = transactions.filter(t => t.status === 'COMPLETED').length;

  const handleRefund = async (trx: AdminTransaction) => {
    if (!confirm(`Rembourser $${trx.amount_paid} pour la transaction ${trx.id.slice(0, 8)} ?`)) return;
    setRefundingId(trx.id);
    try {
      await adminService.refundTransaction(trx.id);
      setTransactions(prev => prev.map(t => t.id === trx.id ? { ...t, status: 'REFUNDED' } : t));
      showToast('Transaction remboursée.', 'success');
    } catch {
      showToast('Erreur lors du remboursement.', 'error');
    } finally {
      setRefundingId(null);
    }
  };

  const exportCSV = () => {
    const header = 'ID,Cours,Montant,Statut,Date';
    const rows = filtered.map(t =>
      `"${t.id}","${t.course_title || ''}","${t.amount_paid}","${t.status}","${new Date(t.created_at).toLocaleDateString('fr-FR')}"`
    );
    const blob = new Blob([[header, ...rows].join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'transactions.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white">
      <AdminSidebar />
      <main className="flex-1 ml-64">
        <Header />
        <div className="p-8 max-w-7xl mx-auto">

          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Transactions</h1>
              <p className="text-slate-500 dark:text-slate-400 mt-1">{transactions.length} transaction{transactions.length !== 1 ? 's' : ''}</p>
            </div>
            <button onClick={exportCSV}
              className="flex items-center gap-2 px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
              <Download className="w-4 h-4" /> Export CSV
            </button>
          </div>

          {/* Summary cards */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            {[
              { icon: DollarSign, label: 'Revenus totaux', value: `$${totalRevenue.toLocaleString('fr-FR', { minimumFractionDigits: 2 })}`, color: 'bg-emerald-500' },
              { icon: TrendingUp, label: 'Transactions réussies', value: completedCount.toString(), color: 'bg-blue-500' },
              { icon: RefreshCw, label: 'Remboursements', value: `$${totalRefunded.toLocaleString('fr-FR', { minimumFractionDigits: 2 })}`, color: 'bg-red-500' },
            ].map(({ icon: Icon, label, value, color }) => (
              <div key={label} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm flex items-center gap-4">
                <div className={`w-10 h-10 ${color} rounded-xl flex items-center justify-center`}>
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
                  <p className="text-xl font-bold text-slate-900 dark:text-white">{value}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">

            {/* Filters */}
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-wrap gap-3">
              <div className="relative flex-1 min-w-48">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                <input type="text" placeholder="Rechercher par cours ou ID..."
                  value={query} onChange={e => { setQuery(e.target.value); setPage(1); }}
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white" />
              </div>
              <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
                className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white">
                <option value="">Tous les statuts</option>
                <option value="COMPLETED">Complété</option>
                <option value="PENDING">En attente</option>
                <option value="REFUNDED">Remboursé</option>
                <option value="FAILED">Échoué</option>
                <option value="MOCK">Simulé</option>
              </select>
            </div>

            {loading ? (
              <div className="flex justify-center py-16">
                <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : paginated.length === 0 ? (
              <div className="text-center py-16 text-slate-400">Aucune transaction trouvée</div>
            ) : (
              <table className="w-full text-left">
                <thead className="bg-slate-50 dark:bg-slate-800/50 text-xs uppercase text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="px-6 py-3">ID</th>
                    <th className="px-6 py-3">Cours</th>
                    <th className="px-6 py-3">Montant</th>
                    <th className="px-6 py-3">Statut</th>
                    <th className="px-6 py-3">Date</th>
                    <th className="px-6 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {paginated.map(trx => (
                    <tr key={trx.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="px-6 py-3">
                        <code className="text-xs font-mono text-slate-500 dark:text-slate-400">{trx.id.slice(0, 8)}…</code>
                      </td>
                      <td className="px-6 py-3 text-sm font-medium text-slate-900 dark:text-white max-w-xs truncate">
                        {trx.course_title || '—'}
                      </td>
                      <td className="px-6 py-3 text-sm font-bold text-slate-900 dark:text-white">
                        ${trx.amount_paid}
                      </td>
                      <td className="px-6 py-3">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${STATUS_COLORS[trx.status] || 'bg-slate-100 text-slate-500'}`}>
                          {trx.status}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-sm text-slate-500">
                        {new Date(trx.created_at).toLocaleDateString('fr-FR')}
                      </td>
                      <td className="px-6 py-3 text-right">
                        {trx.status === 'COMPLETED' && (
                          <button onClick={() => handleRefund(trx)} disabled={refundingId === trx.id}
                            className="px-3 py-1.5 rounded-lg text-xs font-bold bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 hover:bg-red-200 transition-colors disabled:opacity-40">
                            Rembourser
                          </button>
                        )}
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
