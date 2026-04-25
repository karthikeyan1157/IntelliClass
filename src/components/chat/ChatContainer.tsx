import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../lib/firebase';
import { 
  collection, 
  query, 
  orderBy, 
  limit, 
  onSnapshot, 
  addDoc, 
  serverTimestamp,
  doc,
  getDoc
} from 'firebase/firestore';
import { 
  Send, 
  User, 
  Users, 
  Hash, 
  MessageCircle, 
  Search, 
  MoreVertical,
  Paperclip,
  Smile,
  Check,
  CheckCheck,
  Clock,
  ArrowLeft
} from 'lucide-react';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';

interface Message {
  id: string;
  text: string;
  senderId: string;
  senderName: string;
  senderRole: string;
  createdAt: any;
}

interface ChatRoom {
  id: string;
  name: string;
  type: 'classroom' | 'department' | 'admin';
  lastMessage?: string;
  lastTime?: any;
}

export default function ChatContainer() {
  const { user, profile } = useAuth();
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [activeRoom, setActiveRoom] = useState<ChatRoom | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isMobileView, setIsMobileView] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleResize = () => setIsMobileView(window.innerWidth < 768);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!user || !profile) return;

    const availableRooms: ChatRoom[] = [];
    
    // Add classroom group
    if (profile.classroomId) {
      availableRooms.push({
        id: profile.classroomId,
        name: profile.advisorOfClass || 'My Classroom',
        type: 'classroom'
      });
    } else if (profile.year && profile.section) {
       // Students usually don't have advisorOfClass, they have year/section
       availableRooms.push({
         id: `${profile.year}-${profile.section}`.replace(/\s+/g, '-'),
         name: `${profile.year} Yr Sec ${profile.section}`,
         type: 'classroom'
       });
    }

    // Add department group
    if (profile.department) {
      availableRooms.push({
        id: `dept-${profile.department.replace(/\s+/g, '-')}`,
        name: `${profile.department} Dept`,
        type: 'department'
      });
    }

    // Add Global/Admin group
    availableRooms.push({
      id: 'global-support',
      name: 'College Support',
      type: 'admin'
    });

    setRooms(availableRooms);
    if (!activeRoom && availableRooms.length > 0) {
      if (!isMobileView) setActiveRoom(availableRooms[0]);
    }
  }, [user, profile, isMobileView]);

  useEffect(() => {
    if (!activeRoom) {
      setMessages([]);
      return;
    }

    const q = query(
      collection(db, 'global_chats', activeRoom.id, 'messages'),
      orderBy('createdAt', 'desc'),
      limit(50)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Message[];
      setMessages(msgs.reverse());
      
      // Auto scroll
      setTimeout(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
      }, 100);
    });

    return () => unsubscribe();
  }, [activeRoom]);

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() || !user || !activeRoom || !profile) return;

    const text = inputText.trim();
    setInputText('');

    try {
      await addDoc(collection(db, 'global_chats', activeRoom.id, 'messages'), {
        text,
        senderId: user.uid,
        senderName: profile.name || user.email,
        senderRole: profile.role || 'user',
        createdAt: serverTimestamp()
      });
    } catch (err) {
      console.error("Error sending message:", err);
    }
  };

  const selectRoom = (room: ChatRoom) => {
    setActiveRoom(room);
    if (isMobileView) setShowSidebar(false);
  };

  return (
    <div className="flex bg-[#f0f2f5] h-[calc(100vh-100px)] rounded-3xl overflow-hidden shadow-2xl border border-slate-200">
      {/* Sidebar */}
      <AnimatePresence>
        {(showSidebar || !isMobileView) && (
          <motion.div 
            initial={isMobileView ? { x: -300 } : false}
            animate={{ x: 0 }}
            exit={{ x: -300 }}
            className={cn(
              "w-full md:w-[350px] bg-white border-r border-[#e9edef] flex flex-col z-20",
              isMobileView && !showSidebar ? "hidden" : "flex",
              isMobileView && "absolute inset-0"
            )}
          >
            {/* Sidebar Header */}
            <div className="px-4 py-3 bg-[#f0f2f5] flex items-center justify-between border-b border-[#e9edef]">
              <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold">
                {profile?.name?.charAt(0) || 'U'}
              </div>
              <div className="flex items-center gap-6 text-[#54656f]">
                <Users className="h-5 w-5 cursor-pointer" />
                <MessageCircle className="h-5 w-5 cursor-pointer" />
                <MoreVertical className="h-5 w-5 cursor-pointer" />
              </div>
            </div>

            {/* Search */}
            <div className="p-2 bg-white flex items-center">
              <div className="bg-[#f0f2f5] rounded-xl flex items-center px-3 py-1.5 flex-1 gap-4 focus-within:bg-white transition-all">
                <Search className="h-4 w-4 text-[#54656f]" />
                <input 
                  placeholder="Search and start a new chat" 
                  className="bg-transparent border-none text-sm outline-none w-full"
                />
              </div>
            </div>

            {/* Room List */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              {rooms.map(room => (
                <div 
                  key={room.id}
                  onClick={() => selectRoom(room)}
                  className={cn(
                    "flex items-center px-4 py-3 cursor-pointer hover:bg-[#f5f6f6] transition-all border-b border-[#f0f2f5] group",
                    activeRoom?.id === room.id && "bg-[#ebebeb]"
                  )}
                >
                  <div className="w-12 h-12 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 mr-4 relative">
                    {room.type === 'classroom' ? <Users className="h-6 w-6" /> : 
                     room.type === 'department' ? <Hash className="h-6 w-6" /> : 
                     <MessageCircle className="h-6 w-6" />}
                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white"></div>
                  </div>
                  <div className="flex-1 min-w-0 border-b border-[#f0f2f5] group-last:border-none py-3">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium text-[#111b21] truncate">{room.name}</h3>
                      <span className="text-[10px] text-[#667781] font-bold uppercase tracking-widest">{room.type}</span>
                    </div>
                    <p className="text-sm text-[#667781] truncate mt-0.5 font-medium">Click to join community chat</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col relative bg-[#efeae2] bg-opacity-[0.4] bg-[url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')]">
        {activeRoom ? (
          <>
            {/* Chat Header */}
            <div className="px-4 py-3 bg-[#f0f2f5] flex items-center justify-between border-b border-[#e9edef] z-10 shadow-sm">
              <div className="flex items-center">
                {isMobileView && (
                  <button 
                    onClick={() => setShowSidebar(true)}
                    className="mr-3 p-2 text-[#54656f] hover:bg-slate-200 rounded-full"
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </button>
                )}
                <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 mr-3">
                   {activeRoom.type === 'classroom' ? <Users className="h-5 w-5" /> : 
                    activeRoom.type === 'department' ? <Hash className="h-5 w-5" /> : 
                    <MessageCircle className="h-5 w-5" />}
                </div>
                <div>
                  <h3 className="font-bold text-[#111b21] text-sm leading-none">{activeRoom.name}</h3>
                  <p className="text-[10px] theme-text-secondary mt-1 font-bold italic opacity-60">
                    {messages.length} messages found in this space
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-6 text-[#54656f]">
                <Search className="h-5 w-5 cursor-pointer" />
                <MoreVertical className="h-5 w-5 cursor-pointer" />
              </div>
            </div>

            {/* Messages Area */}
            <div 
              ref={scrollRef}
              className="flex-1 overflow-y-auto p-4 space-y-2 flex flex-col custom-scrollbar"
            >
               {messages.map((msg, i) => {
                 const isMe = msg.senderId === user?.uid;
                 const showHeader = i === 0 || messages[i-1].senderId !== msg.senderId;
                 return (
                   <div 
                     key={msg.id}
                     className={cn(
                       "flex flex-col max-w-[75%] rounded-lg p-2 relative shadow-sm",
                       isMe ? "bg-[#d9fdd3] self-end rounded-tr-none ml-auto" : "bg-white self-start rounded-tl-none mr-auto",
                       showHeader && "mt-4"
                     )}
                   >
                     {!isMe && showHeader && (
                       <span className="text-[10px] font-bold text-indigo-600 mb-1 ml-1 uppercase">
                         {msg.senderName} ({msg.senderRole})
                       </span>
                     )}
                     <p className="text-sm text-[#111b21] leading-tight px-1">{msg.text}</p>
                     <div className="flex items-center justify-end gap-1.5 mt-1">
                        <span className="text-[9px] text-[#667781] font-bold opacity-60">
                          {msg.createdAt?.toDate ? format(msg.createdAt.toDate(), 'HH:mm') : 'Typing...'}
                        </span>
                        {isMe && (
                          <div className="flex items-center">
                            <CheckCheck className="h-3 w-3 text-[#53bdeb]" />
                          </div>
                        )}
                     </div>
                   </div>
                 );
               })}
               {messages.length === 0 && (
                 <div className="flex-1 flex flex-col justify-center items-center text-center p-10 opacity-40">
                   <MessageCircle className="h-16 w-16 mb-4 text-slate-300" />
                   <p className="font-bold text-slate-900">No messages yet.</p>
                   <p className="text-sm italic">Start the conversation in this group!</p>
                 </div>
               )}
            </div>

            {/* Input Bar */}
            <form 
              onSubmit={handleSendMessage}
              className="px-4 py-3 bg-[#f0f2f5] flex items-center gap-4 border-t border-[#e9edef]"
            >
              <div className="flex items-center gap-4 text-[#54656f]">
                <Smile className="h-6 w-6 cursor-pointer" />
                <Paperclip className="h-6 w-6 cursor-pointer" />
              </div>
              <input 
                placeholder="Type a message..."
                className="flex-1 bg-white border-none rounded-xl py-2 px-4 text-sm outline-none shadow-sm focus:ring-1 focus:ring-slate-200 transition-all"
                value={inputText}
                onChange={e => setInputText(e.target.value)}
              />
              <button 
                type="submit"
                className="p-2.5 bg-indigo-600 text-white rounded-full shadow-lg shadow-indigo-100 hover:scale-110 active:scale-95 transition-all"
              >
                <Send className="h-5 w-5" />
              </button>
            </form>
          </>
        ) : (
          <div className="flex-1 flex flex-col justify-center items-center bg-[#f8f9fa] border-l border-[#e9edef] text-center p-12">
             <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-xl mb-8">
               <MessageCircle className="h-12 w-12 text-[#54656f] opacity-20" />
             </div>
             <h2 className="text-3xl font-light text-[#41525d] mb-4">WhatsApp Educational Groups</h2>
             <p className="max-w-md text-[#667781] leading-relaxed font-medium">
               Select a group chat from the sidebar to stay connected with your department and classroom peers in real-time.
             </p>
             <div className="mt-12 text-[#8696a0] text-xs font-bold uppercase tracking-[0.2em] flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Encrypted Connection
             </div>
          </div>
        )}
      </div>
    </div>
  );
}