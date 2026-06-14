import { create } from 'zustand';
import { io } from 'socket.io-client';

const useStore = create((set, get) => ({
  token: localStorage.getItem('aegis_token') || null,
  user: null,
  guilds: [],
  activeGuildId: null,
  activeGuild: null,
  guildSettings: null,
  socket: null,
  logsFeed: [],
  alerts: [],
  lockdownActive: false,
  // v2.0 SOC state
  activeIncidents: 0,
  quarantinedCount: 0,
  pendingReviews: 0,
  recentAltDetections: [],
  lastPlaybookTrigger: null,

  // Authentications
  setToken: (token) => {
    if (token) {
      localStorage.setItem('aegis_token', token);
    } else {
      localStorage.removeItem('aegis_token');
    }
    set({ token });
  },

  setUser: (user) => set({ user }),

  setGuilds: (guilds) => set({ guilds }),

  setActiveGuild: (activeGuild) => {
    const { socket } = get();
    if (socket && activeGuild) {
      socket.emit('subscribe', activeGuild.id);
    }
    set({ 
      activeGuild, 
      activeGuildId: activeGuild ? activeGuild.id : null 
    });
  },

  setActiveGuildId: (activeGuildId) => {
    const { socket, guilds } = get();
    if (socket && activeGuildId) {
      socket.emit('subscribe', activeGuildId);
    }
    const activeGuild = guilds.find(g => g.id === activeGuildId) || null;
    set({ activeGuildId, activeGuild });
  },

  fetchGuilds: async (refresh = false) => {
    const { token } = get();
    if (!token) return;
    try {
      const url = `http://localhost:5000/api/guilds${refresh ? '?refresh=true' : ''}`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        set({ guilds: data });
        const { activeGuildId } = get();
        if (data.length > 0 && !activeGuildId) {
          const defaultGuild = data.find(g => g.bot_status === 'ONLINE');
          if (defaultGuild) {
            set({ activeGuild: defaultGuild, activeGuildId: defaultGuild.id });
          }
        } else if (activeGuildId) {
          const updatedActive = data.find(g => g.id === activeGuildId);
          if (updatedActive) {
            set({ activeGuild: updatedActive });
          }
        }
      }
    } catch (err) {
      console.error('Error fetching guilds:', err);
    }
  },

  logout: () => {
    localStorage.removeItem('aegis_token');
    const { socket } = get();
    if (socket) socket.disconnect();
    set({ 
      token: null, 
      user: null, 
      guilds: [], 
      activeGuildId: null, 
      activeGuild: null, 
      guildSettings: null, 
      socket: null, 
      logsFeed: [], 
      alerts: [],
      lockdownActive: false,
      activeIncidents: 0,
      quarantinedCount: 0,
      pendingReviews: 0,
      recentAltDetections: [],
      lastPlaybookTrigger: null
    });
  },

  // Guild Settings
  setGuildSettings: (guildSettings) => set({ guildSettings }),

  setLockdown: (active) => set({ lockdownActive: active }),

  // v2.0 SOC counters
  incrementQuarantined: () => set(s => ({ quarantinedCount: s.quarantinedCount + 1 })),
  decrementPendingReviews: () => set(s => ({ pendingReviews: Math.max(0, s.pendingReviews - 1) })),

  // Real-time Event System
  initSocket: (token) => {
    const existingSocket = get().socket;
    if (existingSocket) return;

    const socketUrl = 'http://localhost:5000';
    console.log(`🔌 Connecting to Socket.IO Server: ${socketUrl}`);
    const socket = io(socketUrl, {
      auth: { token }
    });

    socket.on('connect', () => {
      console.log('🔌 Socket.IO connected successfully.');
      const { activeGuildId } = get();
      if (activeGuildId) {
        socket.emit('subscribe', activeGuildId);
      }
    });

    // ── Core events ─────────────────────────────────────────────────────────
    socket.on('global_feed', (log) => {
      set((state) => ({
        logsFeed: [log, ...state.logsFeed].slice(0, 100)
      }));
    });

    socket.on('security_alert', (alert) => {
      set((state) => ({
        alerts: [alert, ...state.alerts].slice(0, 50)
      }));
      if (alert.type === 'ANTI_NUKE_LOCKDOWN') {
        set({ lockdownActive: true });
      }
    });

    socket.on('server_lockdown', (data) => {
      set({ lockdownActive: data.enabled });
    });

    // ── v2.0 SOC events ──────────────────────────────────────────────────────
    socket.on('alt_detected', (data) => {
      console.log('🔍 Alt detected:', data.username, data.riskLevel);
      set((state) => ({
        recentAltDetections: [data, ...state.recentAltDetections].slice(0, 20),
        alerts: [{
          type: 'ALT_DETECTED',
          severity: data.riskLevel === 'CONFIRMED_ALT' ? 'CRITICAL' : 'HIGH',
          message: data.message || `Alt detected: ${data.username} (${data.riskLevel})`,
          timestamp: new Date().toISOString()
        }, ...state.alerts].slice(0, 50)
      }));
      if (data.riskLevel === 'CONFIRMED_ALT') {
        set(s => ({ quarantinedCount: s.quarantinedCount + 1 }));
      }
    });

    socket.on('audit_complete', (data) => {
      console.log('🔎 Audit complete: score', data.score);
      set((state) => ({
        alerts: [{
          type: 'AUDIT_COMPLETE',
          severity: data.score < 50 ? 'HIGH' : 'LOW',
          message: `Security audit complete — Score: ${data.score}/100 (${data.criticalCount || 0} critical findings)`,
          timestamp: new Date().toISOString()
        }, ...state.alerts].slice(0, 50)
      }));
    });

    socket.on('emergency_action', (data) => {
      console.log('🚨 Emergency action:', data.action);
      set((state) => ({
        alerts: [{
          type: 'EMERGENCY_ACTION',
          severity: 'CRITICAL',
          message: `Emergency: ${data.action?.replace(/_/g, ' ')} — ${data.reason || 'No reason provided'}`,
          timestamp: new Date().toISOString()
        }, ...state.alerts].slice(0, 50)
      }));
    });

    socket.on('playbook_triggered', (data) => {
      console.log('⚡ Playbook triggered:', data.playbookName);
      set({
        lastPlaybookTrigger: {
          name: data.playbookName,
          trigger: data.triggerType,
          actions: data.actions,
          timestamp: data.timestamp
        }
      });
      set((state) => ({
        alerts: [{
          type: 'PLAYBOOK_TRIGGERED',
          severity: 'MEDIUM',
          message: `Playbook "${data.playbookName}" executed for ${data.offenderUsername || 'unknown user'}`,
          timestamp: new Date().toISOString()
        }, ...state.alerts].slice(0, 50)
      }));
    });

    socket.on('join_screening_result', (data) => {
      console.log('👤 Join screening result:', data.username, '→', data.decision);
      if (data.decision === 'PENDING') {
        set(s => ({ pendingReviews: s.pendingReviews + 1 }));
      } else if (data.decision === 'QUARANTINED') {
        set(s => ({ quarantinedCount: s.quarantinedCount + 1 }));
      }
    });

    set({ socket });
  },

  addAlert: (alert) => {
    set((state) => ({
      alerts: [alert, ...state.alerts]
    }));
  }
}));

export default useStore;
