import React, { useState, useEffect } from 'react';
import { 
  UserCheck, ShieldAlert, CheckCircle, XCircle, RefreshCw, 
  Filter, Users, Clock, Shield, Zap, ToggleLeft, ToggleRight,
  GitBranch, AlertTriangle, Eye, ChevronRight
} from 'lucide-react';
import useStore from '../store/useStore';

const RISK_COLOR = {
  RED:    'bg-[#ff4655]/10 text-[#ff4655] border-[#ff4655]/25',
  ORANGE: 'bg-orange-500/10 text-orange-400 border-orange-500/25',
  YELLOW: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/25',
  GREEN:  'bg-emerald-500/10 text-emerald-400 border-emerald-500/25'
};

const TABS = ['Queue', 'Pipeline Log', 'Methods'];

// ── Pipeline Diagram ────────────────────────────────────────────────────────
const PipelineDiagram = () => {
  const steps = [
    { icon: Eye,        label: 'Risk Engine',     desc: 'Score + threat level' },
    { icon: Shield,     label: 'Alt Detection',   desc: '4-factor alt check' },
    { icon: Filter,     label: 'Settings Gate',   desc: 'Age, rules, CAPTCHA' },
    { icon: GitBranch,  label: 'Decision',        desc: 'Verified / Pending / Quarantine' }
  ];
  return (
    <div className="flex flex-col md:flex-row items-start md:items-center gap-0 md:gap-0">
      {steps.map((step, i) => {
        const Icon = step.icon;
        return (
          <React.Fragment key={i}>
            <div className="flex flex-col items-center text-center p-4 flex-1 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-[#ff4655]/10 border border-[#ff4655]/20 flex items-center justify-center mb-2">
                <Icon size={16} className="text-[#ff4655]" />
              </div>
              <p className="text-xs font-black text-white">{step.label}</p>
              <p className="text-[10px] text-gray-500 mt-0.5 leading-tight">{step.desc}</p>
            </div>
            {i < steps.length - 1 && (
              <ChevronRight size={16} className="text-[#ff4655]/30 flex-shrink-0 hidden md:block" />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};

// ── Verification Methods Panel ──────────────────────────────────────────────
const MethodsPanel = ({ token, activeGuildId }) => {
  const [settings, setSettings] = useState(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 2500); };

  useEffect(() => {
    if (!activeGuildId || !token) return;
    fetch(`http://localhost:5000/api/guilds/${activeGuildId}/settings`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(r => r.json())
      .then(d => setSettings(d))
      .catch(console.error);
  }, [activeGuildId, token]);

  const toggle = async (key) => {
    if (!settings) return;
    const updated = { ...settings, [key]: !settings[key] };
    const originalVal = settings[key];
    setSettings(updated);
    setSaving(true);
    try {
      const res = await fetch(`http://localhost:5000/api/guilds/${activeGuildId}/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ [key]: updated[key] })
      });
      if (res.ok) {
        showToast(`✅ Setting updated`);
      } else {
        // Revert toggle state on server/database error
        setSettings(prev => ({ ...prev, [key]: originalVal }));
        showToast('⚠️ Error saving');
      }
    } catch (err) {
      // Revert toggle state on network error
      setSettings(prev => ({ ...prev, [key]: originalVal }));
      showToast('⚠️ Error saving');
    } finally {
      setSaving(false);
    }
  };

  const methods = [
    { key: 'verification_enabled', label: 'Verification Gate', desc: 'Require all new members to pass a verification check before gaining access.' },
    { key: 'anti_raid_enabled',    label: 'Anti-Raid Shield',   desc: 'Detect and block mass-join flood attacks automatically.' },
    { key: 'anti_spam_enabled',    label: 'Anti-Spam Filter',   desc: 'Auto-mute users sending messages too rapidly.' },
    { key: 'anti_nuke_enabled',    label: 'Anti-Nuke Vault',    desc: 'Emergency protection against mass channel/role deletion.' },
    { key: 'anti_scam_enabled',    label: 'Anti-Scam Detector', desc: 'Flag and remove known scam links and phishing patterns.' },
    { key: 'ai_moderation_enabled',label: 'AI Moderation',      desc: 'Use AI to detect toxic, threatening, and NSFW content automatically.' }
  ];

  return (
    <div className="space-y-3">
      {toast && (
        <div className="text-xs text-[#ff4655] font-bold">{toast}</div>
      )}
      {methods.map(m => {
        const enabled = settings?.[m.key] ?? false;
        return (
          <div key={m.key} className="flex items-center justify-between gap-4 p-4 rounded-xl bg-gray-900/50 border border-gray-800 hover:border-gray-700 transition-all">
            <div>
              <p className="text-sm font-bold text-white">{m.label}</p>
              <p className="text-[10px] text-gray-500 mt-0.5 leading-relaxed">{m.desc}</p>
            </div>
            <button onClick={() => toggle(m.key)} disabled={saving}
              className={`flex-shrink-0 w-11 h-6 rounded-full relative transition-all border ${enabled ? 'bg-[#ff4655] border-[#ff4655]' : 'bg-gray-800 border-gray-700'}`}>
              <div className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-all ${enabled ? 'left-6' : 'left-0.5'}`} />
            </button>
          </div>
        );
      })}
    </div>
  );
};

// ── Main Verification Component ─────────────────────────────────────────────
const Verification = () => {
  const token = useStore((state) => state.token);
  const activeGuildId = useStore((state) => state.activeGuildId);
  const [queue, setQueue] = useState([]);
  const [screenings, setScreenings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('Queue');
  const [actionLoading, setActionLoading] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = 'success') => { setToast({ msg, type }); setTimeout(() => setToast(null), 3000); };

  const fetchQueue = async () => {
    if (!activeGuildId || !token) return;
    setLoading(true);
    try {
      const res = await fetch(`http://localhost:5000/api/security/${activeGuildId}/verification-queue`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setQueue(Array.isArray(data) ? data : []);
    } catch (err) { console.error(err); setQueue([]); }
    finally { setLoading(false); }
  };

  const fetchScreenings = async () => {
    if (!activeGuildId || !token) return;
    try {
      const res = await fetch(`http://localhost:5000/api/alt-detection/${activeGuildId}/screenings`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setScreenings(Array.isArray(data) ? data.slice(0, 10) : []);
    } catch (err) { console.error(err); }
  };

  const socket = useStore((state) => state.socket);

  useEffect(() => {
    fetchQueue();
    fetchScreenings();
  }, [activeGuildId]);

  useEffect(() => {
    if (!socket) return;
    const handleRealtimeUpdate = () => {
      fetchQueue();
      fetchScreenings();
    };
    socket.on('verification_approved', handleRealtimeUpdate);
    socket.on('verification_rejected', handleRealtimeUpdate);
    socket.on('join_screening_result', handleRealtimeUpdate);
    return () => {
      socket.off('verification_approved', handleRealtimeUpdate);
      socket.off('verification_rejected', handleRealtimeUpdate);
      socket.off('join_screening_result', handleRealtimeUpdate);
    };
  }, [socket, activeGuildId]);

  const handleAction = async (userId, action) => {
    setActionLoading(userId + action);
    try {
      const endpoint = action === 'approve' ? 'approve' : 'reject';
      await fetch(`http://localhost:5000/api/security/${activeGuildId}/verification/${userId}/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ moderatorId: '1002' })
      });
      showToast(action === 'approve' ? '✅ Member approved' : '❌ Member rejected');
      fetchQueue();
    } catch (err) {
      console.error(err);
      showToast('⚠️ Action failed', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="space-y-6">
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 px-5 py-3 rounded-xl text-sm font-bold shadow-glow border flex items-center gap-2 ${toast.type === 'success' ? 'bg-cyber-black border-[#ff4655]/30 text-[#ff4655]' : 'bg-cyber-black border-red-500/30 text-red-400'}`}>
          <AlertTriangle size={14} /> {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex justify-between items-center flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-black text-white tracking-wide">Verification Center</h2>
          <p className="text-xs text-gray-400 mt-1">Zero-Trust member gating with multi-layer pipeline verification.</p>
        </div>
        <button onClick={fetchQueue}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#ff4655]/10 border border-[#ff4655]/20 text-[#ff4655] text-xs font-bold hover:bg-[#ff4655]/20 transition-all">
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Pending', value: queue.filter(q => q.status === 'PENDING').length, accent: '#f59e0b' },
          { label: 'Manual Review', value: queue.filter(q => q.status === 'MANUAL_REVIEW').length, accent: '#bf55ec' },
          { label: 'Total Queue', value: queue.length, accent: '#ff4655' }
        ].map((s, i) => (
          <div key={i} className="glass-panel p-4 rounded-2xl border border-gray-800">
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">{s.label}</p>
            <h3 className="text-2xl font-black mt-1" style={{ color: s.accent }}>{s.value}</h3>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-800 pb-0">
        {TABS.map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-4 py-2.5 text-xs font-bold transition-all border-b-2 -mb-px ${activeTab === tab ? 'border-[#ff4655] text-[#ff4655]' : 'border-transparent text-gray-500 hover:text-gray-300'}`}>
            {tab}
          </button>
        ))}
      </div>

      {/* Tab: Queue */}
      {activeTab === 'Queue' && (
        <div className="glass-panel rounded-2xl border border-gray-800 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-48 text-gray-500 text-sm">
              <RefreshCw size={18} className="animate-spin mr-2" /> Loading queue…
            </div>
          ) : queue.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-gray-500 gap-3">
              <CheckCircle size={32} className="text-[#ff4655]/20" />
              <span className="text-xs">All clear. Verification queue is empty.</span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b border-gray-800 text-gray-500 uppercase tracking-wider">
                    <th className="p-4 font-bold">Member</th>
                    <th className="p-4 font-bold">Method</th>
                    <th className="p-4 font-bold">Risk</th>
                    <th className="p-4 font-bold">Stage</th>
                    <th className="p-4 font-bold">Status</th>
                    <th className="p-4 font-bold">Joined</th>
                    <th className="p-4 font-bold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/60">
                  {queue.map((entry) => (
                    <tr key={entry.id} className="hover:bg-gray-900/30 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          {entry.user?.avatar_url ? (
                            <img src={entry.user.avatar_url} alt="" className="w-7 h-7 rounded-lg border border-gray-700" />
                          ) : (
                            <div className="w-7 h-7 rounded-lg bg-[#ff4655]/10 border border-[#ff4655]/20 flex items-center justify-center font-black text-[10px] text-[#ff4655]">
                              {(entry.user?.username || '?').substring(0, 2).toUpperCase()}
                            </div>
                          )}
                          <div>
                            <span className="font-bold text-white block">{entry.user?.username || 'Unknown'}</span>
                            <span className="text-gray-600 font-mono text-[10px]">{entry.user_id}</span>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 text-gray-400 font-mono">{entry.captcha_type || 'TEXT'}</td>
                      <td className="p-4">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-black border ${RISK_COLOR[entry.risk_level] || RISK_COLOR.GREEN}`}>
                          {entry.risk_score || 0} / {entry.risk_level}
                        </span>
                      </td>
                      <td className="p-4 text-gray-400 font-mono">{entry.pipeline_stage || 'Verification'}</td>
                      <td className="p-4">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${entry.status === 'PENDING' ? 'text-yellow-400 bg-yellow-500/10 border border-yellow-500/20' : 'text-gray-500 bg-gray-900 border border-gray-800'}`}>
                          {entry.status?.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="p-4 text-gray-500 font-mono">
                        {entry.created_at ? new Date(entry.created_at).toLocaleTimeString() : '—'}
                      </td>
                      <td className="p-4 text-right">
                        {(entry.status === 'PENDING' || entry.status === 'MANUAL_REVIEW') ? (
                          <div className="flex justify-end gap-2">
                            <button onClick={() => handleAction(entry.user_id, 'approve')}
                              disabled={actionLoading === entry.user_id + 'approve'}
                              className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/25 border border-emerald-500/20 transition-all disabled:opacity-50">
                              <CheckCircle size={14} />
                            </button>
                            <button onClick={() => handleAction(entry.user_id, 'reject')}
                              disabled={actionLoading === entry.user_id + 'reject'}
                              className="p-1.5 rounded-lg bg-[#ff4655]/10 text-[#ff4655] hover:bg-[#ff4655]/25 border border-[#ff4655]/20 transition-all disabled:opacity-50">
                              <XCircle size={14} />
                            </button>
                          </div>
                        ) : (
                          <span className="text-gray-600 italic text-[10px]">Closed</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab: Pipeline Log */}
      {activeTab === 'Pipeline Log' && (
        <div className="space-y-4">
          <div className="glass-panel p-5 rounded-2xl border border-gray-800">
            <h3 className="text-sm font-black text-white mb-4 uppercase tracking-wider font-mono flex items-center gap-2">
              <GitBranch size={14} className="text-[#ff4655]" /> Member Screening Pipeline
            </h3>
            <PipelineDiagram />
          </div>

          <div className="glass-panel rounded-2xl border border-gray-800 overflow-hidden">
            <div className="p-4 border-b border-gray-800">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
                <Clock size={14} className="text-[#bf55ec]" /> Recent Screening Log
              </h3>
            </div>
            {screenings.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-gray-500 text-xs">No screening records available.</div>
            ) : (
              <div className="divide-y divide-gray-800/60">
                {screenings.map(s => (
                  <div key={s.id} className="p-4 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-[#ff4655]/10 border border-[#ff4655]/20 flex items-center justify-center text-[10px] font-black text-[#ff4655]">
                        {(s.username || '?').substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-white">{s.username || s.user_id}</p>
                        <div className="flex items-center gap-1 mt-0.5">
                          {(Array.isArray(s.pipeline_log) ? s.pipeline_log : []).map((step, i) => (
                            <React.Fragment key={i}>
                              <span className="text-[9px] text-gray-600 font-mono">{step.step}</span>
                              {i < s.pipeline_log.length - 1 && <span className="text-gray-700">›</span>}
                            </React.Fragment>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-black border ${
                        s.decision === 'VERIFIED' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
                        s.decision === 'QUARANTINED' ? 'bg-[#ff4655]/10 border-[#ff4655]/20 text-[#ff4655]' :
                        'bg-yellow-500/10 border-yellow-500/20 text-yellow-400'
                      }`}>{s.decision}</span>
                      <span className="text-[10px] text-gray-500 font-mono">{s.created_at ? new Date(s.created_at).toLocaleString() : '—'}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab: Methods */}
      {activeTab === 'Methods' && (
        <MethodsPanel token={token} activeGuildId={activeGuildId} />
      )}
    </div>
  );
};

export default Verification;
