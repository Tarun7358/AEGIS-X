import React, { useState, useEffect } from 'react';
import { Users, Plus, Trash2, Edit2, Clock, Shield, AlertTriangle, RefreshCw, Check, X } from 'lucide-react';
import useStore from '../store/useStore';

const ROLES = ['Owner', 'Security Director', 'Admin', 'Moderator', 'Support', 'Analyst', 'Viewer'];
const ROLE_COLOR = {
  'Owner':             'text-[#ff4655] border-[#ff4655]/30 bg-[#ff4655]/8',
  'Security Director': 'text-[#bf55ec] border-[#bf55ec]/30 bg-[#bf55ec]/8',
  'Admin':             'text-orange-400 border-orange-500/30 bg-orange-500/8',
  'Moderator':         'text-yellow-400 border-yellow-500/30 bg-yellow-500/8',
  'Support':           'text-blue-400 border-blue-500/30 bg-blue-500/8',
  'Analyst':           'text-teal-400 border-teal-500/30 bg-teal-500/8',
  'Viewer':            'text-gray-400 border-gray-600/30 bg-gray-800/30'
};

const PERMISSIONS = [
  { key: 'emergency', label: 'Emergency Controls' },
  { key: 'audit', label: 'Security Audits' },
  { key: 'team_manage', label: 'Team Management' },
  { key: 'alt_detection', label: 'Alt Detection Actions' },
  { key: 'verification', label: 'Verification Decisions' }
];

const TeamManagement = () => {
  const { token, activeGuildId } = useStore();
  const [members, setMembers] = useState([]);
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // 'add' | 'edit'
  const [editTarget, setEditTarget] = useState(null);
  const [form, setForm] = useState({ userId: '', role: 'Moderator', permissions: {} });
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = 'success') => { setToast({ msg, type }); setTimeout(() => setToast(null), 3000); };

  const fetchData = async () => {
    if (!activeGuildId || !token) return;
    setLoading(true);
    try {
      const [mRes, aRes] = await Promise.all([
        fetch(`http://localhost:5000/api/team/${activeGuildId}/members`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`http://localhost:5000/api/team/${activeGuildId}/activity`, { headers: { Authorization: `Bearer ${token}` } })
      ]);
      const mData = await mRes.json(); setMembers(Array.isArray(mData) ? mData : []);
      const aData = await aRes.json(); setActivity(Array.isArray(aData) ? aData.slice(0, 20) : []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const socket = useStore((state) => state.socket);

  useEffect(() => { fetchData(); }, [activeGuildId, token]);

  useEffect(() => {
    if (!socket) return;
    const handleRealtimeUpdate = () => {
      fetchData();
    };
    socket.on('team_roster_updated', handleRealtimeUpdate);
    return () => {
      socket.off('team_roster_updated', handleRealtimeUpdate);
    };
  }, [socket, activeGuildId]);

  const openAdd = () => { setForm({ userId: '', role: 'Moderator', permissions: {} }); setModal('add'); };
  const openEdit = (m) => { setEditTarget(m); setForm({ userId: m.user_id, role: m.team_role, permissions: m.permissions || {} }); setModal('edit'); };

  const save = async () => {
    if (!form.userId || !form.role) return;
    setSaving(true);
    try {
      const method = modal === 'edit' ? 'PUT' : 'POST';
      const url = modal === 'edit'
        ? `http://localhost:5000/api/team/${activeGuildId}/members/${form.userId}`
        : `http://localhost:5000/api/team/${activeGuildId}/members`;
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ userId: form.userId, role: form.role, permissions: form.permissions })
      });
      if (res.ok) { showToast(`✅ Team member ${modal === 'edit' ? 'updated' : 'added'}`); setModal(null); fetchData(); }
      else { const e = await res.json(); showToast(`⚠️ ${e.error}`, 'error'); }
    } catch { showToast('⚠️ Error', 'error'); }
    finally { setSaving(false); }
  };

  const remove = async (userId) => {
    if (!confirm('Remove this team member?')) return;
    try {
      const res = await fetch(`http://localhost:5000/api/team/${activeGuildId}/members/${userId}`, {
        method: 'DELETE', headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) { showToast('✅ Member removed'); fetchData(); }
    } catch { showToast('⚠️ Error', 'error'); }
  };

  const togglePerm = (key) => setForm(f => ({ ...f, permissions: { ...f.permissions, [key]: !f.permissions[key] } }));

  return (
    <div className="space-y-6">
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 px-5 py-3 rounded-xl text-sm font-bold shadow-glow border flex items-center gap-2 ${toast.type === 'success' ? 'bg-cyber-black border-[#ff4655]/30 text-[#ff4655]' : 'bg-cyber-black border-red-500/30 text-red-400'}`}>
          <AlertTriangle size={14} /> {toast.msg}
        </div>
      )}

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-[#0a0b0f] border border-[#ff4655]/20 rounded-2xl p-6 w-full max-w-md mx-4 shadow-glow space-y-4">
            <h3 className="text-base font-black text-white">{modal === 'edit' ? 'Edit Team Member' : 'Add Team Member'}</h3>
            {modal === 'add' && (
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1.5">Discord User ID</label>
                <input value={form.userId} onChange={e => setForm(f => ({ ...f, userId: e.target.value }))}
                  placeholder="Enter Discord User ID"
                  className="w-full bg-gray-900 border border-gray-700 text-white text-sm p-3 rounded-xl outline-none focus:border-[#ff4655]/40 transition-colors placeholder-gray-600" />
              </div>
            )}
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1.5">Role</label>
              <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
                className="w-full bg-gray-900 border border-gray-700 text-white text-sm p-3 rounded-xl outline-none focus:border-[#ff4655]/40 transition-colors">
                {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-2">Permissions</label>
              <div className="space-y-2">
                {PERMISSIONS.map(p => (
                  <label key={p.key} className="flex items-center gap-3 cursor-pointer">
                    <div onClick={() => togglePerm(p.key)}
                      className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all cursor-pointer ${form.permissions[p.key] ? 'bg-[#ff4655] border-[#ff4655]' : 'border-gray-700 bg-gray-900'}`}>
                      {form.permissions[p.key] && <Check size={11} className="text-white" />}
                    </div>
                    <span className="text-xs text-gray-300">{p.label}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setModal(null)} className="flex-1 py-2.5 rounded-xl border border-gray-700 text-gray-400 text-sm font-bold hover:border-gray-600 transition-all">Cancel</button>
              <button onClick={save} disabled={saving || !form.userId || !form.role}
                className="flex-1 py-2.5 rounded-xl bg-gradient-rage text-white text-sm font-black hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                {saving ? <RefreshCw size={13} className="animate-spin" /> : null} Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-black text-white tracking-wide">Team Management</h2>
          <p className="text-xs text-gray-400 mt-1">Manage your security operations team, roles, and permissions.</p>
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-rage text-white text-xs font-black hover:opacity-90 transition-all shadow-glow">
          <Plus size={13} /> Add Member
        </button>
      </div>

      {/* Team Roster */}
      <div className="glass-panel rounded-2xl border border-gray-800 overflow-hidden">
        <div className="p-4 border-b border-gray-800">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
            <Users size={14} className="text-[#ff4655]" /> Staff Roster ({members.length})
          </h3>
        </div>
        {loading ? (
          <div className="flex items-center justify-center h-32 text-gray-500 text-sm"><RefreshCw size={16} className="animate-spin mr-2" /> Loading…</div>
        ) : members.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-gray-500 gap-2">
            <Users size={28} className="text-[#ff4655]/20" />
            <span className="text-xs">No team members configured.</span>
          </div>
        ) : (
          <div className="divide-y divide-gray-800/60">
            {members.map(m => {
              const roleCls = ROLE_COLOR[m.team_role] || ROLE_COLOR.Viewer;
              const user = m.user;
              return (
                <div key={m.id} className="p-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    {user?.avatar_url ? (
                      <img src={user.avatar_url} alt="" className="w-9 h-9 rounded-xl border border-gray-700 flex-shrink-0" />
                    ) : (
                      <div className="w-9 h-9 rounded-xl bg-[#ff4655]/10 border border-[#ff4655]/20 flex items-center justify-center text-sm font-black text-[#ff4655] flex-shrink-0">
                        {(user?.username || m.user_id).charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-white truncate">{user?.username || m.user_id}</p>
                      <p className="text-[10px] text-gray-500 font-mono">ID: {m.user_id}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider border ${roleCls}`}>{m.team_role}</span>
                    {m.last_active && <span className="text-[10px] text-gray-500 hidden md:block font-mono">{new Date(m.last_active).toLocaleDateString()}</span>}
                    <button onClick={() => openEdit(m)} className="p-1.5 rounded-lg bg-gray-900 border border-gray-800 hover:border-[#ff4655]/30 text-gray-400 hover:text-[#ff4655] transition-all"><Edit2 size={12} /></button>
                    <button onClick={() => remove(m.user_id)} className="p-1.5 rounded-lg bg-gray-900 border border-gray-800 hover:border-red-500/30 text-gray-400 hover:text-red-400 transition-all"><Trash2 size={12} /></button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Permissions Matrix */}
      <div className="glass-panel rounded-2xl border border-gray-800 overflow-hidden">
        <div className="p-4 border-b border-gray-800">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
            <Shield size={14} className="text-[#bf55ec]" /> Default Permissions Matrix
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-800/60">
                <th className="text-left p-3 text-gray-500 font-mono font-bold">Permission</th>
                {['Owner', 'Security Director', 'Admin', 'Moderator', 'Support', 'Viewer'].map(r => (
                  <th key={r} className="p-3 text-center">
                    <span className={`px-2 py-0.5 rounded-md text-[9px] font-black border ${ROLE_COLOR[r]}`}>{r}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/40">
              {PERMISSIONS.map(p => {
                const defaults = {
                  Owner: true, 'Security Director': true, Admin: p.key !== 'team_manage', Moderator: ['verification', 'alt_detection'].includes(p.key), Support: false, Viewer: false
                };
                return (
                  <tr key={p.key} className="hover:bg-gray-900/30">
                    <td className="p-3 text-gray-300 font-medium">{p.label}</td>
                    {['Owner', 'Security Director', 'Admin', 'Moderator', 'Support', 'Viewer'].map(r => (
                      <td key={r} className="p-3 text-center">
                        {defaults[r] ? <Check size={12} className="mx-auto text-[#ff4655]" /> : <X size={12} className="mx-auto text-gray-700" />}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Activity Log */}
      <div className="glass-panel rounded-2xl border border-gray-800 overflow-hidden">
        <div className="p-4 border-b border-gray-800">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
            <Clock size={14} className="text-[#bf55ec]" /> Recent Team Activity
          </h3>
        </div>
        {activity.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-24 text-gray-600 text-xs">No activity recorded.</div>
        ) : (
          <div className="divide-y divide-gray-800/40 max-h-64 overflow-y-auto">
            {activity.map((a, i) => (
              <div key={i} className="px-4 py-2.5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-[10px] font-bold text-[#ff4655] bg-[#ff4655]/8 border border-[#ff4655]/20 px-1.5 py-0.5 rounded font-mono flex-shrink-0">{a.action}</span>
                  <span className="text-xs text-gray-400 truncate">{a.user?.username || a.user_id} → {a.target_type} {a.target_id}</span>
                </div>
                <span className="text-[10px] text-gray-600 font-mono flex-shrink-0">{a.created_at ? new Date(a.created_at).toLocaleTimeString() : '—'}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default TeamManagement;
