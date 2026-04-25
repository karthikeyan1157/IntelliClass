import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../lib/firebase';
import { collection, query, where, getDocs, doc, getDoc, orderBy } from 'firebase/firestore';
import { GraduationCap, Users, School, Eye, Search, BarChart3, Filter, Loader2, ArrowRight, BookOpen, Layers, Bell, Pencil, X, Save, Trash2 } from 'lucide-react';
import { AttendanceRecord, Announcement } from '../../types';
import BulletinBoard from '../shared/BulletinBoard';
import StudentAnalytics from './StudentAnalytics';
import { cn } from '../../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { broadcastNotificationToDept } from '../../lib/notificationService';
import { toast } from 'react-hot-toast';
import { updateDoc, setDoc, serverTimestamp } from 'firebase/firestore';

export default function HodDashboard() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [faculty, setFaculty] = useState<any[]>([]);
  const [allStudents, setAllStudents] = useState<any[]>([]);
  const [classrooms, setClassrooms] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewedYear, setViewedYear] = useState<string>('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [showAnnouncementForm, setShowAnnouncementForm] = useState(false);
  const [newAnnouncement, setNewAnnouncement] = useState({ title: '', content: '', category: 'general', targetRole: 'all' as any });

  const [editingStudent, setEditingStudent] = useState<any | null>(null);
  const [editFormData, setEditFormData] = useState({
    name: '',
    regNo: '',
    year: '',
    section: '',
    department: '',
    classroomId: ''
  });
  const [updating, setUpdating] = useState(false);

  const startEditing = (student: any) => {
    setEditingStudent(student);
    setEditFormData({
      name: student.name || '',
      regNo: student.regNo || '',
      year: student.year || 'I',
      section: student.section || 'A',
      department: student.department || profile?.department || '',
      classroomId: student.classroomId || ''
    });
  };

  const handleUpdateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent) return;
    
    setUpdating(true);
    try {
      const profileRef = doc(db, 'users', editingStudent.uid, 'profiles', 'main');
      await updateDoc(profileRef, {
        ...editFormData,
        updatedAt: serverTimestamp()
      });
      
      // Update local state
      setAllStudents(allStudents.map(s => s.uid === editingStudent.uid ? { ...s, ...editFormData } : s));
      toast.success('Student record updated successfully');
      setEditingStudent(null);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteStudent = async (uid: string) => {
    if (!window.confirm('Are you sure you want to delete this student profile? This action is permanent.')) return;
    
    try {
      const { deleteDoc } = await import('firebase/firestore');
      await deleteDoc(doc(db, 'users', uid, 'profiles', 'main'));
      // Note: We usually don't delete the user auth/root doc here for safety
      setAllStudents(allStudents.filter(s => s.uid !== uid));
      toast.success('Student profile removed');
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handlePostAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    try {
      const { setDoc, serverTimestamp } = await import('firebase/firestore');
      await setDoc(doc(collection(db, 'announcements')), {
        ...newAnnouncement,
        author: profile?.name || user.email,
        authorRole: 'hod',
        targetDept: profile?.department,
        createdAt: serverTimestamp(),
      });
      
      // Trigger Notification
      await broadcastNotificationToDept(
        profile?.department,
        {
          title: `Dept Notice: ${newAnnouncement.title}`,
          message: `${profile?.name} (HOD) posted a new department update.`,
          type: 'announcement',
          senderName: profile?.name,
          senderRole: 'HOD'
        },
        newAnnouncement.targetRole === 'all' ? 'student' : newAnnouncement.targetRole
      );
      
      // If target is all, also notify faculty (broadcaster currently only does one role)
      if (newAnnouncement.targetRole === 'all' || newAnnouncement.targetRole === 'faculty') {
        await broadcastNotificationToDept(
          profile?.department,
          {
            title: `Dept Notice: ${newAnnouncement.title}`,
            message: `${profile?.name} (HOD) posted a new department update.`,
            type: 'announcement',
            senderName: profile?.name,
            senderRole: 'HOD'
          },
          'faculty'
        );
      }

      const { toast } = await import('react-hot-toast');
      toast.success('Department announcement posted');
      setShowAnnouncementForm(false);
      setNewAnnouncement({ title: '', content: '', category: 'general', targetRole: 'all' });
    } catch (error: any) {
      const { toast } = await import('react-hot-toast');
      toast.error(error.message);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      
      try {
        const profileDoc = await getDoc(doc(db, 'users', user.uid, 'profiles', 'main'));
        const prof = profileDoc.data();
        setProfile(prof);

        if (prof) {
          // 1. Fetch Classrooms in dept
          const classroomsQuery = query(collection(db, 'classrooms'), where('department', '==', prof.department));
          const classroomSnapshot = await getDocs(classroomsQuery);
          setClassrooms(classroomSnapshot.docs.map(d => ({ id: d.id, ...d.data() })));

          // 2. Fetch Courses in dept
          const coursesQuery = query(collection(db, 'courses'), where('department', '==', prof.department));
          const courseSnapshot = await getDocs(coursesQuery);
          setCourses(courseSnapshot.docs.map(d => ({ id: d.id, ...d.data() })));

          // 3. Fetch all users in the same department
          const usersQuery = query(collection(db, 'users'));
          const snapshot = await getDocs(usersQuery);
          
          const facultyList: any[] = [];
          const studentList: any[] = [];
          
          for(const uDoc of snapshot.docs) {
             const pDoc = await getDoc(doc(db, 'users', uDoc.id, 'profiles', 'main'));
             if (pDoc.exists()) {
                const data = pDoc.data();
                if (data.department === prof.department) {
                  if (uDoc.data().role === 'faculty') {
                    facultyList.push({ uid: uDoc.id, ...data });
                  } else if (uDoc.data().role === 'student') {
                    studentList.push({ uid: uDoc.id, ...data });
                  }
                }
             }
          }
          setFaculty(facultyList);
          setAllStudents(studentList);
        }
      } catch (err) {
        console.error("HOD Fetch Error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user]);

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin h-8 w-8 text-indigo-600" /></div>;

  const filteredStudents = allStudents.filter(s => 
    (viewedYear === 'All' || s.year === viewedYear) &&
    (s.name.toLowerCase().includes(searchTerm.toLowerCase()) || s.regNo.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <GraduationCap className="h-5 w-5 text-indigo-600" />
            <span className="text-xs font-bold text-indigo-600 uppercase tracking-widest">Department Head Office</span>
          </div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight leading-tight">
            {profile?.department} <span className="text-slate-400 font-light">Panel</span>
          </h1>
          <p className="text-slate-500 font-medium text-sm mt-1">Administrator: {profile?.name}</p>
        </div>
        <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
           {['All', 'I', 'II', 'III', 'IV'].map(year => (
             <button
               key={year}
               onClick={() => setViewedYear(year)}
               className={cn(
                 "px-5 py-2 rounded-lg text-xs font-bold transition-all active:scale-95",
                 viewedYear === year 
                  ? "bg-white text-indigo-600 shadow-sm border border-slate-200" 
                  : "text-slate-500 hover:text-slate-700 hover:bg-white/50"
               )}
             >
               {year === 'All' ? 'All Years' : `${year} Yr`}
             </button>
           ))}
        </div>
        <button 
          onClick={() => setShowAnnouncementForm(!showAnnouncementForm)}
          className="inline-flex items-center px-6 py-3 bg-indigo-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-95"
        >
          <Bell className="h-4 w-4 mr-2" />
          Broadcast Notice
        </button>
      </header>

      {showAnnouncementForm && (
        <div className="bg-white p-8 rounded-2xl shadow-xl shadow-slate-200 border border-slate-200 transition-all animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-indigo-50 rounded-lg">
              <Bell className="h-5 w-5 text-indigo-600" />
            </div>
            <h3 className="font-bold text-lg text-slate-900">New Department Notice</h3>
          </div>
          <form onSubmit={handlePostAnnouncement} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Title</label>
                <input 
                  placeholder="e.g. SEM End Exams" 
                  className="w-full bg-slate-50 border-slate-200 rounded-xl py-2.5 px-4 text-sm focus:bg-white focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 transition-all"
                  value={newAnnouncement.title}
                  onChange={e => setNewAnnouncement({...newAnnouncement, title: e.target.value})}
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Target Audience</label>
                <select 
                  className="w-full bg-slate-50 border-slate-200 rounded-xl py-2.5 px-4 text-sm focus:bg-white focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 transition-all"
                  value={newAnnouncement.targetRole}
                  onChange={e => setNewAnnouncement({...newAnnouncement, targetRole: e.target.value as any})}
                >
                  <option value="all">Everyone in {profile?.department}</option>
                  <option value="student">Students Only</option>
                  <option value="faculty">Faculty Only</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Notice Content</label>
              <textarea 
                placeholder="Type your message here..." 
                rows={4} 
                className="w-full bg-slate-50 border-slate-200 rounded-xl py-3 px-4 text-sm focus:bg-white focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 transition-all resize-none"
                value={newAnnouncement.content}
                onChange={e => setNewAnnouncement({...newAnnouncement, content: e.target.value})}
                required
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button 
                type="button" 
                onClick={() => setShowAnnouncementForm(false)}
                className="px-6 py-2.5 text-sm font-bold text-slate-500 hover:text-slate-700 transition-colors"
              >
                Cancel
              </button>
              <button 
                type="submit"
                className="px-8 py-2.5 bg-indigo-600 text-white text-sm font-bold rounded-xl shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-95"
              >
                Send Notice
              </button>
            </div>
          </form>
        </div>
      )}

          {/* Overview Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[
              { label: 'Total Faculty', val: faculty.length, icon: School, color: 'indigo' },
              { label: 'Total Students', val: allStudents.length, icon: Users, color: 'blue' },
              { label: 'Classrooms', val: classrooms.length, icon: Layers, color: 'emerald' },
              { label: 'Total Courses', val: courses.length, icon: BookOpen, color: 'rose' },
            ].map((stat, i) => (
              <div key={i} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm group hover:border-indigo-100 transition-all hover:shadow-md">
                <div className="flex items-center justify-between uppercase tracking-tighter">
                  <span className="text-[10px] font-bold text-slate-400">{stat.label}</span>
                  <div className={cn("p-2 rounded-lg transition-transform group-hover:scale-110 duration-300", 
                    stat.color === 'indigo' ? "bg-indigo-50 text-indigo-600" :
                    stat.color === 'blue' ? "bg-blue-50 text-blue-600" :
                    stat.color === 'emerald' ? "bg-emerald-50 text-emerald-600" :
                    "bg-rose-50 text-rose-600"
                  )}>
                    <stat.icon className="h-4 w-4" />
                  </div>
                </div>
                <p className="text-3xl font-bold mt-2 text-slate-900">{stat.val}</p>
              </div>
            ))}
          </div>

          <StudentAnalytics students={allStudents} departmentName={profile?.department || ''} viewedYear={viewedYear} />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Classroom Oversight */}
            <section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
               <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
                 <Layers className="h-4 w-4 text-emerald-600" />
                 <h3 className="text-sm font-bold text-slate-800">Classroom Management</h3>
               </div>
               <div className="p-4 space-y-3">
                 {classrooms.map(cls => (
                   <div key={cls.id} className="p-4 rounded-xl border border-slate-100 flex items-center justify-between hover:bg-slate-50 transition-colors">
                     <div>
                       <p className="text-sm font-bold text-slate-800">{cls.name}</p>
                       <p className="text-[10px] text-slate-400 font-medium mt-0.5">Advisor ID: {cls.advisorId}</p>
                     </div>
                     <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                       Active Monitoring
                     </span>
                   </div>
                 ))}
                 {classrooms.length === 0 && <p className="text-xs text-slate-400 italic text-center py-6">No classrooms defined for this department.</p>}
               </div>
            </section>

            {/* Course Oversight */}
            <section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
               <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
                 <BookOpen className="h-4 w-4 text-rose-600" />
                 <h3 className="text-sm font-bold text-slate-800">Course Portfolio</h3>
               </div>
               <div className="p-4 space-y-3">
                 {courses.map(course => (
                   <div key={course.id} className="p-4 rounded-xl border border-slate-100 flex items-center justify-between hover:bg-slate-50 transition-colors">
                     <div>
                       <p className="text-sm font-bold text-slate-800">{course.name}</p>
                       <p className="text-[10px] text-slate-400 font-medium mt-0.5">{course.code} • {course.targetClass}</p>
                     </div>
                     <div className="text-right">
                        <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Faculty</p>
                        <p className="text-[10px] font-medium text-slate-400 truncate w-24">ID: {course.facultyId}</p>
                     </div>
                   </div>
                 ))}
                 {courses.length === 0 && <p className="text-xs text-slate-400 italic text-center py-6">No courses linked to this department.</p>}
               </div>
            </section>
          </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          {/* Faculty list */}
          <section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 flex items-center gap-3">
                <div className="p-2 bg-indigo-50 rounded-lg">
                  <School className="h-5 w-5 text-indigo-600" />
                </div>
                Department Faculty
              </h3>
            </div>
            <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {faculty.map(f => (
                <div key={f.uid} className="flex items-center justify-between p-4 rounded-xl border border-slate-100 hover:border-indigo-100 hover:bg-slate-50/50 transition-all group">
                  <div>
                    <p className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">{f.name}</p>
                    <p className="text-xs font-medium text-slate-500 mt-0.5">{f.advisorOfClass}</p>
                  </div>
                  <button className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all active:scale-90">
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              ))}
              {faculty.length === 0 && (
                <p className="text-sm text-slate-400 italic col-span-2 text-center py-4">No faculty members found.</p>
              )}
            </div>
          </section>

          {/* Student Monitor */}
          <section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <h3 className="font-bold text-slate-900 flex items-center gap-3">
                <div className="p-2 bg-indigo-50 rounded-lg">
                  <Users className="h-5 w-5 text-indigo-600" />
                </div>
                Student Monitor
              </h3>
              <div className="relative group">
                <Search className="h-4 w-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                <input 
                  placeholder="Search by ID or Name..." 
                  className="pl-10 pr-4 py-2 text-sm border-slate-200 bg-slate-50 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 transition-all w-full sm:w-64"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50/50 text-[11px] uppercase font-bold text-slate-400 tracking-widest border-b border-slate-100">
                   <tr>
                     <th className="px-6 py-4">Student</th>
                     <th className="px-6 py-4 text-center">Year/Sec</th>
                     <th className="px-6 py-4 text-center">Marks Index</th>
                     <th className="px-6 py-4 text-right">Actions</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-100">
                    {filteredStudents.map(student => (
                      <tr key={student.uid} className="hover:bg-slate-50/50 transition-colors group">
                        <td className="px-6 py-5">
                          <div className="flex flex-col">
                            <span className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">{student.name}</span>
                            <span className="text-xs font-medium text-slate-400 mt-1">{student.regNo}</span>
                          </div>
                        </td>
                        <td className="px-6 py-5 text-center">
                          <span className="text-[10px] font-bold px-2.5 py-1 bg-slate-100 text-slate-600 rounded-full border border-slate-200 uppercase tracking-tight">
                            {student.year} Year / {student.section}
                          </span>
                        </td>
                        <td className="px-6 py-5 text-center">
                          <div className="flex items-center justify-center gap-2">
                             <span className={cn("text-xs font-bold px-2 py-0.5 rounded", (student.internalMarks?.internal1 || 0) < 50 ? "text-rose-600 bg-rose-50" : "text-emerald-600 bg-emerald-50")}>
                               {student.internalMarks?.internal1 || '-'}
                             </span>
                             <span className="text-slate-300">/</span>
                             <span className={cn("text-xs font-bold px-2 py-0.5 rounded", (student.internalMarks?.internal2 || 0) < 50 ? "text-rose-600 bg-rose-50" : "text-emerald-600 bg-emerald-50")}>
                               {student.internalMarks?.internal2 || '-'}
                             </span>
                          </div>
                        </td>
                        <td className="px-6 py-5 text-right">
                          <div className="flex items-center justify-end gap-2">
                             <button 
                               onClick={() => startEditing(student)}
                               className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all active:scale-95"
                               title="Edit Record"
                             >
                               <Pencil className="h-4 w-4" />
                             </button>
                             <button 
                               className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all active:scale-95"
                               onClick={() => handleDeleteStudent(student.uid)}
                               title="Delete Record"
                             >
                               <Trash2 className="h-4 w-4" />
                             </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filteredStudents.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-6 py-12 text-center text-slate-400 italic">No student records found.</td>
                      </tr>
                    )}
                 </tbody>
              </table>
            </div>
          </section>
        </div>

        <div className="space-y-6">
           <section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-full">
             <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-50 rounded-lg">
                    <BarChart3 className="h-5 w-5 text-indigo-600" />
                  </div>
                  <h3 className="font-bold text-slate-900">Bulletin Board</h3>
                </div>
             </div>
             <div className="p-6 overflow-y-auto flex-1">
                <BulletinBoard targetDept={profile?.department} userRole="hod" />
             </div>
           </section>
        </div>
      </div>
      
      {/* Student Edit Modal */}
      <AnimatePresence>
        {editingStudent && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-xl rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-white">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-50 rounded-xl">
                    <Pencil className="h-5 w-5 text-indigo-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-900">Edit Student Record</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">UID: {editingStudent.uid}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setEditingStudent(null)}
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-full transition-all"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleUpdateStudent} className="p-8 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Full Name</label>
                    <input 
                      className="w-full bg-slate-50 border-slate-200 rounded-xl py-2.5 px-4 text-sm focus:bg-white focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 transition-all font-medium"
                      value={editFormData.name}
                      onChange={e => setEditFormData({...editFormData, name: e.target.value})}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Registration No</label>
                    <input 
                      className="w-full bg-slate-50 border-slate-200 rounded-xl py-2.5 px-4 text-sm focus:bg-white focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 transition-all font-bold"
                      value={editFormData.regNo}
                      onChange={e => setEditFormData({...editFormData, regNo: e.target.value})}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Academic Year</label>
                    <select 
                      className="w-full bg-slate-50 border-slate-200 rounded-xl py-2.5 px-4 text-sm focus:bg-white focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 transition-all font-bold"
                      value={editFormData.year}
                      onChange={e => setEditFormData({...editFormData, year: e.target.value})}
                    >
                      <option value="I">I Year</option>
                      <option value="II">II Year</option>
                      <option value="III">III Year</option>
                      <option value="IV">IV Year</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Section</label>
                    <input 
                      className="w-full bg-slate-50 border-slate-200 rounded-xl py-2.5 px-4 text-sm focus:bg-white focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 transition-all font-bold"
                      value={editFormData.section}
                      onChange={e => setEditFormData({...editFormData, section: e.target.value})}
                      placeholder="e.g. A"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Assigned Classroom (ERP Link)</label>
                    <select 
                      className="w-full bg-slate-50 border-slate-200 rounded-xl py-2.5 px-4 text-sm focus:bg-white focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 transition-all font-bold"
                      value={editFormData.classroomId}
                      onChange={e => setEditFormData({...editFormData, classroomId: e.target.value})}
                    >
                      <option value="">Unassigned</option>
                      {classrooms.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Department</label>
                    <input 
                      className="w-full bg-slate-50 border-slate-100 rounded-xl py-2.5 px-4 text-sm font-bold text-slate-400 cursor-not-allowed"
                      value={editFormData.department}
                      disabled
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button 
                    type="button"
                    onClick={() => setEditingStudent(null)}
                    className="flex-1 px-6 py-3 border border-slate-200 text-slate-600 rounded-xl text-sm font-bold hover:bg-slate-50 transition-all"
                  >
                    Discard
                  </button>
                  <button 
                    type="submit"
                    disabled={updating}
                    className="flex-[2] px-6 py-3 bg-indigo-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {updating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    Save ERP Record
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
