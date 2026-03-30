import { CalendarDays, Plus, Save, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { learningService, type AssignmentItem } from '../../../services/learningService';
import { useToast } from '../../../contexts/ToastContext';

type AssignmentDraft = {
  title: string;
  description: string;
  due_date: string;
  points: number;
  type: string;
};

const emptyAssignmentDraft: AssignmentDraft = {
  title: '',
  description: '',
  due_date: '',
  points: 100,
  type: 'PROJECT',
};

type Props = {
  assignments: AssignmentItem[];
  courseId: string;
  onRefresh: () => Promise<void>;
};

export default function AssignmentManagerCard({ assignments, courseId, onRefresh }: Props) {
  const { showToast } = useToast();
  const [drafts, setDrafts] = useState<Record<string, AssignmentDraft>>({});
  const [newDraft, setNewDraft] = useState<AssignmentDraft>(emptyAssignmentDraft);

  useEffect(() => {
    const nextDrafts: Record<string, AssignmentDraft> = {};
    assignments.forEach((assignment) => {
      nextDrafts[assignment.id] = {
        title: assignment.title,
        description: assignment.description || '',
        due_date: assignment.due_date,
        points: assignment.points,
        type: assignment.type,
      };
    });
    setDrafts(nextDrafts);
  }, [assignments]);

  return (
    <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center gap-3">
        <div className="grid h-11 w-11 place-items-center rounded-2xl bg-orange-100 text-orange-700 dark:bg-orange-500/10 dark:text-orange-300">
          <CalendarDays className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-xl font-black">Assignments</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Ajoutez et maintenez les devoirs relies a ce cours.</p>
        </div>
      </div>

      <div className="mt-6 space-y-4">
        {assignments.map((assignment) => {
          const draft = drafts[assignment.id];
          if (!draft) return null;

          return (
            <article key={assignment.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950">
              <div className="grid gap-3 lg:grid-cols-2">
                <input
                  value={draft.title}
                  onChange={(event) => setDrafts((prev) => ({ ...prev, [assignment.id]: { ...draft, title: event.target.value } }))}
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-900"
                  placeholder="Titre du devoir"
                />
                <input
                  type="datetime-local"
                  value={draft.due_date ? draft.due_date.slice(0, 16) : ''}
                  onChange={(event) => setDrafts((prev) => ({ ...prev, [assignment.id]: { ...draft, due_date: event.target.value } }))}
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-900"
                />
                <textarea
                  value={draft.description}
                  onChange={(event) => setDrafts((prev) => ({ ...prev, [assignment.id]: { ...draft, description: event.target.value } }))}
                  className="min-h-28 rounded-2xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-900 lg:col-span-2"
                  placeholder="Description"
                />
                <input
                  type="number"
                  min="0"
                  value={draft.points}
                  onChange={(event) => setDrafts((prev) => ({ ...prev, [assignment.id]: { ...draft, points: Number(event.target.value) || 0 } }))}
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-900"
                  placeholder="Points"
                />
                <select
                  value={draft.type}
                  onChange={(event) => setDrafts((prev) => ({ ...prev, [assignment.id]: { ...draft, type: event.target.value } }))}
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-900"
                >
                  <option value="PROJECT">Project</option>
                  <option value="HOMEWORK">Homework</option>
                  <option value="ESSAY">Essay</option>
                  <option value="LAB">Lab</option>
                </select>
              </div>
              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await learningService.updateAssignment(assignment.id, {
                        title: draft.title.trim(),
                        description: draft.description,
                        due_date: draft.due_date,
                        points: draft.points,
                        type: draft.type,
                      });
                      await onRefresh();
                      showToast('Assignment mis a jour.', 'success');
                    } catch {
                      showToast('Mise a jour du devoir impossible.', 'error');
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
                      await learningService.deleteAssignment(assignment.id);
                      await onRefresh();
                      showToast('Assignment supprime.', 'success');
                    } catch {
                      showToast('Suppression du devoir impossible.', 'error');
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
        <h3 className="text-lg font-bold">Nouveau devoir</h3>
        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          <input
            value={newDraft.title}
            onChange={(event) => setNewDraft((prev) => ({ ...prev, title: event.target.value }))}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-900"
            placeholder="Titre"
          />
          <input
            type="datetime-local"
            value={newDraft.due_date}
            onChange={(event) => setNewDraft((prev) => ({ ...prev, due_date: event.target.value }))}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-900"
          />
          <textarea
            value={newDraft.description}
            onChange={(event) => setNewDraft((prev) => ({ ...prev, description: event.target.value }))}
            className="min-h-28 rounded-2xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-900 lg:col-span-2"
            placeholder="Description"
          />
          <input
            type="number"
            min="0"
            value={newDraft.points}
            onChange={(event) => setNewDraft((prev) => ({ ...prev, points: Number(event.target.value) || 0 }))}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-900"
            placeholder="Points"
          />
          <select
            value={newDraft.type}
            onChange={(event) => setNewDraft((prev) => ({ ...prev, type: event.target.value }))}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-900"
          >
            <option value="PROJECT">Project</option>
            <option value="HOMEWORK">Homework</option>
            <option value="ESSAY">Essay</option>
            <option value="LAB">Lab</option>
          </select>
        </div>
        <button
          type="button"
          onClick={async () => {
            if (!newDraft.title.trim() || !newDraft.due_date) {
              showToast('Ajoutez un titre et une date limite.', 'error');
              return;
            }

            try {
              await learningService.createAssignment({
                course: courseId,
                title: newDraft.title.trim(),
                description: newDraft.description,
                due_date: newDraft.due_date,
                points: newDraft.points,
                type: newDraft.type,
              });
              setNewDraft(emptyAssignmentDraft);
              await onRefresh();
              showToast('Assignment cree.', 'success');
            } catch {
              showToast('Creation du devoir impossible.', 'error');
            }
          }}
          className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-orange-500 px-4 py-3 text-sm font-bold text-white hover:bg-orange-400"
        >
          <Plus className="h-4 w-4" />
          Ajouter le devoir
        </button>
      </div>
    </section>
  );
}

