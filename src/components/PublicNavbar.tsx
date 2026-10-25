import { Globe, GraduationCap } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getDefaultRoute } from './guards/ProtectedRoute';

type PublicNavbarProps = {
  active?: 'pricing';
};

export default function PublicNavbar({ active }: PublicNavbarProps) {
  const { t, i18n } = useTranslation();
  const { user, isLoading } = useAuth();
  const currentLanguage = i18n.resolvedLanguage?.startsWith('fr') ? 'fr' : 'en';
  const toggleLanguage = () => i18n.changeLanguage(currentLanguage === 'fr' ? 'en' : 'fr');
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
            {t('publicNavbar.features')}
          </a>
          <Link to="/pricing" className={linkClassName(active === 'pricing')}>
            {t('publicNavbar.pricing')}
          </Link>
          <a href="/#instructors" className={linkClassName()}>
            {t('publicNavbar.teachWithUs')}
          </a>
        </div>

        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={toggleLanguage}
            className="inline-flex items-center gap-1.5 rounded-lg px-2 py-2 text-xs font-bold uppercase text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            aria-label={t('publicNavbar.changeLanguage')}
            title={t('publicNavbar.changeLanguage')}
          >
            <Globe className="w-4 h-4" /> {currentLanguage}
          </button>
          {!isLoading && user ? (
            <Link to={getDefaultRoute(user.role)} className="text-sm font-bold bg-blue-600 text-white px-5 py-2.5 rounded-full hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20 hover:shadow-blue-600/40">
              {t('publicNavbar.dashboard')}
            </Link>
          ) : !isLoading && (
            <>
              <Link to="/login" className="text-sm font-bold text-slate-700 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                {t('publicNavbar.logIn')}
              </Link>
              <Link to="/register" className="text-sm font-bold bg-blue-600 text-white px-5 py-2.5 rounded-full hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20 hover:shadow-blue-600/40">
                {t('publicNavbar.getStarted')}
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
