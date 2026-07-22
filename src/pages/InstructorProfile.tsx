import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import { Star, Users, PlayCircle, Award, MapPin, Globe, Twitter, Linkedin } from 'lucide-react';

export default function InstructorProfile() {
  return (
    <div className="flex min-h-screen bg-slate-50 font-sans text-slate-900">
      <Sidebar />
      <main className="flex-1 ml-64">
        <Header />
        
        {/* Cover Photo */}
        <div className="h-64 bg-slate-800 w-full relative">
          <img src="https://images.unsplash.com/photo-1516321318423-f06f85e504b3?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80" alt="Cover" className="w-full h-full object-cover opacity-50" />
        </div>

        <div className="max-w-5xl mx-auto px-8 pb-12">
          {/* Profile Header */}
          <div className="relative -mt-20 flex flex-col md:flex-row gap-6 items-end mb-10">
            <img src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?ixlib=rb-4.0.3&auto=format&fit=crop&w=256&q=80" alt="Sarah Chen" className="w-40 h-40 rounded-2xl border-4 border-white shadow-xl object-cover bg-white" />
            <div className="flex-1 pb-2">
              <h1 className="text-4xl font-bold text-slate-900">Sarah Chen</h1>
              <p className="text-lg text-slate-600 font-medium">Senior Frontend Engineer & Educator</p>
              <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-slate-500">
                <span className="flex items-center gap-1"><MapPin className="w-4 h-4" /> San Francisco, CA</span>
                <span className="flex items-center gap-1"><Globe className="w-4 h-4" /> sarahchen.dev</span>
                <div className="flex gap-2 ml-auto">
                  <a href="#" className="p-2 bg-slate-100 rounded-full hover:bg-blue-100 hover:text-blue-600 transition-colors"><Twitter className="w-4 h-4" /></a>
                  <a href="#" className="p-2 bg-slate-100 rounded-full hover:bg-blue-100 hover:text-blue-600 transition-colors"><Linkedin className="w-4 h-4" /></a>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Col - Bio & Stats */}
            <div className="lg:col-span-1 space-y-6">
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <h3 className="font-bold text-lg mb-4">About Me</h3>
                <p className="text-slate-600 text-sm leading-relaxed mb-6">
                  I'm a passionate frontend developer with over 8 years of experience building scalable web applications. I specialize in React, TypeScript, and modern CSS architectures. My goal is to make complex concepts accessible to everyone.
                </p>
                <div className="space-y-4 pt-4 border-t border-slate-100">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 text-sm flex items-center gap-2"><Users className="w-4 h-4" /> Total Students</span>
                    <span className="font-bold">12,450</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 text-sm flex items-center gap-2"><Star className="w-4 h-4" /> Average Rating</span>
                    <span className="font-bold">4.8</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 text-sm flex items-center gap-2"><PlayCircle className="w-4 h-4" /> Courses</span>
                    <span className="font-bold">4</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Col - Courses */}
            <div className="lg:col-span-2">
              <h2 className="text-2xl font-bold text-slate-900 mb-6">Courses by Sarah</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[
                  { title: 'Advanced React Patterns', rating: 4.9, students: '4.2k', image: 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80' },
                  { title: 'Mastering TypeScript', rating: 4.8, students: '3.1k', image: 'https://images.unsplash.com/photo-1555099962-4199c345e5dd?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80' },
                  { title: 'CSS Architecture for Scale', rating: 4.7, students: '2.8k', image: 'https://images.unsplash.com/photo-1507721999472-8ed4421c4af2?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80' },
                ].map((course, i) => (
                  <div key={i} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-shadow group">
                    <div className="h-40 overflow-hidden">
                      <img src={course.image} alt={course.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    </div>
                    <div className="p-5">
                      <h3 className="font-bold text-slate-900 mb-2 line-clamp-1">{course.title}</h3>
                      <div className="flex items-center gap-4 text-sm text-slate-600">
                        <span className="flex items-center gap-1 text-amber-500 font-bold"><Star className="w-4 h-4 fill-current" /> {course.rating}</span>
                        <span className="flex items-center gap-1"><Users className="w-4 h-4" /> {course.students}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
