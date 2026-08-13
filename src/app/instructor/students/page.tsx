import { Link } from 'react-router-dom';
import {
  Search,
  Trash2,
  Users,
  UserRound,
  Loader2,
  Mail,
  CalendarDays,
  BookOpen,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import InstructorSidebar from '../../../components/InstructorSidebar';
import Header from '../../../components/Header';
import { LoadingState, EmptyState } from '../../../components/states';
import { useToast } from '../../../contexts/ToastContext';
import { courseService, type CourseStudent } from '../../../services/courseService';

const AVATAR_COLORS = [
  'bg-blue-500',
  'bg-indigo-500',
  'bg-violet-500',
  'bg-emerald-500',
  'bg-rose-500',
  'bg-amber-500',
  'bg-cyan-500',
  'bg-pink-500',
];

function initials(name: string) {
  return name
    .split(' ')
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

function completionColor(percent: number) {
  if (percent >= 80) return 'bg-emerald-500';
  if (percent >= 40) return 'bg-blue-500';
  if (percent > 0) return 'bg-amber-500';
  return 'bg-slate-300';
}

type StudentGroup = {
  student_id: string;
  student_name: string;
  student_email: string;
  enrollments: CourseStudent[];
  avg_percent: number;
};

export default function Students() {
  const { showToast } = useToast();
  const [students, setStudents] = useState<CourseStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [removing, setRemoving] = useState<CourseStudent | null>(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      setStudents(await courseService.listAllStudents());
    } catch {
      showToast('Impossible de charger les étudiants.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const groups = useMemo(() => {
    const map = new Map<string, StudentGroup>();
    for (const s of students) {
      let group = map.get(s.student_id);
      if (!group) {
        group = {
          student_id: s.student_id,
          student_name: s.student_name,
          student_email: s.student_email,
          enrollments: [],
          avg_percent: 0,
        };
        map.set(s.student_id, group);
      }
      group.enrollments.push(s);
    }
    const list = [...map.values()];
    for (const group of list) {
      group.enrollments.sort(
        (a, b) => new Date(b.joined_at).getTime() - new Date(a.joined_at).getTime(),
      );
      group.avg_percent = Math.round(
        group.enrollments.reduce((sum, e) => sum + e.completion_percent, 0) /
          group.enrollments.length,
      );
    }
    return list;
  }, [students]);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return groups;
    return groups.filter(
      (g) =>
        g.student_name.toLowerCase().includes(q) ||
        g.student_email.toLowerCase().includes(q) ||
        g.enrollments.some((e) => (e.course?.title || '').toLowerCase().includes(q)),
    );
  }, [groups, search]);

  const totalStudents = groups.length;

  const courseCount = useMemo(
    () => new Set(students.map((s) => s.course?.id).filter(Boolean)).size,
    [students],
  );

  const avgCompletion = rows.length
    ? Math.round(rows.reduce((sum, g) => sum + g.avg_percent, 0) / rows.length)
    : 0;

  const removeStudent = async () => {
    if (!removing || !removing.course) return;
    setBusy(true);
    try {
      await courseService.removeCourseStudent(removing.course.id, removing.enrollment_id);
      showToast(`${removing.student_name} retiré du cours.`, 'success');
      setRemoving(null);
      await load();
    } catch {
      showToast('Impossible de retirer cet étudiant.', 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      <InstructorSidebar />
      <main className="flex-1 ml-64">
        <Header />
        <div className="p-8 max-w-6xl mx-auto">
          <div className="flex items-start justify-between gap-6 mb-8">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
                <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600">
                  <Users size={20} />
                </span>
                Étudiants
              </h1>
              <p className="text-slate-500 text-sm mt-1.5">
                Tous les étudiants inscrits à vos cours
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <p className="text-sm text-slate-500 mb-1">Étudiants</p>
              <p className="text-3xl font-bold text-slate-900">{totalStudents}</p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <p className="text-sm text-slate-500 mb-1">Cours</p>
              <p className="text-3xl font-bold text-slate-900">{courseCount}</p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <p className="text-sm text-slate-500 mb-1">Progression moyenne</p>
              <p className="text-3xl font-bold text-slate-900">{avgCompletion}%</p>
            </div>
          </div>

          <div className="relative mb-5">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher par nom, email ou cours..."
              className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
            />
          </div>

          {loading ? (
            <LoadingState rows={4} />
          ) : rows.length === 0 ? (
            <EmptyState
              icon={UserRound}
              iconClassName="bg-indigo-50 text-indigo-500"
              title="Aucun étudiant inscrit"
              description="Les étudiants apparaîtront ici après leur inscription à vos cours."
            />
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wider text-slate-400 border-b border-slate-200">
                    <th className="px-5 py-3.5 font-semibold">Étudiant</th>
                    <th className="px-5 py-3.5 font-semibold">Cours</th>
                    <th className="px-5 py-3.5 font-semibold">Inscription</th>
                    <th className="px-5 py-3.5 font-semibold">Progression</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rows.map((group, i) => (
                    <tr key={group.student_id} className="hover:bg-slate-50/10 transition-colors border-t border-slate-100">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <span
                            className={`flex items-center justify-center w-9 h-9 rounded-full text-white text-xs font-bold shrink-0 ${
                              AVATAR_COLORS[i % AVATAR_COLORS.length]
                            }`}
                          >
                            {initials(group.student_name)}
                          </span>
                          <div className="min-w-0">
                            <Link
                              to={`/instructor/students/${group.student_id}`}
                              className="font-semibold text-slate-900 truncate hover:text-indigo-600 transition-colors"
                            >
                              {group.student_name}
                            </Link>
                            <p className="text-xs text-slate-400 flex items-center gap-1 truncate">
                              <Mail size={11} /> {group.student_email}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex flex-wrap gap-1.5 max-w-[320px]">
                          {group.enrollments.map((enrollment) => (
                            <div
                              key={enrollment.enrollment_id}
                              className="inline-flex items-center gap-1 rounded-lg bg-slate-50 border border-slate-200 pl-2 pr-1 py-1"
                            >
                              {enrollment.course && (
                                <Link
                                  to={`/instructor/courses/${enrollment.course.id}`}
                                  className="text-slate-600 hover:text-indigo-600 text-xs font-medium transition-colors flex items-center gap-1"
                                >
                                  <BookOpen size={12} className="text-slate-400" />
                                  <span className="truncate max-w-[180px]">{enrollment.course.title}</span>
                                </Link>
                              )}
                              <button
                                onClick={() => setRemoving(enrollment)}
                                title="Retirer du cours"
                                className="p-1 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 cursor-pointer transition-colors bg-transparent border-none"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <p className="text-slate-600 flex items-center gap-1.5">
                          <CalendarDays size={13} className="text-slate-400" />
                          {new Date(group.enrollments[0].joined_at).toLocaleDateString()}
                        </p>
                        <p className="text-xs text-slate-400 mt-1">
                          {group.enrollments.length} cours
                        </p>
                      </td>
                      <td className="px-5 py-4">
                        <div className="space-y-1.5 min-w-[200px]">
                          {group.enrollments.map((enrollment) => (
                            <div key={enrollment.enrollment_id} className="flex items-center gap-2">
                              <div className="flex-1 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${completionColor(enrollment.completion_percent)}`}
                                  style={{ width: `${enrollment.completion_percent}%` }}
                                />
                              </div>
                              <span className="text-xs font-semibold text-slate-500 w-9 text-right">
                                {enrollment.completion_percent}%
                              </span>
                            </div>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {removing && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4"
          onClick={() => setRemoving(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-slate-900 mb-1.5">
              Retirer cet étudiant ?
            </h3>
            <p className="text-slate-500 text-sm mb-6">
              &quot;{removing.student_name}&quot; perdra l&apos;accès au cours &quot;
              {removing.course?.title}
              &quot;. Son historique de progression sera supprimé.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setRemoving(null)}
                disabled={busy}
                className="px-4 py-2 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer text-sm disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                onClick={removeStudent}
                disabled={busy}
                className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors cursor-pointer text-sm font-medium disabled:opacity-50 flex items-center gap-2"
              >
                {busy ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                Confirmer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
