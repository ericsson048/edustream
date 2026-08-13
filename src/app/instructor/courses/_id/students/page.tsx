import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Search,
  Trash2,
  Users,
  UserRound,
  Loader2,
  Mail,
  CalendarDays,
  GraduationCap,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import InstructorSidebar from '../../../../../components/InstructorSidebar';
import Header from '../../../../../components/Header';
import { useToast } from '../../../../../contexts/ToastContext';
import { courseService, type CourseStudent } from '../../../../../services/courseService';

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

export default function CourseStudents() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [courseTitle, setCourseTitle] = useState('');
  const [students, setStudents] = useState<CourseStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [removing, setRemoving] = useState<CourseStudent | null>(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [course, list] = await Promise.all([
        courseService.getCourse(id),
        courseService.listCourseStudents(id),
      ]);
      setCourseTitle(course.title);
      setStudents(list);
    } catch {
      showToast('Impossible de charger les étudiants.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [id]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return students;
    return students.filter(
      (s) =>
        s.student_name.toLowerCase().includes(q) ||
        s.student_email.toLowerCase().includes(q),
    );
  }, [students, search]);

  const avgCompletion = students.length
    ? Math.round(students.reduce((sum, s) => sum + s.completion_percent, 0) / students.length)
    : 0;

  const removeStudent = async () => {
    if (!removing) return;
    setBusy(true);
    try {
      await courseService.removeCourseStudent(id, removing.enrollment_id);
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
          <button
            onClick={() => navigate(`/instructor/courses/${id}`)}
            className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-4 cursor-pointer bg-transparent border-none transition-colors"
          >
            <ArrowLeft size={16} /> Retour au cours
          </button>

          <div className="flex items-start justify-between gap-6 mb-8">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
                <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600">
                  <Users size={20} />
                </span>
                Étudiants inscrits
              </h1>
              <p className="text-slate-500 text-sm mt-1.5">{courseTitle}</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <p className="text-sm text-slate-500 mb-1">Étudiants</p>
              <p className="text-3xl font-bold text-slate-900">{students.length}</p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <p className="text-sm text-slate-500 mb-1">Progression moyenne</p>
              <p className="text-3xl font-bold text-slate-900">{avgCompletion}%</p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <p className="text-sm text-slate-500 mb-1">En cours de progression</p>
              <p className="text-3xl font-bold text-slate-900">
                {students.filter((s) => s.completion_percent > 0 && s.completion_percent < 100).length}
              </p>
            </div>
          </div>

          <div className="relative mb-5">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher par nom ou email..."
              className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
            />
          </div>

          {loading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center py-20 bg-white rounded-xl border border-dashed border-slate-300">
              <div className="w-12 h-12 rounded-full bg-indigo-50 flex items-center justify-center mb-4">
                <UserRound size={20} className="text-indigo-500" />
              </div>
              <p className="text-slate-700 font-medium">Aucun étudiant inscrit</p>
              <p className="text-slate-400 text-sm mt-1">
                Les étudiants apparaîtront ici après leur inscription au cours.
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wider text-slate-400 border-b border-slate-200">
                    <th className="px-5 py-3.5 font-semibold">Étudiant</th>
                    <th className="px-5 py-3.5 font-semibold">Inscription</th>
                    <th className="px-5 py-3.5 font-semibold">Progression</th>
                    <th className="px-5 py-3.5 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map((student, i) => (
                    <tr key={student.enrollment_id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <span
                            className={`flex items-center justify-center w-9 h-9 rounded-full text-white text-xs font-bold shrink-0 ${
                              AVATAR_COLORS[i % AVATAR_COLORS.length]
                            }`}
                          >
                            {initials(student.student_name)}
                          </span>
                          <div className="min-w-0">
                            <p className="font-semibold text-slate-900 truncate">
                              {student.student_name}
                            </p>
                            <p className="text-xs text-slate-400 flex items-center gap-1 truncate">
                              <Mail size={11} /> {student.student_email}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <p className="text-slate-600 flex items-center gap-1.5">
                          <CalendarDays size={13} className="text-slate-400" />
                          {new Date(student.joined_at).toLocaleDateString()}
                        </p>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3 min-w-[180px]">
                          <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${completionColor(student.completion_percent)}`}
                              style={{ width: `${student.completion_percent}%` }}
                            />
                          </div>
                          <span className="text-xs font-semibold text-slate-500 w-12 text-right">
                            {student.completion_percent}%
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                          <GraduationCap size={11} />
                          {student.completed_lessons}/{student.total_lessons} leçons
                        </p>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <button
                          onClick={() => setRemoving(student)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-red-600 hover:bg-red-50 cursor-pointer transition-colors bg-transparent border-none"
                        >
                          <Trash2 size={13} /> Retirer
                        </button>
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
              &quot;{removing.student_name}&quot; perdra l&apos;accès au cours. Son
              historique de progression sera supprimé.
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
