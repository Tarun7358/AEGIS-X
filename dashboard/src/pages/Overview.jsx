import React, { useState, useEffect, useCallback } from 'react';
import { 
  Users, MessageSquare, ShieldCheck, AlertTriangle, Play, 
  Flame, Zap, ShieldAlert, CheckCircle2, XCircle, Clock,
  CheckCircle
} from 'lucide-react';
import useStore from '../store/useStore';

// Toast notification helper
const Toast = ({ msg, type }) => (
  <div className={`fixed bottom-6 right-6 z-[9999] px-5 py-3 rounded-xl text-sm font-bold shadow-glow flex items-center gap-2 animate-fade-in-up border ${
    type === 'success' ? 'bg-cyber-black border-[#ff4655]/40 text-[#ff4655]' :
    type === 'error' ? 'bg-cyber-black border-cyber-red/40 text-cyber-red' :
    'bg-cyber-black border-gray-700 text-gray-300'
  }`}>
    {type === 'success' ? <CheckCircle size={16} /> : <AlertTriangle size={16} />}
    {msg}
  </div>
);

// SVG arc health score ring
const HealthArc = ({ score }) => {
  const radius = 44;
  const circumference = 2 * Math.PI * radius;
  const filled = (score / 100) * circumference;
  const color = score >= 85 ? '#00ff88' : score >= 70 ? '#3b82f6' : score >= 50 ? '#f59e0b' : '#ff4655';

  return (
    <svg width="100" height="100" viewBox="0 0 100 100" className="rotate-[-90deg]">
      <circle cx="50" cy="50" r={radius} fill="none" stroke="#1a1a2e" strokeWidth="8" />
      <circle
        cx="50" cy="50" r={radius} fill="none"
        stroke={color} strokeWidth="8"
        strokeDasharray={circumference}
        strokeDashoffset={circumference - filled}
        strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 0.8s ease, stroke 0.4s ease' }}
      />
    </svg>
  );
};

const Overview = () => {
  const token = useStore((state) => state.token);
  const activeGuildId = useStore((state) => state.activeGuildId);
  const activeGuild = useStore((state) => state.activeGuild);
  const alerts = useStore((state) => state.alerts);
  const logsFeed = useStore((state) => state.logsFeed);

  const activeIncidents = useStore((state) => state.activeIncidents);
  const quarantinedCount = useStore((state) => state.quarantinedCount);
  const pendingReviews = useStore((state) => state.pendingReviews);
  const lastPlaybookTrigger = useStore((state) => state.lastPlaybookTrigger);

  const [stats, setStats] = useState({ joins: 0, leaves: 0, messages: 0, voice: 0 });
  const [settings, setSettings] = useState(null);
  const [loadingSim, setLoadingSim] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Fetch initial metrics and settings
  useEffect(() => {
    if (!activeGuildId || !token) return;

    fetch(`http://localhost:5000/api/analytics/${activeGuildId}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        if (data.summary) {
          setStats({
            joins: data.summary.totalJoins,
            leaves: data.summary.totalLeaves,
            messages: data.summary.totalMessages,
            voice: Math.round(data.summary.totalVoiceMinutes / 60)
          });
        }
      })
      .catch(err => console.error('Error fetching analytics:', err));

    fetch(`http://localhost:5000/api/guilds/${activeGuildId}/settings`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => setSettings(data))
      .catch(err => console.error('Error fetching settings:', err));
  }, [activeGuildId, alerts, token]);

  // Simulation runner
  const runSimulation = async (type) => {
    setLoadingSim(type);
    try {
      let endpoint = '';
      let body = {};

      if (type === 'join') {
        endpoint = 'join';
        body = { username: `Suspect_${Math.random().toString(36).substr(2, 5)}`, ageDays: Math.floor(Math.random() * 10) === 0 ? 0 : 35 };
      } else if (type === 'spam') {
        endpoint = 'spam';
        body = { username: 'VoidSpammer' };
      } else if (type === 'nuke') {
        endpoint = 'nuke';
        body = { username: 'ShadowBlade' };
      }

      const res = await fetch(`http://localhost:5000/api/security/${activeGuildId}/simulate/${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(body)
      });

      if (res.ok) {
        const labels = { join: 'Member join simulation fired', spam: 'Anti-Spam trigger simulation sent', nuke: 'Anti-Nuke critical simulation triggered' };
        showToast(`✅ ${labels[type]}`, 'success');
      } else {
        showToast('⚠️ Simulation failed – check server logs', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('⚠️ Connection error', 'error');
    } finally {
      setLoadingSim(null);
    }
  };

  // Health Score
  const calculateHealthScore = () => {
    if (!settings) return 0;
    let score = 0;
    if (settings.verification_enabled) score += 15;
    if (settings.anti_raid_enabled) score += 20;
    if (settings.anti_nuke_enabled) score += 20;
    if (settings.ai_moderation_enabled) score += 15;
    if (settings.anti_spam_enabled) score += 15;
    if (settings.anti_scam_enabled || settings.anti_malware_enabled) score += 15;
    return score;
  };

  const score = calculateHealthScore();

  const getRating = (s) => {
    if (s >= 85) return { name: 'Excellent', color: 'text-emerald-400' };
    if (s >= 70) return { name: 'Good', color: 'text-blue-400' };
    if (s >= 50) return { name: 'Moderate', color: 'text-yellow-400' };
    return { name: 'Critical', color: 'text-[#ff4655]' };
  };

  const rating = getRating(score);

  const statCards = [
    {
      name: 'SOC Active Incidents',
      value: activeIncidents.toString(),
      sub: 'Requiring priority response',
      icon: ShieldAlert,
      accent: activeIncidents > 0 ? '#ff4655' : '#00ff88',
      pulse: activeIncidents > 0
    },
    {
      name: 'Quarantined Members',
      value: quarantinedCount.toString(),
      sub: 'Isolated in detention role',
      icon: AlertTriangle,
      accent: quarantinedCount > 0 ? 'orange' : '#a0aec0'
    },
    {
      name: 'Pending Screening Queue',
      value: pendingReviews.toString(),
      sub: 'Awaiting verification',
      icon: Users,
      accent: pendingReviews > 0 ? '#bf55ec' : '#a0aec0'
    },
    {
      name: 'Server Health Score',
      value: `${score}/100`,
      sub: `Rating: ${rating.name}`,
      icon: ShieldCheck,
      accent: score >= 70 ? '#00ff88' : '#ff4655'
    }
  ];

  const simButtons = [
    { type: 'join', label: 'Simulate Member Join', accent: '#ff4655' },
    { type: 'spam', label: 'Simulate Anti-Spam Trigger', accent: '#ff4655' },
    { type: 'nuke', label: 'Simulate Anti-Nuke (Critical)', accent: '#bf55ec' }
  ];

  return (
    <div className="space-y-6">
      {toast && <Toast msg={toast.msg} type={toast.type} />}

      {/* Welcome Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          {activeGuild?.icon_url ? (
            <img src={activeGuild.icon_url} alt="" className="w-12 h-12 rounded-xl border border-[#ff4655]/20" />
          ) : (
            <div className="w-12 h-12 rounded-xl bg-[#ff4655]/10 border border-[#ff4655]/25 flex items-center justify-center font-black text-[#ff4655] text-lg">
              {activeGuild?.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
            </div>
          )}
          <div>
            <h2 className="text-2xl font-black text-white m-0 tracking-wide">{activeGuild?.name} Console</h2>
            <p className="text-xs text-gray-400 mt-1 m-0">Live cybersecurity metrics and threat telemetry node.</p>
          </div>
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#ff4655]/10 border border-[#ff4655]/20">
          <span className="w-2 h-2 rounded-full bg-[#ff4655] animate-ping" />
          <span className="text-[10px] font-bold text-[#ff4655] uppercase tracking-widest">Active Node Live</span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-5">
        {statCards.map((c, i) => {
          const Icon = c.icon;
          return (
            <div key={i} className="glass-panel p-5 rounded-2xl border border-gray-800 hover:border-[#ff4655]/20 transition-all">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">{c.name}</p>
                  <h3 className={`text-2xl font-black mt-2 m-0 ${c.pulse ? 'animate-pulse' : ''}`} style={{ color: c.accent }}>
                    {c.value}
                  </h3>
                </div>
                <div className="p-2 rounded-xl bg-gray-900/80 shadow-glow" style={{ color: c.accent }}>
                  <Icon size={18} />
                </div>
              </div>
              <span className="text-[10px] text-gray-500 mt-3 block">{c.sub}</span>
            </div>
          );
        })}
      </div>

      {/* Security Health Score & Simulation grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Server Health Score Widget */}
        <div className="glass-panel p-6 rounded-2xl border border-gray-800 lg:col-span-1 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2 uppercase tracking-wider font-mono">
              <ShieldAlert size={16} className="text-[#ff4655]" />
              Security Health Score
            </h3>

            {/* Score circle meter with SVG arc */}
            <div className="flex items-center gap-5 my-4">
              <div className="relative flex items-center justify-center w-24 h-24">
                <HealthArc score={score} />
                <div className="absolute flex flex-col items-center">
                  <span className="text-2xl font-black text-white leading-none">{score}</span>
                  <span className="text-[9px] text-gray-500 font-mono">/100</span>
                </div>
              </div>
              <div>
                <span className={`text-xl font-black ${rating.color} block`}>{rating.name}</span>
                <span className="text-xs text-gray-400 mt-1 block">Security Rating level</span>
              </div>
            </div>

            {/* Security checklist */}
            <div className="space-y-2 border-t border-gray-800/80 pt-4">
              {[
                { name: 'Zero-Trust Gatekeeper', checked: settings?.verification_enabled, pts: 15 },
                { name: 'Anti-Raid Defenses', checked: settings?.anti_raid_enabled, pts: 20 },
                { name: 'Anti-Nuke Vault Guard', checked: settings?.anti_nuke_enabled, pts: 20 },
                { name: 'AI Incident Analysis', checked: settings?.ai_moderation_enabled, pts: 15 },
                { name: 'Anti-Spam Thresholds', checked: settings?.anti_spam_enabled, pts: 15 },
                { name: 'Phishing Scanner', checked: settings?.anti_scam_enabled || settings?.anti_malware_enabled, pts: 15 }
              ].map((item, idx) => (
                <div key={idx} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 text-gray-300">
                    {item.checked ? (
                      <CheckCircle2 size={14} className="text-[#ff4655]" />
                    ) : (
                      <XCircle size={14} className="text-gray-600" />
                    )}
                    <span className={item.checked ? 'text-gray-300' : 'text-gray-600 line-through'}>
                      {item.name}
                    </span>
                  </div>
                  <span className="text-gray-600 font-mono">+{item.pts} pt</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Threat Emulators & Playbooks */}
        <div className="space-y-6 lg:col-span-1">
          <div className="glass-panel p-6 rounded-2xl border border-gray-800">
            <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-2 uppercase tracking-wider font-mono">
              <Flame size={16} className="text-[#ff4655]" />
              Threat Emulators
            </h3>
            <p className="text-xs text-gray-500 mb-5 leading-relaxed">
              Trigger automated events to verify the Risk Engine, anti-spam block rules, and anti-nuke alert quarantine features instantly.
            </p>

            <div className="space-y-3">
              {simButtons.map(({ type, label, accent }) => (
                <button
                  key={type}
                  onClick={() => runSimulation(type)}
                  disabled={loadingSim !== null}
                  className="w-full bg-cyber-black hover:bg-gray-900 border border-gray-800 hover:border-[#ff4655]/30 py-3 px-4 rounded-xl flex items-center justify-between text-xs text-gray-300 transition-all group disabled:opacity-50"
                >
                  <span className="group-hover:text-white transition-colors">{label}</span>
                  {loadingSim === type ? (
                    <div className="w-3 h-3 border border-gray-500 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Play size={12} style={{ color: accent }} />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Last Playbook Triggered */}
          {lastPlaybookTrigger && (
            <div className="glass-panel p-5 rounded-2xl border border-[#bf55ec]/20 bg-[#bf55ec]/5 shadow-glow">
              <h3 className="text-xs font-black text-white mb-3 flex items-center gap-2 uppercase tracking-wider font-mono">
                <Zap size={14} className="text-[#bf55ec] animate-pulse" />
                Active Playbook Telemetry
              </h3>
              <div>
                <p className="text-xs font-bold text-white">{lastPlaybookTrigger.name}</p>
                <div className="mt-2 space-y-1">
                  <p className="text-[10px] text-gray-400"><span className="font-bold text-gray-500">Trigger:</span> {lastPlaybookTrigger.trigger}</p>
                  <p className="text-[10px] text-gray-400"><span className="font-bold text-gray-500">Actions Executed:</span></p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {(Array.isArray(lastPlaybookTrigger.actions) ? lastPlaybookTrigger.actions : []).map((action, idx) => (
                      <span key={idx} className="px-1.5 py-0.5 rounded bg-gray-900 border border-gray-800 text-gray-400 text-[9px] font-mono uppercase">{action}</span>
                    ))}
                  </div>
                </div>
                <span className="text-[9px] text-gray-500 font-mono mt-3 block text-right">
                  Executed at {new Date(lastPlaybookTrigger.timestamp).toLocaleTimeString()}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Real-time Threat Feed */}
        <div className="glass-panel p-6 rounded-2xl border border-gray-800 lg:col-span-1 flex flex-col h-96 lg:h-auto">
          <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2 uppercase tracking-wider font-mono">
            <Clock size={16} className="text-[#bf55ec]" />
            Realtime Threat Feed
          </h3>
          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            {alerts.length === 0 && logsFeed.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center text-gray-500 gap-3">
                <ShieldCheck size={32} className="text-[#ff4655]/25 animate-pulse" />
                <span className="text-xs font-mono">Telemetry Secure. No threats.</span>
              </div>
            ) : (
              <>
                {alerts.map((alert, idx) => (
                  <div key={`alert-${idx}`} className="p-3 bg-[#ff4655]/8 border border-[#ff4655]/20 rounded-xl">
                    <span className="text-[10px] font-bold text-[#ff4655] uppercase tracking-wider block">Security Alert</span>
                    <span className="text-xs text-gray-200 mt-1 block leading-relaxed">{alert.message}</span>
                    {alert.details && <span className="text-[10px] text-gray-500 block mt-0.5">{alert.details}</span>}
                  </div>
                ))}
                {logsFeed.map((feed, idx) => (
                  <div key={`feed-${idx}`} className="p-3 bg-gray-900/40 border border-gray-800 rounded-xl">
                    <span className="text-[10px] font-bold text-[#bf55ec] uppercase tracking-wider block">{feed.eventType}</span>
                    <span className="text-xs text-gray-300 mt-1 block leading-relaxed">
                      {feed.data.action || JSON.stringify(feed.data)}
                    </span>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Overview;
