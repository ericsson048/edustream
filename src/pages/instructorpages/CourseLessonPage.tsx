import { BookOpen, Save, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { aiService } from '../../services/aiService';
import { getApiErrorMessage } from '../../services/apiClient';
import { courseService } from '../../services/courseService';
import { learningService } from '../../services/learningService';
import type { CourseLesson } from '../../types/lms';
import { useToast } from '../../contexts/ToastContext';
import QuizEditorCard from './editor/QuizEditorCard';
import ResourceManagerCard from './editor/ResourceManagerCard';
import { CourseSummaryBar, EditorBreadcrumbs, EditorNav, InstructorEditorShell, sortByOrder } from './editor/shared';
import { useInstructorCourseData } from './editor/useInstructorCourseData';

type LessonDraft = {
  title: string;
  content: string;
  lesson_type: NonNullable<CourseLesson['lesson_type']>;
  status: NonNullable<CourseLesson['status']>;
  video_url: string;
  transcript: string;
  instructor_notes: string;
  duration_seconds: number;
  is_preview: boolean;
  video_file: File | null;
};

export default function CourseLessonPage() {
  const { id = '', moduleId = '', lessonId = '' } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { course, isLoading, lessonQuizzes, refreshCourse } = useInstructorCourseData(id);
  const [aiPrompt, setAiPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [draft, setDraft] = useState<LessonDraft>({
    title: '',
    content: '',
    lesson_type: 'VIDEO',
    status: 'DRAFT',
    video_url: '',
    transcript: '',
    instructor_notes: '',
    duration_seconds: 0,
    is_preview: false,
    video_file: null,
  });

  const module = sortByOrder(course?.modules || []).find((item) => item.id === moduleId) || null;
  const lesson = sortByOrder(module?.lessons || []).find((item) => item.id === lessonId) || null;

  useEffect(() => {
    if (!lesson) return;
    setDraft({
      title: lesson.title,
      content: lesson.content || '',
      lesson_type: lesson.lesson_type || 'VIDEO',
      status: lesson.status || 'DRAFT',
      video_url: lesson.video_url || '',
      transcript: lesson.transcript || '',
      instructor_notes: lesson.instructor_notes || '',
      duration_seconds: lesson.duration_seconds || 0,
      is_preview: lesson.is_preview || false,
      video_file: null,
    });
  }, [lesson]);

  if (isLoading || !course || !module || !lesson) {
    return (
      <InstructorEditorShell title="Chargement de la lesson" description="Nous recuperons la lesson demandee.">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-sm text-slate-500 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
          Loading lesson...
        </div>
      </InstructorEditorShell>
    );
  }

  const syncLessonQuiz = async (
    generatedQuiz: {
      title: string;
      passing_score: number;
      time_limit_minutes: number;
      questions: Array<{ prompt: string; options: string[]; correct_index: number }>;
    },
  ) => {
    const existingQuiz = lessonQuizzes[lesson.id];
    const quiz = existingQuiz
      ? await learningService.updateQuiz(existingQuiz.id, {
          title: generatedQuiz.title,
          passing_score: generatedQuiz.passing_score,
          time_limit_minutes: generatedQuiz.time_limit_minutes,
        })
      : await learningService.createQuiz({
          title: generatedQuiz.title,
          lesson: lesson.id,
          passing_score: generatedQuiz.passing_score,
          time_limit_minutes: generatedQuiz.time_limit_minutes,
        });

    if (existingQuiz?.questions?.length) {
      await Promise.all(existingQuiz.questions.map((question) => learningService.deleteQuizQuestion(question.id)));
    }

    for (let index = 0; index < generatedQuiz.questions.length; index += 1) {
      const question = generatedQuiz.questions[index];
      await learningService.createQuizQuestion({
        quiz: quiz.id,
        prompt: question.prompt,
        options: question.options,
        correct_index: question.correct_index,
        order: index + 1,
      });
    }
  };

  return (
    <InstructorEditorShell
      title="Vue lesson"
      description="Cette page est dediee au contenu de la lesson, a ses ressources et a son quiz specifique."
    >
      <EditorBreadcrumbs course={course} module={module} lesson={lesson} />
      <EditorNav activeSection="lesson" courseId={course.id} module={module} lesson={lesson} />
      <CourseSummaryBar course={course} />

      <section className="rounded-[28px] border border-teal-200 bg-teal-50 p-6 shadow-sm dark:border-teal-500/20 dark:bg-teal-500/10">
        <div className="max-w-3xl">
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-teal-700 dark:text-teal-300">AI Lesson Builder</p>
          <h2 className="mt-2 text-2xl font-black">Generer la lesson et le quiz avec IA</h2>
          <p className="mt-2 text-sm text-teal-900/80 dark:text-teal-100/80">
            Gemini remplit le contenu, le transcript, les notes instructeur et cree ou remplace automatiquement le quiz de cette lesson.
          </p>
        </div>
        <div className="mt-5 grid gap-3 lg:grid-cols-[1fr,auto]">
          <textarea
            value={aiPrompt}
            onChange={(event) => setAiPrompt(event.target.value)}
            className="min-h-28 rounded-2xl border border-teal-200 bg-white px-4 py-3 dark:border-teal-500/20 dark:bg-slate-900"
            placeholder="Exemple: genere une lesson video claire sur les custom hooks React avec exemple pratique, transcript complet et quiz final."
          />
          <button
            type="button"
            onClick={async () => {
              if (!aiPrompt.trim()) {
                showToast("Ajoute une instruction pour l'IA.", 'error');
                return;
              }

              setIsGenerating(true);
              try {
                const generated = await aiService.generateLesson({
                  prompt: aiPrompt.trim(),
                  course_title: course.title,
                  category: course.category,
                  level: course.level,
                  module_title: module.title,
                  lesson_title: draft.title || lesson.title,
                });

                await courseService.updateLesson(lesson.id, {
                  title: generated.title,
                  content: generated.content,
                  lesson_type: generated.lesson_type,
                  status: generated.status,
                  video_url: generated.video_url,
                  transcript: generated.transcript,
                  instructor_notes: generated.instructor_notes,
                  duration_seconds: generated.duration_seconds,
                  is_preview: generated.is_preview,
                });
                await syncLessonQuiz(generated.quiz);
                setAiPrompt('');
                await refreshCourse();
                showToast('Lesson et quiz generes par IA.', 'success');
              } catch (error) {
                showToast(getApiErrorMessage(error, 'Generation IA de la lesson impossible.'), 'error');
              } finally {
                setIsGenerating(false);
              }
            }}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-teal-700 px-5 py-3 text-sm font-bold text-white hover:bg-teal-600 disabled:opacity-50"
            disabled={isGenerating}
          >
            {isGenerating ? 'Generation...' : 'Generer la lesson'}
          </button>
        </div>
      </section>

      <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-2xl bg-teal-100 text-teal-700 dark:bg-teal-500/10 dark:text-teal-300">
            <BookOpen className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-xl font-black">Contenu de la lesson</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">Texte, video, notes instructeur, duree et statut de publication.</p>
          </div>
        </div>

        <div className="mt-6 grid gap-4 xl:grid-cols-2">
          <input
            value={draft.title}
            onChange={(event) => setDraft((prev) => ({ ...prev, title: event.target.value }))}
            className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-950"
            placeholder="Titre de la lesson"
          />
          <select
            value={draft.lesson_type}
            onChange={(event) => setDraft((prev) => ({ ...prev, lesson_type: event.target.value as NonNullable<CourseLesson['lesson_type']> }))}
            className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-950"
          >
            <option value="VIDEO">Video</option>
            <option value="TEXT">Text</option>
            <option value="QUIZ">Quiz</option>
            <option value="ASSIGNMENT">Assignment</option>
            <option value="LIVE">Live</option>
            <option value="DOWNLOAD">Download</option>
          </select>
          <textarea
            value={draft.content}
            onChange={(event) => setDraft((prev) => ({ ...prev, content: event.target.value }))}
            className="min-h-44 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-950 xl:col-span-2"
            placeholder="Contenu principal de la lesson"
          />
          <input
            value={draft.video_url}
            onChange={(event) => setDraft((prev) => ({ ...prev, video_url: event.target.value }))}
            className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-950"
            placeholder="URL video"
          />
          <label className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold dark:border-slate-700 dark:bg-slate-950">
            Importer une video
            <input
              type="file"
              accept="video/*"
              className="mt-2 block w-full text-xs"
              onChange={(event) => setDraft((prev) => ({ ...prev, video_file: event.target.files?.[0] || null }))}
            />
          </label>
          <textarea
            value={draft.transcript}
            onChange={(event) => setDraft((prev) => ({ ...prev, transcript: event.target.value }))}
            className="min-h-32 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-950"
            placeholder="Transcript"
          />
          <textarea
            value={draft.instructor_notes}
            onChange={(event) => setDraft((prev) => ({ ...prev, instructor_notes: event.target.value }))}
            className="min-h-32 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-950"
            placeholder="Notes instructeur"
          />
          <input
            type="number"
            min="0"
            value={draft.duration_seconds}
            onChange={(event) => setDraft((prev) => ({ ...prev, duration_seconds: Number(event.target.value) || 0 }))}
            className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-950"
            placeholder="Duree en secondes"
          />
          <select
            value={draft.status}
            onChange={(event) => setDraft((prev) => ({ ...prev, status: event.target.value as NonNullable<CourseLesson['status']> }))}
            className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-950"
          >
            <option value="DRAFT">Draft</option>
            <option value="PUBLISHED">Published</option>
          </select>
          <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold dark:border-slate-700 dark:bg-slate-950 xl:col-span-2">
            <input
              type="checkbox"
              checked={draft.is_preview}
              onChange={(event) => setDraft((prev) => ({ ...prev, is_preview: event.target.checked }))}
            />
            Accessible en preview publique
          </label>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={async () => {
              try {
                await courseService.updateLesson(lesson.id, {
                  title: draft.title.trim(),
                  content: draft.content,
                  lesson_type: draft.lesson_type,
                  status: draft.status,
                  video_url: draft.video_url,
                  transcript: draft.transcript,
                  instructor_notes: draft.instructor_notes,
                  duration_seconds: draft.duration_seconds,
                  is_preview: draft.is_preview,
                  video_file: draft.video_file,
                });
                await refreshCourse();
                showToast('Lesson mise a jour.', 'success');
              } catch (error) {
                showToast(getApiErrorMessage(error, 'Mise a jour de la lesson impossible.'), 'error');
              }
            }}
            className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-5 py-3 text-sm font-bold text-white dark:bg-white dark:text-slate-950"
          >
            <Save className="h-4 w-4" />
            Sauvegarder la lesson
          </button>
          <button
            type="button"
            onClick={async () => {
              try {
                await courseService.deleteLesson(lesson.id);
                showToast('Lesson supprimee.', 'success');
                navigate(`/instructor/courses/edit/${course.id}/module/${module.id}`);
              } catch {
                showToast('Suppression de la lesson impossible.', 'error');
              }
            }}
            className="inline-flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-5 py-3 text-sm font-semibold text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300"
          >
            <Trash2 className="h-4 w-4" />
            Supprimer
          </button>
        </div>
      </section>

      <ResourceManagerCard lesson={lesson} onRefresh={async () => refreshCourse({ silent: true })} />

      <QuizEditorCard
        existingQuiz={lessonQuizzes[lesson.id] || null}
        lessonId={lesson.id}
        onRefresh={async () => refreshCourse({ silent: true })}
        title={`${lesson.title} Quiz`}
      />
    </InstructorEditorShell>
  );
}
