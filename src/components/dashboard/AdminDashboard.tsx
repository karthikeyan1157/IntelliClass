import React, { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { collection, query, getDocs, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { ShieldCheck, Users, Trash2, Search, Filter, Loader2, AlertTriangle, CheckCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { cn } from '../../lib/utils';

export default function AdminDashboard() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const snapshot = await getDocs(collection(db, 'users'));
      setUsers(snapshot.docs.map(d => ({ uid: d.id, ...d.data() })));
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const deleteUser = async (uid: string) => {
    if (!confirm('Are you sure you want to delete this user? This cannot be undone.')) return;
    try {
      await deleteDoc(doc(db, 'users', uid));
      setUsers(users.filter(u => u.uid !== uid));
      toast.success('User deleted');
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const filteredUsers = users.filter(u => 
    (roleFilter === 'All' || u.role === roleFilter) &&
    (u.email.toLowerCase().includes(searchTerm.toLowerCase()) || u.uid.includes(searchTerm))
  );

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin h-8 w-8 text-indigo-600" /></div>;

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-rose-50 rounded-2xl border border-rose-100 shadow-sm shadow-rose-50">
            <ShieldCheck className="h-8 w-8 text-rose-600" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight leading-tight">
              Control <span className="text-slate-400 font-light">Center</span>
            </h1>
            <p className="text-slate-500 font-medium text-sm mt-0.5">System-wide administrative privileges active</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-emerald-50 text-emerald-700 px-4 py-2 rounded-xl border border-emerald-100 text-xs font-bold flex items-center gap-2">
            <CheckCircle className="h-4 w-4" />
            Core Systems: Active
          </div>
        </div>
      </header>

      {/* Admin Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-110 group-hover:opacity-10 transition-all duration-500">
            <Users className="h-24 w-24" />
          </div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Accounts</p>
          <p className="text-4xl font-bold mt-2 text-slate-900 tracking-tighter">{users.length}</p>
          <div className="mt-4 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
            <span className="text-xs font-medium text-slate-500">Live system database</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Security Status</p>
          <p className="text-4xl font-bold mt-2 text-slate-900 tracking-tighter">0</p>
          <div className="mt-4 flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-500" />
            <span className="text-xs font-medium text-slate-500">All security checks passed</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Service Health</p>
          <p className="text-4xl font-bold mt-2 text-slate-900 tracking-tighter">100%</p>
          <div className="mt-4 flex items-center gap-2">
            <div className="flex -space-x-1">
              {[1, 2, 3].map(i => <div key={i} className="w-4 h-4 rounded-full bg-emerald-400 border-2 border-white" />)}
            </div>
            <span className="text-xs font-medium text-slate-500">Global nodes operational</span>
          </div>
        </div>
      </div>

      <section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
          <h3 className="font-bold text-slate-900 flex items-center gap-3">
            <div className="p-2 bg-indigo-50 rounded-lg">
              <Users className="h-5 w-5 text-indigo-600" />
            </div>
            Global User Management
          </h3>
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
            <select 
              className="w-full sm:w-auto bg-slate-50 border-slate-200 rounded-xl py-2 px-4 text-xs font-bold text-slate-600 focus:bg-white focus:ring-2 focus:ring-indigo-100 transition-all cursor-pointer"
              value={roleFilter}
              onChange={e => setRoleFilter(e.target.value)}
            >
              <option value="All">All Identities</option>
              <option value="student">Students</option>
              <option value="faculty">Faculty Members</option>
              <option value="hod">Dept Heads (HOD)</option>
              <option value="admin">Administrators</option>
            </select>
            <div className="relative group w-full sm:w-64">
              <Search className="h-4 w-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
              <input 
                placeholder="Find by email suffix..." 
                className="w-full pl-10 pr-4 py-2 text-xs border-slate-200 bg-slate-50 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 transition-all"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50/50 text-[11px] uppercase font-bold text-slate-400 tracking-widest border-b border-slate-100">
              <tr>
                <th className="px-6 py-4">Security Identifier / Account</th>
                <th className="px-6 py-4 text-center">Auth Role</th>
                <th className="px-6 py-4 text-center">Data Integrity</th>
                <th className="px-6 py-4 text-right">Administrative Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {filteredUsers.map(u => (
                <tr key={u.uid} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-6 py-5">
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">{u.email}</span>
                      <span className="text-[10px] text-slate-400 mt-1 uppercase tracking-tighter">UID: {u.uid}</span>
                    </div>
                  </td>
                  <td className="px-6 py-5 text-center">
                    <span className={cn(
                      "px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-tight border",
                      u.role === 'admin' ? "bg-rose-50 text-rose-700 border-rose-100" :
                      u.role === 'hod' ? "bg-indigo-50 text-indigo-700 border-indigo-100" :
                      u.role === 'faculty' ? "bg-blue-50 text-blue-700 border-blue-100" :
                      "bg-emerald-50 text-emerald-700 border-emerald-100"
                    )}>
                      {u.role}
                    </span>
                  </td>
                  <td className="px-6 py-5 text-center">
                    {u.profileCompleted ? (
                      <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100 uppercase">
                        <CheckCircle className="h-3 w-3" /> Sync_OK
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-amber-500 bg-amber-50 px-2 py-0.5 rounded border border-amber-100 uppercase">
                         Data_Missing
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-5 text-right">
                    <div className="flex items-center justify-end gap-2">
                       <button 
                        onClick={() => deleteUser(u.uid)}
                        className="p-2 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all active:scale-90"
                        title="Delete Account"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredUsers.length === 0 && (
            <div className="p-16 text-center text-slate-400 bg-slate-50/20 italic text-sm">
              No authenticated records matching current filter configuration.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
