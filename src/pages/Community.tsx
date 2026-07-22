import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import { MessageSquare, Heart, Share2, MoreHorizontal, Search, Plus, Hash, Users, Calendar, Video } from 'lucide-react';
import { useState } from 'react';
import { clsx } from 'clsx';

const posts = [
  {
    id: 1,
    author: 'Alex Johnson',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
    time: '2 hours ago',
    title: 'Tips for mastering React useEffect hook?',
    content: "I've been struggling a bit with the dependency array in useEffect. Does anyone have good resources or mental models for understanding when exactly to include props/state?",
    tags: ['React', 'Help', 'Frontend'],
    likes: 24,
    comments: 8,
    category: 'Homework Help'
  },
  {
    id: 2,
    author: 'Sarah Chen',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
    time: '5 hours ago',
    title: 'Study group for Data Science final project',
    content: "Hey everyone! I'm looking for 2-3 people to form a study group for the upcoming DS-201 final project. We can meet virtually on Discord. Let me know if you're interested!",
    tags: ['Data Science', 'Study Group', 'Collaboration'],
    likes: 15,
    comments: 12,
    category: 'General'
  },
  {
    id: 3,
    author: 'Dr. Marcus Vance',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
    time: '1 day ago',
    title: 'New internship opportunities at TechCorp',
    content: "Just wanted to share some new internship listings I received from our industry partners at TechCorp. They are looking for frontend and data engineering interns for Summer 2025. Check the career portal for details!",
    tags: ['Career', 'Internship', 'Announcements'],
    likes: 89,
    comments: 4,
    category: 'Career'
  }
];

const studyGroups = [
  {
    id: 1,
    name: 'React Developers Club',
    members: 128,
    active: 14,
    description: 'A place for React enthusiasts to share code, discuss patterns, and help each other debug.',
    nextSession: 'Tomorrow, 2:00 PM',
    image: 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?ixlib=rb-4.0.3&auto=format&fit=crop&w=1740&q=80',
    tags: ['Frontend', 'React', 'JavaScript']
  },
  {
    id: 2,
    name: 'Data Science Study Hall',
    members: 85,
    active: 8,
    description: 'Weekly study sessions for DS-201 and ML basics. We review lecture notes and work on problem sets together.',
    nextSession: 'Wed, 5:00 PM',
    image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?ixlib=rb-4.0.3&auto=format&fit=crop&w=1740&q=80',
    tags: ['Data Science', 'Python', 'Math']
  },
  {
    id: 3,
    name: 'UX/UI Design Critique',
    members: 64,
    active: 5,
    description: 'Share your designs and get constructive feedback from peers. Open to all skill levels.',
    nextSession: 'Fri, 1:00 PM',
    image: 'https://images.unsplash.com/photo-1586717791821-3f44a5638d48?ixlib=rb-4.0.3&auto=format&fit=crop&w=1740&q=80',
    tags: ['Design', 'Figma', 'Portfolio']
  }
];

const categories = [
  { name: 'General', count: 124 },
  { name: 'Homework Help', count: 85 },
  { name: 'Career Advice', count: 42 },
  { name: 'Project Showcase', count: 36 },
  { name: 'Events', count: 18 },
];

export default function Community() {
  const [activeTab, setActiveTab] = useState<'feed' | 'groups'>('feed');

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans text-slate-900">
      <Sidebar />
      
      <main className="flex-1 ml-64">
        <Header />
        
        <div className="p-8 max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Community</h1>
              <p className="text-slate-500 mt-1">Connect with peers, ask questions, and share knowledge.</p>
            </div>
            <div className="flex gap-3">
              <div className="bg-slate-100 p-1 rounded-lg flex">
                <button 
                  onClick={() => setActiveTab('feed')}
                  className={clsx(
                    "px-4 py-1.5 text-sm font-bold rounded-md transition-all",
                    activeTab === 'feed' ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
                  )}
                >
                  Feed
                </button>
                <button 
                  onClick={() => setActiveTab('groups')}
                  className={clsx(
                    "px-4 py-1.5 text-sm font-bold rounded-md transition-all",
                    activeTab === 'groups' ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
                  )}
                >
                  Study Groups
                </button>
              </div>
              <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 transition-colors shadow-sm">
                <Plus className="w-4 h-4" />
                {activeTab === 'feed' ? 'New Post' : 'Create Group'}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Left Sidebar - Categories */}
            <div className="lg:col-span-1 space-y-6">
              <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                <div className="relative mb-4">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                  <input 
                    type="text" 
                    placeholder={activeTab === 'feed' ? "Search topics..." : "Search groups..."}
                    className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <h3 className="font-bold text-slate-900 mb-3 px-2">Categories</h3>
                <div className="space-y-1">
                  {categories.map((cat) => (
                    <button key={cat.name} className="w-full flex items-center justify-between px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 hover:text-blue-600 rounded-lg transition-colors group">
                      <span className="font-medium">{cat.name}</span>
                      <span className="bg-slate-100 text-slate-500 text-xs py-0.5 px-2 rounded-full group-hover:bg-blue-100 group-hover:text-blue-600">{cat.count}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-6 rounded-xl text-white shadow-md">
                <h3 className="font-bold text-lg mb-2">Student Guidelines</h3>
                <p className="text-sm text-blue-100 mb-4">Be respectful, stay on topic, and help each other learn.</p>
                <button className="text-xs font-bold bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-lg transition-colors">Read Full Guidelines</button>
              </div>
            </div>

            {/* Main Content */}
            <div className="lg:col-span-3 space-y-6">
              {activeTab === 'feed' ? (
                // Feed View
                posts.map((post) => (
                  <div key={post.id} className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <img src={post.avatar} alt={post.author} className="w-10 h-10 rounded-full border border-slate-100" />
                        <div>
                          <h4 className="font-bold text-slate-900 text-sm">{post.author}</h4>
                          <p className="text-xs text-slate-500">{post.time} • <span className="text-blue-600 font-medium">{post.category}</span></p>
                        </div>
                      </div>
                      <button className="text-slate-400 hover:text-slate-600">
                        <MoreHorizontal className="w-5 h-5" />
                      </button>
                    </div>
                    
                    <h3 className="text-xl font-bold text-slate-900 mb-2">{post.title}</h3>
                    <p className="text-slate-600 mb-4 leading-relaxed">{post.content}</p>
                    
                    <div className="flex flex-wrap gap-2 mb-6">
                      {post.tags.map((tag) => (
                        <span key={tag} className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 text-slate-600 text-xs font-medium rounded-md">
                          <Hash className="w-3 h-3 text-slate-400" />
                          {tag}
                        </span>
                      ))}
                    </div>
                    
                    <div className="flex items-center gap-6 border-t border-slate-100 pt-4">
                      <button className="flex items-center gap-2 text-slate-500 hover:text-red-500 transition-colors text-sm font-medium group">
                        <Heart className="w-4 h-4 group-hover:fill-current" />
                        {post.likes} Likes
                      </button>
                      <button className="flex items-center gap-2 text-slate-500 hover:text-blue-600 transition-colors text-sm font-medium">
                        <MessageSquare className="w-4 h-4" />
                        {post.comments} Comments
                      </button>
                      <button className="flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors text-sm font-medium ml-auto">
                        <Share2 className="w-4 h-4" />
                        Share
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                // Study Groups View
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {studyGroups.map((group) => (
                    <div key={group.id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-shadow flex flex-col">
                      <div className="h-32 bg-slate-200 relative">
                        <img src={group.image} alt={group.name} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                        <div className="absolute bottom-3 left-4 text-white">
                          <h3 className="font-bold text-lg">{group.name}</h3>
                          <p className="text-xs opacity-90">{group.members} members • {group.active} online</p>
                        </div>
                      </div>
                      <div className="p-5 flex flex-col flex-1">
                        <p className="text-slate-600 text-sm mb-4 line-clamp-2">{group.description}</p>
                        
                        <div className="flex flex-wrap gap-2 mb-4">
                          {group.tags.map((tag) => (
                            <span key={tag} className="px-2 py-1 bg-slate-100 text-slate-600 text-xs font-medium rounded-md">
                              {tag}
                            </span>
                          ))}
                        </div>

                        <div className="mt-auto pt-4 border-t border-slate-100 flex items-center justify-between">
                          <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                            <Video className="w-3 h-3" />
                            <span>Next: {group.nextSession}</span>
                          </div>
                          <button className="px-3 py-1.5 bg-blue-50 text-blue-600 text-xs font-bold rounded-lg hover:bg-blue-100 transition-colors">
                            Join Group
                          </button>
                        </div>
                      </div>
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
