import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import StudentDashboard from '../components/dashboard/StudentDashboard';
import FacultyDashboard from '../components/dashboard/FacultyDashboard';
import HodDashboard from '../components/dashboard/HodDashboard';
import AdminDashboard from '../components/dashboard/AdminDashboard';
import { Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { motion } from 'motion/react';

export default function Dashboard() {
  const { user, firebaseUser, loading, signOut } = useAuth();
  const [syncTimeout, setSyncTimeout] = useState(false);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (firebaseUser && !user && !loading) {
      timer = setTimeout(() => setSyncTimeout(true), 6000);
    } else {
      setSyncTimeout(false);
    }
    return () => clearTimeout(timer);
  }, [firebaseUser, user, loading]);

  if (loading) return (
    <div className="flex h-screen items-center justify-center bg-slate-50">
      <div className="text-center">
        <Loader2 className="h-10 w-10 animate-spin text-indigo-600 mx-auto" />
        <p className="mt-4 text-slate-400 font-medium tracking-tight">Initializing IntelliClass...</p>
      </div>
    </div>
  );

  // If firebase is authenticated but we don't have a user record yet,
  // we might be in the middle of registration or there's a sync issue.
  if (firebaseUser && !user) {
    return (
      <div className="flex h-screen flex-col items-center justify-center space-y-6 bg-slate-50 p-4">
        <div className="relative">
          <div className="absolute inset-0 bg-indigo-200 rounded-full blur-2xl opacity-20 animate-pulse" />
          <Loader2 className="h-12 w-12 animate-spin text-indigo-600 relative z-10" />
        </div>
        <div className="text-center max-w-sm">
          <h2 className="text-xl font-bold text-slate-800">Synchronizing Identity</h2>
          <p className="text-slate-500 text-sm mt-2">Connecting your authentication token with our faculty database. This usually takes a moment.</p>
          {!loading && !user && (
            <div className="mt-6 p-4 bg-white border border-rose-100 rounded-xl shadow-sm">
              <p className="text-xs text-rose-600 font-medium mb-3">We couldn't find your database record.</p>
              <button 
                onClick={() => signOut().then(() => window.location.href = '/login')}
                className="w-full py-2 bg-rose-600 text-white rounded-lg text-xs font-bold hover:bg-rose-700 transition-colors"
              >
                Return to Login
              </button>
            </div>
          )}
        </div>

        <div className="flex flex-col items-center gap-2">
          <button 
            onClick={() => window.location.reload()}
            className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 uppercase tracking-widest px-4 py-2 border border-indigo-100 rounded-lg hover:bg-indigo-50 transition-all"
          >
            Force Refresh
          </button>
        </div>
        
        {syncTimeout && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center gap-4 pt-4 border-t border-slate-200"
          >
            <p className="text-xs text-rose-500 font-bold bg-rose-50 px-3 py-1 rounded-full">Sync taking longer than expected</p>
            <div className="flex gap-3">
              <button 
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-600 shadow-sm hover:bg-slate-50"
              >
                Refresh App
              </button>
              <button 
                onClick={() => signOut()}
                className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold shadow-md hover:bg-indigo-700"
              >
                Sign Out & Retry
              </button>
            </div>
          </motion.div>
        )}
      </div>
    );
  }

  if (!firebaseUser) return <Navigate to="/login" />;

  if (user && !user.profileCompleted) return <Navigate to="/profile" />;

  switch (user.role) {
    case 'student':
      return <StudentDashboard />;
    case 'faculty':
      return <FacultyDashboard />;
    case 'hod':
      return <HodDashboard />;
    case 'admin':
      return <AdminDashboard />;
    default:
      return <div>Unknown Role</div>;
  }
}
