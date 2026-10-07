import InstructorSidebar from "../../../components/InstructorSidebar";
import Pagination from "../../../components/Pagination";
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
  ChevronDown,
  ImageIcon,
} from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
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
  course_type: "REGULAR" | "MARGINAL";
  start_date: string;
  end_date: string;
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
  course_type: "REGULAR",
  start_date: "",
  end_date: "",
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
  const [thumbPreview, setThumbPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<Course | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 5;

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
    const list = q
      ? courses.filter((c) => c.title.toLowerCase().includes(q))
      : courses;
    return [...list].sort(
      (a, b) =>
        new Date(b.created_at || "").getTime() -
        new Date(a.created_at || "").getTime(),
    );
  }, [courses, search]);

  const totalPages = Math.ceil(filteredCourses.length / PAGE_SIZE) || 1;
  const paginatedCourses = filteredCourses.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE,
  );

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
      course_type: course.course_type || "REGULAR",
      start_date: course.start_date || "",
      end_date: course.end_date || "",
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
        course_type: form.course_type,
        start_date: form.start_date || null,
        end_date: form.end_date || null,
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

  const fieldCls =
    "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 " +
    "focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/30 " +
    "dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500";
  const labelCls =
    "mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300";
  const hintCls = "mt-1.5 text-xs text-slate-500 dark:text-slate-400";
  const focusRing =
    "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600";

  function Section({
    title,
    children,
  }: {
    title: string;
    children: ReactNode;
  }) {
    return (
      <section className="space-y-4">
        <h3 className="border-b border-slate-100 pb-2 text-sm font-semibold text-slate-900 dark:border-slate-800 dark:text-white">
          {title}
        </h3>
        {children}
      </section>
    );
  }

  // Aperçu de la miniature (et nettoyage de l'URL temporaire)
  useEffect(() => {
    if (!thumbnailFile) {
      setThumbPreview(null);
      return;
    }
    const url = URL.createObjectURL(thumbnailFile);
    setThumbPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [thumbnailFile]);

  // Échap ferme le dialogue ; la page derrière ne défile plus
  useEffect(() => {
    if (!dialogVisible) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDialogVisible(false);
    };
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [dialogVisible, setDialogVisible]);

  const isMarginal = form.course_type === "MARGINAL";
  const dateError =
    isMarginal &&
    form.start_date &&
    form.end_date &&
    form.end_date < form.start_date
      ? "La fin de la période doit être après le début."
      : null;

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
                  {paginatedCourses.map((c) => (
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
                        {c.course_type === "MARGINAL" && (
                          <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-100 text-amber-700 ring-1 ring-inset ring-amber-600/20">
                            Marginal
                          </span>
                        )}
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
              <Pagination
                page={page}
                totalPages={totalPages}
                onPageChange={setPage}
              />
            </div>
          )}
        </div>
      </main>

      {dialogVisible && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm animate-in fade-in duration-150">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="course-dialog-title"
            className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-xl bg-white shadow-2xl dark:bg-slate-900"
          >
            {/* En-tête */}
            <div className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-200 px-6 py-4 dark:border-slate-800">
              <div>
                <h2
                  id="course-dialog-title"
                  className="text-lg font-semibold text-slate-900 dark:text-white"
                >
                  {editingCourse ? "Modifier le cours" : "Nouveau cours"}
                </h2>
                <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
                  Les champs marqués d'un * sont obligatoires.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDialogVisible(false)}
                aria-label="Fermer"
                className={`rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200 ${focusRing}`}
              >
                <X size={18} aria-hidden />
              </button>
            </div>

            {/* Contenu */}
            <div className="space-y-8 overflow-y-auto px-6 py-6">
              <Section title="Informations">
                <div>
                  <label htmlFor="course-title" className={labelCls}>
                    Titre <span aria-hidden>*</span>
                  </label>
                  <input
                    id="course-title"
                    autoFocus
                    aria-required="true"
                    value={form.title}
                    onChange={(e) =>
                      setForm({ ...form, title: e.target.value })
                    }
                    className={fieldCls}
                    placeholder="Ex : Introduction à React"
                  />
                </div>
                <div>
                  <label htmlFor="course-subtitle" className={labelCls}>
                    Sous-titre
                  </label>
                  <input
                    id="course-subtitle"
                    value={form.subtitle}
                    onChange={(e) =>
                      setForm({ ...form, subtitle: e.target.value })
                    }
                    className={fieldCls}
                  />
                </div>
                <div>
                  <label htmlFor="course-description" className={labelCls}>
                    Description
                  </label>
                  <textarea
                    id="course-description"
                    value={form.description}
                    onChange={(e) =>
                      setForm({ ...form, description: e.target.value })
                    }
                    rows={3}
                    className={`${fieldCls} resize-none`}
                  />
                </div>
              </Section>

              <Section title="Classement">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div>
                    <label htmlFor="course-category" className={labelCls}>
                      Catégorie
                    </label>
                    <select
                      id="course-category"
                      value={form.category_id}
                      onChange={(e) =>
                        setForm({ ...form, category_id: e.target.value })
                      }
                      className={fieldCls}
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
                    <label htmlFor="course-level" className={labelCls}>
                      Niveau
                    </label>
                    <select
                      id="course-level"
                      value={form.level}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          level: e.target.value as CourseForm["level"],
                        })
                      }
                      className={fieldCls}
                    >
                      <option value="BEGINNER">Débutant</option>
                      <option value="INTERMEDIATE">Intermédiaire</option>
                      <option value="ADVANCED">Avancé</option>
                      <option value="ALL">Tous niveaux</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="course-language" className={labelCls}>
                      Langue
                    </label>
                    <select
                      id="course-language"
                      value={form.language}
                      onChange={(e) =>
                        setForm({ ...form, language: e.target.value })
                      }
                      className={fieldCls}
                    >
                      <option value="fr">Français</option>
                      <option value="en">English</option>
                      <option value="es">Español</option>
                      <option value="de">Deutsch</option>
                    </select>
                  </div>
                </div>
              </Section>

              <Section title="Prix et durée">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="course-price" className={labelCls}>
                      Prix
                    </label>
                    <div className="relative">
                      <input
                        id="course-price"
                        type="number"
                        inputMode="decimal"
                        min={0}
                        step="0.01"
                        placeholder="0,00"
                        value={form.price}
                        onChange={(e) =>
                          setForm({ ...form, price: e.target.value })
                        }
                        className={`${fieldCls} pr-8`}
                      />
                      <span
                        className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-slate-500 dark:text-slate-400"
                        aria-hidden
                      >
                        €
                      </span>
                    </div>
                  </div>
                  <div>
                    <label htmlFor="course-hours" className={labelCls}>
                      Durée estimée
                    </label>
                    <div className="relative">
                      <input
                        id="course-hours"
                        type="number"
                        inputMode="numeric"
                        min={0}
                        placeholder="0"
                        value={
                          form.estimated_hours === 0 ? "" : form.estimated_hours
                        }
                        onChange={(e) =>
                          setForm({
                            ...form,
                            estimated_hours: Number(e.target.value),
                          })
                        }
                        className={`${fieldCls} pr-12`}
                      />
                      <span
                        className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-slate-500 dark:text-slate-400"
                        aria-hidden
                      >
                        heures
                      </span>
                    </div>
                  </div>
                </div>
              </Section>

              <Section title="Type de cours">
                <div>
                  <label htmlFor="course-type" className={labelCls}>
                    Type
                  </label>
                  <select
                    id="course-type"
                    value={form.course_type}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        course_type: e.target
                          .value as CourseForm["course_type"],
                      })
                    }
                    className={fieldCls}
                  >
                    <option value="REGULAR">Cours du programme</option>
                    <option value="MARGINAL">
                      Cours marginal (période définie + invitation)
                    </option>
                  </select>
                  <p className={hintCls}>
                    Un cours marginal est optionnel et hors programme. Il est
                    ouvert sur une période précise aux apprenants invités.
                  </p>
                </div>

                {isMarginal && (
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/40">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div>
                        <label htmlFor="course-start" className={labelCls}>
                          Début de la période <span aria-hidden>*</span>
                        </label>
                        <input
                          id="course-start"
                          type="date"
                          aria-required="true"
                          value={form.start_date}
                          onChange={(e) =>
                            setForm({ ...form, start_date: e.target.value })
                          }
                          className={fieldCls}
                        />
                      </div>
                      <div>
                        <label htmlFor="course-end" className={labelCls}>
                          Fin de la période <span aria-hidden>*</span>
                        </label>
                        <input
                          id="course-end"
                          type="date"
                          aria-required="true"
                          aria-invalid={!!dateError}
                          aria-describedby={
                            dateError ? "course-date-error" : undefined
                          }
                          min={form.start_date || undefined}
                          value={form.end_date}
                          onChange={(e) =>
                            setForm({ ...form, end_date: e.target.value })
                          }
                          className={`${fieldCls} ${dateError ? "border-red-500 focus:border-red-500 focus:ring-red-500/30" : ""}`}
                        />
                      </div>
                    </div>
                    {dateError && (
                      <p
                        id="course-date-error"
                        role="alert"
                        className="mt-2 text-sm text-red-600 dark:text-red-400"
                      >
                        {dateError}
                      </p>
                    )}
                  </div>
                )}
              </Section>

              <Section title="Miniature">
                <div className="flex items-center gap-4">
                  <div className="flex h-20 w-32 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-slate-100 text-slate-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-500">
                    {thumbPreview ? (
                      <img
                        src={thumbPreview}
                        alt="Aperçu de la miniature"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <ImageIcon size={24} aria-hidden />
                    )}
                  </div>
                  <div className="min-w-0">
                    {/* L'input reste focusable au clavier : sr-only au lieu de hidden */}
                    <label
                      className={`inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-blue-600 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800`}
                    >
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) =>
                          setThumbnailFile(e.target.files?.[0] || null)
                        }
                        className="sr-only"
                      />
                      {thumbnailFile ? "Changer l'image" : "Choisir une image"}
                    </label>
                    {thumbnailFile && (
                      <button
                        type="button"
                        onClick={() => setThumbnailFile(null)}
                        className={`ml-2 rounded-lg px-2 py-2 text-sm text-slate-600 hover:underline dark:text-slate-400 ${focusRing}`}
                      >
                        Retirer
                      </button>
                    )}
                    <p className={`${hintCls} truncate`}>
                      {thumbnailFile
                        ? thumbnailFile.name
                        : "Format paysage recommandé (16:9)."}
                    </p>
                  </div>
                </div>
              </Section>

              {/* Champs optionnels repliés pour raccourcir le formulaire */}
              <details
                className="group rounded-lg border border-slate-200 dark:border-slate-800"
                open={!!editingCourse}
              >
                <summary
                  className={`flex cursor-pointer list-none items-center justify-between rounded-lg px-4 py-3 text-sm font-semibold text-slate-900 dark:text-white ${focusRing}`}
                >
                  Détails pédagogiques
                  <span className="flex items-center gap-2 text-xs font-normal text-slate-500 dark:text-slate-400">
                    Facultatif
                    <ChevronDown
                      size={16}
                      className="transition-transform group-open:rotate-180"
                      aria-hidden
                    />
                  </span>
                </summary>
                <div className="space-y-4 border-t border-slate-100 px-4 py-4 dark:border-slate-800">
                  <div>
                    <label htmlFor="course-objectives" className={labelCls}>
                      Objectifs pédagogiques
                    </label>
                    <input
                      id="course-objectives"
                      value={form.learning_objectives}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          learning_objectives: e.target.value,
                        })
                      }
                      className={fieldCls}
                      placeholder="Ex : Créer un composant, Gérer l'état, Appeler une API"
                    />
                    <p className={hintCls}>Séparés par des virgules.</p>
                  </div>
                  <div>
                    <label htmlFor="course-prerequisites" className={labelCls}>
                      Prérequis
                    </label>
                    <input
                      id="course-prerequisites"
                      value={form.prerequisites}
                      onChange={(e) =>
                        setForm({ ...form, prerequisites: e.target.value })
                      }
                      className={fieldCls}
                      placeholder="Ex : JavaScript, HTML"
                    />
                    <p className={hintCls}>Séparés par des virgules.</p>
                  </div>
                  <div>
                    <label htmlFor="course-audience" className={labelCls}>
                      Public cible
                    </label>
                    <input
                      id="course-audience"
                      value={form.target_audience}
                      onChange={(e) =>
                        setForm({ ...form, target_audience: e.target.value })
                      }
                      className={fieldCls}
                      placeholder="Ex : Étudiants, Développeurs juniors"
                    />
                    <p className={hintCls}>Séparés par des virgules.</p>
                  </div>
                </div>
              </details>

              <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/40">
                <input
                  type="checkbox"
                  checked={form.is_published}
                  onChange={(e) =>
                    setForm({ ...form, is_published: e.target.checked })
                  }
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-600"
                />
                <span>
                  <span className="block text-sm font-medium text-slate-900 dark:text-white">
                    Publier immédiatement
                  </span>
                  <span className="block text-xs text-slate-500 dark:text-slate-400">
                    Sinon, le cours reste en brouillon jusqu'à sa publication.
                  </span>
                </span>
              </label>
            </div>

            {/* Pied : les boutons de `footer` restent à droite */}
            <div className="shrink-0 rounded-b-xl border-t border-slate-200 bg-slate-50 px-6 py-4 dark:border-slate-800 dark:bg-slate-900">
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
