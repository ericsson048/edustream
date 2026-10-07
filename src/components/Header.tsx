import { Search, MessageSquare, Calendar, Globe, Sun, Moon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../contexts/ThemeContext';
import NotificationDropdown from './NotificationDropdown';
import SearchModal from './SearchModal';

export default function Header({ title, subtitle }: { title?: string; subtitle?: string }) {
  const { t, i18n } = useTranslation();
  const { theme, toggleTheme } = useTheme();
  const [searchOpen, setSearchOpen] = useState(false);

  // Ctrl+K / Cmd+K global shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const toggleLanguage = () => {
    const newLang = i18n.language === 'en' ? 'fr' : 'en';
    i18n.changeLanguage(newLang);
  };

  return (
    <>
      <SearchModal open={searchOpen} onClose={() => setSearchOpen(false)} />
      <header className="sticky top-0 z-10 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-8 py-4 flex items-center justify-between transition-colors">
        <div className="flex items-center flex-1 max-w-md">
          <button
            onClick={() => setSearchOpen(true)}
            className="relative w-full flex items-center gap-3 pl-10 pr-4 py-2 bg-slate-100 dark:bg-slate-800 rounded-xl text-sm text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer text-left"
          >
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <span className="flex-1">{t('header.search', 'Rechercher...')}</span>
            <kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 text-xs text-slate-400 bg-white dark:bg-slate-700 rounded border border-slate-200 dark:border-slate-600">
              Ctrl K
            </kbd>
          </button>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={toggleTheme}
            className="p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            title={t('header.toggleTheme')}
          >
            {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
          <button
            onClick={toggleLanguage}
            className="flex items-center gap-2 p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors text-sm font-bold uppercase"
            title={t('header.language')}
          >
            <Globe className="w-5 h-5" />
            {i18n.language}
          </button>
          <NotificationDropdown />
          <button
            className="p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            title={t('header.messages')}
          >
            <MessageSquare className="w-5 h-5" />
          </button>

          <div className="h-8 w-px bg-slate-200 dark:bg-slate-700 mx-2" />

          <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
            <span className="text-sm font-semibold hidden md:block">{t('header.semester')}</span>
            <Calendar className="w-4 h-4 text-slate-400" />
          </div>
        </div>
      </header>
    </>
  );
}
