import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, BookOpen, Users, FileText, BarChart2, GraduationCap, MessageSquare, User, Calendar, Paperclip, Settings, Rocket } from 'lucide-react';
import { clsx } from 'clsx';
import { useAuth } from '../contexts/AuthContext';
import { useState } from 'react';
import UpgradeModal from './UpgradeModal';

export default function InstructorSidebar() {
  const location = useLocation();
  const path = location.pathname;
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showUpgrade, setShowUpgrade] = useState(false);

  const links = [
    { name: 'Dashboard', icon: LayoutDashboard, href: '/instructor' },
    { name: 'My Courses', icon: BookOpen, href: '/instructor/courses' },
    { name: 'Students', icon: Users, href: '/instructor/students' },
    { name: 'Resources', icon: Paperclip, href: '/instructor/resources' },
    { name: 'Schedule & Live', icon: Calendar, href: '/instructor/schedule' },
    { name: 'Grading', icon: FileText, href: '/instructor/assignments' },
    { name: 'Analytics', icon: BarChart2, href: '/instructor/analytics' },
    { name: 'Messages', icon: MessageSquare, href: '/instructor/messages' },
    { name: 'Profile Settings', icon: User, href: '/instructor/profile' },
  ];

  return (
    <aside className="w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col fixed h-full z-20 transition-colors">
      <div className="p-6 flex items-center gap-3">
        <div className="bg-blue-600 rounded-lg p-1.5 text-white">
          <GraduationCap className="w-6 h-6" />
        </div>
        <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">Instructor</h1>
      </div>

      <nav className="flex-1 px-4 space-y-1 mt-4 overflow-y-auto">
        {links.map((link) => {
          const isActive = path === link.href || (path.startsWith(link.href) && link.href !== '/instructor');
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
              <span className="flex-1">{link.name}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 mt-auto border-t border-slate-100 dark:border-slate-800">
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-2xl p-4 mb-4">
          <p className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-1">Pro Instructor</p>
          <p className="text-xs text-slate-600 dark:text-slate-400 mb-3">Boost your courses with premium tools.</p>
          <button onClick={() => setShowUpgrade(true)} className="w-full py-2 bg-blue-600 text-white text-xs font-bold rounded-lg shadow-sm hover:bg-blue-700 transition-colors">
            <span className="flex items-center justify-center gap-1.5"><Rocket className="w-3.5 h-3.5" /> Upgrade</span>
          </button>
        </div>

        <div className="flex items-center gap-3 px-2">
          <Link to="/instructor/profile" className="flex items-center gap-3 flex-1 min-w-0 group">
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
          <Link to="/instructor/profile">
            <Settings className="w-4 h-4 text-slate-400 cursor-pointer hover:text-slate-600 dark:hover:text-slate-300" />
          </Link>
        </div>
        <button
          className="mt-3 w-full py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
          onClick={() => {
            logout();
            navigate('/');
          }}
        >
          Logout
        </button>
      </div>
      <UpgradeModal open={showUpgrade} onClose={() => setShowUpgrade(false)} />
    </aside>
  );
}
