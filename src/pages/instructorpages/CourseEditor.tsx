import InstructorSidebar from '../../components/InstructorSidebar';
import Header from '../../components/Header';
import { Save, Plus, GripVertical, Trash2, Video, FileText, Camera } from 'lucide-react';

export default function CourseEditor() {
  return (
    <div className="flex min-h-screen bg-slate-50 font-sans text-slate-900">
      <InstructorSidebar />
      <main className="flex-1 ml-64">
        <Header />
        <div className="p-8 max-w-5xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Course Editor</h1>
              <p className="text-slate-500 mt-1">Create or edit your course content.</p>
            </div>
            <div className="flex gap-3">
              <button className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg text-sm font-bold hover:bg-slate-50 transition-colors">
                Save Draft
              </button>
              <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 transition-colors shadow-sm">
                <Save className="w-4 h-4" />
                Publish Course
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Col - Basic Info */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <h2 className="text-lg font-bold mb-4">Basic Information</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Course Title</label>
                    <input type="text" placeholder="e.g. Advanced React Patterns" className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Description</label>
                    <textarea rows={4} placeholder="What will students learn?" className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"></textarea>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">Category</label>
                      <select className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                        <option>Development</option>
                        <option>Design</option>
                        <option>Business</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">Price ($)</label>
                      <input type="number" placeholder="49.99" className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Curriculum */}
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-lg font-bold">Curriculum</h2>
                  <div className="flex gap-2">
                    <button className="text-sm font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 bg-indigo-50 px-3 py-1.5 rounded-lg transition-colors">
                      ✨ Auto-Generate
                    </button>
                    <button className="text-sm font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 px-3 py-1.5">
                      <Plus className="w-4 h-4" /> Add Module
                    </button>
                  </div>
                </div>

                <div className="space-y-4">
                  {/* Module 1 */}
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <div className="bg-slate-50 p-4 flex items-center gap-3 border-b border-slate-200">
                      <GripVertical className="w-5 h-5 text-slate-400 cursor-move" />
                      <span className="font-bold text-sm">Module 1:</span>
                      <input type="text" defaultValue="Introduction to Hooks" className="flex-1 bg-transparent border-none focus:outline-none font-bold text-slate-900" />
                      <button className="text-slate-400 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                    </div>
                    <div className="p-4 space-y-2 bg-white">
                      <div className="flex items-center gap-3 p-3 border border-slate-100 rounded-lg bg-slate-50 group">
                        <GripVertical className="w-4 h-4 text-slate-300 cursor-move" />
                        <Video className="w-4 h-4 text-blue-500" />
                        <span className="text-sm flex-1">Why Hooks?</span>
                        <span className="text-xs text-slate-400">05:12</span>
                        <button className="text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 className="w-4 h-4" /></button>
                      </div>
                      <div className="flex items-center gap-3 p-3 border border-slate-100 rounded-lg bg-slate-50 group">
                        <GripVertical className="w-4 h-4 text-slate-300 cursor-move" />
                        <FileText className="w-4 h-4 text-emerald-500" />
                        <span className="text-sm flex-1">useState Fundamentals (Reading)</span>
                        <button className="text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 className="w-4 h-4" /></button>
                      </div>
                      <button className="w-full py-2 border-2 border-dashed border-slate-200 rounded-lg text-sm font-bold text-slate-500 hover:border-blue-300 hover:text-blue-600 transition-colors flex items-center justify-center gap-2 mt-2">
                        <Plus className="w-4 h-4" /> Add Lesson
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Col - Settings */}
            <div className="space-y-6">
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <h2 className="text-lg font-bold mb-4">Course Thumbnail</h2>
                <div className="aspect-video bg-slate-100 rounded-xl border-2 border-dashed border-slate-300 flex flex-col items-center justify-center text-slate-500 hover:bg-slate-50 hover:border-blue-400 transition-colors cursor-pointer">
                  <Camera className="w-8 h-8 mb-2 text-slate-400" />
                  <span className="text-sm font-bold">Upload Image</span>
                  <span className="text-xs mt-1">1920x1080 recommended</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
