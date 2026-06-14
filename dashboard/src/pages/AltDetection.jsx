import React, { useState, useEffect } from 'react';
import { Shield, AlertTriangle, UserX, Eye, Search, RefreshCw, CheckCircle, XCircle, Clock, ChevronDown, ChevronUp } from 'lucide-react';
import useStore from '../store/useStore';

const LEVEL_CONFIG = {
  CONFIRMED_ALT: { color: 'text-[#ff4655]', bg: 'bg-[#ff4655]/10', border: 'border-[#ff4655]/30', label: 'Confirmed Alt' },
  HIGH_RISK:     { color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/30', label: 'High Risk' },
  SUSPICIOUS:    { color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', label: 'Suspicious' },
  SAFE:          { color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', label: 'Safe' }
};

const ACTION_MAP = {
  FLAGGED:    { icon: Eye,        label: 'Flag for Review', next: 'FLAGGED' },
  QUARANTINED:{ icon: Shield,     label: 'Quarantine',      next: 'QUARANTINED' },
  KICKED:     { icon: UserX,      label: 'Kick User',       next: 'KICKED' },
  DISMISSED:  { icon: CheckCircle,label: 'Dismiss',         next: 'DISMISSED' }
};

const AltDetection = () => {
  const { token, activeGuildId } = useStore();
  const [detections, setDetections] = useState([]);
  const [stats, setStats] = useState({});
  const [filter, setFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchData = async () => {
    if (!activeGuildId || !token) return;
    setLoading(true);
    try {
      const [dRes, sRes] = await Promise.all([
        fetch(`http://localhost:5000/api/alt-detection/${activeGuildId}/detections`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`http://localhost:5000/api/alt-detection/${activeGuildId}/stats`, { headers: { Authorization: `Bearer ${token}` } })
      ]);
      const dData = await dRes.json();
      const sData = await sRes.json();
      setDetections(Array.isArray(dData) ? dData : []);
      setStats(sData || {});
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
    socket.on('alt_detected', handleRealtimeUpdate);
    socket.on('alt_action_taken', handleRealtimeUpdate);
    return () => {
      socket.off('alt_detected', handleRealtimeUpdate);
      socket.off('alt_action_taken', handleRealtimeUpdate);
    };
  }, [socket, activeGuildId]);

  const applyAction = async (id, action) => {
    setActionLoading(id);
    try {
      const res = await fetch(`http://localhost:5000/api/alt-detection/${activeGuildId}/detections/${id}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action })
      });
      if (res.ok) {
        showToast(`✅ Action "${action}" applied`);
        fetchData();
      } else { showToast('⚠️ Action failed', 'error'); }
    } catch { showToast('⚠️ Connection error', 'error'); }
    finally { setActionLoading(null); }
  };

  const filtered = filter === 'ALL' ? detections : detections.filter(d => d.risk_level === filter);

  return (
    <div className="space-y-6">
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 px-5 py-3 rounded-xl text-sm font-bold shadow-glow border flex items-center gap-2 ${toast.type === 'success' ? 'bg-cyber-black border-[#ff4655]/30 text-[#ff4655]' : 'bg-cyber-black border-red-500/30 text-red-400'}`}>
          <AlertTriangle size={14} /> {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-black text-white tracking-wide">Alt Detection Engine</h2>
          <p className="text-xs text-gray-400 mt-1">Real-time duplicate account scanning and risk classification.</p>
        </div>
        <button onClick={fetchData} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#ff4655]/10 border border-[#ff4655]/20 text-[#ff4655] text-xs font-bold hover:bg-[#ff4655]/20 transition-all">
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Detected', value: stats.total || 0, accent: '#ff4655' },
          { label: 'Confirmed Alts', value: stats.confirmed || 0, accent: '#ff4655' },
          { label: 'Quarantined', value: stats.quarantined || 0, accent: '#f59e0b' },
          { label: 'Pending Review', value: stats.unresolved || 0, accent: '#bf55ec' }
        ].map((s, i) => (
          <div key={i} className="glass-panel p-4 rounded-2xl border border-gray-800">
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">{s.label}</p>
            <h3 className="text-2xl font-black mt-1" style={{ color: s.accent }}>{s.value}</h3>
          </div>
        ))}
      </div>

      {/* Filter Bar */}
      <div className="flex gap-2 flex-wrap">
        {['ALL', 'CONFIRMED_ALT', 'HIGH_RISK', 'SUSPICIOUS'].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${filter === f ? 'bg-[#ff4655]/10 border-[#ff4655]/30 text-[#ff4655]' : 'bg-gray-900/50 border-gray-800 text-gray-400 hover:border-gray-700'}`}>
            {f === 'ALL' ? 'All Detections' : (LEVEL_CONFIG[f]?.label || f)}
          </button>
        ))}
      </div>

      {/* Detection Table */}
      <div className="glass-panel rounded-2xl border border-gray-800 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48 text-gray-500 text-sm">
            <RefreshCw size={18} className="animate-spin mr-2" /> Loading detections…
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-gray-500 gap-3">
            <Shield size={32} className="text-[#ff4655]/20" />
            <span className="text-xs">No detections for this filter.</span>
          </div>
        ) : (
          <div className="divide-y divide-gray-800/60">
            {filtered.map(d => {
              const lvl = LEVEL_CONFIG[d.risk_level] || LEVEL_CONFIG.SUSPICIOUS;
              const isExpanded = expanded === d.id;
              return (
                <div key={d.id} className="p-4">
                  {/* Row */}
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-9 h-9 rounded-xl ${lvl.bg} border ${lvl.border} flex items-center justify-center flex-shrink-0`}>
                        <AlertTriangle size={14} className={lvl.color} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-white truncate">{d.username || d.user_id}</p>
                        <p className="text-[10px] text-gray-500 font-mono">{d.user_id}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 flex-shrink-0">
                      {/* Risk Badge */}
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider ${lvl.bg} ${lvl.color} border ${lvl.border}`}>
                        {lvl.label}
                      </span>

                      {/* Action Status */}
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${d.resolved ? 'bg-gray-900 border-gray-700 text-gray-500' : 'bg-[#bf55ec]/10 border-[#bf55ec]/30 text-[#bf55ec]'}`}>
                        {d.action_taken}
                      </span>

                      {/* Action Buttons */}
                      {!d.resolved && (
                        <div className="flex gap-1">
                          {['QUARANTINED', 'KICKED', 'DISMISSED'].map(act => (
                            <button key={act}
                              onClick={() => applyAction(d.id, act)}
                              disabled={actionLoading === d.id}
                              className="px-2 py-1 rounded-lg bg-gray-900 border border-gray-800 hover:border-[#ff4655]/30 text-[10px] text-gray-400 hover:text-[#ff4655] transition-all disabled:opacity-50">
                              {act}
                            </button>
                          ))}
                        </div>
                      )}

                      <button onClick={() => setExpanded(isExpanded ? null : d.id)} className="text-gray-500 hover:text-gray-300 transition-colors">
                        {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </button>
                    </div>
                  </div>

                  {/* Expanded Factors */}
                  {isExpanded && (
                    <div className="mt-3 pl-12">
                      <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Detection Factors</p>
                      <div className="flex flex-wrap gap-2">
                        {(Array.isArray(d.detection_factors) ? d.detection_factors : []).map((f, i) => (
                          <span key={i} className="px-2 py-1 bg-gray-900/80 border border-gray-800 rounded-lg text-[10px] text-gray-300 font-mono">
                            {f}
                          </span>
                        ))}
                      </div>
                      <p className="text-[10px] text-gray-600 mt-2 font-mono">
                        Detected: {d.created_at ? new Date(d.created_at).toLocaleString() : '—'}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default AltDetection;
