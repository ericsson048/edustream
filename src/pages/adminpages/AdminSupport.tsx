import AdminSidebar from '../../components/AdminSidebar';
import Header from '../../components/Header';
import { Search, MessageSquare, AlertCircle, CheckCircle, Clock } from 'lucide-react';

const tickets = [
  { id: '#1042', user: 'Alex Johnson', subject: 'Cannot access Module 3 video', status: 'Open', priority: 'High', time: '2h ago' },
  { id: '#1041', user: 'Sarah Chen', subject: 'Payment payout delayed', status: 'In Progress', priority: 'Medium', time: '5h ago' },
  { id: '#1040', user: 'Mike Smith', subject: 'How to reset my password?', status: 'Resolved', priority: 'Low', time: '1d ago' },
];

export default function AdminSupport() {
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
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <select className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option>All Statuses</option>
                <option>Open</option>
                <option>In Progress</option>
                <option>Resolved</option>
              </select>
            </div>
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                  <th className="px-6 py-4">Ticket ID</th>
                  <th className="px-6 py-4">User</th>
                  <th className="px-6 py-4">Subject</th>
                  <th className="px-6 py-4">Priority</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tickets.map((ticket) => (
                  <tr key={ticket.id} className="hover:bg-slate-50 cursor-pointer">
                    <td className="px-6 py-4 font-mono text-sm text-slate-500">{ticket.id}</td>
                    <td className="px-6 py-4 font-medium text-slate-900">{ticket.user}</td>
                    <td className="px-6 py-4 text-slate-700">{ticket.subject}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                        ticket.priority === 'High' ? 'bg-red-100 text-red-700' : 
                        ticket.priority === 'Medium' ? 'bg-amber-100 text-amber-700' : 
                        'bg-blue-100 text-blue-700'
                      }`}>
                        {ticket.priority}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`flex items-center gap-1 text-sm font-medium ${
                        ticket.status === 'Open' ? 'text-red-600' : 
                        ticket.status === 'In Progress' ? 'text-amber-600' : 
                        'text-green-600'
                      }`}>
                        {ticket.status === 'Open' && <AlertCircle className="w-4 h-4" />}
                        {ticket.status === 'In Progress' && <Clock className="w-4 h-4" />}
                        {ticket.status === 'Resolved' && <CheckCircle className="w-4 h-4" />}
                        {ticket.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button className="px-4 py-2 bg-blue-50 text-blue-600 rounded-lg text-sm font-bold hover:bg-blue-100 transition-colors">
                        Reply
                      </button>
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
