import InstructorSidebar from '../../../components/InstructorSidebar';
import Header from '../../../components/Header';
import { Edit, Eye, Plus, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { useToast } from '../../../contexts/ToastContext';
import { courseService } from '../../../services/courseService';
import type { Course } from '../../../types/lms';

type CourseForm = {
  title: string;
  subtitle: string;
  description: string;
  level: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'ALL';
  price: string;
  is_published: boolean;
};

const emptyForm: CourseForm = { title: '', subtitle: '', description: '', level: 'BEGINNER', price: '0.00', is_published: false };

export default function InstructorCourses() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogVisible, setDialogVisible] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [form, setForm] = useState<CourseForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<Course | null>(null);

  const load = async () => {
    if (!user?.id) return;
    try {
      const data = await courseService.listCourses({ instructor: user.id });
      setCourses(data);
    } catch {
      showToast('Impossible de charger les cours.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load() }, [user?.id]);

  const openNew = () => {
    setEditingCourse(null);
    setForm(emptyForm);
    setDialogVisible(true);
  };

  const openEdit = (course: Course) => {
    setEditingCourse(course);
    setForm({
      title: course.title,
      subtitle: course.subtitle || '',
      description: course.description,
      level: course.level,
      price: course.price,
      is_published: course.is_published,
    });
    setDialogVisible(true);
  };

  const save = async () => {
    setSaving(true);
    try {
      if (editingCourse) {
        await courseService.updateCourse(editingCourse.id, form);
        showToast('Cours modifié.', 'success');
      } else {
        await courseService.createCourse(form);
        showToast('Cours créé.', 'success');
      }
      setDialogVisible(false);
      await load();
    } catch {
      showToast('Erreur lors de la sauvegarde.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const togglePublish = async (course: Course) => {
    try {
      await courseService.updateCourse(course.id, { is_published: !course.is_published });
      showToast(course.is_published ? 'Cours dépublié.' : 'Cours publié.', 'success');
      await load();
    } catch {
      showToast('Erreur.', 'error');
    }
  };

  const remove = async () => {
    if (!confirmDelete) return;
    try {
      await courseService.updateCourse(confirmDelete.id, { is_published: false });
      showToast('Cours désactivé.', 'success');
      setConfirmDelete(null);
      await load();
    } catch {
      showToast('Erreur.', 'error');
    }
  };

  const footer = (
    <div className="flex gap-3 justify-end">
      <button onClick={() => setDialogVisible(false)} className="px-4 py-2 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50 cursor-pointer">Annuler</button>
      <button onClick={save} disabled={saving || !form.title.trim()} className="px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 cursor-pointer">
        {saving ? 'Enregistrement...' : editingCourse ? 'Modifier' : 'Créer'}
      </button>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-slate-50">
      <InstructorSidebar />
      <main className="flex-1 ml-64">
        <Header />
        <div className="p-8 w-full mx-auto">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-slate-900">Mes cours</h1>
            <button onClick={openNew} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 cursor-pointer">
              <Plus size={18} /> Nouveau cours
            </button>
          </div>

          {loading ? (
            <div className="text-center py-12 text-slate-500">Chargement...</div>
          ) : courses.length === 0 ? (
            <div className="text-center py-12 text-slate-400">Aucun cours pour le moment.</div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-6 py-4">Titre</th>
                    <th className="px-6 py-4">Niveau</th>
                    <th className="px-6 py-4">Prix</th>
                    <th className="px-6 py-4">Statut</th>
                    <th className="px-6 py-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {courses.map((c) => (
                    <tr key={c.id} className="border-t border-slate-100 hover:bg-slate-50">
                      <td className="px-6 py-4">
                        <button onClick={() => navigate(`/instructor/courses/${c.id}`)} className="font-semibold text-indigo-600 hover:text-indigo-800 text-left cursor-pointer bg-transparent border-none">
                          {c.title}
                        </button>
                      </td>
                      <td className="px-6 py-4 text-sm capitalize">{c.level.toLowerCase()}</td>
                      <td className="px-6 py-4 text-sm">{c.price} €</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${c.is_published ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${c.is_published ? 'bg-green-500' : 'bg-amber-500'}`} />
                          {c.is_published ? 'Publié' : 'Brouillon'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button onClick={() => openEdit(c)} className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-500 cursor-pointer" title="Modifier"><Edit size={16} /></button>
                          <button onClick={() => togglePublish(c)} className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-500 cursor-pointer" title={c.is_published ? 'Dépublier' : 'Publier'}><Eye size={16} /></button>
                          <button onClick={() => setConfirmDelete(c)} className="p-1.5 rounded-lg hover:bg-red-100 text-red-400 cursor-pointer" title="Supprimer"><Trash2 size={16} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {dialogVisible && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setDialogVisible(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-slate-200">
              <h2 className="text-lg font-bold">{editingCourse ? 'Modifier le cours' : 'Nouveau cours'}</h2>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Titre *</label>
                <input value={form.title} onChange={(e) => setForm({...form, title: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Sous-titre</label>
                <input value={form.subtitle} onChange={(e) => setForm({...form, subtitle: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                <textarea value={form.description} onChange={(e) => setForm({...form, description: e.target.value})} rows={3} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Niveau</label>
                  <select value={form.level} onChange={(e) => setForm({...form, level: e.target.value as any})} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    <option value="BEGINNER">Débutant</option>
                    <option value="INTERMEDIATE">Intermédiaire</option>
                    <option value="ADVANCED">Avancé</option>
                    <option value="ALL">Tous niveaux</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Prix (€)</label>
                  <input type="number" step="0.01" value={form.price} onChange={(e) => setForm({...form, price: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="is_published" checked={form.is_published} onChange={(e) => setForm({...form, is_published: e.target.checked})} className="rounded border-slate-300" />
                <label htmlFor="is_published" className="text-sm text-slate-700">Publier immédiatement</label>
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
            <p className="text-slate-600 text-sm mb-6">Désactiver le cours &quot;{confirmDelete.title}&quot; ?</p>
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
