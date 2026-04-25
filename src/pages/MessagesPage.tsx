import React from 'react';
import ChatContainer from '../components/chat/ChatContainer';
import { motion } from 'motion/react';
import { MessageSquare } from 'lucide-react';

export default function MessagesPage() {
  return (
    <div className="max-w-[1400px] mx-auto px-4 py-6 md:py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <div className="p-2.5 bg-indigo-600 rounded-2xl shadow-lg shadow-indigo-100">
               <MessageSquare className="h-6 w-6 text-white" />
            </div>
            Community Groups
          </h1>
          <p className="text-slate-500 font-medium mt-1">Real-time educational communication platform</p>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <ChatContainer />
      </motion.div>
    </div>
  );
}