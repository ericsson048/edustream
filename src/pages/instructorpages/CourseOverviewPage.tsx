import { ArrowRight, BookOpen, Layers3, Save, Sparkles } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getApiErrorMessage } from '../../services/apiClient';
import { courseService } from '../../services/courseService';
import type { Course } from '../../types/lms';
import { useToast } from '../../contexts/ToastContext';
import AssignmentManagerCard from './editor/AssignmentManagerCard';
import { CourseSummaryBar, EditorBreadcrumbs, EditorNav, InstructorEditorShell, parseLines } from './editor/shared';
import { useInstructorCourseData } from './editor/useInstructorCourseData';

export default function CourseOverviewPage() {
  const { id = '' } = useParams();
  const { showToast } = useToast();
  const { assignments, categories, course, generatedOutline, importGeneratedOutline, isLoading, refreshCourse } = useInstructorCourseData(id);
  const [isPublishing, setIsPublishing] = useState(false);
  const [form, setForm] = useState({
    title: '',
    subtitle: '',
    description: '',
    category_id: '',
    language: 'en',
    level: 'ALL' as Course['level'],
    price: '',
    thumbnail_url: '',
    is_published: false,
    learning_objectives: '',
    prerequisites: '',
    target_audience: '',
    estimated_hours: 0,
  });

  useEffect(() => {
    if (!course) return;
    setForm({
      title: course.title,
      subtitle: course.subtitle || '',
      description: course.description || '',
      category_id: course.category_id || '',
      language: course.language || 'en',
      level: course.level,
      price: course.price,
      thumbnail_url: course.thumbnail_url || '',
      is_published: course.is_published,
      learning_objectives: (course.learning_objectives || []).join('\n'),
      prerequisites: (course.prerequisites || []).join('\n'),
      target_audience: (course.target_audience || []).join('\n'),
      estimated_hours: course.estimated_hours || 0,
    });
  }, [course]);

  if (isLoading || !course) {
    return (
      <InstructorEditorShell title="Chargement du cours" description="Nous recuperons le contenu du cours tuteur.">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-sm text-slate-500 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
          Loading course...
        </div>
      </InstructorEditorShell>
    );
  }

  const saveCourse = async (overrides?: Partial<typeof form>) => {
    const nextForm = { ...form, ...overrides };
    await courseService.updateCourse(course.id, {
      title: nextForm.title.trim(),
      subtitle: nextForm.subtitle.trim(),
      description: nextForm.description,
      category_id: nextForm.category_id || null,
      language: nextForm.language,
      level: nextForm.level,
      price: nextForm.price,
      thumbnail_url: nextForm.thumbnail_url,
      is_published: nextForm.is_published,
      learning_objectives: parseLines(nextForm.learning_objectives),
      prerequisites: parseLines(nextForm.prerequisites),
      target_audience: parseLines(nextForm.target_audience),
      estimated_hours: nextForm.estimated_hours,
    });
    setForm(nextForm);
    await refreshCourse();
  };

  return (
    <InstructorEditorShell
      title="Vue cours"
      description="Cette page reste concentree sur l'identite du cours, ses informations business et ses devoirs. Les modules et lessons vivent sur leurs propres pages."
      actions={
        <>
          <button
            type="button"
            onClick={async () => {
              setIsPublishing(true);
              try {
                const nextPublished = !course.is_published;
                await saveCourse({ is_published: nextPublished });
                showToast(nextPublished ? 'Cours publie.' : 'Cours remis en brouillon.', 'success');
              } catch (error) {
                showToast(getApiErrorMessage(error, 'Publication du cours impossible.'), 'error');
              } finally {
                setIsPublishing(false);
              }
            }}
            className={`inline-flex items-center gap-2 rounded-2xl px-5 py-3 text-sm font-bold transition ${
              course.is_published
                ? 'border border-amber-200 bg-amber-50 text-amber-900 hover:bg-amber-100'
                : 'bg-emerald-600 text-white hover:bg-emerald-700'
            }`}
            disabled={isPublishing}
          >
            <Sparkles className="h-4 w-4" />
            {isPublishing ? 'Mise a jour...' : course.is_published ? 'Mettre en brouillon' : 'Publier le cours'}
          </button>
          <Link
            to={`/instructor/courses/edit/${course.id}/module`}
            className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white dark:bg-white dark:text-slate-950"
          >
            <Layers3 className="h-4 w-4" />
            Gerer les modules
          </Link>
          <Link
            to={`/instructor/courses/edit/${course.id}/module`}
            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-900 transition hover:border-teal-300 hover:bg-teal-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:border-teal-500/40 dark:hover:bg-slate-800"
          >
            <ArrowRight className="h-4 w-4" />
            Continuer l'edition
          </Link>
        </>
      }
    >
      <EditorBreadcrumbs course={course} />
      <EditorNav activeSection="course" courseId={course.id} />
      <CourseSummaryBar course={course} />

      {generatedOutline ? (
        <section className="rounded-[28px] border border-teal-200 bg-teal-50 p-6 shadow-sm dark:border-teal-500/20 dark:bg-teal-500/10">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-teal-700 dark:text-teal-300">Plan IA en attente</p>
              <h2 className="mt-2 text-2xl font-black">{generatedOutline.title}</h2>
              <p className="mt-2 text-sm text-teal-900/80 dark:text-teal-100/80">
                {generatedOutline.modules.length} modules attendent encore d'etre importes dans ce cours.
              </p>
            </div>
            <button
              type="button"
              onClick={() => importGeneratedOutline()}
              className="inline-flex items-center gap-2 rounded-2xl bg-teal-700 px-5 py-3 text-sm font-bold text-white hover:bg-teal-600"
            >
              <Sparkles className="h-4 w-4" />
              Importer le plan IA
            </button>
          </div>
        </section>
      ) : null}

      <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-2xl bg-teal-100 text-teal-700 dark:bg-teal-500/10 dark:text-teal-300">
            <BookOpen className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-xl font-black">Informations du cours</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">Titre, promesse, prix, audience et publication.</p>
          </div>
        </div>

        <div className="mt-6 grid gap-4 xl:grid-cols-2">
          <input
            value={form.title}
            onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
            className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-950"
            placeholder="Titre du cours"
          />
          <input
            value={form.subtitle}
            onChange={(event) => setForm((prev) => ({ ...prev, subtitle: event.target.value }))}
            className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-950"
            placeholder="Sous-titre"
          />
          <textarea
            value={form.description}
            onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
            className="min-h-36 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-950 xl:col-span-2"
            placeholder="Description du cours"
          />
          <select
            value={form.category_id}
            onChange={(event) => setForm((prev) => ({ ...prev, category_id: event.target.value }))}
            className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-950"
          >
            <option value="">Selectionnez une categorie</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
          <select
            value={form.level}
            onChange={(event) => setForm((prev) => ({ ...prev, level: event.target.value as Course['level'] }))}
            className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-950"
          >
            <option value="BEGINNER">Beginner</option>
            <option value="INTERMEDIATE">Intermediate</option>
            <option value="ADVANCED">Advanced</option>
            <option value="ALL">All levels</option>
          </select>
          <input
            value={form.language}
            onChange={(event) => setForm((prev) => ({ ...prev, language: event.target.value }))}
            className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-950"
            placeholder="Langue"
          />
          <input
            value={form.price}
            onChange={(event) => setForm((prev) => ({ ...prev, price: event.target.value }))}
            className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-950"
            placeholder="Prix"
          />
          <input
            value={form.thumbnail_url}
            onChange={(event) => setForm((prev) => ({ ...prev, thumbnail_url: event.target.value }))}
            className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-950 xl:col-span-2"
            placeholder="URL de la miniature"
          />
          <textarea
            value={form.learning_objectives}
            onChange={(event) => setForm((prev) => ({ ...prev, learning_objectives: event.target.value }))}
            className="min-h-32 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-950"
            placeholder="Objectifs, une ligne par objectif"
          />
          <textarea
            value={form.prerequisites}
            onChange={(event) => setForm((prev) => ({ ...prev, prerequisites: event.target.value }))}
            className="min-h-32 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-950"
            placeholder="Prerequis, une ligne par prerequis"
          />
          <textarea
            value={form.target_audience}
            onChange={(event) => setForm((prev) => ({ ...prev, target_audience: event.target.value }))}
            className="min-h-32 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-950"
            placeholder="Audience cible, une ligne par profil"
          />
          <div className="grid gap-4">
            <input
              type="number"
              min="0"
              value={form.estimated_hours}
              onChange={(event) => setForm((prev) => ({ ...prev, estimated_hours: Number(event.target.value) || 0 }))}
              className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-950"
              placeholder="Heures estimees"
            />
            <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold dark:border-slate-700 dark:bg-slate-950">
              <input
                type="checkbox"
                checked={form.is_published}
                onChange={(event) => setForm((prev) => ({ ...prev, is_published: event.target.checked }))}
              />
              Publier ce cours
            </label>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={async () => {
              try {
                await saveCourse();
                showToast('Cours mis a jour.', 'success');
              } catch (error) {
                showToast(getApiErrorMessage(error, 'Mise a jour du cours impossible.'), 'error');
              }
            }}
            className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-5 py-3 text-sm font-bold text-white dark:bg-white dark:text-slate-950"
          >
            <Save className="h-4 w-4" />
            Sauvegarder le cours
          </button>
          <Link
            to={`/instructor/courses/edit/${course.id}/module`}
            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-900 transition hover:border-teal-300 hover:bg-teal-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:border-teal-500/40 dark:hover:bg-slate-800"
          >
            <Layers3 className="h-4 w-4" />
            Ouvrir les modules
          </Link>
        </div>
      </section>

      <AssignmentManagerCard assignments={assignments} courseId={course.id} onRefresh={async () => refreshCourse({ silent: true })} />
    </InstructorEditorShell>
  );
}
