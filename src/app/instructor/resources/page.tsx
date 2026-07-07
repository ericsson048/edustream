import InstructorSidebar from '../../../components/InstructorSidebar';
import Header from '../../../components/Header';
import { Plus, Edit, Trash2, Link as LinkIcon, File as FileIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { useToast } from '../../../contexts/ToastContext';
import { courseService } from '../../../services/courseService';
import type { Course, CourseLesson, LessonResource } from '../../../types/lms';

type FlatLesson = { id: string; title: string; courseTitle: string; moduleTitle: string };

export default function InstructorResources() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [resources, setResources] = useState<LessonResource[]>([]);
  const [lessons, setLessons] = useState<FlatLesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogVisible, setDialogVisible] = useState(false);
  const [editing, setEditing] = useState<LessonResource | null>(null);
  const [form, setForm] = useState({ title: '', kind: 'LINK' as LessonResource['kind'], description: '', file_url: '', lesson: '' });
  const [formFile, setFormFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<LessonResource | null>(null);

  const load = async () => {
    if (!user?.id) return;
    try {
      const courses = await courseService.listCourses({ instructor: user.id });
      const flat: FlatLesson[] = [];
      for (const c of courses) {
        const full = await courseService.getCourse(c.id);
        for (const m of full.modules || []) {
          for (const l of m.lessons || []) {
            flat.push({ id: l.id, title: l.title, courseTitle: c.title, moduleTitle: m.title });
          }
        }
      }
      setLessons(flat);
      const lessonIds = flat.map((l) => l.id);
      const results = await Promise.all(lessonIds.map((lid) => courseService.listResources({ lesson: lid })));
      setResources(results.flat());
    } catch {
      showToast('Erreur chargement.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load() }, [user?.id]);

  const lessonMap = Object.fromEntries(lessons.map((l) => [l.id, l]));

  const openNew = () => {
    setEditing(null);
    setForm({ title: '', kind: 'LINK', description: '', file_url: '', lesson: lessons[0]?.id || '' });
    setFormFile(null);
    setDialogVisible(true);
  };

  const openEdit = (r: LessonResource) => {
    setEditing(r);
    setForm({ title: r.title, kind: r.kind, description: r.description, file_url: r.file_url, lesson: r.lesson });
    setFormFile(null);
    setDialogVisible(true);
  };

  const save = async () => {
    setSaving(true);
    try {
      if (editing) {
        await courseService.updateResource(editing.id, { ...form, file: formFile ?? undefined });
        showToast('Ressource modifiée.', 'success');
      } else {
        await courseService.createResource({ ...form, file: formFile ?? undefined });
        showToast('Ressource créée.', 'success');
      }
      setDialogVisible(false);
      await load();
    } catch {
      showToast('Erreur.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!confirmDelete) return;
    try {
      await courseService.deleteResource(confirmDelete.id);
      showToast('Ressource supprimée.', 'success');
      setConfirmDelete(null);
      await load();
    } catch {
      showToast('Erreur.', 'error');
    }
  };

  const kindIcon = (k: string) => {
    if (k === 'LINK') return <LinkIcon size={14} className="text-blue-500" />;
    return <FileIcon size={14} className="text-slate-500" />;
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      <InstructorSidebar />
      <main className="flex-1 ml-64">
        <Header />
        <div className="p-8 w-full mx-auto">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-slate-900">Resources</h1>
            <button onClick={openNew} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 cursor-pointer">
              <Plus size={18} /> Nouvelle ressource
            </button>
          </div>

          {loading ? (
            <div className="text-center py-12 text-slate-500">Chargement...</div>
          ) : resources.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-xl border border-dashed border-slate-300">
              <p className="text-slate-400">Aucune ressource pour le moment.</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-6 py-4">Titre</th>
                    <th className="px-6 py-4">Type</th>
                    <th className="px-6 py-4">Leçon</th>
                    <th className="px-6 py-4">Cours</th>
                    <th className="px-6 py-4">URL</th>
                    <th className="px-6 py-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {resources.map((r) => {
                    const ls = lessonMap[r.lesson];
                    return (
                      <tr key={r.id} className="border-t border-slate-100 hover:bg-slate-50">
                        <td className="px-6 py-4 font-medium text-sm text-slate-900">{r.title}</td>
                        <td className="px-6 py-4 text-sm">
                          <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-600">{kindIcon(r.kind)}{r.kind}</span>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600">{ls?.title || '-'}</td>
                        <td className="px-6 py-4 text-sm text-slate-600">{ls?.courseTitle || '-'}</td>
                        <td className="px-6 py-4 text-sm text-slate-500 truncate max-w-[200px]">{r.file_url || r.file_download_url || '-'}</td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <button onClick={() => openEdit(r)} className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-500 cursor-pointer" title="Modifier"><Edit size={16} /></button>
                            <button onClick={() => setConfirmDelete(r)} className="p-1.5 rounded-lg hover:bg-red-100 text-red-400 cursor-pointer" title="Supprimer"><Trash2 size={16} /></button>
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
      </main>

      {dialogVisible && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setDialogVisible(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-slate-200">
              <h2 className="text-lg font-bold">{editing ? 'Modifier la ressource' : 'Nouvelle ressource'}</h2>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Titre *</label>
                <input value={form.title} onChange={(e) => setForm({...form, title: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Leçon</label>
                <select value={form.lesson} onChange={(e) => setForm({...form, lesson: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  {lessons.map((l) => (
                    <option key={l.id} value={l.id}>{l.courseTitle} — {l.moduleTitle} — {l.title}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
                  <select value={form.kind} onChange={(e) => setForm({...form, kind: e.target.value as LessonResource['kind']})} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    <option value="LINK">Lien</option>
                    <option value="PDF">PDF</option>
                    <option value="ZIP">ZIP</option>
                    <option value="OTHER">Autre</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Fichier</label>
                  <input type="file" onChange={(e) => setFormFile(e.target.files?.[0] || null)} className="w-full text-sm text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">URL</label>
                <input value={form.file_url} onChange={(e) => setForm({...form, file_url: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="https://..." />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                <textarea value={form.description} onChange={(e) => setForm({...form, description: e.target.value})} rows={2} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
            </div>
            <div className="p-6 border-t border-slate-200 flex gap-3 justify-end">
              <button onClick={() => setDialogVisible(false)} className="px-4 py-2 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50 cursor-pointer">Annuler</button>
              <button onClick={save} disabled={saving || !form.title.trim()} className="px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 cursor-pointer">
                {saving ? 'Enregistrement...' : editing ? 'Modifier' : 'Créer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setConfirmDelete(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4 p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-2">Confirmer</h3>
            <p className="text-slate-600 text-sm mb-6">Supprimer la ressource &quot;{confirmDelete.title}&quot; ?</p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setConfirmDelete(null)} className="px-4 py-2 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50 cursor-pointer">Annuler</button>
              <button onClick={remove} className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 cursor-pointer">Confirmer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
