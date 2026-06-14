import React, { useState } from 'react';
import { 
  ShieldCheck, ArrowRight, BookOpen, Activity, Lock, Bot, Eye, 
  Terminal, Globe, Cpu, Check, AlertOctagon, RefreshCw
} from 'lucide-react';
import useStore from '../store/useStore';

const Login = () => {
  const [loading, setLoading] = useState(false);
  const setToken = useStore((state) => state.setToken);
  const setUser = useStore((state) => state.setUser);
  const initSocket = useStore((state) => state.initSocket);

  // Mock Identity Selector state
  const [showIdentitySelector, setShowIdentitySelector] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleIdentitySelect = async (mockCode) => {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: mockCode })
      });
      const data = await res.json();
      
      if (data.token) {
        setToken(data.token);
        setUser(data.user);
        initSocket(data.token);
      } else {
        setErrorMsg(data.error || 'Identity authorization failed');
      }
    } catch (err) {
      console.error('Login error:', err);
      setErrorMsg('Uplink communication failed. Is backend running?');
    } finally {
      setLoading(false);
    }
  };

  const handleRealDiscordLogin = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      // Get auth URL from backend
      const res = await fetch('http://localhost:5000/api/auth/discord-url');
      const data = await res.json();
      if (data.url) {
        // Redirect to Discord OAuth
        window.location.href = data.url;
      } else {
        // Fallback to mock selector if something's wrong
        setShowIdentitySelector(true);
      }
    } catch (err) {
      console.error(err);
      // Fallback
      setShowIdentitySelector(true);
    } finally {
      setLoading(false);
    }
  };

  const features = [
    { title: 'Self-Healing Shield', desc: 'Realtime Anti-Nuke, Anti-Raid, and quarantine actions protect servers.', icon: Lock, color: 'text-cyber-green', border: 'border-cyber-green/30' },
    { title: 'AI Risk Moderator', desc: 'Vulnerability threat detection, audit analysis, and spam mitigation.', icon: Cpu, color: 'text-cyber-blue', border: 'border-cyber-blue/30' },
    { title: 'Operator Desk', desc: 'Secure staff action logs, backups snapshots, and transcripts.', icon: Terminal, color: 'text-cyber-purple', border: 'border-cyber-purple/30' },
    { title: 'Gateway Access', desc: 'Secure verification desk and membership role assignments.', icon: Globe, color: 'text-cyber-yellow', border: 'border-cyber-yellow/30' }
  ];

  return (
    <div className="min-h-screen bg-cyber-black flex flex-col justify-between p-6 relative overflow-hidden text-gray-100">
      {/* Immersive background decoration */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-[#ff4655]/5 blur-3xl animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-[#bf55ec]/5 blur-3xl animate-pulse" />
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#ff4655]/20 to-transparent" />

      {/* Header Panel */}
      <header className="max-w-7xl mx-auto w-full flex justify-between items-center py-4 relative z-10 border-b border-gray-800/40">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-rage flex items-center justify-center font-bold text-white text-xl rage-glow-red">
            Æ
          </div>
          <div>
            <h1 className="text-lg font-black tracking-wider text-white m-0 uppercase flex items-center gap-1">
              AEGIS <span className="text-gradient-rage">X</span>
            </h1>
            <span className="text-[10px] text-[#ff4655] font-bold uppercase tracking-widest block">Core Console</span>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <a href="#docs" className="text-xs font-semibold text-gray-400 hover:text-white transition-colors flex items-center gap-1.5 no-underline">
            <BookOpen size={14} />
            Documentation
          </a>
          <div className="flex items-center gap-1.5 text-xs text-[#ff4655] font-semibold uppercase bg-[#ff4655]/5 border border-[#ff4655]/20 px-3 py-1 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-[#ff4655] animate-ping" />
            <Activity size={12} className="ml-0.5" />
            Operational
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto w-full py-12 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center relative z-10 my-auto">
        {/* Left column: Hero info */}
        <div className="space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#ff4655]/10 border border-[#ff4655]/25 text-[#ff4655] text-xs font-bold uppercase tracking-wider rounded-full">
            <ShieldCheck size={12} />
            AI-POWERED SECURED INTEGRATION
          </div>
          <h2 className="text-4xl sm:text-5xl font-black text-white leading-tight tracking-tight m-0">
            Self-Healing Cyber Defense for <span className="text-gradient-rage">Discord Servers</span>
          </h2>
          <p className="text-gray-400 leading-relaxed text-md m-0">
            AEGIS X replaces fragile, manual server controls with automated risk assessments, anti-nuke lockdowns, and zero-trust verification pipelines. Log in with Discord to activate your security nodes.
          </p>

          <div className="flex flex-wrap gap-4 pt-2">
            <button
              onClick={handleRealDiscordLogin}
              disabled={loading}
              className="bg-gradient-rage text-white font-extrabold py-3 px-6 rounded-xl flex items-center justify-center gap-2 hover:opacity-95 transition-all shadow-glow hover:shadow-neon-red"
            >
              {loading ? (
                <>
                  <RefreshCw size={18} className="animate-spin" />
                  <span>Connecting...</span>
                </>
              ) : (
                <>
                  <span>Login with Discord</span>
                  <ArrowRight size={18} />
                </>
              )}
            </button>
            <button
              onClick={() => window.open('https://discord.com/oauth2/authorize?client_id=1514678475988930691&permissions=8&integration_type=0&scope=bot', '_blank')}
              className="bg-cyber-darker hover:bg-cyber-dark border border-gray-800 text-white font-bold py-3 px-6 rounded-xl flex items-center justify-center gap-2 transition-all"
            >
              <Bot size={18} className="text-[#bf55ec]" />
              <span>Invite Bot Client</span>
            </button>
          </div>

          {errorMsg && (
            <div className="p-3 bg-cyber-red/10 border border-cyber-red/30 rounded-xl flex items-center gap-2 text-cyber-red text-xs font-mono max-w-md">
              <AlertOctagon size={16} />
              <span>{errorMsg}</span>
            </div>
          )}
        </div>

        {/* Right column: Features list */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {features.map((f, i) => {
            const Icon = f.icon;
            return (
              <div 
                key={i} 
                className="rage-panel p-5 rounded-2xl flex flex-col justify-between h-44"
              >
                <div className="w-10 h-10 rounded-xl bg-cyber-darker flex items-center justify-center text-[#ff4655] rage-glow-red">
                  <Icon size={20} />
                </div>
                <div className="mt-4">
                  <h4 className="text-sm font-bold text-white m-0">{f.title}</h4>
                  <p className="text-xs text-gray-500 mt-2 m-0 leading-relaxed">{f.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </main>

      {/* Footer bar */}
      <footer className="max-w-7xl mx-auto w-full text-center py-4 border-t border-gray-800/40 relative z-10 text-xs text-gray-650 font-mono">
        © 2026 AEGIS X SYSTEMS. INCIDENT THREAT LEVEL STATUS: COLD.
      </footer>

      {/* Simulated Discord OAuth Identity Modal (Mock mode choice) */}
      {showIdentitySelector && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-cyber-darker border border-[#ff4655]/25 p-8 rounded-2xl shadow-glow rage-glow-red relative animate-fade-in-up text-center">
            {/* Mock Discord Header */}
            <div className="flex flex-col items-center mb-6">
              <div className="w-14 h-14 bg-[#ff4655]/10 border border-[#ff4655]/30 rounded-full flex items-center justify-center text-[#ff4655] mb-3">
                <Globe size={28} />
              </div>
              <h3 className="text-lg font-black text-white m-0 tracking-wide uppercase">MOCK DISCORD AUTHORIZATION</h3>
              <p className="text-xs text-gray-450 mt-1.5 m-0 leading-relaxed font-mono">
                Authorize client access to scopes: `identify`, `guilds`, `email`
              </p>
            </div>

            <p className="text-xs text-gray-450 mb-6 leading-relaxed font-mono text-left bg-cyber-black p-3 rounded-xl border border-gray-800">
              ⚠️ <strong>Developer Notice:</strong> Choose an operator identity to simulate the authorization handshake and test role-based layout clearance levels:
            </p>

            {/* Operator Options grid */}
            <div className="space-y-3">
              {[
                { name: 'ShadowBlade', code: 'mock_code_shadowblade', roles: 'Owner / Admin / Moderator / Support', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100' },
                { name: 'NeonRyder', code: 'mock_code_neonryder', roles: 'Support / DJ', avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100' },
                { name: 'CyberGlitch', code: 'mock_code_cyberglitch', roles: 'DJ / Security Director', avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=100' }
              ].map((op) => (
                <button
                  key={op.code}
                  onClick={() => handleIdentitySelect(op.code)}
                  className="w-full bg-cyber-black hover:bg-cyber-dark border border-gray-800 hover:border-[#ff4655]/50 p-3 rounded-xl flex items-center justify-between text-left transition-all duration-200 group"
                >
                  <div className="flex items-center gap-3">
                    <img src={op.avatar} alt={op.name} className="w-9 h-9 rounded-full border border-gray-800" />
                    <div>
                      <span className="text-xs font-black text-white group-hover:text-[#ff4655] transition-colors">{op.name}</span>
                      <span className="text-[10px] text-gray-500 block font-mono">{op.roles}</span>
                    </div>
                  </div>
                  <span className="text-[10px] text-gray-400 font-mono border border-gray-800 px-2 py-0.5 rounded-md group-hover:bg-gradient-rage group-hover:text-white group-hover:border-transparent transition-colors">
                    Authorize
                  </span>
                </button>
              ))}
            </div>

            <button
              onClick={() => setShowIdentitySelector(false)}
              className="mt-6 w-full text-xs text-gray-500 hover:text-white transition-colors font-mono"
            >
              Cancel Handshake
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Login;
