import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, BookOpen, CheckCircle, ChevronDown, ChevronRight, Clock3, ExternalLink, FileLock2, FileText, FolderOpen, MessageSquare, PlayCircle, Save, Sparkles } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { aiService } from '../services/aiService';
import { courseService } from '../services/courseService';
import { getApiErrorMessage } from '../services/apiClient';
import { learningService, type QuizAttemptItem, type QuizItem } from '../services/learningService';
import type { Course, CourseLesson, NoteItem, ProgressItem } from '../types/lms';
import { useToast } from '../contexts/ToastContext';

type TutorMessage = {
  role: 'user' | 'ai';
  text: string;
};

function flattenLessons(course?: Course) {
  return (course?.modules || []).flatMap((module) =>
    (module.lessons || []).map((lesson) => ({
      ...lesson,
      moduleTitle: module.title,
      moduleId: module.id,
    })),
  );
}

export default function CoursePlayer() {
  const { courseId = '', lessonId } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [course, setCourse] = useState<Course | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [enrollmentId, setEnrollmentId] = useState<string>('');
  const [progressItems, setProgressItems] = useState<ProgressItem[]>([]);
  const [notes, setNotes] = useState<NoteItem[]>([]);
  const [quiz, setQuiz] = useState<QuizItem | null>(null);
  const [moduleQuizzes, setModuleQuizzes] = useState<Record<string, QuizItem | null>>({});
  const [quizAttemptsByQuiz, setQuizAttemptsByQuiz] = useState<Record<string, QuizAttemptItem[]>>({});
  const [activeLessonId, setActiveLessonId] = useState<string>(lessonId || '');
  const [activeTab, setActiveTab] = useState<'content' | 'notes' | 'resources' | 'tutor'>('content');
  const [noteDraft, setNoteDraft] = useState('');
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [isSavingProgress, setIsSavingProgress] = useState(false);
  const [tutorInput, setTutorInput] = useState('');
  const [tutorMessages, setTutorMessages] = useState<TutorMessage[]>([]);
  const [isTutorLoading, setIsTutorLoading] = useState(false);
  const [openModules, setOpenModules] = useState<Record<string, boolean>>({});
  const [hasCertificate, setHasCertificate] = useState(false);
  const [isClaimingCertificate, setIsClaimingCertificate] = useState(false);

  const lessons = useMemo(() => flattenLessons(course), [course]);
  const activeLesson = useMemo(
    () => lessons.find((lesson) => lesson.id === activeLessonId) || lessons[0] || null,
    [activeLessonId, lessons],
  );
  const orderedModules = useMemo(() => [...(course?.modules || [])].sort((left, right) => left.order - right.order), [course?.modules]);
  const activeModule = useMemo(
    () => orderedModules.find((module) => module.id === activeLesson?.moduleId) || null,
    [activeLesson?.moduleId, orderedModules],
  );
  const activeProgress = useMemo(
    () => progressItems.find((item) => item.lesson === activeLesson?.id) || null,
    [activeLesson?.id, progressItems],
  );
  const activeNote = useMemo(
    () => notes.find((item) => item.lesson === activeLesson?.id) || null,
    [activeLesson?.id, notes],
  );

  useEffect(() => {
    if (!courseId) return;
    async function load() {
      setIsLoading(true);
      try {
        const courseItem = await courseService.getCourse(courseId);
        const enrollments = await courseService.listEnrollments({ course: courseId, is_active: true });
        const enrollment = enrollments[0];
        if (!enrollment) {
          showToast('Enrollment required to access this course.', 'error');
          navigate('/catalog', { replace: true });
          return;
        }

        const [progress, allNotes] = await Promise.all([
          courseService.listProgress({ enrollment: enrollment.id }),
          courseService.listNotes(),
        ]);
        const certificates = await courseService.listCertificates({ course: courseId });
        const moduleQuizEntries = await Promise.all(
          (courseItem.modules || []).map(async (module) => {
            const quizzes = await learningService.listQuizzesByModule(module.id);
            return [module.id, quizzes[0] || null] as const;
          }),
        );
        const attemptsEntries = await Promise.all(
          moduleQuizEntries
            .filter(([, moduleQuiz]) => Boolean(moduleQuiz?.id))
            .map(async ([moduleKey, moduleQuiz]) => {
              const attempts = await learningService.listQuizAttempts({ quiz: moduleQuiz!.id });
              return [moduleKey, moduleQuiz!.id, attempts] as const;
            }),
        );

        setCourse(courseItem);
        setEnrollmentId(enrollment.id);
        setProgressItems(progress);
        setNotes(allNotes);
        setHasCertificate(certificates.length > 0);
        setModuleQuizzes(Object.fromEntries(moduleQuizEntries));
        setQuizAttemptsByQuiz(
          Object.fromEntries(attemptsEntries.map(([, quizId, attempts]) => [quizId, attempts])),
        );

        const nextLessonId = lessonId || flattenLessons(courseItem)[0]?.id || '';
        setActiveLessonId(nextLessonId);
      } catch {
        showToast('Impossible de charger ce cours.', 'error');
        navigate('/courses', { replace: true });
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, [courseId, lessonId, navigate, showToast]);

  useEffect(() => {
    if (!course || !lessons.length || lessonId) return;
    navigate(`/player/${course.id}/${lessons[0].id}`, { replace: true });
  }, [course, lessonId, lessons, navigate]);

  useEffect(() => {
    if (!activeLesson) return;
    setNoteDraft(activeNote?.content || '');
    learningService
      .listQuizzesByLesson(activeLesson.id)
      .then((items) => setQuiz(items[0] || null))
      .catch(() => setQuiz(null));
  }, [activeLesson, activeNote?.content]);

  const passedModuleQuizIds = useMemo(() => {
    const passed = new Set<string>();
    Object.entries(quizAttemptsByQuiz).forEach(([quizId, attempts]) => {
      if (attempts.some((attempt) => attempt.passed)) {
        passed.add(quizId);
      }
    });
    return passed;
  }, [quizAttemptsByQuiz]);

  const firstBlockedModule = useMemo(() => {
    for (const module of orderedModules) {
      if (!module.require_quiz_pass_to_continue) continue;
      const moduleQuiz = moduleQuizzes[module.id];
      if (!moduleQuiz?.id) continue;
      if (!passedModuleQuizIds.has(moduleQuiz.id)) {
        return module;
      }
    }
    return null;
  }, [moduleQuizzes, orderedModules, passedModuleQuizIds]);

  const blockedAfterModuleOrder = useMemo(() => {
    if (!firstBlockedModule) return null;
    return firstBlockedModule.order;
  }, [firstBlockedModule]);

  const currentModuleQuiz = activeModule ? moduleQuizzes[activeModule.id] || null : null;
  const currentModuleRequiresQuiz = Boolean(activeModule?.require_quiz_pass_to_continue && currentModuleQuiz?.id);
  const currentModuleQuizPassed = Boolean(currentModuleQuiz?.id && passedModuleQuizIds.has(currentModuleQuiz.id));

  function isLessonLocked(targetLessonId: string) {
    const targetLesson = lessons.find((lesson) => lesson.id === targetLessonId);
    if (!targetLesson || blockedAfterModuleOrder === null) return false;
    const targetModule = orderedModules.find((module) => module.id === targetLesson.moduleId);
    if (!targetModule) return false;
    return targetModule.order > blockedAfterModuleOrder;
  }

  useEffect(() => {
    if (!activeLesson || blockedAfterModuleOrder === null) return;
    const currentModuleOrder = orderedModules.find((module) => module.id === activeLesson.moduleId)?.order;
    if (!currentModuleOrder || currentModuleOrder <= blockedAfterModuleOrder) return;
    const fallbackLesson = orderedModules
      .filter((module) => module.order <= blockedAfterModuleOrder)
      .flatMap((module) => module.lessons || [])
      .sort((left, right) => left.order - right.order)
      .at(-1);
    if (fallbackLesson) {
      showToast('Passez le quiz requis du module precedent pour debloquer la section suivante.', 'error');
      setActiveLessonId(fallbackLesson.id);
      navigate(`/player/${course.id}/${fallbackLesson.id}`, { replace: true });
    }
  }, [activeLesson, blockedAfterModuleOrder, course?.id, navigate, orderedModules, showToast]);

  useEffect(() => {
    if (!course?.modules?.length) return;
    setOpenModules((prev) => {
      const next = { ...prev };
      for (const module of course.modules || []) {
        if (next[module.id] === undefined) {
          next[module.id] = module.id === activeLesson?.moduleId;
        }
      }
      if (activeLesson?.moduleId) {
        next[activeLesson.moduleId] = true;
      }
      return next;
    });
  }, [activeLesson?.moduleId, course?.modules]);

  const totalLessons = lessons.length;
  const completedLessons = progressItems.filter((item) => item.is_completed).length;
  const progressPercent = totalLessons ? Math.round((completedLessons / totalLessons) * 100) : 0;
  const isCourseCompleted = totalLessons > 0 && completedLessons >= totalLessons;

  async function saveProgress(completion: number, isCompleted: boolean) {
    if (!activeLesson || !enrollmentId) return;
    setIsSavingProgress(true);
    try {
      const updated = await courseService.upsertProgress(activeProgress?.id || null, {
        enrollment: enrollmentId,
        lesson: activeLesson.id,
        completion,
        is_completed: isCompleted,
        last_position_seconds: activeLesson.duration_seconds || 0,
      });
      setProgressItems((prev) => {
        const withoutCurrent = prev.filter((item) => item.lesson !== updated.lesson);
        return [...withoutCurrent, updated];
      });
      showToast(isCompleted ? 'Lesson marked as completed.' : 'Progress saved.', 'success');
    } catch {
      showToast('Impossible de sauvegarder la progression.', 'error');
    } finally {
      setIsSavingProgress(false);
    }
  }

  async function handleSaveNote() {
    if (!activeLesson) return;
    setIsSavingNote(true);
    try {
      const saved = activeNote
        ? await courseService.updateNote(activeNote.id, { content: noteDraft })
        : await courseService.createNote({ lesson: activeLesson.id, content: noteDraft });
      setNotes((prev) => [...prev.filter((item) => item.lesson !== saved.lesson), saved]);
      showToast('Note saved.', 'success');
    } catch {
      showToast('Impossible de sauvegarder la note.', 'error');
    } finally {
      setIsSavingNote(false);
    }
  }

  async function handleAskTutor() {
    if (!activeLesson || !tutorInput.trim()) return;
    const prompt = `Course: ${course?.title}\nModule: ${activeLesson.moduleTitle}\nLesson: ${activeLesson.title}\nContent:\n${activeLesson.content}\n\nStudent question: ${tutorInput.trim()}`;
    const question = tutorInput.trim();
    setTutorMessages((prev) => [...prev, { role: 'user', text: question }]);
    setTutorInput('');
    setIsTutorLoading(true);
    try {
      const response = await aiService.askTutor(prompt);
      setTutorMessages((prev) => [...prev, { role: 'ai', text: response }]);
    } catch {
      showToast('AI tutor unavailable right now.', 'error');
    } finally {
      setIsTutorLoading(false);
    }
  }

  async function handleClaimCertificate() {
    if (!course) return;
    setIsClaimingCertificate(true);
    try {
      await courseService.claimCertificate(course.id);
      setHasCertificate(true);
      showToast('Certificate unlocked.', 'success');
      navigate(`/certificate?course=${course.id}`);
    } catch (error) {
      showToast(getApiErrorMessage(error, 'Impossible de demander le certificat.'), 'error');
    } finally {
      setIsClaimingCertificate(false);
    }
  }

  if (isLoading) {
    return <div className="min-h-screen grid place-items-center text-slate-500">Loading course...</div>;
  }

  if (!course) {
    return <div className="min-h-screen grid place-items-center text-slate-500">Course unavailable.</div>;
  }

  if (!lessons.length) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900">
        <div className="mx-auto max-w-3xl px-6 py-20">
          <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm">
            <h1 className="text-3xl font-bold">{course.title}</h1>
            <p className="mt-4 text-slate-500">
              Ce cours ne contient pas encore de lecons publiees pour les etudiants.
            </p>
            <div className="mt-8 flex items-center justify-center gap-3">
              <Link to={`/course/${course.id}`} className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white hover:bg-blue-700">
                Retour au cours
              </Link>
              <Link to="/courses" className="rounded-xl bg-slate-100 px-5 py-3 text-sm font-bold text-slate-900 hover:bg-slate-200">
                Mes cours
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!activeLesson) {
    return <div className="min-h-screen grid place-items-center text-slate-500">Loading lesson...</div>;
  }

  return (
    <div className="min-h-screen bg-[#f6f7fb] text-slate-900">
      <header className="border-b border-slate-800 bg-[#17181f] px-4 py-4 text-white lg:px-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <Link to="/courses" className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 transition hover:bg-white/10">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <p className="text-lg font-semibold lg:text-2xl">{course.title}</p>
              <p className="mt-1 text-sm text-slate-300">{completedLessons}/{totalLessons} lessons completed</p>
            </div>
          </div>
          <div className="flex min-w-[220px] items-center gap-3">
            <div className="h-2 flex-1 rounded-full bg-white/10">
              <div className="h-2 rounded-full bg-blue-500" style={{ width: `${progressPercent}%` }} />
            </div>
            <span className="text-sm font-semibold text-slate-200">{progressPercent}%</span>
          </div>
        </div>
      </header>

      <div className="flex flex-col xl:flex-row">
        <main className="min-w-0 flex-1">
          <div className="border-b border-slate-200 bg-white px-5 py-5 lg:px-8">
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <span>{course.title}</span>
              <ChevronRight className="h-4 w-4" />
              <span>{activeLesson.moduleTitle}</span>
            </div>
            <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <h2 className="text-3xl font-black tracking-tight">{activeLesson.title}</h2>
                <p className="mt-2 inline-flex items-center gap-2 text-sm text-slate-500">
                  <Clock3 className="h-4 w-4" />
                  {Math.max(1, Math.round((activeLesson.duration_seconds || 0) / 60))} minutes
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                {currentModuleRequiresQuiz ? (
                  <Link
                    to={`/quiz/${currentModuleQuiz!.id}`}
                    className="rounded-2xl border border-amber-300 bg-amber-50 px-5 py-3 text-sm font-bold text-amber-900 hover:bg-amber-100"
                  >
                    {currentModuleQuizPassed ? 'Retake Module Quiz' : 'Pass Module Quiz to Unlock Next Section'}
                  </Link>
                ) : null}
                {isCourseCompleted ? (
                  hasCertificate ? (
                    <Link to={`/certificate?course=${course.id}`} className="rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white hover:bg-emerald-700">
                      View Certificate
                    </Link>
                  ) : (
                    <button
                      onClick={handleClaimCertificate}
                      disabled={isClaimingCertificate}
                      className="rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-60"
                    >
                      {isClaimingCertificate ? 'Preparing...' : 'Request Certificate'}
                    </button>
                  )
                ) : null}
                {quiz && (
                  <Link to={`/quiz/${quiz.id}`} className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-bold text-white hover:bg-slate-800">
                    Take Quiz
                  </Link>
                )}
                <button
                  onClick={() => saveProgress(100, true)}
                  disabled={isSavingProgress}
                  className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-60"
                >
                  {isSavingProgress ? 'Saving...' : 'Mark Complete'}
                </button>
              </div>
            </div>
          </div>

          <div className="px-5 py-6 lg:px-8">
          <div className="mb-6 flex gap-3 border-b border-slate-200">
            {[
              ['content', 'Lesson'],
              ['notes', 'Notes'],
              ['resources', 'Resources'],
              ['tutor', 'AI Tutor'],
            ].map(([key, label]) => (
              <button
                key={key}
                onClick={() => setActiveTab(key as typeof activeTab)}
                className={`border-b-2 px-4 py-3 text-sm font-bold ${activeTab === key ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500'}`}
              >
                {label}
              </button>
            ))}
          </div>

          {activeTab === 'content' && (
            <section className="overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 bg-[radial-gradient(circle_at_top_left,_rgba(37,99,235,0.18),_transparent_35%),linear-gradient(135deg,#0f172a_0%,#111827_45%,#1e293b_100%)] px-5 py-5 text-white lg:px-8 lg:py-6">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.3em] text-blue-200">Now Learning</p>
                    <h3 className="mt-3 text-2xl font-black tracking-tight lg:text-3xl">{activeLesson.title}</h3>
                    <p className="mt-2 max-w-2xl text-sm text-slate-300">
                      {activeLesson.moduleTitle} • {activeLesson.lesson_type || 'VIDEO'} lesson
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-2 text-xs font-semibold text-white">
                      <Clock3 className="h-4 w-4 text-blue-200" />
                      {Math.max(1, Math.round((activeLesson.duration_seconds || 0) / 60))} min
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-5 lg:p-8">
              {activeLesson.video ? (
                <div className="mb-8 rounded-[28px] border border-slate-200 bg-slate-950 p-2 shadow-[0_24px_60px_rgba(15,23,42,0.22)] lg:p-3">
                  <div className="relative overflow-hidden rounded-[22px] bg-[linear-gradient(145deg,#020617_0%,#111827_55%,#1e293b_100%)]">
                    <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-center justify-between px-4 py-3">
                      <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/30 px-3 py-1 text-xs font-semibold text-white backdrop-blur">
                        <PlayCircle className="h-4 w-4 text-blue-300" />
                        Lesson video
                      </div>
                      <div className="rounded-full border border-white/10 bg-black/30 px-3 py-1 text-xs font-semibold text-slate-200 backdrop-blur">
                        {activeLesson.moduleTitle}
                      </div>
                    </div>
                    <div className="mx-auto aspect-video w-full max-w-6xl">
                      <video src={activeLesson.video} controls className="h-full w-full object-contain bg-transparent" />
                    </div>
                  </div>
                </div>
              ) : activeLesson.video_url ? (
                <a
                  href={activeLesson.video_url}
                  target="_blank"
                  rel="noreferrer"
                  className="mb-8 block rounded-[28px] border border-slate-200 bg-[linear-gradient(135deg,#eff6ff_0%,#ffffff_45%,#eef2ff_100%)] p-6 transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-lg"
                >
                  <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                    <div className="max-w-2xl">
                      <p className="text-xs font-bold uppercase tracking-[0.28em] text-blue-600">External video</p>
                      <h4 className="mt-3 text-2xl font-black tracking-tight text-slate-900">Open the hosted lesson player</h4>
                      <p className="mt-2 text-sm leading-6 text-slate-600">
                        Cette lesson utilise une video externe. Ouvre la ressource dans un nouvel onglet pour garder une experience propre.
                      </p>
                    </div>
                    <span className="inline-flex items-center gap-2 self-start rounded-2xl bg-slate-900 px-4 py-3 text-sm font-bold text-white lg:self-auto">
                      Open video
                      <ExternalLink className="h-4 w-4" />
                    </span>
                  </div>
                </a>
              ) : (
                <div className="mb-8 rounded-[28px] border border-dashed border-slate-300 bg-[linear-gradient(135deg,#f8fafc_0%,#eef2ff_100%)] p-8">
                  <div className="flex flex-col items-start gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.28em] text-slate-500">Lesson format</p>
                      <h4 className="mt-3 text-2xl font-black tracking-tight text-slate-900">Text-first learning block</h4>
                      <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                        Cette lesson ne contient pas de video jointe. Le contenu principal est disponible juste en dessous avec les ressources associees.
                      </p>
                    </div>
                    <span className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700">
                      <FileText className="h-4 w-4" />
                      Reading lesson
                    </span>
                  </div>
                </div>
              )}

              <div className="mb-6 grid gap-3 lg:grid-cols-3">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Type</p>
                  <p className="mt-2 text-lg font-bold text-slate-900">{activeLesson.lesson_type || 'VIDEO'}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Duration</p>
                  <p className="mt-2 text-lg font-bold text-slate-900">{Math.max(1, Math.round((activeLesson.duration_seconds || 0) / 60))} minutes</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Resources</p>
                  <p className="mt-2 text-lg font-bold text-slate-900">{(activeLesson.resources || []).length}</p>
                </div>
              </div>

              <div className="rounded-[28px] border border-slate-200 bg-white p-6 lg:p-8">
                <div className="mb-5 flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.24em] text-blue-600">Overview</p>
                    <h4 className="mt-2 text-2xl font-black tracking-tight text-slate-900">Lesson content</h4>
                  </div>
                </div>
                <div className="prose max-w-none text-slate-700 prose-headings:font-black prose-headings:text-slate-900 prose-p:leading-7">
                  <div dangerouslySetInnerHTML={{ __html: activeLesson.content || '<p>Lesson content is coming soon.</p>' }} />
                </div>
              </div>
              </div>
            </section>
          )}

          {activeTab === 'notes' && (
            <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h3 className="text-xl font-bold">Lesson Notes</h3>
                  <p className="mt-1 text-sm text-slate-500">Your private notes are saved per lesson.</p>
                </div>
                <button
                  onClick={handleSaveNote}
                  disabled={isSavingNote}
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-60"
                >
                  <Save className="h-4 w-4" />
                  {isSavingNote ? 'Saving...' : 'Save Note'}
                </button>
              </div>
              <textarea
                value={noteDraft}
                onChange={(event) => setNoteDraft(event.target.value)}
                placeholder="Write what matters for you in this lesson..."
                className="mt-6 min-h-[320px] w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </section>
          )}

          {activeTab === 'resources' && (
            <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
              <h3 className="text-xl font-bold">Resources</h3>
              <div className="mt-6 space-y-4">
                {(activeLesson.resources || []).length === 0 && <p className="text-sm text-slate-500">No resources attached to this lesson yet.</p>}
                {(activeLesson.resources || []).map((resource) => (
                  <a
                    key={resource.id}
                    href={resource.file_download_url || resource.file_url || '#'}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-start gap-3 rounded-2xl border border-slate-200 p-4 hover:border-blue-300 hover:bg-blue-50"
                  >
                    <FileText className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />
                    <div>
                      <p className="font-semibold text-slate-900">{resource.title}</p>
                      <p className="mt-1 text-sm text-slate-500">{resource.description || resource.kind}</p>
                    </div>
                  </a>
                ))}
              </div>
            </section>
          )}

          {activeTab === 'tutor' && (
            <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
              <div className="flex items-center gap-3">
                <MessageSquare className="h-5 w-5 text-blue-600" />
                <div>
                  <h3 className="text-xl font-bold">AI Tutor</h3>
                  <p className="text-sm text-slate-500">Ask questions about the active lesson and get contextual help.</p>
                </div>
              </div>
              <div className="mt-6 space-y-4">
                {tutorMessages.map((message, index) => (
                  <div key={`${message.role}-${index}`} className={`rounded-2xl p-4 text-sm ${message.role === 'ai' ? 'bg-blue-50 text-slate-800' : 'bg-slate-100 text-slate-900'}`}>
                    <p className="mb-1 text-xs font-bold uppercase tracking-wide text-slate-400">{message.role === 'ai' ? 'AI Tutor' : 'You'}</p>
                    <p>{message.text}</p>
                  </div>
                ))}
                {isTutorLoading && <div className="rounded-2xl bg-blue-50 p-4 text-sm text-slate-700">Thinking...</div>}
              </div>
              <div className="mt-6 flex gap-3">
                <input
                  value={tutorInput}
                  onChange={(event) => setTutorInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && !event.shiftKey) {
                      event.preventDefault();
                      handleAskTutor();
                    }
                  }}
                  placeholder="Ask a question about this lesson..."
                  className="flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button onClick={handleAskTutor} disabled={isTutorLoading || !tutorInput.trim()} className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-60">
                  Ask
                </button>
              </div>
            </section>
          )}
          </div>
        </main>

        <aside className="w-full border-t border-slate-200 bg-white xl:sticky xl:top-0 xl:h-[calc(100vh-73px)] xl:w-[390px] xl:overflow-y-auto xl:border-l xl:border-t-0">
          <div className="border-b border-slate-200 px-5 py-5">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-2xl font-black tracking-tight">Course content</h3>
              <BookOpen className="h-5 w-5 text-slate-400" />
            </div>
          </div>

          <div className="space-y-3 p-4">
            {(course.modules || []).map((module, moduleIndex) => {
              const moduleLessons = module.lessons || [];
              const completedInModule = moduleLessons.filter((lesson) => progressItems.find((item) => item.lesson === lesson.id)?.is_completed).length;
              const moduleMinutes = moduleLessons.reduce((total, lesson) => total + Math.max(1, Math.round((lesson.duration_seconds || 0) / 60)), 0);
              const isOpen = openModules[module.id] ?? false;

              return (
                <div key={module.id} className="overflow-hidden rounded-[24px] border border-slate-200 bg-slate-50">
                  <button
                    type="button"
                    onClick={() => setOpenModules((prev) => ({ ...prev, [module.id]: !isOpen }))}
                    className="flex w-full items-start justify-between gap-3 px-5 py-5 text-left"
                  >
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Section {moduleIndex + 1}</p>
                      <p className="mt-2 text-2xl font-black leading-tight">{module.title}</p>
                      <p className="mt-3 text-sm text-slate-500">
                        {completedInModule} / {moduleLessons.length} | {moduleMinutes}min
                      </p>
                    </div>
                    <ChevronDown className={`mt-1 h-5 w-5 shrink-0 text-slate-400 transition ${isOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {isOpen ? (
                    <div className="border-t border-slate-200 bg-white">
                      {moduleLessons.map((lesson, lessonIndex) => {
                        const lessonProgress = progressItems.find((item) => item.lesson === lesson.id);
                        const isActive = activeLesson.id === lesson.id;
                        const hasResources = (lesson.resources || []).length > 0;
                        const locked = isLessonLocked(lesson.id);

                        return (
                          <button
                            key={lesson.id}
                            onClick={() => {
                              if (locked) {
                                showToast('Passez le quiz requis du module precedent pour ouvrir cette section.', 'error');
                                return;
                              }
                              setActiveLessonId(lesson.id);
                              navigate(`/player/${course.id}/${lesson.id}`, { replace: true });
                            }}
                            className={`w-full border-b border-slate-100 px-5 py-5 text-left last:border-b-0 ${
                              locked ? 'cursor-not-allowed bg-slate-50/80 opacity-70' : isActive ? 'bg-indigo-50' : 'hover:bg-slate-50'
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              {locked ? (
                                <FileLock2 className="mt-1 h-6 w-6 shrink-0 text-amber-500" />
                              ) : lessonProgress?.is_completed ? (
                                <CheckCircle className="mt-1 h-6 w-6 shrink-0 text-green-500" />
                              ) : (
                                <div className="mt-1 h-6 w-6 rounded-md border-2 border-slate-400" />
                              )}
                              <div className="min-w-0 flex-1">
                                <p className="text-sm text-slate-500">{lessonIndex + 1}. {lesson.title}</p>
                                <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-slate-500">
                                  <span className="inline-flex items-center gap-2">
                                    <PlayCircle className="h-4 w-4" />
                                    {Math.max(1, Math.round((lesson.duration_seconds || 0) / 60))}min
                                  </span>
                                  {locked ? (
                                    <span className="inline-flex items-center gap-2 rounded-full border border-amber-300 px-3 py-1 font-medium text-amber-700">
                                      <FileLock2 className="h-4 w-4" />
                                      Quiz required
                                    </span>
                                  ) : null}
                                  {hasResources ? (
                                    <span className="inline-flex items-center gap-2 rounded-full border border-violet-300 px-3 py-1 font-medium text-violet-600">
                                      <FolderOpen className="h-4 w-4" />
                                      Resources
                                    </span>
                                  ) : null}
                                </div>
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </aside>
      </div>
    </div>
  );
}
