import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { X, Check, Loader2, Sparkles, ArrowRight } from 'lucide-react';
import { billingService } from '../services/billingService';
import type { Plan } from '../services/billingService';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';

interface UpgradeModalProps {
  open: boolean;
  onClose: () => void;
}

export default function UpgradeModal({ open, onClose }: UpgradeModalProps) {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(false);
  const [subscribing, setSubscribing] = useState<string | null>(null);
  const { showToast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();

  const audience = user?.role === 'INSTRUCTOR' ? 'INSTRUCTOR' : 'STUDENT';

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    billingService.listPlans()
      .then((list) => setPlans(list.filter((p) => p.audience === audience)))
      .catch(() => showToast('Failed to load plans.', 'error'))
      .finally(() => setLoading(false));
  }, [open, audience, showToast]);

  if (!open) return null;

  const handleSubscribe = async (plan: Plan) => {
    setSubscribing(plan.id);
    try {
      const result = await billingService.subscribe(plan.id);
      if (result.checkout_url) {
        window.location.href = result.checkout_url;
        return;
      }
      showToast(`You are now on the ${plan.name} plan.`, 'success');
      onClose();
    } catch {
      showToast('Failed to subscribe.', 'error');
    } finally {
      setSubscribing(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 w-full max-w-3xl mx-4 p-6 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-2xl font-bold dark:text-white flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-blue-500" />
            Upgrade Your Plan
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
            <X className="w-5 h-5" />
          </button>
        </div>
        <p className="text-slate-500 dark:text-slate-400 mb-6">Choose the plan that fits your needs.</p>

        {loading ? (
          <div className="py-12 text-center text-slate-400 dark:text-slate-500">Loading plans...</div>
        ) : plans.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-slate-400 dark:text-slate-500 mb-4">No plans available for your role yet.</p>
            <Link
              to="/pricing"
              onClick={onClose}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white text-sm font-bold rounded-xl hover:bg-blue-700 transition-colors"
            >
              View Pricing <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        ) : (
          <div className="grid md:grid-cols-3 gap-4">
            {plans.map((plan) => (
              <div
                key={plan.id}
                className={`relative rounded-2xl border p-5 flex flex-col transition-shadow ${
                  plan.badge
                    ? 'border-blue-500 shadow-lg shadow-blue-500/10'
                    : 'border-slate-200 dark:border-slate-700'
                }`}
              >
                {plan.badge && (
                  <span className="absolute top-0 right-0 bg-blue-600 text-white px-3 py-0.5 rounded-bl-xl text-[10px] font-bold uppercase tracking-wider">
                    {plan.badge}
                  </span>
                )}
                <h3 className="text-lg font-bold dark:text-white">{plan.name}</h3>
                <p className="text-3xl font-extrabold mt-2 dark:text-white">
                  ${plan.price_monthly}
                  <span className="text-sm font-normal text-slate-500 dark:text-slate-400">/mo</span>
                </p>
                <ul className="space-y-2 my-5 flex-1">
                  {plan.features && plan.features.length > 0 ? (
                    plan.features.map((f, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300">
                        <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                        {f}
                      </li>
                    ))
                  ) : (
                    <>
                      <li className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300">
                        <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                        {plan.has_unlimited_ai ? 'Unlimited AI Tutor' : `${plan.ai_monthly_limit} AI prompts/mo`}
                      </li>
                      <li className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300">
                        <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                        {plan.has_unlimited_streams ? 'Unlimited live streams' : `${plan.stream_minutes_monthly} stream min/mo`}
                      </li>
                    </>
                  )}
                </ul>
                <button
                  onClick={() => handleSubscribe(plan)}
                  disabled={subscribing === plan.id}
                  className={`w-full py-2.5 rounded-xl text-sm font-bold transition-colors disabled:opacity-50 ${
                    plan.badge
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {subscribing === plan.id ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Choose Plan'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
