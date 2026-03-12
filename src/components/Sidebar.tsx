import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, BookOpen, FileText, BarChart2, Users, Settings, Compass, MessageSquare, Target, GitMerge, Video } from 'lucide-react';
import { clsx } from 'clsx';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function Sidebar() {
  const location = useLocation();
  const path = location.pathname;
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const links = [
    { name: t('sidebar.dashboard'), icon: LayoutDashboard, href: '/dashboard' },
    { name: t('sidebar.catalog'), icon: Compass, href: '/catalog' },
    { name: t('sidebar.myCourses'), icon: BookOpen, href: '/courses' },
    { name: 'Live Sessions', icon: Video, href: '/schedule' },
    { name: 'Skill Tree', icon: GitMerge, href: '/skill-tree' },
    { name: 'Focus Room', icon: Target, href: '/focus' },
    { name: t('sidebar.assignments'), icon: FileText, href: '/assignments' },
    { name: t('sidebar.grades'), icon: BarChart2, href: '/grades' },
    { name: t('sidebar.community'), icon: Users, href: '/community' },
    { name: t('sidebar.messages'), icon: MessageSquare, href: '/messages' },
  ];

  return (
    <aside className="w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col fixed h-full z-20 transition-colors">
      <div className="p-6 flex items-center gap-3">
        <div className="bg-blue-600 rounded-lg p-1.5 text-white">
          <BookOpen className="w-6 h-6" />
        </div>
        <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">EduStream</h1>
      </div>

      <nav className="flex-1 px-4 space-y-1 mt-4">
        {links.map((link) => {
          const isActive = path === link.href;
          return (
            <Link
              key={link.name}
              to={link.href}
              className={clsx(
                'flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl transition-colors',
                isActive
                  ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
              )}
            >
              <link.icon className={clsx('w-5 h-5', isActive ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400')} />
              {link.name}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 mt-auto border-t border-slate-100 dark:border-slate-800">
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-2xl p-4 mb-4">
          <p className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-1">{t('sidebar.proPlan')}</p>
          <p className="text-xs text-slate-600 dark:text-slate-400 mb-3">Get unlimited access to all premium features.</p>
          <button className="w-full py-2 bg-blue-600 text-white text-xs font-bold rounded-lg shadow-sm hover:bg-blue-700 transition-colors">
            {t('sidebar.upgrade')}
          </button>
        </div>

        <div className="flex items-center gap-3 px-2">
          <Link to="/profile" className="flex items-center gap-3 flex-1 min-w-0 group">
            <img
              src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80"
              alt="User"
              className="w-9 h-9 rounded-full object-cover border border-slate-200 dark:border-slate-700 group-hover:border-blue-400 transition-colors"
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-slate-900 dark:text-white truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{user?.full_name || 'User'}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{user?.email || 'No email'}</p>
            </div>
          </Link>
          <Link to="/profile">
            <Settings className="w-4 h-4 text-slate-400 cursor-pointer hover:text-slate-600 dark:hover:text-slate-300" />
          </Link>
        </div>
        <button
          className="mt-3 w-full py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
          onClick={() => {
            logout();
            navigate('/');
          }}
        >
          Logout
        </button>
      </div>
    </aside>
  );
}
