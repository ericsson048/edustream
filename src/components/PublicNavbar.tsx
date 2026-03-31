import { GraduationCap } from 'lucide-react';
import { Link } from 'react-router-dom';

type PublicNavbarProps = {
  active?: 'pricing';
};

export default function PublicNavbar({ active }: PublicNavbarProps) {
  const linkClassName = (isActive?: boolean) =>
    `transition-colors ${
      isActive
        ? 'text-blue-600 dark:text-blue-400'
        : 'text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400'
    }`;

  return (
    <nav className="fixed w-full z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between gap-4">
        <Link to="/" className="flex items-center gap-2">
          <div className="bg-blue-600 p-1.5 rounded-lg text-white">
            <GraduationCap className="w-6 h-6" />
          </div>
          <span className="font-bold text-xl tracking-tight">EduStream</span>
        </Link>

        <div className="hidden md:flex items-center gap-8 font-medium text-sm">
          <a href="/#features" className={linkClassName()}>
            Features
          </a>
          <Link to="/pricing" className={linkClassName(active === 'pricing')}>
            Pricing
          </Link>
          <a href="/#instructors" className={linkClassName()}>
            Teach with us
          </a>
        </div>

        <div className="flex items-center gap-4">
          <Link to="/login" className="text-sm font-bold text-slate-700 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
            Log in
          </Link>
          <Link to="/register" className="text-sm font-bold bg-blue-600 text-white px-5 py-2.5 rounded-full hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20 hover:shadow-blue-600/40">
            Get Started
          </Link>
        </div>
      </div>
    </nav>
  );
}
