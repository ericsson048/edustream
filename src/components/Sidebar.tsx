import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, BookOpen, FileText, BarChart2, Users, Settings, LogOut } from 'lucide-react';
import { clsx } from 'clsx';

export default function Sidebar() {
  const location = useLocation();
  const path = location.pathname;

  const links = [
    { name: 'Dashboard', icon: LayoutDashboard, href: '/dashboard' },
    { name: 'My Courses', icon: BookOpen, href: '/courses' },
    { name: 'Assignments', icon: FileText, href: '/assignments' },
    { name: 'Grades', icon: BarChart2, href: '/grades' },
    { name: 'Community', icon: Users, href: '/community' },
  ];

  return (
    <aside className="w-64 bg-white border-r border-slate-200 flex flex-col fixed h-full z-20">
      <div className="p-6 flex items-center gap-3">
        <div className="bg-blue-600 rounded-lg p-1.5 text-white">
          <BookOpen className="w-6 h-6" />
        </div>
        <h1 className="text-xl font-bold tracking-tight text-slate-900">EduStream</h1>
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
                  ? 'bg-blue-50 text-blue-600'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              )}
            >
              <link.icon className={clsx('w-5 h-5', isActive ? 'text-blue-600' : 'text-slate-400')} />
              {link.name}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 mt-auto border-t border-slate-100">
        <div className="bg-blue-50 rounded-2xl p-4 mb-4">
          <p className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-1">Pro Plan</p>
          <p className="text-xs text-slate-600 mb-3">Get unlimited access to all premium features.</p>
          <button className="w-full py-2 bg-blue-600 text-white text-xs font-bold rounded-lg shadow-sm hover:bg-blue-700 transition-colors">
            Upgrade
          </button>
        </div>

        <div className="flex items-center gap-3 px-2">
          <img
            src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80"
            alt="User"
            className="w-9 h-9 rounded-full object-cover border border-slate-200"
          />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-slate-900 truncate">Alex Johnson</p>
            <p className="text-xs text-slate-500 truncate">Computer Science</p>
          </div>
          <Settings className="w-4 h-4 text-slate-400 cursor-pointer hover:text-slate-600" />
        </div>
      </div>
    </aside>
  );
}
