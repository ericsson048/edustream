import InstructorSidebar from '../../../../components/InstructorSidebar';
import Header from '../../../../components/Header';
import { ArrowLeft, ChevronDown, ChevronRight, Edit, Eye, Plus, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useToast } from '../../../../contexts/ToastContext';
import { courseService } from '../../../../services/courseService';
import type { Course, CourseModule, CourseLesson } from '../../../../types/lms';

type ModuleForm = {
  title: string;
  description: string;
};

const emptyModule: ModuleForm = { title: '', description: '' };

export default function CourseDetail() {
  const { id = '' } = useParams();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [dialogVisible, setDialogVisible] = useState(false);
  const [editingModule, setEditingModule] = useState<CourseModule | null>(null);
  const [moduleForm, setModuleForm] = useState<ModuleForm>(emptyModule);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<CourseModule | null>(null);

  const load = async () => {
    try {
      const data = await courseService.getCourse(id);
      setCourse(data);
    } catch {
      showToast('Impossible de charger le cours.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load() }, [id]);

  const toggleExpand = (moduleId: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(moduleId)) next.delete(moduleId); else next.add(moduleId);
      return next;
    });
  };

  const openNewModule = () => {
    setEditingModule(null);
    setModuleForm(emptyModule);
    setDialogVisible(true);
  };

  const openEditModule = (m: CourseModule) => {
    setEditingModule(m);
    setModuleForm({ title: m.title, description: m.description || '' });
    setDialogVisible(true);
  };

  const saveModule = async () => {
    setSaving(true);
    try {
      if (editingModule) {
        await courseService.updateModule(editingModule.id, moduleForm);
        showToast('Module modifié.', 'success');
      } else {
        const nextOrder = modules.length > 0 ? Math.max(...modules.map((m) => m.order)) + 1 : 1;
        await courseService.createModule({ course: id, ...moduleForm, order: nextOrder });
        showToast('Module créé.', 'success');
      }
      setDialogVisible(false);
      await load();
    } catch {
      showToast('Erreur lors de la sauvegarde.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const removeModule = async () => {
    if (!confirmDelete) return;
    try {
      await courseService.deleteModule(confirmDelete.id);
      showToast('Module supprimé.', 'success');
      setConfirmDelete(null);
      await load();
    } catch {
      showToast('Erreur.', 'error');
    }
  };

  const modules = (course?.modules || []).sort((a, b) => a.order - b.order);

  const footer = (
    <div className="flex gap-3 justify-end">
      <button onClick={() => setDialogVisible(false)} className="px-4 py-2 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50 cursor-pointer">Annuler</button>
      <button onClick={saveModule} disabled={saving || !moduleForm.title.trim()} className="px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 cursor-pointer">
        {saving ? 'Enregistrement...' : editingModule ? 'Modifier' : 'Créer'}
      </button>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-slate-50">
      <InstructorSidebar />
      <main className="flex-1 ml-64">
        <Header />
        <div className="p-8 w-full mx-auto">
          {loading ? (
            <div className="text-center py-12 text-slate-500">Chargement...</div>
          ) : !course ? (
            <div className="text-center py-12 text-slate-400">Cours introuvable.</div>
          ) : (
            <>
              <button onClick={() => navigate('/instructor/courses')} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-4 cursor-pointer bg-transparent border-none">
                <ArrowLeft size={16} /> Retour
              </button>

              <div className="flex items-start justify-between mb-8">
                <div className="flex flex-col">
                  <div>
                    <h1 className="text-2xl font-bold text-slate-900">{course.title}</h1>
                  <p className="text-slate-500 text-xs mt-1">{course.description}</p>
                  </div>
                  <div className="flex items-center gap-3 mt-3">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${course.is_published ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${course.is_published ? 'bg-green-500' : 'bg-amber-500'}`} />
                      {course.is_published ? 'Publié' : 'Brouillon'}
                    </span>
                    <span className="text-xs text-slate-400">{modules.length} module{modules.length > 1 ? 's' : ''}</span>
                  </div>
                </div>
                <div className="flex gap-2 flex-col">
                  <Link to={`/course/${id}`} target="_blank" className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50 text-sm cursor-pointer">
                    <Eye size={16} /> Aperçu
                  </Link>
                  <button onClick={openNewModule} className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm cursor-pointer w-fit">
                    <Plus size={16} /> Module
                  </button>
                </div>
              </div>

              {modules.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-xl border border-dashed border-slate-300">
                  <p className="text-slate-400 mb-4">Aucun module pour le moment.</p>
                  <button onClick={openNewModule} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm cursor-pointer">
                    Créer le premier module
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {modules.map((m) => {
                    const isOpen = expanded.has(m.id);
                    const lessons = (m.lessons || []).sort((a, b) => a.order - b.order);
                    return (
                      <div key={m.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                        <button onClick={() => toggleExpand(m.id)} className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-50 text-left cursor-pointer bg-transparent border-none">
                          <div className="flex items-center gap-3">
                            {isOpen ? <ChevronDown size={18} className="text-slate-400" /> : <ChevronRight size={18} className="text-slate-400" />}
                            <div>
                              <span className="font-semibold text-slate-900">{m.title}</span>
                              <span className="text-xs text-slate-400 ml-3">{lessons.length} leçon{lessons.length > 1 ? 's' : ''}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                            <button onClick={() => openEditModule(m)} className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-500 cursor-pointer" title="Modifier"><Edit size={15} /></button>
                            <button onClick={() => setConfirmDelete(m)} className="p-1.5 rounded-lg hover:bg-red-100 text-red-400 cursor-pointer" title="Supprimer"><Trash2 size={15} /></button>
                          </div>
                        </button>
                        {isOpen && (
                          <div className="border-t border-slate-100 px-5 py-3 space-y-2">
                            {lessons.length === 0 ? (
                              <p className="text-sm text-slate-400 py-2">Aucune leçon. Ajoutez-en une.</p>
                            ) : (
                              lessons.map((l) => (
                                <div key={l.id} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-slate-50">
                                  <div className="flex items-center gap-3">
                                    <span className="text-xs text-slate-400 w-5">{l.order}</span>
                                    <span className="text-sm text-slate-700">{l.title}</span>
                                    <span className="text-[10px] uppercase px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">{l.lesson_type || 'TEXT'}</span>
                                  </div>
                                </div>
                              ))
                            )}
                            <button className="flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-800 cursor-pointer bg-transparent border-none">
                              <Plus size={14} /> Ajouter une leçon
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {dialogVisible && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setDialogVisible(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-slate-200">
              <h2 className="text-lg font-bold">{editingModule ? 'Modifier le module' : 'Nouveau module'}</h2>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Titre *</label>
                <input value={moduleForm.title} onChange={(e) => setModuleForm({...moduleForm, title: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                <textarea value={moduleForm.description} onChange={(e) => setModuleForm({...moduleForm, description: e.target.value})} rows={3} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
            </div>
            <div className="p-6 border-t border-slate-200">{footer}</div>
          </div>
        </div>
      )}

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setConfirmDelete(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4 p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-2">Confirmer</h3>
            <p className="text-slate-600 text-sm mb-6">Supprimer le module &quot;{confirmDelete.title}&quot; et toutes ses leçons ?</p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setConfirmDelete(null)} className="px-4 py-2 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50 cursor-pointer">Annuler</button>
              <button onClick={removeModule} className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 cursor-pointer">Confirmer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
