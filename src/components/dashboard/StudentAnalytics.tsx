import React, { useRef } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Legend,
  Cell
} from 'recharts';
import { Download, FileDown, PieChart as PieIcon, BarChart3 } from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { toast } from 'react-hot-toast';

interface StudentAnalyticsProps {
  students: any[];
  departmentName: string;
  viewedYear: string;
}

export default function StudentAnalytics({ students, departmentName, viewedYear }: StudentAnalyticsProps) {
  const chartRef = useRef<HTMLDivElement>(null);

  // Process data for Marks Distribution
  const processMarksData = (type: 'internal1' | 'internal2') => {
    const bins = ['0-20', '21-40', '41-60', '61-80', '81-100'];
    const counts = [0, 0, 0, 0, 0];

    students.forEach(s => {
      const mark = s.internalMarks?.[type] || 0;
      if (mark <= 20) counts[0]++;
      else if (mark <= 40) counts[1]++;
      else if (mark <= 60) counts[2]++;
      else if (mark <= 80) counts[3]++;
      else counts[4]++;
    });

    return bins.map((range, i) => ({
      range,
      count: counts[i],
    }));
  };

  const internal1Data = processMarksData('internal1');
  const internal2Data = processMarksData('internal2');

  const exportAsImage = async () => {
    if (!chartRef.current) return;
    try {
      const canvas = await html2canvas(chartRef.current);
      const link = document.createElement('a');
      link.download = `Analytics_${departmentName}_${viewedYear}_Year.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      toast.success('Chart exported as Image');
    } catch (err) {
      toast.error('Failed to export image');
    }
  };

  const exportAsPDF = async () => {
    if (!chartRef.current) return;
    try {
      const canvas = await html2canvas(chartRef.current);
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      
      pdf.text(`${departmentName} Department - Performance Report`, 10, 10);
      pdf.text(`Academic Year Filtering: ${viewedYear}`, 10, 20);
      pdf.addImage(imgData, 'PNG', 0, 30, pdfWidth, pdfHeight);
      pdf.save(`Analytics_${departmentName}_${viewedYear}.pdf`);
      toast.success('Chart exported as PDF');
    } catch (err) {
      toast.error('Failed to export PDF');
    }
  };

  const COLORS = ['#6366f1', '#3b82f6', '#10b981', '#f59e0b', '#ef4444'];

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 rounded-2xl shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{label} Range</p>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-indigo-500" />
            <p className="text-sm font-bold text-slate-900">
              {payload[0].value} <span className="text-slate-400 font-medium">Students</span>
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-indigo-600" />
          Marks Distribution Analysis
        </h3>
        <div className="flex gap-2">
          <button 
            onClick={exportAsImage}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 text-slate-600 rounded-lg text-xs font-bold hover:bg-slate-50 transition-all shadow-sm"
          >
            <Download className="h-3.5 w-3.5" />
            Export PNG
          </button>
          <button 
            onClick={exportAsPDF}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 transition-all shadow-md"
          >
            <FileDown className="h-3.5 w-3.5" />
            Export PDF
          </button>
        </div>
      </div>

      <div ref={chartRef} className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          {/* Internal 1 Chart */}
          <div className="h-[300px]">
             <div className="flex items-center justify-between mb-4">
                 <h4 className="text-sm font-bold text-slate-700 uppercase tracking-widest bg-slate-50 px-3 py-1 rounded-full border border-slate-100">Internal Assessment 1</h4>
                <div className="flex items-center gap-2">
                   <div className="w-2 h-2 rounded-full bg-indigo-500" />
                   <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">Student Density</span>
                </div>
             </div>
             <ResponsiveContainer width="100%" height="100%">
               <BarChart data={internal1Data} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                 <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                 <XAxis 
                   dataKey="range" 
                   axisLine={false} 
                   tickLine={false} 
                   tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 600 }}
                 />
                 <YAxis 
                   axisLine={false} 
                   tickLine={false} 
                   tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 600 }}
                 />
                 <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc', radius: 8 }} />
                 <Bar dataKey="count" radius={[6, 6, 0, 0]} barSize={40}>
                   {internal1Data.map((entry, index) => (
                     <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                   ))}
                 </Bar>
               </BarChart>
             </ResponsiveContainer>
          </div>

          {/* Internal 2 Chart */}
          <div className="h-[300px]">
             <div className="flex items-center justify-between mb-4">
                 <h4 className="text-sm font-bold text-slate-700 uppercase tracking-widest bg-slate-50 px-3 py-1 rounded-full border border-slate-100">Internal Assessment 2</h4>
                <div className="flex items-center gap-2">
                   <div className="w-2 h-2 rounded-full bg-blue-500" />
                   <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">Student Density</span>
                </div>
             </div>
             <ResponsiveContainer width="100%" height="100%">
               <BarChart data={internal2Data} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                 <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                 <XAxis 
                   dataKey="range" 
                   axisLine={false} 
                   tickLine={false} 
                   tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 600 }}
                 />
                 <YAxis 
                   axisLine={false} 
                   tickLine={false} 
                   tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 600 }}
                 />
                 <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc', radius: 8 }} />
                 <Bar dataKey="count" radius={[6, 6, 0, 0]} barSize={40}>
                   {internal2Data.map((entry, index) => (
                     <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                   ))}
                 </Bar>
               </BarChart>
             </ResponsiveContainer>
          </div>
        </div>

        <div className="pt-6 border-t border-slate-50 flex items-center justify-between text-[10px] text-slate-400 font-bold uppercase tracking-widest">
           <span>Department Performance Overview</span>
           <span>Generative Insight: {viewedYear} Year Strength: {students.length} Students</span>
        </div>
      </div>
    </div>
  );
}
