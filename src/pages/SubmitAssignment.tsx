import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import { UploadCloud, FileText, ArrowLeft, CheckCircle } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';

export default function SubmitAssignment() {
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const navigate = useNavigate();

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitted(true);
    setTimeout(() => {
      navigate('/assignments');
    }, 2000);
  };

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans text-slate-900">
      <Sidebar />
      <main className="flex-1 ml-64">
        <Header />
        <div className="p-8 max-w-3xl mx-auto">
          <Link to="/assignments" className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-900 transition-colors mb-8">
            <ArrowLeft className="w-4 h-4" /> Back to Assignments
          </Link>

          <div className="mb-8">
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Submit Assignment</h1>
            <p className="text-slate-500 mt-1">React Hooks Refactoring Project</p>
          </div>

          {isSubmitted ? (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 text-center">
              <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-10 h-10" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 mb-2">Assignment Submitted!</h2>
              <p className="text-slate-500">Your work has been successfully uploaded for grading.</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
              <div className="mb-8 p-6 bg-slate-50 rounded-xl border border-slate-100">
                <h3 className="font-bold text-slate-900 mb-2">Instructions</h3>
                <p className="text-sm text-slate-600 leading-relaxed mb-4">
                  Please refactor the provided class components into functional components using React Hooks (`useState`, `useEffect`, `useContext`). Ensure all existing tests pass before submitting.
                </p>
                <div className="flex items-center gap-2 text-sm font-bold text-slate-700">
                  <FileText className="w-4 h-4 text-blue-600" />
                  <a href="#" className="text-blue-600 hover:underline">Download Starter Code (ZIP)</a>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-4">Upload your work</label>
                  <div 
                    className={`border-2 border-dashed rounded-2xl p-10 text-center transition-colors ${
                      isDragging ? 'border-blue-500 bg-blue-50' : 'border-slate-300 hover:border-blue-400 hover:bg-slate-50'
                    }`}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                  >
                    <input type="file" id="file-upload" className="hidden" onChange={handleFileChange} accept=".zip,.rar,.js,.jsx,.ts,.tsx" />
                    <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center">
                      <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-4">
                        <UploadCloud className="w-8 h-8" />
                      </div>
                      <span className="font-bold text-slate-900 mb-1">Click to upload or drag and drop</span>
                      <span className="text-sm text-slate-500">ZIP, RAR, or Code Files (Max 50MB)</span>
                    </label>
                  </div>
                  
                  {file && (
                    <div className="mt-4 p-4 bg-green-50 border border-green-100 rounded-xl flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <FileText className="w-5 h-5 text-green-600" />
                        <span className="font-medium text-green-900">{file.name}</span>
                      </div>
                      <button type="button" onClick={() => setFile(null)} className="text-sm font-bold text-green-700 hover:text-green-800">Remove</button>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Comments (Optional)</label>
                  <textarea 
                    rows={4} 
                    placeholder="Add any notes for your instructor..." 
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  ></textarea>
                </div>

                <div className="pt-6 border-t border-slate-100 flex justify-end">
                  <button 
                    type="submit" 
                    disabled={!file}
                    className="px-8 py-3 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                  >
                    Submit Assignment
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
