import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../lib/firebase';
import { collection, query, where, getDocs, doc, getDoc, setDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { Users, Calendar, ClipboardCheck, Plus, Search, Loader2, Save, MessageSquare, BookOpen, FilePlus, UploadCloud, Info, Send, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'react-hot-toast';
import { cn } from '../../lib/utils';
import BulletinBoard from '../shared/BulletinBoard';
import { sendNotification, broadcastNotificationToDept, broadcastNotificationToClass } from '../../lib/notificationService';
import { BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, Cell } from 'recharts';
import { Download, PieChart, Star, HelpCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function FacultyDashboard() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [resources, setResources] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [markingAttendance, setMarkingAttendance] = useState(false);
  const [attendanceData, setAttendanceData] = useState<Record<string, { status: 'present' | 'absent', reason: string }>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [showAnnouncementForm, setShowAnnouncementForm] = useState(false);
  const [newAnnouncement, setNewAnnouncement] = useState({ title: '', content: '', category: 'general', targetClass: '' });
  
  const [activeCourseTab, setActiveCourseTab] = useState<string | null>(null);
  const [showAssignmentForm, setShowAssignmentForm] = useState(false);
  const [showResourceForm, setShowResourceForm] = useState(false);
  const [newAssignment, setNewAssignment] = useState({ title: '', description: '', dueDate: '', classroomId: '', attachmentUrl: '', attachmentType: '' });
  const [newResource, setNewResource] = useState({ title: '', type: 'pdf', url: '', attachmentUrl: '' });
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  
  const [selectedStudent, setSelectedStudent] = useState<any | null>(null);
  const [studentFeedback, setStudentFeedback] = useState<any[]>([]);
  const [newFeedback, setNewFeedback] = useState({ content: '', category: 'academic' as any });
  const [loadingFeedback, setLoadingFeedback] = useState(false);
  const [viewMode, setViewMode] = useState<'my-students' | 'department'>('my-students');

  const [advisorQuestions, setAdvisorQuestions] = useState<any[]>([]);
  const [showQuestionForm, setShowQuestionForm] = useState(false);
  const [newQuestionText, setNewQuestionText] = useState('');
  const [selectedQuestion, setSelectedQuestion] = useState<any | null>(null);
  const [questionResponses, setQuestionResponses] = useState<any[]>([]);
  const [loadingResponses, setLoadingResponses] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      
      try {
        const profileDoc = await getDoc(doc(db, 'users', user.uid, 'profiles', 'main'));
        const prof = profileDoc.data();
        
        if (prof) {
          setProfile(prof);
          
          // 1. Fetch Courses taught by this faculty
          const coursesQuery = query(
            collection(db, 'courses'),
            where('facultyId', '==', user.uid)
          );
          const courseSnapshot = await getDocs(coursesQuery);
          const courseList = courseSnapshot.docs.map(d => ({ id: d.id, ...d.data() }));
          setCourses(courseList);
          if (courseList.length > 0) setActiveCourseTab(courseList[0].id);

          // 2. Fetch Assignments
          const assignmentsQuery = query(
            collection(db, 'assignments'),
            where('facultyId', '==', user.uid)
          );
          const assignmentSnapshot = await getDocs(assignmentsQuery);
          setAssignments(assignmentSnapshot.docs.map(d => ({ id: d.id, ...d.data() })));

          // 3. Fetch Resources
          const resourcesQuery = query(
            collection(db, 'resources'),
            where('facultyId', '==', user.uid)
          );
          const resourceSnapshot = await getDocs(resourcesQuery);
          setResources(resourceSnapshot.docs.map(d => ({ id: d.id, ...d.data() })));

          // 4. Fetch Students
          const studentsQuery = query(
            collection(db, 'users'),
            where('role', '==', 'student')
          );
          const snapshot = await getDocs(studentsQuery);
          const studentList = [];
          
          for(const studentDoc of snapshot.docs) {
             const studentProfileDoc = await getDoc(doc(db, 'users', studentDoc.id, 'profiles', 'main'));
             if (studentProfileDoc.exists()) {
                const sp = studentProfileDoc.data();
                const isAdvisorMatch = sp.year + " Year Section " + sp.section === prof.advisorOfClass;
                const isDeptMatch = sp.department === prof.department;
                const isCourseMatch = courseList.some((c: any) => c.targetClass === `${sp.year} Year Sec ${sp.section}`);

                if (isAdvisorMatch || isDeptMatch || isCourseMatch) {
                  studentList.push({ 
                    uid: studentDoc.id, 
                    email: studentDoc.data().email,
                    ...sp 
                  });
                }
             }
          }
          setStudents(studentList);

          // 5. Fetch Advisor Questions (for this faculty)
          const questionsQuery = query(
            collection(db, 'advisor_questions'),
            where('facultyId', '==', user.uid)
          );
          const questionSnapshot = await getDocs(questionsQuery);
          setAdvisorQuestions(questionSnapshot.docs.map(d => ({ id: d.id, ...d.data() })));
        }
      } catch (err) {
        console.error("Error fetching faculty data:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate size (Firestore document limit is 1MB total; keeping attachments small for direct storage)
    if (file.size > 800000) { // ~800KB limit for reliability
      toast.error('File too large. Please use a link for files over 800KB.');
      return;
    }

    setIsUploading(true);
    try {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        
        // Auto-detect type
        let type = 'doc';
        if (file.type.includes('pdf')) type = 'pdf';
        else if (file.type.includes('image')) type = 'image';
        else if (file.type.includes('sheet') || file.type.includes('excel')) type = 'excel';
        else if (file.type.includes('word') || file.name.endsWith('.doc') || file.name.endsWith('.docx')) type = 'doc';

        setNewAssignment(prev => ({
          ...prev,
          attachmentUrl: base64String,
          attachmentType: type
        }));
        toast.success(`File "${file.name}" attached successfully`);
        setIsUploading(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      toast.error('Failed to process file');
      setIsUploading(false);
    }
  };

  const handlePostAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !activeCourseTab) return;
    try {
      const course = courses.find(c => c.id === activeCourseTab);
      const assignmentData = {
        ...newAssignment,
        courseId: activeCourseTab,
        classroomId: course?.targetClass || 'General',
        facultyId: user.uid,
        createdAt: serverTimestamp(),
      };
      const docRef = doc(collection(db, 'assignments'));
      await setDoc(docRef, assignmentData);
      setAssignments([{ id: docRef.id, ...assignmentData }, ...assignments]);
      
      // Trigger Notification
      if (course?.targetClass) {
        const [year, , , section] = course.targetClass.split(' ');
        await broadcastNotificationToClass(year, section, profile?.department, {
          title: 'New Assignment Assigned',
          message: `${profile?.name} posted: ${newAssignment.title} for ${course.name}`,
          type: 'assignment',
          senderName: profile?.name,
          senderRole: 'Faculty'
        });
      }

      toast.success('Assignment assigned');
      setShowAssignmentForm(false);
      setNewAssignment({ title: '', description: '', dueDate: '', classroomId: '', attachmentUrl: '', attachmentType: '' });
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handlePostResource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !activeCourseTab) return;
    try {
      const resourceData = {
        ...newResource,
        courseId: activeCourseTab,
        facultyId: user.uid,
        createdAt: serverTimestamp(),
      };
      const docRef = doc(collection(db, 'resources'));
      await setDoc(docRef, resourceData);
      setResources([{ id: docRef.id, ...resourceData }, ...resources]);
      toast.success('Resource shared');
      setShowResourceForm(false);
      setNewResource({ title: '', type: 'pdf', url: '', attachmentUrl: '' });
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handlePostFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedStudent) return;
    try {
      const feedbackData = {
        content: newFeedback.content,
        category: newFeedback.category,
        facultyId: user.uid,
        facultyName: profile?.name || user.email,
        createdAt: serverTimestamp(),
      };
      const docRef = doc(collection(db, 'users', selectedStudent.uid, 'feedback'));
      await setDoc(docRef, feedbackData);
      setStudentFeedback([{ id: docRef.id, ...feedbackData }, ...studentFeedback]);
      
      // Trigger Notification
      await sendNotification({
        userId: selectedStudent.uid,
        title: 'New Feedback Received',
        message: `${profile?.name} added feedback on your ${newFeedback.category} performance.`,
        type: 'feedback',
        senderName: profile?.name,
        senderRole: 'Faculty'
      });

      toast.success('Feedback added');
      setNewFeedback({ content: '', category: 'academic' });
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const openStudentModal = async (student: any) => {
    setSelectedStudent(student);
    setLoadingFeedback(true);
    try {
      const feedbackQuery = query(
        collection(db, 'users', student.uid, 'feedback')
      );
      const snapshot = await getDocs(feedbackQuery);
      setStudentFeedback(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (error) {
      console.error("Feedback error:", error);
    } finally {
      setLoadingFeedback(false);
    }
  };

  const handlePostAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    try {
      await setDoc(doc(collection(db, 'announcements')), {
        ...newAnnouncement,
        author: profile?.name || user.email,
        authorRole: 'faculty',
        targetDept: profile?.department,
        targetRole: 'student',
        createdAt: serverTimestamp(),
      });

      // Trigger Notification
      if (newAnnouncement.targetClass) {
        const [year, , , section] = newAnnouncement.targetClass.split(' ');
        await broadcastNotificationToClass(year, section, profile?.department, {
          title: 'New Announcement',
          message: `${profile?.name}: ${newAnnouncement.title}`,
          type: 'announcement',
          senderName: profile?.name,
          senderRole: 'Faculty'
        });
      } else {
        await broadcastNotificationToDept(profile?.department, {
          title: 'Department Announcement',
          message: `${profile?.name}: ${newAnnouncement.title}`,
          type: 'announcement',
          senderName: profile?.name,
          senderRole: 'Faculty'
        });
      }

      toast.success('Announcement posted');
      setShowAnnouncementForm(false);
      setNewAnnouncement({ title: '', content: '', category: 'general', targetClass: '' });
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const submitAttendance = async () => {
    setMarkingAttendance(true);
    const today = format(new Date(), 'yyyy-MM-dd');
    try {
      for (const studentUid of Object.keys(attendanceData)) {
        const record = attendanceData[studentUid];
        await setDoc(doc(db, 'users', studentUid, 'attendance', today), {
          date: today,
          status: record.status,
          reason: record.reason || '',
          markedBy: profile?.name || user?.email,
          createdAt: serverTimestamp(),
        });
      }
      toast.success('Attendance records saved successfully');
      setAttendanceData({});
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setMarkingAttendance(false);
    }
  };

  const updateMarks = async (studentUid: string, type: 'internal1' | 'internal2', value: number) => {
    try {
      const profileRef = doc(db, 'users', studentUid, 'profiles', 'main');
      await updateDoc(profileRef, {
        [`internalMarks.${type}`]: value
      });
      
      // Trigger Notification
      await sendNotification({
        userId: studentUid,
        title: 'Marks Updated',
        message: `Your ${type === 'internal1' ? 'Internal 1' : 'Internal 2'} marks have been updated to ${value}.`,
        type: 'grade',
        senderName: profile?.name,
        senderRole: 'Faculty'
      });

      toast.success('Marks updated');
      setStudents(students.map(s => s.uid === studentUid ? {
        ...s, 
        internalMarks: { ...s.internalMarks, [type]: value }
      } : s));
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleCreateQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newQuestionText) return;
    try {
      const qData = {
        text: newQuestionText,
        facultyId: user.uid,
        facultyName: profile?.name || user.email,
        targetClass: profile?.advisorOfClass || 'All',
        active: true,
        createdAt: serverTimestamp(),
      };
      const docRef = doc(collection(db, 'advisor_questions'));
      await setDoc(docRef, qData);
      setAdvisorQuestions([{ id: docRef.id, ...qData, createdAt: { toDate: () => new Date() } }, ...advisorQuestions]);
      setNewQuestionText('');
      setShowQuestionForm(false);
      toast.success('Survey question published to your class');
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const loadResponses = async (questionId: string) => {
    setLoadingResponses(true);
    setSelectedQuestion(advisorQuestions.find(a => a.id === questionId));
    try {
      const q = query(collection(db, 'advisor_questions', questionId, 'responses'));
      const snapshot = await getDocs(q);
      const resps = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setQuestionResponses(resps);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoadingResponses(false);
    }
  };

  const exportFeedback = () => {
    if (!selectedQuestion || questionResponses.length === 0) return;
    
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Student,Rating,Comment,Date\n";
    
    questionResponses.forEach(r => {
      const student = students.find(s => s.uid === r.studentId);
      const date = r.createdAt?.toDate ? format(r.createdAt.toDate(), 'yyyy-MM-dd') : '';
      csvContent += `${student?.name || r.studentId},${r.rating},"${r.comment || ''}",${date}\n`;
    });
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `feedback_${selectedQuestion.text.slice(0, 20)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin h-8 w-8 text-indigo-600" /></div>;
  
  const getHistogramData = () => {
    const bins = Array(10).fill(0).map((_, i) => ({ rating: i + 1, count: 0 }));
    questionResponses.forEach(r => {
      const rating = Math.round(r.rating);
      if (rating >= 1 && rating <= 10) {
        bins[rating - 1].count++;
      }
    });
    return bins;
  };

  const chartColors = ['#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16', '#22c55e', '#10b981', '#06b6d4', '#3b82f6', '#6366f1'];

  const filteredStudents = students.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.regNo.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <>
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-8">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Faculty Dashboard</h1>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100">
              {profile?.name}
            </span>
            <span className="text-slate-400">•</span>
            <span className="text-sm font-medium text-slate-500">{profile?.department} Department</span>
            <span className="text-slate-400">•</span>
            <span className="text-sm font-medium text-slate-500">Advisor: {profile?.advisorOfClass}</span>
          </div>
        </div>
        <button 
          onClick={() => setShowAnnouncementForm(!showAnnouncementForm)}
          className="inline-flex items-center px-6 py-3 bg-indigo-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-95"
        >
          <Plus className="h-4 w-4 mr-2" />
          Post Announcement
        </button>
      </header>

      {showAnnouncementForm && (
        <div className="bg-white p-8 rounded-2xl shadow-xl shadow-slate-200 border border-slate-200 transition-all animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-indigo-50 rounded-lg">
              <MessageSquare className="h-5 w-5 text-indigo-600" />
            </div>
            <h3 className="font-bold text-lg text-slate-900">New Announcement</h3>
          </div>
          <form onSubmit={handlePostAnnouncement} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Title</label>
                <input 
                  placeholder="e.g. Internal Exam Schedule" 
                  className="w-full bg-slate-50 border-slate-200 rounded-xl py-2.5 px-4 text-sm focus:bg-white focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 transition-all"
                  value={newAnnouncement.title}
                  onChange={e => setNewAnnouncement({...newAnnouncement, title: e.target.value})}
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Category</label>
                <select 
                  className="w-full bg-slate-50 border-slate-200 rounded-xl py-2.5 px-4 text-sm focus:bg-white focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 transition-all"
                  value={newAnnouncement.category}
                  onChange={e => setNewAnnouncement({...newAnnouncement, category: e.target.value as any})}
                >
                  <option value="general">General</option>
                  <option value="fee">Fee Details</option>
                  <option value="bus">Bus Route</option>
                  <option value="exam">Exam Update</option>
                  <option value="event">Campus Event</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Target Class</label>
                <select 
                  className="w-full bg-slate-50 border-slate-200 rounded-xl py-2.5 px-4 text-sm focus:bg-white focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 transition-all"
                  value={newAnnouncement.targetClass}
                  onChange={e => setNewAnnouncement({...newAnnouncement, targetClass: e.target.value})}
                >
                  <option value="">All Students (Dept)</option>
                  {profile?.advisorOfClass && (
                    <option value={profile.advisorOfClass}>My Advisor Class ({profile.advisorOfClass})</option>
                  )}
                  {courses.map(c => (
                    <option key={c.id} value={c.targetClass}>{c.name} ({c.targetClass})</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Announcement Content</label>
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
                Post Now
              </button>
            </div>
          </form>
        </div>
      )}

      {courses.length > 0 && (
        <section className="bg-white rounded-2xl shadow-xl shadow-slate-200 border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between gap-4 flex-wrap">
            <h3 className="font-bold text-slate-900 flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-indigo-600" />
              Classroom & Subject Management
            </h3>
            <div className="flex gap-2 flex-wrap">
              {courses.map(c => (
                <button
                  key={c.id}
                  onClick={() => setActiveCourseTab(c.id)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                    activeCourseTab === c.id 
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-100" 
                      : "bg-white text-slate-500 hover:bg-slate-100 border border-slate-200"
                  )}
                >
                  {c.code}
                </button>
              ))}
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-100">
            {/* Subject Feed (WhatsApp style) */}
            <div className="md:col-span-2 p-6 bg-slate-50/30">
              <div className="flex items-center justify-between mb-6">
                <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-indigo-500" />
                  Subject Activity Feed
                </h4>
                <div className="flex gap-2">
                  <button 
                    onClick={() => setShowAssignmentForm(!showAssignmentForm)}
                    className="p-2 bg-indigo-100 text-indigo-600 rounded-lg hover:bg-indigo-200 transition-colors"
                  >
                    <FilePlus className="h-4 w-4" />
                  </button>
                  <button 
                    onClick={() => setShowResourceForm(!showResourceForm)}
                    className="p-2 bg-emerald-100 text-emerald-600 rounded-lg hover:bg-emerald-200 transition-colors"
                  >
                    <UploadCloud className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Forms */}
              <div className="space-y-4">
                {showAssignmentForm && (
                  <div className="p-4 bg-white rounded-xl border border-indigo-100 shadow-sm animate-in zoom-in-95 duration-200">
                    <form onSubmit={handlePostAssignment} className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <input 
                          placeholder="Assignment Title"
                          className="w-full bg-slate-50 border-slate-100 rounded-lg py-2 px-3 text-sm focus:ring-2 focus:ring-indigo-500"
                          value={newAssignment.title}
                          onChange={e => setNewAssignment({...newAssignment, title: e.target.value})}
                          required
                        />
                        <input 
                          type="date"
                          className="w-full bg-slate-50 border-slate-100 rounded-lg py-2 px-3 text-sm focus:ring-2 focus:ring-indigo-500"
                          value={newAssignment.dueDate}
                          onChange={e => setNewAssignment({...newAssignment, dueDate: e.target.value})}
                          required
                        />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="relative group">
                          <input 
                            type="file"
                            ref={fileInputRef}
                            className="hidden"
                            onChange={handleFileChange}
                            accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
                          />
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className={cn(
                              "w-full flex items-center justify-center gap-2 py-2 px-3 text-sm font-bold rounded-lg border-2 border-dashed transition-all",
                              newAssignment.attachmentUrl 
                                ? "bg-indigo-50 border-indigo-200 text-indigo-600" 
                                : "bg-slate-50 border-slate-200 text-slate-500 hover:border-indigo-300 hover:text-indigo-600"
                            )}
                          >
                            {isUploading ? (
                              <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Processing...
                              </>
                            ) : newAssignment.attachmentUrl ? (
                              <>
                                <ClipboardCheck className="h-4 w-4" />
                                File Attached
                              </>
                            ) : (
                              <>
                                <UploadCloud className="h-4 w-4" />
                                Upload Resource
                              </>
                            )}
                          </button>
                        </div>
                        <select 
                          className="w-full bg-slate-50 border-slate-100 rounded-lg py-2 px-3 text-sm focus:ring-2 focus:ring-indigo-500"
                          value={newAssignment.attachmentType}
                          onChange={e => setNewAssignment({...newAssignment, attachmentType: e.target.value})}
                        >
                          <option value="">No Attachment</option>
                          <option value="pdf">PDF Document</option>
                          <option value="image">Image File</option>
                          <option value="doc">Word/Doc</option>
                          <option value="excel">Excel Sheet</option>
                        </select>
                      </div>
                      {newAssignment.attachmentUrl && !newAssignment.attachmentUrl.startsWith('data:') && (
                        <input 
                          placeholder="Or provide an external Link (Dropbox, Drive, etc.)"
                          className="w-full bg-slate-50 border-slate-100 rounded-lg py-2 px-3 text-sm focus:ring-2 focus:ring-indigo-500"
                          value={newAssignment.attachmentUrl}
                          onChange={e => setNewAssignment({...newAssignment, attachmentUrl: e.target.value})}
                        />
                      )}
                      <textarea 
                        placeholder="Instructions..."
                        rows={2}
                        className="w-full bg-slate-50 border-slate-100 rounded-lg py-2 px-3 text-sm focus:ring-2 focus:ring-indigo-500 resize-none"
                        value={newAssignment.description}
                        onChange={e => setNewAssignment({...newAssignment, description: e.target.value})}
                      />
                      <div className="flex items-center justify-between">
                        <p className="text-[10px] text-slate-400 italic">Students can upload various formats</p>
                        <div className="flex justify-end gap-2">
                          <button type="button" onClick={() => setShowAssignmentForm(false)} className="text-xs font-bold text-slate-400">Cancel</button>
                          <button type="submit" className="bg-indigo-600 text-white px-4 py-1.5 rounded-lg text-xs font-bold">Post</button>
                        </div>
                      </div>
                    </form>
                  </div>
                )}
                {showResourceForm && (
                  <div className="p-4 bg-white rounded-xl border border-emerald-100 shadow-sm animate-in zoom-in-95 duration-200">
                    <form onSubmit={handlePostResource} className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <input 
                          placeholder="Resource Title"
                          className="sm:col-span-2 w-full bg-slate-50 border-slate-100 rounded-lg py-2 px-3 text-sm focus:ring-2 focus:ring-emerald-500"
                          value={newResource.title}
                          onChange={e => setNewResource({...newResource, title: e.target.value})}
                          required
                        />
                        <select 
                          className="w-full bg-slate-50 border-slate-100 rounded-lg py-2 px-3 text-sm focus:ring-2 focus:ring-emerald-500"
                          value={newResource.type}
                          onChange={e => setNewResource({...newResource, type: e.target.value as any})}
                        >
                          <option value="pdf">PDF File</option>
                          <option value="link">Website Link</option>
                          <option value="video">Video</option>
                        </select>
                      </div>
                      <input 
                        placeholder="URL"
                        className="w-full bg-slate-50 border-slate-100 rounded-lg py-2 px-3 text-sm focus:ring-2 focus:ring-emerald-500"
                        value={newResource.url}
                        onChange={e => setNewResource({...newResource, url: e.target.value})}
                        required
                      />
                      <div className="flex justify-end gap-2">
                        <button type="button" onClick={() => setShowResourceForm(false)} className="text-xs font-bold text-slate-400">Cancel</button>
                        <button type="submit" className="bg-emerald-600 text-white px-4 py-1.5 rounded-lg text-xs font-bold">Share</button>
                      </div>
                    </form>
                  </div>
                )}
              </div>

              <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 mt-4">
                {[...assignments, ...resources]
                  .filter(item => item.courseId === activeCourseTab)
                  .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))
                  .map((item) => (
                    <div key={item.id} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex gap-4 hover:border-indigo-100 transition-colors">
                      <div className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center shrink-0",
                        item.dueDate ? "bg-indigo-50 text-indigo-600" : "bg-emerald-50 text-emerald-600"
                      )}>
                        {item.dueDate ? <ClipboardCheck className="h-5 w-5" /> : <UploadCloud className="h-5 w-5" />}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <h5 className="font-bold text-slate-800 text-sm">{item.title}</h5>
                          <span className="text-[10px] text-slate-400">
                            {item.createdAt ? format(item.createdAt.toDate(), 'MMM d, h:mm a') : 'Now'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 line-clamp-2">
                          {item.description || `Learning material shared: ${item.title}`}
                        </p>
                        {item.dueDate && (
                          <div className="mt-2 text-[10px] font-bold text-rose-500 flex items-center gap-1">
                            <Calendar className="h-3 w-3" /> Due: {format(new Date(item.dueDate), 'MMM d')}
                          </div>
                        )}
                        {item.url && (
                          <a href={item.url} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                            <BookOpen className="h-3 w-3" /> External Link
                          </a>
                        )}
                        {item.attachmentUrl && (
                          <a href={item.attachmentUrl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1 text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                            <UploadCloud className="h-3 w-3" /> {item.attachmentType?.toUpperCase() || 'Attachment'}
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            {/* Sidebar */}
            <div className="p-6 bg-white">
              <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Students</h4>
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {students
                  .filter(s => {
                    const course = courses.find(c => c.id === activeCourseTab);
                    return course && course.targetClass === `${s.year} Year Sec ${s.section}`;
                  })
                  .map(student => (
                    <div key={student.uid} className="flex items-center gap-2 p-2 rounded-lg hover:bg-slate-50">
                      <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold">{student.name.charAt(0)}</div>
                      <p className="text-xs font-bold text-slate-700 truncate">{student.name}</p>
                    </div>
                  ))}
              </div>
              <div className="mt-6 p-4 bg-indigo-50 rounded-xl">
                <p className="text-xs font-bold text-indigo-900 mb-1">Class Advisor Monitoring</p>
                <p className="text-[10px] text-indigo-700">Unified view of your classroom across all departments and subjects.</p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Advisor Tools Section */}
      {profile?.advisorOfClass && (
        <section className="bg-white rounded-3xl shadow-xl shadow-slate-200 border border-slate-200 p-8">
           <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
             <div className="flex items-center gap-4">
                <div className="p-3 bg-indigo-600 rounded-2xl shadow-lg shadow-indigo-100">
                   <Star className="h-6 w-6 text-white" />
                </div>
                <div>
                   <h3 className="text-xl font-bold text-slate-900">Advisor Feedback Portal</h3>
                   <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-0.5">Focus: {profile.advisorOfClass}</p>
                </div>
             </div>
             <button 
               onClick={() => setShowQuestionForm(!showQuestionForm)}
               className="flex items-center gap-2 px-5 py-2.5 bg-slate-100 text-slate-700 rounded-xl text-sm font-bold hover:bg-slate-200 transition-all active:scale-95"
             >
               <HelpCircle className="h-4 w-4" />
               New Survey Question
             </button>
           </div>

           {showQuestionForm && (
             <motion.div 
               initial={{ opacity: 0, y: -20 }}
               animate={{ opacity: 1, y: 0 }}
               className="mb-8 p-6 bg-slate-50 rounded-2xl border border-slate-100"
             >
               <form onSubmit={handleCreateQuestion} className="flex gap-4">
                 <input 
                   placeholder="e.g. How helpful was the recent workshop? (Rate 1-10)"
                   className="flex-1 bg-white border-slate-200 rounded-xl py-3 px-4 text-sm focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 transition-all"
                   value={newQuestionText}
                   onChange={e => setNewQuestionText(e.target.value)}
                   required
                 />
                 <button 
                   type="submit"
                   className="px-6 py-3 bg-indigo-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all"
                 >
                   Launch
                 </button>
               </form>
             </motion.div>
           )}

           <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
             <div className="space-y-4">
                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-4">Active & Past Questions</h4>
                <div className="max-h-[400px] overflow-y-auto space-y-3 pr-2">
                   {advisorQuestions.map(q => (
                     <div 
                       key={q.id}
                       onClick={() => loadResponses(q.id)}
                       className={cn(
                         "p-5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between bg-white",
                         selectedQuestion?.id === q.id 
                           ? "border-indigo-200 shadow-lg shadow-indigo-50 ring-1 ring-indigo-100" 
                           : "border-slate-100 hover:border-indigo-100 hover:bg-slate-50"
                       )}
                     >
                       <div className="flex-1 mr-4">
                          <p className={cn(
                            "text-sm font-bold truncate mb-1",
                            selectedQuestion?.id === q.id ? "text-indigo-900" : "text-slate-700"
                          )}>{q.text}</p>
                          <p className="text-[10px] text-slate-400 font-medium">
                            Published: {q.createdAt?.toDate ? format(q.createdAt.toDate(), 'MMM d, yyyy') : 'Recently'}
                          </p>
                       </div>
                       <ChevronRight className={cn(
                         "h-5 w-5 transition-colors",
                         selectedQuestion?.id === q.id ? "text-indigo-600" : "text-slate-300"
                       )} />
                     </div>
                   ))}
                   {advisorQuestions.length === 0 && (
                     <div className="text-center py-10 grayscale opacity-40">
                        <MessageSquare className="h-10 w-10 mx-auto mb-2 text-slate-300" />
                        <p className="text-xs font-bold text-slate-400">No survey questions yet.</p>
                     </div>
                   )}
                </div>
             </div>

             <div className="bg-slate-50/50 rounded-2xl border border-dashed border-slate-200 p-6 flex flex-col min-h-[400px]">
                {selectedQuestion ? (
                  <>
                    <div className="flex items-center justify-between mb-6">
                       <div>
                          <h4 className="font-bold text-slate-900 text-sm line-clamp-1">{selectedQuestion.text}</h4>
                          <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-tighter">
                            {questionResponses.length} RESPONSES RECEIVED
                          </p>
                       </div>
                       <button 
                         onClick={exportFeedback}
                         className="p-2 bg-white text-slate-600 rounded-lg shadow-sm border border-slate-100 hover:text-indigo-600 transition-colors"
                         title="Export CSV"
                       >
                         <Download className="h-4 w-4" />
                       </button>
                    </div>

                    {loadingResponses ? (
                      <div className="flex-1 flex justify-center items-center"><Loader2 className="animate-spin h-8 w-8 text-indigo-500" /></div>
                    ) : questionResponses.length > 0 ? (
                      <div className="flex-1 space-y-6">
                        <div className="h-48 w-full">
                           <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={getHistogramData()}>
                                 <XAxis 
                                   dataKey="rating" 
                                   axisLine={false} 
                                   tickLine={false} 
                                   tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }}
                                 />
                                 <RechartsTooltip 
                                   cursor={{ fill: 'rgba(99, 102, 241, 0.05)' }}
                                   content={({ active, payload }) => {
                                      if (active && payload && payload.length) {
                                        return (
                                          <div className="bg-slate-900 text-white p-2 text-xs rounded-lg shadow-xl">
                                             <p className="font-bold">Rating: {payload[0].payload.rating}</p>
                                             <p className="opacity-80">{payload[0].value} Students</p>
                                          </div>
                                        );
                                      }
                                      return null;
                                   }}
                                 />
                                 <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                                    {getHistogramData().map((entry, index) => (
                                      <Cell key={`cell-${index}`} fill={chartColors[index]} />
                                    ))}
                                 </Bar>
                              </BarChart>
                           </ResponsiveContainer>
                        </div>
                        
                        <div className="space-y-2">
                           <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-1">Recent Comments</p>
                           <div className="space-y-2 max-h-[150px] overflow-y-auto pr-1">
                              {questionResponses.filter(r => r.comment).map((r, i) => (
                                <div key={i} className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
                                   <div className="flex items-center justify-between mb-1">
                                      <div className="flex items-center gap-1.5">
                                         <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                                         <span className="text-[10px] font-bold text-slate-900">{r.rating}/10</span>
                                      </div>
                                   </div>
                                   <p className="text-[11px] text-slate-600 leading-tight italic">"{r.comment}"</p>
                                </div>
                              ))}
                           </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex-1 flex flex-col justify-center items-center text-center p-8">
                         <div className="p-4 bg-white rounded-full shadow-sm mb-4">
                            <PieChart className="h-8 w-8 text-slate-200" />
                         </div>
                         <p className="text-sm font-bold text-slate-400 italic">No responses recorded for this survey yet.</p>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="flex-1 flex flex-col justify-center items-center text-center p-8">
                     <div className="p-4 bg-white rounded-2xl shadow-sm mb-4">
                        <Users className="h-10 w-10 text-slate-100" />
                     </div>
                     <p className="text-sm font-bold text-slate-400">Select a question to view deep-dive analytics and student feedback histogram.</p>
                  </div>
                )}
             </div>
           </div>
        </section>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <h3 className="font-bold text-slate-900 flex items-center gap-3">
                  <div className="p-2 bg-indigo-50 rounded-lg">
                    <Users className="h-5 w-5 text-indigo-600" />
                  </div>
                  Student Browser
                </h3>
                <div className="flex bg-slate-100 p-1 rounded-lg">
                  <button 
                    onClick={() => setViewMode('my-students')}
                    className={cn("px-3 py-1 text-[10px] font-bold rounded-md transition-all", viewMode === 'my-students' ? "bg-white shadow text-indigo-600" : "text-slate-500 hover:text-slate-700")}
                  >
                    My Classes
                  </button>
                  <button 
                    onClick={() => setViewMode('department')}
                    className={cn("px-3 py-1 text-[10px] font-bold rounded-md transition-all", viewMode === 'department' ? "bg-white shadow text-indigo-600" : "text-slate-500 hover:text-slate-700")}
                  >
                    Main Registry
                  </button>
                </div>
              </div>
              <div className="relative group">
                <Search className="h-4 w-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                <input 
                  placeholder="Search students..." 
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
                    <th className="px-6 py-4">Student Info</th>
                    <th className="px-6 py-4">Attendance (Today)</th>
                    <th className="px-6 py-4 text-center">Actions / Marks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {students
                    .filter(s => {
                      const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) || s.regNo.toLowerCase().includes(searchTerm.toLowerCase());
                      if (viewMode === 'my-students') {
                        // Includes advisor class and taught courses
                        const isAdvisorMatch = s.year + " Year Section " + s.section === profile?.advisorOfClass;
                        const isCourseMatch = courses.some((c: any) => c.targetClass === `${s.year} Year Sec ${s.section}`);
                        return matchesSearch && (isAdvisorMatch || isCourseMatch);
                      }
                      return matchesSearch; // View Mode department shows all
                    })
                    .map(student => (
                      <tr 
                        key={student.uid} 
                        className="hover:bg-slate-50/50 transition-colors group cursor-pointer"
                        onClick={() => openStudentModal(student)}
                      >
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-full text-[10px] font-black uppercase">
                              {student.name.charAt(0)}
                            </div>
                            <div className="flex flex-col">
                              <span className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">{student.name}</span>
                              <span className="text-[10px] font-medium text-slate-400 mt-0.5">{student.regNo} • {student.year} Yr / {student.section}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-5" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center gap-3">
                            <button 
                              onClick={() => setAttendanceData({...attendanceData, [student.uid]: { status: 'present', reason: '' }})}
                              className={cn(
                                "w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold border transition-all active:scale-90",
                                attendanceData[student.uid]?.status === 'present' 
                                  ? "bg-emerald-500 text-white border-emerald-500 shadow-lg shadow-emerald-100" 
                                  : "bg-white text-emerald-600 border-emerald-100 hover:bg-emerald-50"
                              )}
                            >
                              P
                            </button>
                            <button 
                              onClick={() => setAttendanceData({...attendanceData, [student.uid]: { status: 'absent', reason: '' }})}
                              className={cn(
                                "w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold border transition-all active:scale-90",
                                attendanceData[student.uid]?.status === 'absent' 
                                  ? "bg-rose-500 text-white border-rose-500 shadow-lg shadow-rose-100" 
                                  : "bg-white text-rose-600 border-rose-100 hover:bg-rose-50"
                              )}
                            >
                              A
                            </button>
                          </div>
                        </td>
                        <td className="px-6 py-5" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-center gap-6">
                            <div className="flex flex-col items-center gap-1">
                              <span className="text-[9px] font-bold text-slate-300 uppercase tracking-tighter">Int 1</span>
                              <input 
                                type="number" 
                                className="w-12 text-center text-xs font-bold border-slate-200 bg-slate-50 rounded-lg py-1.5 focus:bg-white focus:ring-2 focus:ring-indigo-100 transition-all"
                                value={student.internalMarks?.internal1 || ''}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setStudents(students.map(s => s.uid === student.uid ? {
                                    ...s,
                                    internalMarks: { ...s.internalMarks, internal1: val }
                                  } : s));
                                }}
                                onBlur={(e) => updateMarks(student.uid, 'internal1', parseInt(e.target.value))}
                              />
                            </div>
                            <div className="flex flex-col items-center gap-1">
                              <span className="text-[9px] font-bold text-slate-300 uppercase tracking-tighter">Int 2</span>
                              <input 
                                type="number" 
                                className="w-12 text-center text-xs font-bold border-slate-200 bg-slate-50 rounded-lg py-1.5 focus:bg-white focus:ring-2 focus:ring-indigo-100 transition-all"
                                value={student.internalMarks?.internal2 || ''}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setStudents(students.map(s => s.uid === student.uid ? {
                                    ...s,
                                    internalMarks: { ...s.internalMarks, internal2: val }
                                  } : s));
                                }}
                                onBlur={(e) => updateMarks(student.uid, 'internal2', parseInt(e.target.value))}
                              />
                            </div>
                            <div className="flex items-center gap-1">
                              <button 
                                onClick={() => {
                                  const targetClass = `${student.year} Year Sec ${student.section}`;
                                  // Find if we teach a course for this class
                                  const relevantCourse = courses.find(c => c.targetClass === targetClass);
                                  if (relevantCourse) {
                                    setActiveCourseTab(relevantCourse.id);
                                    setShowAssignmentForm(true);
                                    // Scroll to the top or to the form
                                    window.scrollTo({ top: 300, behavior: 'smooth' });
                                    toast.success(`Broadcasting assignment to ${targetClass}`);
                                  } else {
                                    toast.error(`You don't teach any subjects for ${targetClass}`);
                                  }
                                }}
                                className="p-2 text-slate-400 hover:text-indigo-600 transition-colors"
                                title="Assign Task to this class"
                              >
                                <FilePlus className="h-4 w-4" />
                              </button>
                              <button 
                                onClick={() => openStudentModal(student)}
                                className="p-2 text-slate-400 hover:text-indigo-600 transition-colors"
                              >
                                <ChevronRight className="h-5 w-5" />
                              </button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    ))}
                  {students.filter(s => {
                    const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) || s.regNo.toLowerCase().includes(searchTerm.toLowerCase());
                    if (viewMode === 'my-students') {
                      const isAdvisorMatch = s.year + " Year Section " + s.section === profile?.advisorOfClass;
                      const isCourseMatch = courses.some((c: any) => c.targetClass === `${s.year} Year Sec ${s.section}`);
                      return matchesSearch && (isAdvisorMatch || isCourseMatch);
                    }
                    return matchesSearch;
                  }).length === 0 && (
                    <tr>
                      <td colSpan={3} className="px-6 py-12 text-center text-slate-400 italic font-medium">
                        No students found matching your focus criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
              
              {Object.keys(attendanceData).length > 0 && (
                <div className="p-6 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-100 rounded-lg">
                      <ClipboardCheck className="h-5 w-5 text-indigo-600" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900">Attendance Ready</p>
                      <p className="text-xs font-medium text-slate-500">
                        {Object.keys(attendanceData).length} records pending submission
                      </p>
                    </div>
                  </div>
                  <button 
                    disabled={markingAttendance}
                    onClick={submitAttendance}
                    className="w-full sm:w-auto bg-indigo-600 text-white px-8 py-3 rounded-xl text-sm font-bold shadow-lg shadow-indigo-100 hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2 transition-all active:scale-95"
                  >
                    {markingAttendance ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    Submit Attendance
                  </button>
                </div>
              )}
            </div>
          </section>
        </div>

        <div className="space-y-6">
          <section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden h-full flex flex-col">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center gap-3">
              <div className="p-2 bg-indigo-50 rounded-lg">
                <MessageSquare className="h-5 w-5 text-indigo-600" />
              </div>
              <h3 className="font-bold text-slate-900">Bulletin Board</h3>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              <BulletinBoard targetDept={profile?.department} userRole="faculty" />
            </div>
          </section>
        </div>
      </div>
    </div>
      
    {/* Student Detail Modal */}
      {selectedStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-bold text-xl uppercase shadow-lg shadow-indigo-100">
                  {selectedStudent.name.charAt(0)}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900">{selectedStudent.name}</h3>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{selectedStudent.regNo} • {selectedStudent.department} Dept</p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedStudent(null)}
                className="p-2 hover:bg-slate-100 rounded-full transition-colors"
              >
                <Plus className="h-6 w-6 text-slate-400 rotate-45" />
              </button>
            </div>
            
            <div className="p-8 grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="space-y-6">
                <div>
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-3">Contact Information</h4>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                      <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center border border-slate-100">
                        <Send className="h-4 w-4 text-indigo-500" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[9px] font-bold text-slate-400 uppercase leading-none mb-1">Email Address</p>
                        <p className="text-xs font-bold text-slate-900 truncate">{selectedStudent.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                      <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center border border-slate-100">
                        <Info className="h-4 w-4 text-emerald-500" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[9px] font-bold text-slate-400 uppercase leading-none mb-1">Department & Section</p>
                        <p className="text-xs font-bold text-slate-900 truncate">{selectedStudent.department} / {selectedStudent.section}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-3">Academic Snapshot</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100">
                      <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-tighter mb-1">Internal 1</p>
                      <p className="text-2xl font-black text-indigo-900">{selectedStudent.internalMarks?.internal1 || 'N/A'}</p>
                    </div>
                    <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                      <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-tighter mb-1">Internal 2</p>
                      <p className="text-2xl font-black text-emerald-900">{selectedStudent.internalMarks?.internal2 || 'N/A'}</p>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100">
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-3">Send Direct Feedback</h4>
                  <form onSubmit={handlePostFeedback} className="space-y-4">
                    <select 
                      className="w-full bg-slate-50 border-slate-200 rounded-xl py-2.5 px-4 text-sm focus:ring-2 focus:ring-indigo-500"
                      value={newFeedback.category}
                      onChange={e => setNewFeedback({...newFeedback, category: e.target.value as any})}
                    >
                      <option value="academic">Academic Performance</option>
                      <option value="attendance">Attendance & Punctuality</option>
                      <option value="behavioral">Behavioral / Discipline</option>
                      <option value="other">Other</option>
                    </select>
                    <textarea 
                      placeholder="Enter comments or performance updates..."
                      rows={3}
                      className="w-full bg-slate-50 border-slate-200 rounded-xl py-3 px-4 text-sm focus:ring-2 focus:ring-indigo-500 resize-none transition-all focus:bg-white"
                      value={newFeedback.content}
                      onChange={e => setNewFeedback({...newFeedback, content: e.target.value})}
                      required
                    />
                    <button type="submit" className="w-full bg-indigo-600 text-white py-3 rounded-xl text-sm font-bold shadow-lg shadow-indigo-100 hover:bg-indigo-700 active:scale-[0.98] transition-all flex items-center justify-center gap-2">
                      <Send className="h-4 w-4" />
                      Post Feedback
                    </button>
                  </form>
                </div>
              </div>
              
              <div className="md:col-span-2 flex flex-col h-[500px]">
                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-4">Detailed Performance History</h4>
                <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
                  {loadingFeedback ? (
                    <div className="flex justify-center items-center py-10"><Loader2 className="animate-spin h-6 w-6 text-indigo-500" /></div>
                  ) : studentFeedback.length > 0 ? (
                    studentFeedback.map(fb => (
                      <div key={fb.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 relative group">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-tighter">{fb.category}</span>
                          <span className="text-[9px] text-slate-400">{fb.createdAt ? format(fb.createdAt.toDate(), 'MMM d, yy') : 'Now'}</span>
                        </div>
                        <p className="text-xs text-slate-700 leading-relaxed font-medium">{fb.content}</p>
                        <p className="text-[9px] text-slate-400 mt-2 italic font-semibold">— {fb.facultyName || 'Faculty'}</p>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-10 opacity-30 grayscale">
                      <Info className="h-10 w-10 mx-auto mb-2 text-slate-400" />
                      <p className="text-xs font-bold text-slate-500">No feedback entries yet.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
