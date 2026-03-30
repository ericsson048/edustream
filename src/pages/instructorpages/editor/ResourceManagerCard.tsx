import { FolderOpen, Link2, Plus, Save, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { courseService } from '../../../services/courseService';
import type { CourseLesson, LessonResource } from '../../../types/lms';
import { useToast } from '../../../contexts/ToastContext';

type ResourceDraft = {
  title: string;
  kind: LessonResource['kind'];
  description: string;
  file_url: string;
  file: File | null;
};

const emptyResourceDraft: ResourceDraft = {
  title: '',
  kind: 'PDF',
  description: '',
  file_url: '',
  file: null,
};

type Props = {
  lesson: CourseLesson;
  onRefresh: () => Promise<void>;
};

export default function ResourceManagerCard({ lesson, onRefresh }: Props) {
  const { showToast } = useToast();
  const [drafts, setDrafts] = useState<Record<string, ResourceDraft>>({});
  const [newDraft, setNewDraft] = useState<ResourceDraft>(emptyResourceDraft);

  useEffect(() => {
    const nextDrafts: Record<string, ResourceDraft> = {};
    (lesson.resources || []).forEach((resource) => {
      nextDrafts[resource.id] = {
        title: resource.title,
        kind: resource.kind,
        description: resource.description || '',
        file_url: resource.file_url || '',
        file: null,
      };
    });
    setDrafts(nextDrafts);
  }, [lesson]);

  return (
    <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center gap-3">
        <div className="grid h-11 w-11 place-items-center rounded-2xl bg-cyan-100 text-cyan-700 dark:bg-cyan-500/10 dark:text-cyan-300">
          <FolderOpen className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-xl font-black">Ressources</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">PDF, liens, archives ou fichiers telechargeables pour cette lesson.</p>
        </div>
      </div>

      <div className="mt-6 space-y-4">
        {(lesson.resources || []).map((resource) => {
          const draft = drafts[resource.id];
          if (!draft) return null;

          return (
            <article key={resource.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950">
              <div className="grid gap-3 lg:grid-cols-2">
                <input
                  value={draft.title}
                  onChange={(event) => setDrafts((prev) => ({ ...prev, [resource.id]: { ...draft, title: event.target.value } }))}
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-900"
                  placeholder="Titre"
                />
                <select
                  value={draft.kind}
                  onChange={(event) => setDrafts((prev) => ({ ...prev, [resource.id]: { ...draft, kind: event.target.value as LessonResource['kind'] } }))}
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-900"
                >
                  <option value="PDF">PDF</option>
                  <option value="LINK">Link</option>
                  <option value="ZIP">ZIP</option>
                  <option value="OTHER">Other</option>
                </select>
                <textarea
                  value={draft.description}
                  onChange={(event) => setDrafts((prev) => ({ ...prev, [resource.id]: { ...draft, description: event.target.value } }))}
                  className="min-h-24 rounded-2xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-900 lg:col-span-2"
                  placeholder="Description"
                />
                <input
                  value={draft.file_url}
                  onChange={(event) => setDrafts((prev) => ({ ...prev, [resource.id]: { ...draft, file_url: event.target.value } }))}
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-900"
                  placeholder="URL du fichier"
                />
                <label className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold dark:border-slate-700 dark:bg-slate-900">
                  Remplacer le fichier
                  <input
                    type="file"
                    className="mt-2 block w-full text-xs"
                    onChange={(event) => setDrafts((prev) => ({ ...prev, [resource.id]: { ...draft, file: event.target.files?.[0] || null } }))}
                  />
                </label>
              </div>
              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await courseService.updateResource(resource.id, {
                        title: draft.title.trim(),
                        kind: draft.kind,
                        description: draft.description,
                        file_url: draft.file_url,
                        file: draft.file,
                      });
                      await onRefresh();
                      showToast('Ressource mise a jour.', 'success');
                    } catch {
                      showToast('Mise a jour de la ressource impossible.', 'error');
                    }
                  }}
                  className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white dark:bg-white dark:text-slate-950"
                >
                  <Save className="h-4 w-4" />
                  Sauvegarder
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await courseService.deleteResource(resource.id);
                      await onRefresh();
                      showToast('Ressource supprimee.', 'success');
                    } catch {
                      showToast('Suppression de la ressource impossible.', 'error');
                    }
                  }}
                  className="inline-flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300"
                >
                  <Trash2 className="h-4 w-4" />
                  Supprimer
                </button>
              </div>
            </article>
          );
        })}
      </div>

      <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950">
        <h3 className="text-lg font-bold">Nouvelle ressource</h3>
        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          <input
            value={newDraft.title}
            onChange={(event) => setNewDraft((prev) => ({ ...prev, title: event.target.value }))}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-900"
            placeholder="Titre"
          />
          <select
            value={newDraft.kind}
            onChange={(event) => setNewDraft((prev) => ({ ...prev, kind: event.target.value as LessonResource['kind'] }))}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-900"
          >
            <option value="PDF">PDF</option>
            <option value="LINK">Link</option>
            <option value="ZIP">ZIP</option>
            <option value="OTHER">Other</option>
          </select>
          <textarea
            value={newDraft.description}
            onChange={(event) => setNewDraft((prev) => ({ ...prev, description: event.target.value }))}
            className="min-h-24 rounded-2xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-900 lg:col-span-2"
            placeholder="Description"
          />
          <div className="relative">
            <Link2 className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={newDraft.file_url}
              onChange={(event) => setNewDraft((prev) => ({ ...prev, file_url: event.target.value }))}
              className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-11 pr-4 dark:border-slate-700 dark:bg-slate-900"
              placeholder="URL du fichier"
            />
          </div>
          <label className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold dark:border-slate-700 dark:bg-slate-900">
            Importer un fichier
            <input
              type="file"
              className="mt-2 block w-full text-xs"
              onChange={(event) => setNewDraft((prev) => ({ ...prev, file: event.target.files?.[0] || null }))}
            />
          </label>
        </div>
        <button
          type="button"
          onClick={async () => {
            if (!newDraft.title.trim()) {
              showToast('Ajoutez un titre pour la ressource.', 'error');
              return;
            }

            try {
              await courseService.createResource({
                lesson: lesson.id,
                title: newDraft.title.trim(),
                kind: newDraft.kind,
                description: newDraft.description,
                file_url: newDraft.file_url,
                file: newDraft.file || undefined,
              });
              setNewDraft(emptyResourceDraft);
              await onRefresh();
              showToast('Ressource ajoutee.', 'success');
            } catch {
              showToast('Creation de la ressource impossible.', 'error');
            }
          }}
          className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-cyan-600 px-4 py-3 text-sm font-bold text-white hover:bg-cyan-500"
        >
          <Plus className="h-4 w-4" />
          Ajouter la ressource
        </button>
      </div>
    </section>
  );
}

