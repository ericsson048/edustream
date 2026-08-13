import Sidebar from '../../../../components/Sidebar';
import Header from '../../../../components/Header';
import {
  UploadCloud,
  FileText,
  ArrowLeft,
  CheckCircle,
  Eye,
  Award,
  Clock,
  Loader2,
  Pencil,
  X,
} from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import React, { useEffect, useState } from 'react';
import {
  learningService,
  type AssignmentItem,
  type SubmissionItem,
} from '../../../../services/learningService';
import { useToast } from '../../../../contexts/ToastContext';
import DocumentPreviewUrl from '../../../../components/DocumentPreviewUrl';

function stripNotesPrefix(text: string) {
  return text.replace(/^Submission notes:\s*/i, '').trim();
}

export default function SubmitAssignment() {
  const { id = '' } = useParams();
  const [assignment, setAssignment] = useState<AssignmentItem | null>(null);
  const [existing, setExisting] = useState<SubmissionItem | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [submissionUrl, setSubmissionUrl] = useState('');
  const [comments, setComments] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [preview, setPreview] = useState<{ url: string; name: string } | null>(null);
  const navigate = useNavigate();
  const { showToast } = useToast();

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setLoaded(false);
    Promise.all([
      learningService.getAssignment(id),
      learningService.listSubmissionsByAssignment(id),
    ])
      .then(([a, subs]) => {
        if (cancelled) return;
        setAssignment(a);
        const mine = subs[0] ?? null;
        setExisting(mine);
        if (mine) {
          setSubmissionUrl(mine.file_name ? '' : (mine.file_url ?? ''));
          setComments(stripNotesPrefix(mine.content_text ?? ''));
        }
      })
      .catch(() => showToast('Devoir introuvable.', 'error'))
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [id, showToast]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

  const validateFile = () => {
    if (!assignment || !file) return true;
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    if (assignment.allowed_extensions?.length && !assignment.allowed_extensions.includes(ext)) {
      showToast(
        `Format ${ext} non autorisé. Formats acceptés : ${assignment.allowed_extensions.join(', ')}.`,
        'error',
      );
      return false;
    }
    if (file.size > (assignment.max_file_size_mb || 50) * 1024 * 1024) {
      showToast(`Fichier trop volumineux (max ${assignment.max_file_size_mb || 50} Mo).`, 'error');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    if (!validateFile()) return;
    if (!file && !submissionUrl.trim() && !comments.trim()) {
      showToast('Déposez un fichier, ajoutez un lien ou un commentaire.', 'error');
      return;
    }
    setIsSaving(true);
    try {
      if (existing) {
        await learningService.updateSubmission(existing.id, {
          content_text: comments.trim(),
          file_url: submissionUrl.trim(),
          file: file || undefined,
        });
      } else {
        await learningService.createSubmission({
          assignment: id,
          content_text: comments.trim(),
          file_url: submissionUrl.trim(),
          file: file || undefined,
        });
      }
      setSuccess(true);
      setTimeout(() => {
        navigate('/assignments');
      }, 1600);
    } catch {
      showToast('Soumission impossible.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const acceptAttr = assignment?.allowed_extensions?.length
    ? assignment.allowed_extensions.join(',')
    : '.zip,.rar,.pdf,.doc,.docx,.js,.jsx,.ts,.tsx,.py,.txt';

  const isPublished = !!existing?.is_published;
  const canEdit = !!existing && !isPublished;

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans text-slate-900">
      <Sidebar />
      <main className="flex-1 ml-64">
        <Header />
        <div className="p-8 mx-auto">
          <Link
            to="/assignments"
            className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-900 transition-colors mb-8"
          >
            <ArrowLeft className="w-4 h-4" /> Retour aux devoirs
          </Link>

          <div className="mb-8">
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
              {existing ? 'Ma soumission' : 'Rendre mon devoir'}
            </h1>
            <p className="text-slate-500 mt-1">{assignment?.title || 'Chargement…'}</p>
          </div>

          {success ? (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 text-center">
              <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-10 h-10" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 mb-2">
                {existing ? 'Soumission mise à jour !' : 'Devoir soumis !'}
              </h2>
              <p className="text-slate-500">
                Votre travail a bien été transmis à l'instructeur pour correction.
              </p>
            </div>
          ) : !loaded ? (
            <div className="flex justify-center py-20">
              <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
            </div>
          ) : !assignment ? (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 text-center">
              <FileText className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 font-medium">Ce devoir est introuvable.</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
              <div className="mb-8 p-6 bg-slate-50 rounded-xl border border-slate-100 space-y-3">
                <h3 className="font-bold text-slate-900 mb-2">Consignes</h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  {assignment.description ||
                    'Consultez les consignes du devoir puis ajoutez vos notes de rendu ou un lien vers votre travail.'}
                </p>
                <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
                  <span className="inline-flex items-center gap-2">
                    <Clock className="w-4 h-4 text-blue-600" />
                    <span className="text-slate-500">
                      Échéance : {new Date(assignment.due_date).toLocaleString('fr-FR')}
                    </span>
                  </span>
                  <span className="inline-flex items-center gap-2">
                    <Award className="w-4 h-4 text-blue-600" />
                    <span className="text-slate-500">{assignment.points ?? 100} points</span>
                  </span>
                  <span className="inline-flex items-center gap-2">
                    <FileText className="w-4 h-4 text-blue-600" />
                    <span className="text-slate-500">
                      {assignment.allowed_extensions?.length
                        ? assignment.allowed_extensions.join(', ')
                        : 'Tous formats'}{' '}
                      · {assignment.max_file_size_mb ?? 50} Mo max
                    </span>
                  </span>
                  {assignment.instructions_url && (
                    <button
                      type="button"
                      onClick={() =>
                        setPreview({
                          url: assignment.instructions_url!,
                          name: assignment.instructions_name || 'Consignes',
                        })
                      }
                      className="inline-flex items-center gap-2 text-blue-600 font-bold hover:underline cursor-pointer bg-transparent border-none"
                    >
                      <Eye className="w-4 h-4" /> {assignment.instructions_name || 'Aperçu des consignes'}
                    </button>
                  )}
                </div>
              </div>

              {isPublished ? (
                <div className="p-6 bg-green-50 rounded-2xl border border-green-200">
                  <p className="font-bold text-green-700 mb-1 flex items-center gap-2">
                    <CheckCircle size={18} /> Devoir corrigé et publié
                  </p>
                  <p className="text-3xl font-bold text-green-600 mt-2">
                    {existing?.grade} / {assignment.points}
                  </p>
                  {existing?.feedback && (
                    <p className="text-sm text-slate-700 mt-3 border-t border-green-200 pt-3 whitespace-pre-wrap">
                      {existing.feedback}
                    </p>
                  )}
                  <div className="mt-5 flex items-center gap-3">
                    <Link
                      to="/assignments"
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-green-600 text-white text-sm font-bold hover:bg-green-700 transition-colors"
                    >
                      Retour aux devoirs
                    </Link>
                    {existing?.file_url && (
                      <button
                        onClick={() =>
                          setPreview({
                            url: existing.file_url!,
                            name: existing.file_name || 'Ma soumission',
                          })
                        }
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-green-300 text-green-700 text-sm font-bold hover:bg-green-100 transition-colors cursor-pointer bg-transparent"
                      >
                        <Eye size={15} /> Voir ma soumission
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <>
                  {canEdit && (
                    <div className="mb-6 p-4 bg-blue-50 rounded-xl border border-blue-200 flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                        <Pencil size={16} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-blue-800">
                          Vous avez déjà soumis ce devoir
                        </p>
                        <p className="text-xs text-blue-600">
                          Rendu le{' '}
                          {new Date(existing!.submitted_at).toLocaleString('fr-FR', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                          {existing!.is_late ? ' (en retard)' : ''}
                        </p>
                      </div>
                    </div>
                  )}

                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-4">
                        Déposer votre travail
                      </label>
                      <div
                        className={`border-2 border-dashed rounded-2xl p-10 text-center transition-colors ${
                          isDragging
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-slate-300 hover:border-blue-400 hover:bg-slate-50'
                        }`}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                      >
                        <input
                          type="file"
                          id="file-upload"
                          className="hidden"
                          onChange={handleFileChange}
                          accept={acceptAttr}
                        />
                        <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center">
                          <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-4">
                            <UploadCloud className="w-8 h-8" />
                          </div>
                          <span className="font-bold text-slate-900 mb-1">
                            Cliquez pour déposer ou glissez votre fichier
                          </span>
                          <span className="text-sm text-slate-500">
                            {assignment.allowed_extensions?.length
                              ? assignment.allowed_extensions.join(', ')
                              : 'ZIP, RAR, PDF, Word, fichiers de code'}{' '}
                            (max {assignment.max_file_size_mb ?? 50} Mo)
                          </span>
                        </label>
                      </div>

                      {canEdit && existing?.file_url && (
                        <div className="mt-4 p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                          <div className="flex items-center gap-3 min-w-0">
                            <FileText className="w-5 h-5 text-slate-500 shrink-0" />
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-slate-700 truncate">
                                {existing.file_name || 'Fichier actuel'}
                              </p>
                              <p className="text-xs text-slate-400">
                                Fichier actuel — déposez un nouveau fichier pour le remplacer
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              setPreview({
                                url: existing.file_url!,
                                name: existing.file_name || 'Ma soumission',
                              })
                            }
                            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer bg-transparent border-none shrink-0"
                          >
                            <Eye size={14} /> Aperçu
                          </button>
                        </div>
                      )}

                      {file && (
                        <div className="mt-4 p-4 bg-green-50 border border-green-100 rounded-xl flex items-center justify-between">
                          <div className="flex items-center gap-3 min-w-0">
                            <FileText className="w-5 h-5 text-green-600 shrink-0" />
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-green-900 truncate">
                                {file.name}
                              </p>
                              <p className="text-xs text-green-700">
                                {Math.round(file.size / 1024)} Ko
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => setFile(null)}
                            className="inline-flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-bold text-green-700 hover:text-green-800 hover:bg-green-100 transition-colors cursor-pointer bg-transparent border-none shrink-0"
                          >
                            <X size={14} /> Retirer
                          </button>
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">
                        Lien de soumission (optionnel)
                      </label>
                      <input
                        type="url"
                        value={submissionUrl}
                        onChange={(e) => setSubmissionUrl(e.target.value)}
                        placeholder="https://github.com/... ou https://drive.google.com/..."
                        className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">
                        Commentaires
                      </label>
                      <textarea
                        rows={4}
                        placeholder="Ajoutez des notes pour votre instructeur…"
                        value={comments}
                        onChange={(e) => setComments(e.target.value)}
                        className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                      />
                    </div>

                    <div className="pt-6 border-t border-slate-100 flex justify-end gap-3">
                      <Link
                        to="/assignments"
                        className="px-6 py-3 rounded-xl border border-slate-300 text-slate-600 text-sm font-bold hover:bg-slate-50 transition-colors"
                      >
                        Annuler
                      </Link>
                      <button
                        type="submit"
                        disabled={isSaving}
                        className="px-8 py-3 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm inline-flex items-center gap-2"
                      >
                        {isSaving && <Loader2 size={15} className="animate-spin" />}
                        {canEdit ? 'Mettre à jour ma soumission' : 'Soumettre le devoir'}
                      </button>
                    </div>
                  </form>
                </>
              )}
            </div>
          )}
        </div>
      </main>
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
