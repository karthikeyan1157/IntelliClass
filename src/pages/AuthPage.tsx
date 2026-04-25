import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { UserRole } from '../types';
import { GraduationCap, UserCircle, School, ShieldCheck, Mail, Lock, User as UserIcon, Loader2, Chrome } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'react-hot-toast';
import { cn } from '../lib/utils';
import { useAuth } from '../context/AuthContext';

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [role, setRole] = useState<UserRole>('student');
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    regNo: '',
    facultyId: '',
    hodId: '',
  });

  const navigate = useNavigate();
  const { refreshUser } = useAuth();

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      // Check if user document exists
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      
      if (!userDoc.exists()) {
        // If it's a new user, they MUST have selected a role
        await setDoc(doc(db, 'users', user.uid), {
          email: user.email,
          role,
          profileCompleted: false,
          createdAt: serverTimestamp(),
          regNo: role === 'student' ? (formData.regNo || null) : null,
          facultyId: role === 'faculty' ? (formData.facultyId || null) : null,
          hodId: role === 'hod' ? (formData.hodId || null) : null,
        });
        toast.success('Account created with Google!');
      } else {
        toast.success('Logged in with Google!');
      }

      await refreshUser();
      navigate('/');
    } catch (error: any) {
      console.error(error);
      if (error.code === 'auth/operation-not-allowed') {
        toast.error('Google Sign-In is not enabled. Please enable it in Firebase Console.');
      } else {
        toast.error(error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, formData.email, formData.password);
        toast.success('Logged in successfully!');
      } else {
        await createUserWithEmailAndPassword(auth, formData.email, formData.password);
        const user = auth.currentUser;

        if (user) {
          await setDoc(doc(db, 'users', user.uid), {
            email: formData.email,
            role,
            profileCompleted: false,
            createdAt: serverTimestamp(),
            regNo: role === 'student' ? formData.regNo : null,
            facultyId: role === 'faculty' ? formData.facultyId : null,
            hodId: role === 'hod' ? formData.hodId : null,
          });
          toast.success('Account created successfully!');
        }
      }
      await refreshUser();
      navigate('/');
    } catch (error: any) {
      console.error(error);
      if (error.code === 'auth/operation-not-allowed') {
        toast.error('Email/Password auth is not enabled. Please use Google Sign-In or enable it in Firebase Console.');
      } else {
        toast.error(error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const roles = [
    { id: 'student', icon: UserCircle, label: 'Student' },
    { id: 'faculty', icon: School, label: 'Faculty' },
    { id: 'hod', icon: GraduationCap, label: 'HOD' },
    { id: 'admin', icon: ShieldCheck, label: 'Admin' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="sm:mx-auto sm:w-full sm:max-w-md text-center"
      >
        <div className="flex justify-center">
          <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-200">
            <GraduationCap className="h-10 w-10 text-white" />
          </div>
        </div>
        <h2 className="mt-8 text-3xl font-extrabold tracking-tight text-slate-800">
          {isLogin ? 'Welcome Back' : 'Join IntelliClass'}
        </h2>
        <p className="mt-2 text-sm text-slate-500">
          {isLogin ? "Don't have an account?" : "Already have an account?"}{' '}
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="font-bold text-indigo-600 hover:text-indigo-500 transition-colors"
          >
            {isLogin ? 'Register now' : 'Sign in here'}
          </button>
        </p>
      </motion.div>

      <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-10 px-6 shadow-xl shadow-slate-200 border border-slate-200 sm:rounded-2xl sm:px-12">
            {/* Test Accounts Section - TOP PRIORITY FOR DEMO */}
            <div className="mb-10 pb-8 border-b border-slate-100">
              <div className="flex items-center gap-2 mb-4 justify-center">
                <ShieldCheck className="h-4 w-4 text-indigo-600" />
                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Quick Access Test Accounts</h4>
              </div>
              <div className="grid grid-cols-1 gap-3">
                {[
                  { r: 'faculty', email: 'faculty@test.com', pass: 'facultytest', label: 'Faculty Account (F01)' },
                  { r: 'hod', email: 'hod@test.com', pass: 'hodtest', label: 'HOD Account (HOD1)' },
                  { r: 'admin', email: 'admin@test.com', pass: 'admintest', label: 'Admin Account (ADMIN)' }
                ].map(demo => (
                  <button
                    key={demo.r}
                    type="button"
                    onClick={async (e) => {
                      e.preventDefault();
                      setLoading(true);
                      try {
                        let user;
                        try {
                          // 1. Attempt login
                          const credential = await signInWithEmailAndPassword(auth, demo.email, demo.pass);
                          user = credential.user;
                          toast.success(`Signed in as ${demo.r.toUpperCase()}`);
                        } catch (e: any) {
                          // 2. Create if not exists
                          if (e.code === 'auth/user-not-found' || e.code === 'auth/invalid-credential' || e.code === 'auth/wrong-password') {
                            const credential = await createUserWithEmailAndPassword(auth, demo.email, demo.pass);
                            user = credential.user;
                          } else {
                            throw e;
                          }
                        }

                        if (user) {
                          const userData = {
                            email: demo.email,
                            role: demo.r,
                            profileCompleted: true,
                            createdAt: serverTimestamp(),
                            ...(demo.r === 'faculty' && { facultyId: 'F01' }),
                            ...(demo.r === 'hod' && { hodId: 'HOD1' }),
                            ...(demo.r === 'admin' && { adminId: 'ADMIN' }),
                          };
                          
                          // Always provision/update test user doc to ensure it exists
                          await setDoc(doc(db, 'users', user.uid), userData, { merge: true });

                          // Ensure profile exists
                          await setDoc(doc(db, 'users', user.uid, 'profiles', 'main'), {
                            name: demo.label.split(' (')[0],
                            email: demo.email,
                            department: 'Computer Science', 
                            regNo: demo.r === 'admin' ? 'ADMIN001' : (demo.r === 'hod' ? 'HOD001' : 'FAC001'),
                            ...(demo.r === 'faculty' && { advisorOfClass: 'III Year Section A' }),
                            updatedAt: serverTimestamp(),
                          }, { merge: true });

                          // PROVISION DUMMY INTEGRATION DATA
                          if (demo.r === 'faculty') {
                            // Faculty teaches a course in another dept
                            await setDoc(doc(db, 'courses', 'CS301-TEST'), {
                              code: 'CS301',
                              name: 'Advanced Algorithms',
                              department: 'Computer Science',
                              facultyId: user.uid,
                              targetClass: 'III Year Sec A',
                              credits: 4
                            }, { merge: true });
                          }

                          if (demo.r === 'hod') {
                            // HOD manages a classroom
                            await setDoc(doc(db, 'classrooms', 'CS-III-A'), {
                              name: 'III Year Sec A',
                              department: 'Computer Science',
                              hodId: user.uid,
                              advisorId: 'faculty_uid_placeholder', // In a real app this would be linked
                              studentIds: []
                            }, { merge: true });
                          }

                          toast.success(`${demo.r.toUpperCase()} data synchronized`);
                          
                          // Force refresh user data in context
                          await refreshUser();
                          navigate('/');
                        }
                      } catch (err: any) {
                        console.error("Auth helper error:", err);
                        toast.error(err.message || "Failed to log in with test account");
                      } finally {
                        setLoading(false);
                      }
                    }}
                    disabled={loading}
                    className="flex items-center justify-between px-4 py-3 bg-slate-50 rounded-xl border border-slate-100 hover:bg-white hover:border-indigo-200 hover:shadow-md transition-all group relative overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-indigo-50 opacity-0 group-hover:opacity-10 transition-opacity" />
                    <div className="flex items-center gap-3 relative z-10">
                      <div className="p-2 bg-white rounded-lg shadow-xs group-hover:text-indigo-600 transition-colors">
                        <UserIcon className="h-4 w-4" />
                      </div>
                      <span className="text-xs font-bold text-slate-700">{demo.label}</span>
                    </div>
                    <div className="flex flex-col items-end relative z-10">
                      <span className="text-[9px] font-mono text-slate-400">{demo.email}</span>
                      <span className="text-[10px] font-mono text-indigo-500 font-bold tracking-tighter">{demo.pass}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Standard Login divider */}
            <div className="relative mb-8">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-100" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-3 text-slate-400 font-bold tracking-widest text-[9px]">Or Standard Account</span>
              </div>
            </div>

            {/* Role Selection */}
            <div className="flex p-1 bg-slate-100 rounded-xl mb-8">
            {roles.map((r) => (
              <button
                key={r.id}
                onClick={() => setRole(r.id as UserRole)}
                className={cn(
                  "flex-1 flex flex-col items-center p-2 rounded-lg transition-all",
                  role === r.id 
                    ? "bg-white shadow-sm text-indigo-600" 
                    : "text-slate-400 hover:text-slate-600"
                )}
              >
                <r.icon className="h-5 w-5" />
                <span className="text-[10px] mt-1 font-bold uppercase tracking-wider">{r.label}</span>
              </button>
            ))}
          </div>

          <form className="space-y-5" onSubmit={handleAuth}>
            {!isLogin && role === 'student' && (
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Registration Number</label>
                <div className="relative">
                  <UserIcon className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    required
                    className="pl-10 block w-full border-slate-200 bg-slate-50 rounded-xl py-2.5 text-sm focus:bg-white focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 transition-all"
                    placeholder="Reg No"
                    value={formData.regNo}
                    onChange={(e) => setFormData({...formData, regNo: e.target.value})}
                  />
                </div>
              </div>
            )}

            {!isLogin && role === 'faculty' && (
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Faculty ID</label>
                <div className="relative">
                  <UserIcon className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    required
                    className="pl-10 block w-full border-slate-200 bg-slate-50 rounded-xl py-2.5 text-sm focus:bg-white focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 transition-all"
                    placeholder="Faculty ID"
                    value={formData.facultyId}
                    onChange={(e) => setFormData({...formData, facultyId: e.target.value})}
                  />
                </div>
              </div>
            )}

            {!isLogin && role === 'hod' && (
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">HOD ID</label>
                <div className="relative">
                  <UserIcon className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    required
                    className="pl-10 block w-full border-slate-200 bg-slate-50 rounded-xl py-2.5 text-sm focus:bg-white focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 transition-all"
                    placeholder="HOD ID"
                    value={formData.hodId}
                    onChange={(e) => setFormData({...formData, hodId: e.target.value})}
                  />
                </div>
              </div>
            )}

            {isLogin && role !== 'admin' && (
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">
                  {role === 'student' ? 'Registration Number' : role === 'faculty' ? 'Faculty ID' : 'HOD ID'}
                </label>
                <div className="relative">
                  <UserIcon className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    required
                    className="pl-10 block w-full border-slate-200 bg-slate-50 rounded-xl py-2.5 text-sm focus:bg-white focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 transition-all"
                    placeholder={role === 'student' ? 'Reg No' : 'ID'}
                    value={role === 'student' ? formData.regNo : role === 'faculty' ? formData.facultyId : formData.hodId}
                    onChange={(e) => {
                       if(role === 'student') setFormData({...formData, regNo: e.target.value});
                       else if(role === 'faculty') setFormData({...formData, facultyId: e.target.value});
                       else if(role === 'hod') setFormData({...formData, hodId: e.target.value});
                    }}
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="email"
                  required
                  className="pl-10 block w-full border-slate-200 bg-slate-50 rounded-xl py-2.5 text-sm focus:bg-white focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 transition-all"
                  placeholder="name@university.edu"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="password"
                  required
                  className="pl-10 block w-full border-slate-200 bg-slate-50 rounded-xl py-2.5 text-sm focus:bg-white focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 transition-all"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                />
              </div>
            </div>

            <div className="pt-2 space-y-4">
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-md text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95"
              >
                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : (isLogin ? 'Sign In' : 'Create Account')}
              </button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white px-3 text-slate-400 font-medium">Or continue with</span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="w-full flex items-center justify-center gap-3 py-3 px-4 border border-slate-200 rounded-xl bg-white text-sm font-bold text-slate-700 hover:bg-slate-50 transition-all active:scale-95 disabled:opacity-50"
              >
                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Chrome className="h-5 w-5 text-indigo-600" />}
                Google Account
              </button>
            </div>
          </form>

            <div className="mt-8 p-4 bg-amber-50 rounded-xl border border-amber-100">
               <p className="text-[10px] font-bold text-amber-800 uppercase tracking-widest mb-1">Troubleshooting</p>
               <p className="text-[10px] text-amber-700 leading-relaxed">
                 If you see a Firebase error, ensure <b>Email/Password</b> and <b>Google</b> are enabled in your 
                 <a href="https://console.firebase.google.com/" target="_blank" rel="noopener noreferrer" className="underline ml-1 font-bold">Firebase Console</a> under Authentication {'>'} Sign-in method.
               </p>
            </div>
          </div>
        </div>
      </div>
    );
  }
