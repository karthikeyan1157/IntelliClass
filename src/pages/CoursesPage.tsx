import React from 'react';
import { motion } from 'motion/react';
import { BookOpen, Search, Filter, MoreVertical } from 'lucide-react';

export default function CoursesPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8"
      >
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Courses & Teaching</h1>
          <p className="text-slate-500 mt-1">Manage your subjects and classroom assignments across departments.</p>
        </div>
        <div className="flex gap-3">
          <button className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold shadow-md hover:bg-indigo-700 transition-all">
            <BookOpen className="h-4 w-4" />
            Add Course
          </button>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-800">Assigned Subjects</h2>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input 
                    type="text" 
                    placeholder="Search classes..."
                    className="pl-9 pr-4 py-1.5 bg-slate-50 border-none text-xs rounded-lg focus:ring-2 focus:ring-indigo-500 w-48"
                  />
                </div>
                <button className="p-1.5 bg-slate-50 text-slate-500 rounded-lg hover:bg-slate-100">
                  <Filter className="h-4 w-4" />
                </button>
              </div>
            </div>
            
            <div className="divide-y divide-slate-100">
              {[
                { id: 'CS101', name: 'Software Engineering', class: 'III Year - Sec A', dept: 'CSE', strength: 62 },
                { id: 'CS204', name: 'Database Management', class: 'II Year - Sec B', dept: 'ECE', strength: 58 },
                { id: 'CS305', name: 'Artificial Intelligence', class: 'IV Year - Sec A', dept: 'CSE', strength: 45 }
              ].map(course => (
                <div key={course.id} className="p-6 flex items-center justify-between hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center font-bold text-sm">
                      {course.id}
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-800">{course.name}</h3>
                      <p className="text-xs text-slate-500">{course.class} • {course.dept} Dept</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <p className="text-sm font-bold text-slate-700">{course.strength}</p>
                      <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Students</p>
                    </div>
                    <button className="p-2 text-slate-400 hover:text-slate-600 transition-colors">
                      <MoreVertical className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-gradient-to-br from-indigo-600 to-violet-700 rounded-2xl p-6 text-white shadow-lg shadow-indigo-200">
            <h3 className="text-lg font-bold mb-2">Subject Advisor View</h3>
            <p className="text-indigo-100 text-xs leading-relaxed mb-6">
              As an advisor or subject faculty, you have unified monitoring access to students across multiple departments.
            </p>
            <div className="space-y-3">
              <div className="bg-white/10 backdrop-blur-md rounded-xl p-3 border border-white/20">
                <p className="text-[10px] font-bold text-indigo-200 uppercase tracking-widest mb-1">Current Focus</p>
                <p className="text-sm font-medium">III Year CS - Section A</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
