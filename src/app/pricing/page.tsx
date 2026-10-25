import { useEffect, useState } from 'react';
import { ArrowRight, BarChart3, BookOpen, BrainCircuit, Check, ClipboardCheck, Loader2, Video } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import PublicNavbar from '../../components/PublicNavbar';
import { billingService, type Plan } from '../../services/billingService';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';

export default function Pricing() {
  const { t, i18n } = useTranslation();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [activatingPlan, setActivatingPlan] = useState<string | null>(null);
  const { user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    billingService.listPlans()
      .then(setPlans)
      .catch(() => setLoadFailed(true))
      .finally(() => setLoading(false));
  }, []);

  const learnerFeatures = [
    { icon: BookOpen, title: t('pricing.courseLibrary'), description: t('pricing.courseLibraryDesc') },
    { icon: ClipboardCheck, title: t('pricing.practiceTools'), description: t('pricing.practiceToolsDesc') },
    { icon: BrainCircuit, title: t('pricing.aiTutor'), description: t('pricing.aiTutorDesc') },
    { icon: Video, title: t('pricing.liveClasses'), description: t('pricing.liveClassesDesc') },
  ];

  const instructorFeatures = [
    { icon: BookOpen, title: t('pricing.createCourses'), description: t('pricing.createCoursesDesc') },
    { icon: ClipboardCheck, title: t('pricing.assessLearners'), description: t('pricing.assessLearnersDesc') },
    { icon: BarChart3, title: t('pricing.trackSales'), description: t('pricing.trackSalesDesc') },
  ];

  const planFeatures = (plan: Plan) => [
    plan.has_unlimited_ai
      ? t('pricing.unlimitedAiTutor')
      : t('pricing.aiPromptsPerMonth', { count: plan.ai_monthly_limit }),
    plan.has_unlimited_streams
      ? t('pricing.unlimitedLiveStreaming')
      : plan.stream_minutes_monthly > 0
        ? t('pricing.streamMinutes', { count: plan.stream_minutes_monthly })
        : t('pricing.liveStreamingNotIncluded'),
  ];

  const selectPlan = async (plan: Plan) => {
    if (!user) {
      navigate(`/register?plan=${plan.id}&role=${plan.audience}`);
      return;
    }
    if (Number(plan.price_monthly) > 0) {
      navigate(`/subscription/checkout?plan_id=${plan.id}`);
      return;
    }

    setActivatingPlan(plan.id);
    try {
      await billingService.subscribe(plan.id);
      showToast(t('pricing.subscribeSuccess', { plan: plan.name }), 'success');
    } catch {
      showToast(t('pricing.subscribeFailed'), 'error');
    } finally {
      setActivatingPlan(null);
    }
  };

  const renderPlans = (audience: Plan['audience']) => {
    const audiencePlans = plans.filter((plan) => plan.audience === audience);

    if (loading) return <p className="py-8 text-center text-slate-500">{t('pricing.loadingPlans')}</p>;
    if (loadFailed) return <p className="py-8 text-center text-rose-600">{t('pricing.loadPlansFailed')}</p>;
    if (audiencePlans.length === 0) return <p className="py-8 text-center text-slate-500">{t('pricing.noPlans')}</p>;

    return (
      <div className="grid md:grid-cols-3 gap-4">
        {audiencePlans.map((plan) => (
          <article key={plan.id} className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-6">
            <div className="flex items-start justify-between gap-3">
              <h3 className="text-xl font-bold">{plan.name}</h3>
              {plan.badge && <span className="rounded-full bg-blue-100 dark:bg-blue-900/50 px-3 py-1 text-xs font-bold text-blue-700 dark:text-blue-300">{t('pricing.popular')}</span>}
            </div>
            <p className="mt-4 mb-6">
              <span className="text-4xl font-extrabold">{new Intl.NumberFormat(i18n.language, { style: 'currency', currency: 'USD' }).format(Number(plan.price_monthly))}</span>
              <span className="text-slate-500 dark:text-slate-400"> {t('pricing.perMonth')}</span>
            </p>
            <ul className="space-y-3">
              {planFeatures(plan).map((feature) => (
                <li key={feature} className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300">
                  <Check className="mt-0.5 w-4 h-4 shrink-0 text-emerald-600" />{feature}
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={() => void selectPlan(plan)}
              disabled={activatingPlan === plan.id}
              className="mt-7 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 font-bold text-white transition-colors hover:bg-blue-700 disabled:opacity-60"
            >
              {activatingPlan === plan.id && <Loader2 className="w-4 h-4 animate-spin" />}
              {user ? t('pricing.selectPlan') : t('pricing.createAccountForPlan')}
            </button>
          </article>
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-50 font-sans selection:bg-blue-500/30 pb-24">
      <PublicNavbar active="pricing" />

      <header className="pt-32 pb-14 px-6 text-center max-w-3xl mx-auto">
        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-6">{t('pricing.title')}</h1>
        <p className="text-lg md:text-xl text-slate-600 dark:text-slate-400 leading-relaxed">{t('pricing.subtitle')}</p>
      </header>

      <main className="max-w-6xl mx-auto px-6 space-y-10">
        <section className="rounded-3xl border border-blue-200 dark:border-blue-900 bg-white dark:bg-slate-900 p-8 md:p-12">
          <div className="max-w-3xl mb-8">
            <h2 className="text-3xl font-extrabold mb-3">{t('pricing.accountPlansTitle')}</h2>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">{t('pricing.accountPlansDescription')}</p>
          </div>
          <h3 className="text-sm font-bold uppercase tracking-widest text-blue-600 dark:text-blue-400 mb-4">{t('pricing.forStudents')}</h3>
          {renderPlans('STUDENT')}
          <h3 className="text-sm font-bold uppercase tracking-widest text-indigo-600 dark:text-indigo-400 mt-10 mb-4">{t('pricing.forInstructors')}</h3>
          {renderPlans('INSTRUCTOR')}
          <p className="mt-7 rounded-xl bg-blue-50 dark:bg-blue-950/30 p-4 text-sm text-blue-900 dark:text-blue-200">{t('pricing.demoSubscriptionNote')}</p>
        </section>

        <section className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 md:p-12">
          <div className="max-w-3xl mb-8">
            <p className="text-sm font-bold uppercase tracking-widest text-blue-600 dark:text-blue-400 mb-3">{t('pricing.forStudents')}</p>
            <h2 className="text-3xl font-extrabold mb-3">{t('pricing.studentTitle')}</h2>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">{t('pricing.studentDescription')}</p>
          </div>
          <div className="grid sm:grid-cols-2 gap-5">
            {learnerFeatures.map(({ icon: Icon, title, description }) => (
              <div key={title} className="flex gap-4 rounded-2xl bg-slate-50 dark:bg-slate-950 p-5">
                <Icon className="w-6 h-6 shrink-0 text-blue-600 dark:text-blue-400" />
                <div>
                  <h3 className="font-bold mb-1">{title}</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400">{description}</p>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-6 text-sm text-slate-500 dark:text-slate-400">{t('pricing.coursePaymentNote')}</p>
        </section>

        <section className="rounded-3xl border border-indigo-200 dark:border-indigo-900 bg-white dark:bg-slate-900 p-8 md:p-12">
          <div className="max-w-3xl mb-8">
            <p className="text-sm font-bold uppercase tracking-widest text-indigo-600 dark:text-indigo-400 mb-3">{t('pricing.forInstructors')}</p>
            <h2 className="text-3xl font-extrabold mb-3">{t('pricing.instructorTitle')}</h2>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">{t('pricing.instructorDescription')}</p>
          </div>
          <div className="grid md:grid-cols-3 gap-5">
            {instructorFeatures.map(({ icon: Icon, title, description }) => (
              <div key={title} className="rounded-2xl bg-slate-50 dark:bg-slate-950 p-5">
                <Icon className="w-6 h-6 text-indigo-600 dark:text-indigo-400 mb-4" />
                <h3 className="font-bold mb-2">{title}</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">{description}</p>
              </div>
            ))}
          </div>
          <div className="mt-7 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900 p-6">
            <h3 className="font-bold text-lg mb-2">{t('pricing.revenueShare')}</h3>
            <p className="text-sm text-slate-700 dark:text-slate-300">{t('pricing.revenueShareDesc')}</p>
          </div>
          <Link to="/register" className="mt-8 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 font-bold text-white hover:bg-indigo-700 transition-colors">
            {t('pricing.becomeInstructor')} <ArrowRight className="w-5 h-5" />
          </Link>
        </section>
      </main>
    </div>
  );
}
