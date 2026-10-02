import Header from '../../../components/Header';
import Sidebar from '../../../components/Sidebar';
import { Star, Clock, Users, PlayCircle, CheckCircle, FileText, Award, Copy, ExternalLink } from 'lucide-react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useEffect, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { courseService } from '../../../services/courseService';
import { authService } from '../../../services/authService';
import type { Course, CourseReview, Enrollment } from '../../../types/lms';
import type { AuthUser } from '../../../types/auth';

export default function CourseDetails() {
  const { t } = useTranslation();
  const { id = '' } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const [course, setCourse] = useState<Course | null>(null);
  const [instructor, setInstructor] = useState<AuthUser | null>(null);
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [studentCount, setStudentCount] = useState(0);
  const [reviews, setReviews] = useState<CourseReview[]>([]);
  const [tags, setTags] = useState<import('../../../types/lms').Tag[]>([]);
  const [error, setError] = useState('');

  const initialInviteCode = searchParams.get('invite') || '';
  const [inviteCode, setInviteCode] = useState(initialInviteCode);
  const [joiningCourse, setJoiningCourse] = useState(false);
  const [inviteError, setInviteError] = useState('');
  const [joinSuccess, setJoinSuccess] = useState(false);

  const isMarginal = course?.course_type === 'MARGINAL';

  useEffect(() => {
    if (!id) return;

    courseService.getCourse(id).then((courseItem) => {
      setCourse(courseItem);
      if (courseItem.instructor) {
        authService.getUser(courseItem.instructor).then(setInstructor).catch(() => {});
      }
    }).catch(() => setError(t('course.notFound')));

    courseService.listEnrollments({ course: id, is_active: true }).then((enrollments) => {
      setEnrollment(enrollments[0] || null);
      setStudentCount(enrollments.length);
    }).catch(() => {});

    courseService.listReviews({ course: id }).then(setReviews).catch(() => {});
    courseService.listTags().then(setTags).catch(() => {});
  }, [id]);

  const joinWithInviteCode = async () => {
    if (!inviteCode.trim() || !id) return;
    setJoiningCourse(true);
    setInviteError('');
    try {
      const enroll = await courseService.enrollWithInvitation(id, inviteCode.trim());
      setEnrollment(enroll);
      setJoinSuccess(true);
      searchParams.delete('invite');
      setSearchParams(searchParams);
    } catch (err: any) {
      setInviteError(err?.response?.data?.detail || "Code d'invitation invalide.");
    } finally {
      setJoiningCourse(false);
    }
  };

  if (error) {
    return <div className="min-h-screen grid place-items-center text-red-600">{error}</div>;
  }

  if (!course) {
    return <div className="min-h-screen grid place-items-center text-slate-500">{t('common.loading')}</div>;
  }

  const firstModule = (course.modules || []).find((module) => (module.lessons || []).length > 0);
  const firstLesson = firstModule?.lessons?.[0];
  const ctaHref = enrollment && firstLesson ? `/player/${course.id}/${firstLesson.id}` : `/checkout/${course.id}`;
  const ctaLabel = enrollment ? t('course.startCourse') : t('course.enroll');
  const learningItems = (course.learning_objectives || []).length
    ? course.learning_objectives || []
    : [
        t('course.learn1'),
        t('course.learn2'),
        t('course.learn3'),
        t('course.learn4'),
      ];

  const totalMinutes = (course.modules || []).reduce((sum, mod) => sum + (mod.estimated_minutes || 0), 0);
  const durationDisplay = course.estimated_hours
    ? t('course.hoursTotal', { hours: course.estimated_hours })
    : totalMinutes > 0
      ? t('course.hoursTotal', { hours: Math.round(totalMinutes / 60) })
      : undefined;

  const instructorAvatar = instructor?.avatar_url || 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80';

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans text-slate-900">
      <Sidebar />
      <main className="flex-1 ml-64">
        <Header />

        <div className="bg-slate-900 text-white py-16 px-8 relative overflow-hidden">
          <div className="absolute inset-0 opacity-20">
            <img src={course.thumbnail || course.thumbnail_url || 'https://images.unsplash.com/photo-1555099962-4199c345e5dd?auto=format&fit=crop&w=2000&q=80'} alt={t('course.backgroundAlt')} className="w-full h-full object-cover" />
          </div>
          <div className="max-w-5xl mx-auto relative z-10 flex flex-col md:flex-row gap-8 items-center">
            <div className="flex-1">
                <div className="flex items-center gap-2 text-blue-400 font-bold text-sm mb-4">
                  <span className="bg-blue-500/20 px-2.5 py-1 rounded-md">{course.category || t('course.general')}</span>
                  <span>·</span>
                  <span>{course.level === 'ALL' ? t('catalog.allLevels') : t(`catalog.levels.${course.level}`)}</span>
                  {course.tags && course.tags.length > 0 && (
                    <>
                      <span>·</span>
                      <div className="flex gap-1.5">
                        {course.tags.slice(0, 3).map((tag) => (
                          <span key={tag.id} className="bg-slate-700/30 px-2 py-0.5 rounded text-xs">{tag.name}</span>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              <h1 className="text-4xl md:text-5xl font-bold mb-4 leading-tight">{course.title}</h1>
              <p className="text-lg text-slate-300 mb-6 line-clamp-2">{course.description || t('course.descriptionPlaceholder')}</p>

              <div className="flex flex-wrap items-center gap-6 text-sm text-slate-300 mb-8">
                <div className="flex items-center gap-1 text-amber-400 font-bold">
                  <Star className="w-5 h-5 fill-current" /> {t('course.featured')}
                </div>
                <div className="flex items-center gap-2"><Users className="w-5 h-5" /> {studentCount > 0 ? t('course.studentsEnrolled', { count: studentCount }) : t('course.enroll')}</div>
                {durationDisplay && <div className="flex items-center gap-2"><Clock className="w-5 h-5" /> {durationDisplay}</div>}
              </div>

              <div className="flex items-center gap-4">
                <img src={instructorAvatar} alt={course.instructor_name || t('course.instructor')} className="w-12 h-12 rounded-full border-2 border-slate-700" />
                <div>
                  <p className="text-sm text-slate-400">{t('course.createdBy')}</p>
                  <p className="font-bold">{course.instructor_name || instructor?.full_name || t('course.instructor')}</p>
                </div>
              </div>
            </div>

            <div className="w-full md:w-80 bg-white rounded-2xl p-6 text-slate-900 shadow-2xl">
              {isMarginal && (
                <div className="mb-4 p-3 rounded-xl bg-amber-50 border border-amber-200 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-200 text-amber-800">
                      Cours marginal
                    </span>
                    {course.start_date && course.end_date && (
                      <span className="text-[11px] text-amber-600 font-medium">
                        {course.start_date} → {course.end_date}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {enrollment || !isMarginal ? (
                <>
                  {Number(course.price) > 0 && (
                    <div className="text-3xl font-bold mb-4">${course.price}</div>
                  )}
                  {Number(course.price) === 0 && !enrollment && (
                    <div className="text-3xl font-bold text-green-600 mb-4">Gratuit</div>
                  )}
                  <Link to={ctaHref} className="block w-full py-3 px-4 bg-blue-600 text-white text-center font-bold rounded-xl hover:bg-blue-700 transition-colors mb-4 shadow-sm">
                    {ctaLabel}
                  </Link>
                  {enrollment && (
                    <Link
                      to={`/course/${course.id}/suivi`}
                      className="block w-full py-3 px-4 bg-indigo-50 text-indigo-700 text-center font-bold rounded-xl hover:bg-indigo-100 transition-colors mb-4 text-sm"
                    >
                      Mon suivi universitaire
                    </Link>
                  )}
                  <p className="text-xs text-center text-slate-500 mb-6">{t('course.moneyBackGuarantee')}</p>
                </>
              ) : (
                <div className="space-y-3 mb-4">
                  <p className="text-sm font-medium text-slate-700">Rejoindre avec un code d&apos;invitation :</p>
                  {joinSuccess ? (
                    <div className="p-3 rounded-lg bg-green-50 border border-green-200 text-green-800 text-sm text-center font-medium">
                      Inscrit avec succès !{" "}
                      {firstLesson ? (
                        <Link to={`/player/${course.id}/${firstLesson.id}`} className="underline font-bold">
                          Commencer →
                        </Link>
                      ) : null}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <input
                        value={inviteCode}
                        onChange={(e) => setInviteCode(e.target.value)}
                        placeholder="Ex : EDU-AB12CD"
                        className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-shadow"
                      />
                      {inviteError && (
                        <p className="text-xs text-red-600">{inviteError}</p>
                      )}
                      <button
                        onClick={joinWithInviteCode}
                        disabled={joiningCourse || !inviteCode.trim()}
                        className="w-full py-3 px-4 bg-amber-600 text-white font-bold rounded-xl hover:bg-amber-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm shadow-sm cursor-pointer"
                      >
                        {joiningCourse ? "Inscription..." : "Rejoindre"}
                      </button>
                    </div>
                  )}
                  <p className="text-xs text-center text-slate-400 mt-2">
                    Demandez le code à votre professeur.
                  </p>
                </div>
              )}

              <div className="space-y-3 text-sm font-medium text-slate-700">
                <div className="flex items-center gap-3"><PlayCircle className="w-5 h-5 text-blue-600" /> {t('course.onDemandVideo')}</div>
                <div className="flex items-center gap-3"><FileText className="w-5 h-5 text-blue-600" /> {t('course.downloadableResources')}</div>
                <div className="flex items-center gap-3"><Award className="w-5 h-5 text-blue-600" /> {t('course.certificateOfCompletion')}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-5xl mx-auto px-8 py-12 grid grid-cols-1 lg:grid-cols-3 gap-12">
          <div className="lg:col-span-2 space-y-12">
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
              <h2 className="text-2xl font-bold mb-6">{t('course.whatYouWillLearn')}</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {learningItems.map((item, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                    <span className="text-slate-700 text-sm leading-relaxed">{item}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
              <h2 className="text-2xl font-bold mb-6">{t('course.content')}</h2>
              <div className="space-y-4">
                {(course.modules || []).map((module) => (
                  <div key={module.id} className="rounded-xl border border-slate-200 p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <h3 className="font-bold text-slate-900">{module.title}</h3>
                        <p className="text-sm text-slate-500 mt-1">{module.description || t('course.moduleInProgress')}</p>
                      </div>
                      <span className="text-xs font-bold uppercase tracking-wide text-slate-400">
                        {t('course.lessonsCount', { count: (module.lessons || []).length })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
              <h2 className="text-2xl font-bold mb-6">
                {t('course.studentReviews', { count: reviews.length })}
              </h2>
              {reviews.length === 0 ? (
                <p className="text-sm text-slate-500">{t('course.noReviewsYet')}</p>
              ) : (
                <div className="space-y-6">
                  {reviews.map((review) => (
                    <div key={review.id} className="border-b border-slate-100 pb-6 last:border-b-0">
                      <div className="flex items-center gap-3 mb-2">
                        <img src={review.user_avatar || 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=facearea&facepad=2&w=64&h=64&q=80'} alt="" className="w-10 h-10 rounded-full" />
                        <div>
                          <p className="font-semibold text-sm">{review.user_full_name}</p>
                          <div className="flex items-center gap-0.5">
                            {Array.from({ length: 5 }, (_, i) => (
                              <Star key={i} className={`w-4 h-4 ${i < review.rating ? 'text-amber-400 fill-current' : 'text-slate-300'}`} />
                            ))}
                          </div>
                        </div>
                      </div>
                      <p className="text-sm text-slate-700 ml-13">{review.comment}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

