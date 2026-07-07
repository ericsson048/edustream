import InstructorSidebar from "../../../../components/InstructorSidebar";
import Header from "../../../../components/Header";
import {
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  Edit,
  Eye,
  Plus,
  Trash2,
  X,
  FileText,
  Video,
  HelpCircle,
  ClipboardList,
  Radio,
  Download,
  GripVertical,
  EyeOff,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useToast } from "../../../../contexts/ToastContext";
import { courseService } from "../../../../services/courseService";
import { learningService } from "../../../../services/learningService";
import type { Course, CourseModule, CourseLesson, LessonResource } from "../../../../types/lms";
import type { QuizItem, QuizQuestionItem } from "../../../../services/learningService";

type ModuleForm = {
  title: string;
  description: string;
};

const emptyModule: ModuleForm = { title: "", description: "" };

const readVideoDuration = (file: File): Promise<number> =>
  new Promise((resolve) => {
    const el = document.createElement("video");
    el.preload = "metadata";
    el.onloadedmetadata = () => {
      resolve(Math.round(el.duration));
      URL.revokeObjectURL(el.src);
    };
    el.onerror = () => resolve(0);
    el.src = URL.createObjectURL(file);
  });

type LessonForm = {
  title: string;
  lesson_type: CourseLesson["lesson_type"];
  content: string;
  transcript: string;
  instructor_notes: string;
  is_preview: boolean;
};

const emptyLesson: LessonForm = {
  title: "",
  lesson_type: "TEXT" as const,
  content: "",
  transcript: "",
  instructor_notes: "",
  is_preview: false,
};

const lessonTypeMeta: Record<
  string,
  { label: string; icon: typeof FileText; style: string }
> = {
  TEXT: {
    label: "Texte",
    icon: FileText,
    style: "bg-slate-100 text-slate-600",
  },
  VIDEO: { label: "Vidéo", icon: Video, style: "bg-indigo-50 text-indigo-600" },
  QUIZ: {
    label: "Quiz",
    icon: HelpCircle,
    style: "bg-violet-50 text-violet-600",
  },
  ASSIGNMENT: {
    label: "Devoir",
    icon: ClipboardList,
    style: "bg-amber-50 text-amber-600",
  },
  LIVE: { label: "Live", icon: Radio, style: "bg-rose-50 text-rose-600" },
  DOWNLOAD: {
    label: "Téléchargement",
    icon: Download,
    style: "bg-emerald-50 text-emerald-600",
  },
};

export default function CourseDetail() {
  const { id = "" } = useParams();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [dialogVisible, setDialogVisible] = useState(false);
  const [editingModule, setEditingModule] = useState<CourseModule | null>(null);
  const [moduleForm, setModuleForm] = useState<ModuleForm>(emptyModule);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<CourseModule | null>(null);

  const [lessonDialogVisible, setLessonDialogVisible] = useState(false);
  const [lessonModuleId, setLessonModuleId] = useState<string | null>(null);
  const [editingLesson, setEditingLesson] = useState<CourseLesson | null>(null);
  const [lessonForm, setLessonForm] = useState<LessonForm>(emptyLesson);
  const [videoSource, setVideoSource] = useState<"file" | "url">("file");
  const [lessonVideoFile, setLessonVideoFile] = useState<File | null>(null);
  const [lessonVideoUrl, setLessonVideoUrl] = useState("");
  const [lessonDuration, setLessonDuration] = useState(0);
  type ResourceRow = {
    id?: string;
    title: string;
    kind: string;
    file_url: string;
    file?: File | null;
  };
  const [lessonResources, setLessonResources] = useState<ResourceRow[]>([]);
  const [confirmDeleteLesson, setConfirmDeleteLesson] =
    useState<CourseLesson | null>(null);

  const [editingQuiz, setEditingQuiz] = useState<QuizItem | null>(null);
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestionItem[]>([]);
  const [quizForm, setQuizForm] = useState({
    title: "",
    passing_score: 70,
    time_limit_minutes: 10,
  });

  const load = async () => {
    try {
      const data = await courseService.getCourse(id);
      setCourse(data);
    } catch {
      showToast("Impossible de charger le cours.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [id]);

  const toggleExpand = (moduleId: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(moduleId)) next.delete(moduleId);
      else next.add(moduleId);
      return next;
    });
  };

  const openNewModule = () => {
    setEditingModule(null);
    setModuleForm(emptyModule);
    setDialogVisible(true);
  };

  const openEditModule = (m: CourseModule) => {
    setEditingModule(m);
    setModuleForm({ title: m.title, description: m.description || "" });
    setDialogVisible(true);
  };

  const saveModule = async () => {
    setSaving(true);
    try {
      if (editingModule) {
        await courseService.updateModule(editingModule.id, moduleForm);
        showToast("Module modifié.", "success");
      } else {
        const nextOrder =
          modules.length > 0 ? Math.max(...modules.map((m) => m.order)) + 1 : 1;
        await courseService.createModule({
          course: id,
          ...moduleForm,
          order: nextOrder,
        });
        showToast("Module créé.", "success");
      }
      setDialogVisible(false);
      await load();
    } catch {
      showToast("Erreur lors de la sauvegarde.", "error");
    } finally {
      setSaving(false);
    }
  };

  const removeModule = async () => {
    if (!confirmDelete) return;
    try {
      await courseService.deleteModule(confirmDelete.id);
      showToast("Module supprimé.", "success");
      setConfirmDelete(null);
      await load();
    } catch {
      showToast("Erreur.", "error");
    }
  };

  const openNewLesson = (moduleId: string) => {
    setLessonModuleId(moduleId);
    setEditingLesson(null);
    setLessonForm(emptyLesson);
    setLessonVideoFile(null);
    setLessonVideoUrl("");
    setVideoSource("file");
    setLessonDuration(0);
    setLessonResources([]);
    setEditingQuiz(null);
    setQuizQuestions([]);
    setQuizForm({ title: "", passing_score: 70, time_limit_minutes: 10 });
    setLessonDialogVisible(true);
  };

  const openEditLesson = (l: CourseLesson) => {
    const mod = modules.find((m) =>
      (m.lessons || []).some((ls) => ls.id === l.id),
    );
    setLessonModuleId(mod?.id || null);
    setEditingLesson(l);
    setLessonForm({
      title: l.title,
      lesson_type: l.lesson_type || "TEXT",
      content: l.content || "",
      transcript: l.transcript || "",
      instructor_notes: l.instructor_notes || "",
      is_preview: l.is_preview,
    });
    setLessonDuration(l.duration_seconds || 0);
    setLessonVideoFile(null);
    setLessonVideoUrl(l.video_url || "");
    setVideoSource(l.video_url ? "url" : "file");
    setLessonResources(
      (l.resources || []).map((r) => ({
        id: r.id,
        title: r.title,
        kind: r.kind,
        file_url: r.file_url || "",
      })),
    );
    setEditingQuiz(null);
    setQuizQuestions([]);
    setQuizForm({ title: "", passing_score: 70, time_limit_minutes: 10 });
    setLessonDialogVisible(true);
    if (l.lesson_type === "QUIZ") {
      loadQuizForLesson(l.id);
    }
  };

  const onVideoFileChange = async (file: File | null) => {
    setLessonVideoFile(file);
    if (file) {
      const dur = await readVideoDuration(file);
      setLessonDuration(dur);
    }
  };

  const addResourceRow = () => {
    setLessonResources((prev) => [
      ...prev,
      { title: "", kind: "LINK", file_url: "", file: null },
    ]);
  };

  const updateResource = (
    i: number,
    patch: Partial<{ title: string; kind: string; file_url: string; file: File | null }>,
  ) => {
    setLessonResources((prev) =>
      prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)),
    );
  };

  const removeResource = (i: number) => {
    setLessonResources((prev) => prev.filter((_, idx) => idx !== i));
  };

  const loadQuizForLesson = async (lessonId: string) => {
    try {
      const quizzes = await learningService.listQuizzesByLesson(lessonId);
      if (quizzes.length > 0) {
        const quiz = quizzes[0];
        setEditingQuiz(quiz);
        setQuizForm({
          title: quiz.title,
          passing_score: quiz.passing_score,
          time_limit_minutes: quiz.time_limit_minutes,
        });
        setQuizQuestions(quiz.questions || []);
      }
    } catch {
      // no quiz yet
    }
  };

  const addQuestion = () => {
    setQuizQuestions((prev) => [
      ...prev,
      {
        id: "",
        quiz: editingQuiz?.id || "",
        prompt: "",
        options: ["", "", "", ""],
        correct_index: 0,
        order: prev.length + 1,
      },
    ]);
  };

  const updateQuestion = (
    idx: number,
    patch: Partial<QuizQuestionItem>,
  ) => {
    setQuizQuestions((prev) =>
      prev.map((q, i) => (i === idx ? { ...q, ...patch } : q)),
    );
  };

  const updateQuestionOption = (
    qIdx: number,
    oIdx: number,
    value: string,
  ) => {
    setQuizQuestions((prev) =>
      prev.map((q, i) =>
        i === qIdx
          ? { ...q, options: q.options.map((o, j) => (j === oIdx ? value : o)) }
          : q,
      ),
    );
  };

  const removeQuestion = (idx: number) => {
    setQuizQuestions((prev) => prev.filter((_, i) => i !== idx));
  };

  const toggleModulePublish = async (m: CourseModule) => {
    try {
      await courseService.updateModule(m.id, { is_published: !m.is_published });
      showToast(m.is_published ? "Module dépublié." : "Module publié.", "success");
      await load();
    } catch {
      showToast("Erreur.", "error");
    }
  };

  const toggleLessonPublish = async (l: CourseLesson) => {
    try {
      const newStatus = l.status === "PUBLISHED" ? "DRAFT" : "PUBLISHED";
      await courseService.updateLesson(l.id, { status: newStatus });
      showToast(newStatus === "PUBLISHED" ? "Leçon publiée." : "Leçon dépubliée.", "success");
      await load();
    } catch {
      showToast("Erreur.", "error");
    }
  };

  const saveLesson = async () => {
    if (!lessonModuleId) return;
    setSaving(true);
    try {
      const body = {
        title: lessonForm.title,
        lesson_type: lessonForm.lesson_type,
        content: lessonForm.content,
        video_url: videoSource === "url" ? lessonVideoUrl : "",
        duration_seconds: lessonDuration,
        transcript: lessonForm.transcript,
        instructor_notes: lessonForm.instructor_notes,
        is_preview: lessonForm.is_preview,
      };
      const videoPayload = lessonVideoFile
        ? { video_file: lessonVideoFile }
        : {};
      let savedLesson: CourseLesson;
      if (editingLesson) {
        savedLesson = await courseService.updateLesson(editingLesson.id, {
          ...body,
          ...videoPayload,
        });
      } else {
        const parentModule = modules.find((m) => m.id === lessonModuleId);
        const lessons = parentModule?.lessons || [];
        const nextOrder =
          lessons.length > 0 ? Math.max(...lessons.map((l) => l.order)) + 1 : 1;
        savedLesson = await courseService.createLesson({
          module: lessonModuleId,
          ...body,
          ...videoPayload,
          order: nextOrder,
        } as Parameters<typeof courseService.createLesson>[0]);
      }

      const oldResources = editingLesson?.resources || [];
      const oldIds = new Set(oldResources.map((r) => r.id));
      const newIds = new Set(lessonResources.map((r) => r.id).filter(Boolean));

      for (const r of oldResources) {
        if (!newIds.has(r.id)) await courseService.deleteResource(r.id);
      }
      for (const r of lessonResources) {
        const payload: Parameters<typeof courseService.createResource>[0] = {
          lesson: savedLesson.id,
          title: r.title,
          kind: r.kind as LessonResource["kind"],
          file_url: r.file_url,
        };
        if (r.file) {
          payload.file = r.file;
          payload.file_url = "";
        }
        if (r.id && oldIds.has(r.id)) {
          const updatePayload: Parameters<typeof courseService.updateResource>[1] = { title: r.title, kind: r.kind as LessonResource["kind"], file_url: r.file_url };
          if (r.file) updatePayload.file = r.file;
          await courseService.updateResource(r.id, updatePayload);
        } else {
          await courseService.createResource(payload);
        }
      }

      if (lessonForm.lesson_type === "QUIZ" && quizForm.title.trim()) {
        let quiz: QuizItem;
        if (editingQuiz) {
          quiz = await learningService.updateQuiz(editingQuiz.id, {
            title: quizForm.title,
            passing_score: quizForm.passing_score,
            time_limit_minutes: quizForm.time_limit_minutes,
          });
        } else {
          quiz = await learningService.createQuiz({
            lesson: savedLesson.id,
            title: quizForm.title,
            passing_score: quizForm.passing_score,
            time_limit_minutes: quizForm.time_limit_minutes,
          });
          setEditingQuiz(quiz);
        }
        const oldQIds = new Set((editingQuiz?.questions || []).map((q) => q.id).filter(Boolean));
        const newQIds = new Set(quizQuestions.map((q) => q.id).filter(Boolean));
        for (const q of editingQuiz?.questions || []) {
          if (q.id && !newQIds.has(q.id)) await learningService.deleteQuizQuestion(q.id);
        }
        for (const q of quizQuestions) {
          if (q.id && oldQIds.has(q.id)) {
            await learningService.updateQuizQuestion(q.id, { prompt: q.prompt, options: q.options, correct_index: q.correct_index, order: q.order });
          } else {
            await learningService.createQuizQuestion({ quiz: quiz.id, prompt: q.prompt, options: q.options, correct_index: q.correct_index, order: q.order });
          }
        }
      }

      showToast(editingLesson ? "Leçon modifiée." : "Leçon créée.", "success");
      setLessonDialogVisible(false);
      await load();
    } catch {
      showToast("Erreur lors de la sauvegarde de la leçon.", "error");
    } finally {
      setSaving(false);
    }
  };

  const removeLesson = async () => {
    if (!confirmDeleteLesson) return;
    try {
      await courseService.deleteLesson(confirmDeleteLesson.id);
      showToast("Leçon supprimée.", "success");
      setConfirmDeleteLesson(null);
      await load();
    } catch {
      showToast("Erreur.", "error");
    }
  };

  const modules = (course?.modules || []).sort((a, b) => a.order - b.order);
  const totalLessons = modules.reduce(
    (sum, m) => sum + (m.lessons?.length || 0),
    0,
  );

  const footer = (
    <div className="flex gap-3 justify-end">
      <button
        onClick={() => setDialogVisible(false)}
        className="px-4 py-2 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
      >
        Annuler
      </button>
      <button
        onClick={saveModule}
        disabled={saving || !moduleForm.title.trim()}
        className="px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer shadow-sm shadow-indigo-600/20"
      >
        {saving ? "Enregistrement..." : editingModule ? "Modifier" : "Créer"}
      </button>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-slate-50">
      <InstructorSidebar />
      <main className="flex-1 ml-64">
        <Header />
        <div className="p-8 w-full mx-auto ">
          {loading ? (
            <div className="space-y-3">
              <div className="h-4 w-20 bg-slate-100 rounded animate-pulse" />
              <div className="h-8 w-72 bg-slate-100 rounded animate-pulse mt-4" />
              <div className="h-4 w-96 bg-slate-100 rounded animate-pulse" />
              <div className="space-y-3 mt-6">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="h-16 bg-white border border-slate-200 rounded-xl animate-pulse"
                  />
                ))}
              </div>
            </div>
          ) : !course ? (
            <div className="text-center py-16 bg-white rounded-xl border border-dashed border-slate-300 text-slate-400">
              Cours introuvable.
            </div>
          ) : (
            <>
              <button
                onClick={() => navigate("/instructor/courses")}
                className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-4 cursor-pointer bg-transparent border-none transition-colors"
              >
                <ArrowLeft size={16} /> Retour aux cours
              </button>

              <div className="flex items-start justify-between gap-6 mb-8">
                <div className="flex flex-col min-w-0">
                  <h1 className="text-2xl font-bold text-slate-900">
                    {course.title}
                  </h1>
                  {course.description && (
                    <p className="text-slate-500 text-sm mt-1.5 ">
                      {course.description}
                    </p>
                  )}
                  <div className="flex items-center gap-3 mt-3">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${course.is_published ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${course.is_published ? "bg-green-500" : "bg-amber-500"}`}
                      />
                      {course.is_published ? "Publié" : "Brouillon"}
                    </span>
                    <span className="text-xs text-slate-400">
                      {modules.length} module{modules.length > 1 ? "s" : ""}
                    </span>
                    <span className="text-xs text-slate-300">·</span>
                    <span className="text-xs text-slate-400">
                      {totalLessons} leçon{totalLessons > 1 ? "s" : ""}
                    </span>
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Link
                    to={`/course/${id}`}
                    target="_blank"
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50 text-sm cursor-pointer transition-colors"
                  >
                    <Eye size={16} /> Aperçu
                  </Link>
                  <button
                    onClick={openNewModule}
                    className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm cursor-pointer transition-colors shadow-sm shadow-indigo-600/20"
                  >
                    <Plus size={16} /> Module
                  </button>
                </div>
              </div>

              {modules.length === 0 ? (
                <div className="flex flex-col items-center justify-center text-center py-20 bg-white rounded-xl border border-dashed border-slate-300">
                  <div className="w-12 h-12 rounded-full bg-indigo-50 flex items-center justify-center mb-4">
                    <ClipboardList size={20} className="text-indigo-500" />
                  </div>
                  <p className="text-slate-700 font-medium">
                    Aucun module pour le moment
                  </p>
                  <p className="text-slate-400 text-sm mt-1 mb-5">
                    Structurez votre cours en créant un premier module.
                  </p>
                  <button
                    onClick={openNewModule}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors cursor-pointer text-sm font-medium"
                  >
                    <Plus size={16} /> Créer le premier module
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {modules.map((m, idx) => {
                    const isOpen = expanded.has(m.id);
                    const lessons = (m.lessons || []).sort(
                      (a, b) => a.order - b.order,
                    );
                    return (
                      <div
                        key={m.id}
                        className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden transition-shadow hover:shadow-md"
                      >
                        <button
                          onClick={() => toggleExpand(m.id)}
                          className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-50 text-left cursor-pointer bg-transparent border-none transition-colors"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            {isOpen ? (
                              <ChevronDown
                                size={18}
                                className="text-slate-400 shrink-0"
                              />
                            ) : (
                              <ChevronRight
                                size={18}
                                className="text-slate-400 shrink-0"
                              />
                            )}
                            <span className="flex items-center justify-center w-6 h-6 rounded-md bg-slate-100 text-slate-500 text-xs font-semibold shrink-0">
                              {idx + 1}
                            </span>
                            <div className="min-w-0">
                              <div className="font-semibold text-slate-900 truncate flex items-center gap-2">
                                {m.title}
                                {m.is_published === false && (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 shrink-0">Brouillon</span>
                                )}
                              </div>
                              {m.description && (
                                <div className="text-xs text-slate-400 truncate max-w-md">
                                  {m.description}
                                </div>
                              )}
                            </div>
                            <span className="text-xs text-slate-400 shrink-0 ml-1">
                              · {lessons.length} leçon
                              {lessons.length > 1 ? "s" : ""}
                            </span>
                          </div>
                          <div
                            className="flex items-center gap-1 shrink-0"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              onClick={() => openEditModule(m)}
                              className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-500 cursor-pointer transition-colors"
                              title="Modifier"
                            >
                              <Edit size={15} />
                            </button>
                            <button
                              onClick={() => toggleModulePublish(m)}
                              className={`p-1.5 rounded-lg cursor-pointer transition-colors ${m.is_published ? "hover:bg-amber-100 text-amber-500" : "hover:bg-green-100 text-green-500"}`}
                              title={m.is_published ? "Dépublier" : "Publier"}
                            >
                              {m.is_published ? <EyeOff size={15} /> : <Eye size={15} />}
                            </button>
                            <button
                              onClick={() => setConfirmDelete(m)}
                              className="p-1.5 rounded-lg hover:bg-red-100 text-red-400 hover:text-red-600 cursor-pointer transition-colors"
                              title="Supprimer"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </button>
                        {isOpen && (
                          <div className="border-t border-slate-100 px-5 py-3 space-y-1">
                            {lessons.length === 0 ? (
                              <p className="text-sm text-slate-400 py-3">
                                Aucune leçon. Ajoutez-en une pour commencer.
                              </p>
                            ) : (
                              lessons.map((l) => {
                                const meta =
                                  lessonTypeMeta[l.lesson_type || "TEXT"] ||
                                  lessonTypeMeta.TEXT;
                                const Icon = meta.icon;
                                return (
                                  <div
                                    key={l.id}
                                    className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-white/10 group transition-colors"
                                  >
                                    <div className="flex items-center gap-3 min-w-0">
                                      <GripVertical
                                        size={14}
                                        className="text-slate-300 shrink-0"
                                      />
                                      <span
                                        className={`flex items-center justify-center w-6 h-6 rounded-md shrink-0 ${meta.style}`}
                                      >
                                        <Icon size={13} />
                                      </span>
                                      <span className="text-sm text-slate-700 truncate">
                                        {l.title}
                                      </span>
                                      {l.status === "PUBLISHED" && (
                                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-100 text-green-700 shrink-0">
                                          Publié
                                        </span>
                                      )}
                                      {l.is_preview && (
                                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 shrink-0">
                                          Aperçu gratuit
                                        </span>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                      <Link
                                        to={`/instructor/courses/${id}/lessons/${l.id}/content`}
                                        className="p-1 rounded hover:bg-sky-100 text-sky-400 hover:text-sky-600 transition-colors"
                                        title="Contenu markdown"
                                      >
                                        <FileText size={14} />
                                      </Link>
                                      <button
                                        onClick={() => openEditLesson(l)}
                                        className="p-1 rounded hover:bg-slate-200 text-slate-400 hover:text-slate-600 cursor-pointer transition-colors"
                                        title="Modifier"
                                      >
                                        <Edit size={14} />
                                      </button>
                                      <button
                                        onClick={() => toggleLessonPublish(l)}
                                        className={`p-1 rounded cursor-pointer transition-colors ${l.status === "PUBLISHED" ? "hover:bg-amber-100 text-amber-400" : "hover:bg-green-100 text-green-400"}`}
                                        title={l.status === "PUBLISHED" ? "Dépublier" : "Publier"}
                                      >
                                        {l.status === "PUBLISHED" ? <EyeOff size={14} /> : <Eye size={14} />}
                                      </button>
                                      <button
                                        onClick={() =>
                                          setConfirmDeleteLesson(l)
                                        }
                                        className="p-1 rounded hover:bg-red-100 text-red-300 hover:text-red-500 cursor-pointer transition-colors"
                                        title="Supprimer"
                                      >
                                        <Trash2 size={14} />
                                      </button>
                                    </div>
                                  </div>
                                );
                              })
                            )}
                            <button
                              onClick={() => openNewLesson(m.id)}
                              className="flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-800 cursor-pointer bg-transparent border-none pt-2 pl-3 font-medium transition-colors"
                            >
                              <Plus size={14} /> Ajouter une leçon
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {dialogVisible && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4"
          onClick={() => setDialogVisible(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-200">
              <h2 className="text-lg font-bold text-slate-900">
                {editingModule ? "Modifier le module" : "Nouveau module"}
              </h2>
              <button
                onClick={() => setDialogVisible(false)}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 cursor-pointer transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Titre *
                </label>
                <input
                  value={moduleForm.title}
                  onChange={(e) =>
                    setModuleForm({ ...moduleForm, title: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow"
                  placeholder="Ex : Les fondamentaux"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Description
                </label>
                <textarea
                  value={moduleForm.description}
                  onChange={(e) =>
                    setModuleForm({
                      ...moduleForm,
                      description: e.target.value,
                    })
                  }
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow resize-none"
                />
              </div>
            </div>
            <div className="p-6 border-t border-slate-200">{footer}</div>
          </div>
        </div>
      )}

      {confirmDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4"
          onClick={() => setConfirmDelete(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-slate-900 mb-1.5">
              Supprimer ce module ?
            </h3>
            <p className="text-slate-500 text-sm mb-6">
              &quot;{confirmDelete.title}&quot; et toutes ses leçons seront
              définitivement supprimés.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setConfirmDelete(null)}
                className="px-4 py-2 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer text-sm"
              >
                Annuler
              </button>
              <button
                onClick={removeModule}
                className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors cursor-pointer text-sm font-medium"
              >
                Confirmer
              </button>
            </div>
          </div>
        </div>
      )}

      {lessonDialogVisible && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4"
          onClick={() => setLessonDialogVisible(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl mx-4 max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-200 shrink-0">
              <h2 className="text-lg font-bold text-slate-900">
                {editingLesson ? "Modifier la leçon" : "Nouvelle leçon"}
              </h2>
              <button
                onClick={() => setLessonDialogVisible(false)}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 cursor-pointer transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-6 space-y-5 overflow-y-auto">
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Titre *
                  </label>
                  <input
                    value={lessonForm.title}
                    onChange={(e) =>
                      setLessonForm({ ...lessonForm, title: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Type
                  </label>
                  <select
                    value={lessonForm.lesson_type || ""}
                    onChange={(e) =>
                      setLessonForm({
                        ...lessonForm,
                        lesson_type: e.target
                          .value as CourseLesson["lesson_type"],
                      })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow bg-white"
                  >
                    <option value="TEXT">Texte</option>
                    <option value="VIDEO">Vidéo</option>
                    <option value="QUIZ">Quiz</option>
                    <option value="ASSIGNMENT">Devoir</option>
                    <option value="LIVE">Live</option>
                    <option value="DOWNLOAD">Téléchargement</option>
                  </select>
                </div>
              </div>

              {["TEXT", "VIDEO", "QUIZ", "ASSIGNMENT"].includes(lessonForm.lesson_type) && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Contenu {lessonForm.lesson_type === "QUIZ" ? "(instructions)" : lessonForm.lesson_type === "ASSIGNMENT" ? "(consigne)" : "(Markdown)"}
                  </label>
                  <textarea
                    value={lessonForm.content}
                    onChange={(e) =>
                      setLessonForm({ ...lessonForm, content: e.target.value })
                    }
                    rows={6}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow"
                  />
                </div>
              )}

              {lessonForm.lesson_type === "QUIZ" && (
                <div className="p-4 rounded-lg bg-violet-50 border border-violet-200 space-y-4">
                  <h4 className="text-sm font-bold text-violet-800">Quiz</h4>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="col-span-2">
                      <label className="block text-xs font-medium text-violet-700 mb-1">Titre du quiz *</label>
                      <input
                        value={quizForm.title}
                        onChange={(e) => setQuizForm({ ...quizForm, title: e.target.value })}
                        className="w-full px-3 py-2 border border-violet-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-shadow bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-violet-700 mb-1">Temps limite (min)</label>
                      <input
                        type="number"
                        min={0}
                        value={quizForm.time_limit_minutes}
                        onChange={(e) => setQuizForm({ ...quizForm, time_limit_minutes: Number(e.target.value) })}
                        className="w-full px-3 py-2 border border-violet-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-shadow bg-white"
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <label className="text-xs font-medium text-violet-700">Score de passage (%)</label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={quizForm.passing_score}
                      onChange={(e) => setQuizForm({ ...quizForm, passing_score: Number(e.target.value) })}
                      className="w-20 px-2 py-1.5 border border-violet-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-shadow bg-white"
                    />
                  </div>
                  <div className="border-t border-violet-200 pt-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-violet-700">Questions ({quizQuestions.length})</span>
                      <button
                        onClick={addQuestion}
                        className="text-xs text-violet-700 hover:text-violet-900 cursor-pointer bg-transparent border-none flex items-center gap-1 font-medium transition-colors"
                      >
                        <Plus size={12} /> Ajouter
                      </button>
                    </div>
                    {quizQuestions.length === 0 ? (
                      <p className="text-xs text-violet-400 py-2">Aucune question. Ajoutez-en une.</p>
                    ) : (
                      <div className="space-y-3 max-h-64 overflow-y-auto">
                        {quizQuestions.map((q, qi) => (
                          <div key={qi} className="p-3 rounded-lg bg-white border border-violet-200 space-y-2">
                            <div className="flex items-start gap-2">
                              <input
                                placeholder={`Question ${qi + 1}`}
                                value={q.prompt}
                                onChange={(e) => updateQuestion(qi, { prompt: e.target.value })}
                                className="flex-1 px-2 py-1.5 border border-slate-300 rounded-md text-xs bg-white focus:outline-none focus:ring-1 focus:ring-violet-500"
                              />
                              <button
                                onClick={() => removeQuestion(qi)}
                                className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded cursor-pointer bg-transparent border-none shrink-0 transition-colors"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                            <div className="grid grid-cols-2 gap-1.5">
                              {q.options.map((opt, oi) => (
                                <label
                                  key={oi}
                                  className={`flex items-center gap-1.5 px-2 py-1.5 rounded-md text-xs border cursor-pointer transition-colors ${q.correct_index === oi ? "bg-emerald-50 border-emerald-300" : "bg-white border-slate-200 hover:bg-slate-50"}`}
                                >
                                  <input
                                    type="radio"
                                    name={`correct-${qi}`}
                                    checked={q.correct_index === oi}
                                    onChange={() => updateQuestion(qi, { correct_index: oi })}
                                    className="accent-emerald-600"
                                  />
                                  <input
                                    placeholder={`Option ${oi + 1}`}
                                    value={opt}
                                    onChange={(e) => updateQuestionOption(qi, oi, e.target.value)}
                                    className="flex-1 bg-transparent border-none text-xs focus:outline-none p-0"
                                  />
                                </label>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {lessonForm.lesson_type === "VIDEO" && (
                <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Vidéo
                  </label>
                  <div className="flex gap-2 mb-3">
                    <button
                      type="button"
                      onClick={() => setVideoSource("file")}
                      className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors ${videoSource === "file" ? "bg-indigo-600 text-white" : "bg-white text-slate-500 border border-slate-300 hover:bg-slate-100"}`}
                    >
                      Fichier
                    </button>
                    <button
                      type="button"
                      onClick={() => setVideoSource("url")}
                      className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors ${videoSource === "url" ? "bg-indigo-600 text-white" : "bg-white text-slate-500 border border-slate-300 hover:bg-slate-100"}`}
                    >
                      URL
                    </button>
                  </div>
                  {videoSource === "file" ? (
                    <div>
                      <input
                        type="file"
                        accept="video/*"
                        onChange={(e) =>
                          onVideoFileChange(e.target.files?.[0] || null)
                        }
                        className="w-full text-sm text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer"
                      />
                      {lessonDuration > 0 && (
                        <p className="text-xs text-slate-400 mt-2">
                          Durée détectée : {Math.floor(lessonDuration / 60)}:
                          {(lessonDuration % 60).toString().padStart(2, "0")} min
                        </p>
                      )}
                    </div>
                  ) : (
                    <input
                      value={lessonVideoUrl}
                      onChange={(e) => setLessonVideoUrl(e.target.value)}
                      placeholder="https://..."
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow bg-white"
                    />
                  )}
                </div>
              )}

              {lessonForm.lesson_type === "LIVE" && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Durée suggérée (minutes)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={lessonVideoUrl || ""}
                    onChange={(e) => setLessonVideoUrl(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow"
                    placeholder="60"
                  />
                </div>
              )}

              {!["LIVE", "DOWNLOAD"].includes(lessonForm.lesson_type) && (
                <label className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg bg-slate-50 border border-slate-200 cursor-pointer w-fit">
                  <input
                    type="checkbox"
                    checked={lessonForm.is_preview}
                    onChange={(e) =>
                      setLessonForm({
                        ...lessonForm,
                        is_preview: e.target.checked,
                      })
                    }
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-sm text-slate-700">Aperçu gratuit</span>
                </label>
              )}

              <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-100">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Notes du formateur
                  </label>
                  <textarea
                    value={lessonForm.instructor_notes}
                    onChange={(e) =>
                      setLessonForm({
                        ...lessonForm,
                        instructor_notes: e.target.value,
                      })
                    }
                    rows={3}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow resize-none"
                  />
                </div>
                {["TEXT", "VIDEO", "QUIZ", "ASSIGNMENT"].includes(lessonForm.lesson_type) && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      Transcription
                    </label>
                    <textarea
                      value={lessonForm.transcript}
                      onChange={(e) =>
                        setLessonForm({
                          ...lessonForm,
                          transcript: e.target.value,
                        })
                      }
                      rows={3}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow resize-none"
                    />
                  </div>
                )}
              </div>

              {lessonForm.lesson_type !== "LIVE" && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-slate-700">
                      Ressources
                    </label>
                    <button
                      onClick={addResourceRow}
                      className="text-xs text-indigo-600 hover:text-indigo-800 cursor-pointer bg-transparent border-none flex items-center gap-1 font-medium transition-colors"
                    >
                      <Plus size={12} /> Ajouter
                    </button>
                  </div>
                  {lessonResources.length === 0 ? (
                    <p className="text-xs text-slate-400 py-2">
                      Aucune ressource ajoutée.
                    </p>
                  ) : (
                    lessonResources.map((r, i) => (
                      <div
                        key={i}
                        className="flex flex-col gap-2 mb-2 p-3 rounded-lg bg-slate-50 border border-slate-200"
                      >
                        <div className="flex items-center gap-2">
                          <input
                            placeholder="Titre"
                            value={r.title}
                            onChange={(e) =>
                              updateResource(i, { title: e.target.value })
                            }
                            className="flex-1 px-2 py-1.5 border border-slate-300 rounded-md text-xs bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          />
                          <select
                            value={r.kind}
                            onChange={(e) =>
                              updateResource(i, { kind: e.target.value })
                            }
                            className="px-2 w-25 py-1.5 border border-slate-300 rounded-md text-xs bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          >
                            <option value="LINK">Lien</option>
                            <option value="PDF">PDF</option>
                            <option value="ZIP">ZIP</option>
                            <option value="OTHER">Autre</option>
                          </select>
                          <button
                            onClick={() => removeResource(i)}
                            className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-md cursor-pointer bg-transparent border-none shrink-0 transition-colors"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="file"
                            onChange={(e) => {
                              const file = e.target.files?.[0] || null;
                              if (file) {
                                const ext = file.name.split(".").pop()?.toLowerCase();
                                const kind =
                                  ext === "pdf" ? "PDF" :
                                  ext === "zip" ? "ZIP" :
                                  "OTHER";
                                updateResource(i, { file, file_url: "", kind });
                              }
                            }}
                            className="flex-1 text-xs file:mr-2 file:px-2 file:py-1 file:rounded-md file:border-0 file:text-xs file:font-medium file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                          />
                          <input
                            placeholder="URL"
                            value={r.file_url}
                            onChange={(e) =>
                              updateResource(i, { file_url: e.target.value, file: null })
                            }
                            className="flex-1 px-2 py-1.5 border border-slate-300 rounded-md text-xs bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          />
                        </div>
                        {r.file && (
                          <p className="text-xs text-indigo-600 font-medium">
                            {r.file.name} ({(r.file.size / 1024).toFixed(1)} Ko)
                          </p>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
            <div className="p-6 border-t border-slate-200 flex gap-3 justify-end shrink-0">
              <button
                onClick={() => setLessonDialogVisible(false)}
                className="px-4 py-2 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Annuler
              </button>
              <button
                onClick={saveLesson}
                disabled={saving || !lessonForm.title.trim()}
                className="px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer shadow-sm shadow-indigo-600/20"
              >
                {saving
                  ? "Enregistrement..."
                  : editingLesson
                    ? "Modifier"
                    : "Créer"}
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmDeleteLesson && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4"
          onClick={() => setConfirmDeleteLesson(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-slate-900 mb-1.5">
              Supprimer cette leçon ?
            </h3>
            <p className="text-slate-500 text-sm mb-6">
              &quot;{confirmDeleteLesson.title}&quot; sera définitivement
              supprimée.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setConfirmDeleteLesson(null)}
                className="px-4 py-2 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer text-sm"
              >
                Annuler
              </button>
              <button
                onClick={removeLesson}
                className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors cursor-pointer text-sm font-medium"
              >
                Confirmer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
