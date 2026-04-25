import React from 'react';
import { motion } from 'motion/react';
import { Award, TrendingUp, Download, CheckCircle2 } from 'lucide-react';

export default function GradesPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="mb-8"
      >
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Academic Performance</h1>
        <p className="text-slate-500 mt-1">View your internal marks, assessment results and overall CGPA.</p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        {[
          { label: 'Current CGPA', value: '8.42', icon: Award, color: 'text-indigo-600', bg: 'bg-indigo-50' },
          { label: 'Rank in Dept', value: '#12', icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Credits Earned', value: '112', icon: CheckCircle2, color: 'text-violet-600', bg: 'bg-violet-50' },
          { label: 'Semesters', value: '6/8', icon: Download, color: 'text-amber-600', bg: 'bg-amber-50' }
        ].map((stat, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm"
          >
            <div className={`p-2 w-fit rounded-lg ${stat.bg} ${stat.color} mb-4`}>
              <stat.icon className="h-5 w-5" />
            </div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{stat.label}</p>
            <h3 className="text-2xl font-bold text-slate-800 mt-1">{stat.value}</h3>
          </motion.div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Subject Code</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Course Name</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Internal I</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Internal II</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Attendance</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {[
              { code: 'CS102', name: 'Data Structures', int1: 45, int2: 48, att: '94%' },
              { code: 'CS105', name: 'Operating Systems', int1: 38, int2: 42, att: '88%' },
              { code: 'MA201', name: 'Discrete Math', int1: 32, int2: 40, att: '96%' },
              { code: 'HS103', name: 'English for Engg', int1: 48, int2: 49, att: '100%' }
            ].map((row, i) => (
              <tr key={i} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4 font-mono text-xs text-slate-500">{row.code}</td>
                <td className="px-6 py-4 font-bold text-slate-800">{row.name}</td>
                <td className="px-6 py-4 text-center">
                   <span className={`px-2 py-1 rounded-lg text-xs font-bold ${row.int1 >= 40 ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                     {row.int1}/50
                   </span>
                </td>
                <td className="px-6 py-4 text-center">
                   <span className={`px-2 py-1 rounded-lg text-xs font-bold ${row.int2 >= 40 ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                     {row.int2}/50
                   </span>
                </td>
                <td className="px-6 py-4 text-center font-bold text-slate-600">{row.att}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
