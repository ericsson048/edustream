import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Mail,
  MapPin,
  BookOpen,
  CalendarDays,
  Clock,
  Loader2,
  UserRound,
  CheckCircle2,
  Target,
  Trophy,
  Award,
  Flame,
  Timer,
  Sparkles,
  StickyNote,
  CreditCard,
  ChevronDown,
  ChevronUp,
  FileText,
  MessageSquare,
  PlayCircle,
  Video,
  Globe,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import InstructorSidebar from '../../../../components/InstructorSidebar';
import Header from '../../../../components/Header';
import { useToast } from '../../../../contexts/ToastContext';
import { courseService, type StudentDetail } from '../../../../services/courseService';

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

function hashColor(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

function completionColor(percent: number) {
  if (percent >= 80) return 'bg-emerald-500';
  if (percent >= 40) return 'bg-blue-500';
  if (percent > 0) return 'bg-amber-500';
  return 'bg-slate-300';
}

const ACTIVITY_LABELS: Record<string, string> = {
  LESSON_STARTED: 'a commencé une leçon',
  LESSON_COMPLETED: 'a terminé une leçon',
  QUIZ_STARTED: 'a commencé un quiz',
  QUIZ_PASSED: 'a réussi un quiz',
  QUIZ_FAILED: 'a échoué à un quiz',
  COURSE_ENROLLED: "s'est inscrit à un cours",
  COURSE_COMPLETED: 'a terminé un cours',
  CERTIFICATE_CLAIMED: 'a obtenu un certificat',
  NOTE_CREATED: 'a créé une note',
  ASSIGNMENT_SUBMITTED: 'a rendu un devoir',
  FOCUS_SESSION: 'a terminé une session focus',
};

const ACTIVITY_ICONS: Record<string, React.ComponentType<{ className?: string; size?: number }>> = {
  LESSON_STARTED: PlayCircle,
  LESSON_COMPLETED: CheckCircle2,
  QUIZ_STARTED: MessageSquare,
  QUIZ_PASSED: Trophy,
  QUIZ_FAILED: Trophy,
  COURSE_ENROLLED: BookOpen,
  COURSE_COMPLETED: Award,
  CERTIFICATE_CLAIMED: Award,
  NOTE_CREATED: StickyNote,
  ASSIGNMENT_SUBMITTED: FileText,
  FOCUS_SESSION: Timer,
};

const TX_STATUS_LABELS: Record<string, string> = {
  COMPLETED: 'Payé',
  PENDING: 'En attente',
  REFUNDED: 'Remboursé',
  FAILED: 'Échoué',
};

export default function StudentDetail() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [data, setData] = useState<StudentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedCourse, setExpandedCourse] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        setData(await courseService.getStudentDetail(id));
      } catch {
        showToast('Impossible de charger cet étudiant.', 'error');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  const student = data?.student;
  const stats = data?.stats;

  return (
    <div className="flex min-h-screen bg-slate-50">
      <InstructorSidebar />
      <main className="flex-1 ml-64">
        <Header />
        <div className="p-8 max-w-6xl mx-auto">
          <button
            onClick={() => navigate('/instructor/students')}
            className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-4 cursor-pointer bg-transparent border-none transition-colors"
          >
            <ArrowLeft size={16} /> Retour aux étudiants
          </button>

          {loading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
            </div>
          ) : !student || !stats ? (
            <div className="flex flex-col items-center justify-center text-center py-20 bg-white rounded-xl border border-dashed border-slate-300">
              <div className="w-12 h-12 rounded-full bg-indigo-50 flex items-center justify-center mb-4">
                <UserRound size={20} className="text-indigo-500" />
              </div>
              <p className="text-slate-700 font-medium">Étudiant introuvable</p>
            </div>
          ) : (
            <>
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-6">
                <div className="flex items-start gap-5">
                  {student.avatar_url ? (
                    <img
                      src={student.avatar_url}
                      alt={student.full_name}
                      className="w-16 h-16 rounded-2xl object-cover border border-slate-200"
                    />
                  ) : (
                    <span
                      className={`flex items-center justify-center w-16 h-16 rounded-2xl text-white text-xl font-bold ${hashColor(student.id)}`}
                    >
                      {initials(student.full_name)}
                    </span>
                  )}
                  <div className="flex-1 min-w-0">
                    <h1 className="text-2xl font-bold text-slate-900">{student.full_name}</h1>
                    {student.title && <p className="text-slate-500 text-sm mt-0.5">{student.title}</p>}
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-3 text-sm text-slate-500">
                      <span className="flex items-center gap-1.5">
                        <Mail size={14} className="text-slate-400" /> {student.email}
                      </span>
                      {student.location && (
                        <span className="flex items-center gap-1.5">
                          <MapPin size={14} className="text-slate-400" /> {student.location}
                        </span>
                      )}
                      {student.website && (
                        <a
                          href={student.website}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1.5 hover:text-indigo-600 transition-colors"
                        >
                          <Globe size={14} className="text-slate-400" /> {student.website}
                        </a>
                      )}
                      <span className="flex items-center gap-1.5">
                        <CalendarDays size={14} className="text-slate-400" />
                        Inscrit le {new Date(student.date_joined).toLocaleDateString()}
                      </span>
                      {student.last_seen && (
                        <span className="flex items-center gap-1.5">
                          <Clock size={14} className="text-slate-400" />
                          Vu le {new Date(student.last_seen).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                {student.bio && (
                  <p className="text-sm text-slate-600 mt-4 border-t border-slate-100 pt-4">{student.bio}</p>
                )}
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <StatCard
                  icon={BookOpen}
                  label="Cours inscrits"
                  value={`${stats.courses_enrolled}`}
                  sub={`${stats.courses_completed} terminés`}
                />
                <StatCard
                  icon={Target}
                  label="Progression moyenne"
                  value={`${stats.avg_completion}%`}
                  color="text-blue-600 bg-blue-50"
                />
                <StatCard
                  icon={Trophy}
                  label="Moyenne quiz"
                  value={stats.avg_quiz !== null ? `${stats.avg_quiz}%` : '—'}
                  color="text-amber-600 bg-amber-50"
                />
                <StatCard
                  icon={Award}
                  label="Certificats"
                  value={`${stats.certificates_count}`}
                  color="text-emerald-600 bg-emerald-50"
                />
                <StatCard
                  icon={Flame}
                  label="Jours d'activité (série)"
                  value={`${stats.streak_days}`}
                  color="text-orange-600 bg-orange-50"
                />
                <StatCard
                  icon={Timer}
                  label="Focus total"
                  value={`${Math.round(stats.focus_minutes / 60)}h`}
                  sub={`${stats.focus_minutes} min`}
                  color="text-violet-600 bg-violet-50"
                />
                <StatCard
                  icon={Sparkles}
                  label="Messages IA"
                  value={`${stats.ai_messages}`}
                  color="text-fuchsia-600 bg-fuchsia-50"
                />
                <StatCard
                  icon={StickyNote}
                  label="Notes"
                  value={`${stats.notes_count}`}
                  color="text-cyan-600 bg-cyan-50"
                />
              </div>

              <h2 className="text-lg font-bold text-slate-900 mb-4">Cours</h2>
              {data && data.enrollments.length === 0 ? (
                <div className="flex flex-col items-center justify-center text-center py-14 bg-white rounded-xl border border-dashed border-slate-300">
                  <div className="w-12 h-12 rounded-full bg-indigo-50 flex items-center justify-center mb-4">
                    <UserRound size={20} className="text-indigo-500" />
                  </div>
                  <p className="text-slate-700 font-medium">Aucun cours pour cet étudiant</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 mb-8">
                  {data?.enrollments.map((enrollment) => {
                    const expanded = expandedCourse === enrollment.enrollment_id;
                    return (
                      <div
                        key={enrollment.enrollment_id}
                        className="bg-white rounded-xl border border-slate-200 shadow-sm p-5"
                      >
                        <div className="flex items-start gap-4">
                          {enrollment.course.thumbnail_url ? (
                            <img
                              src={enrollment.course.thumbnail_url}
                              alt={enrollment.course.title}
                              className="w-14 h-14 rounded-xl object-cover border border-slate-200 shrink-0"
                            />
                          ) : (
                            <span className="flex items-center justify-center w-14 h-14 rounded-xl bg-indigo-50 text-indigo-600 shrink-0">
                              <BookOpen size={22} />
                            </span>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <Link
                                to={`/instructor/courses/${enrollment.course.id}`}
                                className="font-semibold text-slate-900 truncate hover:text-indigo-600 transition-colors"
                              >
                                {enrollment.course.title}
                              </Link>
                              {enrollment.certificate && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-medium shrink-0">
                                  <Award size={11} /> Certifié
                                </span>
                              )}
                            </div>
                            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5 text-xs text-slate-400">
                              <span className="flex items-center gap-1">
                                <CalendarDays size={11} /> Inscrit le{' '}
                                {new Date(enrollment.enrolled_at).toLocaleDateString()}
                              </span>
                              {enrollment.last_activity && (
                                <span className="flex items-center gap-1">
                                  <Clock size={11} /> Activité le{' '}
                                  {new Date(enrollment.last_activity).toLocaleDateString()}
                                </span>
                              )}
                              {enrollment.quiz_average !== null && (
                                <span className="flex items-center gap-1">
                                  <Trophy size={11} className="text-amber-500" /> Moyenne quiz :{' '}
                                  {Math.round(enrollment.quiz_average!)}% ({enrollment.quizzes_passed}/
                                  {enrollment.quiz_attempts} réussis)
                                </span>
                              )}
                              <span className="flex items-center gap-1">
                                <FileText size={11} /> {enrollment.assignments.length} devoirs rendus
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="mt-4">
                          <div className="flex items-center justify-between text-xs mb-1.5">
                            <span className="text-slate-500 flex items-center gap-1">
                              <CheckCircle2 size={12} className="text-emerald-500" />
                              {enrollment.completed_lessons}/{enrollment.total_lessons} leçons
                            </span>
                            <span className="font-semibold text-slate-600">{enrollment.completion_percent}%</span>
                          </div>
                          <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${completionColor(enrollment.completion_percent)}`}
                              style={{ width: `${enrollment.completion_percent}%` }}
                            />
                          </div>
                        </div>

                        <button
                          onClick={() =>
                            setExpandedCourse(expanded ? null : enrollment.enrollment_id)
                          }
                          className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800 cursor-pointer bg-transparent border-none transition-colors"
                        >
                          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                          {expanded ? 'Réduire le détail' : 'Voir le détail'}
                        </button>

                        {expanded && (
                          <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                                Leçons ({enrollment.lesson_progress.length})
                              </h3>
                              <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
                                {enrollment.lesson_progress.length === 0 && (
                                  <p className="text-sm text-slate-400">Aucune leçon commencée</p>
                                )}
                                {enrollment.lesson_progress.map((lesson) => (
                                  <div
                                    key={lesson.lesson_id}
                                    className="flex items-center gap-2.5 text-sm"
                                  >
                                    <span
                                      className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                                        lesson.is_completed
                                          ? 'bg-emerald-100 text-emerald-600'
                                          : 'bg-slate-100 text-slate-400'
                                      }`}
                                    >
                                      {lesson.is_completed ? (
                                        <CheckCircle2 size={12} />
                                      ) : lesson.lesson_type === 'VIDEO' ? (
                                        <Video size={12} />
                                      ) : (
                                        <FileText size={12} />
                                      )}
                                    </span>
                                    <span
                                      className={`flex-1 truncate ${
                                        lesson.is_completed
                                          ? 'text-slate-600 line-through decoration-slate-300'
                                          : 'text-slate-500'
                                      }`}
                                    >
                                      {lesson.title}
                                    </span>
                                    {!lesson.is_completed && lesson.last_position_seconds > 0 && (
                                      <span className="text-xs text-slate-400">
                                        {Math.round(lesson.last_position_seconds / 60)} min
                                      </span>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                            <div>
                              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                                Devoirs ({enrollment.assignments.length})
                              </h3>
                              <div className="space-y-2">
                                {enrollment.assignments.length === 0 && (
                                  <p className="text-sm text-slate-400">Aucun devoir rendu</p>
                                )}
                                {enrollment.assignments.map((assignment) => (
                                  <div
                                    key={assignment.assignment_id}
                                    className="border border-slate-100 rounded-lg p-3"
                                  >
                                    <div className="flex items-center justify-between gap-2">
                                      <p className="text-sm font-semibold text-slate-800 truncate">
                                        {assignment.title}
                                      </p>
                                      <span
                                        className={`px-2 py-0.5 rounded-full text-xs font-medium shrink-0 ${
                                          assignment.status === 'GRADED'
                                            ? 'bg-emerald-50 text-emerald-700'
                                            : 'bg-amber-50 text-amber-700'
                                        }`}
                                      >
                                        {assignment.status === 'GRADED'
                                          ? `Noté ${assignment.grade ?? '—'}/${assignment.points}`
                                          : 'En attente'}
                                      </span>
                                    </div>
                                    {assignment.feedback && (
                                      <p className="text-xs text-slate-500 mt-1.5 italic">
                                        {assignment.feedback}
                                      </p>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                  <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                    <Clock size={18} className="text-slate-400" /> Activité récente
                  </h2>
                  {data && data.recent_activity.length === 0 ? (
                    <p className="text-sm text-slate-400">Aucune activité récente.</p>
                  ) : (
                    <div className="space-y-4">
                      {data?.recent_activity.map((activity, i) => {
                        const Icon = ACTIVITY_ICONS[activity.kind] || Clock;
                        return (
                          <div key={i} className="flex gap-3">
                            <span className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-500 flex items-center justify-center shrink-0">
                              <Icon size={14} />
                            </span>
                            <div className="min-w-0">
                              <p className="text-sm text-slate-700">
                                {ACTIVITY_LABELS[activity.kind] || activity.kind}
                                {activity.lesson_title && (
                                  <span className="text-slate-500"> · {activity.lesson_title}</span>
                                )}
                                {activity.course_title && (
                                  <span className="text-slate-500"> · {activity.course_title}</span>
                                )}
                              </p>
                              <p className="text-xs text-slate-400">
                                {new Date(activity.created_at).toLocaleString()}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                  <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                    <CreditCard size={18} className="text-slate-400" /> Historique d'achat
                  </h2>
                  {data && data.transactions.length === 0 ? (
                    <p className="text-sm text-slate-400">Aucun achat dans vos cours.</p>
                  ) : (
                    <div className="space-y-3">
                      {data?.transactions.map((tx) => (
                        <div
                          key={tx.id}
                          className="flex items-center justify-between border border-slate-100 rounded-lg p-3"
                        >
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-slate-800 truncate">
                              {tx.course_title}
                            </p>
                            <p className="text-xs text-slate-400">
                              {new Date(tx.created_at).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-sm font-bold text-slate-900">
                              {Number(tx.amount_paid).toFixed(2)} $
                            </p>
                            <span
                              className={`text-xs font-medium ${
                                tx.status === 'COMPLETED'
                                  ? 'text-emerald-600'
                                  : tx.status === 'REFUNDED'
                                    ? 'text-red-500'
                                    : 'text-amber-600'
                              }`}
                            >
                              {TX_STATUS_LABELS[tx.status] || tx.status}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  color = 'text-indigo-600 bg-indigo-50',
}: {
  icon: React.ComponentType<{ className?: string; size?: number }>;
  label: string;
  value: string;
  sub?: string;
  color?: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <p className="text-sm text-slate-500 mb-1 flex items-center gap-1.5">
        <span className={`w-6 h-6 rounded-lg flex items-center justify-center ${color}`}>
          <Icon size={13} />
        </span>
        {label}
      </p>
      <p className="text-2xl font-bold text-slate-900">{value}</p>
      {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
    </div>
  );
}
