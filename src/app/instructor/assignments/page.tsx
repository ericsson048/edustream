import InstructorSidebar from '../../../components/InstructorSidebar';
import Header from '../../../components/Header';
import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { useToast } from '../../../contexts/ToastContext';
import { courseService } from '../../../services/courseService';
import { learningService, type AssignmentItem, type AssignmentStats, type SubmissionItem } from '../../../services/learningService';
import DocumentPreviewUrl from '../../../components/DocumentPreviewUrl';
import type { Course } from '../../../types/lms';
import {
  AlertTriangle,
  Award,
  BarChart3,
  CheckCircle2,
  Clock,
  Eye,
  FileText,
  Globe,
  Plus,
  Send,
  Trash2,
  UploadCloud,
  Users,
  X,
} from 'lucide-react';

const ASSIGNMENT_TYPES = ['PROJECT', 'QUIZ', 'ESSAY', 'REPORT', 'CODE'] as const;
const EXTENSION_OPTIONS = ['.pdf', '.doc', '.docx', '.zip', '.rar', '.ppt', '.pptx', '.xls', '.xlsx', '.txt', '.js', '.ts', '.jsx', '.tsx', '.py', '.jpg', '.png', '.mp4', '.webm'];

type SubmissionDraft = {
  grade: string;
  feedback: string;
};

function formatBytes(bytes?: number | null) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export default function ManageAssignments() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [courses, setCourses] = useState<Course[]>([]);
  const [assignments, setAssignments] = useState<AssignmentItem[]>([]);
  const [submissions, setSubmissions] = useState<SubmissionItem[]>([]);
  const [courseId, setCourseId] = useState('');
  const [drafts, setDrafts] = useState<Record<string, SubmissionDraft>>({});

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [points, setPoints] = useState('100');
  const [type, setType] = useState<string>('PROJECT');
  const [allowedExt, setAllowedExt] = useState<string[]>([]);
  const [maxSize, setMaxSize] = useState('50');
  const [instructionsFile, setInstructionsFile] = useState<File | null>(null);
  const [instructionsUrl, setInstructionsUrl] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [showCreate, setShowCreate] = useState(false);

  const [statsFor, setStatsFor] = useState<AssignmentItem | null>(null);
  const [stats, setStats] = useState<AssignmentStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const [extensions, setExtensions] = useState<Record<string, string>>({});
  const [extendingId, setExtendingId] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ url: string; name: string } | null>(null);

  const refresh = async () => {
    if (!user?.id) return;
    const [courseList, assignmentList, submissionList] = await Promise.all([
      courseService.listCourses({ instructor: user.id }),
      learningService.listAssignments(),
      learningService.listSubmissions(),
    ]);
    setCourses(courseList);
    setAssignments(assignmentList);
    setSubmissions(submissionList);
    setCourseId((current) => current || courseList[0]?.id || '');
    setDrafts(
      Object.fromEntries(
        submissionList.map((submission) => [
          submission.id,
          { grade: submission.grade || '', feedback: submission.feedback || '' },
        ]),
      ),
    );
  };

  useEffect(() => {
    refresh().catch(() => showToast('Impossible de charger les assignments instructeur.', 'error'));
  }, [showToast, user?.id]);

  const filteredAssignments = useMemo(
    () => assignments.filter((assignment) => !courseId || assignment.course === courseId),
    [assignments, courseId],
  );
  const filteredSubmissions = useMemo(
    () => submissions.filter((submission) => !courseId || submission.course_id === courseId),
    [courseId, submissions],
  );
  const assignmentById = useMemo(() => Object.fromEntries(assignments.map((a) => [a.id, a])), [assignments]);

  const resetCreateForm = () => {
    setTitle('');
    setDescription('');
    setDueDate('');
    setPoints('100');
    setType('PROJECT');
    setAllowedExt([]);
    setMaxSize('50');
    setInstructionsFile(null);
    setInstructionsUrl('');
  };

  const handleCreate = async () => {
    if (!courseId || !title.trim() || !dueDate) {
      showToast('Cours, titre et date limite sont requis.', 'error');
      return;
    }
    setIsCreating(true);
    try {
      await learningService.createAssignment({
        course: courseId,
        title: title.trim(),
        description,
        due_date: new Date(dueDate).toISOString(),
        points: Number(points) || 100,
        type,
        allowed_extensions: allowedExt,
        max_file_size_mb: Number(maxSize) || 50,
        instructions_url: instructionsUrl.trim(),
        instructions_name: instructionsFile?.name || '',
        attachment: instructionsFile || undefined,
      });
      resetCreateForm();
      setShowCreate(false);
      await refresh();
      showToast('Devoir ajouté et étudiants notifiés.', 'success');
    } catch {
      showToast('Création du devoir impossible.', 'error');
    } finally {
      setIsCreating(false);
    }
  };

  const openStats = async (assignment: AssignmentItem) => {
    setStatsFor(assignment);
    setStats(null);
    setLoadingStats(true);
    try {
      setStats(await learningService.getAssignmentStats(assignment.id));
    } catch {
      showToast('Impossible de charger les statistiques.', 'error');
    } finally {
      setLoadingStats(false);
    }
  };

  const handlePublishAll = async (assignment: AssignmentItem) => {
    try {
      const result = await learningService.publishAssignmentGrades(assignment.id);
      await refresh();
      showToast(`${result.published} note(s) publiée(s).`, 'success');
    } catch {
      showToast('Publication impossible.', 'error');
    }
  };

  const handlePublishOne = async (submission: SubmissionItem) => {
    try {
      await learningService.publishSubmission(submission.id);
      await refresh();
      showToast('Note publiée.', 'success');
    } catch {
      showToast('Publication impossible.', 'error');
    }
  };

  const handleExtend = async (assignment: AssignmentItem, studentId: string) => {
    const deadline = extensions[studentId];
    if (!deadline) {
      showToast('Choisis une nouvelle échéance.', 'error');
      return;
    }
    setExtendingId(studentId);
    try {
      await learningService.extendDeadline(assignment.id, studentId, new Date(deadline).toISOString());
      setExtensions((current) => ({ ...current, [studentId]: '' }));
      showToast('Prolongation accordée.', 'success');
      openStats(assignment);
    } catch {
      showToast('Prolongation impossible.', 'error');
    } finally {
      setExtendingId(null);
    }
  };

  const toggleExt = (ext: string) => {
    setAllowedExt((current) => (current.includes(ext) ? current.filter((e) => e !== ext) : [...current, ext]));
  };

  const distributionRows = stats
    ? Object.keys(stats.distribution)
        .map((bucket) => ({ bucket, count: stats.distribution[bucket] }))
        .sort((a, b) => parseInt(a.bucket) - parseInt(b.bucket))
    : [];

  return (
    <div className="flex min-h-screen bg-slate-50">
      <InstructorSidebar />
      <main className="flex-1 ml-64">
        <Header />
        <div className="p-8 max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl font-bold">Grading & Assignments</h1>
            <button
              onClick={() => setShowCreate(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" /> Créer un devoir
            </button>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden mb-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between px-6 py-4 border-b border-slate-200 gap-4">
              <h2 className="font-bold text-lg text-slate-900">📋 Devoirs existants</h2>
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-600 font-medium hidden sm:inline">Filtrer par cours:</span>
                <select value={courseId} onChange={(e) => setCourseId(e.target.value)} className="border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium bg-white hover:border-blue-400 transition-colors focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                  <option value="">📚 Tous les cours ({courses.length})</option>
                  {courses.map((course) => (
                    <option key={course.id} value={course.id}>
                      {course.title}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            {filteredAssignments.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <div className="text-4xl mb-3">📝</div>
                <p className="text-slate-600 font-medium">Aucun devoir pour ce scope</p>
                <p className="text-sm text-slate-500 mt-1">Créez votre premier devoir pour commencer</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs font-bold uppercase tracking-wide text-slate-600 border-b border-slate-200 bg-linear-to-r from-slate-50 to-slate-100">
                      <th className="px-6 py-4 text-slate-700">📄 Devoir</th>
                      <th className="px-6 py-4 text-slate-700">🏷️ Type</th>
                      <th className="px-6 py-4 text-slate-700">⏰ Échéance</th>
                      <th className="px-6 py-4 text-slate-700">⭐ Points</th>
                      <th className="px-6 py-4 text-slate-700 hidden lg:table-cell">📁 Formats</th>
                      <th className="px-6 py-4 text-slate-700 hidden md:table-cell">📋 Consignes</th>
                      <th className="px-6 py-4 text-right text-slate-700">⚙️ Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredAssignments.map((assignment) => {
                      const gradedUnpublished = submissions.filter((s) => s.assignment === assignment.id && s.status === 'GRADED' && !s.is_published).length;
                      const submittedCount = submissions.filter((s) => s.assignment === assignment.id).length;
                      return (
                        <tr key={assignment.id} className="hover:bg-blue-50/30 transition-colors border-l-4 border-l-transparent hover:border-l-blue-500">
                          <td className="px-6 py-4">
                            <p className="font-semibold text-slate-900">{assignment.title}</p>
                            <p className="text-xs text-slate-500">{assignment.course_title || assignment.course}</p>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-xs font-bold uppercase tracking-wide px-2 py-1 rounded-lg bg-slate-100 text-slate-600">{assignment.type}</span>
                          </td>
                          <td className="px-6 py-4 text-slate-600">
                            <span className="inline-flex items-center gap-1 whitespace-nowrap">
                              <Clock className="w-3.5 h-3.5 text-slate-400" /> {new Date(assignment.due_date).toLocaleString()}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-slate-600">
                            <span className="inline-flex items-center gap-1">
                              <Award className="w-3.5 h-3.5 text-slate-400" /> {assignment.points} pts
                            </span>
                          </td>
                          <td className="px-6 py-4 text-xs text-slate-500 whitespace-nowrap">
                            <span className="inline-flex items-center gap-1">
                              <FileText className="w-3.5 h-3.5 text-slate-400" /> {assignment.allowed_extensions?.length ? assignment.allowed_extensions.join(', ') : 'Tous formats'} · {assignment.max_file_size_mb} Mo max
                            </span>
                          </td>

                          <td className="px-6 py-4 hidden md:table-cell">
                            {assignment.instructions_url ? (
                              <button
                                type="button"
                                onClick={() => setPreview({ url: assignment.instructions_url!, name: assignment.instructions_name || 'Consignes' })}
                                className="inline-flex items-center gap-1.5 text-blue-600 font-semibold hover:text-blue-700 hover:underline cursor-pointer transition-colors text-sm"
                              >
                                <Eye className="w-4 h-4" /> Voir
                              </button>
                            ) : (
                              <span className="text-xs text-slate-300">—</span>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center justify-end gap-1.5 flex-wrap">
                              <button onClick={() => openStats(assignment)} className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all hover:shadow-sm" title="Voir les statistiques">
                                <BarChart3 className="w-4 h-4" /> <span className="hidden xl:inline">Stats</span>
                              </button>
                              {gradedUnpublished > 0 && (
                                <button onClick={() => handlePublishAll(assignment)} className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white text-xs font-bold transition-all hover:shadow-sm" title={`Publier ${gradedUnpublished} note(s)`}>
                                  <Send className="w-4 h-4" /> Publier {gradedUnpublished} note(s)
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h2 className="font-bold text-lg">Soumissions</h2>
              <span className="text-xs text-slate-500">{filteredSubmissions.length} copie(s)</span>
            </div>
            <div className="divide-y divide-slate-100">
              {filteredSubmissions.length === 0 && <div className="px-6 py-5 text-sm text-slate-500">Aucune soumission trouvée.</div>}
              {filteredSubmissions.map((submission) => {
                const assignment = assignmentById[submission.assignment];
                const maxPoints = assignment?.points ?? 100;
                return (
                  <div key={submission.id} className="px-6 py-5 grid gap-4 lg:grid-cols-[1.1fr,0.5fr,0.6fr,0.9fr,auto] items-start">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-slate-900">{submission.assignment_title || submission.assignment}</p>
                        {submission.is_late && (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">
                            <AlertTriangle className="w-3 h-3" /> En retard
                          </span>
                        )}
                        {submission.status === 'GRADED' && (
                          <span className={`inline-flex items-center gap-1 text-xs font-bold rounded-full px-2 py-0.5 ${submission.is_published ? 'text-green-700 bg-green-50 border border-green-200' : 'text-slate-600 bg-slate-100 border border-slate-200'}`}>
                            {submission.is_published ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />} {submission.is_published ? 'Publié' : 'Brouillon'}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-slate-500">{submission.student_name || submission.student}</p>
                      <p className="text-xs text-slate-400 mt-1">{submission.course_title || 'Cours'} · {new Date(submission.submitted_at).toLocaleString()}</p>
                      {submission.file_url && (
                        <button
                          type="button"
                          onClick={() => setPreview({ url: submission.file_url!, name: submission.file_name || 'Fichier' })}
                          className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:underline cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" /> {submission.file_name || 'Fichier'} {submission.file_size ? `(${formatBytes(submission.file_size)})` : ''}
                        </button>
                      )}
                      {submission.content_text && <p className="mt-1 text-xs text-slate-500 whitespace-pre-wrap">{submission.content_text}</p>}
                    </div>
                    <div className="text-sm">
                      <p className="font-semibold text-slate-700">Statut</p>
                      <p className="text-slate-500">{submission.status}</p>
                    </div>
                    <input
                      type="number"
                      min="0"
                      max={maxPoints}
                      value={drafts[submission.id]?.grade || ''}
                      onChange={(e) =>
                        setDrafts((current) => ({
                          ...current,
                          [submission.id]: { ...(current[submission.id] || { grade: '', feedback: '' }), grade: e.target.value },
                        }))
                      }
                      placeholder={`Note /${maxPoints}`}
                      className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm"
                    />
                    <textarea
                      value={drafts[submission.id]?.feedback || ''}
                      onChange={(e) =>
                        setDrafts((current) => ({
                          ...current,
                          [submission.id]: { ...(current[submission.id] || { grade: '', feedback: '' }), feedback: e.target.value },
                        }))
                      }
                      placeholder="Feedback pour l'étudiant"
                      rows={3}
                      className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm"
                    />
                    <div className="flex flex-col gap-2">
                      <button
                        className="px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold"
                        onClick={async () => {
                          const draft = drafts[submission.id];
                          if (!draft?.grade) {
                            showToast('Ajoute une note avant de sauvegarder.', 'error');
                            return;
                          }
                          const numeric = Number(draft.grade);
                          if (Number.isNaN(numeric) || numeric < 0 || numeric > maxPoints) {
                            showToast(`La note doit être entre 0 et ${maxPoints}.`, 'error');
                            return;
                          }
                          try {
                            await learningService.gradeSubmission(submission.id, {
                              grade: draft.grade,
                              feedback: draft.feedback,
                              status: 'GRADED',
                            });
                            await refresh();
                            showToast('Soumission notée.', 'success');
                          } catch {
                            showToast('Notation impossible.', 'error');
                          }
                        }}
                      >
                        Sauvegarder la note
                      </button>
                      {submission.status === 'GRADED' && !submission.is_published && (
                        <button
                          onClick={() => handlePublishOne(submission)}
                          className="px-4 py-2.5 bg-green-600 text-white rounded-xl text-sm font-semibold hover:bg-green-700 transition-colors"
                        >
                          Publier
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </main>

      {showCreate && (
        <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4" onClick={() => setShowCreate(false)}>
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between">
              <h3 className="font-bold text-lg text-slate-900">Créer un devoir</h3>
              <button onClick={() => setShowCreate(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-3">
              <select value={courseId} onChange={(e) => setCourseId(e.target.value)} className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm">
                <option value="">Choisir un cours</option>
                {courses.map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.title}
                  </option>
                ))}
              </select>
              <div className="grid grid-cols-2 gap-3">
                <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Titre du devoir" className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm" />
                <select value={type} onChange={(e) => setType(e.target.value)} className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm">
                  {ASSIGNMENT_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Consignes du devoir" rows={4} className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm" />
              <div className="grid grid-cols-3 gap-3">
                <input type="datetime-local" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm" />
                <input type="number" min="1" value={points} onChange={(e) => setPoints(e.target.value)} placeholder="Points" className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm" />
                <input type="number" min="1" value={maxSize} onChange={(e) => setMaxSize(e.target.value)} placeholder="Max (Mo)" className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-500 mb-2">Formats acceptés (vide = tous)</p>
                <div className="flex flex-wrap gap-1.5">
                  {EXTENSION_OPTIONS.map((ext) => (
                    <button
                      key={ext}
                      type="button"
                      onClick={() => toggleExt(ext)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-colors ${
                        allowedExt.includes(ext)
                          ? 'bg-blue-600 border-blue-600 text-white'
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-blue-400'
                      }`}
                    >
                      {ext}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <label className="flex-1 flex items-center gap-3 border border-dashed border-slate-300 rounded-xl px-4 py-3 cursor-pointer hover:border-blue-400 hover:bg-blue-50/40 transition-colors">
                  <UploadCloud className="w-5 h-5 text-slate-400" />
                  <span className="text-sm text-slate-600 truncate">{instructionsFile?.name || 'Joindre un fichier de consignes'}</span>
                  <input
                    type="file"
                    className="hidden"
                    onChange={(e) => setInstructionsFile(e.target.files?.[0] || null)}
                  />
                </label>
                {instructionsFile && (
                  <button type="button" onClick={() => setInstructionsFile(null)} className="text-slate-400 hover:text-red-500">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
              <input value={instructionsUrl} onChange={(e) => setInstructionsUrl(e.target.value)} placeholder="Lien de consignes (URL, optionnel)" className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm" />
              <div className="pt-4 border-t border-slate-100 flex justify-end gap-2">
                <button onClick={() => setShowCreate(false)} className="px-4 py-3 bg-slate-100 text-slate-700 rounded-xl text-sm font-semibold hover:bg-slate-200 transition-colors">
                  Annuler
                </button>
                <button
                  disabled={isCreating}
                  className="px-6 py-3 bg-blue-600 text-white rounded-xl text-sm font-semibold disabled:opacity-50"
                  onClick={handleCreate}
                >
                  {isCreating ? 'Création...' : 'Créer le devoir'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {statsFor && (
        <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4" onClick={() => setStatsFor(null)}>
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b border-slate-100 px-6 py-4 flex items-start justify-between">
              <div>
                <h3 className="font-bold text-slate-900">{statsFor.title}</h3>
                <p className="text-sm text-slate-500">Statistiques de réussite</p>
              </div>
              <button onClick={() => setStatsFor(null)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            {loadingStats && !stats ? (
              <div className="p-10 text-center text-sm text-slate-500">Chargement...</div>
            ) : stats ? (
              <div className="p-6 space-y-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="rounded-xl bg-slate-50 border border-slate-100 p-4">
                    <div className="flex items-center gap-2 text-slate-500 text-xs font-bold"><Users className="w-4 h-4" /> Inscrits</div>
                    <p className="mt-1 text-2xl font-bold text-slate-900">{stats.total_enrolled}</p>
                  </div>
                  <div className="rounded-xl bg-slate-50 border border-slate-100 p-4">
                    <div className="flex items-center gap-2 text-slate-500 text-xs font-bold"><FileText className="w-4 h-4" /> Rendu</div>
                    <p className="mt-1 text-2xl font-bold text-slate-900">{stats.submitted_count}</p>
                  </div>
                  <div className="rounded-xl bg-slate-50 border border-slate-100 p-4">
                    <div className="flex items-center gap-2 text-slate-500 text-xs font-bold"><Award className="w-4 h-4" /> Moyenne</div>
                    <p className="mt-1 text-2xl font-bold text-slate-900">{stats.average_grade != null ? `${stats.average_percent ?? 0}%` : '—'}</p>
                    <p className="text-xs text-slate-500">{stats.graded_count} notée(s)</p>
                  </div>
                  <div className="rounded-xl bg-amber-50 border border-amber-100 p-4">
                    <div className="flex items-center gap-2 text-amber-600 text-xs font-bold"><AlertTriangle className="w-4 h-4" /> Manquants</div>
                    <p className="mt-1 text-2xl font-bold text-slate-900">{stats.missing_count}</p>
                    <p className="text-xs text-amber-600">{stats.late_count} en retard</p>
                  </div>
                </div>

                <div>
                  <p className="text-sm font-bold text-slate-700 mb-2">Distribution des notes</p>
                  <div className="space-y-1.5">
                    {distributionRows.map(({ bucket, count }) => {
                      const max = Math.max(...distributionRows.map((r) => r.count), 1);
                      return (
                        <div key={bucket} className="flex items-center gap-3">
                          <span className="w-16 text-xs text-slate-500 text-right">{bucket}%</span>
                          <div className="flex-1 bg-slate-100 rounded-full h-3">
                            <div className="h-3 rounded-full bg-blue-500 transition-all" style={{ width: `${(count / max) * 100}%` }} />
                          </div>
                          <span className="w-6 text-xs text-slate-600">{count}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <p className="text-sm font-bold text-slate-700 mb-2">Étudiants sans rendu ({stats.missing_count})</p>
                  {stats.missing_students.length === 0 ? (
                    <p className="text-sm text-slate-500">Tous les étudiants ont rendu.</p>
                  ) : (
                    <div className="space-y-2">
                      {stats.missing_students.map((student) => (
                        <div key={student.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 p-3">
                          <div className="flex-1 min-w-[160px]">
                            <p className="text-sm font-semibold text-slate-900">{student.full_name}</p>
                            <p className="text-xs text-slate-500">{student.email}</p>
                          </div>
                          <input
                            type="datetime-local"
                            value={extensions[student.id] || ''}
                            onChange={(e) => setExtensions((current) => ({ ...current, [student.id]: e.target.value }))}
                            className="border border-slate-200 rounded-xl px-3 py-2 text-sm"
                          />
                          <button
                            disabled={extendingId === student.id}
                            onClick={() => handleExtend(statsFor, student.id)}
                            className="px-3 py-2 bg-slate-800 text-white rounded-xl text-xs font-bold hover:bg-slate-700 disabled:opacity-50"
                          >
                            Prolonger
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {statsFor.instructions_url && (
                  <button
                    type="button"
                    onClick={() => setPreview({ url: statsFor.instructions_url!, name: statsFor.instructions_name || 'Consignes' })}
                    className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer hover:text-blue-600"
                  >
                    <Globe className="w-4 h-4" />
                    <span className="text-blue-600 font-semibold hover:underline">Voir les consignes</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="p-10 text-center text-sm text-slate-500">Aucune donnée.</div>
            )}
          </div>
        </div>
      )}
      {preview && (
        <DocumentPreviewUrl
          documentUrl={preview.url}
          documentName={preview.name}
          onClose={() => setPreview(null)}
        />
      )}
    </div>
  );
}
