import React from 'react';
import { motion } from 'motion/react';
import { Users, FileText, Search, Download, Trash2, Edit2 } from 'lucide-react';

export default function StudentRecordsPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <motion.div 
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8"
      >
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Main Student Registry</h1>
          <p className="text-slate-500 mt-1">Institutional records, admissions and departmental student data.</p>
        </div>
        <div className="flex gap-3">
          <button className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-sm font-bold shadow-md hover:bg-slate-800 transition-all">
            <Download className="h-4 w-4" />
            Export Data
          </button>
        </div>
      </motion.div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 cursor-pointer hover:bg-white transition-colors">
              <Users className="h-4 w-4 text-slate-400" />
              <span className="text-xs font-bold text-slate-600">All Depts</span>
            </div>
            <div className="flex items-center gap-2 bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-100 cursor-pointer">
              <FileText className="h-4 w-4 text-indigo-600" />
              <span className="text-xs font-bold text-indigo-600 text-nowrap">Academic 2023-24</span>
            </div>
          </div>
          <div className="relative w-full md:w-auto">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search by name, ID or department..."
              className="w-full md:w-80 pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 transition-all"
            />
          </div>
        </div>

        <table className="w-full text-left">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Student Info</th>
              <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Department</th>
              <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Year/Sec</th>
              <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Status</th>
              <th className="px-6 py-4 text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {[
              { name: 'Adithya R', id: '21CS001', dept: 'CSE', year: 'III / A', status: 'Active' },
              { name: 'Bhavana S', id: '21CS042', dept: 'CSE', year: 'III / A', status: 'Active' },
              { name: 'Chandru K', id: '21EC005', dept: 'ECE', year: 'III / B', status: 'On Leave' },
              { name: 'Dinesh M', id: '21IT089', dept: 'IT', year: 'II / A', status: 'Active' },
              { name: 'Esha Gupta', id: '21CS015', dept: 'CSE', year: 'III / A', status: 'Graduated' }
            ].map((student, i) => (
              <tr key={i} className="hover:bg-slate-50 transition-colors group">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs uppercase">
                      {student.name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-bold text-slate-800 leading-none">{student.name}</p>
                      <p className="text-[10px] font-mono text-slate-400 mt-1">{student.id}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                   <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded uppercase tracking-tighter">{student.dept}</span>
                </td>
                <td className="px-6 py-4 text-xs font-medium text-slate-600">
                  {student.year}
                </td>
                <td className="px-6 py-4">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    student.status === 'Active' ? 'bg-emerald-50 text-emerald-600' : 
                    student.status === 'On Leave' ? 'bg-amber-50 text-amber-600' : 'bg-slate-100 text-slate-500'
                  }`}>
                    {student.status}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button className="p-1.5 text-slate-400 hover:text-indigo-600 transition-colors">
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button className="p-1.5 text-slate-400 hover:text-rose-600 transition-colors">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-center">
          <button className="text-xs font-bold text-indigo-600 hover:underline">View All 1,240 Records</button>
        </div>
      </div>
    </div>
  );
}
