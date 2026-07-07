import InstructorSidebar from "../../../components/InstructorSidebar";
import Header from "../../../components/Header";
import {
  Edit,
  Eye,
  EyeOff,
  Plus,
  Trash2,
  Search,
  X,
  AlertTriangle,
  BookOpen,
  Clock,
  Layers,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../../contexts/AuthContext";
import { useToast } from "../../../contexts/ToastContext";
import { courseService } from "../../../services/courseService";
import type { Course, CourseCategory } from "../../../types/lms";

type CourseForm = {
  title: string;
  subtitle: string;
  description: string;
  category_id: string;
  language: string;
  level: "BEGINNER" | "INTERMEDIATE" | "ADVANCED" | "ALL";
  price: string;
  estimated_hours: number;
  learning_objectives: string;
  prerequisites: string;
  target_audience: string;
  is_published: boolean;
};

const emptyForm: CourseForm = {
  title: "",
  subtitle: "",
  description: "",
  category_id: "",
  language: "fr",
  level: "BEGINNER",
  price: "0.00",
  estimated_hours: 0,
  learning_objectives: "",
  prerequisites: "",
  target_audience: "",
  is_published: false,
};

const levelLabels: Record<CourseForm["level"], string> = {
  BEGINNER: "Débutant",
  INTERMEDIATE: "Intermédiaire",
  ADVANCED: "Avancé",
  ALL: "Tous niveaux",
};

const levelStyles: Record<CourseForm["level"], string> = {
  BEGINNER: "bg-sky-50 text-sky-700 ring-sky-600/20",
  INTERMEDIATE: "bg-violet-50 text-violet-700 ring-violet-600/20",
  ADVANCED: "bg-rose-50 text-rose-700 ring-rose-600/20",
  ALL: "bg-slate-100 text-slate-700 ring-slate-600/20",
};

function SkeletonRow() {
  return (
    <tr className="border-t border-slate-100">
      <td className="px-6 py-4">
        <div className="h-4 w-48 bg-slate-100 rounded animate-pulse" />
      </td>
      <td className="px-6 py-4">
        <div className="h-5 w-20 bg-slate-100 rounded-full animate-pulse" />
      </td>
      <td className="px-6 py-4">
        <div className="h-4 w-14 bg-slate-100 rounded animate-pulse" />
      </td>
      <td className="px-6 py-4">
        <div className="h-5 w-20 bg-slate-100 rounded-full animate-pulse" />
      </td>
      <td className="px-6 py-4">
        <div className="h-4 w-24 bg-slate-100 rounded animate-pulse" />
      </td>
    </tr>
  );
}

export default function InstructorCourses() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [courses, setCourses] = useState<Course[]>([]);
  const [categories, setCategories] = useState<CourseCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogVisible, setDialogVisible] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [form, setForm] = useState<CourseForm>(emptyForm);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<Course | null>(null);
  const [search, setSearch] = useState("");

  const load = async () => {
    if (!user?.id) return;
    try {
      const [courseData, catData] = await Promise.all([
        courseService.listCourses({ instructor: user.id }),
        courseService.listCategories(),
      ]);
      setCourses(courseData);
      setCategories(catData);
    } catch {
      showToast("Impossible de charger les cours.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [user?.id]);

  const filteredCourses = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return courses;
    return courses.filter((c) => c.title.toLowerCase().includes(q));
  }, [courses, search]);

  const stats = useMemo(
    () => ({
      total: courses.length,
      published: courses.filter((c) => c.is_published).length,
      drafts: courses.filter((c) => !c.is_published).length,
    }),
    [courses],
  );

  const openNew = () => {
    setEditingCourse(null);
    setForm(emptyForm);
    setThumbnailFile(null);
    setDialogVisible(true);
  };

  const openEdit = (course: Course) => {
    setEditingCourse(course);
    setForm({
      title: course.title,
      subtitle: course.subtitle || "",
      description: course.description,
      category_id: course.category_id || "",
      language: course.language || "fr",
      level: course.level,
      price: course.price,
      estimated_hours: course.estimated_hours || 0,
      learning_objectives: (course.learning_objectives || []).join(", "),
      prerequisites: (course.prerequisites || []).join(", "),
      target_audience: (course.target_audience || []).join(", "),
      is_published: course.is_published,
    });
    setThumbnailFile(null);
    setDialogVisible(true);
  };

  const save = async () => {
    setSaving(true);
    try {
      const splitCsv = (s: string) =>
        s
          .split(",")
          .map((x) => x.trim())
          .filter(Boolean);
      const payload = {
        title: form.title,
        subtitle: form.subtitle,
        description: form.description,
        category_id: form.category_id || undefined,
        language: form.language,
        level: form.level,
        price: form.price,
        estimated_hours: form.estimated_hours,
        learning_objectives: splitCsv(form.learning_objectives),
        prerequisites: splitCsv(form.prerequisites),
        target_audience: splitCsv(form.target_audience),
        is_published: form.is_published,
      };
      const thumbPayload = thumbnailFile
        ? { thumbnail_file: thumbnailFile }
        : {};
      if (editingCourse) {
        await courseService.updateCourse(editingCourse.id, {
          ...payload,
          ...thumbPayload,
        });
        showToast("Cours modifié.", "success");
      } else {
        await courseService.createCourse({ ...payload, ...thumbPayload });
        showToast("Cours créé.", "success");
      }
      setDialogVisible(false);
      await load();
    } catch {
      showToast("Erreur lors de la sauvegarde.", "error");
    } finally {
      setSaving(false);
    }
  };

  const togglePublish = async (course: Course) => {
    try {
      await courseService.updateCourse(course.id, {
        is_published: !course.is_published,
      });
      showToast(
        course.is_published ? "Cours dépublié." : "Cours publié.",
        "success",
      );
      await load();
    } catch {
      showToast("Erreur.", "error");
    }
  };

  const remove = async () => {
    if (!confirmDelete) return;
    try {
      await courseService.updateCourse(confirmDelete.id, {
        is_published: false,
      });
      showToast("Cours désactivé.", "success");
      setConfirmDelete(null);
      await load();
    } catch {
      showToast("Erreur.", "error");
    }
  };

  const footer = (
    <div className="flex gap-3 justify-end">
      <button
        onClick={() => setDialogVisible(false)}
        className="px-4 py-2 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
      >
        Annuler
      </button>
      <button
        onClick={save}
        disabled={saving || !form.title.trim()}
        className="px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer shadow-sm shadow-indigo-600/20"
      >
        {saving ? "Enregistrement..." : editingCourse ? "Modifier" : "Créer"}
      </button>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-slate-50">
      <InstructorSidebar />
      <main className="flex-1 ml-64">
        <Header />
        <div className="p-8 w-full mx-auto">
          {/* En-tête */}
          <div className="flex flex-wrap justify-between items-end gap-4 mb-6">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Mes cours</h1>
              <p className="text-sm text-slate-500 mt-1">
                {stats.total} cours · {stats.published} publié
                {stats.published > 1 ? "s" : ""} · {stats.drafts} brouillon
                {stats.drafts > 1 ? "s" : ""}
              </p>
            </div>
            <button
              onClick={openNew}
              className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors cursor-pointer shadow-sm shadow-indigo-600/20 text-sm font-medium"
            >
              <Plus size={18} /> Nouveau cours
            </button>
          </div>

          {/* Barre de recherche */}
          {!loading && courses.length > 0 && (
            <div className="relative mb-4 max-w-sm">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher un cours..."
                className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow"
              />
            </div>
          )}

          {loading ? (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500 tracking-wide">
                  <tr>
                    <th className="px-6 py-4">Titre</th>
                    <th className="px-6 py-4">Niveau</th>
                    <th className="px-6 py-4">Prix</th>
                    <th className="px-6 py-4">Statut</th>
                    <th className="px-6 py-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: 4 }).map((_, i) => (
                    <SkeletonRow key={i} />
                  ))}
                </tbody>
              </table>
            </div>
          ) : courses.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center py-20 bg-white rounded-xl border border-dashed border-slate-300">
              <div className="w-12 h-12 rounded-full bg-indigo-50 flex items-center justify-center mb-4">
                <BookOpen size={22} className="text-indigo-500" />
              </div>
              <p className="text-slate-700 font-medium">
                Aucun cours pour le moment
              </p>
              <p className="text-slate-400 text-sm mt-1 mb-5">
                Créez votre premier cours pour commencer.
              </p>
              <button
                onClick={openNew}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors cursor-pointer text-sm font-medium"
              >
                <Plus size={16} /> Créer un cours
              </button>
            </div>
          ) : filteredCourses.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-xl border border-slate-200 text-slate-400 text-sm">
              Aucun cours ne correspond à &quot;{search}&quot;.
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500 tracking-wide">
                  <tr>
                    <th className="px-6 py-4">Titre</th>
                    <th className="px-6 py-4">Niveau</th>
                    <th className="px-6 py-4">Prix</th>
                    <th className="px-6 py-4">Statut</th>
                    <th className="px-6 py-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCourses.map((c) => (
                    <tr
                      key={c.id}
                      className="border-t border-slate-100 hover:bg-slate-50/10 transition-colors group"
                    >
                      <td className="px-6 py-4">
                        <button
                          onClick={() =>
                            navigate(`/instructor/courses/${c.id}`)
                          }
                          className="font-semibold text-slate-800 group-hover:text-indigo-600 text-left cursor-pointer bg-transparent border-none transition-colors"
                        >
                          {c.title}
                        </button>
                        {c.subtitle && (
                          <p className="text-xs text-slate-400 mt-0.5 truncate max-w-xs">
                            {c.subtitle}
                          </p>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ring-1 ring-inset ${levelStyles[c.level]}`}
                        >
                          {levelLabels[c.level]}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-slate-700">
                        {Number(c.price) > 0 ? (
                          `${c.price} €`
                        ) : (
                          <span className="text-emerald-600">Gratuit</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${c.is_published ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${c.is_published ? "bg-green-500" : "bg-amber-500"}`}
                          />
                          {c.is_published ? "Publié" : "Brouillon"}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => openEdit(c)}
                            className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-500 cursor-pointer transition-colors"
                            title="Modifier"
                          >
                            <Edit size={16} />
                          </button>
                          <button
                            onClick={() => togglePublish(c)}
                            className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-500 cursor-pointer transition-colors"
                            title={c.is_published ? "Dépublier" : "Publier"}
                          >
                            {c.is_published ? (
                              <EyeOff size={16} />
                            ) : (
                              <Eye size={16} />
                            )}
                          </button>
                          <button
                            onClick={() => setConfirmDelete(c)}
                            className="p-1.5 rounded-lg hover:bg-red-100 text-red-400 hover:text-red-600 cursor-pointer transition-colors"
                            title="Supprimer"
                          >
                            <Trash2 size={16} />
                          </button>
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
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-150"
          onClick={() => setDialogVisible(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-200 shrink-0">
              <h2 className="text-lg font-bold text-slate-900">
                {editingCourse ? "Modifier le cours" : "Nouveau cours"}
              </h2>
              <button
                onClick={() => setDialogVisible(false)}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 cursor-pointer transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-6 space-y-5 overflow-y-auto">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Titre *
                </label>
                <input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow"
                  placeholder="Ex : Introduction à React"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Sous-titre
                </label>
                <input
                  value={form.subtitle}
                  onChange={(e) =>
                    setForm({ ...form, subtitle: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Description
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Catégorie
                  </label>
                  <select
                    value={form.category_id}
                    onChange={(e) =>
                      setForm({ ...form, category_id: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow bg-white"
                  >
                    <option value="">Sélectionner</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Langue
                  </label>
                  <select
                    value={form.language}
                    onChange={(e) =>
                      setForm({ ...form, language: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow bg-white"
                  >
                    <option value="fr">Français</option>
                    <option value="en">English</option>
                    <option value="es">Español</option>
                    <option value="de">Deutsch</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Niveau
                  </label>
                  <select
                    value={form.level}
                    onChange={(e) =>
                      setForm({ ...form, level: e.target.value as any })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow bg-white"
                  >
                    <option value="BEGINNER">Débutant</option>
                    <option value="INTERMEDIATE">Intermédiaire</option>
                    <option value="ADVANCED">Avancé</option>
                    <option value="ALL">Tous niveaux</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Prix (€)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={form.price}
                    onChange={(e) =>
                      setForm({ ...form, price: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5 flex items-center gap-1">
                    <Clock size={12} /> Heures
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={form.estimated_hours}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        estimated_hours: Number(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Miniature
                </label>
                <label className="flex items-center gap-3 px-3 py-2.5 border border-dashed border-slate-300 rounded-lg text-sm text-slate-500 cursor-pointer hover:border-indigo-400 hover:bg-indigo-50/40 transition-colors">
                  <Layers size={16} className="text-slate-400 shrink-0" />
                  <span className="truncate">
                    {thumbnailFile ? thumbnailFile.name : "Choisir une image"}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) =>
                      setThumbnailFile(e.target.files?.[0] || null)
                    }
                    className="hidden"
                  />
                </label>
              </div>

              <div className="pt-2 border-t border-slate-100 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Objectifs pédagogiques
                  </label>
                  <input
                    value={form.learning_objectives}
                    onChange={(e) =>
                      setForm({ ...form, learning_objectives: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow"
                    placeholder="Séparés par des virgules"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Prérequis
                  </label>
                  <input
                    value={form.prerequisites}
                    onChange={(e) =>
                      setForm({ ...form, prerequisites: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow"
                    placeholder="Séparés par des virgules"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Public cible
                  </label>
                  <input
                    value={form.target_audience}
                    onChange={(e) =>
                      setForm({ ...form, target_audience: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow"
                    placeholder="Séparés par des virgules"
                  />
                </div>
              </div>

              <label className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg bg-slate-50 border border-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.is_published}
                  onChange={(e) =>
                    setForm({ ...form, is_published: e.target.checked })
                  }
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-sm text-slate-700">
                  Publier immédiatement
                </span>
              </label>
            </div>
            <div className="p-6 border-t border-slate-200 shrink-0">
              {footer}
            </div>
          </div>
        </div>
      )}

      {confirmDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4"
          onClick={() => setConfirmDelete(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center mb-4">
              <AlertTriangle size={18} className="text-red-500" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-1.5">
              Désactiver ce cours ?
            </h3>
            <p className="text-slate-500 text-sm mb-6">
              &quot;{confirmDelete.title}&quot; ne sera plus visible par les
              apprenants. Cette action peut être annulée en republiant le cours.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setConfirmDelete(null)}
                className="px-4 py-2 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer text-sm"
              >
                Annuler
              </button>
              <button
                onClick={remove}
                className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors cursor-pointer text-sm font-medium"
              >
                Confirmer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
