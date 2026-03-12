import { Check, ArrowRight, Sparkles, Zap, Shield, Globe } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Pricing() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-50 font-sans selection:bg-blue-500/30 pb-24">
      {/* Navbar Minimal */}
      <nav className="fixed w-full z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="bg-blue-600 p-1.5 rounded-lg text-white">
              <span className="font-bold text-xl tracking-tight">EduStream</span>
            </div>
          </Link>
          <div className="flex items-center gap-4">
            <Link to="/login" className="text-sm font-bold text-slate-700 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
              Log in
            </Link>
            <Link to="/register" className="text-sm font-bold bg-blue-600 text-white px-5 py-2.5 rounded-full hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20">
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Header */}
      <div className="pt-32 pb-16 px-6 text-center max-w-3xl mx-auto">
        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-6">
          Simple, transparent pricing
        </h1>
        <p className="text-lg md:text-xl text-slate-600 dark:text-slate-400 leading-relaxed">
          Whether you're here to learn new skills or share your expertise with the world, we have a plan that fits your needs.
        </p>
      </div>

      {/* Students Pricing */}
      <div className="max-w-7xl mx-auto px-6 mb-32">
        <div className="text-center mb-12">
          <h2 className="text-2xl font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest">For Students</h2>
        </div>
        
        <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {/* Free Plan */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col">
            <h3 className="text-2xl font-bold mb-2">Basic Learner</h3>
            <p className="text-slate-500 dark:text-slate-400 mb-6">Perfect for getting started with free courses.</p>
            <div className="mb-8">
              <span className="text-5xl font-extrabold">$0</span>
              <span className="text-slate-500 dark:text-slate-400 font-medium">/month</span>
            </div>
            
            <ul className="space-y-4 mb-8 flex-1">
              <li className="flex items-start gap-3">
                <Check className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                <span className="text-slate-700 dark:text-slate-300">Access to all free courses</span>
              </li>
              <li className="flex items-start gap-3">
                <Check className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                <span className="text-slate-700 dark:text-slate-300">Pay-per-course for premium content</span>
              </li>
              <li className="flex items-start gap-3">
                <Check className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                <span className="text-slate-700 dark:text-slate-300">Limited AI Tutor (20 prompts/month)</span>
              </li>
              <li className="flex items-start gap-3">
                <Check className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                <span className="text-slate-700 dark:text-slate-300">Community forum access</span>
              </li>
            </ul>
            
            <Link to="/register" className="w-full block text-center bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-bold py-4 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
              Create Free Account
            </Link>
          </div>

          {/* Unlimited Plan */}
          <div className="bg-slate-900 dark:bg-slate-950 rounded-3xl p-8 border border-blue-500/30 shadow-2xl shadow-blue-900/20 flex flex-col relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/20 blur-[80px] rounded-full pointer-events-none"></div>
            
            <div className="absolute top-0 left-1/2 -translate-x-1/2 bg-blue-600 text-white px-4 py-1 rounded-b-lg text-xs font-bold uppercase tracking-wider">
              Most Popular
            </div>

            <div className="relative z-10">
              <h3 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
                Unlimited Pro <Sparkles className="w-5 h-5 text-blue-400" />
              </h3>
              <p className="text-slate-400 mb-6">Unlock the full power of AI and live learning.</p>
              <div className="mb-8">
                <span className="text-5xl font-extrabold text-white">$19</span>
                <span className="text-slate-400 font-medium">/month</span>
              </div>
              
              <ul className="space-y-4 mb-8 flex-1">
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                  <span className="text-slate-200 font-medium">Unlimited AI Tutor prompts</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                  <span className="text-slate-200 font-medium">Unlimited WebRTC Live Streams</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                  <span className="text-slate-300">Access to all free courses</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                  <span className="text-slate-300">10% discount on premium courses</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                  <span className="text-slate-300">Priority support</span>
                </li>
              </ul>
              
              <Link to="/register" className="w-full block text-center bg-blue-600 text-white font-bold py-4 rounded-xl hover:bg-blue-500 transition-colors shadow-lg shadow-blue-600/20">
                Start 7-Day Free Trial
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Instructors Pricing */}
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-12">
          <h2 className="text-2xl font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">For Instructors</h2>
          <p className="text-slate-600 dark:text-slate-400 mt-4 max-w-2xl mx-auto">
            Monetize your expertise with our fair revenue split model. We handle the hosting, streaming costs, and AI integration.
          </p>
        </div>
        
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden max-w-5xl mx-auto">
          <div className="grid md:grid-cols-2">
            <div className="p-10 md:p-12 border-b md:border-b-0 md:border-r border-slate-200 dark:border-slate-800">
              <h3 className="text-3xl font-bold mb-4">Marketplace Partner</h3>
              <p className="text-slate-600 dark:text-slate-400 mb-8 text-lg">
                No monthly fees. You only pay when you make a sale.
              </p>
              
              <div className="mb-8 p-6 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl border border-indigo-100 dark:border-indigo-800/50">
                <div className="flex items-end gap-2 mb-2">
                  <span className="text-5xl font-extrabold text-indigo-600 dark:text-indigo-400">70%</span>
                  <span className="text-xl font-bold text-slate-700 dark:text-slate-300 mb-1">Revenue Share</span>
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-400">You keep 70% of every course sale. We take 30% to cover platform costs.</p>
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
                    <strong className="block text-slate-900 dark:text-white mb-1">AI Tutor Integration</strong>
                    <span className="text-sm text-slate-600 dark:text-slate-400">Your students get AI assistance on your courses automatically.</span>
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
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
