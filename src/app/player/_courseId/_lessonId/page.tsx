import { Skeleton } from "../../../../components/ui/skeleton";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  Award,
  BookOpen,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  Clock3,
  Download,
  ExternalLink,
  FileLock2,
  FileText,
  FolderOpen,
  HelpCircle,
  Loader2,
  MessageSquare,
  PenLine,
  PlayCircle,
  Plus,
  Radio,
  Save,
  Sparkles,
  Trash2,
} from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { aiService, type ConversationItem } from "../../../../services/aiService";
import { courseService } from "../../../../services/courseService";
import { getApiErrorMessage } from "../../../../services/apiClient";
import {
  learningService,
  type QuizAttemptItem,
  type QuizItem,
} from "../../../../services/learningService";
import MarkdownRenderer from "../../../../components/MarkdownRenderer";
import Sidebar from "../../../../components/Sidebar";
import Header from "../../../../components/Header";
import type {
  ContentBlock,
  Course,
  CourseLesson,
  NoteItem,
  ProgressItem,
} from "../../../../types/lms";
import { useToast } from "../../../../contexts/ToastContext";

interface Usage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

type TutorMessage = {
  role: "user" | "ai";
  text: string;
  usage?: Usage;
};

function lessonConvTitle(lesson?: { title: string; moduleTitle?: string }) {
  return lesson ? `Lesson: ${lesson.moduleTitle ? `${lesson.moduleTitle} - ` : ''}${lesson.title}` : 'Player Tutor';
}

function renderContentBlocks(blocks: ContentBlock[]) {
  return blocks
    .sort((a, b) => a.order - b.order)
    .map((block) => {
      switch (block.kind) {
        case "MARKDOWN":
          return (
            <MarkdownRenderer
              key={block.id}
              content={block.data.markdown || ""}
              className="mb-6"
            />
          );
        case "TEXT":
          return (
            <p key={block.id} className="mb-3 leading-relaxed">
              {block.data.text || block.data.content || ""}
            </p>
          );
        case "VIDEO":
          return (
            <div
              key={block.id}
              className="mb-6 rounded-2xl overflow-hidden bg-slate-950"
            >
              <video
                src={block.data.url}
                controls
                className="w-full aspect-video"
              />
              {block.data.caption && (
                <p className="p-3 text-sm text-slate-400">
                  {block.data.caption}
                </p>
              )}
            </div>
          );
        case "CODE":
          return (
            <pre
              key={block.id}
              className="mb-6 rounded-xl bg-slate-900 p-4 overflow-x-auto text-sm text-slate-100"
            >
              <code>{block.data.code || ""}</code>
            </pre>
          );
        case "IMAGE":
          return (
            <img
              key={block.id}
              src={block.data.url}
              alt={block.data.alt || ""}
              className="mb-6 rounded-2xl"
            />
          );
        case "EMBED":
          return (
            <div
              key={block.id}
              className="mb-6 aspect-video rounded-2xl overflow-hidden"
              dangerouslySetInnerHTML={{ __html: block.data.html || "" }}
            />
          );
        case "FILE":
          return (
            <a
              key={block.id}
              href={block.data.url}
              target="_blank"
              rel="noreferrer"
              className="mb-3 flex items-center gap-3 rounded-xl border border-slate-200 p-4 transition hover:border-blue-300 hover:bg-blue-50/50 dark:border-slate-700 dark:hover:bg-slate-900"
            >
              <FileText className="h-5 w-5 text-blue-600" />
              <span className="font-semibold">
                {block.data.title || "Download"}
              </span>
            </a>
          );
        case "QUIZ":
          return (
            <div
              key={block.id}
              className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-6 dark:border-amber-500/30 dark:bg-amber-500/10"
            >
              <p className="font-bold text-amber-800 dark:text-amber-200">
                {block.data.question || "Quiz"}
              </p>
              {Array.isArray(block.data.options) &&
                block.data.options.map((opt: string, i: number) => (
                  <label
                    key={i}
                    className="mt-2 flex items-center gap-2 text-sm"
                  >
                    <input
                      type="radio"
                      name={block.id}
                      className="accent-amber-600"
                    />{" "}
                    {opt}
                  </label>
                ))}
            </div>
          );
        default:
          return null;
      }
    });
}

function flattenLessons(course?: Course) {
  return (course?.modules || []).flatMap((module) =>
    (module.lessons || []).map((lesson) => ({
      ...lesson,
      moduleTitle: module.title,
      moduleId: module.id,
    })),
  );
}

const TABS: {
  key: "content" | "notes" | "resources" | "tutor";
  label: string;
  icon: typeof FileText;
}[] = [
  { key: "content", label: "Lesson", icon: PlayCircle },
  { key: "notes", label: "Notes", icon: PenLine },
  { key: "resources", label: "Resources", icon: FolderOpen },
  { key: "tutor", label: "AI Tutor", icon: Sparkles },
];

export default function CoursePlayer() {
  const { courseId = "", lessonId } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [course, setCourse] = useState<Course | null>(null);
  const [enrollmentId, setEnrollmentId] = useState<string>("");
  const [progressItems, setProgressItems] = useState<ProgressItem[]>([]);
  const [notes, setNotes] = useState<NoteItem[]>([]);
  const [quiz, setQuiz] = useState<QuizItem | null>(null);
  const [moduleQuizzes, setModuleQuizzes] = useState<
    Record<string, QuizItem | null>
  >({});
  const [quizAttemptsByQuiz, setQuizAttemptsByQuiz] = useState<
    Record<string, QuizAttemptItem[]>
  >({});
  const [activeLessonId, setActiveLessonId] = useState<string>(lessonId || "");
  useEffect(() => { setActiveLessonId(lessonId || ""); }, [lessonId]);
  const [activeTab, setActiveTab] = useState<
    "content" | "notes" | "resources" | "tutor"
  >("content");
  const [noteDraft, setNoteDraft] = useState("");
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [isSavingProgress, setIsSavingProgress] = useState(false);
  const [tutorInput, setTutorInput] = useState("");
  const [tutorMessages, setTutorMessages] = useState<TutorMessage[]>([]);
  const [isTutorLoading, setIsTutorLoading] = useState(false);
  const [tutorConvId, setTutorConvId] = useState<string | null>(null);
  const tutorMessagesEndRef = useRef<HTMLDivElement>(null);
  const [tutorConversations, setTutorConversations] = useState<ConversationItem[]>([]);
  const [showTutorConvList, setShowTutorConvList] = useState(false);
  const [tutorTotalTokens, setTutorTotalTokens] = useState(0);
  const [openModules, setOpenModules] = useState<Record<string, boolean>>({});
  const [hasCertificate, setHasCertificate] = useState(false);
  const [isClaimingCertificate, setIsClaimingCertificate] = useState(false);

  const lessons = useMemo(() => flattenLessons(course), [course]);
  const activeLesson = useMemo(
    () =>
      lessons.find((lesson) => lesson.id === activeLessonId) ||
      lessons[0] ||
      null,
    [activeLessonId, lessons],
  );
  const orderedModules = useMemo(
    () =>
      [...(course?.modules || [])].sort(
        (left, right) => left.order - right.order,
      ),
    [course?.modules],
  );
  const activeModule = useMemo(
    () =>
      orderedModules.find((module) => module.id === activeLesson?.moduleId) ||
      null,
    [activeLesson?.moduleId, orderedModules],
  );
  const activeProgress = useMemo(
    () =>
      progressItems.find((item) => String(item.lesson) === String(activeLesson?.id)) || null,
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
        const enrollments = await courseService.listEnrollments({
          course: courseId,
          is_active: true,
        });
        const enrollment = enrollments[0];
        if (!enrollment) {
          showToast("Enrollment required to access this course.", "error");
          navigate("/catalog", { replace: true });
          return;
        }

        const [progress, allNotes] = await Promise.all([
          courseService.listProgress({ enrollment: enrollment.id }),
          courseService.listNotes(),
        ]);
        const certificates = await courseService.listCertificates({
          course: courseId,
        });
        const moduleQuizEntries = await Promise.all(
          (courseItem.modules || []).map(async (module) => {
            const quizzes = await learningService.listQuizzesByModule(
              module.id,
            );
            return [module.id, quizzes[0] || null] as const;
          }),
        );
        const attemptsEntries = await Promise.all(
          moduleQuizEntries
            .filter(([, moduleQuiz]) => Boolean(moduleQuiz?.id))
            .map(async ([moduleKey, moduleQuiz]) => {
              const attempts = await learningService.listQuizAttempts({
                quiz: moduleQuiz!.id,
              });
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
          Object.fromEntries(
            attemptsEntries.map(([, quizId, attempts]) => [quizId, attempts]),
          ),
        );

        const firstLessonId =
          flattenLessons(courseItem)[0]?.id || "";
        if (lessonId) {
          setActiveLessonId(lessonId);
        } else {
          navigate(`/player/${courseId}/${firstLessonId}`, { replace: true });
        }
      } catch {
        showToast("Impossible de charger ce cours.", "error");
        navigate("/courses", { replace: true });
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, [courseId, navigate, showToast]);

  useEffect(() => {
    if (!activeLesson) return;
    setNoteDraft(activeNote?.content || "");
    learningService
      .listQuizzesByLesson(activeLesson.id)
      .then((items) => {
        const found = items[0] || null;
        setQuiz(found);
        if (found) {
          learningService
            .listQuizAttempts({ quiz: found.id })
            .then((attempts) =>
              setQuizAttemptsByQuiz((prev) => ({ ...prev, [found!.id]: attempts })),
            )
            .catch(() => {});
        }
      })
      .catch(() => setQuiz(null));
  }, [activeLesson, activeNote?.content]);

  const passedModuleQuizIds = useMemo(() => {
    const passed = new Set<string>();
    Object.entries(quizAttemptsByQuiz).forEach(
      ([quizId, attempts]: [string, QuizAttemptItem[]]) => {
        if (attempts.some((attempt) => attempt.passed)) {
          passed.add(quizId);
        }
      },
    );
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

  const currentModuleQuiz = activeModule
    ? moduleQuizzes[activeModule.id] || null
    : null;
  const currentModuleRequiresQuiz = Boolean(
    activeModule?.require_quiz_pass_to_continue && currentModuleQuiz?.id,
  );
  const currentModuleQuizPassed = Boolean(
    currentModuleQuiz?.id && passedModuleQuizIds.has(currentModuleQuiz.id),
  );

  function isLessonLocked(targetLessonId: string) {
    const targetLesson = lessons.find((lesson) => lesson.id === targetLessonId);
    if (!targetLesson || blockedAfterModuleOrder === null) return false;
    const targetModule = orderedModules.find(
      (module) => module.id === targetLesson.moduleId,
    );
    if (!targetModule) return false;
    return targetModule.order > blockedAfterModuleOrder;
  }

  useEffect(() => {
    if (!activeLesson || blockedAfterModuleOrder === null) return;
    const currentModuleOrder = orderedModules.find(
      (module) => module.id === activeLesson.moduleId,
    )?.order;
    if (!currentModuleOrder || currentModuleOrder <= blockedAfterModuleOrder)
      return;
    const fallbackLesson = orderedModules
      .filter((module) => module.order <= blockedAfterModuleOrder)
      .flatMap((module) => module.lessons || [])
      .sort((left, right) => left.order - right.order)
      .at(-1);
    if (fallbackLesson) {
      showToast(
        "Passez le quiz requis du module precedent pour debloquer la section suivante.",
        "error",
      );
      setActiveLessonId(fallbackLesson.id);
      navigate(`/player/${course.id}/${fallbackLesson.id}`, { replace: true });
    }
  }, [
    activeLesson,
    blockedAfterModuleOrder,
    course?.id,
    navigate,
    orderedModules,
    showToast,
  ]);

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
  const completedLessons = progressItems.filter(
    (item) => item.is_completed,
  ).length;
  const progressPercent = totalLessons
    ? Math.round((completedLessons / totalLessons) * 100)
    : 0;
  const isCourseCompleted =
    totalLessons > 0 && completedLessons >= totalLessons;

  async function saveProgress(completion: number, isCompleted: boolean) {
    if (!activeLesson || !enrollmentId) return;
    setIsSavingProgress(true);
    try {
      const updated = await courseService.upsertProgress(
        activeProgress?.id || null,
        {
          enrollment: enrollmentId,
          lesson: activeLesson.id,
          completion,
          is_completed: isCompleted,
          last_position_seconds: activeLesson.duration_seconds || 0,
        },
      );
      setProgressItems((prev) => {
        const lessonId = String(updated.lesson);
        const withoutCurrent = prev.filter(
          (item) => String(item.lesson) !== lessonId,
        );
        return [...withoutCurrent, updated];
      });
      showToast(
        isCompleted ? "Lesson marquée comme terminée." : "Progression sauvegardée.",
        "success",
      );
    } catch (err) {
      console.error("saveProgress error:", err);
      showToast("Impossible de sauvegarder la progression.", "error");
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
        : await courseService.createNote({
            lesson: activeLesson.id,
            content: noteDraft,
          });
      setNotes((prev) => [
        ...prev.filter((item) => item.lesson !== saved.lesson),
        saved,
      ]);
      showToast("Note saved.", "success");
    } catch {
      showToast("Impossible de sauvegarder la note.", "error");
    } finally {
      setIsSavingNote(false);
    }
  }

  useEffect(() => {
    if (!activeLesson) return;
    const title = lessonConvTitle(activeLesson);
    aiService.listConversations().then((list) => {
      setTutorConversations(list);
      setTutorConvId(null);
      setTutorMessages([]);
      setTutorTotalTokens(0);
    }).catch(() => {});
  }, [activeLesson?.id]);

  async function loadTutorMessages(convId: string) {
    try {
      const items = await aiService.listMessages(convId);
      const msgs: TutorMessage[] = [];
      let tokens = 0;
      for (const item of items) {
        msgs.push({ role: "user", text: item.prompt });
        msgs.push({ role: "ai", text: item.response });
      }
      setTutorMessages(msgs);
      setTutorTotalTokens(tokens);
    } catch {
      setTutorMessages([]);
    }
  }

  useEffect(() => {
    tutorMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [tutorMessages]);

  async function handleNewTutorConv() {
    if (!activeLesson) return;
    try {
      const conv = await aiService.createConversation(lessonConvTitle(activeLesson));
      setTutorConversations((prev) => [conv, ...prev]);
      setTutorConvId(conv.id);
      setTutorMessages([]);
      setTutorTotalTokens(0);
      setShowTutorConvList(false);
    } catch {
      showToast('Erreur creation conversation.', 'error');
    }
  }

  async function handleDeleteTutorConv(id: string) {
    try {
      await aiService.deleteConversation(id);
      const updated = tutorConversations.filter((c) => c.id !== id);
      setTutorConversations(updated);
      if (tutorConvId === id) {
        if (updated.length > 0) {
          setTutorConvId(updated[0].id);
          loadTutorMessages(updated[0].id);
        } else {
          const conv = await aiService.createConversation(lessonConvTitle(activeLesson));
          setTutorConversations([conv]);
          setTutorConvId(conv.id);
          setTutorMessages([]);
          setTutorTotalTokens(0);
        }
      }
    } catch {
      showToast('Erreur suppression.', 'error');
    }
  }

  async function handleAskTutor() {
    if (!activeLesson || !tutorInput.trim()) return;
    let convId = tutorConvId;
    if (!convId) {
      try {
        const conv = await aiService.createConversation(lessonConvTitle(activeLesson));
        setTutorConversations((prev) => [conv, ...prev]);
        setTutorConvId(conv.id);
        convId = conv.id;
      } catch {
        showToast('Erreur creation conversation.', 'error');
        return;
      }
    }
    const prompt = `Course: ${course?.title}\nModule: ${activeLesson.moduleTitle}\nLesson: ${activeLesson.title}\nContent:\n${activeLesson.content}\n\nStudent question: ${tutorInput.trim()}`;
    const question = tutorInput.trim();
    setTutorMessages((prev) => [...prev, { role: "user", text: question }]);
    setTutorInput("");
    setIsTutorLoading(true);
    try {
      const result = await aiService.askTutor(prompt, convId);
      const usage = result.usage;
      if (usage?.total_tokens) setTutorTotalTokens((prev) => prev + usage.total_tokens);
      setTutorMessages((prev) => [...prev, { role: "ai", text: result.response, usage }]);
    } catch {
      showToast("AI tutor unavailable right now.", "error");
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
      showToast("Certificate unlocked.", "success");
      navigate(`/certificate?course=${course.id}`);
    } catch (error) {
      showToast(
        getApiErrorMessage(error, "Impossible de demander le certificat."),
        "error",
      );
    } finally {
      setIsClaimingCertificate(false);
    }
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <main className="flex-1 ml-64">
        <Header />
        <div className="bg-[#f6f7fb] text-slate-900 dark:bg-slate-950 dark:text-slate-100">
          {isLoading ? (<>
            <header className="border-b border-slate-800 bg-[#17181f] px-4 py-4 text-white lg:px-8">
              <div className="flex items-center gap-4">
                <Skeleton className="h-10 w-10 rounded-full bg-white/10" />
                <div className="space-y-2">
                  <Skeleton className="h-5 w-48 bg-white/10" />
                  <Skeleton className="h-3 w-32 bg-white/10" />
                </div>
              </div>
            </header>
            <div className="flex flex-col xl:flex-row">
              <main className="min-w-0 flex-1">
                <div className="border-b border-slate-200 bg-white px-5 py-5 lg:px-8 dark:border-slate-800 dark:bg-slate-900">
                  <Skeleton className="mb-4 h-3 w-64" />
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-2">
                      <Skeleton className="h-7 w-72" />
                      <Skeleton className="h-4 w-24" />
                    </div>
                    <div className="flex gap-2">
                      <Skeleton className="h-10 w-28 rounded-2xl" />
                      <Skeleton className="h-10 w-28 rounded-2xl" />
                    </div>
                  </div>
                </div>
                <div className="px-5 py-6 lg:px-8">
                  <Skeleton className="mb-6 h-10 w-80 rounded-2xl" />
                  <section className="overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
                    <div className="border-b border-slate-200 bg-[radial-gradient(circle_at_top_left,_rgba(37,99,235,0.18),_transparent_35%),linear-gradient(135deg,#0f172a_0%,#111827_45%,#1e293b_100%)] px-5 py-5 lg:px-8 lg:py-6">
                      <div className="space-y-3">
                        <Skeleton className="h-3 w-24 bg-white/20" />
                        <Skeleton className="h-8 w-64 bg-white/20" />
                        <Skeleton className="h-4 w-48 bg-white/20" />
                      </div>
                    </div>
                    <div className="space-y-6 p-5 lg:p-8">
                      <Skeleton className="aspect-video rounded-[28px]" />
                      <div className="grid gap-3 lg:grid-cols-3">
                        {[0, 1, 2].map((i) => (
                          <Skeleton key={i} className="h-20 rounded-2xl" />
                        ))}
                      </div>
                      <div className="space-y-3">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-4 w-5/6" />
                      </div>
                    </div>
                  </section>
                </div>
              </main>
              <aside className="w-full border-t xl:w-[390px] xl:border-l xl:border-t-0">
                <div className="border-b border-slate-200 p-4">
                  <Skeleton className="h-5 w-40" />
                </div>
                <div className="space-y-3 p-4">
                  {[0, 1, 2].map((i) => (
                    <Skeleton key={i} className="h-28 rounded-[24px]" />
                  ))}
                </div>
              </aside>
            </div>
          </>) : !course ? (
            <div className="flex items-center justify-center py-32 text-slate-500">
              Course unavailable.
            </div>
          ) : !lessons.length ? (
            <div className="mx-auto max-w-3xl px-6 py-20">
              <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 dark:bg-blue-500/10">
                  <BookOpen className="h-6 w-6 text-blue-600" />
                </div>
                <h1 className="text-3xl font-bold">{course.title}</h1>
                <p className="mt-4 text-slate-500 dark:text-slate-400">
                  Ce cours ne contient pas encore de lecons publiees pour les etudiants.
                </p>
                <div className="mt-8 flex items-center justify-center gap-3">
                  <Link to={`/course/${course.id}`} className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-blue-700">
                    Retour au cours
                  </Link>
                  <Link to="/courses" className="rounded-xl bg-slate-100 px-5 py-3 text-sm font-bold text-slate-900 transition hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700">
                    Mes cours
                  </Link>
                </div>
              </div>
            </div>
          ) : !activeLesson ? (<>
            <header className="border-b border-slate-800 bg-[#17181f] px-4 py-4 text-white lg:px-8">
              <div className="flex items-center gap-4">
                <Skeleton className="h-10 w-10 rounded-full bg-white/10" />
                <div className="space-y-2">
                  <Skeleton className="h-5 w-48 bg-white/10" />
                  <Skeleton className="h-3 w-32 bg-white/10" />
                </div>
              </div>
            </header>
            <div className="flex flex-col xl:flex-row">
              <main className="min-w-0 flex-1">
                <div className="px-5 py-6 lg:px-8">
                  <section className="overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
                    <div className="space-y-6 p-5 lg:p-8">
                      <Skeleton className="aspect-video rounded-[28px]" />
                      <div className="grid gap-3 lg:grid-cols-3">
                        {[0, 1, 2].map((i) => (
                          <Skeleton key={i} className="h-20 rounded-2xl" />
                        ))}
                      </div>
                      <div className="space-y-3">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-4 w-5/6" />
                      </div>
                    </div>
                  </section>
                </div>
              </main>
              <aside className="w-full border-t xl:w-[390px] xl:border-l xl:border-t-0">
                <div className="border-b border-slate-200 p-4">
                  <Skeleton className="h-5 w-40" />
                </div>
                <div className="space-y-3 p-4">
                  {[0, 1, 2].map((i) => (
                    <Skeleton key={i} className="h-28 rounded-[24px]" />
                  ))}
                </div>
              </aside>
            </div>
          </>) : (<>
      <header className="border-b border-slate-800 bg-[#17181f] px-4 py-4 text-white lg:px-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <Link
              to="/courses"
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 transition hover:bg-white/10"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <p className="text-lg font-semibold lg:text-2xl">
                {course.title}
              </p>
              <p className="mt-1 text-sm text-slate-300">
                {completedLessons}/{totalLessons} lessons completed
              </p>
            </div>
          </div>
          <div className="flex min-w-[220px] items-center gap-3">
            <div className="h-2 flex-1 rounded-full bg-white/10">
              <div
                className="h-2 rounded-full bg-blue-500 transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <span className="text-sm font-semibold text-slate-200 tabular-nums">
              {progressPercent}%
            </span>
          </div>
        </div>
      </header>

      <div className="flex flex-col xl:flex-row">
        <main className="min-w-0 flex-1">
          <div className="border-b border-slate-200 bg-white px-5 py-5 lg:px-8 dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
              <span>{course.title}</span>
              <ChevronRight className="h-4 w-4" />
              <span>{activeLesson.moduleTitle}</span>
            </div>
            <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <h2 className="text-3xl font-black tracking-tight">
                  {activeLesson.title}
                </h2>
                <p className="mt-2 inline-flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                  <Clock3 className="h-4 w-4" />
                  {Math.max(
                    1,
                    Math.round((activeLesson.duration_seconds || 0) / 60),
                  )}{" "}
                  minutes
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                {currentModuleRequiresQuiz ? (
                  <Link
                    to={`/quiz/${currentModuleQuiz!.id}`}
                    className="inline-flex items-center gap-2 rounded-2xl border border-amber-300 bg-amber-50 px-5 py-3 text-sm font-bold text-amber-900 transition hover:bg-amber-100"
                  >
                    <HelpCircle className="h-4 w-4" />
                    {currentModuleQuizPassed
                      ? "Retake Module Quiz"
                      : "Pass Module Quiz to Unlock Next Section"}
                  </Link>
                ) : null}
                {isCourseCompleted ? (
                  hasCertificate ? (
                    <Link
                      to={`/certificate?course=${course.id}`}
                      className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-emerald-700"
                    >
                      <Award className="h-4 w-4" />
                      View Certificate
                    </Link>
                  ) : (
                    <button
                      onClick={handleClaimCertificate}
                      disabled={isClaimingCertificate}
                      className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:opacity-60"
                    >
                      {isClaimingCertificate ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Award className="h-4 w-4" />
                      )}
                      {isClaimingCertificate
                        ? "Preparing..."
                        : "Request Certificate"}
                    </button>
                  )
                ) : null}
                {activeLesson.lesson_type === "QUIZ" && quiz ? (
                  <Link
                    to={`/quiz/${quiz.id}`}
                    className="inline-flex items-center gap-2 rounded-2xl bg-violet-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-violet-700"
                  >
                    <HelpCircle className="h-4 w-4" />
                    {quizAttemptsByQuiz[quiz.id]?.some((a) => a.passed)
                      ? "Retake Quiz"
                      : "Take Quiz"}
                  </Link>
                ) : null}
                {activeLesson.lesson_type === "ASSIGNMENT" ? (
                  <Link
                    to="/assignments"
                    className="inline-flex items-center gap-2 rounded-2xl bg-amber-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-amber-700"
                  >
                    <PenLine className="h-4 w-4" />
                    Submit Assignment
                  </Link>
                ) : null}
                {activeLesson.lesson_type === "LIVE" ? (
                  <button
                    onClick={() => showToast("Live session link coming soon.", "info")}
                    className="inline-flex items-center gap-2 rounded-2xl bg-rose-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-rose-700"
                  >
                    <Radio className="h-4 w-4" />
                    Join Live
                  </button>
                ) : null}
                {!["QUIZ", "ASSIGNMENT", "LIVE"].includes(activeLesson.lesson_type || "") && (
                  activeProgress?.is_completed ? (
                    <span className="inline-flex items-center gap-2 rounded-2xl bg-emerald-100 px-5 py-3 text-sm font-bold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                      <CheckCircle className="h-4 w-4" />
                      Terminé
                    </span>
                  ) : (
                  <button
                    onClick={() => saveProgress(100, true)}
                    disabled={isSavingProgress}
                    className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-blue-700 disabled:opacity-60"
                  >
                    {isSavingProgress ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <CheckCircle className="h-4 w-4" />
                    )}
                    {isSavingProgress ? "Saving..." : "Mark Complete"}
                  </button>
                  )
                )}
              </div>
            </div>
          </div>

          <div className="px-5 py-6 lg:px-8">
            <div className="mb-6 flex w-fit gap-1 rounded-2xl bg-slate-200/60 p-1 dark:bg-slate-900">
              {TABS.map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => setActiveTab(key)}
                  className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition-colors ${
                    activeTab === key
                      ? "bg-white text-blue-600 shadow-sm dark:bg-slate-800 dark:text-blue-400"
                      : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </button>
              ))}
            </div>

            {activeTab === "content" && (
              <section className="overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <div className="border-b border-slate-200 bg-[radial-gradient(circle_at_top_left,_rgba(37,99,235,0.18),_transparent_35%),linear-gradient(135deg,#0f172a_0%,#111827_45%,#1e293b_100%)] px-5 py-5 text-white dark:border-slate-800 lg:px-8 lg:py-6">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.3em] text-blue-200">
                        Now Learning
                      </p>
                      <h3 className="mt-3 text-2xl font-black tracking-tight lg:text-3xl">
                        {activeLesson.title}
                      </h3>
                      <p className="mt-2 max-w-2xl text-sm text-slate-300">
                        {activeLesson.moduleTitle} ·{" "}
                        {activeLesson.lesson_type || "VIDEO"} lesson
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-2 text-xs font-semibold text-white">
                        <Clock3 className="h-4 w-4 text-blue-200" />
                        {Math.max(
                          1,
                          Math.round((activeLesson.duration_seconds || 0) / 60),
                        )}{" "}
                        min
                      </span>
                    </div>
                  </div>
                </div>

                <div className="p-5 lg:p-8">
                  {activeLesson.lesson_type === "VIDEO" && activeLesson.video ? (
                    <div className="mb-8 rounded-[28px] border border-slate-200 bg-slate-950 p-2 shadow-[0_24px_60px_rgba(15,23,42,0.22)] dark:border-slate-800 lg:p-3">
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
                          <video
                            src={activeLesson.video}
                            controls
                            className="h-full w-full object-contain bg-transparent"
                          />
                        </div>
                      </div>
                    </div>
                  ) : activeLesson.lesson_type === "VIDEO" && activeLesson.video_url ? (
                    <a
                      href={activeLesson.video_url}
                      target="_blank"
                      rel="noreferrer"
                      className="mb-8 block rounded-[28px] border border-slate-200 bg-[linear-gradient(135deg,#eff6ff_0%,#ffffff_45%,#eef2ff_100%)] p-6 transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-lg dark:border-slate-800 dark:bg-[linear-gradient(135deg,#0f172a_0%,#111827_45%,#0b1220_100%)] dark:hover:border-blue-500/40"
                    >
                      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                        <div className="max-w-2xl">
                          <p className="text-xs font-bold uppercase tracking-[0.28em] text-blue-600 dark:text-blue-400">
                            External video
                          </p>
                          <h4 className="mt-3 text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                            Open the hosted lesson player
                          </h4>
                          <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                            Cette lesson utilise une video externe. Ouvre la
                            ressource dans un nouvel onglet pour garder une
                            experience propre.
                          </p>
                        </div>
                        <span className="inline-flex items-center gap-2 self-start rounded-2xl bg-slate-900 px-4 py-3 text-sm font-bold text-white dark:bg-blue-600 lg:self-auto">
                          Open video
                          <ExternalLink className="h-4 w-4" />
                        </span>
                      </div>
                    </a>
                  ) : null}

                  <div className="mb-6 grid gap-3 lg:grid-cols-3">
                    <div className={`rounded-2xl border p-4 ${
                      activeLesson.lesson_type === "VIDEO"
                        ? "border-indigo-200 bg-indigo-50"
                        : activeLesson.lesson_type === "QUIZ"
                          ? "border-violet-200 bg-violet-50"
                          : activeLesson.lesson_type === "ASSIGNMENT"
                            ? "border-amber-200 bg-amber-50"
                            : activeLesson.lesson_type === "LIVE"
                              ? "border-rose-200 bg-rose-50"
                              : activeLesson.lesson_type === "DOWNLOAD"
                                ? "border-emerald-200 bg-emerald-50"
                                : "border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950"
                    }`}>
                      <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                        Type
                      </p>
                      <p className="mt-2 text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                        {activeLesson.lesson_type === "VIDEO" && <PlayCircle className="h-5 w-5 text-indigo-600" />}
                        {activeLesson.lesson_type === "TEXT" && <FileText className="h-5 w-5 text-slate-600" />}
                        {activeLesson.lesson_type === "QUIZ" && <HelpCircle className="h-5 w-5 text-violet-600" />}
                        {activeLesson.lesson_type === "ASSIGNMENT" && <PenLine className="h-5 w-5 text-amber-600" />}
                        {activeLesson.lesson_type === "LIVE" && <Radio className="h-5 w-5 text-rose-600" />}
                        {activeLesson.lesson_type === "DOWNLOAD" && <Download className="h-5 w-5 text-emerald-600" />}
                        {activeLesson.lesson_type === "VIDEO"
                          ? "Video"
                          : activeLesson.lesson_type === "TEXT"
                            ? "Text"
                            : activeLesson.lesson_type === "QUIZ"
                              ? "Quiz"
                              : activeLesson.lesson_type === "ASSIGNMENT"
                                ? "Assignment"
                                : activeLesson.lesson_type === "LIVE"
                                  ? "Live"
                                  : activeLesson.lesson_type === "DOWNLOAD"
                                    ? "Download"
                                    : "Lesson"}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
                      <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                        {activeLesson.lesson_type === "LIVE" ? "Suggested" : "Duration"}
                      </p>
                      <p className="mt-2 text-lg font-bold text-slate-900 dark:text-slate-100">
                        {Math.max(
                          1,
                          Math.round((activeLesson.duration_seconds || 0) / 60),
                        )}{" "}
                        minutes
                      </p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
                      <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                        {activeLesson.lesson_type === "DOWNLOAD" ? "Files" : "Resources"}
                      </p>
                      <p className="mt-2 text-lg font-bold text-slate-900 dark:text-slate-100">
                        {(activeLesson.resources || []).length}
                      </p>
                    </div>
                  </div>

                  {["TEXT", "VIDEO", "QUIZ", "ASSIGNMENT", "DOWNLOAD"].includes(activeLesson.lesson_type || "") && (
                    <div className="rounded-[28px] border border-slate-200 bg-white p-6 lg:p-8 dark:border-slate-800 dark:bg-slate-950">
                      <div className="mb-5 flex items-center justify-between gap-4">
                        <div>
                          <p className="text-xs font-bold uppercase tracking-[0.24em] text-blue-600 dark:text-blue-400">
                            {activeLesson.lesson_type === "QUIZ"
                              ? "Instructions"
                              : activeLesson.lesson_type === "ASSIGNMENT"
                                ? "Consigne"
                                : "Overview"}
                          </p>
                          <h4 className="mt-2 text-2xl font-black tracking-tight text-slate-900 dark:text-slate-100">
                            {activeLesson.lesson_type === "QUIZ"
                              ? "Quiz instructions"
                              : activeLesson.lesson_type === "ASSIGNMENT"
                                ? "Assignment details"
                                : "Lesson content"}
                          </h4>
                        </div>
                      </div>
                      {activeLesson.content_blocks &&
                      activeLesson.content_blocks.length > 0 ? (
                        <div className="text-slate-700 dark:text-slate-300">
                          {renderContentBlocks(activeLesson.content_blocks)}
                        </div>
                      ) : (
                        <MarkdownRenderer
                          content={activeLesson.content || ""}
                          className="prose max-w-none text-slate-700 prose-headings:font-black prose-headings:text-slate-900 prose-p:leading-7 dark:prose-invert dark:text-slate-300 dark:prose-headings:text-white"
                        />
                      )}
                    </div>
                  )}

                  {["TEXT", "VIDEO", "QUIZ", "ASSIGNMENT"].includes(activeLesson.lesson_type || "") && activeLesson.transcript ? (
                    <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-700 dark:bg-slate-950">
                      <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Transcript</p>
                      <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-400 whitespace-pre-line">{activeLesson.transcript}</p>
                    </div>
                  ) : null}

                  {activeLesson.lesson_type === "QUIZ" && quiz && (
                    <div className="mt-4 rounded-2xl border border-violet-200 bg-violet-50 p-5 dark:border-violet-800 dark:bg-violet-950">
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-sm font-bold text-violet-800 dark:text-violet-200">Quiz</p>
                        <Link
                          to={`/quiz/${quiz.id}`}
                          className="text-xs font-bold text-violet-700 hover:text-violet-900 underline"
                        >
                          Open full screen →
                        </Link>
                      </div>
                      <p className="text-xs text-violet-600 dark:text-violet-400 mb-3">
                        {quiz.questions?.length || 0} questions · Passing: {quiz.passing_score}% · Time limit: {quiz.time_limit_minutes} min
                      </p>
                      {quizAttemptsByQuiz[quiz.id]?.length > 0 && (
                        <div className="space-y-1.5">
                          <p className="text-xs font-semibold text-violet-700">Your attempts:</p>
                          {quizAttemptsByQuiz[quiz.id].map((a, i) => (
                            <div
                              key={a.id}
                              className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs ${
                                a.passed
                                  ? "bg-emerald-100 text-emerald-800"
                                  : "bg-amber-100 text-amber-800"
                              }`}
                            >
                              {a.passed ? <CheckCircle size={14} /> : <HelpCircle size={14} />}
                              Attempt {i + 1}: {a.score}% {a.passed ? "(Passed)" : "(Failed)"}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {activeLesson.lesson_type === "LIVE" && (
                    <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center dark:border-rose-800 dark:bg-rose-950">
                      <Radio className="h-10 w-10 mx-auto text-rose-500 mb-2" />
                      <h4 className="text-lg font-bold text-rose-800 dark:text-rose-200">Live Session</h4>
                      <p className="text-sm text-rose-600 dark:text-rose-400 mt-1">
                        {activeLesson.duration_seconds
                          ? `Durée suggérée : ${Math.round(activeLesson.duration_seconds / 60)} minutes`
                          : "Rejoignez la session live avec votre tuteur"}
                      </p>
                    </div>
                  )}

                  {activeLesson.lesson_type === "DOWNLOAD" && (activeLesson.resources || []).length > 0 && (
                    <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 dark:border-emerald-800 dark:bg-emerald-950">
                      <p className="mb-3 text-sm font-bold text-emerald-800 dark:text-emerald-200">Resources to download</p>
                      <div className="space-y-2">
                        {(activeLesson.resources || []).map((r) => (
                          <a
                            key={r.id}
                            href={r.file_download_url || r.file_url}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-3 rounded-lg bg-white px-4 py-3 text-sm font-medium text-emerald-700 shadow-sm transition hover:bg-emerald-100 dark:bg-emerald-900 dark:text-emerald-300"
                          >
                            <Download size={16} />
                            {r.title || "Download file"}
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </section>
            )}

            {activeTab === "notes" && (
              <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h3 className="text-xl font-bold">Lesson Notes</h3>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                      Your private notes are saved per lesson.
                    </p>
                  </div>
                  <button
                    onClick={handleSaveNote}
                    disabled={isSavingNote}
                    className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-blue-700 disabled:opacity-60"
                  >
                    {isSavingNote ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    {isSavingNote ? "Saving..." : "Save Note"}
                  </button>
                </div>
                <textarea
                  value={noteDraft}
                  onChange={(event) => setNoteDraft(event.target.value)}
                  placeholder="Write what matters for you in this lesson..."
                  className="mt-6 min-h-[320px] w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-relaxed transition-shadow focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                />
              </section>
            )}

            {activeTab === "resources" && (
              <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <h3 className="text-xl font-bold">Resources</h3>
                <div className="mt-6 space-y-3">
                  {(activeLesson.resources || []).length === 0 && (
                    <div className="flex flex-col items-center py-10 text-center">
                      <FolderOpen className="mb-3 h-8 w-8 text-slate-300 dark:text-slate-600" />
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        No resources attached to this lesson yet.
                      </p>
                    </div>
                  )}
                  {(activeLesson.resources || []).map((resource) => (
                    <a
                      key={resource.id}
                      href={
                        resource.file_download_url || resource.file_url || "#"
                      }
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-start gap-3 rounded-2xl border border-slate-200 p-4 transition hover:border-blue-300 hover:bg-blue-50 dark:border-slate-700 dark:hover:border-blue-500/40 dark:hover:bg-slate-950"
                    >
                      <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-500/10">
                        <FileText className="h-4 w-4 text-blue-600" />
                      </span>
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-900 dark:text-slate-100">
                          {resource.title}
                        </p>
                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                          {resource.description || resource.kind}
                        </p>
                      </div>
                      <ExternalLink className="ml-auto h-4 w-4 shrink-0 text-slate-300 dark:text-slate-600" />
                    </a>
                  ))}
                </div>
              </section>
            )}

            {activeTab === "tutor" && (
              <section className="flex flex-col rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900" style={{ height: '600px' }}>
                <div className="shrink-0 px-8 pt-8">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-500/10">
                      <Sparkles className="h-5 w-5 text-blue-600" />
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-xl font-bold">AI Tutor</h3>
                        <button onClick={() => setShowTutorConvList(!showTutorConvList)} className="text-slate-400 hover:text-slate-600 p-0.5 rounded transition-colors">
                          <ChevronDown className="w-4 h-4" />
                        </button>
                      </div>
                      <p className="text-sm text-slate-500 dark:text-slate-400">Ask questions about the active lesson and get contextual help.</p>
                    </div>
                    <button onClick={handleNewTutorConv} className="text-slate-400 hover:text-blue-600 p-1.5 rounded-lg hover:bg-blue-50 transition-colors" title="New conversation">
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {showTutorConvList && (
                  <div className="shrink-0 border-t border-slate-200 max-h-40 overflow-y-auto bg-slate-50">
                    {tutorConversations.map((conv) => (
                      <div
                        key={conv.id}
                        className={'flex items-center justify-between px-8 py-2.5 text-sm cursor-pointer hover:bg-slate-100 transition-colors ' + (conv.id === tutorConvId ? 'bg-blue-50' : '')}
                        onClick={() => { setTutorConvId(conv.id); setShowTutorConvList(false); loadTutorMessages(conv.id); }}
                      >
                        <span className="truncate text-slate-700">{conv.title}</span>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDeleteTutorConv(conv.id); }}
                          className="text-slate-400 hover:text-red-500 shrink-0 ml-2"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div ref={tutorMessagesEndRef} className="mt-6 flex-1 overflow-y-auto px-8 space-y-3 scroll-smooth">
                  {tutorMessages.length === 0 && !isTutorLoading && (
                    <div className="flex flex-col items-center py-10 text-center">
                      <MessageSquare className="mb-3 h-8 w-8 text-slate-300 dark:text-slate-600" />
                      <p className="text-sm text-slate-500 dark:text-slate-400">Pose ta première question sur cette leçon.</p>
                    </div>
                  )}
                  {tutorMessages.map((message, index) => (
                    <div
                      key={`${message.role}-${index}`}
                      className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm ${
                          message.role === "ai"
                            ? "bg-blue-50 text-slate-800 dark:bg-blue-500/10 dark:text-slate-100"
                            : "bg-slate-900 text-white dark:bg-slate-700"
                        }`}
                      >
                        <p
                          className={`mb-1 text-xs font-bold uppercase tracking-wide ${
                            message.role === "ai"
                              ? "text-blue-400 dark:text-blue-300"
                              : "text-slate-300"
                          }`}
                        >
                          {message.role === "ai" ? "AI Tutor" : "You"}
                        </p>
                        {message.role === "ai" ? (
                          <MarkdownRenderer content={message.text} />
                        ) : (
                          <p className="leading-relaxed">{message.text}</p>
                        )}
                        {message.usage && (
                          <p className="mt-1.5 text-[10px] text-slate-400 text-right">{message.usage.total_tokens} tokens</p>
                        )}
                      </div>
                    </div>
                  ))}
                  {isTutorLoading && (
                    <div className="flex justify-start">
                      <div className="inline-flex items-center gap-2 rounded-2xl bg-blue-50 px-4 py-3 text-sm text-slate-700 dark:bg-blue-500/10 dark:text-slate-200">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Thinking...
                      </div>
                    </div>
                  )}
                </div>
                <div className="shrink-0 px-8 pb-8 pt-4">
                  <div className="flex gap-3">
                    <input
                      value={tutorInput}
                      onChange={(event) => setTutorInput(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" && !event.shiftKey) {
                          event.preventDefault();
                          handleAskTutor();
                        }
                      }}
                      placeholder="Ask a question about this lesson..."
                      className="flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm transition-shadow focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                    />
                    <button
                      onClick={handleAskTutor}
                      disabled={isTutorLoading || !tutorInput.trim()}
                      className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-blue-700 disabled:opacity-60"
                    >
                      Ask
                    </button>
                  </div>
                  <div className="flex items-center justify-between px-1 mt-2">
                    <p className="text-[10px] text-slate-400">{tutorTotalTokens > 0 && `${tutorTotalTokens} tokens used`}</p>
                    <p className="text-[10px] text-slate-400">EduStream AI</p>
                  </div>
                </div>
              </section>
            )}
          </div>
        </main>

        <aside className="w-full border-t border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 xl:sticky xl:top-0 xl:h-[calc(100vh-73px)] xl:w-[390px] xl:overflow-y-auto xl:border-l xl:border-t-0">
          <div className="border-b border-slate-200 px-5 py-5 dark:border-slate-800">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-2xl font-black tracking-tight">
                Course content
              </h3>
              <BookOpen className="h-5 w-5 text-slate-400 dark:text-slate-500" />
            </div>
          </div>

          <div className="space-y-3 p-4">
            {(course.modules || []).map((module, moduleIndex) => {
              const moduleLessons = module.lessons || [];
              const completedInModule = moduleLessons.filter(
                (lesson) =>
                  progressItems.find((item) => item.lesson === lesson.id)
                    ?.is_completed,
              ).length;
              const moduleMinutes = moduleLessons.reduce(
                (total, lesson) =>
                  total +
                  Math.max(1, Math.round((lesson.duration_seconds || 0) / 60)),
                0,
              );
              const moduleComplete =
                moduleLessons.length > 0 &&
                completedInModule === moduleLessons.length;
              const isOpen = openModules[module.id] ?? false;

              return (
                <div
                  key={module.id}
                  className="overflow-hidden rounded-[24px] border border-slate-200 bg-slate-50 transition-shadow hover:shadow-sm dark:border-slate-800 dark:bg-slate-950"
                >
                  <button
                    type="button"
                    onClick={() =>
                      setOpenModules((prev) => ({
                        ...prev,
                        [module.id]: !isOpen,
                      }))
                    }
                    className="flex w-full items-start justify-between gap-3 px-5 py-5 text-left"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                          Section {moduleIndex + 1}
                        </p>
                        {moduleComplete && (
                          <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                        )}
                      </div>
                      <p className="mt-2 text-2xl font-black leading-tight">
                        {module.title}
                      </p>
                      <div className="mt-3 flex items-center gap-2">
                        <div className="h-1.5 w-24 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                          <div
                            className="h-full rounded-full bg-blue-500"
                            style={{
                              width: moduleLessons.length
                                ? `${(completedInModule / moduleLessons.length) * 100}%`
                                : "0%",
                            }}
                          />
                        </div>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                          {completedInModule}/{moduleLessons.length} ·{" "}
                          {moduleMinutes}min
                        </p>
                      </div>
                    </div>
                    <ChevronDown
                      className={`mt-1 h-5 w-5 shrink-0 text-slate-400 transition-transform dark:text-slate-500 ${isOpen ? "rotate-180" : ""}`}
                    />
                  </button>

                  {isOpen ? (
                    <div className="border-t border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
                      {moduleLessons.map((lesson, lessonIndex) => {
                        const lessonProgress = progressItems.find(
                          (item) => String(item.lesson) === String(lesson.id),
                        );
                        const isActive = activeLesson.id === lesson.id;
                        const hasResources =
                          (lesson.resources || []).length > 0;
                        const locked = isLessonLocked(lesson.id);

                        return (
                          <button
                            key={lesson.id}
                            onClick={() => {
                              if (locked) {
                                showToast(
                                  "Passez le quiz requis du module precedent pour ouvrir cette section.",
                                  "error",
                                );
                                return;
                              }
                              setActiveLessonId(lesson.id);
                              navigate(`/player/${course.id}/${lesson.id}`, {
                                replace: true,
                              });
                            }}
                            className={`relative w-full border-b border-slate-100 px-5 py-5 text-left transition-colors last:border-b-0 dark:border-slate-800 ${
                              locked
                                ? "cursor-not-allowed bg-slate-50/80 opacity-70 dark:bg-slate-950/80"
                                : isActive
                                  ? "bg-blue-50 dark:bg-blue-500/10"
                                  : "hover:bg-slate-50 dark:hover:bg-slate-950"
                            }`}
                          >
                            {isActive && !locked && (
                              <span className="absolute inset-y-0 left-0 w-1 bg-blue-500" />
                            )}
                            <div className="flex items-start gap-3">
                              {locked ? (
                                <FileLock2 className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
                              ) : lessonProgress?.is_completed ? (
                                <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-green-500" />
                              ) : (
                                <div
                                  className={`mt-0.5 h-5 w-5 shrink-0 rounded-full border-2 ${isActive ? "border-blue-500" : "border-slate-300 dark:border-slate-600"}`}
                                />
                              )}
                              <div className="min-w-0 flex-1">
                                <p
                                  className={`text-sm ${isActive ? "font-semibold text-slate-900 dark:text-white" : "text-slate-600 dark:text-slate-300"}`}
                                >
                                  {lessonIndex + 1}. {lesson.title}
                                </p>
                                <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                                  <span className="inline-flex items-center gap-1.5">
                                    <PlayCircle className="h-3.5 w-3.5" />
                                    {Math.max(
                                      1,
                                      Math.round(
                                        (lesson.duration_seconds || 0) / 60,
                                      ),
                                    )}
                                    min
                                  </span>
                                  {locked ? (
                                    <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300 px-2.5 py-0.5 font-medium text-amber-700">
                                      <FileLock2 className="h-3 w-3" />
                                      Quiz required
                                    </span>
                                  ) : null}
                                  {hasResources ? (
                                    <span className="inline-flex items-center gap-1.5 rounded-full border border-violet-300 px-2.5 py-0.5 font-medium text-violet-600">
                                      <FolderOpen className="h-3 w-3" />
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
    </>)}
    </div>
      </main>
    </div>
  );
}
