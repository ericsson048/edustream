import { useEffect, useMemo, useState } from 'react';
import AdminSidebar from '../../../components/AdminSidebar';
import Pagination from '../../../components/Pagination';
import Header from '../../../components/Header';
import { Search, AlertCircle, CheckCircle, Clock, Plus, X } from 'lucide-react';
import { adminService } from '../../../services/adminService';
import type { SupportTicket } from '../../../services/adminService';
import { useToast } from '../../../contexts/ToastContext';

export default function AdminSupport() {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [page, setPage] = useState(1);
  const [showCreate, setShowCreate] = useState(false);
  const [newTicket, setNewTicket] = useState({ subject: '', message: '', priority: 'MEDIUM' as SupportTicket['priority'] });
  const [creating, setCreating] = useState(false);
  const { showToast } = useToast();
  const PAGE_SIZE = 8;

  useEffect(() => {
    adminService.listSupportTickets()
      .then(setTickets)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    return tickets.filter((t) => {
      if (statusFilter && t.status !== statusFilter) return false;
      if (priorityFilter && t.priority !== priorityFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        if (!t.subject.toLowerCase().includes(q) && !t.user_full_name.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [tickets, search, statusFilter, priorityFilter]);

  useEffect(() => { setPage(1); }, [search, statusFilter, priorityFilter]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE) || 1;
  const paginatedTickets = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleStatusChange = (ticket: SupportTicket, newStatus: SupportTicket['status']) => {
    adminService.updateSupportTicket(ticket.id, { status: newStatus }).then((updated) => {
      setTickets((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
    }).catch(() => {});
  };

  const handleCreateTicket = async () => {
    if (!newTicket.subject.trim() || !newTicket.message.trim()) {
      showToast('Subject and message are required.', 'error');
      return;
    }
    setCreating(true);
    try {
      const created = await adminService.createSupportTicket(newTicket);
      setTickets((prev) => [created, ...prev]);
      setShowCreate(false);
      setNewTicket({ subject: '', message: '', priority: 'MEDIUM' });
      showToast('Ticket created.', 'success');
    } catch {
      showToast('Failed to create ticket.', 'error');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950 font-sans text-slate-900 dark:text-slate-100">
      <AdminSidebar />
      <main className="flex-1 ml-64">
        <Header />
        <div className="p-8 max-w-7xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Support Tickets</h1>
              <p className="text-slate-500 dark:text-slate-400 mt-1">Manage user inquiries and technical issues.</p>
            </div>
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-bold transition-colors"
            >
              <Plus className="w-4 h-4" /> New Ticket
            </button>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex gap-4">
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search tickets..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-slate-50 dark:bg-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Statuses</option>
                <option value="OPEN">Open</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="RESOLVED">Resolved</option>
              </select>
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="bg-slate-50 dark:bg-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Priorities</option>
                <option value="HIGH">High</option>
                <option value="MEDIUM">Medium</option>
                <option value="LOW">Low</option>
              </select>
            </div>

            {loading ? (
              <div className="p-8 text-center text-slate-500 dark:text-slate-400">Loading tickets...</div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    <th className="px-6 py-4">User</th>
                    <th className="px-6 py-4">Subject</th>
                    <th className="px-6 py-4">Priority</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {paginatedTickets.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-slate-400 dark:text-slate-500">No tickets found.</td>
                    </tr>
                  ) : (
                    paginatedTickets.map((ticket) => (
                      <tr key={ticket.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                        <td className="px-6 py-4">
                          <div className="font-medium text-slate-900 dark:text-slate-100">{ticket.user_full_name}</div>
                          <div className="text-xs text-slate-400 dark:text-slate-500">{ticket.user_email}</div>
                        </td>
                        <td className="px-6 py-4 text-slate-700 dark:text-slate-300">{ticket.subject}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                            ticket.priority === 'HIGH' ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400' :
                            ticket.priority === 'MEDIUM' ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400' :
                            'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                          }`}>
                            {ticket.priority}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`flex items-center gap-1 text-sm font-medium ${
                            ticket.status === 'OPEN' ? 'text-red-600 dark:text-red-400' :
                            ticket.status === 'IN_PROGRESS' ? 'text-amber-600 dark:text-amber-400' :
                            'text-green-600 dark:text-green-400'
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
                            className="px-3 py-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg text-sm font-bold hover:bg-blue-100 dark:hover:bg-blue-800/50 transition-colors border-none cursor-pointer"
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
            {!loading && <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />}
          </div>
        </div>

        {showCreate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 w-full max-w-lg mx-4 p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold dark:text-white">Create Ticket</h2>
                <button onClick={() => setShowCreate(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-4">
                <input
                  type="text"
                  placeholder="Subject"
                  value={newTicket.subject}
                  onChange={(e) => setNewTicket({ ...newTicket, subject: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <textarea
                  placeholder="Message"
                  value={newTicket.message}
                  onChange={(e) => setNewTicket({ ...newTicket, message: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
                <select
                  value={newTicket.priority}
                  onChange={(e) => setNewTicket({ ...newTicket, priority: e.target.value as SupportTicket['priority'] })}
                  className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                </select>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setShowCreate(false)}
                  className="px-4 py-2 text-sm font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateTicket}
                  disabled={creating}
                  className="px-4 py-2 text-sm font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {creating ? 'Creating...' : 'Create Ticket'}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

