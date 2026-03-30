import { FileQuestion, Plus, Save, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { learningService, type QuizItem, type QuizQuestionItem } from '../../../services/learningService';
import { useToast } from '../../../contexts/ToastContext';

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

const emptyQuestionDraft: QuestionDraft = {
  prompt: '',
  optionsText: 'Option A\nOption B\nOption C\nOption D',
  correct_index: 0,
};

function sortQuestions(questions: QuizQuestionItem[]) {
  return [...questions].sort((left, right) => left.order - right.order);
}

function parseOptions(value: string) {
  return value
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean);
}

type Props = {
  existingQuiz: QuizItem | null;
  lessonId?: string;
  moduleId?: string;
  onRefresh: () => Promise<void>;
  title: string;
};

export default function QuizEditorCard({ existingQuiz, lessonId, moduleId, onRefresh, title }: Props) {
  const { showToast } = useToast();
  const [quizDraft, setQuizDraft] = useState<QuizDraft>({ title, passing_score: 70, time_limit_minutes: 10 });
  const [questionDrafts, setQuestionDrafts] = useState<Record<string, QuestionDraft>>({});
  const [newQuestionDraft, setNewQuestionDraft] = useState<QuestionDraft>(emptyQuestionDraft);

  useEffect(() => {
    if (!existingQuiz) {
      setQuizDraft({ title, passing_score: 70, time_limit_minutes: 10 });
      setQuestionDrafts({});
      return;
    }

    setQuizDraft({
      title: existingQuiz.title,
      passing_score: existingQuiz.passing_score,
      time_limit_minutes: existingQuiz.time_limit_minutes,
    });

    const nextQuestionDrafts: Record<string, QuestionDraft> = {};
    (existingQuiz.questions || []).forEach((question) => {
      nextQuestionDrafts[question.id] = {
        prompt: question.prompt,
        optionsText: (question.options || []).join('\n'),
        correct_index: question.correct_index,
      };
    });
    setQuestionDrafts(nextQuestionDrafts);
  }, [existingQuiz, title]);

  const sortedQuestions = sortQuestions(existingQuiz?.questions || []);

  return (
    <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center gap-3">
        <div className="grid h-11 w-11 place-items-center rounded-2xl bg-violet-100 text-violet-700 dark:bg-violet-500/10 dark:text-violet-300">
          <FileQuestion className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-xl font-black">Quiz</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Configurez un quiz pour ce module ou cette lesson.</p>
        </div>
      </div>

      <div className="mt-6 grid gap-3 lg:grid-cols-3">
        <input
          value={quizDraft.title}
          onChange={(event) => setQuizDraft((prev) => ({ ...prev, title: event.target.value }))}
          className="rounded-2xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-900"
          placeholder="Titre du quiz"
        />
        <input
          type="number"
          min="0"
          max="100"
          value={quizDraft.passing_score}
          onChange={(event) => setQuizDraft((prev) => ({ ...prev, passing_score: Number(event.target.value) || 0 }))}
          className="rounded-2xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-900"
          placeholder="Score de validation"
        />
        <input
          type="number"
          min="1"
          value={quizDraft.time_limit_minutes}
          onChange={(event) => setQuizDraft((prev) => ({ ...prev, time_limit_minutes: Number(event.target.value) || 1 }))}
          className="rounded-2xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-900"
          placeholder="Temps limite"
        />
      </div>

      <div className="mt-4 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={async () => {
            try {
              if (existingQuiz) {
                await learningService.updateQuiz(existingQuiz.id, quizDraft);
              } else {
                await learningService.createQuiz({
                  title: quizDraft.title.trim(),
                  passing_score: quizDraft.passing_score,
                  time_limit_minutes: quizDraft.time_limit_minutes,
                  module: moduleId,
                  lesson: lessonId,
                });
              }
              await onRefresh();
              showToast('Quiz sauvegarde.', 'success');
            } catch {
              showToast('Sauvegarde du quiz impossible.', 'error');
            }
          }}
          className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white dark:bg-white dark:text-slate-950"
        >
          <Save className="h-4 w-4" />
          {existingQuiz ? 'Mettre a jour le quiz' : 'Creer le quiz'}
        </button>
        {existingQuiz ? (
          <button
            type="button"
            onClick={async () => {
              try {
                await learningService.deleteQuiz(existingQuiz.id);
                await onRefresh();
                showToast('Quiz supprime.', 'success');
              } catch {
                showToast('Suppression du quiz impossible.', 'error');
              }
            }}
            className="inline-flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300"
          >
            <Trash2 className="h-4 w-4" />
            Supprimer
          </button>
        ) : null}
      </div>

      {existingQuiz ? (
        <>
          <div className="mt-6 space-y-4">
            {sortedQuestions.map((question, index) => {
              const draft = questionDrafts[question.id];
              if (!draft) return null;

              return (
                <article key={question.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950">
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Question {index + 1}</p>
                  <div className="mt-3 grid gap-3">
                    <textarea
                      value={draft.prompt}
                      onChange={(event) => setQuestionDrafts((prev) => ({ ...prev, [question.id]: { ...draft, prompt: event.target.value } }))}
                      className="min-h-24 rounded-2xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-900"
                      placeholder="Question"
                    />
                    <textarea
                      value={draft.optionsText}
                      onChange={(event) => setQuestionDrafts((prev) => ({ ...prev, [question.id]: { ...draft, optionsText: event.target.value } }))}
                      className="min-h-28 rounded-2xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-900"
                      placeholder="Options, une ligne par choix"
                    />
                    <input
                      type="number"
                      min="0"
                      max={Math.max(parseOptions(draft.optionsText).length - 1, 0)}
                      value={draft.correct_index}
                      onChange={(event) => setQuestionDrafts((prev) => ({ ...prev, [question.id]: { ...draft, correct_index: Number(event.target.value) || 0 } }))}
                      className="rounded-2xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-900"
                      placeholder="Index de la bonne reponse"
                    />
                  </div>
                  <div className="mt-4 flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          await learningService.updateQuizQuestion(question.id, {
                            prompt: draft.prompt.trim(),
                            options: parseOptions(draft.optionsText),
                            correct_index: draft.correct_index,
                            order: question.order,
                          });
                          await onRefresh();
                          showToast('Question mise a jour.', 'success');
                        } catch {
                          showToast('Mise a jour de la question impossible.', 'error');
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
                          await learningService.deleteQuizQuestion(question.id);
                          await onRefresh();
                          showToast('Question supprimee.', 'success');
                        } catch {
                          showToast('Suppression de la question impossible.', 'error');
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
            <h3 className="text-lg font-bold">Nouvelle question</h3>
            <div className="mt-4 grid gap-3">
              <textarea
                value={newQuestionDraft.prompt}
                onChange={(event) => setNewQuestionDraft((prev) => ({ ...prev, prompt: event.target.value }))}
                className="min-h-24 rounded-2xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-900"
                placeholder="Question"
              />
              <textarea
                value={newQuestionDraft.optionsText}
                onChange={(event) => setNewQuestionDraft((prev) => ({ ...prev, optionsText: event.target.value }))}
                className="min-h-28 rounded-2xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-900"
                placeholder="Options, une ligne par choix"
              />
              <input
                type="number"
                min="0"
                max={Math.max(parseOptions(newQuestionDraft.optionsText).length - 1, 0)}
                value={newQuestionDraft.correct_index}
                onChange={(event) => setNewQuestionDraft((prev) => ({ ...prev, correct_index: Number(event.target.value) || 0 }))}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-900"
                placeholder="Index de la bonne reponse"
              />
            </div>
            <button
              type="button"
              onClick={async () => {
                if (!newQuestionDraft.prompt.trim()) {
                  showToast('Ajoutez le texte de la question.', 'error');
                  return;
                }

                try {
                  await learningService.createQuizQuestion({
                    quiz: existingQuiz.id,
                    prompt: newQuestionDraft.prompt.trim(),
                    options: parseOptions(newQuestionDraft.optionsText),
                    correct_index: newQuestionDraft.correct_index,
                    order: sortedQuestions.length + 1,
                  });
                  setNewQuestionDraft(emptyQuestionDraft);
                  await onRefresh();
                  showToast('Question ajoutee.', 'success');
                } catch {
                  showToast('Creation de la question impossible.', 'error');
                }
              }}
              className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-violet-600 px-4 py-3 text-sm font-bold text-white hover:bg-violet-500"
            >
              <Plus className="h-4 w-4" />
              Ajouter la question
            </button>
          </div>
        </>
      ) : null}
    </section>
  );
}

