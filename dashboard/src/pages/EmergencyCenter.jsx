import React, { useState, useEffect } from 'react';
import { Lock, Unlock, Link2Off, Timer, Snowflake, UserMinus, ShieldAlert, Archive, AlertTriangle, Clock, CheckCircle, RefreshCw } from 'lucide-react';
import useStore from '../store/useStore';

const ACTIONS = [
  { id: 'lock',            endpoint: 'lock',            icon: Lock,       label: 'Lock Server',            desc: 'Deny SendMessages on all text channels for @everyone.',     color: '#ff4655', severity: 'CRITICAL' },
  { id: 'unlock',          endpoint: 'unlock',          icon: Unlock,     label: 'Unlock Server',          desc: 'Restore message permissions on all text channels.',           color: '#00ff88', severity: 'HIGH' },
  { id: 'disable-invites', endpoint: 'disable-invites', icon: Link2Off,   label: 'Disable Invites',        desc: 'Delete all active invites to prevent further joins.',         color: '#ff4655', severity: 'HIGH' },
  { id: 'enable-slowmode', endpoint: 'enable-slowmode', icon: Timer,      label: 'Enable Slowmode',        desc: 'Apply 10-second slowmode to all text channels.',              color: '#f59e0b', severity: 'MEDIUM' },
  { id: 'freeze',          endpoint: 'freeze',          icon: Snowflake,  label: 'Freeze Channels',        desc: 'Fully freeze all channels (lock + slowmode combined).',       color: '#3b82f6', severity: 'CRITICAL' },
  { id: 'quarantine-joins',endpoint: 'quarantine-joins',icon: UserMinus,  label: 'Quarantine New Joins',   desc: 'Force all new members through verification before access.',   color: '#bf55ec', severity: 'HIGH' },
  { id: 'emergency-backup',endpoint: 'emergency-backup',icon: Archive,    label: 'Emergency Backup',       desc: 'Immediately snapshot current server config to backup storage.', color: '#22d3ee', severity: 'MEDIUM' },
  { id: 'verification-lockdown', endpoint: 'quarantine-joins', icon: ShieldAlert, label: 'Verification Lockdown', desc: 'Enable zero-trust verification lockdown on all new members.', color: '#bf55ec', severity: 'HIGH' }
];

const SEV_COLOR = { CRITICAL: 'text-[#ff4655] border-[#ff4655]/30 bg-[#ff4655]/8', HIGH: 'text-orange-400 border-orange-500/30 bg-orange-500/8', MEDIUM: 'text-yellow-400 border-yellow-500/30 bg-yellow-500/8' };

const EmergencyCenter = () => {
  const { token, activeGuildId } = useStore();
  const [history, setHistory] = useState([]);
  const [modal, setModal] = useState(null);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchHistory = async () => {
    if (!activeGuildId || !token) return;
    try {
      const res = await fetch(`http://localhost:5000/api/emergency/${activeGuildId}/history`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setHistory(Array.isArray(data) ? data : []);
    } catch (err) { console.error(err); }
  };

  const socket = useStore((state) => state.socket);

  useEffect(() => { fetchHistory(); }, [activeGuildId, token]);

  useEffect(() => {
    if (!socket) return;
    const handleRealtimeUpdate = () => {
      fetchHistory();
    };
    socket.on('emergency_action', handleRealtimeUpdate);
    return () => {
      socket.off('emergency_action', handleRealtimeUpdate);
    };
  }, [socket, activeGuildId]);

  const executeAction = async () => {
    if (!modal || !reason.trim()) return;
    setLoading(modal.id);
    try {
      const res = await fetch(`http://localhost:5000/api/emergency/${activeGuildId}/${modal.endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ reason: reason.trim() })
      });
      const data = await res.json();
      if (data.success) {
        showToast(`✅ ${modal.label} executed successfully`);
        setModal(null);
        setReason('');
        fetchHistory();
      } else {
        showToast(`⚠️ Action failed: ${data.error || 'Unknown error'}`, 'error');
      }
    } catch {
      showToast('⚠️ Connection error', 'error');
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="space-y-6">
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 px-5 py-3 rounded-xl text-sm font-bold shadow-glow border flex items-center gap-2 ${toast.type === 'success' ? 'bg-cyber-black border-[#ff4655]/30 text-[#ff4655]' : 'bg-cyber-black border-red-500/30 text-red-400'}`}>
          <AlertTriangle size={14} /> {toast.msg}
        </div>
      )}

      {/* Confirmation Modal */}
      {modal && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-[#0a0b0f] border border-[#ff4655]/20 rounded-2xl p-6 w-full max-w-md mx-4 shadow-glow">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-[#ff4655]/10 border border-[#ff4655]/20 flex items-center justify-center">
                <modal.icon size={18} style={{ color: modal.color }} />
              </div>
              <div>
                <h3 className="text-base font-black text-white">{modal.label}</h3>
                <p className="text-[10px] text-gray-400 mt-0.5">{modal.desc}</p>
              </div>
            </div>
            <div className="p-3 mb-4 rounded-xl bg-[#ff4655]/8 border border-[#ff4655]/20">
              <p className="text-xs text-[#ff4655] font-bold">⚠️ This action is irreversible. Confirm with a reason below.</p>
            </div>
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1.5">Reason (required)</label>
            <textarea
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="e.g. Raid detected — 15 bots joined in 30 seconds"
              rows={3}
              className="w-full bg-gray-900/80 border border-gray-700 text-white text-sm p-3 rounded-xl resize-none outline-none focus:border-[#ff4655]/40 transition-colors placeholder-gray-600"
            />
            <div className="flex gap-3 mt-4">
              <button onClick={() => { setModal(null); setReason(''); }}
                className="flex-1 py-2.5 rounded-xl border border-gray-700 text-gray-400 text-sm font-bold hover:border-gray-600 transition-all">
                Cancel
              </button>
              <button onClick={executeAction} disabled={!reason.trim() || loading === modal.id}
                className="flex-1 py-2.5 rounded-xl bg-[#ff4655] text-white text-sm font-black hover:bg-[#ff4655]/80 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                {loading === modal.id ? <RefreshCw size={14} className="animate-spin" /> : null}
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div>
        <h2 className="text-2xl font-black text-white tracking-wide flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#ff4655] animate-ping" />
          Emergency Response Center
        </h2>
        <p className="text-xs text-gray-400 mt-1">Centralized crisis management. All actions require a reason and are permanently logged.</p>
      </div>

      {/* Warning Banner */}
      <div className="p-4 rounded-2xl bg-[#ff4655]/8 border border-[#ff4655]/20 flex items-start gap-3">
        <ShieldAlert size={18} className="text-[#ff4655] flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-bold text-[#ff4655]">Critical Operations Zone</p>
          <p className="text-xs text-gray-400 mt-0.5">Emergency actions execute immediately and affect all server members. Every action is logged with timestamp, executor, and reason.</p>
        </div>
      </div>

      {/* Action Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {ACTIONS.map(action => {
          const Icon = action.icon;
          const sevCls = SEV_COLOR[action.severity] || SEV_COLOR.MEDIUM;
          return (
            <button key={action.id} onClick={() => setModal(action)}
              className="glass-panel p-5 rounded-2xl border border-gray-800 hover:border-gray-700 text-left transition-all group hover:shadow-glow">
              <div className="flex justify-between items-start mb-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${action.color}18`, border: `1px solid ${action.color}30` }}>
                  <Icon size={16} style={{ color: action.color }} />
                </div>
                <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md border ${sevCls}`}>{action.severity}</span>
              </div>
              <h4 className="text-sm font-black text-white group-hover:text-[#ff4655] transition-colors">{action.label}</h4>
              <p className="text-[10px] text-gray-500 mt-1 leading-relaxed">{action.desc}</p>
            </button>
          );
        })}
      </div>

      {/* History */}
      <div className="glass-panel rounded-2xl border border-gray-800 overflow-hidden">
        <div className="p-4 border-b border-gray-800 flex items-center justify-between">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
            <Clock size={14} className="text-[#bf55ec]" /> Emergency Action History
          </h3>
          <button onClick={fetchHistory} className="text-gray-500 hover:text-gray-300 transition-colors">
            <RefreshCw size={13} />
          </button>
        </div>
        {history.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-gray-600 text-xs gap-2">
            <CheckCircle size={24} className="text-[#ff4655]/20" />
            No emergency actions recorded yet.
          </div>
        ) : (
          <div className="divide-y divide-gray-800/60 max-h-80 overflow-y-auto">
            {history.map(h => (
              <div key={h.id} className="px-4 py-3 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase border ${h.outcome === 'SUCCESS' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-[#ff4655]/10 border-[#ff4655]/20 text-[#ff4655]'}`}>
                    {h.outcome}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white">{h.action_type?.replace(/_/g, ' ')}</p>
                    <p className="text-[10px] text-gray-500 truncate max-w-xs">{h.reason || '—'}</p>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-[10px] text-gray-500 font-mono">{h.created_at ? new Date(h.created_at).toLocaleString() : '—'}</p>
                  {h.affected_count > 0 && <p className="text-[10px] text-[#ff4655]">{h.affected_count} affected</p>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default EmergencyCenter;
