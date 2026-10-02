import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  CalendarDays,
  Calculator,
  FileText,
  X,
  Plus,
  Trash2,
  Check,
  GraduationCap,
  Loader2,
  FlaskConical,
  BookOpen,
  ClipboardList,
  CheckCheck,
} from 'lucide-react';
import InstructorSidebar from '../../../../../components/InstructorSidebar';
import Header from '../../../../../components/Header';
import { useToast } from '../../../../../contexts/ToastContext';
import { courseService } from '../../../../../services/courseService';
import { learningService, type AssignmentItem, type QuizItem } from '../../../../../services/learningService';
import type {
  AttendanceRecord,
  AttendanceStatus,
  Course,
  CourseGradesSummary,
  CourseTranscript,
  Evaluation,
  StudentGradeRow,
  UniversitySession,
} from '../../../../../types/lms';

type Tab = 'seances' | 'evaluations' | 'notes' | 'releve';

const SESSION_TYPE_LABELS: Record<string, string> = {
  CM: 'CM',
  TD: 'TD',
  TP: 'TP',
};

const DECISION_STYLES: Record<string, string> = {
  ADMIS: 'bg-emerald-50 text-emerald-700',
  COMPENSE: 'bg-teal-50 text-teal-700',
  RATTRAPAGE: 'bg-amber-50 text-amber-700',
  REFUSE: 'bg-rose-50 text-rose-700',
  PENDING: 'bg-slate-100 text-slate-600',
};

const DECISION_LABELS: Record<string, string> = {
  ADMIS: 'Admis',
  COMPENSE: 'Compensé',
  RATTRAPAGE: 'Rattrapage',
  REFUSE: 'Refusé',
  PENDING: 'En attente',
};

const AVAILABLE_DECISIONS = ['ADMIS', 'COMPENSE', 'RATTRAPAGE', 'REFUSE'];

type SessionForm = {
  session_type: 'CM' | 'TD' | 'TP';
  title: string;
  date: string;
  start_time: string;
  end_time: string;
  location: string;
};
const emptySessionForm: SessionForm = {
  session_type: 'CM',
  title: '',
  date: new Date().toISOString().slice(0, 10),
  start_time: '09:00',
  end_time: '11:00',
  location: '',
};

type EvaluationForm = {
  kind: 'CONTINUOUS' | 'EXAM' | 'ORAL';
  title: string;
  coefficient: string;
  date: string;
  source: 'MANUAL' | 'QUIZ' | 'ASSIGNMENT';
  quiz: string;
  assignment: string;
};
const emptyEvaluationForm: EvaluationForm = {
  kind: 'CONTINUOUS',
  title: '',
  coefficient: '1',
  date: '',
  source: 'MANUAL',
  quiz: '',
  assignment: '',
};

const statusButton = (label: string, value: AttendanceStatus, active: boolean, color: string) =>
  `px-2 py-1 text-xs rounded-md font-medium transition-colors border ${
    active ? `${color} text-white border-transparent` : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
  }`;

const fmtTime = (t: string) => (t ? t.slice(0, 5) : '');

export default function CourseSuivi() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [tab, setTab] = useState<Tab>('seances');
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);

  // Séances
  const [sessions, setSessions] = useState<UniversitySession[]>([]);
  const [sessionForm, setSessionForm] = useState<SessionForm>(emptySessionForm);
  const [showSessionForm, setShowSessionForm] = useState(false);
  const [savingSession, setSavingSession] = useState(false);
  const [selectedSession, setSelectedSession] = useState<UniversitySession | null>(null);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [dirtyAttendance, setDirtyAttendance] = useState<Record<string, AttendanceStatus>>({});
  const [attendanceBusy, setAttendanceBusy] = useState(false);

  // Évaluations
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [quizzes, setQuizzes] = useState<QuizItem[]>([]);
  const [assignments, setAssignments] = useState<AssignmentItem[]>([]);
  const [evalForm, setEvalForm] = useState<EvaluationForm>(emptyEvaluationForm);
  const [showEvalForm, setShowEvalForm] = useState(false);
  const [savingEval, setSavingEval] = useState(false);

  // Notes
  const [summary, setSummary] = useState<CourseGradesSummary | null>(null);
  const [selectedEvalForNotes, setSelectedEvalForNotes] = useState<string>('');
  const [notesAttempt, setNotesAttempt] = useState<1 | 2>(1);
  const [noteInputs, setNoteInputs] = useState<Record<string, string>>({});
  const [savingNote, setSavingNote] = useState(false);
  const [deciding, setDeciding] = useState<string | null>(null);

  // Relevé
  const [transcript, setTranscript] = useState<CourseTranscript | null>(null);

  const loadSessions = async () => {
    try {
      const list = await courseService.listUniversitySessions(id);
      setSessions(list);
      if (selectedSession) {
        const still = list.find((s) => s.id === selectedSession.id);
        if (still) {
          const att = await courseService.listSessionAttendance(still.id);
          setAttendance(att);
        } else {
          setSelectedSession(null);
          setAttendance([]);
        }
      }
    } catch {
      showToast('Impossible de charger les séances.', 'error');
    }
  };

  const loadEvaluations = async () => {
    try {
      const [evals, quizList, assignList] = await Promise.all([
        courseService.listEvaluations(id),
        learningService.listQuizzes().catch(() => []),
        learningService.listAssignments().catch(() => []),
      ]);
      setEvaluations(evals);
      setQuizzes(quizList.filter((q) => q.course_id === id));
      setAssignments(assignList.filter((a) => a.course === id));
    } catch {
      showToast('Impossible de charger les évaluations.', 'error');
    }
  };

  const loadSummary = async () => {
    try {
      setSummary(await courseService.getCourseGradesSummary(id));
    } catch {
      showToast('Impossible de charger les notes.', 'error');
    }
  };

  const loadTranscript = async () => {
    try {
      setTranscript(await courseService.getCourseTranscript(id));
    } catch {
      showToast('Impossible de charger le relevé.', 'error');
    }
  };

  useEffect(() => {
    (async () => {
      try {
        const data = await courseService.getCourse(id);
        setCourse(data);
      } catch {
        showToast('Impossible de charger le cours.', 'error');
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  useEffect(() => {
    if (tab === 'seances') loadSessions();
    if (tab === 'evaluations') loadEvaluations();
    if (tab === 'notes') loadSummary();
    if (tab === 'releve') loadTranscript();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, id]);

  const openSessionAttendance = async (session: UniversitySession) => {
    setSelectedSession(session);
    setDirtyAttendance({});
    try {
      const att = await courseService.listSessionAttendance(session.id);
      setAttendance(att);
    } catch {
      showToast('Impossible de charger la feuille de présence.', 'error');
    }
  };

  const saveSession = async () => {
    setSavingSession(true);
    try {
      await courseService.createUniversitySession({
        course: id,
        session_type: sessionForm.session_type,
        title: sessionForm.title || `${SESSION_TYPE_LABELS[sessionForm.session_type]} – ${sessionForm.date}`,
        date: sessionForm.date,
        start_time: sessionForm.start_time,
        end_time: sessionForm.end_time,
        location: sessionForm.location,
      });
      showToast('Séance planifiée. Feuilles de présence créées.', 'success');
      setShowSessionForm(false);
      setSessionForm(emptySessionForm);
      await loadSessions();
    } catch {
      showToast('Impossible de créer la séance.', 'error');
    } finally {
      setSavingSession(false);
    }
  };

  const deleteSession = async (session: UniversitySession) => {
    try {
      await courseService.deleteUniversitySession(session.id);
      if (selectedSession?.id === session.id) {
        setSelectedSession(null);
        setAttendance([]);
      }
      showToast('Séance supprimée.', 'success');
      await loadSessions();
    } catch {
      showToast('Impossible de supprimer la séance.', 'error');
    }
  };

  const saveAttendance = async () => {
    if (!selectedSession) return;
    setAttendanceBusy(true);
    try {
      const records = Object.entries(dirtyAttendance).map(([studentId, status]) => ({
        student_id: studentId,
        status,
      }));
      await courseService.markSessionAttendance(selectedSession.id, records);
      showToast('Présences enregistrées.', 'success');
      setDirtyAttendance({});
      await openSessionAttendance(selectedSession);
    } catch {
      showToast('Impossible d\'enregistrer les présences.', 'error');
    } finally {
      setAttendanceBusy(false);
    }
  };

  const reviewJustification = async (record: AttendanceRecord, decision: 'APPROVE' | 'REJECT') => {
    try {
      await courseService.reviewJustification(record.id, decision);
      showToast(decision === 'APPROVE' ? 'Absence excusée.' : 'Justification rejetée.', 'success');
      if (selectedSession) await openSessionAttendance(selectedSession);
    } catch {
      showToast('Impossible de traiter la justification.', 'error');
    }
  };

  const saveEvaluation = async () => {
    setSavingEval(true);
    try {
      await courseService.createEvaluation({
        course: id,
        kind: evalForm.kind,
        title: evalForm.title,
        coefficient: parseFloat(evalForm.coefficient) || 1,
        date: evalForm.date || null,
        quiz: evalForm.source === 'QUIZ' ? evalForm.quiz || null : null,
        assignment: evalForm.source === 'ASSIGNMENT' ? evalForm.assignment || null : null,
      });
      showToast('Évaluation ajoutée. Moyennes recalculées.', 'success');
      setShowEvalForm(false);
      setEvalForm(emptyEvaluationForm);
      await loadEvaluations();
      if (tab === 'notes') await loadSummary();
    } catch {
      showToast('Impossible d\'ajouter l\'évaluation.', 'error');
    } finally {
      setSavingEval(false);
    }
  };

  const deleteEvaluation = async (evaluation: Evaluation) => {
    try {
      await courseService.deleteEvaluation(evaluation.id);
      showToast('Évaluation supprimée.', 'success');
      await loadEvaluations();
    } catch {
      showToast('Impossible de supprimer l\'évaluation.', 'error');
    }
  };

  const enterNote = async (enrollmentId: string, note: number | null) => {
    if (!selectedEvalForNotes) return;
    setSavingNote(true);
    try {
      await courseService.upsertEvaluationGrade({
        evaluation: selectedEvalForNotes,
        enrollment: enrollmentId,
        attempt: notesAttempt,
        note,
      });
      showToast('Note enregistrée.', 'success');
      await loadSummary();
    } catch {
      showToast('Impossible d\'enregistrer la note.', 'error');
    } finally {
      setSavingNote(false);
    }
  };

  const decide = async (student: StudentGradeRow, attempt: 1 | 2, decision: string) => {
    setDeciding(student.enrollment_id + attempt + decision);
    try {
      await courseService.decideCourseGrade(id, {
        enrollment_id: student.enrollment_id,
        attempt,
        decision,
      });
      showToast(`Délibération enregistrée (${DECISION_LABELS[decision] ?? decision}).`, 'success');
      await loadSummary();
    } catch (err: any) {
      showToast(err?.response?.data?.detail || 'Impossible de délibérer.', 'error');
    } finally {
      setDeciding(null);
    }
  };

  const currentEvals = useMemo(() => {
    if (!summary || !selectedEvalForNotes) return [];
    return summary.students.map((s) => {
      const ev = s.evaluations.find((e) => e.id === selectedEvalForNotes);
      return { student: s, evaluationNote: ev?.note ?? null };
    });
  }, [summary, selectedEvalForNotes]);

  if (loading) {
    return (
      <div className="flex min-h-screen bg-slate-50">
        <InstructorSidebar />
        <main className="flex-1 ml-64 flex items-center justify-center">
          <Loader2 className="animate-spin text-indigo-600" size={28} />
        </main>
      </div>
    );
  }

  const tabs: { key: Tab; label: string; icon: typeof CalendarDays }[] = [
    { key: 'seances', label: 'Séances & Assiduité', icon: CalendarDays },
    { key: 'evaluations', label: 'Évaluations', icon: FlaskConical },
    { key: 'notes', label: 'Notes & Délibération', icon: Calculator },
    { key: 'releve', label: 'Relevé de notes', icon: FileText },
  ];

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

          <div className="flex items-start justify-between gap-6 mb-6">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
                <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600">
                  <GraduationCap size={20} />
                </span>
                Suivi universitaire
              </h1>
              <p className="text-slate-500 text-sm mt-1.5 flex items-center gap-2">
                {course?.title}
                {course && (course.course_type === 'MARGINAL') && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 text-xs font-medium">
                    Cours marginal
                  </span>
                )}
                {course && course.credits > 0 && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 text-xs font-medium">
                    {course.credits} crédit{course.credits > 1 ? 's' : ''}
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="flex gap-2 mb-6 border-b border-slate-200">
            {tabs.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors cursor-pointer bg-transparent ${
                  tab === key
                    ? 'border-indigo-600 text-indigo-700'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                <Icon size={16} /> {label}
              </button>
            ))}
          </div>

          {tab === 'seances' && (
            <div className="space-y-6">
              {!showSessionForm ? (
                <button
                  onClick={() => setShowSessionForm(true)}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 cursor-pointer border-none"
                >
                  <Plus size={16} /> Planifier une séance
                </button>
              ) : (
                <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                      <CalendarDays size={16} className="text-indigo-600" /> Nouvelle séance
                    </h3>
                    <button
                      onClick={() => setShowSessionForm(false)}
                      className="text-slate-400 hover:text-slate-600 cursor-pointer bg-transparent border-none"
                    >
                      <X size={18} />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Type</label>
                      <div className="flex gap-2">
                        {(['CM', 'TD', 'TP'] as const).map((t) => (
                          <button
                            key={t}
                            onClick={() => setSessionForm((f) => ({ ...f, session_type: t }))}
                            className={`px-3 py-1.5 text-xs rounded-md font-medium cursor-pointer border ${
                              sessionForm.session_type === t
                                ? 'bg-indigo-600 text-white border-transparent'
                                : 'bg-white text-slate-600 border-slate-200'
                            }`}
                          >
                            {SESSION_TYPE_LABELS[t]}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Date</label>
                      <input
                        type="date"
                        value={sessionForm.date}
                        onChange={(e) => setSessionForm((f) => ({ ...f, date: e.target.value }))}
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Titre (optionnel)</label>
                      <input
                        type="text"
                        value={sessionForm.title}
                        onChange={(e) => setSessionForm((f) => ({ ...f, title: e.target.value }))}
                        placeholder="Ex : Chapitre 3"
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Début</label>
                      <input
                        type="time"
                        value={sessionForm.start_time}
                        onChange={(e) => setSessionForm((f) => ({ ...f, start_time: e.target.value }))}
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Fin</label>
                      <input
                        type="time"
                        value={sessionForm.end_time}
                        onChange={(e) => setSessionForm((f) => ({ ...f, end_time: e.target.value }))}
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Lieu</label>
                      <input
                        type="text"
                        value={sessionForm.location}
                        onChange={(e) => setSessionForm((f) => ({ ...f, location: e.target.value }))}
                        placeholder="Salle A3"
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={saveSession}
                      disabled={savingSession}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 cursor-pointer border-none disabled:opacity-50"
                    >
                      {savingSession ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                      Créer la séance
                    </button>
                    <button
                      onClick={() => setShowSessionForm(false)}
                      className="px-4 py-2 rounded-lg bg-slate-100 text-slate-600 text-sm font-medium cursor-pointer border-none"
                    >
                      Annuler
                    </button>
                  </div>
                </div>
              )}

              <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                  <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                    <h3 className="font-semibold text-slate-900">Planning des séances</h3>
                    <span className="text-xs text-slate-400">{sessions.length} séance{sessions.length > 1 ? 's' : ''}</span>
                  </div>
                  <div className="divide-y divide-slate-100 max-h-[560px] overflow-y-auto">
                    {sessions.length === 0 && (
                      <p className="p-5 text-sm text-slate-400">Aucune séance planifiée.</p>
                    )}
                    {sessions.map((s) => (
                      <div key={s.id} className="p-4 flex items-center gap-4">
                        <div className="flex flex-col items-center w-16 shrink-0 rounded-lg bg-indigo-50 py-2">
                          <span className="text-[10px] font-semibold text-indigo-400 uppercase">
                            {new Date(s.date).toLocaleDateString('fr-FR', { month: 'short' })}
                          </span>
                          <span className="text-lg font-bold text-indigo-700 leading-none mt-0.5">
                            {new Date(s.date).getUTCDate()}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px] font-semibold">
                              {SESSION_TYPE_LABELS[s.session_type]}
                            </span>
                            <p className="text-sm font-medium text-slate-800 truncate">
                              {s.title || `${SESSION_TYPE_LABELS[s.session_type]} – ${s.date}`}
                            </p>
                            {s.is_cancelled && (
                              <span className="text-[10px] text-rose-600 font-semibold">ANNULÉE</span>
                            )}
                          </div>
                          <p className="text-xs text-slate-400 mt-0.5">
                            {fmtTime(s.start_time)} – {fmtTime(s.end_time)}
                            {s.location && <> · {s.location}</>}
                          </p>
                        </div>
                        <button
                          onClick={() => openSessionAttendance(s)}
                          className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 font-medium cursor-pointer"
                        >
                          Présences
                        </button>
                        <button
                          onClick={() => deleteSession(s)}
                          className="p-1.5 text-slate-300 hover:text-rose-500 cursor-pointer bg-transparent border-none"
                          title="Supprimer"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                  <div className="px-5 py-4 border-b border-slate-100">
                    <h3 className="font-semibold text-slate-900">
                      {selectedSession ? 'Feuille de présence' : 'Feuille de présence'}
                    </h3>
                    {selectedSession && (
                      <p className="text-xs text-slate-400 mt-0.5">
                        {SESSION_TYPE_LABELS[selectedSession.session_type]} · {selectedSession.date} ·{' '}
                        {fmtTime(selectedSession.start_time)} – {fmtTime(selectedSession.end_time)}
                      </p>
                    )}
                  </div>
                  {!selectedSession ? (
                    <p className="p-5 text-sm text-slate-400">Sélectionnez une séance pour gérer les présences.</p>
                  ) : (
                    <div className="max-h-[560px] overflow-y-auto">
                      {attendance.length === 0 && (
                        <p className="p-5 text-sm text-slate-400">Aucun étudiant inscrit à cette séance.</p>
                      )}
                      <div className="divide-y divide-slate-100">
                        {attendance.map((record) => {
                          const value = dirtyAttendance[record.student] ?? record.status;
                          return (
                            <div key={record.id} className="p-4">
                              <div className="flex items-center justify-between gap-3 mb-2">
                                <div className="flex items-center gap-2 min-w-0">
                                  <span className="text-sm font-medium text-slate-800 truncate">
                                    {record.student_name ?? record.student}
                                  </span>
                                  {record.justification_status === 'PENDING' && (
                                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-600 font-semibold">
                                      Justification en attente
                                    </span>
                                  )}
                                </div>
                                <span className="text-[11px] text-slate-400">{record.session_type}</span>
                              </div>
                              <div className="flex items-center justify-between gap-3">
                                <div className="flex gap-1.5">
                                  <button
                                    onClick={() => setDirtyAttendance((d) => ({ ...d, [record.student]: 'PRESENT' }))}
                                    className={statusButton('Présent', 'PRESENT', value === 'PRESENT', 'bg-emerald-500')}
                                  >
                                    Présent
                                  </button>
                                  <button
                                    onClick={() => setDirtyAttendance((d) => ({ ...d, [record.student]: 'LATE' }))}
                                    className={statusButton('Retard', 'LATE', value === 'LATE', 'bg-amber-500')}
                                  >
                                    Retard
                                  </button>
                                  <button
                                    onClick={() => setDirtyAttendance((d) => ({ ...d, [record.student]: 'ABSENT' }))}
                                    className={statusButton('Absent', 'ABSENT', value === 'ABSENT', 'bg-rose-500')}
                                  >
                                    Absent
                                  </button>
                                </div>
                                {dirtyAttendance[record.student] && dirtyAttendance[record.student] !== record.status && (
                                  <span className="text-[10px] text-indigo-500 font-semibold">modifié</span>
                                )}
                              </div>
                              {record.justification_status === 'PENDING' && (
                                <div className="mt-2 rounded-lg bg-slate-50 p-3">
                                  <p className="text-xs text-slate-600 italic">« {record.justification} »</p>
                                  <div className="flex gap-2 mt-2">
                                    <button
                                      onClick={() => reviewJustification(record, 'APPROVE')}
                                      className="flex items-center gap-1 px-2.5 py-1 text-xs rounded-md bg-emerald-500 text-white font-medium cursor-pointer border-none"
                                    >
                                      <CheckCheck size={12} /> Excuser
                                    </button>
                                    <button
                                      onClick={() => reviewJustification(record, 'REJECT')}
                                      className="flex items-center gap-1 px-2.5 py-1 text-xs rounded-md bg-slate-200 text-slate-600 font-medium cursor-pointer border-none"
                                    >
                                      <X size={12} /> Rejeter
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                      {Object.keys(dirtyAttendance).length > 0 && (
                        <div className="p-4 border-t border-slate-100">
                          <button
                            onClick={saveAttendance}
                            disabled={attendanceBusy}
                            className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 cursor-pointer border-none disabled:opacity-50"
                          >
                            {attendanceBusy ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                            Enregistrer les présences ({Object.keys(dirtyAttendance).length})
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {tab === 'evaluations' && (
            <div className="space-y-6">
              {!showEvalForm ? (
                <button
                  onClick={() => setShowEvalForm(true)}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 cursor-pointer border-none"
                >
                  <Plus size={16} /> Ajouter une évaluation
                </button>
              ) : (
                <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                      <FlaskConical size={16} className="text-indigo-600" /> Nouvelle évaluation
                    </h3>
                    <button
                      onClick={() => setShowEvalForm(false)}
                      className="text-slate-400 hover:text-slate-600 cursor-pointer bg-transparent border-none"
                    >
                      <X size={18} />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Type</label>
                      <select
                        value={evalForm.kind}
                        onChange={(e) => setEvalForm((f) => ({ ...f, kind: e.target.value as EvaluationForm['kind'] }))}
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                      >
                        <option value="CONTINUOUS">Contrôle continu</option>
                        <option value="EXAM">Examen</option>
                        <option value="ORAL">Oral</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Titre</label>
                      <input
                        type="text"
                        value={evalForm.title}
                        onChange={(e) => setEvalForm((f) => ({ ...f, title: e.target.value }))}
                        placeholder="Ex : DS n°1"
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Coefficient</label>
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        value={evalForm.coefficient}
                        onChange={(e) => setEvalForm((f) => ({ ...f, coefficient: e.target.value }))}
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Date</label>
                      <input
                        type="date"
                        value={evalForm.date}
                        onChange={(e) => setEvalForm((f) => ({ ...f, date: e.target.value }))}
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Source de la note</label>
                    <div className="flex gap-4 mb-2">
                      {(
                        [
                          ['MANUAL', 'Saisie manuelle'],
                          ['QUIZ', 'Quiz'],
                          ['ASSIGNMENT', 'Devoir'],
                        ] as const
                      ).map(([key, label]) => (
                        <label key={key} className="flex items-center gap-1.5 text-sm text-slate-600 cursor-pointer">
                          <input
                            type="radio"
                            checked={evalForm.source === key}
                            onChange={() => setEvalForm((f) => ({ ...f, source: key }))}
                          />
                          {label}
                        </label>
                      ))}
                    </div>
                    {evalForm.source === 'QUIZ' && (
                      <select
                        value={evalForm.quiz}
                        onChange={(e) => setEvalForm((f) => ({ ...f, quiz: e.target.value }))}
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                      >
                        <option value="">Choisir un quiz…</option>
                        {quizzes.map((q) => (
                          <option key={q.id} value={q.id}>
                            {q.title}
                          </option>
                        ))}
                      </select>
                    )}
                    {evalForm.source === 'ASSIGNMENT' && (
                      <select
                        value={evalForm.assignment}
                        onChange={(e) => setEvalForm((f) => ({ ...f, assignment: e.target.value }))}
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                      >
                        <option value="">Choisir un devoir…</option>
                        {assignments.map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.title}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                  <button
                    onClick={saveEvaluation}
                    disabled={savingEval || !evalForm.title.trim()}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 cursor-pointer border-none disabled:opacity-50"
                  >
                    {savingEval ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                    Ajouter
                  </button>
                </div>
              )}

              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100">
                  <h3 className="font-semibold text-slate-900">Barème d'évaluation</h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Moyenne sur 20 = Σ (note × coefficient) / Σ coefficients
                  </p>
                </div>
                <div className="divide-y divide-slate-100">
                  {evaluations.length === 0 && (
                    <p className="p-5 text-sm text-slate-400">Aucune évaluation. Ajoutez-en pour calculer les moyennes.</p>
                  )}
                  {evaluations.map((e) => {
                    const avg = summary?.students.length
                      ? (() => {
                          const notes = summary.students
                            .map((s) => s.evaluations.find((ee) => ee.id === e.id)?.note ?? null)
                            .filter((n): n is number => n !== null);
                          return notes.length ? (notes.reduce((a, b) => a + b, 0) / notes.length).toFixed(2) : null;
                        })()
                      : null;
                    return (
                      <div key={e.id} className="p-4 flex items-center gap-4">
                        <span className="px-2 py-1 rounded bg-indigo-50 text-indigo-700 text-[10px] font-semibold shrink-0">
                          {e.kind_display ?? e.kind}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-800 truncate">{e.title}</p>
                          <p className="text-xs text-slate-400">
                            Coef {e.coefficient} · {e.source && <>&lt;{e.source}&gt; </>}
                            {e.date && ` · ${e.date}`}
                          </p>
                        </div>
                        {avg !== null && (
                          <span className="text-sm font-semibold text-slate-700">{avg} / 20</span>
                        )}
                        <button
                          onClick={() => { setSelectedEvalForNotes(e.id); setTab('notes'); }}
                          className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 font-medium cursor-pointer"
                        >
                          Saisir les notes
                        </button>
                        <button
                          onClick={() => deleteEvaluation(e)}
                          className="p-1.5 text-slate-300 hover:text-rose-500 cursor-pointer bg-transparent border-none"
                          title="Supprimer"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {tab === 'notes' && (
            <div className="space-y-6">
              <div className="grid md:grid-cols-4 gap-6 items-start">
                <div className="bg-white rounded-xl border border-slate-200 p-5">
                  <h3 className="font-semibold text-slate-900 text-sm mb-3">Évaluation à noter</h3>
                  <select
                    value={selectedEvalForNotes}
                    onChange={(e) => setSelectedEvalForNotes(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  >
                    <option value="">Choisir…</option>
                    {evaluations.map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.title}
                      </option>
                    ))}
                  </select>
                  <div className="flex gap-2 mt-3">
                    {([1, 2] as const).map((a) => (
                      <button
                        key={a}
                        onClick={() => setNotesAttempt(a)}
                        className={`px-3 py-1.5 text-xs rounded-md font-medium cursor-pointer border ${
                          notesAttempt === a
                            ? 'bg-indigo-600 text-white border-transparent'
                            : 'bg-white text-slate-600 border-slate-200'
                        }`}
                      >
                        {a === 1 ? 'Session 1' : 'Session 2 (rattrapage)'}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-slate-400 mt-3">
                    Les notes liées à un quiz ou un devoir sont calculées automatiquement en session 1.
                  </p>
                </div>

                <div className="md:col-span-3 bg-white rounded-xl border border-slate-200 overflow-hidden">
                  <div className="px-5 py-4 border-b border-slate-100">
                    <h3 className="font-semibold text-slate-900">Saisie des notes (sur 20)</h3>
                    {selectedEvalForNotes && notesAttempt === 2 && (
                      <p className="text-xs text-amber-600 mt-0.5">
                        Session de rattrapage : les notes saisies remplacent la session 1 pour l'admissibilité.
                      </p>
                    )}
                  </div>
                  <div className="divide-y divide-slate-100">
                    {!selectedEvalForNotes && (
                      <p className="p-5 text-sm text-slate-400">
                        Sélectionnez une évaluation pour saisir les notes.
                      </p>
                    )}
                    {selectedEvalForNotes && currentEvals.map(({ student, evaluationNote }) => {
                      const key = `${student.enrollment_id}:${notesAttempt}`;
                      const stored = noteInputs[key];
                      const displayValue = notesAttempt === 2
                        ? (summary?.students
                            .find((s) => s.enrollment_id === student.enrollment_id)
                            ?.evaluations.find((e) => e.id === selectedEvalForNotes)?.note ?? null)
                        : evaluationNote;
                      const isAuto = notesAttempt === 1 && !!evaluations.find((e) => e.id === selectedEvalForNotes)?.quiz;
                      return (
                        <div key={student.enrollment_id} className="p-4 flex items-center justify-between gap-4">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-sm font-medium text-slate-800 truncate">{student.student_name}</span>
                            {isAuto && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-violet-50 text-violet-600 font-semibold">
                                auto
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              max="20"
                              placeholder={displayValue !== null ? String(displayValue) : '—'}
                              disabled={isAuto && notesAttempt === 1}
                              value={stored ?? ''}
                              onChange={(e) => setNoteInputs((m) => ({ ...m, [key]: e.target.value }))}
                              className="w-24 rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-right disabled:bg-slate-50"
                            />
                            <button
                              onClick={() => enterNote(student.enrollment_id, stored ? Math.max(0, Math.min(20, parseFloat(stored))) : null)}
                              disabled={savingNote || stored === undefined}
                              className="px-3 py-1.5 text-xs rounded-lg bg-indigo-600 text-white font-medium cursor-pointer border-none disabled:opacity-40"
                            >
                              {isAuto && notesAttempt === 1 ? '—' : 'Enregistrer'}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {selectedEvalForNotes && notesAttempt === 2 && (
                    <p className="px-5 pb-4 text-xs text-slate-400">
                      En session 2, chaque note saisie remplace la note de session 1 pour la moyenne de rattrapage.
                    </p>
                  )}
                </div>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-slate-900">Délibération</h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      La délibération fige la décision (admis, compensation, rattrapage, refusé) et attribue les crédits.
                    </p>
                  </div>
                  {course && <span className="text-xs text-slate-400">{course.credits} crédit(s) à la validation</span>}
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs text-slate-400 border-b border-slate-100">
                        <th className="py-3 px-5 font-medium">Étudiant</th>
                        <th className="py-3 px-3 font-medium">Assiduité</th>
                        <th className="py-3 px-3 font-medium">Moyenne S1</th>
                        <th className="py-3 px-3 font-medium">Décision S1</th>
                        <th className="py-3 px-3 font-medium">Moyenne S2</th>
                        <th className="py-3 px-3 font-medium">Décision S2</th>
                        <th className="py-3 px-5 font-medium">Délibérer</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {summary && summary.students.length === 0 && (
                        <tr>
                          <td colSpan={7} className="py-5 px-5 text-slate-400">
                            Aucun étudiant inscrit.
                          </td>
                        </tr>
                      )}
                      {summary?.students.map((s) => (
                        <tr key={s.enrollment_id}>
                          <td className="py-3 px-5">
                            <p className="font-medium text-slate-800">{s.student_name}</p>
                            <p className="text-xs text-slate-400">{s.student_email}</p>
                          </td>
                          <td className="py-3 px-3">
                            <span className="text-xs text-slate-600">
                              {s.attendance_rate !== null ? `${s.attendance_rate}%` : '—'}
                            </span>
                            {s.attendance.pending_justifications > 0 && (
                              <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-600 font-semibold">
                                {s.attendance.pending_justifications} justif.
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-3 font-semibold text-slate-700">
                            {s.session_1.average !== null ? `${s.session_1.average}` : '—'}
                          </td>
                          <td className="py-3 px-3">
                            <span
                              className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                                DECISION_STYLES[s.session_1.decision] ?? DECISION_STYLES.PENDING
                              }`}
                            >
                              {DECISION_LABELS[s.session_1.decision] ?? s.session_1.decision_display}
                            </span>
                          </td>
                          <td className="py-3 px-3 font-semibold text-slate-700">
                            {s.session_2.average !== null ? `${s.session_2.average}` : '—'}
                          </td>
                          <td className="py-3 px-3">
                            <span
                              className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                                DECISION_STYLES[s.session_2.decision] ?? DECISION_STYLES.PENDING
                              }`}
                            >
                              {DECISION_LABELS[s.session_2.decision] ?? s.session_2.decision_display}
                            </span>
                          </td>
                          <td className="py-3 px-5">
                            <select
                              value=""
                              onChange={(e) => {
                                if (e.target.value) decide(s, 1, e.target.value);
                              }}
                              className={`rounded-lg border px-2 py-1.5 text-xs ${
                                s.session_1.decision === 'PENDING' ? 'border-amber-300' : 'border-slate-200 text-slate-500'
                              }`}
                            >
                              <option value="">{s.session_1.decision === 'PENDING' ? 'Session 1…' : 'Re-délibérer S1'}</option>
                              {AVAILABLE_DECISIONS.map((d) => (
                                <option key={d} value={d}>
                                  {DECISION_LABELS[d] ?? d}
                                </option>
                              ))}
                            </select>
                            <span className="inline-block w-2" />
                            <select
                              value=""
                              onChange={(e) => {
                                if (e.target.value) decide(s, 2, e.target.value);
                              }}
                              className={`rounded-lg border px-2 py-1.5 text-xs ${
                                s.session_2.decision === 'PENDING' ? 'border-amber-300' : 'border-slate-200 text-slate-500'
                              }`}
                            >
                              <option value="">{s.session_2.decision === 'PENDING' ? 'Session 2…' : 'Re-délibérer S2'}</option>
                              {AVAILABLE_DECISIONS.map((d) => (
                                <option key={d} value={d}>
                                  {DECISION_LABELS[d] ?? d}
                                </option>
                              ))}
                            </select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {tab === 'releve' && (
            <div className="space-y-6">
              {transcript && (
                <div className="bg-white rounded-xl border border-slate-200 p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-bold text-slate-900">
                        {transcript.course.title}
                      </h3>
                      <p className="text-sm text-slate-500 mt-1">{transcript.course.subtitle}</p>
                      <p className="text-xs text-slate-400 mt-2">
                        Période : {transcript.course.start_date ?? '—'} → {transcript.course.end_date ?? '—'} ·{' '}
                        {transcript.course.credits} crédit(s) ECTS · {transcript.course.instructor_name}
                      </p>
                    </div>
                    <span className="px-2 py-1 rounded bg-indigo-50 text-indigo-700 text-xs font-semibold">
                      Relevé du {transcript.course.issued_at}
                    </span>
                  </div>

                  {transcript.rows.map((row) => (
                    <div key={row.enrollment_id} className="mt-6 rounded-xl border border-slate-200 overflow-hidden">
                      <div className="px-5 py-3 bg-slate-50 flex items-center justify-between">
                        <p className="font-semibold text-slate-800">
                          {typeof row.student === 'object' && 'full_name' in row.student ? (row.student as { full_name: string }).full_name : String(row.student)}
                        </p>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-slate-500">
                            Assiduité : {row.attendance_rate !== null ? `${row.attendance_rate}%` : '—'}
                            <span className="text-slate-400 ml-1">
                              ({row.attendance.present}P · {row.attendance.late}L · {row.attendance.absent}A · {row.attendance.excused}E)
                            </span>
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                              DECISION_STYLES[row.final.decision] ?? DECISION_STYLES.PENDING
                            }`}
                          >
                            {DECISION_LABELS[row.final.decision] ?? row.final.decision_display}
                          </span>
                          {row.credits_earned > 0 && (
                            <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[11px] font-semibold">
                              {row.credits_earned} crédit(s) acquis
                            </span>
                          )}
                        </div>
                      </div>
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-left text-xs text-slate-400 border-b border-slate-100">
                            <th className="py-2 px-5 font-medium">Évaluation</th>
                            <th className="py-2 px-3 font-medium">Coef</th>
                            <th className="py-2 px-3 font-medium">S1</th>
                            <th className="py-2 px-3 font-medium">S2 (rattrapage)</th>
                            <th className="py-2 px-5 font-medium">Crédits</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {row.evaluations.length === 0 && (
                            <tr>
                              <td colSpan={5} className="py-3 px-5 text-slate-400">Aucune évaluation.</td>
                            </tr>
                          )}
                          {Object.values(
                            row.evaluations.reduce<Record<string, typeof row.evaluations[number]>>((acc, ev) => {
                              acc[ev.id] = ev;
                              return acc;
                            }, {}),
                          ).map((ev) => {
                            const s1 = row.evaluations.find((e) => e.id === ev.id && e.attempt === 1);
                            const s2 = row.evaluations.find((e) => e.id === ev.id && e.attempt === 2);
                            return (
                              <tr key={`${ev.id}-${ev.attempt}`}>
                                <td className="py-2 px-5 text-slate-700">
                                  {ev.title}
                                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 font-semibold ml-1">
                                    {ev.kind}
                                  </span>
                                </td>
                                <td className="py-2 px-3 text-slate-500">{ev.coefficient}</td>
                                <td className="py-2 px-3 font-medium text-slate-700">
                                  {s1?.note !== null && s1?.note !== undefined ? s1.note : '—'}
                                </td>
                                <td className="py-2 px-3 font-medium text-slate-700">
                                  {s2?.note !== null && s2?.note !== undefined ? s2.note : '—'}
                                </td>
                                <td className="py-2 px-5 text-slate-500">—</td>
                              </tr>
                            );
                          })}
                          <tr className="bg-slate-50/60">
                            <td className="py-2 px-5 font-semibold text-slate-800">Moyenne {row.final.attempt === 2 ? 'session 2' : 'session 1'}</td>
                            <td className="py-2 px-3 text-slate-500">—</td>
                            <td className="py-2 px-3 font-bold text-indigo-700">
                              {row.session_1.average !== null ? row.session_1.average : '—'}
                            </td>
                            <td className="py-2 px-3 font-bold text-indigo-700">
                              {row.session_2.average !== null ? row.session_2.average : '—'}
                            </td>
                            <td className="py-2 px-5 font-semibold text-emerald-700">{row.credits_earned || '—'}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  ))}
                </div>
              )}
              {!transcript && (
                <div className="bg-white rounded-xl border border-slate-200 p-6 text-sm text-slate-400">
                  Chargement du relevé…
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}