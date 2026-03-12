import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, BookOpen, Settings, ShieldAlert, TrendingUp, CreditCard, LifeBuoy } from 'lucide-react';
import { clsx } from 'clsx';
import { useAuth } from '../contexts/AuthContext';

export default function AdminSidebar() {
  const location = useLocation();
  const path = location.pathname;
  const { logout } = useAuth();
  const navigate = useNavigate();

  const links = [
    { name: 'Dashboard', icon: LayoutDashboard, href: '/admin' },
    { name: 'Manage Users', icon: Users, href: '/admin/users' },
    { name: 'Manage Courses', icon: BookOpen, href: '/admin/courses' },
    { name: 'Transactions', icon: CreditCard, href: '/admin/transactions' },
    { name: 'Financial Reports', icon: TrendingUp, href: '/admin/reports' },
    { name: 'Support Tickets', icon: LifeBuoy, href: '/admin/support' },
    { name: 'Settings', icon: Settings, href: '/admin/settings' },
  ];

  return (
    <aside className="w-64 bg-white border-r border-slate-200 flex flex-col fixed h-full z-20">
      <div className="p-6 flex items-center gap-3">
        <div className="bg-blue-600 rounded-lg p-1.5 text-white">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <h1 className="text-xl font-bold tracking-tight text-slate-900">Admin Portal</h1>
      </div>

      <nav className="flex-1 px-4 space-y-1 mt-4">
        {links.map((link) => {
          const isActive = path === link.href || (path.startsWith(link.href) && link.href !== '/admin');
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
        <button className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors" onClick={() => { logout(); navigate('/'); }}>
          Logout
        </button>
      </div>
    </aside>
  );
}
