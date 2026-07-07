import { Check, ArrowRight, Sparkles, Globe, Zap, Shield } from 'lucide-react';
import { Link } from 'react-router-dom';
import PublicNavbar from '../../components/PublicNavbar';

export default function Pricing() {

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-50 font-sans selection:bg-blue-500/30 pb-24">
      <PublicNavbar active="pricing" />

      <div className="pt-32 pb-16 px-6 text-center max-w-3xl mx-auto">
        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-6">
          Simple, transparent pricing
        </h1>
        <p className="text-lg md:text-xl text-slate-600 dark:text-slate-400 leading-relaxed">
          Whether you're here to learn new skills or share your expertise with the world, we have a plan that fits your needs.
        </p>
      </div>

      <div className="max-w-7xl mx-auto px-6 mb-32">
        <div className="text-center mb-12">
          <h2 className="text-2xl font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest">For Students</h2>
          <p className="text-slate-600 dark:text-slate-400 mt-4 max-w-2xl mx-auto">
            No monthly subscription. Each instructor sets their own price — free or paid. You only pay once per course, nothing else.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          <div className="rounded-3xl p-8 border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm flex flex-col">
            <div className="w-14 h-14 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center mb-6">
              <Check className="w-7 h-7" />
            </div>
            <h3 className="text-2xl font-bold mb-2">Free Courses</h3>
            <p className="text-slate-500 dark:text-slate-400 mb-8">
              Many instructors offer free courses to help you get started. No payment needed — just sign up and learn.
            </p>
            <div className="mb-8">
              <span className="text-5xl font-extrabold">$0</span>
            </div>
            <ul className="space-y-4 mb-8 flex-1">
              <li className="flex items-start gap-3">
                <Check className="w-5 h-5 shrink-0 mt-0.5 text-emerald-500" />
                <span className="text-slate-700 dark:text-slate-300">Access all free courses</span>
              </li>
              <li className="flex items-start gap-3">
                <Check className="w-5 h-5 shrink-0 mt-0.5 text-emerald-500" />
                <span className="text-slate-700 dark:text-slate-300">AI Tutor on every lesson</span>
              </li>
              <li className="flex items-start gap-3">
                <Check className="w-5 h-5 shrink-0 mt-0.5 text-emerald-500" />
                <span className="text-slate-700 dark:text-slate-300">Progress tracking & certificates</span>
              </li>
            </ul>
            <Link to="/register" className="w-full block text-center font-bold py-4 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
              Create Free Account
            </Link>
          </div>

          <div className="rounded-3xl p-8 border bg-slate-900 dark:bg-slate-950 border-blue-500/30 shadow-2xl shadow-blue-900/20 flex flex-col relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/20 blur-[80px] rounded-full pointer-events-none"></div>
            <div className="absolute top-0 left-1/2 -translate-x-1/2 bg-blue-600 text-white px-4 py-1 rounded-b-lg text-xs font-bold uppercase tracking-wider">
              Pay Once
            </div>
            <div className="relative z-10">
              <div className="w-14 h-14 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-2xl flex items-center justify-center mb-6">
                <span className="text-xl font-bold">$</span>
              </div>
              <h3 className="text-2xl font-bold mb-2 text-white flex items-center gap-2">
                Paid Courses
                <Sparkles className="w-5 h-5 text-blue-400" />
              </h3>
              <p className="text-slate-400 mb-8">
                Premium courses at prices set by instructors. Buy once, own forever. No monthly subscription.
              </p>
              <div className="mb-8">
                <span className="text-5xl font-extrabold text-white">Set by</span>
                <span className="font-medium text-slate-400"> instructor</span>
              </div>
              <ul className="space-y-4 mb-8 flex-1">
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 shrink-0 mt-0.5 text-blue-400" />
                  <span className="text-slate-200">One-time payment per course</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 shrink-0 mt-0.5 text-blue-400" />
                  <span className="text-slate-200">AI Tutor & live streams included</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 shrink-0 mt-0.5 text-blue-400" />
                  <span className="text-slate-200">Lifetime access & certificates</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 shrink-0 mt-0.5 text-blue-400" />
                  <span className="text-slate-200">No recurring fees ever</span>
                </li>
              </ul>
              <Link to="/register" className="w-full block text-center font-bold py-4 rounded-xl bg-blue-600 text-white hover:bg-blue-500 shadow-lg shadow-blue-600/20 transition-colors">
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-12">
          <h2 className="text-2xl font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">For Instructors</h2>
          <p className="text-slate-600 dark:text-slate-400 mt-4 max-w-2xl mx-auto">
            You decide. Publish free courses to grow your audience or set your own price and earn with every enrollment.
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden max-w-5xl mx-auto">
          <div className="grid md:grid-cols-2">
            <div className="p-10 md:p-12 border-b md:border-b-0 md:border-r border-slate-200 dark:border-slate-800">
              <h3 className="text-3xl font-bold mb-4">You Set the Price</h3>
              <p className="text-slate-600 dark:text-slate-400 mb-8 text-lg">
                No monthly fees. Free or paid — it's entirely your choice.
              </p>

              <div className="mb-8 p-6 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl border border-indigo-100 dark:border-indigo-800/50">
                <div className="flex items-end gap-2 mb-2">
                  <span className="text-5xl font-extrabold text-indigo-600 dark:text-indigo-400">70%</span>
                  <span className="text-xl font-bold text-slate-700 dark:text-slate-300 mb-1">Revenue Share</span>
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-400">You keep 70% of every paid enrollment. The remaining 30% covers AI API costs (Gemini, OpenAI, etc.), video hosting, and platform fees.</p>
              </div>

              <Link to="/register" className="inline-flex items-center justify-center gap-2 w-full bg-indigo-600 text-white font-bold py-4 rounded-xl hover:bg-indigo-700 transition-colors">
                Become an Instructor <ArrowRight className="w-5 h-5" />
              </Link>
            </div>

            <div className="p-10 md:p-12 bg-slate-50 dark:bg-slate-950/50">
              <h4 className="font-bold text-lg mb-6">What's included:</h4>
              <ul className="space-y-5">
                <li className="flex items-start gap-4">
                  <div className="bg-white dark:bg-slate-800 p-2 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 shrink-0">
                    <Globe className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <div>
                    <strong className="block text-slate-900 dark:text-white mb-1">Unlimited Video Hosting</strong>
                    <span className="text-sm text-slate-600 dark:text-slate-400">Upload as many courses as you want. No storage limits.</span>
                  </div>
                </li>
                <li className="flex items-start gap-4">
                  <div className="bg-white dark:bg-slate-800 p-2 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 shrink-0">
                    <Zap className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <div>
                    <strong className="block text-slate-900 dark:text-white mb-1">Free & Paid Courses</strong>
                    <span className="text-sm text-slate-600 dark:text-slate-400">Publish free content to attract students, or set a price and earn 70% on every sale.</span>
                  </div>
                </li>
                <li className="flex items-start gap-4">
                  <div className="bg-white dark:bg-slate-800 p-2 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 shrink-0">
                    <Shield className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <div>
                    <strong className="block text-slate-900 dark:text-white mb-1">Automated Payouts</strong>
                    <span className="text-sm text-slate-600 dark:text-slate-400">Powered by Stripe Connect. Get paid directly to your bank account.</span>
                  </div>
                </li>
                <li className="flex items-start gap-4">
                  <div className="bg-white dark:bg-slate-800 p-2 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 shrink-0">
                    <Sparkles className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <div>
                    <strong className="block text-slate-900 dark:text-white mb-1">AI Costs Covered</strong>
                    <span className="text-sm text-slate-600 dark:text-slate-400">Every AI Tutor query (Gemini, OpenRouter, OpenAI) is paid by the platform — no charge to you or your students.</span>
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

