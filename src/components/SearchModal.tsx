import { useEffect, useRef, useState, useCallback } from 'react';
import { Search, BookOpen, Clock, X, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { courseService } from '../services/courseService';
import type { Course } from '../types/lms';

interface SearchModalProps {
  open: boolean;
  onClose: () => void;
}

export default function SearchModal({ open, onClose }: SearchModalProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Course[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Focus input when modal opens
  useEffect(() => {
    if (open) {
      setQuery('');
      setResults([]);
      setSelected(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!query.trim()) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const courses = await courseService.listCourses({ is_published: true });
        const q = query.toLowerCase();
        const filtered = courses.filter((c) =>
          `${c.title} ${c.description} ${c.instructor_name || ''}`.toLowerCase().includes(q)
        );
        setResults(filtered.slice(0, 8));
        setSelected(0);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelected((prev) => Math.min(prev + 1, results.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelected((prev) => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter') {
        if (results[selected]) {
          goToCourse(results[selected]);
        } else if (query.trim()) {
          goCatalog();
        }
      }
    },
    [results, selected, query]
  );

  const goToCourse = (course: Course) => {
    onClose();
    navigate(`/course/${course.id}`);
  };

  const goCatalog = () => {
    onClose();
    navigate(`/catalog?q=${encodeURIComponent(query)}`);
  };

  if (!open) return null;

  return (
    // Backdrop
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4"
      style={{ background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)' }}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-700">

        {/* Input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-200 dark:border-slate-700">
          <Search className="w-5 h-5 text-slate-400 flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t('header.searchPlaceholder', 'Rechercher un cours, une leçon...')}
            className="flex-1 bg-transparent text-slate-900 dark:text-white text-base outline-none placeholder:text-slate-400"
          />
          {query && (
            <button onClick={() => setQuery('')} className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
              <X className="w-4 h-4" />
            </button>
          )}
          <kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-1 text-xs text-slate-400 bg-slate-100 dark:bg-slate-800 rounded-md border border-slate-200 dark:border-slate-700">
            Esc
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-96 overflow-y-auto">
          {loading && (
            <div className="flex items-center justify-center py-8 text-slate-400 text-sm gap-2">
              <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              {t('common.searching', 'Recherche...')}
            </div>
          )}

          {!loading && query && results.length === 0 && (
            <div className="py-10 text-center text-slate-500 text-sm">
              <p className="font-semibold mb-1">{t('catalog.noCoursesFound', 'Aucun résultat')}</p>
              <p className="text-xs text-slate-400">{t('catalog.adjustSearch', 'Essayez un autre mot-clé')}</p>
            </div>
          )}

          {!loading && results.length > 0 && (
            <ul className="py-2">
              {results.map((course, i) => (
                <li key={course.id}>
                  <button
                    onMouseEnter={() => setSelected(i)}
                    onClick={() => goToCourse(course)}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                      selected === i
                        ? 'bg-blue-50 dark:bg-slate-800'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/60'
                    }`}
                  >
                    {/* Thumbnail */}
                    <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 bg-slate-100">
                      <img
                        src={course.thumbnail || course.thumbnail_url || 'https://images.unsplash.com/photo-1526379095098-d400fd0bfce8?auto=format&fit=crop&w=80&q=60'}
                        alt={course.title}
                        className="w-full h-full object-cover"
                      />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{course.title}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                        {course.instructor_name || t('course.instructor', 'Instructeur')}
                        {' · '}
                        <span className="text-blue-600 dark:text-blue-400 font-medium">${course.price}</span>
                      </p>
                    </div>

                    <ArrowRight className={`w-4 h-4 flex-shrink-0 transition-colors ${selected === i ? 'text-blue-500' : 'text-slate-300'}`} />
                  </button>
                </li>
              ))}
            </ul>
          )}

          {/* Quick actions when no query */}
          {!query && (
            <div className="py-3 px-4">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                {t('search.quickLinks', 'Accès rapide')}
              </p>
              <div className="flex flex-col gap-1">
                {[
                  { label: t('nav.catalog', 'Catalogue des cours'), icon: BookOpen, to: '/catalog' },
                  { label: t('nav.courses', 'Mes cours'), icon: Clock, to: '/courses' },
                ].map(({ label, icon: Icon, to }) => (
                  <button
                    key={to}
                    onClick={() => { onClose(); navigate(to); }}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                  >
                    <Icon className="w-4 h-4 text-slate-400" />
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Footer: see all results */}
          {!loading && query && results.length > 0 && (
            <div className="border-t border-slate-100 dark:border-slate-700 px-4 py-2">
              <button
                onClick={goCatalog}
                className="w-full flex items-center justify-between py-2 text-xs text-blue-600 dark:text-blue-400 font-semibold hover:text-blue-700 transition-colors"
              >
                <span>{t('search.seeAll', 'Voir tous les résultats pour')} &laquo;{query}&raquo;</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Footer hint */}
        <div className="px-4 py-2 border-t border-slate-100 dark:border-slate-700 flex items-center gap-4 text-xs text-slate-400">
          <span><kbd className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700">↑↓</kbd> naviguer</span>
          <span><kbd className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700">↵</kbd> ouvrir</span>
          <span><kbd className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700">Esc</kbd> fermer</span>
        </div>
      </div>
    </div>
  );
}
