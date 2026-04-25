import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useNavigate } from 'react-router-dom';
import { User, Loader2, Save } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [profileData, setProfileData] = useState<any>({});
  const navigate = useNavigate();

  useEffect(() => {
    const fetchProfile = async () => {
      if (user) {
        const profileDoc = await getDoc(doc(db, 'users', user.uid, 'profiles', 'main'));
        if (profileDoc.exists()) {
          setProfileData(profileDoc.data());
        } else {
          // Initialize with bits from registration
          setProfileData({
            name: '',
            department: '',
            ...(user.role === 'student' && { regNo: '', year: '', dob: '', section: '' }),
            ...(user.role === 'faculty' && { facultyId: '', advisorOfClass: '' }),
            ...(user.role === 'hod' && { hodId: '', managedYears: [] }),
          });
        }
      }
      setFetching(false);
    };
    fetchProfile();
  }, [user]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);

    try {
      await setDoc(doc(db, 'users', user.uid, 'profiles', 'main'), profileData);
      await updateDoc(doc(db, 'users', user.uid), { profileCompleted: true });
      await refreshUser();
      toast.success('Profile updated successfully!');
      navigate('/');
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  if (fetching) return (
    <div className="flex h-screen items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
      <div className="bg-white shadow-xl shadow-slate-200 rounded-2xl overflow-hidden border border-slate-200">
        <div className="bg-indigo-600 px-8 py-6">
          <h2 className="text-xl font-bold text-white flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg">
              <User className="h-6 w-6" />
            </div>
            Complete Your Profile
            <span className="text-indigo-200 font-medium text-xs ml-auto uppercase tracking-widest bg-indigo-700 px-3 py-1 rounded-full">
              {user?.role}
            </span>
          </h2>
        </div>
        
        <form onSubmit={handleSave} className="p-8 space-y-8">
          <div className="grid grid-cols-1 gap-y-8 gap-x-6 sm:grid-cols-6">
            <div className="sm:col-span-4">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Full Name</label>
              <input
                type="text"
                required
                className="block w-full border-slate-200 bg-slate-50 rounded-xl py-2.5 text-sm focus:bg-white focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 transition-all"
                value={profileData.name || ''}
                onChange={(e) => setProfileData({...profileData, name: e.target.value})}
              />
            </div>

            <div className="sm:col-span-3">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Department</label>
              <select
                required
                className="block w-full border-slate-200 bg-slate-50 rounded-xl py-2.5 text-sm focus:bg-white focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 transition-all"
                value={profileData.department || ''}
                onChange={(e) => setProfileData({...profileData, department: e.target.value})}
              >
                <option value="">Select Department</option>
                <option value="Computer Science">Computer Science</option>
                <option value="Information Technology">Information Technology</option>
                <option value="Mechanical Engineering">Mechanical Engineering</option>
                <option value="Civil Engineering">Civil Engineering</option>
                <option value="ECE">ECE</option>
                <option value="EEE">EEE</option>
                <option value="CSBS">Computer Science and Business Systems</option>
              </select>
            </div>

            {user?.role === 'student' && (
              <>
                <div className="sm:col-span-3">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Registration Number</label>
                  <input
                    type="text"
                    required
                    className="block w-full border-slate-200 bg-slate-50 rounded-xl py-2.5 text-sm focus:bg-white focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 transition-all"
                    value={profileData.regNo || ''}
                    onChange={(e) => setProfileData({...profileData, regNo: e.target.value})}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Year</label>
                  <select
                    required
                    className="block w-full border-slate-200 bg-slate-50 rounded-xl py-2.5 text-sm focus:bg-white focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 transition-all"
                    value={profileData.year || ''}
                    onChange={(e) => setProfileData({...profileData, year: e.target.value})}
                  >
                    <option value="">Year</option>
                    <option value="I">I</option>
                    <option value="II">II</option>
                    <option value="III">III</option>
                    <option value="IV">IV</option>
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Section</label>
                  <input
                    type="text"
                    required
                    className="block w-full border-slate-200 bg-slate-50 rounded-xl py-2.5 text-sm focus:bg-white focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 transition-all"
                    placeholder="A, B, C..."
                    value={profileData.section || ''}
                    onChange={(e) => setProfileData({...profileData, section: e.target.value})}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">DOB</label>
                  <input
                    type="date"
                    required
                    className="block w-full border-slate-200 bg-slate-50 rounded-xl py-2.5 text-sm focus:bg-white focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 transition-all"
                    value={profileData.dob || ''}
                    onChange={(e) => setProfileData({...profileData, dob: e.target.value})}
                  />
                </div>
              </>
            )}

            {user?.role === 'faculty' && (
              <>
                <div className="sm:col-span-3">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Faculty ID</label>
                  <input
                    type="text"
                    required
                    className="block w-full border-slate-200 bg-slate-50 rounded-xl py-2.5 text-sm focus:bg-white focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 transition-all"
                    value={profileData.facultyId || ''}
                    onChange={(e) => setProfileData({...profileData, facultyId: e.target.value})}
                  />
                </div>
                <div className="sm:col-span-3">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Advisor Of Class</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 2nd Year Section A"
                    className="block w-full border-slate-200 bg-slate-50 rounded-xl py-2.5 text-sm focus:bg-white focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 transition-all"
                    value={profileData.advisorOfClass || ''}
                    onChange={(e) => setProfileData({...profileData, advisorOfClass: e.target.value})}
                  />
                </div>
              </>
            )}

            {user?.role === 'hod' && (
              <>
                <div className="sm:col-span-3">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">HOD ID</label>
                  <input
                    type="text"
                    required
                    className="block w-full border-slate-200 bg-slate-50 rounded-xl py-2.5 text-sm focus:bg-white focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 transition-all"
                    value={profileData.hodId || ''}
                    onChange={(e) => setProfileData({...profileData, hodId: e.target.value})}
                  />
                </div>
                <div className="sm:col-span-6">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Managed Years</label>
                  <div className="mt-4 flex flex-wrap gap-4">
                    {['I', 'II', 'III', 'IV'].map(year => (
                      <label key={year} className="flex items-center space-x-3 cursor-pointer group">
                        <input
                          type="checkbox"
                          checked={profileData.managedYears?.includes(year)}
                          onChange={(e) => {
                            const years = profileData.managedYears || [];
                            if (e.target.checked) {
                              setProfileData({...profileData, managedYears: [...years, year]});
                            } else {
                              setProfileData({...profileData, managedYears: years.filter((y: string) => y !== year)});
                            }
                          }}
                          className="w-5 h-5 rounded-lg border-slate-200 text-indigo-600 focus:ring-indigo-500 transition-all"
                        />
                        <span className="text-sm font-bold text-slate-600 group-hover:text-indigo-600 transition-colors uppercase tracking-wider">{year} Year</span>
                      </label>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="flex justify-end pt-8 border-t border-slate-100">
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center px-8 py-3 border border-transparent text-sm font-bold rounded-xl shadow-lg shadow-indigo-100 text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 transition-all active:scale-95"
            >
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Save My Profile
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
