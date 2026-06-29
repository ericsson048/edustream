import { ArrowRight, Layers3, Plus, Save, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { aiService } from '../../services/aiService';
import { courseService } from '../../services/courseService';
import { getApiErrorMessage } from '../../services/apiClient';
import { learningService } from '../../services/learningService';
import type { CourseLesson, CourseModule } from '../../types/lms';
import { useToast } from '../../contexts/ToastContext';
import QuizEditorCard from './editor/QuizEditorCard';
import { CourseSummaryBar, EditorBreadcrumbs, EditorNav, InstructorEditorShell, parseLines, sortByOrder } from './editor/shared';
import { useInstructorCourseData } from './editor/useInstructorCourseData';

type ModuleDraft = {
  title: string;
  description: string;
  learning_objectives: string;
  estimated_minutes: number;
  is_published: boolean;
  require_quiz_pass_to_continue: boolean;
};

type NewLessonDraft = {
  title: string;
  lesson_type: NonNullable<CourseLesson['lesson_type']>;
};

export default function CourseModulePage() {
  const { id = '', moduleId = '' } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { course, isLoading, moduleQuizzes, refreshCourse } = useInstructorCourseData(id);
  const [aiPrompt, setAiPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [moduleDraft, setModuleDraft] = useState<ModuleDraft>({
    title: '',
    description: '',
    learning_objectives: '',
    estimated_minutes: 0,
    is_published: false,
    require_quiz_pass_to_continue: false,
  });
  const [newLesson, setNewLesson] = useState<NewLessonDraft>({ title: '', lesson_type: 'VIDEO' });

  const module: CourseModule | null = sortByOrder<CourseModule>(course?.modules || []).find((item) => item.id === moduleId) || null;

  useEffect(() => {
    if (!module) return;
    setModuleDraft({
      title: module.title,
      description: module.description || '',
      learning_objectives: (module.learning_objectives || []).join('\n'),
      estimated_minutes: module.estimated_minutes || 0,
      is_published: module.is_published ?? false,
      require_quiz_pass_to_continue: module.require_quiz_pass_to_continue ?? false,
    });
  }, [module]);

  if (isLoading || !course || !module) {
    return (
      <InstructorEditorShell title="Chargement du module" description="Nous recuperons le module demande.">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-sm text-slate-500 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
          Loading module...
        </div>
      </InstructorEditorShell>
    );
  }

  const lessons = sortByOrder(module.lessons || []);

  const syncModuleQuiz = async (
    generatedQuiz: {
      title: string;
      passing_score: number;
      time_limit_minutes: number;
      questions: Array<{ prompt: string; options: string[]; correct_index: number }>;
    },
  ) => {
    const existingQuiz = moduleQuizzes[module.id];
    const quiz = existingQuiz
      ? await learningService.updateQuiz(existingQuiz.id, {
          title: generatedQuiz.title,
          passing_score: generatedQuiz.passing_score,
          time_limit_minutes: generatedQuiz.time_limit_minutes,
        })
      : await learningService.createQuiz({
          title: generatedQuiz.title,
          module: module.id,
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
      title="Vue module"
      description="Cette page se concentre sur un seul module, ses lessons et son quiz de bloc."
      actions={
        <Link
          to={`/instructor/courses/edit/${course.id}/module`}
          className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-900 transition hover:border-teal-300 hover:bg-teal-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:border-teal-500/40 dark:hover:bg-slate-800"
        >
          Retour aux modules
        </Link>
      }
    >
      <EditorBreadcrumbs course={course} module={module} />
      <EditorNav activeSection="module" courseId={course.id} module={module} />
      <CourseSummaryBar course={course} />

      <section className="rounded-[28px] border border-teal-200 bg-teal-50 p-6 shadow-sm dark:border-teal-500/20 dark:bg-teal-500/10">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-teal-700 dark:text-teal-300">AI Module Builder</p>
            <h2 className="mt-2 text-2xl font-black">Generer le module complet avec IA</h2>
            <p className="mt-2 text-sm text-teal-900/80 dark:text-teal-100/80">
              Gemini remplit le module, ajoute des lessons et cree ou remplace le quiz du module a partir de ton prompt.
            </p>
          </div>
        </div>
        <div className="mt-5 grid gap-3 lg:grid-cols-[1fr,auto]">
          <textarea
            value={aiPrompt}
            onChange={(event) => setAiPrompt(event.target.value)}
            className="min-h-28 rounded-2xl border border-teal-200 bg-white px-4 py-3 dark:border-teal-500/20 dark:bg-slate-900"
            placeholder="Exemple: cree un module pratique sur React hooks avances avec 4 lessons progressives et un quiz final orienté projets."
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
                const generated = await aiService.generateModule({
                  prompt: aiPrompt.trim(),
                  course_title: course.title,
                  category: course.category,
                  level: course.level,
                  module_title: moduleDraft.title || module.title,
                });

                await courseService.updateModule(module.id, {
                  title: generated.title,
                  description: generated.description,
                  learning_objectives: generated.learning_objectives,
                  estimated_minutes: generated.estimated_minutes,
                  is_published: generated.is_published,
                  require_quiz_pass_to_continue: moduleDraft.require_quiz_pass_to_continue,
                });

                for (let index = 0; index < generated.lessons.length; index += 1) {
                  const generatedLesson = generated.lessons[index];
                  await courseService.createLesson({
                    module: module.id,
                    title: generatedLesson.title,
                    content: generatedLesson.content,
                    lesson_type: generatedLesson.lesson_type,
                    status: generatedLesson.status,
                    video_url: generatedLesson.video_url,
                    transcript: generatedLesson.transcript,
                    instructor_notes: generatedLesson.instructor_notes,
                    duration_seconds: generatedLesson.duration_seconds,
                    is_preview: generatedLesson.is_preview,
                    order: lessons.length + index + 1,
                  });
                }

                await syncModuleQuiz(generated.quiz);
                setAiPrompt('');
                await refreshCourse();
                showToast('Module, lessons et quiz generes par IA.', 'success');
              } catch (error) {
                showToast(getApiErrorMessage(error, 'Generation IA du module impossible.'), 'error');
              } finally {
                setIsGenerating(false);
              }
            }}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-teal-700 px-5 py-3 text-sm font-bold text-white hover:bg-teal-600 disabled:opacity-50"
            disabled={isGenerating}
          >
            {isGenerating ? 'Generation...' : 'Generer le module'}
          </button>
        </div>
      </section>

      <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-2xl bg-teal-100 text-teal-700 dark:bg-teal-500/10 dark:text-teal-300">
            <Layers3 className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-xl font-black">Parametres du module</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">Titre, description, objectifs, duree et publication du module.</p>
          </div>
        </div>

        <div className="mt-6 grid gap-4 xl:grid-cols-2">
          <input
            value={moduleDraft.title}
            onChange={(event) => setModuleDraft((prev) => ({ ...prev, title: event.target.value }))}
            className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-950"
            placeholder="Titre du module"
          />
          <input
            type="number"
            min="0"
            value={moduleDraft.estimated_minutes}
            onChange={(event) => setModuleDraft((prev) => ({ ...prev, estimated_minutes: Number(event.target.value) || 0 }))}
            className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-950"
            placeholder="Minutes estimees"
          />
          <textarea
            value={moduleDraft.description}
            onChange={(event) => setModuleDraft((prev) => ({ ...prev, description: event.target.value }))}
            className="min-h-32 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-950 xl:col-span-2"
            placeholder="Description du module"
          />
          <textarea
            value={moduleDraft.learning_objectives}
            onChange={(event) => setModuleDraft((prev) => ({ ...prev, learning_objectives: event.target.value }))}
            className="min-h-28 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-950 xl:col-span-2"
            placeholder="Objectifs du module, une ligne par objectif"
          />
          <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold dark:border-slate-700 dark:bg-slate-950 xl:col-span-2">
            <input
              type="checkbox"
              checked={moduleDraft.is_published}
              onChange={(event) => setModuleDraft((prev) => ({ ...prev, is_published: event.target.checked }))}
            />
            Publier ce module
          </label>
          <label className="flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-100 xl:col-span-2">
            <input
              type="checkbox"
              checked={moduleDraft.require_quiz_pass_to_continue}
              onChange={(event) => setModuleDraft((prev) => ({ ...prev, require_quiz_pass_to_continue: event.target.checked }))}
            />
            Exiger la reussite du quiz de module avant de debloquer la section suivante
          </label>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={async () => {
              try {
                await courseService.updateModule(module.id, {
                  title: moduleDraft.title.trim(),
                  description: moduleDraft.description,
                  learning_objectives: parseLines(moduleDraft.learning_objectives),
                  estimated_minutes: moduleDraft.estimated_minutes,
                  is_published: moduleDraft.is_published,
                  require_quiz_pass_to_continue: moduleDraft.require_quiz_pass_to_continue,
                });
                await refreshCourse();
                showToast('Module mis a jour.', 'success');
              } catch (error) {
                showToast(getApiErrorMessage(error, 'Mise a jour du module impossible.'), 'error');
              }
            }}
            className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-5 py-3 text-sm font-bold text-white dark:bg-white dark:text-slate-950"
          >
            <Save className="h-4 w-4" />
            Sauvegarder le module
          </button>
          <button
            type="button"
            onClick={async () => {
              try {
                await courseService.deleteModule(module.id);
                showToast('Module supprime.', 'success');
                navigate(`/instructor/courses/edit/${course.id}/module`);
              } catch {
                showToast('Suppression du module impossible.', 'error');
              }
            }}
            className="inline-flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-5 py-3 text-sm font-semibold text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300"
          >
            <Trash2 className="h-4 w-4" />
            Supprimer
          </button>
        </div>
      </section>

      <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-black">Lessons du module</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">Chaque lesson a maintenant sa propre page complete.</p>
          </div>
        </div>

        <div className="mt-6 grid gap-3 lg:grid-cols-[1fr,220px,auto]">
          <input
            value={newLesson.title}
            onChange={(event) => setNewLesson((prev) => ({ ...prev, title: event.target.value }))}
            className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-950"
            placeholder="Titre de la nouvelle lesson"
          />
          <select
            value={newLesson.lesson_type}
            onChange={(event) => setNewLesson((prev) => ({ ...prev, lesson_type: event.target.value as NonNullable<CourseLesson['lesson_type']> }))}
            className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-950"
          >
            <option value="VIDEO">Video</option>
            <option value="TEXT">Text</option>
            <option value="QUIZ">Quiz</option>
            <option value="ASSIGNMENT">Assignment</option>
            <option value="LIVE">Live</option>
            <option value="DOWNLOAD">Download</option>
          </select>
          <button
            type="button"
            onClick={async () => {
              if (!newLesson.title.trim()) {
                showToast('Ajoutez un titre de lesson.', 'error');
                return;
              }

              try {
                const created = await courseService.createLesson({
                  module: module.id,
                  title: newLesson.title.trim(),
                  content: '',
                  lesson_type: newLesson.lesson_type,
                  status: 'DRAFT',
                  order: lessons.length + 1,
                });
                setNewLesson({ title: '', lesson_type: 'VIDEO' });
                await refreshCourse({ silent: true });
                showToast('Lesson creee.', 'success');
                navigate(`/instructor/courses/edit/${course.id}/module/${module.id}/lesson/${created.id}`);
              } catch {
                showToast('Creation de la lesson impossible.', 'error');
              }
            }}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-orange-500 px-5 py-3 text-sm font-bold text-white hover:bg-orange-400"
          >
            <Plus className="h-4 w-4" />
            Ajouter
          </button>
        </div>

        <div className="mt-6 space-y-4">
          {lessons.length ? (
            lessons.map((lesson, index) => (
              <Link
                key={lesson.id}
                to={`/instructor/courses/edit/${course.id}/module/${module.id}/lesson/${lesson.id}`}
                className="group block rounded-2xl border border-slate-200 bg-slate-50 p-5 transition hover:border-teal-300 hover:bg-white dark:border-slate-700 dark:bg-slate-950 dark:hover:border-teal-500/40 dark:hover:bg-slate-900"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Lesson {index + 1}</p>
                    <h3 className="mt-2 text-xl font-black">{lesson.title}</h3>
                    <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                      {lesson.lesson_type || 'VIDEO'} • {lesson.status || 'DRAFT'} • {Math.round((lesson.duration_seconds || 0) / 60)} min
                    </p>
                  </div>
                  <ArrowRight className="h-5 w-5 text-teal-700 transition-transform group-hover:translate-x-1 dark:text-teal-300" />
                </div>
              </Link>
            ))
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-400">
              Ce module n'a pas encore de lesson.
            </div>
          )}
        </div>
      </section>

      <QuizEditorCard
        existingQuiz={moduleQuizzes[module.id] || null}
        moduleId={module.id}
        onRefresh={async () => refreshCourse({ silent: true })}
        title={`${module.title} Quiz`}
      />
    </InstructorEditorShell>
  );
}
