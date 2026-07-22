import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import { Search, Send, MoreVertical, Phone, Video } from 'lucide-react';

const contacts = [
  { id: 1, name: 'Sarah Chen', role: 'Instructor', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80', lastMessage: 'Great job on the assignment!', time: '10:42 AM', unread: 2 },
  { id: 2, name: 'Study Group: React', role: 'Group', avatar: 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?ixlib=rb-4.0.3&auto=format&fit=crop&w=256&q=80', lastMessage: 'Mike: Does anyone have the notes?', time: 'Yesterday', unread: 0 },
  { id: 3, name: 'Dr. Marcus Vance', role: 'Instructor', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80', lastMessage: 'Please review chapter 4.', time: 'Mon', unread: 0 },
];

export default function Messages() {
  return (
    <div className="flex min-h-screen bg-slate-50 font-sans text-slate-900">
      <Sidebar />
      <main className="flex-1 ml-64 flex flex-col h-screen">
        <Header />
        <div className="flex-1 p-6 overflow-hidden">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 h-full flex overflow-hidden">
            
            {/* Contacts List */}
            <div className="w-80 border-r border-slate-200 flex flex-col bg-white shrink-0">
              <div className="p-4 border-b border-slate-100">
                <h2 className="text-xl font-bold text-slate-900 mb-4">Messages</h2>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                  <input 
                    type="text" 
                    placeholder="Search messages..." 
                    className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="flex-1 overflow-y-auto">
                {contacts.map((contact, i) => (
                  <div key={contact.id} className={`p-4 flex items-center gap-3 cursor-pointer transition-colors border-b border-slate-50 ${i === 0 ? 'bg-blue-50' : 'hover:bg-slate-50'}`}>
                    <div className="relative">
                      <img src={contact.avatar} alt={contact.name} className="w-12 h-12 rounded-full object-cover" />
                      {contact.unread > 0 && (
                        <span className="absolute -top-1 -right-1 w-5 h-5 bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center rounded-full border-2 border-white">
                          {contact.unread}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-baseline mb-0.5">
                        <h4 className="font-bold text-slate-900 text-sm truncate">{contact.name}</h4>
                        <span className={`text-xs ${contact.unread > 0 ? 'text-blue-600 font-bold' : 'text-slate-400'}`}>{contact.time}</span>
                      </div>
                      <p className={`text-xs truncate ${contact.unread > 0 ? 'text-slate-900 font-medium' : 'text-slate-500'}`}>{contact.lastMessage}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Chat Area */}
            <div className="flex-1 flex flex-col bg-slate-50/50">
              {/* Chat Header */}
              <div className="h-16 border-b border-slate-200 bg-white flex items-center justify-between px-6 shrink-0">
                <div className="flex items-center gap-3">
                  <img src={contacts[0].avatar} alt={contacts[0].name} className="w-10 h-10 rounded-full object-cover" />
                  <div>
                    <h3 className="font-bold text-slate-900">{contacts[0].name}</h3>
                    <p className="text-xs text-green-500 font-medium">Online</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-slate-400">
                  <button className="hover:text-blue-600 transition-colors"><Phone className="w-5 h-5" /></button>
                  <button className="hover:text-blue-600 transition-colors"><Video className="w-5 h-5" /></button>
                  <div className="w-px h-6 bg-slate-200"></div>
                  <button className="hover:text-slate-600 transition-colors"><MoreVertical className="w-5 h-5" /></button>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                <div className="flex justify-center">
                  <span className="text-xs font-medium text-slate-400 bg-slate-100 px-3 py-1 rounded-full">Today</span>
                </div>
                
                <div className="flex gap-3 max-w-2xl">
                  <img src={contacts[0].avatar} alt={contacts[0].name} className="w-8 h-8 rounded-full object-cover mt-auto" />
                  <div>
                    <div className="bg-white border border-slate-200 p-3 rounded-2xl rounded-bl-sm shadow-sm text-sm text-slate-700">
                      Hi Alex! I reviewed your recent submission for the Hooks project.
                    </div>
                    <span className="text-[10px] text-slate-400 mt-1 ml-1">10:40 AM</span>
                  </div>
                </div>

                <div className="flex gap-3 max-w-2xl">
                  <img src={contacts[0].avatar} alt={contacts[0].name} className="w-8 h-8 rounded-full object-cover mt-auto" />
                  <div>
                    <div className="bg-white border border-slate-200 p-3 rounded-2xl rounded-bl-sm shadow-sm text-sm text-slate-700">
                      Great job on the assignment! Your use of custom hooks was particularly impressive.
                    </div>
                    <span className="text-[10px] text-slate-400 mt-1 ml-1">10:42 AM</span>
                  </div>
                </div>
              </div>

              {/* Input */}
              <div className="p-4 bg-white border-t border-slate-200 shrink-0">
                <div className="flex items-center gap-3">
                  <input 
                    type="text" 
                    placeholder="Type your message..." 
                    className="flex-1 bg-slate-100 border-none rounded-full px-6 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center hover:bg-blue-700 transition-colors shadow-sm shrink-0">
                    <Send className="w-5 h-5 ml-1" />
                  </button>
                </div>
              </div>
            </div>

          </div>
        </div>
      </main>
    </div>
  );
}
