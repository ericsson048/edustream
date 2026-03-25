import InstructorSidebar from '../../components/InstructorSidebar';
import Header from '../../components/Header';
import { Bot, CheckCircle2, ChevronLeft, ChevronRight, Lightbulb, Sparkles } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { aiService, type GeneratedCourseOutline } from '../../services/aiService';
import { courseService } from '../../services/courseService';
import type { Course, CourseCategory } from '../../types/lms';
import { useToast } from '../../contexts/ToastContext';

type WizardStep = 1 | 2 | 3 | 4;

type StepDefinition = {
  id: WizardStep;
  title: string;
  subtitle: string;
  helper: string;
};

const steps: StepDefinition[] = [
  {
    id: 1,
    title: 'Fondation',
    subtitle: 'Positionnement et promesse',
    helper: 'Definissez le sujet, le niveau, la categorie et la proposition de valeur.',
  },
  {
    id: 2,
    title: 'Pedagogie',
    subtitle: 'Objectifs et public',
    helper: 'Cadrez ce que l apprenant saura faire, pour qui le cours est fait et les prerequis.',
  },
  {
    id: 3,
    title: 'Structure',
    subtitle: 'IA et premiere trame',
    helper: 'Laissez l IA proposer une ossature de modules et lessons avant de passer au builder detaille.',
  },
  {
    id: 4,
    title: 'Revision',
    subtitle: 'Controle avant creation',
    helper: 'Verifiez la coherence globale et choisissez si le cours est publie ou en brouillon.',
  },
];

function parseLines(value: string) {
  return value
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean);
}

export default function CourseCreationWizard() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [step, setStep] = useState<WizardStep>(1);
  const [categories, setCategories] = useState<CourseCategory[]>([]);
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [language, setLanguage] = useState('en');
  const [level, setLevel] = useState<Course['level']>('INTERMEDIATE');
  const [price, setPrice] = useState('49.99');
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [objectivesText, setObjectivesText] = useState('');
  const [prerequisitesText, setPrerequisitesText] = useState('');
  const [targetAudienceText, setTargetAudienceText] = useState('');
  const [estimatedHours, setEstimatedHours] = useState(6);
  const [isPublished, setIsPublished] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiCoachReply, setAiCoachReply] = useState('');
  const [generatedOutline, setGeneratedOutline] = useState<GeneratedCourseOutline | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const autosaveKey = 'course-wizard-draft';

  const currentStep = useMemo(() => steps.find((item) => item.id === step) || steps[0], [step]);
  const selectedCategoryName = useMemo(() => categories.find((item) => item.id === categoryId)?.name || '', [categories, categoryId]);

  const stepChecks = useMemo(
    () => ({
      1: Boolean(title.trim() && subtitle.trim() && categoryId && price.trim()),
      2: Boolean(description.trim() && parseLines(objectivesText).length > 0 && parseLines(targetAudienceText).length > 0),
      3: Boolean(estimatedHours > 0),
      4: Boolean(title.trim() && description.trim()),
    }),
    [categoryId, description, estimatedHours, objectivesText, price, subtitle, targetAudienceText, title],
  );

  const checklist = useMemo(
    () => [
      { label: 'Titre et sous-titre clairs', done: stepChecks[1] },
      { label: 'Promesse pedagogique definie', done: stepChecks[2] },
      { label: 'Duree et structure initiale preparees', done: stepChecks[3] },
      { label: 'Cours pret a etre cree', done: stepChecks[4] },
    ],
    [stepChecks],
  );

  useEffect(() => {
    courseService
      .listCategories()
      .then((data) => {
        setCategories(data);
        setCategoryId((current) => current || data[0]?.id || '');
      })
      .catch(() => showToast('Impossible de charger les categories.', 'error'));
  }, [showToast]);

  useEffect(() => {
    const savedDraft = localStorage.getItem(autosaveKey);
    if (!savedDraft) return;

    try {
      const draft = JSON.parse(savedDraft) as {
        step?: WizardStep;
        title?: string;
        subtitle?: string;
        description?: string;
        categoryId?: string;
        language?: string;
        level?: Course['level'];
        price?: string;
        thumbnailUrl?: string;
        objectivesText?: string;
        prerequisitesText?: string;
        targetAudienceText?: string;
        estimatedHours?: number;
        isPublished?: boolean;
        aiPrompt?: string;
        aiCoachReply?: string;
        generatedOutline?: GeneratedCourseOutline | null;
      };

      setStep(draft.step || 1);
      setTitle(draft.title || '');
      setSubtitle(draft.subtitle || '');
      setDescription(draft.description || '');
      setCategoryId(draft.categoryId || '');
      setLanguage(draft.language || 'en');
      setLevel(draft.level || 'INTERMEDIATE');
      setPrice(draft.price || '49.99');
      setThumbnailUrl(draft.thumbnailUrl || '');
      setObjectivesText(draft.objectivesText || '');
      setPrerequisitesText(draft.prerequisitesText || '');
      setTargetAudienceText(draft.targetAudienceText || '');
      setEstimatedHours(draft.estimatedHours || 6);
      setIsPublished(draft.isPublished || false);
      setAiPrompt(draft.aiPrompt || '');
      setAiCoachReply(draft.aiCoachReply || '');
      setGeneratedOutline(draft.generatedOutline || null);
      showToast('Brouillon du wizard restaure.', 'success');
    } catch {
      localStorage.removeItem(autosaveKey);
    }
  }, [showToast]);

  useEffect(() => {
    localStorage.setItem(
      autosaveKey,
      JSON.stringify({
        step,
        title,
        subtitle,
        description,
        categoryId,
        language,
        level,
        price,
        thumbnailUrl,
        objectivesText,
        prerequisitesText,
        targetAudienceText,
        estimatedHours,
        isPublished,
        aiPrompt,
        aiCoachReply,
        generatedOutline,
      }),
    );
  }, [
    aiCoachReply,
    aiPrompt,
    categoryId,
    description,
    estimatedHours,
    generatedOutline,
    isPublished,
    language,
    level,
    objectivesText,
    prerequisitesText,
    price,
    step,
    subtitle,
    targetAudienceText,
    thumbnailUrl,
    title,
  ]);

  const askAiCoach = async () => {
    const promptByStep = {
      1: `Tu assistes un instructeur qui cree un cours e-learning. Etape: fondation. Titre: ${title || 'N/A'}. Categorie: ${selectedCategoryName || 'N/A'}. Niveau: ${level}. Prix: ${price}. Donne 4 conseils courts pour ameliorer le positionnement, le sous-titre et la promesse de vente.`,
      2: `Tu assistes un instructeur qui cree un cours e-learning. Etape: pedagogie. Titre: ${title || 'N/A'}. Description: ${description || 'N/A'}. Objectifs: ${objectivesText || 'N/A'}. Public cible: ${targetAudienceText || 'N/A'}. Donne des recommandations concretes pour renforcer objectifs, prerequis et audience cible.`,
      3: `Tu assistes un instructeur qui cree un cours e-learning. Etape: structure. Titre: ${title || 'N/A'}. Categorie: ${selectedCategoryName || 'N/A'}. Niveau: ${level}. Duree estimee: ${estimatedHours} heures. Propose une logique de modules, le bon rythme et les erreurs a eviter.`,
      4: `Tu assistes un instructeur qui cree un cours e-learning. Etape: revision. Titre: ${title || 'N/A'}. Description: ${description || 'N/A'}. Objectifs: ${objectivesText || 'N/A'}. Prerequis: ${prerequisitesText || 'N/A'}. Fais une revue finale concise avec points forts, manques et recommandation draft ou publish.`,
    } as const;

    setIsAiLoading(true);
    try {
      const reply = await aiService.askTutor(promptByStep[step]);
      setAiCoachReply(reply);
      showToast('Conseils IA mis a jour.', 'success');
    } catch {
      showToast('Assistant IA indisponible.', 'error');
    } finally {
      setIsAiLoading(false);
    }
  };

  const generateOutline = async () => {
    if (!title.trim() && !aiPrompt.trim()) {
      showToast('Ajoutez au moins un titre ou un prompt IA.', 'error');
      return;
    }

    setIsAiLoading(true);
    try {
      const outline = await aiService.generateCourse({
        prompt: aiPrompt.trim() || `Build a ${level.toLowerCase()} ${selectedCategoryName || 'general'} course named ${title}`,
        title,
        category: selectedCategoryName,
        level,
      });
      setGeneratedOutline(outline);
      if (!title.trim()) setTitle(outline.title);
      if (!description.trim()) setDescription(outline.description);
      if (!objectivesText.trim() && outline.learning_objectives?.length) setObjectivesText(outline.learning_objectives.join('\n'));
      if (!prerequisitesText.trim() && outline.prerequisites?.length) setPrerequisitesText(outline.prerequisites.join('\n'));
      showToast('Structure IA generee.', 'success');
    } catch {
      showToast('Generation IA impossible.', 'error');
    } finally {
      setIsAiLoading(false);
    }
  };

  const validateStep = (targetStep: WizardStep) => {
    if (targetStep === 2 && !stepChecks[1]) {
      showToast('Completez le positionnement du cours avant de continuer.', 'error');
      return false;
    }
    if (targetStep === 3 && !stepChecks[2]) {
      showToast('Ajoutez description, objectifs et public cible avant la structure.', 'error');
      return false;
    }
    if (targetStep === 4 && !stepChecks[3]) {
      showToast('Renseignez au moins la duree estimee avant la revision finale.', 'error');
      return false;
    }
    return true;
  };

  const goNext = () => {
    const nextStep = Math.min(4, step + 1) as WizardStep;
    if (nextStep !== step && validateStep(nextStep)) {
      setStep(nextStep);
    }
  };

  const goBack = () => setStep((prev) => Math.max(1, prev - 1) as WizardStep);

  const createCourse = async () => {
    if (!stepChecks[4]) {
      showToast('Le cours doit au minimum avoir un titre et une description.', 'error');
      return;
    }

    setIsCreating(true);
    try {
      const created = await courseService.createCourse({
        title: title.trim(),
        subtitle: subtitle.trim(),
        description: description.trim(),
        category_id: categoryId || undefined,
        language,
        level,
        thumbnail_url: thumbnailUrl.trim(),
        thumbnail_file: thumbnailFile || undefined,
        learning_objectives: parseLines(objectivesText),
        prerequisites: parseLines(prerequisitesText),
        target_audience: parseLines(targetAudienceText),
        estimated_hours: estimatedHours,
        price,
        is_published: isPublished,
      });

      if (generatedOutline) {
        sessionStorage.setItem(`pending-outline:${created.id}`, JSON.stringify(generatedOutline));
      }
      localStorage.removeItem(autosaveKey);

      showToast('Cours cree. Ouverture du builder detaille.', 'success');
      navigate(`/instructor/courses/edit/${created.id}`);
    } catch {
      showToast('Creation du cours impossible.', 'error');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900 transition-colors dark:bg-slate-950 dark:text-slate-100">
      <InstructorSidebar />
      <main className="ml-64 flex-1">
        <Header />
        <div className="mx-auto max-w-7xl px-8 py-8">
          <div className="grid gap-8 xl:grid-cols-[1.4fr,0.8fr]">
            <section className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                <div className="max-w-2xl">
                  <p className="text-xs font-bold uppercase tracking-[0.35em] text-teal-700 dark:text-teal-300">Course Wizard</p>
                  <h1 className="mt-3 text-4xl font-black tracking-tight">Creation guidee</h1>
                  <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
                    L instructeur avance etape par etape. L IA donne des conseils contextuels, puis peut generer une premiere structure avant le passage dans l editeur complet.
                  </p>
                </div>
                <div className="rounded-2xl border border-teal-200 bg-teal-50 px-4 py-3 text-sm font-semibold text-teal-800 dark:border-teal-500/20 dark:bg-teal-500/10 dark:text-teal-200">
                  Etape {step} / 4
                </div>
              </div>

              <div className="mt-6 grid gap-3 md:grid-cols-4">
                {steps.map((item) => {
                  const active = item.id === step;
                  const done = item.id < step;

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        if (item.id <= step || validateStep(item.id)) {
                          setStep(item.id);
                        }
                      }}
                      className={`rounded-2xl border px-4 py-4 text-left transition ${
                        active
                          ? 'border-teal-500 bg-teal-50 dark:border-teal-400 dark:bg-teal-500/10'
                          : done
                            ? 'border-emerald-300 bg-emerald-50 dark:border-emerald-500/20 dark:bg-emerald-500/10'
                            : 'border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {done ? <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-300" /> : <span className="text-sm font-black">{item.id}</span>}
                        <span className="font-semibold">{item.title}</span>
                      </div>
                      <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{item.subtitle}</p>
                    </button>
                  );
                })}
              </div>

              <div className="mt-8 rounded-[26px] border border-slate-200 bg-slate-50 p-6 dark:border-slate-800 dark:bg-slate-950">
                <div className="mb-5">
                  <p className="text-xs font-bold uppercase tracking-[0.25em] text-slate-500 dark:text-slate-400">{currentStep.title}</p>
                  <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{currentStep.helper}</p>
                </div>

                {step === 1 && (
                  <div className="space-y-4">
                    <h2 className="text-2xl font-bold">Fondation du cours</h2>
                    <div className="grid gap-4 xl:grid-cols-2">
                      <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Titre du cours" className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-900" />
                      <input value={subtitle} onChange={(e) => setSubtitle(e.target.value)} placeholder="Sous-titre concret et vendeur" className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-900" />
                      <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-900">
                        <option value="">Selectionnez une categorie</option>
                        {categories.map((item) => (
                          <option key={item.id} value={item.id}>{item.name}</option>
                        ))}
                      </select>
                      <input value={price} onChange={(e) => setPrice(e.target.value)} placeholder="Prix" className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-900" />
                      <select value={language} onChange={(e) => setLanguage(e.target.value)} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-900">
                        <option value="en">English</option>
                        <option value="fr">Francais</option>
                      </select>
                      <select value={level} onChange={(e) => setLevel(e.target.value as Course['level'])} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-900">
                        <option value="BEGINNER">Beginner</option>
                        <option value="INTERMEDIATE">Intermediate</option>
                        <option value="ADVANCED">Advanced</option>
                        <option value="ALL">All levels</option>
                      </select>
                    </div>
                    <div className="grid gap-4 xl:grid-cols-[1fr,0.9fr]">
                      <input value={thumbnailUrl} onChange={(e) => setThumbnailUrl(e.target.value)} placeholder="URL de miniature optionnelle" className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-900" />
                      <label className="block rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-3 text-sm font-semibold dark:border-slate-700 dark:bg-slate-900">
                        Upload miniature
                        <input type="file" accept="image/*" className="mt-2 block w-full text-xs" onChange={(e) => setThumbnailFile(e.target.files?.[0] || null)} />
                      </label>
                    </div>
                  </div>
                )}

                {step === 2 && (
                  <div className="space-y-4">
                    <h2 className="text-2xl font-bold">Pedagogie et public</h2>
                    <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={5} placeholder="Description du cours" className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-900" />
                    <div className="grid gap-4 xl:grid-cols-3">
                      <textarea value={objectivesText} onChange={(e) => setObjectivesText(e.target.value)} rows={6} placeholder="Objectifs, une ligne par element" className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-900" />
                      <textarea value={prerequisitesText} onChange={(e) => setPrerequisitesText(e.target.value)} rows={6} placeholder="Prerequis, une ligne par element" className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-900" />
                      <textarea value={targetAudienceText} onChange={(e) => setTargetAudienceText(e.target.value)} rows={6} placeholder="Public cible, une ligne par profil" className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-900" />
                    </div>
                  </div>
                )}

                {step === 3 && (
                  <div className="space-y-4">
                    <h2 className="text-2xl font-bold">Structure initiale avec IA</h2>
                    <div className="grid gap-4 xl:grid-cols-[1fr,0.35fr,0.45fr]">
                      <input value={aiPrompt} onChange={(e) => setAiPrompt(e.target.value)} placeholder="Prompt IA pour generer la premiere structure du cours" className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-900" />
                      <input type="number" min="0" value={estimatedHours} onChange={(e) => setEstimatedHours(Number(e.target.value) || 0)} placeholder="Heures estimees" className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-900" />
                      <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold dark:border-slate-700 dark:bg-slate-900">
                        <input type="checkbox" checked={isPublished} onChange={(e) => setIsPublished(e.target.checked)} />
                        Publie des la creation
                      </label>
                    </div>
                    <button type="button" className="inline-flex items-center gap-2 rounded-2xl bg-orange-500 px-4 py-3 font-bold text-white hover:bg-orange-400" onClick={generateOutline} disabled={isAiLoading}>
                      <Sparkles className="h-4 w-4" />
                      {isAiLoading ? 'Generation...' : 'Generer la structure IA'}
                    </button>
                    {generatedOutline && (
                      <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="font-semibold">{generatedOutline.title}</p>
                            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{generatedOutline.description}</p>
                          </div>
                          <span className="rounded-full bg-teal-100 px-3 py-1 text-xs font-bold text-teal-700 dark:bg-teal-500/10 dark:text-teal-300">
                            {generatedOutline.modules.length} modules
                          </span>
                        </div>
                        <div className="mt-4 grid gap-3 md:grid-cols-2">
                          {generatedOutline.modules.map((module, index) => (
                            <div key={`${module.title}-${index}`} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950">
                              <p className="font-semibold">{module.title}</p>
                              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{module.lessons.length} lessons</p>
                            </div>
                          ))}
                        </div>
                        <p className="mt-3 text-xs text-teal-700 dark:text-teal-300">Le plan sera transmis au builder detaille apres creation du cours.</p>
                      </div>
                    )}
                  </div>
                )}

                {step === 4 && (
                  <div className="space-y-4">
                    <h2 className="text-2xl font-bold">Revision finale</h2>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
                        <p className="text-xs font-bold uppercase tracking-[0.2em] text-teal-700 dark:text-teal-300">Positionnement</p>
                        <p className="mt-3 text-xl font-bold">{title || 'Titre non defini'}</p>
                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{subtitle || 'Sans sous-titre'}</p>
                        <p className="mt-3 text-sm">{selectedCategoryName || 'Sans categorie'} • {level} • {language.toUpperCase()}</p>
                        <p className="mt-1 text-sm">${price}</p>
                      </div>
                      <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
                        <p className="text-xs font-bold uppercase tracking-[0.2em] text-teal-700 dark:text-teal-300">Pedagogie</p>
                        <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">{description || 'Aucune description'}</p>
                        <p className="mt-3 text-sm">
                          {parseLines(objectivesText).length} objectifs • {parseLines(prerequisitesText).length} prerequis • {parseLines(targetAudienceText).length} audiences
                        </p>
                        <p className="mt-1 text-sm">{estimatedHours} heures estimees • {isPublished ? 'Publie' : 'Brouillon'}</p>
                      </div>
                    </div>
                    {generatedOutline && (
                      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200">
                        Le cours sera cree puis le builder proposera immediatement d importer le plan IA genere.
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="mt-6 flex items-center justify-between">
                <button type="button" className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 font-semibold hover:bg-slate-100 disabled:opacity-40 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800" onClick={goBack} disabled={step === 1}>
                  <ChevronLeft className="h-4 w-4" />
                  Retour
                </button>
                {step < 4 ? (
                  <button type="button" className="inline-flex items-center gap-2 rounded-2xl bg-teal-600 px-4 py-3 font-bold text-white hover:bg-teal-500" onClick={goNext}>
                    Suivant
                    <ChevronRight className="h-4 w-4" />
                  </button>
                ) : (
                  <button type="button" className="inline-flex items-center gap-2 rounded-2xl bg-orange-500 px-5 py-3 font-bold text-white hover:bg-orange-400 disabled:opacity-50" onClick={createCourse} disabled={isCreating}>
                    <CheckCircle2 className="h-4 w-4" />
                    {isCreating ? 'Creation...' : 'Creer le cours'}
                  </button>
                )}
              </div>
            </section>

            <aside className="space-y-6">
              <section className="rounded-[30px] border border-teal-200 bg-gradient-to-br from-teal-50 via-white to-slate-50 p-6 shadow-sm dark:border-teal-500/20 dark:from-slate-900 dark:via-slate-900 dark:to-teal-950/40">
                <div className="flex items-center gap-3">
                  <div className="grid h-12 w-12 place-items-center rounded-2xl border border-teal-300/40 bg-teal-500/10">
                    <Bot className="h-5 w-5 text-teal-700 dark:text-teal-200" />
                  </div>
                  <div>
                    <h2 className="text-xl font-black">Assistant IA</h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Conseils contextuels pour l etape en cours.</p>
                  </div>
                </div>
                <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
                  <p className="text-xs font-bold uppercase tracking-[0.25em] text-teal-700 dark:text-teal-300">{currentStep.title}</p>
                  <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
                    {aiCoachReply || "Demandez a l IA des recommandations specifiques pour cette etape avant de continuer."}
                  </p>
                </div>
                <button type="button" className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-white px-4 py-3 font-bold text-slate-950 hover:bg-teal-50 disabled:opacity-50 dark:bg-slate-900 dark:text-white dark:hover:bg-slate-800" onClick={askAiCoach} disabled={isAiLoading}>
                  <Lightbulb className="h-4 w-4" />
                  {isAiLoading ? 'Analyse...' : 'Demander conseil a l IA'}
                </button>
              </section>

              <section className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <h3 className="text-lg font-bold">Checklist</h3>
                <ul className="mt-4 space-y-3 text-sm">
                  {checklist.map((item) => (
                    <li key={item.label} className="flex items-center gap-3">
                      <span
                        className={`grid h-6 w-6 place-items-center rounded-full text-xs font-bold ${
                          item.done
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300'
                            : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                        }`}
                      >
                        {item.done ? 'OK' : '...'}
                      </span>
                      <span className="text-slate-600 dark:text-slate-300">{item.label}</span>
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  className="mt-5 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-800"
                  onClick={() => {
                    localStorage.removeItem(autosaveKey);
                    setStep(1);
                    setTitle('');
                    setSubtitle('');
                    setDescription('');
                    setCategoryId(categories[0]?.id || '');
                    setLanguage('en');
                    setLevel('INTERMEDIATE');
                    setPrice('49.99');
                    setThumbnailUrl('');
                    setThumbnailFile(null);
                    setObjectivesText('');
                    setPrerequisitesText('');
                    setTargetAudienceText('');
                    setEstimatedHours(6);
                    setIsPublished(false);
                    setAiPrompt('');
                    setAiCoachReply('');
                    setGeneratedOutline(null);
                    showToast('Brouillon local supprime.', 'success');
                  }}
                >
                  Reinitialiser le brouillon local
                </button>
              </section>

              <section className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <h3 className="text-lg font-bold">Bon workflow</h3>
                <ul className="mt-4 space-y-3 text-sm text-slate-600 dark:text-slate-300">
                  <li>1. Positionnez clairement le cours avant de penser au contenu detaille.</li>
                  <li>2. Definissez une promesse d apprentissage concrete et un public cible realiste.</li>
                  <li>3. Laissez l IA proposer une premiere trame, puis corrigez dans le builder.</li>
                  <li>4. Creez en brouillon si les lessons et quiz ne sont pas encore finalises.</li>
                </ul>
              </section>
            </aside>
          </div>
        </div>
      </main>
    </div>
  );
}
