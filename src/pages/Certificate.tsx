import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import { Download, Share2, Award, Calendar, CheckCircle } from 'lucide-react';

export default function Certificate() {
  return (
    <div className="flex min-h-screen bg-slate-50 font-sans text-slate-900">
      <Sidebar />
      
      <main className="flex-1 ml-64">
        <Header />
        
        <div className="p-8 max-w-7xl mx-auto flex flex-col items-center">
          <div className="w-full max-w-4xl mb-8 flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Course Certificate</h1>
              <p className="text-slate-500 mt-1">Verify and download your achievement.</p>
            </div>
            <div className="flex gap-3">
              <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors">
                <Share2 className="w-4 h-4" />
                Share
              </button>
              <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 transition-colors shadow-sm">
                <Download className="w-4 h-4" />
                Download PDF
              </button>
            </div>
          </div>

          {/* Certificate Preview */}
          <div className="bg-white p-12 rounded-xl shadow-lg border border-slate-200 w-full max-w-4xl aspect-[1.414/1] relative overflow-hidden text-center flex flex-col items-center justify-center">
            {/* Decorative Border */}
            <div className="absolute inset-4 border-4 border-double border-slate-200 pointer-events-none"></div>
            <div className="absolute top-0 left-0 w-32 h-32 bg-blue-600 -translate-x-1/2 -translate-y-1/2 rotate-45"></div>
            <div className="absolute bottom-0 right-0 w-32 h-32 bg-blue-600 translate-x-1/2 translate-y-1/2 rotate-45"></div>

            {/* Content */}
            <div className="relative z-10 max-w-2xl">
              <div className="mb-8">
                <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 text-white">
                  <Award className="w-8 h-8" />
                </div>
                <h2 className="text-4xl font-serif font-bold text-slate-900 tracking-wide uppercase">Certificate of Completion</h2>
              </div>

              <p className="text-lg text-slate-500 mb-2">This is to certify that</p>
              <h3 className="text-3xl font-bold text-blue-600 mb-6 font-serif italic">Alex Johnson</h3>
              
              <p className="text-lg text-slate-500 mb-2">has successfully completed the course</p>
              <h4 className="text-2xl font-bold text-slate-900 mb-8">Academic Writing & Research Methods</h4>

              <div className="flex items-center justify-center gap-12 mt-12">
                <div className="text-center">
                  <div className="w-40 border-b border-slate-400 mb-2"></div>
                  <p className="text-sm font-bold text-slate-900">Prof. Hugh Grant</p>
                  <p className="text-xs text-slate-500 uppercase tracking-wider">Instructor</p>
                </div>
                
                <div className="w-24 h-24 border-4 border-slate-200 rounded-full flex items-center justify-center">
                  <div className="w-20 h-20 border-2 border-slate-300 rounded-full flex items-center justify-center bg-slate-50">
                    <Award className="w-10 h-10 text-blue-600" />
                  </div>
                </div>

                <div className="text-center">
                  <div className="w-40 border-b border-slate-400 mb-2"></div>
                  <p className="text-sm font-bold text-slate-900">Dr. Sarah Smith</p>
                  <p className="text-xs text-slate-500 uppercase tracking-wider">Director of Education</p>
                </div>
              </div>

              <div className="mt-12 text-xs text-slate-400 font-mono">
                Certificate ID: EDU-2024-8392-XJ92 • Issued: Oct 24, 2024
              </div>
            </div>
          </div>

          {/* Verification Section */}
          <div className="w-full max-w-4xl mt-8 bg-blue-50 border border-blue-100 rounded-xl p-6 flex items-start gap-4">
            <CheckCircle className="w-6 h-6 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-blue-900">Verified Certificate</h4>
              <p className="text-sm text-blue-700 mt-1">
                This certificate is verified and stored on our secure blockchain ledger. 
                Employers can verify its authenticity using the Certificate ID above at <a href="#" className="underline font-bold">edustream.com/verify</a>.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
