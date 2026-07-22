import AdminSidebar from '../../components/AdminSidebar';
import Header from '../../components/Header';
import { Search, Download, RefreshCcw } from 'lucide-react';

const transactions = [
  { id: 'TRX-9823', user: 'Alex Johnson', item: 'Advanced React Patterns', amount: '$89.99', date: 'Oct 24, 2024', status: 'Completed' },
  { id: 'TRX-9822', user: 'Maria Garcia', item: 'Machine Learning A-Z', amount: '$94.99', date: 'Oct 24, 2024', status: 'Completed' },
  { id: 'TRX-9821', user: 'James Smith', item: 'Digital Marketing 101', amount: '$39.99', date: 'Oct 23, 2024', status: 'Refunded' },
  { id: 'TRX-9820', user: 'Emily Davis', item: 'Pro Plan Subscription', amount: '$19.99', date: 'Oct 23, 2024', status: 'Completed' },
];

export default function AdminTransactions() {
  return (
    <div className="flex min-h-screen bg-slate-50 font-sans text-slate-900">
      <AdminSidebar />
      <main className="flex-1 ml-64">
        <Header />
        <div className="p-8 max-w-7xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Transactions</h1>
              <p className="text-slate-500 mt-1">View and manage all platform payments.</p>
            </div>
            <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg text-sm font-bold hover:bg-slate-50 transition-colors shadow-sm">
              <Download className="w-4 h-4" />
              Export CSV
            </button>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex gap-4">
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                <input 
                  type="text" 
                  placeholder="Search by TRX ID or User..." 
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                  <th className="px-6 py-4">Transaction ID</th>
                  <th className="px-6 py-4">User</th>
                  <th className="px-6 py-4">Item</th>
                  <th className="px-6 py-4">Amount</th>
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {transactions.map((trx) => (
                  <tr key={trx.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 font-mono text-sm text-slate-500">{trx.id}</td>
                    <td className="px-6 py-4 font-medium text-slate-900">{trx.user}</td>
                    <td className="px-6 py-4 text-slate-700">{trx.item}</td>
                    <td className="px-6 py-4 font-bold text-slate-900">{trx.amount}</td>
                    <td className="px-6 py-4 text-slate-500 text-sm">{trx.date}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                        trx.status === 'Completed' ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-700'
                      }`}>
                        {trx.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {trx.status === 'Completed' && (
                        <button className="text-slate-400 hover:text-red-600 transition-colors" title="Refund">
                          <RefreshCcw className="w-5 h-5" />
                        </button>
                      )}
                    </td>
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
