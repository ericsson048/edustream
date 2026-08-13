import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, CreditCard, Loader2, Lock, ShieldCheck, Sparkles } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { billingService } from '../../../services/billingService';
import type { Plan } from '../../../services/billingService';
import { getApiErrorMessage } from '../../../services/apiClient';
import { useToast } from '../../../contexts/ToastContext';
import { useAuth } from '../../../contexts/AuthContext';
import { getDefaultRoute } from '../../../components/guards/ProtectedRoute';

export default function SubscriptionCheckout() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showToast } = useToast();
  const planId = searchParams.get('plan_id') || '';
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [done, setDone] = useState(false);

  const plan = plans.find((p) => p.id === planId);

  useEffect(() => {
    billingService
      .listPlans()
      .then(setPlans)
      .catch(() => showToast('Failed to load plan.', 'error'))
      .finally(() => setLoading(false));
  }, [showToast]);

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!plan) return;
    setIsProcessing(true);
    try {
      await billingService.subscribe(plan.id);
      setDone(true);
      showToast('Subscription activated.', 'success');
    } catch (error) {
      showToast(getApiErrorMessage(error, 'Failed to subscribe.'), 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-bold mb-2">Plan not found</h1>
          <p className="text-slate-500 mb-6">This subscription plan is no longer available.</p>
          <Link to="/pricing" className="inline-flex items-center gap-2 px-5 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to Pricing
          </Link>
        </div>
      </div>
    );
  }

  if (done) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto mb-6" />
          <h1 className="text-3xl font-extrabold mb-3">You're all set!</h1>
          <p className="text-slate-500 mb-2">Your <strong className="text-slate-900">{plan.name}</strong> plan is now active.</p>
          <p className="text-slate-500 mb-8">Unlock your enhanced AI and live streaming limits right away.</p>
          <button
            onClick={() => navigate(getDefaultRoute(user?.role || 'STUDENT'))}
            className="w-full px-5 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <Link to="/pricing" className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-900 transition-colors mb-8">
          <ArrowLeft className="w-4 h-4" /> Back to Pricing
        </Link>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-2 space-y-6">
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
              <div className="flex items-center gap-3 mb-6">
                <div className="bg-blue-50 p-2 rounded-lg">
                  <Sparkles className="w-6 h-6 text-blue-600" />
                </div>
                <h2 className="text-2xl font-bold">Upgrade Checkout</h2>
              </div>

              <div className="flex items-center gap-3 mb-8 p-4 bg-blue-50 text-blue-800 rounded-xl border border-blue-100">
                <ShieldCheck className="w-6 h-6 text-blue-600" />
                <p className="text-sm font-medium">Your payment is secure and encrypted.</p>
              </div>

              <form onSubmit={handleConfirm} className="space-y-6">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Name on Card</label>
                  <input type="text" required placeholder="Alex Johnson" className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Card Number</label>
                  <input type="text" required placeholder="4242 4242 4242 4242" className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Expiry Date</label>
                    <input type="text" required placeholder="MM/YY" className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">CVC</label>
                    <input type="text" required placeholder="123" className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isProcessing}
                  className="w-full flex items-center justify-center gap-2 py-4 px-4 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-70"
                >
                  {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                  {isProcessing ? 'Processing...' : `Pay $${plan.price_monthly}/month`}
                </button>
                <p className="text-xs text-slate-400 text-center">
                  Demo mode — no real charge. Your plan activates immediately.
                </p>
              </form>
            </div>
          </div>

          <div className="md:col-span-1">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 sticky top-8">
              <h3 className="text-lg font-bold mb-4">Order Summary</h3>
              <div className="mb-6 pb-6 border-b border-slate-100">
                <h4 className="font-bold text-sm">{plan.name}</h4>
                <p className="text-xs text-slate-500 mt-1 capitalize">{plan.audience.toLowerCase()} plan</p>
              </div>
              <div className="flex justify-between items-center mb-6">
                <span className="font-bold text-lg">Total</span>
                <span className="font-bold text-2xl text-slate-900">${plan.price_monthly}</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <CreditCard className="w-4 h-4" />
                Billed monthly. Cancel anytime.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
