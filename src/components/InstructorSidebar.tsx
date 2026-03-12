import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, BookOpen, FileText, BarChart2, GraduationCap, MessageSquare, User } from 'lucide-react';
import { clsx } from 'clsx';

export default function InstructorSidebar() {
  const location = useLocation();
  const path = location.pathname;

  const links = [
    { name: 'Dashboard', icon: LayoutDashboard, href: '/instructor' },
    { name: 'My Courses', icon: BookOpen, href: '/instructor/courses' },
    { name: 'Grading', icon: FileText, href: '/instructor/assignments' },
    { name: 'Analytics', icon: BarChart2, href: '/instructor/analytics' },
    { name: 'Messages', icon: MessageSquare, href: '/messages' },
    { name: 'Public Profile', icon: User, href: '/instructor/profile/sarah-chen' },
  ];

  return (
    <aside className="w-64 bg-white border-r border-slate-200 flex flex-col fixed h-full z-20">
      <div className="p-6 flex items-center gap-3">
        <div className="bg-blue-600 rounded-lg p-1.5 text-white">
          <GraduationCap className="w-6 h-6" />
        </div>
        <h1 className="text-xl font-bold tracking-tight text-slate-900">Instructor</h1>
      </div>

      <nav className="flex-1 px-4 space-y-1 mt-4">
        {links.map((link) => {
          const isActive = path === link.href || (path.startsWith(link.href) && link.href !== '/instructor');
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
        <Link to="/" className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors">
          Logout
        </Link>
      </div>
    </aside>
  );
}
