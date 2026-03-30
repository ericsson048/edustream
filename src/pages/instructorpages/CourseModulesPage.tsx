import { ArrowRight, Layers3, Plus, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { courseService } from '../../services/courseService';
import { useToast } from '../../contexts/ToastContext';
import { CourseSummaryBar, EditorBreadcrumbs, EditorNav, InstructorEditorShell, sortByOrder } from './editor/shared';
import { useInstructorCourseData } from './editor/useInstructorCourseData';

export default function CourseModulesPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { course, generatedOutline, importGeneratedOutline, isLoading, refreshCourse } = useInstructorCourseData(id);
  const [newModuleTitle, setNewModuleTitle] = useState('');

  if (isLoading || !course) {
    return (
      <InstructorEditorShell title="Chargement des modules" description="Nous recuperons les modules du cours.">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-sm text-slate-500 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
          Loading course...
        </div>
      </InstructorEditorShell>
    );
  }

  const modules = sortByOrder(course.modules || []);

  return (
    <InstructorEditorShell
      title="Modules du cours"
      description="Cette page ne gere que l'architecture du cours. Chaque module ouvre ensuite son propre espace d'edition."
      actions={
        <>
          <Link
            to={`/instructor/courses/edit/${course.id}`}
            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-900 transition hover:border-teal-300 hover:bg-teal-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:border-teal-500/40 dark:hover:bg-slate-800"
          >
            Retour au cours
          </Link>
        </>
      }
    >
      <EditorBreadcrumbs course={course} />
      <EditorNav activeSection="modules" courseId={course.id} />
      <CourseSummaryBar course={course} />

      {generatedOutline ? (
        <section className="rounded-[28px] border border-teal-200 bg-teal-50 p-6 shadow-sm dark:border-teal-500/20 dark:bg-teal-500/10">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-teal-700 dark:text-teal-300">Plan IA disponible</p>
              <p className="mt-2 text-sm text-teal-900/80 dark:text-teal-100/80">Importez directement les modules proposes par l'IA avant d'ajuster le detail.</p>
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
            <Layers3 className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-xl font-black">Structure</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">Ajoutez un module puis entrez dans sa page pour gerer lessons, quiz et publication.</p>
          </div>
        </div>

        <div className="mt-6 grid gap-3 lg:grid-cols-[1fr,auto]">
          <input
            value={newModuleTitle}
            onChange={(event) => setNewModuleTitle(event.target.value)}
            className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-950"
            placeholder="Nom du nouveau module"
          />
          <button
            type="button"
            onClick={async () => {
              if (!newModuleTitle.trim()) {
                showToast('Ajoutez un titre de module.', 'error');
                return;
              }

              try {
                const created = await courseService.createModule({
                  course: course.id,
                  title: newModuleTitle.trim(),
                  order: modules.length + 1,
                  is_published: false,
                });
                setNewModuleTitle('');
                await refreshCourse({ silent: true });
                showToast('Module cree.', 'success');
                navigate(`/instructor/courses/edit/${course.id}/module/${created.id}`);
              } catch {
                showToast('Creation du module impossible.', 'error');
              }
            }}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-orange-500 px-5 py-3 text-sm font-bold text-white hover:bg-orange-400"
          >
            <Plus className="h-4 w-4" />
            Ajouter le module
          </button>
        </div>

        <div className="mt-6 space-y-4">
          {modules.length ? (
            modules.map((module, index) => (
              <Link
                key={module.id}
                to={`/instructor/courses/edit/${course.id}/module/${module.id}`}
                className="group block rounded-2xl border border-slate-200 bg-slate-50 p-5 transition hover:border-teal-300 hover:bg-white dark:border-slate-700 dark:bg-slate-950 dark:hover:border-teal-500/40 dark:hover:bg-slate-900"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Module {index + 1}</p>
                    <h3 className="mt-2 text-2xl font-black">{module.title}</h3>
                    <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{module.description || 'Ajoutez une description de module pour guider les apprenants.'}</p>
                    <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">{(module.lessons || []).length} lessons</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-bold ${
                        module.is_published
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300'
                          : 'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300'
                      }`}
                    >
                      {module.is_published ? 'Published' : 'Draft'}
                    </span>
                    <ArrowRight className="h-5 w-5 text-teal-700 transition-transform group-hover:translate-x-1 dark:text-teal-300" />
                  </div>
                </div>
              </Link>
            ))
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-400">
              Ce cours n'a pas encore de module. Creez le premier module pour continuer.
            </div>
          )}
        </div>
      </section>
    </InstructorEditorShell>
  );
}
