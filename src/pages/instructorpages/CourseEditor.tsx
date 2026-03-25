import InstructorSidebar from '../../components/InstructorSidebar';
import Header from '../../components/Header';
import { Editor } from 'primereact/editor';
import {
  Bot,
  Eye,
  ChevronDown,
  ChevronUp,
  FileText,
  FileQuestion,
  Link2,
  Plus,
  Radio,
  Save,
  Sparkles,
  Square,
  Trash2,
  Video,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { aiService, type GeneratedCourseOutline } from '../../services/aiService';
import { courseService } from '../../services/courseService';
import { learningService, type AssignmentItem, type QuizItem, type QuizQuestionItem } from '../../services/learningService';
import type { Course, CourseCategory, CourseLesson, CourseModule, LessonResource } from '../../types/lms';
import { useToast } from '../../contexts/ToastContext';

type ModuleDraft = {
  title: string;
  description: string;
  learning_objectives_text: string;
  estimated_minutes: number;
  is_published: boolean;
};

type LessonDraft = {
  title: string;
  content: string;
  lesson_type?: CourseLesson['lesson_type'];
  status?: CourseLesson['status'];
  video_url: string;
  video_file?: File | null;
  transcript?: string;
  instructor_notes?: string;
  duration_seconds: number;
  is_preview: boolean;
};

type ResourceDraft = {
  title: string;
  kind: LessonResource['kind'];
  description: string;
  file_url: string;
  file?: File | null;
};

type QuizDraft = {
  title: string;
  passing_score: number;
  time_limit_minutes: number;
};

type QuestionDraft = {
  prompt: string;
  optionsText: string;
  correct_index: number;
};

type AssignmentDraft = {
  title: string;
  description: string;
  due_date: string;
  points: number;
  type: string;
};

type FocusNode =
  | { type: 'course' }
  | { type: 'module'; moduleId: string }
  | { type: 'lesson'; moduleId: string; lessonId: string };

const emptyLessonDraft: LessonDraft = {
  title: '',
  content: '',
  lesson_type: 'VIDEO',
  status: 'DRAFT',
  video_url: '',
  duration_seconds: 0,
  transcript: '',
  instructor_notes: '',
  is_preview: false,
};

const emptyAssignmentDraft: AssignmentDraft = {
  title: '',
  description: '',
  due_date: '',
  points: 100,
  type: 'PROJECT',
};

const emptyQuizDraft: QuizDraft = {
  title: '',
  passing_score: 70,
  time_limit_minutes: 10,
};

const emptyQuestionDraft: QuestionDraft = {
  prompt: '',
  optionsText: 'Option A\nOption B\nOption C\nOption D',
  correct_index: 0,
};

const emptyResourceDraft: ResourceDraft = {
  title: '',
  kind: 'PDF',
  description: '',
  file_url: '',
  file: null,
};

function lessonToDraft(lesson: CourseLesson): LessonDraft {
  return {
    title: lesson.title,
    content: lesson.content || '',
    lesson_type: lesson.lesson_type || 'VIDEO',
    status: lesson.status || 'DRAFT',
    video_url: lesson.video_url || '',
    video_file: null,
    transcript: lesson.transcript || '',
    instructor_notes: lesson.instructor_notes || '',
    duration_seconds: lesson.duration_seconds || 0,
    is_preview: lesson.is_preview || false,
  };
}

function moduleToDraft(module: CourseModule): ModuleDraft {
  return {
    title: module.title,
    description: module.description || '',
    learning_objectives_text: (module.learning_objectives || []).join('\n'),
    estimated_minutes: module.estimated_minutes || 0,
    is_published: module.is_published ?? true,
  };
}

function quizToDraft(quiz: QuizItem): QuizDraft {
  return {
    title: quiz.title,
    passing_score: quiz.passing_score,
    time_limit_minutes: quiz.time_limit_minutes,
  };
}

function questionToDraft(question: QuizQuestionItem): QuestionDraft {
  return {
    prompt: question.prompt,
    optionsText: (question.options || []).join('\n'),
    correct_index: question.correct_index,
  };
}

function parseOptions(optionsText: string) {
  return optionsText
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean);
}

function sortByOrder<T extends { order: number }>(items: T[]) {
  return [...items].sort((a, b) => a.order - b.order);
}

function clampPercentage(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function plainTextToHtml(value: string) {
  const lines = value.split('\n');
  if (!lines.some((line) => line.trim())) {
    return '<p><br></p>';
  }

  return lines
    .map((line) => {
      const normalized = line.trim();
      return normalized ? `<p>${escapeHtml(normalized)}</p>` : '<p><br></p>';
    })
    .join('');
}

function htmlToPlainText(value: string) {
  if (!value) return '';

  if (typeof window === 'undefined') {
    return value;
  }

  const element = window.document.createElement('div');
  element.innerHTML = value;
  return element.innerText.replace(/\r\n/g, '\n').trim();
}

function RichEditorField({
  label,
  value,
  onChange,
  plainText = false,
  minHeight = 180,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  plainText?: boolean;
  minHeight?: number;
}) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">{label}</p>
      <div className="overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-white/5">
        <Editor
          value={plainText ? plainTextToHtml(value) : value}
          onTextChange={(event) => onChange(plainText ? htmlToPlainText(event.htmlValue || '') : event.htmlValue || '')}
          style={{ height: `${minHeight}px` }}
        />
      </div>
    </div>
  );
}

export default function CourseEditor() {
  const { id = '' } = useParams();
  const { showToast } = useToast();
  const [categories, setCategories] = useState<CourseCategory[]>([]);
  const [course, setCourse] = useState<Course | null>(null);
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [language, setLanguage] = useState('en');
  const [level, setLevel] = useState<Course['level']>('ALL');
  const [price, setPrice] = useState('');
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [isPublished, setIsPublished] = useState(false);
  const [targetAudienceText, setTargetAudienceText] = useState('');
  const [estimatedHours, setEstimatedHours] = useState(0);
  const [objectivesText, setObjectivesText] = useState('');
  const [prerequisitesText, setPrerequisitesText] = useState('');
  const [newModuleTitle, setNewModuleTitle] = useState('');
  const [moduleDrafts, setModuleDrafts] = useState<Record<string, ModuleDraft>>({});
  const [lessonDrafts, setLessonDrafts] = useState<Record<string, LessonDraft>>({});
  const [newLessonDrafts, setNewLessonDrafts] = useState<Record<string, LessonDraft>>({});
  const [resourceDrafts, setResourceDrafts] = useState<Record<string, ResourceDraft>>({});
  const [resourceEditDrafts, setResourceEditDrafts] = useState<Record<string, ResourceDraft>>({});
  const [quizByModule, setQuizByModule] = useState<Record<string, QuizItem | null>>({});
  const [quizByLesson, setQuizByLesson] = useState<Record<string, QuizItem | null>>({});
  const [quizDrafts, setQuizDrafts] = useState<Record<string, QuizDraft>>({});
  const [questionDrafts, setQuestionDrafts] = useState<Record<string, QuestionDraft>>({});
  const [newQuestionDrafts, setNewQuestionDrafts] = useState<Record<string, QuestionDraft>>({});
  const [assignments, setAssignments] = useState<AssignmentItem[]>([]);
  const [assignmentDrafts, setAssignmentDrafts] = useState<Record<string, AssignmentDraft>>({});
  const [newAssignmentDraft, setNewAssignmentDraft] = useState<AssignmentDraft>(emptyAssignmentDraft);
  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>({});
  const [expandedLessons, setExpandedLessons] = useState<Record<string, boolean>>({});
  const [expandedQuizzes, setExpandedQuizzes] = useState<Record<string, boolean>>({});
  const [aiPrompt, setAiPrompt] = useState('');
  const [branchAiPrompt, setBranchAiPrompt] = useState('');
  const [activeFocus, setActiveFocus] = useState<FocusNode>({ type: 'course' });
  const [isBranchGenerating, setIsBranchGenerating] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedOutline, setGeneratedOutline] = useState<GeneratedCourseOutline | null>(null);
  const [recordingTarget, setRecordingTarget] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaChunksRef = useRef<Blob[]>([]);

  const parseLines = (value: string) => value.split('\n').map((item) => item.trim()).filter(Boolean);
  const selectedCategoryName = useMemo(
    () => categories.find((item) => item.id === categoryId)?.name || course?.category || '',
    [categories, categoryId, course?.category],
  );

  const stopRecordingStream = () => {
    mediaRecorderRef.current = null;
    mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    mediaStreamRef.current = null;
    mediaChunksRef.current = [];
    setRecordingTarget(null);
  };

  const refreshCourse = async () => {
    if (!id) return;
    const data = await courseService.getCourse(id);
    const modules = sortByOrder(data.modules || []);
    const quizEntries = await Promise.all(
      modules.map(async (module) => {
        const quizzes = await learningService.listQuizzesByModule(module.id);
        return [module.id, quizzes[0] || null] as const;
      }),
    );
    const lessonQuizEntries = await Promise.all(
      modules.flatMap((module) =>
        sortByOrder(module.lessons || []).map(async (lesson) => {
          const quizzes = await learningService.listQuizzesByLesson(lesson.id);
          return [lesson.id, quizzes[0] || null] as const;
        }),
      ),
    );
    const assignmentsForCourse = await learningService.listAssignmentsByCourse(id);

    const nextModuleDrafts: Record<string, ModuleDraft> = {};
    const nextLessonDrafts: Record<string, LessonDraft> = {};
    const nextNewLessonDrafts: Record<string, LessonDraft> = {};
    const nextResourceDrafts: Record<string, ResourceDraft> = {};
    const nextResourceEditDrafts: Record<string, ResourceDraft> = {};
    const nextExpandedModules: Record<string, boolean> = {};

    for (const module of modules) {
      nextModuleDrafts[module.id] = moduleToDraft(module);
      nextNewLessonDrafts[module.id] = { ...emptyLessonDraft };
      nextExpandedModules[module.id] = expandedModules[module.id] ?? true;
      for (const lesson of sortByOrder(module.lessons || [])) {
        nextLessonDrafts[lesson.id] = lessonToDraft(lesson);
        nextResourceDrafts[lesson.id] = { ...emptyResourceDraft };
        for (const resource of lesson.resources || []) {
          nextResourceEditDrafts[resource.id] = {
            title: resource.title,
            kind: resource.kind,
            description: resource.description,
            file_url: resource.file_url,
            file: null,
          };
        }
      }
    }

    const nextQuizByModule = Object.fromEntries(quizEntries);
    const nextQuizByLesson = Object.fromEntries(lessonQuizEntries);
    const nextQuizDrafts: Record<string, QuizDraft> = {};
    const nextQuestionDrafts: Record<string, QuestionDraft> = {};
    const nextNewQuestionDrafts: Record<string, QuestionDraft> = {};
    const nextExpandedQuizzes: Record<string, boolean> = {};

    for (const [moduleId, quiz] of quizEntries) {
      nextExpandedQuizzes[moduleId] = expandedQuizzes[moduleId] ?? true;
      if (quiz) {
        nextQuizDrafts[moduleId] = quizToDraft(quiz);
        nextNewQuestionDrafts[quiz.id] = { ...emptyQuestionDraft };
        for (const question of sortByOrder(quiz.questions || [])) {
          nextQuestionDrafts[question.id] = questionToDraft(question);
        }
      } else {
        nextQuizDrafts[moduleId] = {
          ...emptyQuizDraft,
          title: `${nextModuleDrafts[moduleId]?.title || 'Module'} Quiz`,
        };
      }
    }
    for (const [lessonId, quiz] of lessonQuizEntries) {
      if (quiz) {
        nextQuizDrafts[lessonId] = quizToDraft(quiz);
        nextNewQuestionDrafts[quiz.id] = nextNewQuestionDrafts[quiz.id] || { ...emptyQuestionDraft };
        for (const question of sortByOrder(quiz.questions || [])) {
          nextQuestionDrafts[question.id] = questionToDraft(question);
        }
      } else {
        nextQuizDrafts[lessonId] = { ...emptyQuizDraft, title: 'Lesson Quiz' };
      }
    }
    const nextAssignmentDrafts: Record<string, AssignmentDraft> = {};
    for (const assignment of assignmentsForCourse) {
      nextAssignmentDrafts[assignment.id] = {
        title: assignment.title,
        description: assignment.description || '',
        due_date: assignment.due_date,
        points: assignment.points,
        type: assignment.type,
      };
    }

    setCourse({ ...data, modules });
    setTitle(data.title);
    setSubtitle(data.subtitle || '');
    setDescription(data.description);
    setCategoryId(data.category_id || '');
    setLanguage(data.language || 'en');
    setLevel(data.level || 'ALL');
    setPrice(data.price);
    setThumbnailUrl(data.thumbnail_url || '');
    setThumbnailFile(null);
    setIsPublished(data.is_published);
    setObjectivesText((data.learning_objectives || []).join('\n'));
    setPrerequisitesText((data.prerequisites || []).join('\n'));
    setTargetAudienceText((data.target_audience || []).join('\n'));
    setEstimatedHours(data.estimated_hours || 0);
    setModuleDrafts(nextModuleDrafts);
    setLessonDrafts(nextLessonDrafts);
    setNewLessonDrafts(nextNewLessonDrafts);
    setResourceDrafts(nextResourceDrafts);
    setResourceEditDrafts(nextResourceEditDrafts);
    setQuizByModule(nextQuizByModule);
    setQuizByLesson(nextQuizByLesson);
    setQuizDrafts(nextQuizDrafts);
    setQuestionDrafts(nextQuestionDrafts);
    setNewQuestionDrafts(nextNewQuestionDrafts);
    setAssignments(assignmentsForCourse);
    setAssignmentDrafts(nextAssignmentDrafts);
    setExpandedModules(nextExpandedModules);
    setExpandedQuizzes(nextExpandedQuizzes);

    const pendingOutline = sessionStorage.getItem(`pending-outline:${id}`);
    if (pendingOutline) {
      try {
        setGeneratedOutline(JSON.parse(pendingOutline) as GeneratedCourseOutline);
      } catch {
        sessionStorage.removeItem(`pending-outline:${id}`);
      }
    }
  };

  useEffect(() => {
    courseService
      .listCategories()
      .then(setCategories)
      .catch(() => showToast('Impossible de charger les categories.', 'error'));
  }, [showToast]);

  useEffect(() => {
    refreshCourse().catch(() => showToast('Impossible de charger ce cours.', 'error'));
  }, [id]);

  useEffect(() => () => stopRecordingStream(), []);

  const modules = useMemo(() => sortByOrder(course?.modules || []), [course]);
  const selectedModule =
    activeFocus.type === 'module'
      ? modules.find((module) => module.id === activeFocus.moduleId) || null
      : activeFocus.type === 'lesson'
        ? modules.find((module) => module.id === activeFocus.moduleId) || null
        : null;
  const selectedLesson =
    activeFocus.type === 'lesson'
      ? sortByOrder(selectedModule?.lessons || []).find((lesson) => lesson.id === activeFocus.lessonId) || null
      : null;
  const selectedModuleLessons = useMemo(() => sortByOrder(selectedModule?.lessons || []), [selectedModule]);
  const completionStats = useMemo(() => {
    const checks = [
      Boolean(title.trim()),
      Boolean(subtitle.trim()),
      Boolean(description.trim()),
      Boolean(categoryId),
      Boolean(price.trim()),
      Boolean((thumbnailFile || thumbnailUrl || course?.thumbnail || course?.thumbnail_url)),
      parseLines(objectivesText).length > 0,
      parseLines(prerequisitesText).length > 0,
      parseLines(targetAudienceText).length > 0,
      estimatedHours > 0,
      modules.length > 0,
      modules.some((module) => (module.lessons || []).length > 0),
      modules.some((module) => Boolean(quizByModule[module.id])),
      assignments.length > 0,
    ];

    const lessonCount = modules.reduce((total, module) => total + (module.lessons || []).length, 0);
    const previewLessonCount = modules.reduce(
      (total, module) => total + (module.lessons || []).filter((lesson) => (lessonDrafts[lesson.id] || lessonToDraft(lesson)).is_preview).length,
      0,
    );
    const resourcesCount = modules.reduce(
      (total, module) => total + (module.lessons || []).reduce((lessonTotal, lesson) => lessonTotal + (lesson.resources || []).length, 0),
      0,
    );
    const publishedLessonCount = modules.reduce(
      (total, module) =>
        total + (module.lessons || []).filter((lesson) => (lessonDrafts[lesson.id] || lessonToDraft(lesson)).status === 'PUBLISHED').length,
      0,
    );

    return {
      score: clampPercentage((checks.filter(Boolean).length / checks.length) * 100),
      lessonCount,
      previewLessonCount,
      resourcesCount,
      publishedLessonCount,
      moduleQuizCount: Object.values(quizByModule).filter(Boolean).length,
      lessonQuizCount: Object.values(quizByLesson).filter(Boolean).length,
      assignmentCount: assignments.length,
    };
  }, [
    assignments,
    categoryId,
    course?.thumbnail,
    course?.thumbnail_url,
    description,
    estimatedHours,
    lessonDrafts,
    modules,
    objectivesText,
    prerequisitesText,
    price,
    quizByLesson,
    quizByModule,
    subtitle,
    targetAudienceText,
    thumbnailFile,
    thumbnailUrl,
    title,
  ]);
  const previewModules = useMemo(
    () =>
      modules.map((module) => ({
        id: module.id,
        title: moduleDrafts[module.id]?.title || module.title,
        description: moduleDrafts[module.id]?.description || module.description || '',
        lessons: sortByOrder(module.lessons || []).map((lesson) => {
          const draft = lessonDrafts[lesson.id] || lessonToDraft(lesson);
          return {
            id: lesson.id,
            title: draft.title || lesson.title,
            type: draft.lesson_type || lesson.lesson_type || 'VIDEO',
            duration_seconds: draft.duration_seconds || lesson.duration_seconds || 0,
            is_preview: draft.is_preview,
          };
        }),
      })),
    [lessonDrafts, moduleDrafts, modules],
  );

  useEffect(() => {
    if (!modules.length) {
      setActiveFocus({ type: 'course' });
      return;
    }

    if (activeFocus.type === 'course') {
      return;
    }

    const module = modules.find((item) => item.id === activeFocus.moduleId);
    if (!module) {
      setActiveFocus({ type: 'course' });
      return;
    }

    if (activeFocus.type === 'lesson') {
      const lessonExists = (module.lessons || []).some((lesson) => lesson.id === activeFocus.lessonId);
      if (!lessonExists) {
        setActiveFocus({ type: 'module', moduleId: module.id });
      }
    }
  }, [activeFocus, modules]);

  useEffect(() => {
    if (selectedModule) {
      setExpandedModules((prev) => ({ ...prev, [selectedModule.id]: true }));
    }
    if (selectedLesson) {
      setExpandedLessons((prev) => ({ ...prev, [selectedLesson.id]: true }));
    }
  }, [selectedLesson, selectedModule]);

  const runBranchAssistant = async () => {
    if (!course) return;

    const prompt = branchAiPrompt.trim();
    if (!prompt) {
      showToast('Ajoutez une instruction IA pour cette branche.', 'error');
      return;
    }

    setIsBranchGenerating(true);
    try {
      const focusPrefix =
        activeFocus.type === 'course'
          ? `Aide-moi a enrichir le cours "${title || course.title}".`
          : activeFocus.type === 'module'
            ? `Aide-moi a retravailler le module "${moduleDrafts[activeFocus.moduleId]?.title || selectedModule?.title || 'Module'}".`
            : `Aide-moi a retravailler la lesson "${lessonDrafts[activeFocus.lessonId]?.title || selectedLesson?.title || 'Lesson'}".`;

      const outline = await aiService.generateCourse({
        prompt: `${focusPrefix} ${prompt}`,
        title: title || course.title,
        category: selectedCategoryName,
        level,
      });

      if (activeFocus.type === 'course') {
        setGeneratedOutline(outline);
      } else if (activeFocus.type === 'module' && selectedModule) {
        const suggestedModule = outline.modules[0];
        if (suggestedModule) {
          setModuleDrafts((prev) => ({
            ...prev,
            [selectedModule.id]: {
              ...(prev[selectedModule.id] || moduleToDraft(selectedModule)),
              title: prev[selectedModule.id]?.title || suggestedModule.title,
              description: suggestedModule.lessons.map((lesson) => lesson.title).join('\n'),
              learning_objectives_text: (outline.learning_objectives || []).join('\n'),
              estimated_minutes:
                prev[selectedModule.id]?.estimated_minutes ||
                Math.max(15, suggestedModule.lessons.reduce((total, lesson) => total + Math.round((lesson.duration_seconds || 0) / 60), 0)),
            },
          }));
        }
      } else if (activeFocus.type === 'lesson') {
        const suggestedLesson = outline.modules[0]?.lessons[0];
        if (suggestedLesson) {
          setLessonDrafts((prev) => ({
            ...prev,
            [activeFocus.lessonId]: {
              ...(prev[activeFocus.lessonId] || (selectedLesson ? lessonToDraft(selectedLesson) : emptyLessonDraft)),
              title: prev[activeFocus.lessonId]?.title || suggestedLesson.title,
              content: suggestedLesson.content,
              video_url: prev[activeFocus.lessonId]?.video_url || suggestedLesson.video_url,
              duration_seconds: prev[activeFocus.lessonId]?.duration_seconds || suggestedLesson.duration_seconds,
              transcript: prev[activeFocus.lessonId]?.transcript || suggestedLesson.content,
            },
          }));
        }
      }

      showToast('Suggestion IA ajoutee a la branche en cours.', 'success');
    } catch {
      showToast('Assistant IA indisponible pour cette branche.', 'error');
    } finally {
      setIsBranchGenerating(false);
    }
  };

  const publishGeneratedOutline = async () => {
    if (!course || !generatedOutline) return;
    try {
      const updated = await courseService.importOutline(course.id, {
        outline: generatedOutline,
        subtitle,
        category_id: categoryId || course.category_id || undefined,
        language,
        target_audience: parseLines(targetAudienceText),
        estimated_hours: estimatedHours,
        is_published: isPublished,
      });
      setCourse(updated);
      setGeneratedOutline(null);
      sessionStorage.removeItem(`pending-outline:${course.id}`);
      await refreshCourse();
      showToast('Structure IA publiee dans le cours.', 'success');
    } catch {
      showToast('Publication du plan IA impossible.', 'error');
    }
  };

  const startRecording = async (targetKey: string, moduleId?: string) => {
    if (!navigator.mediaDevices?.getUserMedia) {
      showToast("L'enregistrement navigateur n'est pas supporte ici.", 'error');
      return;
    }
    if (recordingTarget) {
      showToast('Terminez lenregistrement en cours avant de recommencer.', 'error');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      const recorder = new MediaRecorder(stream);
      mediaStreamRef.current = stream;
      mediaRecorderRef.current = recorder;
      mediaChunksRef.current = [];
      setRecordingTarget(targetKey);

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          mediaChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(mediaChunksRef.current, { type: 'video/webm' });
        const file = new File([blob], `lesson-recording-${Date.now()}.webm`, { type: 'video/webm' });
        if (targetKey.startsWith('lesson:')) {
          const lessonId = targetKey.replace('lesson:', '');
          setLessonDrafts((prev) => ({
            ...prev,
            [lessonId]: { ...(prev[lessonId] || emptyLessonDraft), video_file: file, video_url: '' },
          }));
        }
        if (targetKey.startsWith('new:') && moduleId) {
          setNewLessonDrafts((prev) => ({
            ...prev,
            [moduleId]: { ...(prev[moduleId] || emptyLessonDraft), video_file: file, video_url: '' },
          }));
        }
        stopRecordingStream();
        showToast('Video enregistree. Pensez a sauvegarder la lesson.', 'success');
      };

      recorder.start();
    } catch {
      stopRecordingStream();
      showToast("Impossible de demarrer l'enregistrement.", 'error');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      return;
    }
    stopRecordingStream();
  };

  const moveModule = async (moduleId: string, direction: 'up' | 'down') => {
    const orderedModules = sortByOrder(modules);
    const currentIndex = orderedModules.findIndex((item) => item.id === moduleId);
    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (currentIndex < 0 || targetIndex < 0 || targetIndex >= orderedModules.length) return;
    const current = orderedModules[currentIndex];
    const target = orderedModules[targetIndex];
    try {
      await courseService.updateModule(current.id, { order: target.order });
      await courseService.updateModule(target.id, { order: current.order });
      await refreshCourse();
    } catch {
      showToast('Reordonnancement des modules impossible.', 'error');
    }
  };

  const moveLesson = async (module: CourseModule, lessonId: string, direction: 'up' | 'down') => {
    const lessons = sortByOrder(module.lessons || []);
    const currentIndex = lessons.findIndex((item) => item.id === lessonId);
    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (currentIndex < 0 || targetIndex < 0 || targetIndex >= lessons.length) return;
    const current = lessons[currentIndex];
    const target = lessons[targetIndex];
    try {
      await courseService.updateLesson(current.id, { order: target.order });
      await courseService.updateLesson(target.id, { order: current.order });
      await refreshCourse();
    } catch {
      showToast('Reordonnancement des lessons impossible.', 'error');
    }
  };

  const moveQuestion = async (quiz: QuizItem, questionId: string, direction: 'up' | 'down') => {
    const questions = sortByOrder(quiz.questions || []);
    const currentIndex = questions.findIndex((item) => item.id === questionId);
    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (currentIndex < 0 || targetIndex < 0 || targetIndex >= questions.length) return;
    const current = questions[currentIndex];
    const target = questions[targetIndex];
    try {
      await learningService.updateQuizQuestion(current.id, { order: target.order });
      await learningService.updateQuizQuestion(target.id, { order: current.order });
      await refreshCourse();
    } catch {
      showToast('Reordonnancement des questions impossible.', 'error');
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 transition-colors">
      <InstructorSidebar />
      <main className="ml-64 flex-1">
        <Header />
        <div className="mx-auto max-w-7xl space-y-8 px-8 py-8">
          <div className="grid gap-8 xl:grid-cols-[1.05fr,1.55fr]">
            <section className="rounded-[28px] border border-slate-200 bg-gradient-to-br from-white via-slate-50 to-blue-50 p-6 shadow-sm dark:border-blue-500/20 dark:from-[#0c1832] dark:via-[#0b1838] dark:to-[#09101f] dark:shadow-2xl dark:shadow-blue-950/20">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.35em] text-blue-300/70">Course Builder</p>
                  <h1 className="mt-3 text-4xl font-black tracking-tight text-slate-900 dark:text-white">{title || 'Untitled Course'}</h1>
                  <p className="mt-3 max-w-xl text-sm leading-6 text-slate-600 dark:text-slate-300">
                    Editez la structure complete du cours, enrichissez les lessons et terminez chaque module avec un quiz realiste.
                  </p>
                </div>
                <button
                  className="inline-flex items-center gap-2 rounded-2xl bg-amber-400 px-4 py-3 text-sm font-bold text-slate-950 transition hover:bg-amber-300"
                  onClick={async () => {
                    if (!course) return;
                    try {
                      const updated = await courseService.updateCourse(course.id, {
                        title,
                        subtitle,
                        description,
                        category_id: categoryId || undefined,
                        language,
                        level,
                        thumbnail_url: thumbnailUrl,
                        thumbnail_file: thumbnailFile,
                        learning_objectives: parseLines(objectivesText),
                        prerequisites: parseLines(prerequisitesText),
                        target_audience: parseLines(targetAudienceText),
                        estimated_hours: estimatedHours,
                        price,
                        is_published: isPublished,
                      });
                      setCourse(updated);
                      showToast('Cours mis a jour.', 'success');
                    } catch {
                      showToast('Sauvegarde impossible.', 'error');
                    }
                  }}
                >
                  <Save className="h-4 w-4" />
                  Publier les changements
                </button>
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-white/5">
                  <p className="text-xs uppercase tracking-[0.25em] text-blue-700/70 dark:text-blue-200/70">Modules</p>
                  <p className="mt-2 text-3xl font-black text-slate-900 dark:text-white">{modules.length}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-white/5">
                  <p className="text-xs uppercase tracking-[0.25em] text-blue-700/70 dark:text-blue-200/70">Lessons</p>
                  <p className="mt-2 text-3xl font-black text-slate-900 dark:text-white">
                    {modules.reduce((total, module) => total + (module.lessons || []).length, 0)}
                  </p>
                </div>
              </div>

              <div className="mt-4 rounded-[24px] border border-emerald-200 bg-emerald-50 p-5 dark:border-emerald-500/20 dark:bg-emerald-500/10">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.25em] text-emerald-700 dark:text-emerald-300">Course completion</p>
                    <div className="mt-2 flex items-end gap-3">
                      <p className="text-4xl font-black text-slate-900 dark:text-white">{completionStats.score}%</p>
                      <p className="pb-1 text-sm text-slate-600 dark:text-slate-300">pret pour une experience etudiante credible</p>
                    </div>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="rounded-2xl bg-white/80 px-4 py-3 text-sm dark:bg-slate-950/40">
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Lessons</p>
                      <p className="mt-1 font-bold text-slate-900 dark:text-white">{completionStats.lessonCount}</p>
                    </div>
                    <div className="rounded-2xl bg-white/80 px-4 py-3 text-sm dark:bg-slate-950/40">
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Quiz</p>
                      <p className="mt-1 font-bold text-slate-900 dark:text-white">{completionStats.moduleQuizCount + completionStats.lessonQuizCount}</p>
                    </div>
                    <div className="rounded-2xl bg-white/80 px-4 py-3 text-sm dark:bg-slate-950/40">
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Preview</p>
                      <p className="mt-1 font-bold text-slate-900 dark:text-white">{completionStats.previewLessonCount}</p>
                    </div>
                  </div>
                </div>
                <div className="mt-4 h-3 overflow-hidden rounded-full bg-emerald-100 dark:bg-emerald-950/40">
                  <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${completionStats.score}%` }} />
                </div>
              </div>

              <div className="mt-6 space-y-4">
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Titre du cours"
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:border-white/10 dark:bg-white/5 dark:text-white"
                />
                <input
                  value={subtitle}
                  onChange={(e) => setSubtitle(e.target.value)}
                  placeholder="Sous-titre du cours"
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:border-white/10 dark:bg-white/5 dark:text-white"
                />
                <RichEditorField label="Description du cours" value={description} onChange={setDescription} minHeight={220} />
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:border-white/10 dark:bg-white/5 dark:text-white"
                  >
                    <option value="">Selectionnez une categorie</option>
                    {categories.map((item) => (
                      <option key={item.id} value={item.id}>{item.name}</option>
                    ))}
                  </select>
                  <input
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="Prix"
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:border-white/10 dark:bg-white/5 dark:text-white"
                  />
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:border-white/10 dark:bg-white/5 dark:text-white"
                  >
                    <option value="en">English</option>
                    <option value="fr">Francais</option>
                  </select>
                  <select
                    value={level}
                    onChange={(e) => setLevel(e.target.value as Course['level'])}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:border-white/10 dark:bg-white/5 dark:text-white"
                  >
                    <option value="BEGINNER">Beginner</option>
                    <option value="INTERMEDIATE">Intermediate</option>
                    <option value="ADVANCED">Advanced</option>
                    <option value="ALL">All levels</option>
                  </select>
                </div>
                <div className="grid gap-4 xl:grid-cols-3">
                  <RichEditorField
                    label="Objectifs du cours"
                    value={objectivesText}
                    onChange={setObjectivesText}
                    plainText
                    minHeight={180}
                  />
                  <RichEditorField
                    label="Prerequis"
                    value={prerequisitesText}
                    onChange={setPrerequisitesText}
                    plainText
                    minHeight={180}
                  />
                  <RichEditorField
                    label="Public cible"
                    value={targetAudienceText}
                    onChange={setTargetAudienceText}
                    plainText
                    minHeight={180}
                  />
                </div>
                <div className="grid gap-4 xl:grid-cols-3">
                  <input
                    type="number"
                    min="0"
                    value={estimatedHours}
                    onChange={(e) => setEstimatedHours(Number(e.target.value) || 0)}
                    placeholder="Duree estimee du cours en heures"
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:border-white/10 dark:bg-white/5 dark:text-white"
                  />
                  <input
                    value={thumbnailUrl}
                    onChange={(e) => setThumbnailUrl(e.target.value)}
                    placeholder="URL de miniature"
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:border-white/10 dark:bg-white/5 dark:text-white"
                  />
                  <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 dark:border-white/10 dark:bg-white/5 dark:text-white">
                    <input
                      type="checkbox"
                      checked={isPublished}
                      onChange={(e) => setIsPublished(e.target.checked)}
                      className="h-4 w-4 rounded border-white/20 bg-slate-900 text-blue-500"
                    />
                    Cours publie
                  </label>
                </div>
                <label className="block rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-blue-400 dark:border-white/10 dark:bg-white/5 dark:text-slate-200">
                  Upload miniature du cours
                  <input
                    type="file"
                    accept="image/*"
                    className="mt-2 block w-full text-xs"
                    onChange={(e) => setThumbnailFile(e.target.files?.[0] || null)}
                  />
                </label>
              </div>

              <div className="mt-6 overflow-hidden rounded-[24px] border border-slate-200 dark:border-white/10">
                <img
                  src={
                    course?.thumbnail ||
                    course?.thumbnail_url ||
                    'https://images.unsplash.com/photo-1555099962-4199c345e5dd?auto=format&fit=crop&w=800&q=80'
                  }
                  alt={course?.title || 'thumbnail'}
                  className="h-64 w-full object-cover"
                />
              </div>
            </section>

            <section className="space-y-6">
              <div className="rounded-[28px] border border-blue-200 bg-gradient-to-br from-blue-50 via-white to-slate-50 p-6 shadow-sm dark:border-blue-500/20 dark:from-[#10204a] dark:via-[#0f2155] dark:to-[#091735] dark:shadow-2xl dark:shadow-blue-950/20">
                <div className="flex items-center gap-3">
                  <div className="grid h-12 w-12 place-items-center rounded-2xl border border-blue-300/20 bg-blue-400/10">
                    <Bot className="h-5 w-5 text-blue-700 dark:text-blue-100" />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-slate-900 dark:text-white">Assistant IA</h2>
                    <p className="text-sm text-slate-600 dark:text-blue-100/75">Genere un plan complet avec modules, lessons et quiz de fin de module.</p>
                  </div>
                </div>

                <div className="mt-5 flex flex-col gap-3 xl:flex-row">
                  <input
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    placeholder="Exemple: Cree un cours intermediaire de Django REST avec 4 modules, projets pratiques et quiz"
                    className="flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:border-white/10 dark:bg-white/5 dark:text-white"
                  />
                  <button
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 font-bold text-slate-950 transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={isGenerating || !aiPrompt.trim()}
                    onClick={async () => {
                      setIsGenerating(true);
                      try {
                        const outline = await aiService.generateCourse({
                          prompt: aiPrompt,
                          title,
                          category: selectedCategoryName,
                          level: course?.level || 'INTERMEDIATE',
                        });
                        setGeneratedOutline(outline);
                        showToast('Plan IA genere.', 'success');
                      } catch {
                        showToast('Generation IA impossible.', 'error');
                      } finally {
                        setIsGenerating(false);
                      }
                    }}
                  >
                    <Sparkles className="h-4 w-4" />
                    {isGenerating ? 'Generation...' : 'Generer'}
                  </button>
                </div>

                {generatedOutline && (
                  <div className="mt-5 rounded-[24px] border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-slate-950/35">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white">{generatedOutline.title}</h3>
                        <p className="mt-2 max-w-2xl text-sm text-slate-600 dark:text-slate-300">{generatedOutline.description}</p>
                        <div className="mt-3 grid gap-3 md:grid-cols-2">
                          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-white/10 dark:bg-white/5">
                            <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-700 dark:text-blue-200">Objectifs</p>
                            <ul className="mt-2 space-y-1 text-sm text-slate-600 dark:text-slate-300">
                              {(generatedOutline.learning_objectives || []).map((objective) => (
                                <li key={objective}>- {objective}</li>
                              ))}
                            </ul>
                          </div>
                          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-white/10 dark:bg-white/5">
                            <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-700 dark:text-blue-200">Prerequis</p>
                            <ul className="mt-2 space-y-1 text-sm text-slate-600 dark:text-slate-300">
                              {(generatedOutline.prerequisites || []).map((item) => (
                                <li key={item}>- {item}</li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </div>
                      <button
                        className="rounded-2xl bg-amber-400 px-4 py-3 text-sm font-bold text-slate-950 transition hover:bg-amber-300"
                        onClick={publishGeneratedOutline}
                      >
                        Publier dans le cours
                      </button>
                    </div>
                    <div className="mt-4 grid gap-3 md:grid-cols-2">
                      {generatedOutline.modules.map((module, index) => (
                        <div key={`${module.title}-${index}`} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/5">
                          <p className="text-sm font-semibold text-slate-900 dark:text-white">{module.title}</p>
                          <p className="mt-1 text-xs text-slate-500 dark:text-slate-300">{module.lessons.length} lessons</p>
                          <p className="mt-2 text-xs text-blue-700 dark:text-blue-200">
                            {module.quiz ? `${module.quiz.questions.length} questions de quiz` : 'Quiz optionnel non genere'}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-[#0b1730]">
                <div className="flex items-center gap-3">
                  <div className="grid h-12 w-12 place-items-center rounded-2xl border border-emerald-300/20 bg-emerald-400/10">
                    <Eye className="h-5 w-5 text-emerald-700 dark:text-emerald-200" />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-slate-900 dark:text-white">Preview etudiant</h2>
                    <p className="text-sm text-slate-600 dark:text-slate-300">Vision instantanee de ce que l apprenant verra si vous publiez maintenant.</p>
                  </div>
                </div>

                <div className="mt-5 overflow-hidden rounded-[24px] border border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-slate-950/40">
                  <div className="relative h-44 overflow-hidden">
                    <img
                      src={thumbnailUrl || course?.thumbnail || course?.thumbnail_url || 'https://images.unsplash.com/photo-1555099962-4199c345e5dd?auto=format&fit=crop&w=1600&q=80'}
                      alt={title || course?.title || 'course preview'}
                      className="h-full w-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/75 via-slate-900/25 to-transparent" />
                    <div className="absolute inset-x-0 bottom-0 p-5 text-white">
                      <p className="text-xs font-bold uppercase tracking-[0.25em] text-blue-200">{selectedCategoryName || 'General'} • {level}</p>
                      <h3 className="mt-2 text-2xl font-black">{title || 'Untitled course'}</h3>
                      <p className="mt-1 max-w-2xl text-sm text-slate-200">{subtitle || description || 'Ajoutez un sous-titre ou une description pour enrichir la carte etudiante.'}</p>
                    </div>
                  </div>

                  <div className="grid gap-4 p-5">
                    <div className="grid gap-3 sm:grid-cols-4">
                      <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm dark:border-white/10 dark:bg-white/5">
                        <p className="text-xs uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Prix</p>
                        <p className="mt-1 font-bold text-slate-900 dark:text-white">${price || '0.00'}</p>
                      </div>
                      <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm dark:border-white/10 dark:bg-white/5">
                        <p className="text-xs uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Duree</p>
                        <p className="mt-1 font-bold text-slate-900 dark:text-white">{estimatedHours || 0}h</p>
                      </div>
                      <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm dark:border-white/10 dark:bg-white/5">
                        <p className="text-xs uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Ressources</p>
                        <p className="mt-1 font-bold text-slate-900 dark:text-white">{completionStats.resourcesCount}</p>
                      </div>
                      <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm dark:border-white/10 dark:bg-white/5">
                        <p className="text-xs uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Publication</p>
                        <p className="mt-1 font-bold text-slate-900 dark:text-white">{isPublished ? 'Published' : 'Draft'}</p>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-white/5">
                      <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Curriculum preview</p>
                      <div className="mt-4 space-y-3">
                        {previewModules.slice(0, 3).map((module, moduleIndex) => (
                          <div key={module.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-slate-950/40">
                            <div className="flex items-center justify-between gap-3">
                              <div>
                                <p className="text-sm font-bold text-slate-900 dark:text-white">Module {moduleIndex + 1}: {module.title}</p>
                                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{module.description || 'Description de module non definie.'}</p>
                              </div>
                              <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-700 dark:bg-blue-500/10 dark:text-blue-300">
                                {module.lessons.length} lessons
                              </span>
                            </div>
                            <div className="mt-3 space-y-2">
                              {module.lessons.slice(0, 3).map((lesson, lessonIndex) => (
                                <div key={lesson.id} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-white/5">
                                  <span className="text-slate-700 dark:text-slate-200">
                                    {lessonIndex + 1}. {lesson.title}
                                  </span>
                                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                                    {lesson.type} • {lesson.duration_seconds ? `${Math.round(lesson.duration_seconds / 60)} min` : 'N/A'} {lesson.is_preview ? '• Preview' : ''}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                        {previewModules.length === 0 && (
                          <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-6 text-sm text-slate-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-400">
                            Aucun module pour le moment. Ajoutez au moins un module et une lesson pour rendre le cours presentable.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-[28px] border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-[#0b1730]">
                <div className="flex flex-col gap-3 sm:flex-row">
                  <input
                    value={newModuleTitle}
                    onChange={(e) => setNewModuleTitle(e.target.value)}
                    placeholder="Ajouter un nouveau module"
                    className="flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:border-white/10 dark:bg-white/5 dark:text-white"
                  />
                  <button
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 py-3 font-bold text-white transition hover:bg-blue-500"
                    onClick={async () => {
                      if (!course || !newModuleTitle.trim()) return;
                      try {
                        await courseService.createModule({
                          course: course.id,
                          title: newModuleTitle.trim(),
                          order: modules.length + 1,
                        });
                        setNewModuleTitle('');
                        await refreshCourse();
                        showToast('Module ajoute.', 'success');
                      } catch {
                        showToast('Creation module impossible.', 'error');
                      }
                    }}
                  >
                    <Plus className="h-4 w-4" />
                    Ajouter un module
                  </button>
                </div>
              </div>

              <section className="rounded-[28px] border border-teal-200 bg-gradient-to-br from-teal-50 via-white to-orange-50 p-6 shadow-sm dark:border-teal-500/20 dark:from-[#0b2230] dark:via-[#0b1730] dark:to-[#1f1622]">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-teal-700/70 dark:text-teal-200/70">Curriculum Tree</p>
                    <h2 className="mt-2 text-2xl font-black text-slate-900 dark:text-white">Construisez le cours par branches</h2>
                    <p className="mt-2 max-w-3xl text-sm text-slate-600 dark:text-slate-300">
                      Commencez par les cartes de modules, entrez dans un module pour voir ses lessons, puis modifiez seulement la branche selectionnee.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <button
                      className={`rounded-2xl px-4 py-3 text-sm font-bold transition ${
                        activeFocus.type === 'course'
                          ? 'bg-teal-600 text-white'
                          : 'border border-slate-200 bg-white text-slate-900 hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10'
                      }`}
                      onClick={() => setActiveFocus({ type: 'course' })}
                    >
                      Vue cours
                    </button>
                    {selectedModule && (
                      <button
                        className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
                        onClick={() => setActiveFocus({ type: 'module', moduleId: selectedModule.id })}
                      >
                        Vue module
                      </button>
                    )}
                    {selectedModule && selectedLesson && (
                      <button
                        className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
                        onClick={() => setActiveFocus({ type: 'lesson', moduleId: selectedModule.id, lessonId: selectedLesson.id })}
                      >
                        Vue lesson
                      </button>
                    )}
                  </div>
                </div>

                <div className="mt-6 grid gap-5 xl:grid-cols-[0.95fr,0.95fr,1.1fr]">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-black uppercase tracking-[0.22em] text-slate-700 dark:text-slate-200">Modules</h3>
                      <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-600 shadow-sm dark:bg-white/10 dark:text-slate-200">
                        {modules.length}
                      </span>
                    </div>
                    <div className="space-y-3">
                      {modules.map((module) => {
                        const moduleLessons = sortByOrder(module.lessons || []);
                        const isActive =
                          (activeFocus.type === 'module' || activeFocus.type === 'lesson') && activeFocus.moduleId === module.id;

                        return (
                          <button
                            key={module.id}
                            className={`block w-full rounded-[24px] border p-4 text-left transition ${
                              isActive
                                ? 'border-teal-500 bg-teal-600 text-white shadow-lg shadow-teal-500/20'
                                : 'border-slate-200 bg-white hover:-translate-y-0.5 hover:border-teal-300 hover:shadow-sm dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:border-teal-400/50'
                            }`}
                            onClick={() =>
                              setActiveFocus({
                                type: 'module',
                                moduleId: module.id,
                              })
                            }
                          >
                            <p className={`text-xs font-bold uppercase tracking-[0.22em] ${isActive ? 'text-teal-50/80' : 'text-slate-500 dark:text-slate-400'}`}>
                              Module {module.order}
                            </p>
                            <p className="mt-2 text-lg font-black">{moduleDrafts[module.id]?.title || module.title}</p>
                            <p className={`mt-2 text-sm ${isActive ? 'text-teal-50/90' : 'text-slate-600 dark:text-slate-300'}`}>
                              {moduleLessons.length} lessons
                            </p>
                          </button>
                        );
                      })}
                      {modules.length === 0 && (
                        <div className="rounded-[24px] border border-dashed border-slate-300 bg-white px-4 py-6 text-sm text-slate-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-400">
                          Commencez par creer votre premier module.
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-black uppercase tracking-[0.22em] text-slate-700 dark:text-slate-200">Lessons</h3>
                      <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-600 shadow-sm dark:bg-white/10 dark:text-slate-200">
                        {selectedModuleLessons.length}
                      </span>
                    </div>
                    {selectedModule ? (
                      <div className="space-y-3">
                        {selectedModuleLessons.map((lesson) => {
                          const lessonDraft = lessonDrafts[lesson.id] || lessonToDraft(lesson);
                          const isLessonActive = activeFocus.type === 'lesson' && activeFocus.lessonId === lesson.id;

                          return (
                            <button
                              key={lesson.id}
                              className={`block w-full rounded-[24px] border p-4 text-left transition ${
                                isLessonActive
                                  ? 'border-orange-400 bg-orange-500 text-slate-950 shadow-lg shadow-orange-500/20'
                                  : 'border-slate-200 bg-white hover:-translate-y-0.5 hover:border-orange-300 hover:shadow-sm dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:border-orange-400/50'
                              }`}
                              onClick={() =>
                                setActiveFocus({
                                  type: 'lesson',
                                  moduleId: selectedModule.id,
                                  lessonId: lesson.id,
                                })
                              }
                            >
                              <p className={`text-xs font-bold uppercase tracking-[0.22em] ${isLessonActive ? 'text-slate-950/70' : 'text-slate-500 dark:text-slate-400'}`}>
                                Lesson {lesson.order}
                              </p>
                              <p className="mt-2 text-base font-black">{lessonDraft.title || lesson.title}</p>
                              <p className={`mt-2 text-sm ${isLessonActive ? 'text-slate-950/70' : 'text-slate-600 dark:text-slate-300'}`}>
                                {lessonDraft.lesson_type || lesson.lesson_type || 'VIDEO'} • {Math.round((lessonDraft.duration_seconds || lesson.duration_seconds || 0) / 60) || 0} min
                              </p>
                            </button>
                          );
                        })}
                        {selectedModuleLessons.length === 0 && (
                          <div className="rounded-[24px] border border-dashed border-slate-300 bg-white px-4 py-6 text-sm text-slate-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-400">
                            Ce module ne contient pas encore de lesson.
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="rounded-[24px] border border-dashed border-slate-300 bg-white px-4 py-6 text-sm text-slate-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-400">
                        Selectionnez un module pour afficher ses lessons.
                      </div>
                    )}
                  </div>

                  <div className="space-y-4 rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#0c162d]">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">Branche active</p>
                      <h3 className="mt-2 text-xl font-black text-slate-900 dark:text-white">
                        {activeFocus.type === 'course'
                          ? title || 'Cours'
                          : activeFocus.type === 'module'
                            ? moduleDrafts[activeFocus.moduleId]?.title || selectedModule?.title || 'Module'
                            : lessonDrafts[activeFocus.lessonId]?.title || selectedLesson?.title || 'Lesson'}
                      </h3>
                      <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                        {activeFocus.type === 'course'
                          ? 'Travaillez le socle du cours, sa promesse et sa structure globale.'
                          : activeFocus.type === 'module'
                            ? 'Raffinez les objectifs, le positionnement et la progression du module.'
                            : 'Rendez la lesson claire, actionnable et facile a publier.'}
                      </p>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
                      <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm dark:bg-white/5">
                        <p className="text-xs uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Focus</p>
                        <p className="mt-1 font-bold text-slate-900 dark:text-white">{activeFocus.type}</p>
                      </div>
                      <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm dark:bg-white/5">
                        <p className="text-xs uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Completion</p>
                        <p className="mt-1 font-bold text-slate-900 dark:text-white">{completionStats.score}%</p>
                      </div>
                      <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm dark:bg-white/5">
                        <p className="text-xs uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Selection</p>
                        <p className="mt-1 font-bold text-slate-900 dark:text-white">{selectedModuleLessons.length} noeuds enfants</p>
                      </div>
                    </div>
                    <div className="rounded-[22px] border border-blue-200 bg-blue-50 p-4 dark:border-blue-500/20 dark:bg-blue-500/10">
                      <div className="flex items-center gap-3">
                        <Bot className="h-5 w-5 text-blue-700 dark:text-blue-200" />
                        <div>
                          <p className="font-bold text-slate-900 dark:text-white">Assistant IA de branche</p>
                          <p className="text-sm text-slate-600 dark:text-slate-300">Demandez une amelioration precise pour le noeud selectionne.</p>
                        </div>
                      </div>
                      <input
                        value={branchAiPrompt}
                        onChange={(e) => setBranchAiPrompt(e.target.value)}
                        placeholder="Exemple: restructure ce module pour qu il monte en difficulte et ajoute une pratique concrete"
                        className="mt-4 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:border-white/10 dark:bg-white/5 dark:text-white"
                      />
                      <button
                        className="mt-3 inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-blue-500 disabled:opacity-60"
                        disabled={isBranchGenerating || !branchAiPrompt.trim()}
                        onClick={runBranchAssistant}
                      >
                        <Sparkles className="h-4 w-4" />
                        {isBranchGenerating ? 'Generation...' : 'Aider cette branche'}
                      </button>
                    </div>
                  </div>
                </div>
              </section>

              <div className="rounded-[28px] border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-[#0b1730]">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">Assignments</h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Projets, essais, quiz notes et travaux evalues du cours.</p>
                  </div>
                </div>
                <div className="mt-4 grid gap-4 xl:grid-cols-[1fr,1fr,0.6fr,0.5fr,auto]">
                  <input
                    value={newAssignmentDraft.title}
                    onChange={(e) => setNewAssignmentDraft((prev) => ({ ...prev, title: e.target.value }))}
                    placeholder="Titre assignment"
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:border-white/10 dark:bg-white/5 dark:text-white"
                  />
                  <input
                    value={newAssignmentDraft.description}
                    onChange={(e) => setNewAssignmentDraft((prev) => ({ ...prev, description: e.target.value }))}
                    placeholder="Description"
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:border-white/10 dark:bg-white/5 dark:text-white"
                  />
                  <input
                    type="datetime-local"
                    value={newAssignmentDraft.due_date ? newAssignmentDraft.due_date.slice(0, 16) : ''}
                    onChange={(e) => setNewAssignmentDraft((prev) => ({ ...prev, due_date: new Date(e.target.value).toISOString() }))}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:border-white/10 dark:bg-white/5 dark:text-white"
                  />
                  <select
                    value={newAssignmentDraft.type}
                    onChange={(e) => setNewAssignmentDraft((prev) => ({ ...prev, type: e.target.value }))}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:border-white/10 dark:bg-white/5 dark:text-white"
                  >
                    <option value="PROJECT">Project</option>
                    <option value="ESSAY">Essay</option>
                    <option value="REPORT">Report</option>
                    <option value="CODE">Code</option>
                    <option value="QUIZ">Quiz</option>
                  </select>
                  <button
                    className="rounded-2xl bg-amber-400 px-4 py-3 font-bold text-slate-950 transition hover:bg-amber-300"
                    onClick={async () => {
                      if (!course || !newAssignmentDraft.title.trim() || !newAssignmentDraft.due_date) return;
                      try {
                        await learningService.createAssignment({
                          course: course.id,
                          title: newAssignmentDraft.title.trim(),
                          description: newAssignmentDraft.description,
                          due_date: newAssignmentDraft.due_date,
                          points: newAssignmentDraft.points,
                          type: newAssignmentDraft.type,
                        });
                        setNewAssignmentDraft(emptyAssignmentDraft);
                        await refreshCourse();
                        showToast('Assignment ajoute.', 'success');
                      } catch {
                        showToast('Creation assignment impossible.', 'error');
                      }
                    }}
                  >
                    Ajouter
                  </button>
                </div>
                <div className="mt-4 space-y-3">
                  {assignments.map((assignment) => {
                    const draft = assignmentDrafts[assignment.id];
                    return (
                      <div key={assignment.id} className="grid gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/[0.03] xl:grid-cols-[1fr,1fr,0.6fr,0.5fr,0.35fr,auto,auto]">
                        <input
                          value={draft?.title || ''}
                          onChange={(e) =>
                            setAssignmentDrafts((prev) => ({
                              ...prev,
                              [assignment.id]: { ...(prev[assignment.id] || emptyAssignmentDraft), ...draft, title: e.target.value },
                            }))
                          }
                          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:border-white/10 dark:bg-white/5 dark:text-white"
                        />
                        <input
                          value={draft?.description || ''}
                          onChange={(e) =>
                            setAssignmentDrafts((prev) => ({
                              ...prev,
                              [assignment.id]: { ...(prev[assignment.id] || emptyAssignmentDraft), ...draft, description: e.target.value },
                            }))
                          }
                          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:border-white/10 dark:bg-white/5 dark:text-white"
                        />
                        <input
                          type="datetime-local"
                          value={draft?.due_date ? draft.due_date.slice(0, 16) : ''}
                          onChange={(e) =>
                            setAssignmentDrafts((prev) => ({
                              ...prev,
                              [assignment.id]: { ...(prev[assignment.id] || emptyAssignmentDraft), ...draft, due_date: new Date(e.target.value).toISOString() },
                            }))
                          }
                          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:border-white/10 dark:bg-white/5 dark:text-white"
                        />
                        <select
                          value={draft?.type || 'PROJECT'}
                          onChange={(e) =>
                            setAssignmentDrafts((prev) => ({
                              ...prev,
                              [assignment.id]: { ...(prev[assignment.id] || emptyAssignmentDraft), ...draft, type: e.target.value },
                            }))
                          }
                          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:border-white/10 dark:bg-white/5 dark:text-white"
                        >
                          <option value="PROJECT">Project</option>
                          <option value="ESSAY">Essay</option>
                          <option value="REPORT">Report</option>
                          <option value="CODE">Code</option>
                          <option value="QUIZ">Quiz</option>
                        </select>
                        <input
                          type="number"
                          min="0"
                          value={draft?.points || 100}
                          onChange={(e) =>
                            setAssignmentDrafts((prev) => ({
                              ...prev,
                              [assignment.id]: { ...(prev[assignment.id] || emptyAssignmentDraft), ...draft, points: Number(e.target.value) || 0 },
                            }))
                          }
                          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:border-white/10 dark:bg-white/5 dark:text-white"
                        />
                        <button
                          className="rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-500"
                          onClick={async () => {
                            try {
                              await learningService.updateAssignment(assignment.id, draft);
                              await refreshCourse();
                              showToast('Assignment mis a jour.', 'success');
                            } catch {
                              showToast('Mise a jour assignment impossible.', 'error');
                            }
                          }}
                        >
                          Enregistrer
                        </button>
                        <button
                          className="rounded-2xl border border-red-300 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 transition hover:bg-red-100 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200 dark:hover:bg-red-500/20"
                          onClick={async () => {
                            try {
                              await learningService.deleteAssignment(assignment.id);
                              await refreshCourse();
                              showToast('Assignment supprime.', 'success');
                            } catch {
                              showToast('Suppression assignment impossible.', 'error');
                            }
                          }}
                        >
                          Supprimer
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-6">
                {modules
                  .filter((module) => (activeFocus.type === 'course' ? false : module.id === activeFocus.moduleId))
                  .map((module) => {
                    const orderedLessons = sortByOrder(module.lessons || []);
                    const moduleDraft = moduleDrafts[module.id] || moduleToDraft(module);
                    const quiz = quizByModule[module.id];
                    const quizDraft = quizDrafts[module.id] || emptyQuizDraft;
                    const actualModuleIndex = modules.findIndex((item) => item.id === module.id);

                  return (
                    <article key={module.id} className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-[#0b1730] dark:shadow-xl dark:shadow-slate-950/20">
                      <div className="border-b border-slate-200 bg-gradient-to-r from-slate-50 to-transparent px-6 py-5 dark:border-white/10 dark:from-white/5">
                        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                          <div className="space-y-3">
                            <p className="text-xs uppercase tracking-[0.3em] text-blue-300/70">Module {module.order}</p>
                            <div className="flex flex-col gap-3 md:flex-row">
                              <input
                                value={moduleDraft.title}
                                onChange={(e) =>
                                  setModuleDrafts((prev) => ({
                                    ...prev,
                                    [module.id]: { ...moduleDraft, title: e.target.value },
                                  }))
                                }
                                className="min-w-[280px] rounded-2xl border border-slate-200 bg-white px-4 py-3 text-lg font-bold text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:border-white/10 dark:bg-white/5 dark:text-white"
                              />
                              <button
                                className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-100 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
                                onClick={async () => {
                                  try {
                                    await courseService.updateModule(module.id, {
                                      title: moduleDraft.title.trim() || module.title,
                                      description: moduleDraft.description,
                                      learning_objectives: parseLines(moduleDraft.learning_objectives_text),
                                      estimated_minutes: moduleDraft.estimated_minutes,
                                      is_published: moduleDraft.is_published,
                                    });
                                    await refreshCourse();
                                    showToast('Module mis a jour.', 'success');
                                  } catch {
                                    showToast('Mise a jour du module impossible.', 'error');
                                  }
                                }}
                              >
                                Enregistrer le module
                              </button>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-slate-700 transition hover:bg-slate-100 disabled:opacity-40 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
                              disabled={actualModuleIndex === 0}
                              onClick={() => moveModule(module.id, 'up')}
                            >
                              <ChevronUp className="h-4 w-4" />
                            </button>
                            <button
                              className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-slate-700 transition hover:bg-slate-100 disabled:opacity-40 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
                              disabled={actualModuleIndex === modules.length - 1}
                              onClick={() => moveModule(module.id, 'down')}
                            >
                              <ChevronDown className="h-4 w-4" />
                            </button>
                            <button
                              className="rounded-2xl border border-red-400/20 bg-red-500/10 p-3 text-red-200 transition hover:bg-red-500/20"
                              onClick={async () => {
                                try {
                                  await courseService.deleteModule(module.id);
                                  await refreshCourse();
                                  showToast('Module supprime.', 'success');
                                } catch {
                                  showToast('Suppression module impossible.', 'error');
                                }
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                            <button
                              className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-100 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
                              onClick={() =>
                                setExpandedModules((prev) => ({
                                  ...prev,
                                  [module.id]: !prev[module.id],
                                }))
                              }
                            >
                              {expandedModules[module.id] ? 'Masquer le detail' : 'Afficher le detail'}
                            </button>
                          </div>
                        </div>
                      </div>

                      {expandedModules[module.id] && (
                        <div className="space-y-6 p-6">
                          <section className="grid gap-4 rounded-[24px] border border-slate-200 bg-slate-50 p-5 dark:border-white/10 dark:bg-white/[0.03] xl:grid-cols-2">
                            <RichEditorField
                              label="Description du module"
                              value={moduleDraft.description}
                              onChange={(value) =>
                                setModuleDrafts((prev) => ({
                                  ...prev,
                                  [module.id]: { ...moduleDraft, description: value },
                                }))
                              }
                              minHeight={180}
                            />
                            <div className="space-y-4">
                              <RichEditorField
                                label="Objectifs du module"
                                value={moduleDraft.learning_objectives_text}
                                onChange={(value) =>
                                  setModuleDrafts((prev) => ({
                                    ...prev,
                                    [module.id]: { ...moduleDraft, learning_objectives_text: value },
                                  }))
                                }
                                plainText
                                minHeight={180}
                              />
                              <div className="grid gap-4 sm:grid-cols-2">
                                <input
                                  type="number"
                                  min="0"
                                  value={moduleDraft.estimated_minutes}
                                  onChange={(e) =>
                                    setModuleDrafts((prev) => ({
                                      ...prev,
                                      [module.id]: { ...moduleDraft, estimated_minutes: Number(e.target.value) || 0 },
                                    }))
                                  }
                                  placeholder="Duree estimee en minutes"
                                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:border-white/10 dark:bg-white/5 dark:text-white"
                                />
                                <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 dark:border-white/10 dark:bg-white/5 dark:text-white">
                                  <input
                                    type="checkbox"
                                    checked={moduleDraft.is_published}
                                    onChange={(e) =>
                                      setModuleDrafts((prev) => ({
                                        ...prev,
                                        [module.id]: { ...moduleDraft, is_published: e.target.checked },
                                      }))
                                    }
                                    className="h-4 w-4 rounded border-white/20 bg-slate-900 text-blue-500"
                                  />
                                  Module publie
                                </label>
                              </div>
                            </div>
                          </section>

                          <section className="space-y-4">
                            <div className="flex items-center justify-between">
                              <div>
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Lessons</h3>
                                <p className="text-sm text-slate-400">Contenu detaille, URL video, duree et visibilite preview.</p>
                              </div>
                            </div>

                            {orderedLessons
                              .filter((lesson) => (activeFocus.type === 'lesson' ? lesson.id === activeFocus.lessonId : true))
                              .map((lesson, lessonIndex) => {
                              const draft = lessonDrafts[lesson.id] || lessonToDraft(lesson);
                              const lessonQuiz = quizByLesson[lesson.id];
                              return (
                                <div key={lesson.id} className="rounded-[24px] border border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-white/[0.03]">
                                  <div className="flex flex-col gap-4 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
                                    <div className="flex items-center gap-3">
                                      <div className="grid h-11 w-11 place-items-center rounded-2xl bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-200">
                                        <Video className="h-4 w-4" />
                                      </div>
                                      <div>
                                        <p className="font-semibold text-slate-900 dark:text-white">{draft.title || `Lesson ${lesson.order}`}</p>
                                        <p className="text-sm text-slate-400">
                                          {Math.round((draft.duration_seconds || 0) / 60) || 0} min
                                          {draft.is_preview ? ' • Preview' : ' • Premium'}
                                        </p>
                                      </div>
                                    </div>

                                    <div className="flex flex-wrap items-center gap-2">
                                      <button
                                        className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-slate-700 transition hover:bg-slate-100 disabled:opacity-40 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
                                        disabled={lessonIndex === 0}
                                        onClick={() => moveLesson(module, lesson.id, 'up')}
                                      >
                                        <ChevronUp className="h-4 w-4" />
                                      </button>
                                      <button
                                        className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-slate-700 transition hover:bg-slate-100 disabled:opacity-40 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
                                        disabled={lessonIndex === orderedLessons.length - 1}
                                        onClick={() => moveLesson(module, lesson.id, 'down')}
                                      >
                                        <ChevronDown className="h-4 w-4" />
                                      </button>
                                      <button
                                        className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-100 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
                                        onClick={() =>
                                          setExpandedLessons((prev) => ({
                                            ...prev,
                                            [lesson.id]: !prev[lesson.id],
                                          }))
                                        }
                                      >
                                        {expandedLessons[lesson.id] ? 'Masquer' : 'Editer'}
                                      </button>
                                      <button
                                        className="rounded-2xl border border-red-400/20 bg-red-500/10 p-3 text-red-200 transition hover:bg-red-500/20"
                                        onClick={async () => {
                                          try {
                                            await courseService.deleteLesson(lesson.id);
                                            await refreshCourse();
                                            showToast('Lesson supprimee.', 'success');
                                          } catch {
                                            showToast('Suppression lesson impossible.', 'error');
                                          }
                                        }}
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </button>
                                    </div>
                                  </div>

                                  {expandedLessons[lesson.id] && (
                                    <div className="grid gap-4 border-t border-slate-200 px-5 py-5 xl:grid-cols-[1fr,0.85fr] dark:border-white/10">
                                      <div className="space-y-4">
                                        <input
                                          value={draft.title}
                                          onChange={(e) =>
                                            setLessonDrafts((prev) => ({
                                              ...prev,
                                              [lesson.id]: { ...draft, title: e.target.value },
                                            }))
                                          }
                                          placeholder="Titre de la lesson"
                                          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:border-white/10 dark:bg-white/5 dark:text-white"
                                        />
                                        <RichEditorField
                                          label="Contenu detaille de la lesson"
                                          value={draft.content}
                                          onChange={(value) =>
                                            setLessonDrafts((prev) => ({
                                              ...prev,
                                              [lesson.id]: { ...draft, content: value },
                                            }))
                                          }
                                          minHeight={240}
                                        />
                                      </div>

                                      <div className="space-y-4">
                                        <input
                                          value={draft.video_url}
                                          onChange={(e) =>
                                            setLessonDrafts((prev) => ({
                                              ...prev,
                                              [lesson.id]: { ...draft, video_url: e.target.value },
                                            }))
                                          }
                                          placeholder="URL video"
                                          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:border-white/10 dark:bg-white/5 dark:text-white"
                                        />
                                        <div className="grid gap-4 sm:grid-cols-2">
                                          <select
                                            value={draft.lesson_type || 'VIDEO'}
                                            onChange={(e) =>
                                              setLessonDrafts((prev) => ({
                                                ...prev,
                                                [lesson.id]: { ...draft, lesson_type: e.target.value as CourseLesson['lesson_type'] },
                                              }))
                                            }
                                            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:border-white/10 dark:bg-white/5 dark:text-white"
                                          >
                                            <option value="VIDEO">Video</option>
                                            <option value="TEXT">Text</option>
                                            <option value="QUIZ">Quiz</option>
                                            <option value="ASSIGNMENT">Assignment</option>
                                            <option value="LIVE">Live</option>
                                            <option value="DOWNLOAD">Download</option>
                                          </select>
                                          <select
                                            value={draft.status || 'DRAFT'}
                                            onChange={(e) =>
                                              setLessonDrafts((prev) => ({
                                                ...prev,
                                                [lesson.id]: { ...draft, status: e.target.value as CourseLesson['status'] },
                                              }))
                                            }
                                            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:border-white/10 dark:bg-white/5 dark:text-white"
                                          >
                                            <option value="DRAFT">Draft</option>
                                            <option value="PUBLISHED">Published</option>
                                          </select>
                                        </div>
                                        <RichEditorField
                                          label="Transcript / script"
                                          value={draft.transcript || ''}
                                          onChange={(value) =>
                                            setLessonDrafts((prev) => ({
                                              ...prev,
                                              [lesson.id]: { ...draft, transcript: value },
                                            }))
                                          }
                                          minHeight={180}
                                        />
                                        <RichEditorField
                                          label="Notes instructeur"
                                          value={draft.instructor_notes || ''}
                                          onChange={(value) =>
                                            setLessonDrafts((prev) => ({
                                              ...prev,
                                              [lesson.id]: { ...draft, instructor_notes: value },
                                            }))
                                          }
                                          minHeight={140}
                                        />
                                        <div className="grid gap-4 sm:grid-cols-2">
                                          <input
                                            type="number"
                                            min="0"
                                            value={draft.duration_seconds}
                                            onChange={(e) =>
                                              setLessonDrafts((prev) => ({
                                                ...prev,
                                                [lesson.id]: { ...draft, duration_seconds: Number(e.target.value) || 0 },
                                              }))
                                            }
                                            placeholder="Duree en secondes"
                                            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:border-white/10 dark:bg-white/5 dark:text-white"
                                          />
                                          <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 dark:border-white/10 dark:bg-white/5 dark:text-white">
                                            <input
                                              type="checkbox"
                                              checked={draft.is_preview}
                                              onChange={(e) =>
                                                setLessonDrafts((prev) => ({
                                                  ...prev,
                                                  [lesson.id]: { ...draft, is_preview: e.target.checked },
                                                }))
                                              }
                                              className="h-4 w-4 rounded border-white/20 bg-slate-900 text-blue-500"
                                            />
                                            Accessible en preview
                                          </label>
                                        </div>
                                        {(lesson.video || draft.video_url || draft.video_file) && (
                                          <div className="rounded-2xl border border-slate-200 bg-slate-100 p-3 dark:border-white/10 dark:bg-slate-900/40">
                                            <video
                                              controls
                                              className="max-h-52 w-full rounded-xl bg-black"
                                              src={draft.video_file ? URL.createObjectURL(draft.video_file) : draft.video_url || lesson.video}
                                            />
                                          </div>
                                        )}
                                        <div className="grid gap-3 sm:grid-cols-2">
                                          <label className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-blue-400 dark:border-white/10 dark:bg-white/5 dark:text-slate-200">
                                            Upload video
                                            <input
                                              type="file"
                                              accept="video/*"
                                              className="mt-2 block w-full text-xs"
                                              onChange={(e) => {
                                                const file = e.target.files?.[0] || null;
                                                setLessonDrafts((prev) => ({
                                                  ...prev,
                                                  [lesson.id]: { ...draft, video_file: file, video_url: file ? '' : draft.video_url },
                                                }));
                                              }}
                                            />
                                          </label>
                                          <div className="grid grid-cols-2 gap-3">
                                            <button
                                              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-100 disabled:opacity-40 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
                                              disabled={Boolean(recordingTarget && recordingTarget !== `lesson:${lesson.id}`)}
                                              onClick={() => startRecording(`lesson:${lesson.id}`)}
                                            >
                                              <Radio className="h-4 w-4" />
                                              Record
                                            </button>
                                            <button
                                              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-red-300 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 transition hover:bg-red-100 disabled:opacity-40 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200 dark:hover:bg-red-500/20"
                                              disabled={recordingTarget !== `lesson:${lesson.id}`}
                                              onClick={stopRecording}
                                            >
                                              <Square className="h-4 w-4" />
                                              Stop
                                            </button>
                                          </div>
                                        </div>
                                        <button
                                          className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-4 py-3 font-bold text-white transition hover:bg-blue-500"
                                          onClick={async () => {
                                            try {
                                              await courseService.updateLesson(lesson.id, draft);
                                              await refreshCourse();
                                              showToast('Lesson mise a jour.', 'success');
                                            } catch {
                                              showToast('Mise a jour lesson impossible.', 'error');
                                            }
                                          }}
                                        >
                                          <Save className="h-4 w-4" />
                                          Enregistrer la lesson
                                        </button>
                                      </div>
                                    </div>
                                  )}
                                  {expandedLessons[lesson.id] && (
                                    <div className="border-t border-slate-200 px-5 py-5 dark:border-white/10">
                                      <div className="flex items-center gap-3">
                                        <FileText className="h-4 w-4 text-blue-600 dark:text-blue-300" />
                                        <div>
                                          <p className="font-semibold text-slate-900 dark:text-white">Resources</p>
                                          <p className="text-sm text-slate-500 dark:text-slate-400">PDF, liens, ZIP ou autres fichiers telechargeables.</p>
                                        </div>
                                      </div>
                                      <div className="mt-4 space-y-3">
                                        {(lesson.resources || []).map((resource) => (
                                          <div
                                            key={resource.id}
                                            className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-white/5"
                                          >
                                            <div className="grid gap-4 xl:grid-cols-[1fr,1fr,auto]">
                                              <div className="space-y-3">
                                                <input
                                                  value={resourceEditDrafts[resource.id]?.title || resource.title}
                                                  onChange={(e) =>
                                                    setResourceEditDrafts((prev) => ({
                                                      ...prev,
                                                      [resource.id]: { ...(prev[resource.id] || emptyResourceDraft), title: e.target.value },
                                                    }))
                                                  }
                                                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:border-white/10 dark:bg-slate-900/40 dark:text-white"
                                                />
                                                <RichEditorField
                                                  label="Description de la ressource"
                                                  value={resourceEditDrafts[resource.id]?.description || resource.description}
                                                  onChange={(value) =>
                                                    setResourceEditDrafts((prev) => ({
                                                      ...prev,
                                                      [resource.id]: { ...(prev[resource.id] || emptyResourceDraft), description: value },
                                                    }))
                                                  }
                                                  minHeight={140}
                                                />
                                              </div>
                                              <div className="space-y-3">
                                                <select
                                                  value={resourceEditDrafts[resource.id]?.kind || resource.kind}
                                                  onChange={(e) =>
                                                    setResourceEditDrafts((prev) => ({
                                                      ...prev,
                                                      [resource.id]: { ...(prev[resource.id] || emptyResourceDraft), kind: e.target.value as LessonResource['kind'] },
                                                    }))
                                                  }
                                                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:border-white/10 dark:bg-slate-900/40 dark:text-white"
                                                >
                                                  <option value="PDF">PDF</option>
                                                  <option value="LINK">Link</option>
                                                  <option value="ZIP">ZIP</option>
                                                  <option value="OTHER">Other</option>
                                                </select>
                                                <input
                                                  value={resourceEditDrafts[resource.id]?.file_url || resource.file_url}
                                                  onChange={(e) =>
                                                    setResourceEditDrafts((prev) => ({
                                                      ...prev,
                                                      [resource.id]: { ...(prev[resource.id] || emptyResourceDraft), file_url: e.target.value },
                                                    }))
                                                  }
                                                  placeholder="URL externe"
                                                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:border-white/10 dark:bg-slate-900/40 dark:text-white"
                                                />
                                                <label className="block rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 dark:border-white/10 dark:bg-slate-900/40 dark:text-slate-200">
                                                  Remplacer le fichier
                                                  <input
                                                    type="file"
                                                    className="mt-2 block w-full text-xs"
                                                    onChange={(e) =>
                                                      setResourceEditDrafts((prev) => ({
                                                        ...prev,
                                                        [resource.id]: { ...(prev[resource.id] || emptyResourceDraft), file: e.target.files?.[0] || null },
                                                      }))
                                                    }
                                                  />
                                                </label>
                                              </div>
                                              <div className="flex flex-col gap-3">
                                                {(resource.file_download_url || resource.file_url) && (
                                                  <a
                                                    href={resource.file_download_url || resource.file_url}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-blue-600 hover:bg-slate-100 dark:border-white/10 dark:bg-white/5 dark:text-blue-300"
                                                  >
                                                    <Link2 className="h-4 w-4" />
                                                    Ouvrir
                                                  </a>
                                                )}
                                                <button
                                                  className="rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-500"
                                                  onClick={async () => {
                                                    const draftResource = resourceEditDrafts[resource.id] || emptyResourceDraft;
                                                    try {
                                                      await courseService.updateResource(resource.id, {
                                                        title: draftResource.title || resource.title,
                                                        kind: draftResource.kind || resource.kind,
                                                        description: draftResource.description,
                                                        file_url: draftResource.file_url,
                                                        file: draftResource.file || undefined,
                                                      });
                                                      await refreshCourse();
                                                      showToast('Ressource mise a jour.', 'success');
                                                    } catch {
                                                      showToast('Mise a jour ressource impossible.', 'error');
                                                    }
                                                  }}
                                                >
                                                  Enregistrer
                                                </button>
                                                <button
                                                  className="rounded-2xl border border-red-300 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 transition hover:bg-red-100 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200 dark:hover:bg-red-500/20"
                                                  onClick={async () => {
                                                    try {
                                                      await courseService.deleteResource(resource.id);
                                                      await refreshCourse();
                                                      showToast('Ressource supprimee.', 'success');
                                                    } catch {
                                                      showToast('Suppression ressource impossible.', 'error');
                                                    }
                                                  }}
                                                >
                                                  Supprimer
                                                </button>
                                              </div>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                      <div className="mt-4 grid gap-4 rounded-2xl border border-dashed border-blue-300 bg-blue-50/80 p-4 dark:border-blue-400/25 dark:bg-blue-500/[0.04] xl:grid-cols-[1fr,1fr,auto]">
                                        <div className="space-y-3">
                                          <input
                                            value={resourceDrafts[lesson.id]?.title || ''}
                                            onChange={(e) =>
                                              setResourceDrafts((prev) => ({
                                                ...prev,
                                                [lesson.id]: { ...(prev[lesson.id] || emptyResourceDraft), title: e.target.value },
                                              }))
                                            }
                                            placeholder="Titre de la ressource"
                                            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:border-white/10 dark:bg-white/5 dark:text-white"
                                          />
                                          <textarea
                                            value={resourceDrafts[lesson.id]?.description || ''}
                                            onChange={(e) =>
                                              setResourceDrafts((prev) => ({
                                                ...prev,
                                                [lesson.id]: { ...(prev[lesson.id] || emptyResourceDraft), description: e.target.value },
                                              }))
                                            }
                                            rows={3}
                                            placeholder="Description"
                                            className="w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:border-white/10 dark:bg-white/5 dark:text-white"
                                          />
                                        </div>
                                        <div className="space-y-3">
                                          <select
                                            value={resourceDrafts[lesson.id]?.kind || 'PDF'}
                                            onChange={(e) =>
                                              setResourceDrafts((prev) => ({
                                                ...prev,
                                                [lesson.id]: { ...(prev[lesson.id] || emptyResourceDraft), kind: e.target.value as LessonResource['kind'] },
                                              }))
                                            }
                                            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:border-white/10 dark:bg-white/5 dark:text-white"
                                          >
                                            <option value="PDF">PDF</option>
                                            <option value="LINK">Link</option>
                                            <option value="ZIP">ZIP</option>
                                            <option value="OTHER">Other</option>
                                          </select>
                                          <input
                                            value={resourceDrafts[lesson.id]?.file_url || ''}
                                            onChange={(e) =>
                                              setResourceDrafts((prev) => ({
                                                ...prev,
                                                [lesson.id]: { ...(prev[lesson.id] || emptyResourceDraft), file_url: e.target.value },
                                              }))
                                            }
                                            placeholder="URL externe optionnelle"
                                            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:border-white/10 dark:bg-white/5 dark:text-white"
                                          />
                                          <label className="block rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-blue-400 dark:border-white/10 dark:bg-white/5 dark:text-slate-200">
                                            Upload fichier
                                            <input
                                              type="file"
                                              accept=".pdf,.zip,.doc,.docx,.ppt,.pptx,.txt,.md,image/*"
                                              className="mt-2 block w-full text-xs"
                                              onChange={(e) => {
                                                const file = e.target.files?.[0] || null;
                                                setResourceDrafts((prev) => ({
                                                  ...prev,
                                                  [lesson.id]: { ...(prev[lesson.id] || emptyResourceDraft), file },
                                                }));
                                              }}
                                            />
                                          </label>
                                        </div>
                                        <div className="flex items-end">
                                          <button
                                            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-amber-400 px-4 py-3 font-bold text-slate-950 transition hover:bg-amber-300"
                                            onClick={async () => {
                                              const draftResource = resourceDrafts[lesson.id] || emptyResourceDraft;
                                              if (!draftResource.title.trim()) {
                                                showToast('Ajoutez un titre de ressource.', 'error');
                                                return;
                                              }
                                              try {
                                                await courseService.createResource({
                                                  lesson: lesson.id,
                                                  title: draftResource.title.trim(),
                                                  kind: draftResource.kind,
                                                  description: draftResource.description,
                                                  file_url: draftResource.file_url,
                                                  file: draftResource.file || undefined,
                                                });
                                                await refreshCourse();
                                                showToast('Ressource ajoutee.', 'success');
                                              } catch {
                                                showToast('Creation ressource impossible.', 'error');
                                              }
                                            }}
                                          >
                                            <Plus className="h-4 w-4" />
                                            Ajouter la ressource
                                          </button>
                                        </div>
                                      </div>
                                      <div className="mt-6 rounded-[22px] border border-blue-200 bg-blue-50/60 p-4 dark:border-blue-400/20 dark:bg-slate-900/30">
                                        <div className="mb-4 flex items-center justify-between">
                                          <div>
                                            <p className="font-semibold text-slate-900 dark:text-white">Lesson Quiz</p>
                                            <p className="text-sm text-slate-500 dark:text-slate-400">Quiz specifique a cette lesson.</p>
                                          </div>
                                          {lessonQuiz && (
                                            <button
                                              className="rounded-2xl border border-red-300 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-100 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200 dark:hover:bg-red-500/20"
                                              onClick={async () => {
                                                try {
                                                  await learningService.deleteQuiz(lessonQuiz.id);
                                                  await refreshCourse();
                                                  showToast('Quiz de lesson supprime.', 'success');
                                                } catch {
                                                  showToast('Suppression quiz impossible.', 'error');
                                                }
                                              }}
                                            >
                                              Supprimer le quiz
                                            </button>
                                          )}
                                        </div>
                                        <div className="grid gap-4 lg:grid-cols-[1fr,0.5fr,0.5fr,auto]">
                                          <input
                                            value={quizDrafts[lesson.id]?.title || 'Lesson Quiz'}
                                            onChange={(e) =>
                                              setQuizDrafts((prev) => ({
                                                ...prev,
                                                [lesson.id]: { ...(prev[lesson.id] || emptyQuizDraft), title: e.target.value },
                                              }))
                                            }
                                            placeholder="Titre du quiz"
                                            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:border-white/10 dark:bg-white/5 dark:text-white"
                                          />
                                          <input
                                            type="number"
                                            min="0"
                                            max="100"
                                            value={quizDrafts[lesson.id]?.passing_score || 70}
                                            onChange={(e) =>
                                              setQuizDrafts((prev) => ({
                                                ...prev,
                                                [lesson.id]: { ...(prev[lesson.id] || emptyQuizDraft), passing_score: Number(e.target.value) || 0 },
                                              }))
                                            }
                                            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:border-white/10 dark:bg-white/5 dark:text-white"
                                          />
                                          <input
                                            type="number"
                                            min="0"
                                            value={quizDrafts[lesson.id]?.time_limit_minutes || 10}
                                            onChange={(e) =>
                                              setQuizDrafts((prev) => ({
                                                ...prev,
                                                [lesson.id]: { ...(prev[lesson.id] || emptyQuizDraft), time_limit_minutes: Number(e.target.value) || 0 },
                                              }))
                                            }
                                            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:border-white/10 dark:bg-white/5 dark:text-white"
                                          />
                                          <button
                                            className="rounded-2xl bg-blue-600 px-4 py-3 font-bold text-white transition hover:bg-blue-500"
                                            onClick={async () => {
                                              try {
                                                const draftQuiz = quizDrafts[lesson.id] || emptyQuizDraft;
                                                if (lessonQuiz) {
                                                  await learningService.updateQuiz(lessonQuiz.id, draftQuiz);
                                                } else {
                                                  await learningService.createQuiz({
                                                    lesson: lesson.id,
                                                    title: draftQuiz.title || 'Lesson Quiz',
                                                    passing_score: draftQuiz.passing_score,
                                                    time_limit_minutes: draftQuiz.time_limit_minutes,
                                                  });
                                                }
                                                await refreshCourse();
                                                showToast('Quiz de lesson enregistre.', 'success');
                                              } catch {
                                                showToast('Sauvegarde quiz impossible.', 'error');
                                              }
                                            }}
                                          >
                                            Enregistrer
                                          </button>
                                        </div>
                                        {lessonQuiz && (
                                          <div className="mt-4 space-y-4">
                                            {(sortByOrder(lessonQuiz.questions || [])).map((question, questionIndex) => {
                                              const draftQuestion = questionDrafts[question.id] || questionToDraft(question);
                                              return (
                                                <div key={question.id} className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-white/5">
                                                  <div className="mb-3 flex items-center justify-between gap-3">
                                                    <p className="text-sm font-semibold text-slate-900 dark:text-white">Question {question.order}</p>
                                                    <div className="flex gap-2">
                                                      <button
                                                        className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-slate-700 transition hover:bg-slate-100 disabled:opacity-40 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
                                                        disabled={questionIndex === 0}
                                                        onClick={() => moveQuestion(lessonQuiz, question.id, 'up')}
                                                      >
                                                        <ChevronUp className="h-4 w-4" />
                                                      </button>
                                                      <button
                                                        className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-slate-700 transition hover:bg-slate-100 disabled:opacity-40 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
                                                        disabled={questionIndex === (lessonQuiz.questions || []).length - 1}
                                                        onClick={() => moveQuestion(lessonQuiz, question.id, 'down')}
                                                      >
                                                        <ChevronDown className="h-4 w-4" />
                                                      </button>
                                                      <button
                                                        className="rounded-2xl border border-red-300 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 transition hover:bg-red-100 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200 dark:hover:bg-red-500/20"
                                                        onClick={async () => {
                                                          try {
                                                            await learningService.deleteQuizQuestion(question.id);
                                                            await refreshCourse();
                                                            showToast('Question supprimee.', 'success');
                                                          } catch {
                                                            showToast('Suppression question impossible.', 'error');
                                                          }
                                                        }}
                                                      >
                                                        Supprimer
                                                      </button>
                                                    </div>
                                                  </div>
                                                  <div className="grid gap-4 xl:grid-cols-[1fr,0.7fr]">
                                                    <div className="space-y-3">
                                                      <textarea
                                                        value={draftQuestion.prompt}
                                                        onChange={(e) =>
                                                          setQuestionDrafts((prev) => ({
                                                            ...prev,
                                                            [question.id]: { ...draftQuestion, prompt: e.target.value },
                                                          }))
                                                        }
                                                        rows={3}
                                                        className="w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:border-white/10 dark:bg-slate-900/40 dark:text-white"
                                                      />
                                                      <textarea
                                                        value={draftQuestion.optionsText}
                                                        onChange={(e) =>
                                                          setQuestionDrafts((prev) => ({
                                                            ...prev,
                                                            [question.id]: { ...draftQuestion, optionsText: e.target.value },
                                                          }))
                                                        }
                                                        rows={5}
                                                        className="w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:border-white/10 dark:bg-slate-900/40 dark:text-white"
                                                      />
                                                    </div>
                                                    <div className="space-y-3">
                                                      <input
                                                        type="number"
                                                        min="0"
                                                        value={draftQuestion.correct_index}
                                                        onChange={(e) =>
                                                          setQuestionDrafts((prev) => ({
                                                            ...prev,
                                                            [question.id]: { ...draftQuestion, correct_index: Number(e.target.value) || 0 },
                                                          }))
                                                        }
                                                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:border-white/10 dark:bg-slate-900/40 dark:text-white"
                                                      />
                                                      <button
                                                        className="rounded-2xl bg-blue-600 px-4 py-3 font-semibold text-white transition hover:bg-blue-500"
                                                        onClick={async () => {
                                                          const options = parseOptions(draftQuestion.optionsText);
                                                          if (!draftQuestion.prompt.trim() || options.length < 2) {
                                                            showToast('Ajoutez une question et au moins deux options.', 'error');
                                                            return;
                                                          }
                                                          try {
                                                            await learningService.updateQuizQuestion(question.id, {
                                                              prompt: draftQuestion.prompt,
                                                              options,
                                                              correct_index: draftQuestion.correct_index,
                                                            });
                                                            await refreshCourse();
                                                            showToast('Question mise a jour.', 'success');
                                                          } catch {
                                                            showToast('Mise a jour question impossible.', 'error');
                                                          }
                                                        }}
                                                      >
                                                        Enregistrer la question
                                                      </button>
                                                    </div>
                                                  </div>
                                                </div>
                                              );
                                            })}
                                            <div className="rounded-2xl border border-dashed border-amber-300 bg-amber-50 p-4 dark:border-amber-400/30 dark:bg-amber-500/[0.05]">
                                              <div className="grid gap-4 xl:grid-cols-[1fr,0.7fr]">
                                                <div className="space-y-3">
                                                  <textarea
                                                    value={newQuestionDrafts[lessonQuiz.id]?.prompt || ''}
                                                    onChange={(e) =>
                                                      setNewQuestionDrafts((prev) => ({
                                                        ...prev,
                                                        [lessonQuiz.id]: { ...(prev[lessonQuiz.id] || emptyQuestionDraft), prompt: e.target.value },
                                                      }))
                                                    }
                                                    rows={3}
                                                    placeholder="Nouvelle question"
                                                    className="w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:border-white/10 dark:bg-white/5 dark:text-white"
                                                  />
                                                  <textarea
                                                    value={newQuestionDrafts[lessonQuiz.id]?.optionsText || emptyQuestionDraft.optionsText}
                                                    onChange={(e) =>
                                                      setNewQuestionDrafts((prev) => ({
                                                        ...prev,
                                                        [lessonQuiz.id]: { ...(prev[lessonQuiz.id] || emptyQuestionDraft), optionsText: e.target.value },
                                                      }))
                                                    }
                                                    rows={5}
                                                    placeholder="Une option par ligne"
                                                    className="w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:border-white/10 dark:bg-white/5 dark:text-white"
                                                  />
                                                </div>
                                                <div className="space-y-3">
                                                  <input
                                                    type="number"
                                                    min="0"
                                                    value={newQuestionDrafts[lessonQuiz.id]?.correct_index || 0}
                                                    onChange={(e) =>
                                                      setNewQuestionDrafts((prev) => ({
                                                        ...prev,
                                                        [lessonQuiz.id]: { ...(prev[lessonQuiz.id] || emptyQuestionDraft), correct_index: Number(e.target.value) || 0 },
                                                      }))
                                                    }
                                                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:border-white/10 dark:bg-white/5 dark:text-white"
                                                  />
                                                  <button
                                                    className="rounded-2xl bg-amber-400 px-4 py-3 font-semibold text-slate-950 transition hover:bg-amber-300"
                                                    onClick={async () => {
                                                      const draftQuestion = newQuestionDrafts[lessonQuiz.id] || emptyQuestionDraft;
                                                      const options = parseOptions(draftQuestion.optionsText);
                                                      if (!draftQuestion.prompt.trim() || options.length < 2) {
                                                        showToast('Ajoutez une question et au moins deux options.', 'error');
                                                        return;
                                                      }
                                                      try {
                                                        await learningService.createQuizQuestion({
                                                          quiz: lessonQuiz.id,
                                                          prompt: draftQuestion.prompt,
                                                          options,
                                                          correct_index: draftQuestion.correct_index,
                                                          order: (lessonQuiz.questions || []).length + 1,
                                                        });
                                                        await refreshCourse();
                                                        showToast('Question ajoutee.', 'success');
                                                      } catch {
                                                        showToast('Creation question impossible.', 'error');
                                                      }
                                                    }}
                                                  >
                                                    Ajouter la question
                                                  </button>
                                                </div>
                                              </div>
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })}

                          <div className="rounded-[24px] border border-dashed border-blue-300 bg-blue-50/80 p-5 dark:border-blue-400/25 dark:bg-blue-500/[0.04]">
                              <p className="text-sm font-semibold text-slate-900 dark:text-white">Nouvelle lesson</p>
                              <div className="mt-4 grid gap-4 xl:grid-cols-[1fr,0.85fr]">
                                <div className="space-y-4">
                                  <input
                                    value={newLessonDrafts[module.id]?.title || ''}
                                    onChange={(e) =>
                                      setNewLessonDrafts((prev) => ({
                                        ...prev,
                                        [module.id]: { ...(prev[module.id] || emptyLessonDraft), title: e.target.value },
                                      }))
                                    }
                                    placeholder="Titre de la lesson"
                                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:border-white/10 dark:bg-white/5 dark:text-white"
                                  />
                                  <textarea
                                    value={newLessonDrafts[module.id]?.content || ''}
                                    onChange={(e) =>
                                      setNewLessonDrafts((prev) => ({
                                        ...prev,
                                        [module.id]: { ...(prev[module.id] || emptyLessonDraft), content: e.target.value },
                                      }))
                                    }
                                    rows={5}
                                    placeholder="Contenu detaille"
                                    className="w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:border-white/10 dark:bg-white/5 dark:text-white"
                                  />
                                </div>
                                <div className="space-y-4">
                                        <input
                                          value={newLessonDrafts[module.id]?.video_url || ''}
                                    onChange={(e) =>
                                      setNewLessonDrafts((prev) => ({
                                        ...prev,
                                        [module.id]: { ...(prev[module.id] || emptyLessonDraft), video_url: e.target.value },
                                      }))
                                    }
                                          placeholder="URL video"
                                          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:border-white/10 dark:bg-white/5 dark:text-white"
                                        />
                                        <div className="grid gap-4 sm:grid-cols-2">
                                          <select
                                            value={newLessonDrafts[module.id]?.lesson_type || 'VIDEO'}
                                            onChange={(e) =>
                                              setNewLessonDrafts((prev) => ({
                                                ...prev,
                                                [module.id]: { ...(prev[module.id] || emptyLessonDraft), lesson_type: e.target.value as CourseLesson['lesson_type'] },
                                              }))
                                            }
                                            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:border-white/10 dark:bg-white/5 dark:text-white"
                                          >
                                            <option value="VIDEO">Video</option>
                                            <option value="TEXT">Text</option>
                                            <option value="QUIZ">Quiz</option>
                                            <option value="ASSIGNMENT">Assignment</option>
                                            <option value="LIVE">Live</option>
                                            <option value="DOWNLOAD">Download</option>
                                          </select>
                                          <select
                                            value={newLessonDrafts[module.id]?.status || 'DRAFT'}
                                            onChange={(e) =>
                                              setNewLessonDrafts((prev) => ({
                                                ...prev,
                                                [module.id]: { ...(prev[module.id] || emptyLessonDraft), status: e.target.value as CourseLesson['status'] },
                                              }))
                                            }
                                            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:border-white/10 dark:bg-white/5 dark:text-white"
                                          >
                                            <option value="DRAFT">Draft</option>
                                            <option value="PUBLISHED">Published</option>
                                          </select>
                                        </div>
                                        <textarea
                                          value={newLessonDrafts[module.id]?.transcript || ''}
                                          onChange={(e) =>
                                            setNewLessonDrafts((prev) => ({
                                              ...prev,
                                              [module.id]: { ...(prev[module.id] || emptyLessonDraft), transcript: e.target.value },
                                            }))
                                          }
                                          rows={4}
                                          placeholder="Transcript / script"
                                          className="w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:border-white/10 dark:bg-white/5 dark:text-white"
                                        />
                                        <textarea
                                          value={newLessonDrafts[module.id]?.instructor_notes || ''}
                                          onChange={(e) =>
                                            setNewLessonDrafts((prev) => ({
                                              ...prev,
                                              [module.id]: { ...(prev[module.id] || emptyLessonDraft), instructor_notes: e.target.value },
                                            }))
                                          }
                                          rows={3}
                                          placeholder="Notes instructeur"
                                          className="w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:border-white/10 dark:bg-white/5 dark:text-white"
                                        />
                                  <div className="grid gap-4 sm:grid-cols-2">
                                    <input
                                      type="number"
                                      min="0"
                                      value={newLessonDrafts[module.id]?.duration_seconds || 0}
                                      onChange={(e) =>
                                        setNewLessonDrafts((prev) => ({
                                          ...prev,
                                          [module.id]: {
                                            ...(prev[module.id] || emptyLessonDraft),
                                            duration_seconds: Number(e.target.value) || 0,
                                          },
                                        }))
                                      }
                                      placeholder="Duree en secondes"
                                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:border-white/10 dark:bg-white/5 dark:text-white"
                                    />
                                    <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 dark:border-white/10 dark:bg-white/5 dark:text-white">
                                      <input
                                        type="checkbox"
                                        checked={newLessonDrafts[module.id]?.is_preview || false}
                                        onChange={(e) =>
                                          setNewLessonDrafts((prev) => ({
                                            ...prev,
                                            [module.id]: { ...(prev[module.id] || emptyLessonDraft), is_preview: e.target.checked },
                                          }))
                                        }
                                        className="h-4 w-4 rounded border-white/20 bg-slate-900 text-blue-500"
                                      />
                                      Marquer comme preview
                                    </label>
                                  </div>
                                  {(newLessonDrafts[module.id]?.video_url || newLessonDrafts[module.id]?.video_file) && (
                                    <div className="rounded-2xl border border-slate-200 bg-slate-100 p-3 dark:border-white/10 dark:bg-slate-900/40">
                                      <video
                                        controls
                                        className="max-h-52 w-full rounded-xl bg-black"
                                        src={
                                          newLessonDrafts[module.id]?.video_file
                                            ? URL.createObjectURL(newLessonDrafts[module.id]?.video_file as File)
                                            : newLessonDrafts[module.id]?.video_url
                                        }
                                      />
                                    </div>
                                  )}
                                  <div className="grid gap-3 sm:grid-cols-2">
                                    <label className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-blue-400 dark:border-white/10 dark:bg-white/5 dark:text-slate-200">
                                      Upload video
                                      <input
                                        type="file"
                                        accept="video/*"
                                        className="mt-2 block w-full text-xs"
                                        onChange={(e) => {
                                          const file = e.target.files?.[0] || null;
                                          setNewLessonDrafts((prev) => ({
                                            ...prev,
                                            [module.id]: { ...(prev[module.id] || emptyLessonDraft), video_file: file, video_url: file ? '' : prev[module.id]?.video_url || '' },
                                          }));
                                        }}
                                      />
                                    </label>
                                    <div className="grid grid-cols-2 gap-3">
                                      <button
                                        className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-100 disabled:opacity-40 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
                                        disabled={Boolean(recordingTarget && recordingTarget !== `new:${module.id}`)}
                                        onClick={() => startRecording(`new:${module.id}`, module.id)}
                                      >
                                        <Radio className="h-4 w-4" />
                                        Record
                                      </button>
                                      <button
                                        className="inline-flex items-center justify-center gap-2 rounded-2xl border border-red-300 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 transition hover:bg-red-100 disabled:opacity-40 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200 dark:hover:bg-red-500/20"
                                        disabled={recordingTarget !== `new:${module.id}`}
                                        onClick={stopRecording}
                                      >
                                        <Square className="h-4 w-4" />
                                        Stop
                                      </button>
                                    </div>
                                  </div>
                                  <button
                                    className="inline-flex items-center gap-2 rounded-2xl bg-amber-400 px-4 py-3 font-bold text-slate-950 transition hover:bg-amber-300"
                                    onClick={async () => {
                                      const draft = newLessonDrafts[module.id] || emptyLessonDraft;
                                      if (!draft.title.trim()) return;
                                      try {
                                        await courseService.createLesson({
                                          module: module.id,
                                          title: draft.title.trim(),
                                          content: draft.content,
                                          lesson_type: draft.lesson_type,
                                          status: draft.status,
                                          video_url: draft.video_url,
                                          video_file: draft.video_file || undefined,
                                          transcript: draft.transcript,
                                          instructor_notes: draft.instructor_notes,
                                          duration_seconds: draft.duration_seconds,
                                          is_preview: draft.is_preview,
                                          order: orderedLessons.length + 1,
                                        });
                                        await refreshCourse();
                                        showToast('Lesson ajoutee.', 'success');
                                      } catch {
                                        showToast('Creation lesson impossible.', 'error');
                                      }
                                    }}
                                  >
                                    <Plus className="h-4 w-4" />
                                    Ajouter la lesson
                                  </button>
                                </div>
                              </div>
                            </div>
                          </section>

                          <section className="rounded-[24px] border border-blue-200 bg-gradient-to-br from-blue-50 to-white p-5 dark:border-blue-400/15 dark:from-[#081424] dark:to-[#050c18]">
                            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                              <div className="flex items-center gap-3">
                                <div className="grid h-11 w-11 place-items-center rounded-2xl border border-slate-200 bg-white dark:border-white/10 dark:bg-white/5">
                                  <FileQuestion className="h-4 w-4 text-blue-700 dark:text-blue-200" />
                                </div>
                                <div>
                                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">Quiz de fin de module</h3>
                                  <p className="text-sm text-slate-400">Plusieurs questions, seuil de reussite et limite de temps.</p>
                                </div>
                              </div>

                              <div className="flex flex-wrap gap-2">
                                {quiz && (
                                  <button
                                    className="rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-200 transition hover:bg-red-500/20"
                                    onClick={async () => {
                                      try {
                                        await learningService.deleteQuiz(quiz.id);
                                        await refreshCourse();
                                        showToast('Quiz supprime.', 'success');
                                      } catch {
                                        showToast('Suppression quiz impossible.', 'error');
                                      }
                                    }}
                                  >
                                    Supprimer le quiz
                                  </button>
                                )}
                                <button
                                  className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-100 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
                                  onClick={() =>
                                    setExpandedQuizzes((prev) => ({
                                      ...prev,
                                      [module.id]: !prev[module.id],
                                    }))
                                  }
                                >
                                  {expandedQuizzes[module.id] ? 'Masquer le quiz' : 'Afficher le quiz'}
                                </button>
                              </div>
                            </div>

                            {expandedQuizzes[module.id] && (
                              <div className="mt-5 space-y-5">
                                <div className="grid gap-4 lg:grid-cols-[1.1fr,0.55fr,0.55fr,auto]">
                                  <input
                                    value={quizDraft.title}
                                    onChange={(e) =>
                                      setQuizDrafts((prev) => ({
                                        ...prev,
                                        [module.id]: { ...quizDraft, title: e.target.value },
                                      }))
                                    }
                                    placeholder="Titre du quiz"
                                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:border-white/10 dark:bg-white/5 dark:text-white"
                                  />
                                  <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    value={quizDraft.passing_score}
                                    onChange={(e) =>
                                      setQuizDrafts((prev) => ({
                                        ...prev,
                                        [module.id]: { ...quizDraft, passing_score: Number(e.target.value) || 0 },
                                      }))
                                    }
                                    placeholder="Score requis"
                                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:border-white/10 dark:bg-white/5 dark:text-white"
                                  />
                                  <input
                                    type="number"
                                    min="0"
                                    value={quizDraft.time_limit_minutes}
                                    onChange={(e) =>
                                      setQuizDrafts((prev) => ({
                                        ...prev,
                                        [module.id]: { ...quizDraft, time_limit_minutes: Number(e.target.value) || 0 },
                                      }))
                                    }
                                    placeholder="Temps en minutes"
                                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:border-white/10 dark:bg-white/5 dark:text-white"
                                  />
                                  <button
                                    className="rounded-2xl bg-blue-600 px-4 py-3 font-bold text-white transition hover:bg-blue-500"
                                    onClick={async () => {
                                      try {
                                        if (quiz) {
                                          await learningService.updateQuiz(quiz.id, quizDraft);
                                          showToast('Quiz mis a jour.', 'success');
                                        } else {
                                          await learningService.createQuiz({
                                            title: quizDraft.title || `${module.title} Quiz`,
                                            module: module.id,
                                            passing_score: quizDraft.passing_score,
                                            time_limit_minutes: quizDraft.time_limit_minutes,
                                          });
                                          showToast('Quiz cree.', 'success');
                                        }
                                        await refreshCourse();
                                      } catch {
                                        showToast('Sauvegarde du quiz impossible.', 'error');
                                      }
                                    }}
                                  >
                                    {quiz ? 'Enregistrer' : 'Creer le quiz'}
                                  </button>
                                </div>

                                {quiz && (
                                  <div className="space-y-4">
                                    {sortByOrder(quiz.questions || []).map((question, questionIndex) => {
                                      const draft = questionDrafts[question.id] || questionToDraft(question);
                                      return (
                                        <div key={question.id} className="rounded-[22px] border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/[0.04]">
                                          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                                            <div>
                                              <p className="text-sm font-semibold text-slate-900 dark:text-white">Question {question.order}</p>
                                              <p className="text-xs text-slate-400">{parseOptions(draft.optionsText).length} options</p>
                                            </div>
                                            <div className="flex gap-2">
                                              <button
                                                className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-slate-700 transition hover:bg-slate-100 disabled:opacity-40 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
                                                disabled={questionIndex === 0}
                                                onClick={() => moveQuestion(quiz, question.id, 'up')}
                                              >
                                                <ChevronUp className="h-4 w-4" />
                                              </button>
                                              <button
                                                className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-slate-700 transition hover:bg-slate-100 disabled:opacity-40 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
                                                disabled={questionIndex === (quiz.questions || []).length - 1}
                                                onClick={() => moveQuestion(quiz, question.id, 'down')}
                                              >
                                                <ChevronDown className="h-4 w-4" />
                                              </button>
                                              <button
                                                className="rounded-2xl border border-red-400/20 bg-red-500/10 p-3 text-red-200 transition hover:bg-red-500/20"
                                                onClick={async () => {
                                                  try {
                                                    await learningService.deleteQuizQuestion(question.id);
                                                    await refreshCourse();
                                                    showToast('Question supprimee.', 'success');
                                                  } catch {
                                                    showToast('Suppression question impossible.', 'error');
                                                  }
                                                }}
                                              >
                                                <Trash2 className="h-4 w-4" />
                                              </button>
                                            </div>
                                          </div>

                                          <div className="grid gap-4 xl:grid-cols-[1fr,0.8fr]">
                                            <div className="space-y-4">
                                              <textarea
                                                value={draft.prompt}
                                                onChange={(e) =>
                                                  setQuestionDrafts((prev) => ({
                                                    ...prev,
                                                    [question.id]: { ...draft, prompt: e.target.value },
                                                  }))
                                                }
                                                rows={4}
                                                placeholder="Enonce de la question"
                                                className="w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:border-white/10 dark:bg-white/5 dark:text-white"
                                              />
                                              <textarea
                                                value={draft.optionsText}
                                                onChange={(e) =>
                                                  setQuestionDrafts((prev) => ({
                                                    ...prev,
                                                    [question.id]: { ...draft, optionsText: e.target.value },
                                                  }))
                                                }
                                                rows={6}
                                                placeholder="Une option par ligne"
                                                className="w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:border-white/10 dark:bg-white/5 dark:text-white"
                                              />
                                            </div>

                                            <div className="space-y-4">
                                              <input
                                                type="number"
                                                min="0"
                                                value={draft.correct_index}
                                                onChange={(e) =>
                                                  setQuestionDrafts((prev) => ({
                                                    ...prev,
                                                    [question.id]: { ...draft, correct_index: Number(e.target.value) || 0 },
                                                  }))
                                                }
                                                placeholder="Index de la bonne reponse"
                                                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:border-white/10 dark:bg-white/5 dark:text-white"
                                              />
                                              <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-700 dark:border-blue-400/15 dark:bg-blue-500/[0.05] dark:text-blue-100/80">
                                                Utilisez des indices bases sur zero. Exemple: `0` pour la premiere option.
                                              </div>
                                              <button
                                                className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-4 py-3 font-bold text-white transition hover:bg-blue-500"
                                                onClick={async () => {
                                                  const options = parseOptions(draft.optionsText);
                                                  if (!draft.prompt.trim() || options.length < 2) {
                                                    showToast('Ajoutez une question et au moins deux options.', 'error');
                                                    return;
                                                  }
                                                  try {
                                                    await learningService.updateQuizQuestion(question.id, {
                                                      prompt: draft.prompt,
                                                      options,
                                                      correct_index: draft.correct_index,
                                                    });
                                                    await refreshCourse();
                                                    showToast('Question mise a jour.', 'success');
                                                  } catch {
                                                    showToast('Mise a jour question impossible.', 'error');
                                                  }
                                                }}
                                              >
                                                <Save className="h-4 w-4" />
                                                Enregistrer la question
                                              </button>
                                            </div>
                                          </div>
                                        </div>
                                      );
                                    })}

                                  <div className="rounded-[22px] border border-dashed border-amber-300 bg-amber-50 p-4 dark:border-amber-400/30 dark:bg-amber-500/[0.05]">
                                      <p className="text-sm font-semibold text-slate-900 dark:text-white">Ajouter une question</p>
                                      <div className="mt-4 grid gap-4 xl:grid-cols-[1fr,0.8fr]">
                                        <div className="space-y-4">
                                          <textarea
                                            value={newQuestionDrafts[quiz.id]?.prompt || ''}
                                            onChange={(e) =>
                                              setNewQuestionDrafts((prev) => ({
                                                ...prev,
                                                [quiz.id]: { ...(prev[quiz.id] || emptyQuestionDraft), prompt: e.target.value },
                                              }))
                                            }
                                            rows={4}
                                            placeholder="Enonce de la nouvelle question"
                                            className="w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:border-white/10 dark:bg-white/5 dark:text-white"
                                          />
                                          <textarea
                                            value={newQuestionDrafts[quiz.id]?.optionsText || emptyQuestionDraft.optionsText}
                                            onChange={(e) =>
                                              setNewQuestionDrafts((prev) => ({
                                                ...prev,
                                                [quiz.id]: { ...(prev[quiz.id] || emptyQuestionDraft), optionsText: e.target.value },
                                              }))
                                            }
                                            rows={6}
                                            placeholder="Une option par ligne"
                                            className="w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:border-white/10 dark:bg-white/5 dark:text-white"
                                          />
                                        </div>
                                        <div className="space-y-4">
                                          <input
                                            type="number"
                                            min="0"
                                            value={newQuestionDrafts[quiz.id]?.correct_index || 0}
                                            onChange={(e) =>
                                              setNewQuestionDrafts((prev) => ({
                                                ...prev,
                                                [quiz.id]: { ...(prev[quiz.id] || emptyQuestionDraft), correct_index: Number(e.target.value) || 0 },
                                              }))
                                            }
                                            placeholder="Index de la bonne reponse"
                                            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:border-white/10 dark:bg-white/5 dark:text-white"
                                          />
                                          <button
                                            className="inline-flex items-center gap-2 rounded-2xl bg-amber-400 px-4 py-3 font-bold text-slate-950 transition hover:bg-amber-300"
                                            onClick={async () => {
                                              const draft = newQuestionDrafts[quiz.id] || emptyQuestionDraft;
                                              const options = parseOptions(draft.optionsText);
                                              if (!draft.prompt.trim() || options.length < 2) {
                                                showToast('Ajoutez une question et au moins deux options.', 'error');
                                                return;
                                              }
                                              try {
                                                await learningService.createQuizQuestion({
                                                  quiz: quiz.id,
                                                  prompt: draft.prompt,
                                                  options,
                                                  correct_index: draft.correct_index,
                                                  order: (quiz.questions || []).length + 1,
                                                });
                                                await refreshCourse();
                                                showToast('Question ajoutee.', 'success');
                                              } catch {
                                                showToast('Creation question impossible.', 'error');
                                              }
                                            }}
                                          >
                                            <Plus className="h-4 w-4" />
                                            Ajouter la question
                                          </button>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </section>
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
