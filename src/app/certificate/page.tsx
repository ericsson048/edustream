import { useEffect, useMemo, useState } from 'react';
import { Award, Calendar, CheckCircle, Download, Share2 } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import Header from '../../components/Header';
import Sidebar from '../../components/Sidebar';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { courseService, type CertificateItem } from '../../services/courseService';

function formatDate(value?: string) {
  if (!value) return 'N/A';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString();
}

export default function Certificate() {
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { showToast } = useToast();
  const courseId = searchParams.get('course') || '';
  const [certificates, setCertificates] = useState<CertificateItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    courseService
      .listCertificates(courseId ? { course: courseId } : undefined)
      .then(setCertificates)
      .catch(() => showToast('Impossible de charger le certificat.', 'error'))
      .finally(() => setIsLoading(false));
  }, [courseId, showToast]);

  const certificate = useMemo(() => certificates[0] || null, [certificates]);

  return (
    <div className="print-shell flex min-h-screen bg-slate-50 font-sans text-slate-900">
      <style>{`
        @media print {
          @page {
            size: A4 landscape;
            margin: 0;
          }

          html,
          body {
            background: white !important;
            margin: 0 !important;
            padding: 0 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          .print-hide {
            display: none !important;
          }

          .print-shell {
            display: block !important;
            background: white !important;
          }

          .print-main {
            margin: 0 !important;
            width: 100% !important;
          }

          .print-wrap {
            max-width: none !important;
            padding: 0 !important;
          }

          .print-area {
            display: block !important;
            margin: 0 !important;
            padding: 0 !important;
            width: 297mm !important;
            height: 210mm !important;
          }

          .print-certificate-card {
            width: 297mm !important;
            height: 210mm !important;
            min-height: 210mm !important;
            aspect-ratio: auto !important;
            border: none !important;
            border-radius: 0 !important;
            box-shadow: none !important;
            page-break-inside: avoid;
            margin: 0 !important;
            padding: 14mm !important;
          }
        }
      `}</style>

      <div className="print-hide">
        <Sidebar />
      </div>

      <main className="print-main ml-64 flex-1">
        <div className="print-hide">
          <Header />
        </div>

        <div className="print-wrap mx-auto max-w-7xl p-8">
          <div className="print-hide mb-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Course Certificate</h1>
              <p className="mt-1 text-slate-500">Verify and download your achievement.</p>
            </div>
            <div className="flex gap-3">
              <button className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium transition-colors hover:bg-slate-50">
                <Share2 className="h-4 w-4" />
                Share
              </button>
              <button
                onClick={() => window.print()}
                className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-blue-700 shadow-sm"
              >
                <Download className="h-4 w-4" />
                Download PDF
              </button>
            </div>
          </div>

          {isLoading ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-slate-500 shadow-sm">Loading certificate...</div>
          ) : !certificate ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
              <h2 className="text-2xl font-bold text-slate-900">No certificate yet</h2>
              <p className="mt-3 text-slate-500">Complete your course first, then request your certificate from the learning player.</p>
              <Link to="/courses" className="mt-6 inline-flex rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white hover:bg-blue-700">
                Back to My Courses
              </Link>
            </div>
          ) : (
            <div className="print-area">
              <div className="print-certificate-card relative flex aspect-[1.414/1] w-full flex-col items-center justify-center overflow-hidden rounded-[28px] border border-slate-200 bg-white p-12 text-center shadow-[0_24px_80px_rgba(15,23,42,0.12)]">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(37,99,235,0.10),_transparent_30%),radial-gradient(circle_at_bottom_right,_rgba(30,64,175,0.10),_transparent_35%)]" />
                <div className="pointer-events-none absolute inset-4 rounded-[20px] border-4 border-double border-slate-200" />
                <div className="pointer-events-none absolute inset-7 rounded-[16px] border border-blue-100" />
                <div className="absolute left-0 top-0 h-32 w-32 -translate-x-1/2 -translate-y-1/2 rotate-45 bg-blue-600" />
                <div className="absolute bottom-0 right-0 h-32 w-32 translate-x-1/2 translate-y-1/2 rotate-45 bg-blue-600" />
                <div className="absolute left-10 top-10 h-24 w-24 rounded-full border border-blue-100/80" />
                <div className="absolute bottom-10 right-10 h-24 w-24 rounded-full border border-blue-100/80" />

                <div className="relative z-10 max-w-2xl">
                  <div className="mb-8">
                    <p className="mb-4 text-xs font-bold uppercase tracking-[0.45em] text-blue-600">EduStream Achievement</p>
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg shadow-blue-200/70">
                      <Award className="h-8 w-8" />
                    </div>
                    <h2 className="font-serif text-4xl font-bold uppercase tracking-wide text-slate-900">Certificate of Completion</h2>
                    <div className="mx-auto mt-5 h-px w-36 bg-gradient-to-r from-transparent via-blue-300 to-transparent" />
                  </div>

                  <p className="mb-2 text-lg text-slate-500">This is to certify that</p>
                  <h3 className="mb-6 font-serif text-3xl font-bold italic text-blue-600">{user?.full_name || 'Student'}</h3>

                  <p className="mb-2 text-lg text-slate-500">has successfully completed the course</p>
                  <h4 className="mb-8 text-2xl font-bold text-slate-900">{certificate.course_title || 'Course'}</h4>

                  <div className="mt-12 flex items-center justify-center gap-12">
                    <div className="text-center">
                      <div className="mb-2 w-40 border-b border-slate-400" />
                      <p className="text-sm font-bold text-slate-900">{certificate.instructor_name || 'Instructor'}</p>
                      <p className="text-xs uppercase tracking-wider text-slate-500">Instructor</p>
                    </div>

                    <div className="flex h-24 w-24 items-center justify-center rounded-full border-4 border-slate-200">
                      <div className="flex h-20 w-20 items-center justify-center rounded-full border-2 border-slate-300 bg-slate-50">
                        <Award className="h-10 w-10 text-blue-600" />
                      </div>
                    </div>

                    <div className="text-center">
                      <div className="mb-2 w-40 border-b border-slate-400" />
                      <p className="text-sm font-bold text-slate-900">EduStream</p>
                      <p className="text-xs uppercase tracking-wider text-slate-500">Director of Education</p>
                    </div>
                  </div>

                  <div className="mt-12 text-xs font-mono text-slate-400">
                    Certificate ID: {certificate.certificate_code} ÔÇó Issued: {formatDate(certificate.issued_at)}
                  </div>
                </div>
              </div>

              <div className="print-hide mt-8 flex items-start gap-4 rounded-xl border border-blue-100 bg-blue-50 p-6">
                <CheckCircle className="mt-0.5 h-6 w-6 shrink-0 text-blue-600" />
                <div>
                  <h4 className="font-bold text-blue-900">Verified Certificate</h4>
                  <p className="mt-1 text-sm text-blue-700">
                    This certificate is verified by EduStream and linked to the learner profile and course completion record.
                  </p>
                </div>
              </div>

              <div className="print-hide mt-6 grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <p className="text-xs font-bold uppercase tracking-[0.25em] text-slate-500">Issue Date</p>
                  <p className="mt-3 inline-flex items-center gap-2 text-lg font-bold text-slate-900">
                    <Calendar className="h-5 w-5 text-blue-600" />
                    {formatDate(certificate.issued_at)}
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <p className="text-xs font-bold uppercase tracking-[0.25em] text-slate-500">Certificate Code</p>
                  <p className="mt-3 break-all text-lg font-bold text-slate-900">{certificate.certificate_code}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

