import React, { useState, useEffect } from 'react';
import { ShieldCheck, ShieldAlert, Play, CheckCircle2, XCircle, AlertTriangle, Clock, Zap, RefreshCw } from 'lucide-react';
import useStore from '../store/useStore';

// SVG Arc reused from Overview
const ScoreArc = ({ score }) => {
  const r = 44, circ = 2 * Math.PI * r;
  const filled = (score / 100) * circ;
  const color = score >= 85 ? '#00ff88' : score >= 70 ? '#3b82f6' : score >= 50 ? '#f59e0b' : '#ff4655';
  return (
    <svg width="100" height="100" viewBox="0 0 100 100" className="rotate-[-90deg]">
      <circle cx="50" cy="50" r={r} fill="none" stroke="#1a1a2e" strokeWidth="8" />
      <circle cx="50" cy="50" r={r} fill="none" stroke={color} strokeWidth="8"
        strokeDasharray={circ} strokeDashoffset={circ - filled} strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 1s ease' }} />
    </svg>
  );
};

const SEV_CONFIG = {
  CRITICAL: { color: 'text-[#ff4655]', bg: 'bg-[#ff4655]/10', border: 'border-[#ff4655]/30' },
  HIGH:     { color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/25' },
  MEDIUM:   { color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/25' },
  LOW:      { color: 'text-blue-400',   bg: 'bg-blue-500/10',   border: 'border-blue-500/25' }
};

const AuditCenter = () => {
  const { token, activeGuildId } = useStore();
  const [audits, setAudits] = useState([]);
  const [latestAudit, setLatestAudit] = useState(null);
  const [findings, setFindings] = useState([]);
  const [scanning, setScanning] = useState(false);
  const [fixLoading, setFixLoading] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchAudits = async () => {
    if (!activeGuildId || !token) return;
    try {
      const res = await fetch(`http://localhost:5000/api/audit/${activeGuildId}/audits`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      const list = Array.isArray(data) ? data : [];
      setAudits(list);
      if (list.length > 0) await loadAudit(list[0].id);
    } catch (err) { console.error(err); }
  };

  const loadAudit = async (auditId) => {
    try {
      const res = await fetch(`http://localhost:5000/api/audit/${activeGuildId}/audits/${auditId}`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setLatestAudit(data);
      setFindings(Array.isArray(data.findings) ? data.findings : []);
    } catch (err) { console.error(err); }
  };

  const runScan = async () => {
    setScanning(true);
    try {
      const res = await fetch(`http://localhost:5000/api/audit/${activeGuildId}/scan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setLatestAudit(data.audit);
        setFindings(Array.isArray(data.audit?.findings) ? data.audit.findings : []);
        await fetchAudits();
        showToast('✅ Security audit complete!');
      } else { showToast('⚠️ Scan failed', 'error'); }
    } catch { showToast('⚠️ Connection error', 'error'); }
    finally { setScanning(false); }
  };

  const applyFix = async (finding) => {
    if (!finding.fixable || finding.fixed) return;
    setFixLoading(finding.id);
    try {
      const res = await fetch(`http://localhost:5000/api/audit/${activeGuildId}/audits/${latestAudit.id}/fix/${finding.id}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        showToast(`✅ Fix applied: ${finding.title}`);
        setFindings(prev => prev.map(f => f.id === finding.id ? { ...f, fixed: true } : f));
      } else { showToast('⚠️ Fix failed', 'error'); }
    } catch { showToast('⚠️ Error', 'error'); }
    finally { setFixLoading(null); }
  };

  const socket = useStore((state) => state.socket);

  useEffect(() => { fetchAudits(); }, [activeGuildId, token]);

  useEffect(() => {
    if (!socket) return;
    const handleRealtimeUpdate = () => {
      fetchAudits();
    };
    socket.on('audit_complete', handleRealtimeUpdate);
    socket.on('settings_updated', handleRealtimeUpdate);
    return () => {
      socket.off('audit_complete', handleRealtimeUpdate);
      socket.off('settings_updated', handleRealtimeUpdate);
    };
  }, [socket, activeGuildId]);

  const score = latestAudit?.score || 0;
  const rating = score >= 85 ? { label: 'Excellent', color: 'text-emerald-400' } :
                 score >= 70 ? { label: 'Good', color: 'text-blue-400' } :
                 score >= 50 ? { label: 'Moderate', color: 'text-yellow-400' } :
                               { label: 'Critical', color: 'text-[#ff4655]' };

  const criticals = findings.filter(f => f.severity === 'CRITICAL').length;
  const highs = findings.filter(f => f.severity === 'HIGH').length;

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
          <h2 className="text-2xl font-black text-white tracking-wide">Security Audit Center</h2>
          <p className="text-xs text-gray-400 mt-1">Scan your server security posture and apply instant fixes.</p>
        </div>
        <button onClick={runScan} disabled={scanning}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-rage text-white text-sm font-black hover:opacity-90 transition-all disabled:opacity-60 shadow-glow">
          {scanning ? <RefreshCw size={14} className="animate-spin" /> : <Play size={14} />}
          {scanning ? 'Scanning…' : 'Run Security Audit'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Score Panel */}
        <div className="glass-panel p-6 rounded-2xl border border-gray-800 flex flex-col items-center justify-center gap-4">
          {latestAudit ? (
            <>
              <div className="relative flex items-center justify-center w-28 h-28">
                <ScoreArc score={score} />
                <div className="absolute flex flex-col items-center">
                  <span className="text-3xl font-black text-white">{score}</span>
                  <span className="text-[9px] text-gray-500 font-mono">/100</span>
                </div>
              </div>
              <div className="text-center">
                <span className={`text-xl font-black block ${rating.color}`}>{rating.label}</span>
                <span className="text-xs text-gray-400 mt-1 block">{latestAudit.passed_checks}/{latestAudit.total_checks} checks passed</span>
              </div>
              {(criticals > 0 || highs > 0) && (
                <div className="w-full pt-3 border-t border-gray-800 flex gap-3 justify-center">
                  {criticals > 0 && <span className="text-[10px] font-bold text-[#ff4655]">{criticals} Critical</span>}
                  {highs > 0 && <span className="text-[10px] font-bold text-orange-400">{highs} High</span>}
                </div>
              )}
              <p className="text-[10px] text-gray-600 font-mono">
                Last scan: {latestAudit.created_at ? new Date(latestAudit.created_at).toLocaleString() : '—'}
              </p>
            </>
          ) : (
            <div className="text-center text-gray-500">
              <ShieldAlert size={40} className="mx-auto mb-3 text-[#ff4655]/30" />
              <p className="text-sm">No audit run yet.</p>
              <p className="text-xs mt-1">Click "Run Security Audit" to scan.</p>
            </div>
          )}
        </div>

        {/* Findings List */}
        <div className="lg:col-span-2 glass-panel rounded-2xl border border-gray-800 overflow-hidden">
          <div className="p-4 border-b border-gray-800">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
              <AlertTriangle size={14} className="text-[#ff4655]" />
              Audit Findings {findings.length > 0 && `(${findings.length})`}
            </h3>
          </div>
          {findings.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-gray-500 gap-3">
              <ShieldCheck size={32} className="text-[#ff4655]/20" />
              <span className="text-xs">{latestAudit ? 'No findings — great posture!' : 'Run an audit to see findings.'}</span>
            </div>
          ) : (
            <div className="divide-y divide-gray-800/60 max-h-[420px] overflow-y-auto">
              {['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map(sev => {
                const sevFindings = findings.filter(f => f.severity === sev);
                if (sevFindings.length === 0) return null;
                const cfg = SEV_CONFIG[sev];
                return (
                  <div key={sev}>
                    <div className={`px-4 py-2 ${cfg.bg} border-b ${cfg.border}`}>
                      <span className={`text-[10px] font-black uppercase tracking-widest ${cfg.color}`}>{sev}</span>
                    </div>
                    {sevFindings.map(f => (
                      <div key={f.id} className={`p-4 flex items-start justify-between gap-4 ${f.fixed ? 'opacity-50' : ''}`}>
                        <div className="flex items-start gap-3 min-w-0">
                          {f.fixed
                            ? <CheckCircle2 size={16} className="text-emerald-400 mt-0.5 flex-shrink-0" />
                            : <XCircle size={16} className={`${cfg.color} mt-0.5 flex-shrink-0`} />}
                          <div>
                            <p className="text-sm font-bold text-white">{f.title}</p>
                            <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">{f.description}</p>
                          </div>
                        </div>
                        {f.fixable && !f.fixed && (
                          <button onClick={() => applyFix(f)} disabled={fixLoading === f.id}
                            className="flex-shrink-0 px-3 py-1.5 rounded-lg bg-[#ff4655]/10 border border-[#ff4655]/25 text-[#ff4655] text-[10px] font-black hover:bg-[#ff4655]/20 transition-all disabled:opacity-50">
                            {fixLoading === f.id ? <RefreshCw size={10} className="animate-spin" /> : 'Fix →'}
                          </button>
                        )}
                        {f.fixed && <span className="flex-shrink-0 text-[10px] text-emerald-400 font-bold">Fixed ✓</span>}
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Audit History */}
      {audits.length > 1 && (
        <div className="glass-panel rounded-2xl border border-gray-800 overflow-hidden">
          <div className="p-4 border-b border-gray-800">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
              <Clock size={14} className="text-[#bf55ec]" /> Audit History
            </h3>
          </div>
          <div className="divide-y divide-gray-800/60">
            {audits.slice(0, 6).map(a => (
              <button key={a.id} onClick={() => loadAudit(a.id)}
                className={`w-full px-4 py-3 flex items-center justify-between hover:bg-gray-900/30 transition-colors text-left ${latestAudit?.id === a.id ? 'bg-[#ff4655]/5' : ''}`}>
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black ${a.score >= 70 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-[#ff4655]/10 text-[#ff4655]'}`}>
                    {a.score}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white">{a.score >= 85 ? 'Excellent' : a.score >= 70 ? 'Good' : a.score >= 50 ? 'Moderate' : 'Critical'}</p>
                    <p className="text-[10px] text-gray-500">{a.passed_checks}/{a.total_checks} passed</p>
                  </div>
                </div>
                <span className="text-[10px] text-gray-500 font-mono">{a.created_at ? new Date(a.created_at).toLocaleDateString() : '—'}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AuditCenter;
