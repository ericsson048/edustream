import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle,
  ClipboardList,
  Clock,
  FileText,
  FlaskConical,
  GraduationCap,
  Loader2,
  MapPin,
  Send,
} from 'lucide-react';
import Header from '../../../../components/Header';
import Sidebar from '../../../../components/Sidebar';
import { useToast } from '../../../../contexts/ToastContext';
import { courseService } from '../../../../services/courseService';
import type {
  AttendanceRecord,
  AttendanceStatus,
  Course,
  CourseGradesSummary,
  CourseTranscript,
  StudentGradeRow,
  UniversitySession,
} from '../../../../types/lms';

const TYPE_LABELS: Record<string, string> = {
  CM: 'Cours magistral',
  TD: 'Travaux dirigés',
  TP: 'Travaux pratiques',
};

const STATUS_COLORS: Record<AttendanceStatus, string> = {
  PRESENT: 'bg-emerald-100 text-emerald-700',
  LATE: 'bg-amber-100 text-amber-700',
  ABSENT: 'bg-rose-100 text-rose-700',
  EXCUSED: 'bg-sky-100 text-sky-700',
};

const STATUS_LABELS: Record<AttendanceStatus, string> = {
  PRESENT: 'Présent',
  LATE: 'Retard',
  ABSENT: 'Absent',
  EXCUSED: 'Excusé',
};

export default function CourseSuivi() {
  const { id = '' } = useParams();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [course, setCourse] = useState<Course | null>(null);
  const [sessions, setSessions] = useState<UniversitySession[]>([]);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [summary, setSummary] = useState<CourseGradesSummary | null>(null);
  const [transcript, setTranscript] = useState<CourseTranscript | null>(null);
  const [tab, setTab] = useState<'assiduite' | 'notes'>('assiduite');
  const [justifyingId, setJustifyingId] = useState<string | null>(null);
  const [justificationText, setJustificationText] = useState('');
  const [submittingJustification, setSubmittingJustification] = useState(false);

  const load = () => {
    setLoading(true);
    Promise.all([
      courseService.getCourse(id).catch(() => null),
      courseService.listUniversitySessions(id).catch(() => []),
      courseService.listAttendanceRecords().catch(() => []),
      courseService.getCourseGradesSummary(id).catch(() => null),
      courseService.getCourseTranscript(id).catch(() => null),
    ])
      .then(([courseItem, sessionList, recordList, gradeSummary, courseTranscript]) => {
        setCourse(courseItem);
        setSessions(sessionList);
        setRecords(recordList);
        setSummary(gradeSummary);
        setTranscript(courseTranscript);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (id) load();
  }, [id]);

  const myRow: StudentGradeRow | null | undefined = useMemo(() => {
    if (!summary) return undefined;
    return summary.students[0] ?? null;
  }, [summary]);

  const recordBySession = useMemo(() => {
    return new Map(records.map((r) => [r.session, r]));
  }, [records]);

  const justifyAbsence = async (record: AttendanceRecord) => {
    if (!justificationText.trim()) {
      showToast('Veuillez saisir une justification.', 'error');
      return;
    }
    setSubmittingJustification(true);
    try {
      const updated = await courseService.justifyAbsence(record.id, justificationText.trim());
      setRecords((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
      setJustifyingId(null);
      setJustificationText('');
      showToast('Justification envoyée. En attente de validation par votre professeur.', 'success');
    } catch {
      showToast('Impossible d\u2019envoyer la justification.', 'error');
    } finally {
      setSubmittingJustification(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <main className="flex-1 ml-64">
        <Header />
        <div className="p-8 max-w-6xl mx-auto">
          <Link
            to={`/course/${id}`}
            className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-6 cursor-pointer transition-colors"
          >
            <ArrowLeft size={16} /> Retour au cours
          </Link>

          <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-12 rounded-xl bg-indigo-100 flex items-center justify-center">
              <GraduationCap size={24} className="text-indigo-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">
                {course ? course.title : 'Suivi universitaire'}
              </h1>
              <p className="text-sm text-slate-500">
                Séances, assiduité et notes finales
              </p>
            </div>
            {course?.credits ? (
              <span className="ml-auto px-3 py-1.5 rounded-full bg-indigo-50 text-indigo-700 text-sm font-semibold">
                {course.credits} crédit{Number(course.credits) > 1 ? 's' : ''} ECTS
              </span>
            ) : null}
          </div>

          <div className="flex gap-2 mb-6 border-b border-slate-200">
            <button
              onClick={() => setTab('assiduite')}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 cursor-pointer transition-colors ${
                tab === 'assiduite'
                  ? 'border-indigo-600 text-indigo-700'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <CalendarDays size={16} /> Séances &amp; Assiduité
            </button>
            <button
              onClick={() => setTab('notes')}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 cursor-pointer transition-colors ${
                tab === 'notes'
                  ? 'border-indigo-600 text-indigo-700'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <ClipboardList size={16} /> Notes &amp; Relevé
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-24">
              <Loader2 className="animate-spin text-indigo-600" size={28} />
            </div>
          ) : tab === 'assiduite' ? (
            <div className="space-y-6">
              {myRow && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-white rounded-xl border border-slate-200 p-4">
                    <p className="text-xs font-medium text-slate-400 uppercase">Taux de présence</p>
                    <p className="text-2xl font-bold text-slate-900 mt-1">
                      {myRow.attendance_rate != null ? `${myRow.attendance_rate}%` : '—'}
                    </p>
                  </div>
                  <div className="bg-white rounded-xl border border-slate-200 p-4">
                    <p className="text-xs font-medium text-slate-400 uppercase">Présences</p>
                    <p className="text-2xl font-bold text-emerald-600 mt-1">
                      {myRow.attendance.present + myRow.attendance.late + myRow.attendance.excused} / {myRow.attendance.total}
                    </p>
                  </div>
                  <div className="bg-white rounded-xl border border-slate-200 p-4">
                    <p className="text-xs font-medium text-slate-400 uppercase">Absences non justifiées</p>
                    <p className="text-2xl font-bold text-rose-600 mt-1">{myRow.attendance.absent}</p>
                  </div>
                  <div className="bg-white rounded-xl border border-slate-200 p-4">
                    <p className="text-xs font-medium text-slate-400 uppercase">Justifications en attente</p>
                    <p className="text-2xl font-bold text-amber-600 mt-1">{myRow.attendance.pending_justifications}</p>
                  </div>
                </div>
              )}

              {sessions.length === 0 ? (
                <div className="bg-white rounded-xl border border-dashed border-slate-300 flex flex-col items-center justify-center py-20 text-center">
                  <CalendarDays size={24} className="text-slate-400 mb-3" />
                  <p className="text-slate-600 font-medium">Aucune séance planifiée pour le moment</p>
                  <p className="text-slate-400 text-sm mt-1">Les séances planifiées par votre professeur apparaîtront ici.</p>
                </div>
              ) : (
                <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
                  {sessions.map((session) => {
                    const record = recordBySession.get(session.id);
                    const status = record?.status ?? 'ABSENT';
                    return (
                      <div key={session.id} className="p-5 flex flex-col md:flex-row md:items-center gap-4">
                        <div className="md:w-40 shrink-0">
                          <p className="text-sm font-bold text-slate-900">
                            {new Date(session.date).toLocaleDateString('fr-FR', {
                              weekday: 'short',
                              day: 'numeric',
                              month: 'short',
                            })}
                          </p>
                          <p className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                            <Clock size={12} /> {session.start_time} – {session.end_time}
                          </p>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700">
                              {TYPE_LABELS[session.session_type] ?? session.session_type}
                            </span>
                            {session.is_cancelled && (
                              <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-500">
                                Annulée
                              </span>
                            )}
                          </div>
                          <p className="font-medium text-slate-800 mt-1">
                            {session.title || `Séance ${TYPE_LABELS[session.session_type] ?? session.session_type}`}
                          </p>
                          {session.location && (
                            <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                              <MapPin size={12} /> {session.location}
                            </p>
                          )}
                        </div>
                        <div className="shrink-0 flex flex-col items-end gap-2">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${STATUS_COLORS[status]}`}>
                            {STATUS_LABELS[status]}
                          </span>
                          {record && status === 'ABSENT' && record.justification_status === 'NONE' && (
                            <button
                              onClick={() => setJustifyingId(record.id)}
                              className="text-xs font-medium text-indigo-600 hover:text-indigo-800 cursor-pointer"
                            >
                              Justifier cette absence
                            </button>
                          )}
                          {record && record.justification_status !== 'NONE' && (
                            <span
                              className={`text-xs font-medium ${
                                record.justification_status === 'APPROVED'
                                  ? 'text-emerald-600'
                                  : record.justification_status === 'REJECTED'
                                    ? 'text-rose-600'
                                    : 'text-amber-600'
                              }`}
                            >
                              {record.justification_status === 'APPROVED'
                                ? 'Absence justifiée ✓'
                                : record.justification_status === 'REJECTED'
                                  ? 'Justification refusée'
                                  : 'Justification en attente...'}
                            </span>
                          )}
                        </div>
                        {justifyingId === record?.id && status === 'ABSENT' && record.justification_status === 'NONE' && (
                          <div className="w-full md:w-72">
                            <textarea
                              value={justificationText}
                              onChange={(e) => setJustificationText(e.target.value)}
                              placeholder="Raison de l'absence (certificat médical, justificatif...)"
                              rows={2}
                              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-y"
                            />
                            <div className="flex gap-2 mt-2">
                              <button
                                onClick={() => justifyAbsence(record)}
                                disabled={submittingJustification}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-medium hover:bg-indigo-700 cursor-pointer disabled:opacity-50"
                              >
                                <Send size={12} /> {submittingJustification ? 'Envoi...' : 'Envoyer'}
                              </button>
                              <button
                                onClick={() => setJustifyingId(null)}
                                className="px-3 py-1.5 border border-slate-300 text-slate-600 rounded-lg text-xs font-medium hover:bg-slate-50 cursor-pointer"
                              >
                                Annuler
                              </button>
                            </div>
                            {record.can_justify !== undefined && (
                              <p className="text-[11px] text-slate-400 mt-1.5">
                                À justifier sous 48h après la fin de la séance.
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white rounded-xl border border-slate-200 p-5">
                  <p className="text-xs font-medium text-slate-400 uppercase mb-3">Session principale</p>
                  {myRow?.session_1.average != null ? (
                    <div>
                      <p className="text-3xl font-bold text-slate-900">
                        {myRow.session_1.average.toFixed(2)} <span className="text-base font-medium text-slate-400">/20</span>
                      </p>
                      <span className={`inline-block mt-2 px-2.5 py-1 rounded-full text-xs font-bold ${
                        myRow.session_1.decision === 'ADMIS'
                          ? 'bg-emerald-100 text-emerald-700'
                          : myRow.session_1.decision === 'COMPENSE'
                            ? 'bg-sky-100 text-sky-700'
                            : myRow.session_1.decision === 'RATTRAPAGE'
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-rose-100 text-rose-700'
                      }`}>
                        {myRow.session_1.decision_display}
                      </span>
                    </div>
                  ) : (
                    <p className="text-slate-400 text-sm">Pas encore délibéré.</p>
                  )}
                </div>
                <div className="bg-white rounded-xl border border-slate-200 p-5">
                  <p className="text-xs font-medium text-slate-400 uppercase mb-3">Session de rattrapage</p>
                  {myRow?.session_2.average != null ? (
                    <div>
                      <p className="text-3xl font-bold text-slate-900">
                        {myRow.session_2.average.toFixed(2)} <span className="text-base font-medium text-slate-400">/20</span>
                      </p>
                      <span className={`inline-block mt-2 px-2.5 py-1 rounded-full text-xs font-bold ${
                        myRow.session_2.decision === 'ADMIS'
                          ? 'bg-emerald-100 text-emerald-700'
                          : myRow.session_2.decision === 'COMPENSE'
                            ? 'bg-sky-100 text-sky-700'
                            : 'bg-rose-100 text-rose-700'
                      }`}>
                        {myRow?.session_2.decision_display}
                      </span>
                    </div>
                  ) : (
                    <p className="text-slate-400 text-sm">Pas de rattrapage ou pas encore délibéré.</p>
                  )}
                </div>
              </div>

              <div className="bg-white rounded-xl border border-slate-200">
                <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
                  <FlaskConical size={16} className="text-indigo-600" />
                  <h2 className="font-bold text-slate-900">Détail des évaluations</h2>
                </div>
                {myRow && myRow.evaluations.length > 0 ? (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs uppercase text-slate-400 border-b border-slate-100">
                        <th className="px-5 py-3 font-medium">Évaluation</th>
                        <th className="px-5 py-3 font-medium">Type</th>
                        <th className="px-5 py-3 font-medium text-right">Coefficient</th>
                        <th className="px-5 py-3 font-medium text-right">Note</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {myRow.evaluations.map((ev) => (
                        <tr key={ev.id}>
                          <td className="px-5 py-3 font-medium text-slate-800">{ev.title}</td>
                          <td className="px-5 py-3 text-slate-500">
                            {ev.kind === 'CONTINUOUS'
                              ? 'Contrôle continu'
                              : ev.kind === 'EXAM'
                                ? 'Examen'
                                : 'Oral'}
                          </td>
                          <td className="px-5 py-3 text-right text-slate-600">{Number(ev.coefficient).toLocaleString('fr-FR')}</td>
                          <td className="px-5 py-3 text-right">
                            {ev.note != null ? (
                              <span className="font-bold text-slate-900">
                                {ev.note.toFixed(2)} <span className="font-medium text-slate-400">/20</span>
                              </span>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="px-5 py-8 text-sm text-slate-400 text-center">Aucune évaluation renseignée pour le moment.</p>
                )}
              </div>

              {transcript && transcript.rows.length > 0 && (
                <div className="bg-white rounded-xl border border-slate-200">
                  <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
                    <FileText size={16} className="text-indigo-600" />
                    <h2 className="font-bold text-slate-900">Votre relevé de notes</h2>
                  </div>
                  <div className="divide-y divide-slate-100">
                    {transcript.rows.map((row) => (
                      <div key={row.enrollment_id} className="px-5 py-4 flex items-center justify-between gap-4">
                        <div>
                          <p className="font-semibold text-slate-900">{row.student.full_name}</p>
                          <p className="text-xs text-slate-500">
                            Assiduité : {row.attendance_rate != null ? `${row.attendance_rate}%` : '—'}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-slate-900">
                            {row.final.average != null ? `${row.final.average.toFixed(2)} /20` : '—'}
                          </p>
                          <p className="text-xs text-slate-500">
                            {row.final.decision_display}
                            {row.credits_earned > 0 ? ` · ${row.credits_earned} ECTS` : ''}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2 text-sm text-slate-500">
                <CheckCircle size={15} className="text-emerald-500" />
                Notes et relevé établis par votre professeur (échelle /20, validation à 10/20).
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}