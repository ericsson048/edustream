import { Search, Bell, MessageSquare, Calendar, Globe } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function Header({ title, subtitle }: { title?: string; subtitle?: string }) {
  const { t, i18n } = useTranslation();

  const toggleLanguage = () => {
    const newLang = i18n.language === 'en' ? 'fr' : 'en';
    i18n.changeLanguage(newLang);
  };

  return (
    <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-slate-200 px-8 py-4 flex items-center justify-between">
      <div className="flex items-center flex-1 max-w-md">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
          <input
            type="text"
            placeholder={t('header.search')}
            className="w-full pl-10 pr-4 py-2 bg-slate-100 border-none rounded-xl focus:ring-2 focus:ring-blue-500 text-sm outline-none transition-all"
          />
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button 
          onClick={toggleLanguage}
          className="flex items-center gap-2 p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors text-sm font-bold uppercase"
          title={t('header.language')}
        >
          <Globe className="w-5 h-5" />
          {i18n.language}
        </button>
        <button className="relative p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors">
          <Bell className="w-5 h-5" />
          <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
        </button>
        <button className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors">
          <MessageSquare className="w-5 h-5" />
        </button>
        
        <div className="h-8 w-px bg-slate-200 mx-2"></div>
        
        <div className="flex items-center gap-2 text-slate-600">
          <span className="text-sm font-semibold hidden md:block">Fall Semester 2024</span>
          <Calendar className="w-4 h-4 text-slate-400" />
        </div>
      </div>
    </header>
  );
}
