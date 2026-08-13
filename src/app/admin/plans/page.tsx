'use client';

import { useEffect, useState } from 'react';
import AdminSidebar from '../../../components/AdminSidebar';
import Header from '../../../components/Header';
import { Plus, X, Pencil, Trash2 } from 'lucide-react';
import { adminService } from '../../../services/adminService';
import type { PlanItem } from '../../../services/adminService';
import { useToast } from '../../../contexts/ToastContext';

export default function AdminPlans() {
  const [plans, setPlans] = useState<PlanItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<PlanItem | null>(null);
  const [form, setForm] = useState({ name: '', price_monthly: '', badge: '', audience: 'STUDENT' as 'STUDENT' | 'INSTRUCTOR', has_unlimited_ai: false, has_unlimited_streams: false, stream_minutes_monthly: 0, ai_monthly_limit: 20, is_active: true });
  const [saving, setSaving] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    adminService.listPlans()
      .then(setPlans)
      .catch(() => showToast('Failed to load plans.', 'error'))
      .finally(() => setLoading(false));
  }, [showToast]);

  const openCreate = () => {
    setEditing(null);
    setForm({ name: '', price_monthly: '', badge: '', audience: 'STUDENT', has_unlimited_ai: false, has_unlimited_streams: false, stream_minutes_monthly: 0, ai_monthly_limit: 20, is_active: true });
    setShowForm(true);
  };

  const openEdit = (plan: PlanItem) => {
    setEditing(plan);
    setForm({
      name: plan.name,
      price_monthly: plan.price_monthly,
      badge: plan.badge,
      audience: plan.audience,
      has_unlimited_ai: plan.has_unlimited_ai,
      has_unlimited_streams: plan.has_unlimited_streams,
      stream_minutes_monthly: plan.stream_minutes_monthly,
      ai_monthly_limit: plan.ai_monthly_limit,
      is_active: plan.is_active,
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { showToast('Name is required.', 'error'); return; }
    setSaving(true);
    try {
      if (editing) {
        const updated = await adminService.updatePlan(editing.id, form);
        setPlans((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
        showToast('Plan updated.', 'success');
      } else {
        const created = await adminService.createPlan(form);
        setPlans((prev) => [...prev, created]);
        showToast('Plan created.', 'success');
      }
      setShowForm(false);
    } catch {
      showToast('Failed to save plan.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (plan: PlanItem) => {
    if (!confirm(`Delete plan "${plan.name}"?`)) return;
    try {
      await adminService.deletePlan(plan.id);
      setPlans((prev) => prev.filter((p) => p.id !== plan.id));
      showToast('Plan deleted.', 'success');
    } catch {
      showToast('Failed to delete plan.', 'error');
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950">
      <AdminSidebar />
      <main className="flex-1 ml-64">
        <Header />
        <div className="p-8 max-w-7xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold dark:text-white">Subscription Plans</h1>
            <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-bold transition-colors">
              <Plus className="w-4 h-4" /> New Plan
            </button>
          </div>

          {loading ? (
            <p className="text-center text-slate-500 dark:text-slate-400 py-8">Loading...</p>
          ) : plans.length === 0 ? (
            <p className="text-center text-slate-500 dark:text-slate-400 py-8">No plans yet.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {plans.map((plan) => (
                <div key={plan.id} className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-bold dark:text-white">{plan.name}</h3>
                      {plan.badge && <span className="text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30 px-2 py-0.5 rounded-full">{plan.badge}</span>}
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => openEdit(plan)} className="text-slate-400 hover:text-blue-600 dark:hover:text-blue-400"><Pencil className="w-4 h-4" /></button>
                      <button onClick={() => handleDelete(plan)} className="text-slate-400 hover:text-red-600 dark:hover:text-red-400"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </div>
                  <p className="text-3xl font-bold mb-4 dark:text-white">${plan.price_monthly}<span className="text-sm font-normal text-slate-500 dark:text-slate-400">/mo</span></p>
                  <div className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
                    <p><span className={`inline-block w-2 h-2 rounded-full mr-2 ${plan.is_active ? 'bg-green-500' : 'bg-red-500'}`} />{plan.is_active ? 'Active' : 'Inactive'}</p>
                    <p>Audience: {plan.audience}</p>
                    <p>AI limit: {plan.has_unlimited_ai ? 'Unlimited' : `${plan.ai_monthly_limit}/mo`}</p>
                    <p>Stream: {plan.has_unlimited_streams ? 'Unlimited' : `${plan.stream_minutes_monthly} min/mo`}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {showForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 w-full max-w-lg mx-4 p-6 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold dark:text-white">{editing ? 'Edit Plan' : 'New Plan'}</h2>
                <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"><X className="w-5 h-5" /></button>
              </div>
              <div className="space-y-4">
                <input placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                <input placeholder="Price (monthly)" value={form.price_monthly} onChange={(e) => setForm({ ...form, price_monthly: e.target.value })} className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                <input placeholder="Badge (e.g. Most Popular)" value={form.badge} onChange={(e) => setForm({ ...form, badge: e.target.value })} className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                <select value={form.audience} onChange={(e) => setForm({ ...form, audience: e.target.value as 'STUDENT' | 'INSTRUCTOR' })} className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="STUDENT">Student</option>
                  <option value="INSTRUCTOR">Instructor</option>
                </select>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 text-sm dark:text-slate-300"><input type="checkbox" checked={form.has_unlimited_ai} onChange={(e) => setForm({ ...form, has_unlimited_ai: e.target.checked })} /> Unlimited AI</label>
                  <label className="flex items-center gap-2 text-sm dark:text-slate-300"><input type="checkbox" checked={form.has_unlimited_streams} onChange={(e) => setForm({ ...form, has_unlimited_streams: e.target.checked })} /> Unlimited Stream</label>
                </div>
                {!form.has_unlimited_ai && (
                  <input type="number" placeholder="AI monthly limit" value={form.ai_monthly_limit} onChange={(e) => setForm({ ...form, ai_monthly_limit: Number(e.target.value) })} className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                )}
                {!form.has_unlimited_streams && (
                  <input type="number" placeholder="Stream minutes monthly" value={form.stream_minutes_monthly} onChange={(e) => setForm({ ...form, stream_minutes_monthly: Number(e.target.value) })} className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                )}
                <label className="flex items-center gap-2 text-sm dark:text-slate-300"><input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} /> Active</label>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">Cancel</button>
                <button onClick={handleSave} disabled={saving} className="px-4 py-2 text-sm font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">{saving ? 'Saving...' : 'Save'}</button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
