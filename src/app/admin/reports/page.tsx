import { useEffect, useState } from 'react';
import AdminSidebar from '../../../components/AdminSidebar';
import Header from '../../../components/Header';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { DollarSign, TrendingUp, Users } from 'lucide-react';
import { adminService } from '../../../services/adminService';
import type { RevenueReport as RevenueReportType } from '../../../services/adminService';

export default function AdminReports() {
  const [report, setReport] = useState<RevenueReportType | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminService.getRevenueReport({ months: 12 })
      .then(setReport)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans text-slate-900">
      <AdminSidebar />
      <main className="flex-1 ml-64">
        <Header />
        <div className="p-8 max-w-7xl mx-auto">
          <div className="mb-8 flex justify-between items-end">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Financial Reports</h1>
              <p className="text-slate-500 mt-1">Platform revenue and instructor payouts.</p>
            </div>
          </div>

          {loading ? (
            <div className="grid place-items-center h-64 text-slate-500">Loading reports...</div>
          ) : !report ? (
            <div className="grid place-items-center h-64 text-red-600">Failed to load reports.</div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                  <div className="flex items-center gap-4 mb-2">
                    <div className="w-10 h-10 bg-green-100 text-green-600 rounded-lg flex items-center justify-center"><DollarSign className="w-5 h-5" /></div>
                    <h3 className="text-slate-500 font-medium">Total Revenue</h3>
                  </div>
                  <p className="text-3xl font-bold text-slate-900">${report.summary.total_revenue.toLocaleString()}</p>
                  <p className="text-sm text-green-600 font-medium mt-2 flex items-center gap-1"><TrendingUp className="w-4 h-4" /> Margin: {report.summary.margin}%</p>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                  <div className="flex items-center gap-4 mb-2">
                    <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center"><Users className="w-5 h-5" /></div>
                    <h3 className="text-slate-500 font-medium">Instructor Payouts</h3>
                  </div>
                  <p className="text-3xl font-bold text-slate-900">${report.summary.total_payouts.toLocaleString()}</p>
                  <p className="text-sm text-slate-500 mt-2">Pending: ${report.summary.pending_payouts.toLocaleString()}</p>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                  <div className="flex items-center gap-4 mb-2">
                    <div className="w-10 h-10 bg-purple-100 text-purple-600 rounded-lg flex items-center justify-center"><TrendingUp className="w-5 h-5" /></div>
                    <h3 className="text-slate-500 font-medium">Platform Profit</h3>
                  </div>
                  <p className="text-3xl font-bold text-slate-900">${report.summary.platform_profit.toLocaleString()}</p>
                  <p className="text-sm text-slate-500 mt-2">Margin: {report.summary.margin}%</p>
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 mb-8">
                <h2 className="text-lg font-bold mb-6">Revenue vs Payouts (YTD)</h2>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={report.monthly}>
                      <defs>
                        <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorPay" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} dy={10} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} />
                      <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                      <Area type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorRev)" name="Gross Revenue" />
                      <Area type="monotone" dataKey="payouts" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorPay)" name="Instructor Payouts" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}

