import AdminSidebar from '../../../components/AdminSidebar';
import Pagination from '../../../components/Pagination';
import Header from '../../../components/Header';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, BookOpen, Download } from 'lucide-react';
import { courseService } from '../../../services/courseService';
import type { Course } from '../../../types/lms';
import { useToast } from '../../../contexts/ToastContext';

const LEVEL_LABELS: Record<string, string> = {
  BEGINNER: 'Débutant', INTERMEDIATE: 'Intermédiaire',
  ADVANCED: 'Avancé', ALL: 'Tous niveaux',
};

export default function AdminCourses() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState('');
  const [publishedFilter, setPublishedFilter] = useState('');
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();
  const PAGE_SIZE = 15;

  useEffect(() => {
    setLoading(true);
    const params: Record<string, any> = {};
    if (publishedFilter !== '') params.is_published = publishedFilter === 'true';

    courseService.listCourses(params)
      .then(data => { setCourses(data); setPage(1); })
      .catch(() => showToast('Impossible de charger les cours.', 'error'))
      .finally(() => setLoading(false));
  }, [publishedFilter]);

  const filtered = courses.filter(c =>
    `${c.title} ${c.instructor_name || ''}`.toLowerCase().includes(query.toLowerCase())
  );

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE) || 1;
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleTogglePublish = async (course: Course) => {
    setTogglingId(course.id);
    try {
      const updated = await courseService.updateCourse(course.id, { is_published: !course.is_published });
      setCourses(prev => prev.map(c => c.id === updated.id ? updated : c));
      showToast(`Cours ${updated.is_published ? 'publié' : 'dépublié'}.`, 'success');
    } catch {
      showToast('Erreur lors de la mise à jour.', 'error');
    } finally {
      setTogglingId(null);
    }
  };

  const exportCSV = () => {
    const header = 'Titre,Instructeur,Catégorie,Prix,Statut';
    const rows = filtered.map(c =>
      `"${c.title}","${c.instructor_name || ''}","${c.category || ''}","${c.price}","${c.is_published ? 'Publié' : 'Brouillon'}"`
    );
    const blob = new Blob([[header, ...rows].join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'courses.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white">
      <AdminSidebar />
      <main className="flex-1 ml-64">
        <Header />
        <div className="p-8 max-w-7xl mx-auto">

          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Cours</h1>
              <p className="text-slate-500 dark:text-slate-400 mt-1">{filtered.length} cours trouvé{filtered.length !== 1 ? 's' : ''}</p>
            </div>
            <button onClick={exportCSV}
              className="flex items-center gap-2 px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
              <Download className="w-4 h-4" /> Export CSV
            </button>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">

            {/* Filters */}
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-wrap gap-3">
              <div className="relative flex-1 min-w-48">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                <input type="text" placeholder="Rechercher un cours ou un instructeur..."
                  value={query} onChange={e => { setQuery(e.target.value); setPage(1); }}
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white" />
              </div>
              <select value={publishedFilter} onChange={e => setPublishedFilter(e.target.value)}
                className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white">
                <option value="">Tous les statuts</option>
                <option value="true">Publié</option>
                <option value="false">Brouillon</option>
              </select>
            </div>

            {loading ? (
              <div className="flex justify-center py-16">
                <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : paginated.length === 0 ? (
              <div className="text-center py-16 text-slate-400">
                <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>Aucun cours trouvé</p>
              </div>
            ) : (
              <table className="w-full text-left">
                <thead className="bg-slate-50 dark:bg-slate-800/50 text-xs uppercase text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="px-6 py-3">Cours</th>
                    <th className="px-6 py-3">Instructeur</th>
                    <th className="px-6 py-3">Niveau</th>
                    <th className="px-6 py-3">Prix</th>
                    <th className="px-6 py-3">Statut</th>
                    <th className="px-6 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {paginated.map(course => (
                    <tr key={course.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 bg-slate-100 dark:bg-slate-800">
                            <img
                              src={course.thumbnail || course.thumbnail_url || 'https://images.unsplash.com/photo-1526379095098-d400fd0bfce8?auto=format&fit=crop&w=80&q=60'}
                              alt="" className="w-full h-full object-cover" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-slate-900 dark:text-white truncate max-w-xs">{course.title}</p>
                            {course.category && <p className="text-xs text-slate-400">{course.category}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-3 text-sm text-slate-600 dark:text-slate-400">
                        {course.instructor_name || '—'}
                      </td>
                      <td className="px-6 py-3 text-sm text-slate-500">
                        {LEVEL_LABELS[course.level] || course.level}
                      </td>
                      <td className="px-6 py-3 text-sm font-semibold text-slate-700 dark:text-slate-300">
                        ${course.price}
                      </td>
                      <td className="px-6 py-3">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                          course.is_published
                            ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                        }`}>
                          {course.is_published ? 'Publié' : 'Brouillon'}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleTogglePublish(course)}
                            disabled={togglingId === course.id}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors disabled:opacity-40 ${
                              course.is_published
                                ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 hover:bg-amber-200'
                                : 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 hover:bg-emerald-200'
                            }`}>
                            {course.is_published ? 'Dépublier' : 'Publier'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {!loading && <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />}
          </div>
        </div>
      </main>
    </div>
  );
}
