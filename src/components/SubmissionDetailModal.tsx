import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CalendarDays,
  CheckCircle2,
  Circle,
  Clock,
  Download,
  Eye,
  FileText,
  Pencil,
  X,
} from 'lucide-react';
import type { SubmissionItem } from '../services/learningService';
import DocumentPreviewUrl from './DocumentPreviewUrl';

interface SubmissionDetailModalProps {
  submission: SubmissionItem;
  onClose: () => void;
}

function formatBytes(bytes?: number) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

export default function SubmissionDetailModal({ submission, onClose }: SubmissionDetailModalProps) {
  const [preview, setPreview] = useState<{ url: string; name: string } | null>(null);

  const published = submission.is_published && submission.grade != null;
  const gradedPending = submission.status === 'GRADED' && !submission.is_published;
  const points = submission.points ?? 100;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
              Ma soumission
            </p>
            <h3 className="text-lg font-bold text-slate-900 leading-tight">
              {submission.assignment_title || submission.assignment}
            </h3>
            {submission.course_title && (
              <p className="text-sm text-slate-500 mt-0.5">{submission.course_title}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors shrink-0 cursor-pointer bg-transparent border-none"
            title="Fermer"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-3 text-sm">
            <span className="text-slate-600 flex items-center gap-1.5">
              <CalendarDays size={14} className="text-slate-400" />
              Rendu le{' '}
              {new Date(submission.submitted_at).toLocaleString('fr-FR', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
            {submission.is_late && (
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full">
                <Clock size={11} /> En retard
              </span>
            )}
          </div>

          {submission.file_url && (
            <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200">
              <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                <FileText size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-slate-800 text-sm truncate">
                  {submission.file_name || 'Fichier joint'}
                </p>
                <p className="text-xs text-slate-400">{formatBytes(submission.file_size)}</p>
              </div>
              <button
                onClick={() =>
                  setPreview({ url: submission.file_url!, name: submission.file_name || 'Fichier' })
                }
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer bg-transparent border-none"
              >
                <Eye size={14} /> Aperçu
              </button>
              <a
                href={submission.file_url}
                target="_blank"
                rel="noreferrer"
                download
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-200 transition-colors"
              >
                <Download size={14} />
              </a>
            </div>
          )}

          {submission.content_text && (
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Commentaire
              </p>
              <p className="text-sm text-slate-600 whitespace-pre-wrap">{submission.content_text}</p>
            </div>
          )}

          <div className="p-4 rounded-xl border border-slate-200">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Note</p>
            {published ? (
              <div>
                <p className="text-2xl font-bold text-green-600 flex items-center gap-2">
                  <CheckCircle2 size={20} /> {submission.grade} / {points}
                </p>
                {submission.feedback && (
                  <p className="text-sm text-slate-600 mt-2 whitespace-pre-wrap border-t border-slate-100 pt-2">
                    {submission.feedback}
                  </p>
                )}
              </div>
            ) : gradedPending ? (
              <p className="text-sm font-semibold text-amber-600">
                Note : {submission.grade} / {points} — publication en attente
              </p>
            ) : submission.status === 'GRADED' ? (
              <p className="text-sm font-semibold text-slate-500">
                Note : {submission.grade} / {points}
              </p>
            ) : (
              <p className="text-sm text-slate-500 flex items-center gap-1.5">
                <Circle size={12} className="text-slate-300" /> En attente de correction
              </p>
            )}
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-3">
          {!submission.is_published && (
            <Link
              to={`/assignments/${submission.assignment}/submit`}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 transition-colors"
            >
              <Pencil size={14} /> Modifier ma soumission
            </Link>
          )}
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-300 text-slate-600 hover:bg-slate-50 transition-colors text-sm font-semibold cursor-pointer bg-transparent"
          >
            Fermer
          </button>
        </div>
      </div>
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
