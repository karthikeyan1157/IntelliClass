import React, { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { collection, query, orderBy, limit, onSnapshot, where } from 'firebase/firestore';
import { Announcement } from '../../types';
import { Bell, Info, CreditCard, Bus, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '../../lib/utils';

export default function BulletinBoard({ targetDept, targetClass, userRole }: { targetDept?: string; targetClass?: string; userRole?: string }) {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);

  useEffect(() => {
    const q = query(
      collection(db, 'announcements'),
      orderBy('createdAt', 'desc'),
      limit(20)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Announcement));
      
      // Filter logic:
      // 1. If targetDept is specified, must match targetDept OR have no targetDept (general)
      // 2. If targetRole is specified, must match targetRole OR be 'all' OR have no targetRole
      // 3. If targetClass is specified, must match targetClass OR have no targetClass
      
      const filtered = data.filter(a => {
        const deptMatch = !a.targetDept || a.targetDept === targetDept;
        const roleMatch = !a.targetRole || a.targetRole === 'all' || a.targetRole === userRole;
        const classMatch = !a.targetClass || a.targetClass === targetClass;
        
        return deptMatch && roleMatch && classMatch;
      });
      
      setAnnouncements(filtered);
    });

    return unsubscribe;
  }, [targetDept, targetClass, userRole]);

  const getIcon = (category: string) => {
    switch (category) {
      case 'fee': return CreditCard;
      case 'bus': return Bus;
      case 'exam': return Bell;
      case 'event': return Calendar;
      default: return Info;
    }
  };

  const getColor = (category: string) => {
    switch (category) {
      case 'fee': return 'bg-amber-50 text-amber-600 border-amber-100';
      case 'bus': return 'bg-indigo-50 text-indigo-600 border-indigo-100';
      case 'exam': return 'bg-rose-50 text-rose-600 border-rose-100';
      case 'event': return 'bg-emerald-50 text-emerald-600 border-emerald-100';
      default: return 'bg-blue-50 text-blue-600 border-blue-100';
    }
  };

  if (announcements.length === 0) {
    return <div className="text-center py-8 text-gray-500 italic text-sm">No active announcements.</div>;
  }

  return (
    <div className="space-y-4">
      {announcements.map((ann) => {
        const Icon = getIcon(ann.category);
        return (
          <div key={ann.id} className={cn("p-4 rounded-lg border flex gap-4", getColor(ann.category))}>
            <div className="shrink-0">
              <Icon className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <div className="flex justify-between items-start">
                <h4 className="font-bold text-gray-900 leading-tight">{ann.title}</h4>
                <span className="text-[10px] text-gray-500 font-mono uppercase">
                  {ann.createdAt ? format(ann.createdAt.toDate(), 'HH:mm • MMM d') : ''}
                </span>
              </div>
              <p className="text-sm text-gray-600 mt-1">{ann.content}</p>
              <div className="mt-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] bg-gray-200 text-gray-700 px-1.5 py-0.5 rounded uppercase font-bold tracking-wider">
                    {ann.category}
                  </span>
                  {ann.targetDept && (
                    <span className="text-[10px] bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded uppercase font-bold tracking-wider">
                      {ann.targetDept}
                    </span>
                  )}
                  {ann.targetClass && (
                    <span className="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded uppercase font-bold tracking-wider">
                      {ann.targetClass}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                   <div className="text-right">
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter leading-none mb-0.5">
                        {ann.authorRole?.toUpperCase() || 'OFFICE'}
                      </p>
                      <p className="text-[11px] font-black text-slate-800 leading-none">
                        {ann.author}
                      </p>
                   </div>
                   <div className={cn(
                     "w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow-sm ring-2 ring-white",
                     ann.authorRole === 'hod' ? "bg-indigo-600" : "bg-emerald-600"
                   )}>
                     {ann.author?.[0]?.toUpperCase() || 'S'}
                   </div>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
