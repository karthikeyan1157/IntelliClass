import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../lib/firebase';
import { collection, query, where, getDocs, doc, getDoc, orderBy, limit, setDoc, serverTimestamp } from 'firebase/firestore';
import { Calendar, FileText, ClipboardList, Bell, User as UserIcon, Upload, Trash2, Download, BookOpen, MessageSquare, UploadCloud, Loader2, Star, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'react-hot-toast';
import { AttendanceRecord, Announcement, UserDocument } from '../../types';
import BulletinBoard from '../shared/BulletinBoard';
import { motion } from 'motion/react';
import { cn } from '../../lib/utils';

export default function StudentDashboard() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [documents, setDocuments] = useState<UserDocument[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [resources, setResources] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [activeQuestion, setActiveQuestion] = useState<any | null>(null);
  const [myResponse, setMyResponse] = useState<any | null>(null);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      
      try {
        // Fetch Profile
        const profileDoc = await getDoc(doc(db, 'users', user.uid, 'profiles', 'main'));
        const prof = profileDoc.data();
        if (prof) {
          setProfile(prof);

          // Fetch Attendance
          const attQuery = query(collection(db, 'users', user.uid, 'attendance'), orderBy('date', 'desc'), limit(30));
          const attSnap = await getDocs(attQuery);
          setAttendance(attSnap.docs.map(d => d.data() as AttendanceRecord));

          // Fetch Documents
          const docSnap = await getDocs(collection(db, 'users', user.uid, 'documents'));
          setDocuments(docSnap.docs.map(d => ({ id: d.id, ...d.data() } as UserDocument)));

          // Fetch Subjects (Courses) for this student's class
          const targetClass = `${prof.year} Year Sec ${prof.section}`;
          const coursesQuery = query(collection(db, 'courses'), where('targetClass', '==', targetClass));
          const courseSnapshot = await getDocs(coursesQuery);
          const courseList = courseSnapshot.docs.map(d => ({ id: d.id, ...d.data() }));
          setCourses(courseList);

          // Fetch Assignments for matches
          const assignmentsQuery = query(collection(db, 'assignments'), where('classroomId', '==', targetClass));
          const assignmentSnapshot = await getDocs(assignmentsQuery);
          setAssignments(assignmentSnapshot.docs.map(d => ({ id: d.id, ...d.data() })));

          // Fetch Resources for matches
          const courseIds = courseList.map(c => c.id);
          if (courseIds.length > 0) {
            const resQuery = query(collection(db, 'resources'), where('courseId', 'in', courseIds));
            const resSnap = await getDocs(resQuery);
            setResources(resSnap.docs.map(d => ({ id: d.id, ...d.data() })));
          }

          // Fetch Advisor Question for this class
          const aqQuery = query(
            collection(db, 'advisor_questions'), 
            where('targetClass', '==', targetClass),
            where('active', '==', true),
            limit(1)
          );
          const aqSnap = await getDocs(aqQuery);
          if (!aqSnap.empty) {
            const aq = { id: aqSnap.docs[0].id, ...aqSnap.docs[0].data() };
            setActiveQuestion(aq);
            
            // Check for previous response
            const respQuery = query(
              collection(db, 'advisor_questions', aq.id, 'responses'),
              where('studentId', '==', user.uid)
            );
            const respSnap = await getDocs(respQuery);
            if (!respSnap.empty) {
              setMyResponse(respSnap.docs[0].data());
            }
          }
        }
      } catch (err) {
        console.error("Student Fetch Error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  const handleSubmitResponse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !activeQuestion || rating === 0) return;
    setSubmitting(true);
    try {
      const respData = {
        questionId: activeQuestion.id,
        studentId: user.uid,
        rating,
        comment,
        createdAt: serverTimestamp(),
      };
      await setDoc(doc(collection(db, 'advisor_questions', activeQuestion.id, 'responses')), respData);
      setMyResponse(respData);
      toast.success('Feedback submitted successfully');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin h-8 w-8 text-indigo-600" /></div>;

  const presentCount = attendance.filter(a => a.status === 'present').length;
  const attendanceRate = attendance.length > 0 ? (presentCount / attendance.length) * 100 : 0;

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-8">
      {/* Welcome Section */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight leading-tight">
            Welcome back, <span className="text-indigo-600">{profile?.name?.split(' ')[0] || 'Student'}</span>
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100">
              {profile?.regNo}
            </span>
            <span className="text-slate-400">•</span>
            <span className="text-sm font-medium text-slate-500">{profile?.year} Year</span>
            <span className="text-slate-400">•</span>
            <span className="text-sm font-medium text-slate-500">Section {profile?.section}</span>
          </div>
        </div>
        <div className="hidden md:block">
          <div className="flex bg-white p-1 rounded-xl shadow-sm border border-slate-200">
            <div className="px-4 py-2 text-center border-r border-slate-100">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Year</p>
              <p className="font-bold text-slate-700">{profile?.year || '-'}</p>
            </div>
            <div className="px-4 py-2 text-center">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Section</p>
              <p className="font-bold text-slate-700">{profile?.section || '-'}</p>
            </div>
          </div>
        </div>
      </header>

      {/* Advisor Survey Section */}
      {activeQuestion && (
        <motion.section 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-3xl shadow-xl shadow-slate-200 border border-slate-200 overflow-hidden"
        >
           <div className="p-8 flex flex-col md:flex-row items-center gap-8">
              <div className="w-20 h-20 rounded-3xl bg-indigo-600 flex items-center justify-center shrink-0 shadow-lg shadow-indigo-100">
                 <Star className="h-10 w-10 text-white" />
              </div>
              <div className="flex-1 text-center md:text-left">
                 <h3 className="text-xl font-bold text-slate-900 tracking-tight">Weekly Advisor Survey</h3>
                 <p className="text-slate-500 text-sm mt-1 mb-4">Your advisor <span className="font-bold text-slate-700">{activeQuestion.facultyName}</span> wants to know:</p>
                 <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 italic text-slate-700 font-medium">
                    "{activeQuestion.text}"
                 </div>
              </div>
              <div className="w-full md:w-80 shrink-0">
                 {myResponse ? (
                   <div className="bg-emerald-50 p-8 rounded-3xl border border-emerald-100 flex flex-col items-center justify-center text-center h-full">
                      <div className="w-12 h-12 bg-emerald-500 rounded-full flex items-center justify-center mb-3">
                         <CheckCircle className="h-6 w-6 text-white" />
                      </div>
                      <p className="text-emerald-700 font-bold text-sm">Response Submitted</p>
                      <p className="text-emerald-600 text-[10px] font-bold uppercase tracking-widest mt-1">You rated: {myResponse.rating}/10</p>
                   </div>
                 ) : (
                   <form onSubmit={handleSubmitResponse} className="space-y-4">
                      <div className="flex items-center justify-between gap-1">
                         {[1,2,3,4,5,6,7,8,9,10].map(n => (
                           <button 
                             key={n}
                             type="button"
                             onClick={() => setRating(n)}
                             className={cn(
                               "w-7 h-7 rounded flex items-center justify-center text-[10px] font-black transition-all",
                               rating === n ? "bg-indigo-600 text-white shadow-md scale-110" : "bg-slate-100 text-slate-400 hover:bg-slate-200"
                             )}
                           >
                             {n}
                           </button>
                         ))}
                      </div>
                      <textarea 
                        placeholder="Any comments? (Optional)"
                        rows={2}
                        className="w-full bg-slate-50 border-slate-200 rounded-xl py-2 px-3 text-xs focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 transition-all resize-none"
                        value={comment}
                        onChange={e => setComment(e.target.value)}
                      />
                      <button 
                        type="submit"
                        disabled={submitting || rating === 0}
                        className="w-full py-3 bg-indigo-600 text-white rounded-xl text-xs font-bold shadow-lg shadow-indigo-100 hover:bg-indigo-700 disabled:opacity-50 transition-all active:scale-95"
                      >
                        {submitting ? 'Submitting...' : 'Submit Rating'}
                      </button>
                   </form>
                 )}
              </div>
           </div>
        </motion.section>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: 'Attendance Rate', val: `${attendanceRate.toFixed(1)}%`, icon: Calendar, color: 'indigo' },
          { label: 'Academic Index', val: `${profile?.internalMarks?.internal1 || '-'}/${profile?.internalMarks?.internal2 || '-'}`, icon: ClipboardList, color: 'emerald' },
          { label: 'Vault Files', val: documents.length, icon: FileText, color: 'amber' },
        ].map((stat, i) => (
          <motion.div 
            key={i}
            whileHover={{ y: -5 }} 
            className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center justify-between group cursor-default transition-all hover:shadow-md"
          >
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{stat.label}</p>
              <p className="text-3xl font-bold text-slate-900 tracking-tighter">{stat.val}</p>
            </div>
            <div className={cn(
              "p-4 rounded-xl transition-transform group-hover:scale-110 duration-300",
              stat.color === 'indigo' ? "bg-indigo-50 text-indigo-600" :
              stat.color === 'emerald' ? "bg-emerald-50 text-emerald-600" :
              "bg-amber-50 text-amber-600"
            )}>
              <stat.icon className="h-6 w-6" />
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center gap-3">
              <div className="p-2 bg-indigo-50 rounded-lg">
                <Bell className="h-5 w-5 text-indigo-600" />
              </div>
              <h3 className="font-bold text-slate-900 tracking-tight">Main Bulletin</h3>
            </div>
            <div className="p-6 overflow-y-auto">
              <BulletinBoard 
                targetDept={profile?.department} 
                targetClass={`${profile?.year} Year Sec ${profile?.section}`}
                userRole="student"
              />
            </div>
          </section>

          {/* Subject Activity Feed (WhatsApp style) */}
          <section className="bg-white rounded-2xl shadow-xl shadow-slate-200 border border-slate-200 overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/30 flex items-center gap-3">
              <div className="p-2 bg-indigo-100 rounded-lg">
                <MessageSquare className="h-5 w-5 text-indigo-600" />
              </div>
              <h3 className="font-bold text-slate-900 tracking-tight">Subject Activity Feed</h3>
            </div>
            <div className="p-6 space-y-6 max-h-[600px] overflow-y-auto custom-scrollbar">
              {[...assignments, ...resources]
                .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))
                .map((item, i) => {
                  const course = courses.find(c => c.id === item.courseId);
                  return (
                    <div key={item.id} className="relative pl-10 border-l-2 border-slate-100 last:border-0 pb-8 last:pb-0">
                       <div className={cn(
                         "absolute left-[-13px] top-0 w-6 h-6 rounded-full border-4 border-white shadow-sm flex items-center justify-center",
                         item.dueDate ? "bg-indigo-500 text-white" : "bg-emerald-500 text-white"
                       )}>
                         {item.dueDate ? <ClipboardList className="h-3 w-3" /> : <UploadCloud className="h-3 w-3" />}
                       </div>
                       <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:border-indigo-100 transition-colors">
                         <div className="flex items-center justify-between gap-4 mb-2">
                            <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded uppercase tracking-widest">{course?.name || 'Classroom'}</span>
                            <span className="text-[10px] text-slate-400">{item.createdAt ? format(item.createdAt.toDate(), 'h:mm a, MMM d') : 'Just now'}</span>
                         </div>
                         <h4 className="font-bold text-slate-800 mb-1">{item.title}</h4>
                         <p className="text-xs text-slate-500 leading-relaxed">{item.description || 'New learning material shared by your professor.'}</p>
                         
                         <div className="mt-4 pt-4 border-t border-slate-50 flex items-center justify-between">
                            {item.dueDate ? (
                              <div className="flex items-center gap-2 text-rose-500">
                                <Calendar className="h-3 w-3" />
                                <span className="text-[10px] font-bold uppercase tracking-wider">Due: {format(new Date(item.dueDate), 'MMM d, yyyy')}</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2 text-emerald-600">
                                <BookOpen className="h-3 w-3" />
                                <span className="text-[10px] font-bold uppercase tracking-wider">{item.type || 'Article'} shared</span>
                              </div>
                            )}
                            {item.url && (
                              <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-xs font-bold text-indigo-600 hover:underline flex items-center gap-1">
                                <Download className="h-3 w-3" /> View Source
                              </a>
                            )}
                         </div>
                       </div>
                    </div>
                  );
                })}
              
              {assignments.length === 0 && resources.length === 0 && (
                <div className="text-center py-20 grayscale opacity-40">
                  <MessageSquare className="h-12 w-12 mx-auto mb-4 text-slate-300" />
                  <p className="text-sm font-medium text-slate-400">Your subject feeds are quiet for now.</p>
                </div>
              )}
            </div>
          </section>

          <section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-900 flex items-center gap-3">
                <div className="p-2 bg-indigo-50 rounded-lg">
                  <Upload className="h-5 w-5 text-indigo-600" />
                </div>
                Assignment Vault
              </h3>
              <button className="inline-flex items-center px-4 py-2 bg-slate-50 text-indigo-600 rounded-xl text-xs font-bold border border-indigo-100 hover:bg-indigo-50 transition-all active:scale-95">
                Upload New
              </button>
            </div>
            <div className="p-6">
              {documents.length === 0 ? (
                <div className="text-center py-12">
                   <div className="bg-slate-50 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4">
                      <FileText className="h-6 w-6 text-slate-300" />
                   </div>
                   <p className="text-slate-400 font-medium text-sm">No documents found in your vault.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {documents.map(doc => (
                    <div key={doc.id} className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-white hover:border-indigo-100 hover:shadow-sm transition-all group flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-white rounded-lg border border-slate-100 group-hover:border-indigo-50 transition-colors">
                          <FileText className="h-5 w-5 text-slate-400 group-hover:text-indigo-500" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-900 leading-none">{doc.name}</p>
                          <p className="text-[10px] font-medium text-slate-400 mt-1 uppercase tracking-tighter">
                            {doc.type} • {format(new Date(doc.uploadedAt?.toDate?.() || doc.uploadedAt), 'MMM d')}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <button className="p-2 text-slate-300 hover:text-indigo-600 transition-colors active:scale-95"><Download className="h-4 w-4" /></button>
                        <button className="p-2 text-slate-300 hover:text-rose-600 transition-colors active:scale-95"><Trash2 className="h-4 w-4" /></button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        </div>

        <div className="space-y-8">
          <section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-100">
              <h3 className="font-bold text-slate-900">Recent Attendance</h3>
            </div>
            <div className="p-6">
              {attendance.length === 0 ? (
                <p className="text-center text-slate-400 py-4 text-sm font-medium italic">No attendance records recorded yet.</p>
              ) : (
                <div className="space-y-4">
                  {attendance.slice(0, 7).map((record, idx) => (
                    <div key={idx} className="flex items-center justify-between group">
                      <div className="flex items-center gap-3">
                         <div className={cn("w-2 h-2 rounded-full", record.status === 'present' ? "bg-emerald-500" : "bg-rose-500")} />
                         <span className="text-sm font-medium text-slate-600 group-hover:text-slate-900 transition-colors">
                           {format(new Date(record.date), 'MMMM d, yyyy')}
                         </span>
                      </div>
                      <span className={cn(
                        "px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-tight",
                        record.status === 'present' 
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-100" 
                          : "bg-rose-50 text-rose-700 border border-rose-100"
                      )}>
                        {record.status}
                      </span>
                    </div>
                  ))}
                  <button className="w-full py-2.5 text-xs font-bold text-indigo-600 hover:text-indigo-700 hover:bg-slate-50 rounded-xl transition-all border border-transparent hover:border-slate-100 mt-2">
                    View Full Calendar
                  </button>
                </div>
              )}
            </div>
          </section>

          <section className="bg-indigo-600 rounded-3xl shadow-xl shadow-indigo-200 p-8 text-white relative overflow-hidden group">
            <div className="absolute -top-12 -right-12 w-48 h-48 bg-white/10 rounded-full blur-3xl group-hover:scale-125 transition-transform duration-700" />
            <div className="relative z-10">
              <div className="flex items-center gap-4 mb-8">
                <div className="bg-white/20 p-3 rounded-2xl backdrop-blur-sm shadow-inner">
                  <UserIcon className="h-8 w-8 text-white" />
                </div>
                <div>
                  <h4 className="text-xl font-bold tracking-tight">{profile?.name}</h4>
                  <p className="text-indigo-200 text-xs font-bold uppercase tracking-widest mt-0.5">{profile?.regNo}</p>
                </div>
              </div>
              <div className="space-y-4">
                {[
                  { label: 'Department', val: profile?.department },
                  { label: 'Current Year', val: `${profile?.year} Year` },
                  { label: 'Assigned Section', val: `Section ${profile?.section}` },
                ].map((item, i) => (
                  <div key={i} className="flex flex-col gap-1">
                    <span className="text-[10px] font-bold text-indigo-200 uppercase tracking-widest">{item.label}</span>
                    <span className="font-bold text-sm tracking-wide">{item.val}</span>
                  </div>
                ))}
              </div>
              <button className="w-full mt-8 py-3 bg-white text-indigo-600 rounded-xl text-xs font-bold shadow-lg hover:shadow-xl transition-all active:scale-95">
                View Detailed Profile
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
