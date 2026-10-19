import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, BookOpen, Settings, ShieldAlert, TrendingUp, CreditCard, LifeBuoy, MessageSquare, User, Building2, GraduationCap } from 'lucide-react';
import { clsx } from 'clsx';
import { useAuth } from '../contexts/AuthContext';

export default function AdminSidebar() {
  const location = useLocation();
  const path = location.pathname;
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const isInstitutionAdmin = user?.role === 'INSTITUTION_ADMIN';

  const adminLinks = [
    { name: 'Dashboard', icon: LayoutDashboard, href: '/admin' },
    { name: 'Manage Users', icon: Users, href: '/admin/users' },
    { name: 'Institutions', icon: Building2, href: '/admin/institutions' },
    { name: 'Manage Courses', icon: BookOpen, href: '/admin/courses' },
    { name: 'Transactions', icon: CreditCard, href: '/admin/transactions' },
    { name: 'Financial Reports', icon: TrendingUp, href: '/admin/reports' },
    { name: 'Support Tickets', icon: LifeBuoy, href: '/admin/support' },
    { name: 'Subscription Plans', icon: ShieldAlert, href: '/admin/plans' },
    { name: 'Messages', icon: MessageSquare, href: '/admin/messages' },
    { name: 'Profile', icon: User, href: '/admin/profile' },
    { name: 'Settings', icon: Settings, href: '/admin/settings' },
  ];
  const institutionLinks = [
    { name: 'My Institution', icon: Building2, href: '/admin/institutions' },
    { name: 'Instructors', icon: GraduationCap, href: '/admin/users?role=INSTRUCTOR' },
    { name: 'Students', icon: Users, href: '/admin/users?role=STUDENT' },
    { name: 'Courses', icon: BookOpen, href: '/admin/courses' },
    { name: 'Transactions', icon: CreditCard, href: '/admin/transactions' },
    { name: 'Messages', icon: MessageSquare, href: '/admin/messages' },
    { name: 'Profile', icon: User, href: '/admin/profile' },
  ];
  const links = isInstitutionAdmin ? institutionLinks : adminLinks;
  const profileHref = '/admin/profile';

  return (
    <aside className="w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col fixed h-full z-20">
      <div className="p-6 flex items-center gap-3">
        <div className="bg-blue-600 rounded-lg p-1.5 text-white">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">{isInstitutionAdmin ? 'Institution Portal' : 'Admin Portal'}</h1>
      </div>

      <nav className="flex-1 px-4 space-y-1 mt-4 overflow-y-auto">
        {links.map((link) => {
          const [linkPath, linkQuery] = link.href.split('?');
          const isActive = linkQuery
            ? path === linkPath && location.search === `?${linkQuery}`
            : path === linkPath || (path.startsWith(linkPath) && linkPath !== '/admin');
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
          <p className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-1">{isInstitutionAdmin ? 'Institution Admin' : 'Platform Admin'}</p>
          <p className="text-xs text-slate-600 dark:text-slate-400">{isInstitutionAdmin ? 'Manage your institution and its members.' : 'You have full control over the platform.'}</p>
        </div>

        <div className="flex items-center gap-3 px-2">
          <Link to={profileHref} className="flex items-center gap-3 flex-1 min-w-0 group">
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
          {!isInstitutionAdmin && <Link to="/admin/profile">
            <Settings className="w-4 h-4 text-slate-400 cursor-pointer hover:text-slate-600 dark:hover:text-slate-300" />
          </Link>}
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
    </aside>
  );
}
