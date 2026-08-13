import Sidebar from '../../components/Sidebar';
import Header from '../../components/Header';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  learningService,
  type AssignmentItem,
  type SubmissionItem,
} from '../../services/learningService';
import { courseService } from '../../services/courseService';
import { useToast } from '../../contexts/ToastContext';
import type { Enrollment } from '../../types/lms';
import SubmissionDetailModal from '../../components/SubmissionDetailModal';
import {
  BookOpen,
  ChevronRight,
  ArrowLeft,
  Clock,
  CheckCircle2,
  AlertCircle,
  Circle,
  FileText,
  Eye,
  Pencil,
} from 'lucide-react';

const TYPE_COLORS: Record<string, string> = {
  PROJECT: 'bg-purple-100 text-purple-700',
  QUIZ: 'bg-blue-100 text-blue-700',
  ESSAY: 'bg-amber-100 text-amber-700',
  REPORT: 'bg-teal-100 text-teal-700',
  CODE: 'bg-rose-100 text-rose-700',
};

function isPastDue(due: string) {
  return new Date(due) < new Date();
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function StatusBadge({ status }: { status: string | undefined }) {
  if (!status || status === 'PENDING') {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-400">
        <Circle className="w-3 h-3" /> À rendre
      </span>
    );
  }
  if (status === 'SUBMITTED') {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600">
        <Clock className="w-3 h-3" /> Soumis
      </span>
    );
  }
  if (status === 'GRADED') {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-600">
        <CheckCircle2 className="w-3 h-3" /> Noté
      </span>
    );
  }
  if (status === 'MISSING') {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-500">
        <AlertCircle className="w-3 h-3" /> Manquant
      </span>
    );
  }
  return <span className="text-xs font-semibold text-slate-500">{status}</span>;
}

export default function Assignments() {
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [assignments, setAssignments] = useState<AssignmentItem[]>([]);
  const [submissions, setSubmissions] = useState<SubmissionItem[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<SubmissionItem | null>(null);
  const { showToast } = useToast();

  useEffect(() => {
    setLoading(true);
    Promise.all([
      courseService.listEnrollments({ is_active: true }),
      learningService.listAssignments(),
      learningService.listSubmissions(),
    ])
      .then(([e, a, s]) => {
        setEnrollments(e);
        setAssignments(a);
        setSubmissions(s);
      })
      .catch(() => showToast('Impossible de charger les données.', 'error'))
      .finally(() => setLoading(false));
  }, [showToast]);

  const submissionByAssignment = Object.fromEntries(submissions.map((s) => [s.assignment, s]));

  const selectedEnrollment = enrollments.find((e) => e.course === selectedCourseId);

  const courseAssignments = selectedCourseId
    ? assignments.filter((a) => a.course === selectedCourseId)
    : [];

  function courseStats(courseId: string) {
    const list = assignments.filter((a) => a.course === courseId);
    const total = list.length;
    const done = list.filter((a) => {
      const s = submissionByAssignment[a.id];
      return s && (s.status === 'SUBMITTED' || s.status === 'GRADED');
    }).length;
    const overdue = list.filter(
      (a) => !submissionByAssignment[a.id] && isPastDue(a.due_date),
    ).length;
    return { total, done, overdue };
  }

  if (selectedCourseId && selectedEnrollment) {
    return (
      <div className="flex min-h-screen bg-slate-50 font-sans text-slate-900">
        <Sidebar />
        <main className="flex-1 ml-64">
          <Header />
          <div className="p-8 mx-auto">
            <button
              onClick={() => setSelectedCourseId(null)}
              className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-900 transition-colors mb-6 cursor-pointer bg-transparent border-none"
            >
              <ArrowLeft className="w-4 h-4" /> Tous les cours
            </button>

            <h1 className="text-2xl font-bold mb-1">{selectedEnrollment.course_title}</h1>
            <p className="text-slate-500 mb-8 text-sm">
              {courseAssignments.length} devoir{courseAssignments.length !== 1 ? 's' : ''}
            </p>

            {courseAssignments.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-16 text-center">
                <FileText className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500 font-medium">Aucun devoir pour ce cours.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {courseAssignments.map((a) => {
                  const sub = submissionByAssignment[a.id];
                  const overdue = !sub && isPastDue(a.due_date);
                  const published = !!sub?.is_published && sub.grade != null;
                  const gradedPending = sub?.status === 'GRADED' && !sub?.is_published;
                  const submitted = sub?.status === 'SUBMITTED';
                  return (
                    <div
                      key={a.id}
                      className={`bg-white rounded-2xl border ${
                        overdue ? 'border-red-200' : 'border-slate-200'
                      } p-5 flex items-center gap-4`}
                    >
                      <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0">
                        <FileText className="w-5 h-5 text-slate-500" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-slate-900 truncate">{a.title}</span>
                          <span
                            className={`text-xs font-bold px-2 py-0.5 rounded-full ${TYPE_COLORS[a.type] ?? 'bg-slate-100 text-slate-600'}`}
                          >
                            {a.type}
                          </span>
                          {sub?.is_late && submitted && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full">
                              <Clock size={10} /> En retard
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-4 mt-1 text-xs text-slate-400 flex-wrap">
                          <span className={overdue ? 'text-red-500 font-semibold' : ''}>
                            {overdue ? '⚠ ' : ''}Rendu :{' '}
                            {new Date(a.due_date).toLocaleDateString('fr-FR', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </span>
                          <span>{a.points} pts</span>
                          {!sub && overdue && (
                            <span className="text-red-500 font-semibold">En retard</span>
                          )}
                          {submitted && (
                            <span className="text-blue-600 font-semibold">
                              Soumis — en attente de correction
                            </span>
                          )}
                          {gradedPending && (
                            <span className="text-amber-600 font-semibold">
                              Note : {sub.grade} / {a.points} — publication en attente
                            </span>
                          )}
                          {published && (
                            <span className="text-green-600 font-semibold">
                              Note : {sub.grade} / {a.points}
                            </span>
                          )}
                        </div>

                        {sub?.file_name && (
                          <p className="text-xs text-slate-500 mt-1.5 flex items-center gap-1 truncate">
                            <FileText size={11} className="text-slate-400 shrink-0" />
                            {sub.file_name} — rendu le {formatDate(sub.submitted_at)}
                          </p>
                        )}
                        {published && sub?.feedback && (
                          <p className="text-xs text-slate-500 mt-1.5 truncate">{sub.feedback}</p>
                        )}
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        <StatusBadge status={sub?.status} />
                        {!sub && (
                          <Link
                            to={`/assignments/${a.id}/submit`}
                            className="px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-xl hover:bg-blue-700 transition-colors"
                          >
                            Rendre
                          </Link>
                        )}
                        {sub && !sub.is_published && (
                          <Link
                            to={`/assignments/${a.id}/submit`}
                            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-blue-600 hover:bg-blue-50 rounded-xl transition-colors"
                          >
                            <Pencil size={13} /> Modifier
                          </Link>
                        )}
                        {sub && (
                          <button
                            onClick={() => setDetail(sub)}
                            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer bg-transparent border-none"
                          >
                            <Eye size={13} /> Voir
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </main>
        {detail && <SubmissionDetailModal submission={detail} onClose={() => setDetail(null)} />}
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans text-slate-900">
      <Sidebar />
      <main className="flex-1 ml-64">
        <Header />
        <div className="p-8 mx-auto">
          <h1 className="text-3xl font-bold mb-1">Devoirs</h1>
          <p className="text-slate-500 mb-8">Sélectionnez un cours pour voir ses devoirs.</p>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="bg-white rounded-2xl border border-slate-200 p-6 animate-pulse h-44"
                />
              ))}
            </div>
          ) : enrollments.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-16 text-center">
              <BookOpen className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 font-medium">Vous n'êtes inscrit à aucun cours.</p>
              <Link
                to="/catalog"
                className="mt-4 inline-block text-sm font-bold text-blue-600 hover:text-blue-700"
              >
                Parcourir le catalogue →
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {enrollments.map((enrollment) => {
                const { total, done, overdue } = courseStats(enrollment.course);
                const progress = total > 0 ? Math.round((done / total) * 100) : 0;

                return (
                  <button
                    key={enrollment.id}
                    onClick={() => setSelectedCourseId(enrollment.course)}
                    className="text-left bg-white rounded-2xl border border-slate-200 p-6 hover:border-blue-400 hover:shadow-md transition-all group cursor-pointer"
                  >
                    <div className="flex items-start justify-between gap-3 mb-4">
                      <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                        <BookOpen className="w-6 h-6 text-blue-500" />
                      </div>
                      <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-blue-500 transition-colors mt-1 flex-shrink-0" />
                    </div>

                    <h3 className="font-bold text-slate-900 leading-snug mb-1 line-clamp-2">
                      {enrollment.course_title}
                    </h3>

                    <p className="text-sm text-slate-500 mb-4">
                      {total === 0
                        ? 'Aucun devoir'
                        : `${done} / ${total} devoir${total > 1 ? 's' : ''} rendu${done > 1 ? 's' : ''}`}
                    </p>

                    {total > 0 && (
                      <div className="mb-3">
                        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-500 rounded-full transition-all"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>
                    )}

                    <div className="flex items-center gap-2 flex-wrap">
                      {done > 0 && (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                          <CheckCircle2 className="w-3 h-3" /> {done} rendu{done > 1 ? 's' : ''}
                        </span>
                      )}
                      {overdue > 0 && (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
                          <AlertCircle className="w-3 h-3" /> {overdue} en retard
                        </span>
                      )}
                      {total - done - overdue > 0 && (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                          <Circle className="w-3 h-3" /> {total - done - overdue} à faire
                        </span>
                      )}
                      {total === 0 && <span className="text-xs text-slate-400">—</span>}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </main>
      {detail && <SubmissionDetailModal submission={detail} onClose={() => setDetail(null)} />}
    </div>
  );
}
