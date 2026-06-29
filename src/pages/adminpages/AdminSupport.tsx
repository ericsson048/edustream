import { useEffect, useState } from 'react';
import AdminSidebar from '../../components/AdminSidebar';
import Header from '../../components/Header';
import { Search, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { adminService } from '../../services/adminService';
import type { SupportTicket } from '../../services/adminService';

export default function AdminSupport() {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    adminService.listSupportTickets()
      .then(setTickets)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = tickets.filter((t) => {
    if (statusFilter && t.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!t.subject.toLowerCase().includes(q) && !t.user_full_name.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const handleStatusChange = (ticket: SupportTicket, newStatus: SupportTicket['status']) => {
    adminService.updateSupportTicket(ticket.id, { status: newStatus }).then((updated) => {
      setTickets((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
    }).catch(() => {});
  };

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans text-slate-900">
      <AdminSidebar />
      <main className="flex-1 ml-64">
        <Header />
        <div className="p-8 max-w-7xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Support Tickets</h1>
              <p className="text-slate-500 mt-1">Manage user inquiries and technical issues.</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex gap-4">
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search tickets..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Statuses</option>
                <option value="OPEN">Open</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="RESOLVED">Resolved</option>
              </select>
            </div>

            {loading ? (
              <div className="p-8 text-center text-slate-500">Loading tickets...</div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                    <th className="px-6 py-4">User</th>
                    <th className="px-6 py-4">Subject</th>
                    <th className="px-6 py-4">Priority</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-slate-400">No tickets found.</td>
                    </tr>
                  ) : (
                    filtered.map((ticket) => (
                      <tr key={ticket.id} className="hover:bg-slate-50">
                        <td className="px-6 py-4">
                          <div className="font-medium text-slate-900">{ticket.user_full_name}</div>
                          <div className="text-xs text-slate-400">{ticket.user_email}</div>
                        </td>
                        <td className="px-6 py-4 text-slate-700">{ticket.subject}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                            ticket.priority === 'HIGH' ? 'bg-red-100 text-red-700' :
                            ticket.priority === 'MEDIUM' ? 'bg-amber-100 text-amber-700' :
                            'bg-blue-100 text-blue-700'
                          }`}>
                            {ticket.priority}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`flex items-center gap-1 text-sm font-medium ${
                            ticket.status === 'OPEN' ? 'text-red-600' :
                            ticket.status === 'IN_PROGRESS' ? 'text-amber-600' :
                            'text-green-600'
                          }`}>
                            {ticket.status === 'OPEN' && <AlertCircle className="w-4 h-4" />}
                            {ticket.status === 'IN_PROGRESS' && <Clock className="w-4 h-4" />}
                            {ticket.status === 'RESOLVED' && <CheckCircle className="w-4 h-4" />}
                            {ticket.status === 'IN_PROGRESS' ? 'In Progress' : ticket.status.charAt(0) + ticket.status.slice(1).toLowerCase()}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <select
                            value={ticket.status}
                            onChange={(e) => handleStatusChange(ticket, e.target.value as SupportTicket['status'])}
                            className="px-3 py-2 bg-blue-50 text-blue-600 rounded-lg text-sm font-bold hover:bg-blue-100 transition-colors border-none cursor-pointer"
                          >
                            <option value="OPEN">Mark Open</option>
                            <option value="IN_PROGRESS">In Progress</option>
                            <option value="RESOLVED">Resolved</option>
                          </select>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
