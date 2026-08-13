import { useEffect, useState } from 'react';
import { Check, ArrowRight, Sparkles, Globe, Zap, Shield, Loader2, CreditCard } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import PublicNavbar from '../../components/PublicNavbar';
import { billingService } from '../../services/billingService';
import type { Plan } from '../../services/billingService';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';

export default function Pricing() {
  const { t } = useTranslation();
  const [studentPlans, setStudentPlans] = useState<Plan[]>([]);
  const [instructorPlans, setInstructorPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState<string | null>(null);
  const { user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    billingService.listPlans()
      .then((plans) => {
        setStudentPlans(plans.filter((p) => p.audience === 'STUDENT'));
        setInstructorPlans(plans.filter((p) => p.audience === 'INSTRUCTOR'));
      })
      .catch(() => showToast(t('pricing.loadPlansFailed'), 'error'))
      .finally(() => setLoading(false));
  }, [showToast, t]);

  const handleSubscribe = async (plan: Plan) => {
    if (!user) {
      navigate(`/register?plan=${plan.id}&role=${plan.audience}`);
      return;
    }
    setSubscribing(plan.id);
    try {
      const result = await billingService.subscribe(plan.id);
      if (result.checkout_url) {
        window.location.href = result.checkout_url;
        return;
      }
      showToast(t('pricing.subscribeSuccess', { plan: plan.name }), 'success');
    } catch (e: unknown) {
      showToast(t('pricing.subscribeFailed'), 'error');
    } finally {
      setSubscribing(null);
    }
  };

  const renderPlans = (plans: Plan[], highlighted: boolean) => (
    <div className="grid md:grid-cols-3 gap-4 max-w-5xl mx-auto">
      {loading ? (
        <div className="col-span-3 py-12 text-center text-slate-400 dark:text-slate-500">{t('pricing.loadingPlans')}</div>
      ) : plans.length === 0 ? (
        <div className="col-span-3 py-12 text-center text-slate-400 dark:text-slate-500">{t('pricing.noPlans')}</div>
      ) : (
        plans.map((plan) => (
          <div
            key={plan.id}
            className={`rounded-2xl p-6 flex flex-col relative overflow-hidden border ${
              plan.badge || highlighted
                ? 'border-blue-500/40 bg-white dark:bg-slate-900 shadow-xl shadow-blue-900/10'
                : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'
            }`}
          >
            {plan.badge && (
              <span className="absolute top-0 right-0 bg-blue-600 text-white px-4 py-1 rounded-bl-xl text-[10px] font-bold uppercase tracking-wider">
                {plan.badge}
              </span>
            )}
            <h3 className="text-xl font-bold mb-1 dark:text-white">{plan.name}</h3>
            <div className="mb-5">
              <span className="text-4xl font-extrabold dark:text-white">${plan.price_monthly}</span>
              <span className="text-slate-500 dark:text-slate-400">/mo</span>
            </div>
            <ul className="space-y-3 mb-8 flex-1">
              {plan.features && plan.features.length > 0 ? (
                plan.features.map((f, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm text-slate-700 dark:text-slate-300">
                    <Check className="w-5 h-5 shrink-0 mt-0.5 text-emerald-500" />
                    {f}
                  </li>
                ))
              ) : (
                <>
                  <li className="flex items-start gap-3 text-sm text-slate-700 dark:text-slate-300">
                    <Check className="w-5 h-5 shrink-0 mt-0.5 text-emerald-500" />
                    {plan.has_unlimited_ai ? t('pricing.unlimitedAiTutor') : t('pricing.aiPromptsPerMonth', { count: plan.ai_monthly_limit })}
                  </li>
                  <li className="flex items-start gap-3 text-sm text-slate-700 dark:text-slate-300">
                    <Check className="w-5 h-5 shrink-0 mt-0.5 text-emerald-500" />
                    {plan.has_unlimited_streams ? t('pricing.unlimitedLiveStreaming') : t('pricing.streamMinutes', { count: plan.stream_minutes_monthly })}
                  </li>
                </>
              )}
            </ul>
            <button
              onClick={() => handleSubscribe(plan)}
              disabled={subscribing === plan.id}
              className={`w-full flex items-center justify-center gap-2 font-bold py-3 rounded-xl transition-colors disabled:opacity-50 ${
                plan.badge || highlighted
                  ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-600/20'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {subscribing === plan.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
              {user ? t('pricing.choosePlan') : t('pricing.getStarted')}
            </button>
          </div>
        ))
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-50 font-sans selection:bg-blue-500/30 pb-24">
      <PublicNavbar active="pricing" />

      <div className="pt-32 pb-16 px-6 text-center max-w-3xl mx-auto">
        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-6">
          {t('pricing.title')}
        </h1>
        <p className="text-lg md:text-xl text-slate-600 dark:text-slate-400 leading-relaxed">
          {t('pricing.subtitle')}
        </p>
      </div>

      <div className="max-w-7xl mx-auto px-6 mb-20">
        <div className="text-center mb-10">
          <h2 className="text-2xl font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest">{t('pricing.forStudents')}</h2>
          <p className="text-slate-600 dark:text-slate-400 mt-4 max-w-2xl mx-auto">
            {t('pricing.forStudentsDesc')}
          </p>
        </div>
        {renderPlans(studentPlans, false)}
      </div>

      <div className="max-w-7xl mx-auto px-6 mb-32">
        <div className="text-center mb-10">
          <h2 className="text-2xl font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">{t('pricing.forInstructors')}</h2>
          <p className="text-slate-600 dark:text-slate-400 mt-4 max-w-2xl mx-auto">
            {t('pricing.forInstructorsDesc')}
          </p>
        </div>
        {renderPlans(instructorPlans, true)}
      </div>

      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-12">
          <h2 className="text-2xl font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">{t('pricing.revenueShare')}</h2>
          <p className="text-slate-600 dark:text-slate-400 mt-4 max-w-2xl mx-auto">
            {t('pricing.revenueShareDesc')}
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden max-w-5xl mx-auto">
          <div className="grid md:grid-cols-2">
            <div className="p-10 md:p-12 border-b md:border-b-0 md:border-r border-slate-200 dark:border-slate-800">
              <h3 className="text-3xl font-bold mb-4">{t('pricing.youSetThePrice')}</h3>
              <p className="text-slate-600 dark:text-slate-400 mb-8 text-lg">
                {t('pricing.youSetThePriceDesc')}
              </p>

              <div className="mb-8 p-6 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl border border-indigo-100 dark:border-indigo-800/50">
                <div className="flex items-end gap-2 mb-2">
                  <span className="text-5xl font-extrabold text-indigo-600 dark:text-indigo-400">70%</span>
                  <span className="text-xl font-bold text-slate-700 dark:text-slate-300 mb-1">{t('pricing.revenueShare')}</span>
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-400">You keep 70% of every paid enrollment. The remaining 30% covers AI API costs (Gemini, OpenAI, etc.), video hosting, and platform fees.</p>
              </div>

              <Link to="/register" className="inline-flex items-center justify-center gap-2 w-full bg-indigo-600 text-white font-bold py-4 rounded-xl hover:bg-indigo-700 transition-colors">
                {t('pricing.becomeInstructor')} <ArrowRight className="w-5 h-5" />
              </Link>
            </div>

            <div className="p-10 md:p-12 bg-slate-50 dark:bg-slate-950/50">
              <h4 className="font-bold text-lg mb-6">{t('pricing.whatsIncluded')}</h4>
              <ul className="space-y-5">
                <li className="flex items-start gap-4">
                  <div className="bg-white dark:bg-slate-800 p-2 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 shrink-0">
                    <Globe className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <div>
                    <strong className="block text-slate-900 dark:text-white mb-1">{t('pricing.featureVideoHosting')}</strong>
                    <span className="text-sm text-slate-600 dark:text-slate-400">{t('pricing.featureVideoHostingDesc')}</span>
                  </div>
                </li>
                <li className="flex items-start gap-4">
                  <div className="bg-white dark:bg-slate-800 p-2 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 shrink-0">
                    <Zap className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <div>
                    <strong className="block text-slate-900 dark:text-white mb-1">{t('pricing.featureFreePaid')}</strong>
                    <span className="text-sm text-slate-600 dark:text-slate-400">{t('pricing.featureFreePaidDesc')}</span>
                  </div>
                </li>
                <li className="flex items-start gap-4">
                  <div className="bg-white dark:bg-slate-800 p-2 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 shrink-0">
                    <Shield className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <div>
                    <strong className="block text-slate-900 dark:text-white mb-1">{t('pricing.featurePayouts')}</strong>
                    <span className="text-sm text-slate-600 dark:text-slate-400">{t('pricing.featurePayoutsDesc')}</span>
                  </div>
                </li>
                <li className="flex items-start gap-4">
                  <div className="bg-white dark:bg-slate-800 p-2 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 shrink-0">
                    <Sparkles className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <div>
                    <strong className="block text-slate-900 dark:text-white mb-1">{t('pricing.featureAiCovered')}</strong>
                    <span className="text-sm text-slate-600 dark:text-slate-400">{t('pricing.featureAiCoveredDesc')}</span>
                  </div>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
