import React from 'react';
import { LogOut, GraduationCap, LayoutDashboard, User as UserIcon, MessageSquare } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import NotificationBell from '../shared/NotificationBell';

export default function Navbar() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  if (!user) return null;

  return (
    <nav className="bg-white border-b border-slate-200 sticky top-0 z-50 h-16 flex items-center">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="flex justify-between items-center h-full">
          <div className="flex items-center space-x-8">
            <Link to="/" className="flex items-center space-x-3 group">
              <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center transition-transform group-hover:scale-105">
                <GraduationCap className="h-6 w-6 text-white" />
              </div>
              <span className="text-xl font-bold tracking-tight text-slate-800">
                IntelliClass 
                <span className="text-slate-400 font-medium text-xs ml-2 uppercase tracking-widest hidden sm:inline">v2.4</span>
              </span>
            </Link>
            
            <div className="hidden md:flex items-center space-x-6">
              <Link to="/" className="text-slate-500 hover:text-indigo-600 px-1 py-2 text-sm font-semibold transition-colors">
                Dashboard
              </Link>
              
              {user.role === 'student' && (
                <Link to="/grades" className="text-slate-500 hover:text-indigo-600 px-1 py-2 text-sm font-semibold transition-colors">
                  My Grades
                </Link>
              )}
              
              {user.role === 'faculty' && (
                <Link to="/courses" className="text-slate-500 hover:text-indigo-600 px-1 py-2 text-sm font-semibold transition-colors">
                  Courses
                </Link>
              )}
              
              {user.role === 'hod' && (
                <Link to="/records" className="text-slate-500 hover:text-indigo-600 px-1 py-2 text-sm font-semibold transition-colors">
                  Student Records
                </Link>
              )}

              {user.profileCompleted && (
                <Link to="/messages" className="text-slate-500 hover:text-indigo-600 px-1 py-2 text-sm font-semibold transition-colors flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Messages
                </Link>
              )}

              {user.profileCompleted && (
                <Link to="/profile" className="text-slate-500 hover:text-indigo-600 px-1 py-2 text-sm font-semibold transition-colors">
                  My Profile
                </Link>
              )}
            </div>
          </div>

          <div className="flex items-center gap-4 sm:gap-6">
            <NotificationBell />
            
            <div className="hidden sm:flex items-center gap-3 pl-6 border-l border-slate-200">
              <div className="text-right">
                <p className="text-xs font-bold text-slate-900 capitalize">{user.role}</p>
                <p className="text-[10px] text-slate-500">{user.email}</p>
              </div>
              <div className="w-9 h-9 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center">
                <UserIcon className="h-5 w-5 text-slate-500" />
              </div>
            </div>
            
            <button
              onClick={handleSignOut}
              className="p-2 text-slate-400 hover:text-rose-600 transition-colors rounded-lg hover:bg-rose-50"
              title="Sign Out"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
