import React, { useState, useEffect } from 'react';
import { Webhook, Plus, Trash2, Edit2, Zap, Check, X, AlertTriangle, RefreshCw, Globe, ToggleLeft, ToggleRight } from 'lucide-react';
import useStore from '../store/useStore';

const ALL_EVENTS = [
  { id: 'security_alert',    label: 'Security Alerts',     color: '#ff4655' },
  { id: 'raid_detected',     label: 'Raid Detection',       color: '#ff4655' },
  { id: 'alt_detected',      label: 'Alt Detected',         color: '#f59e0b' },
  { id: 'verification_event',label: 'Verification Events',  color: '#3b82f6' },
  { id: 'backup_complete',   label: 'Backup Completion',    color: '#22d3ee' },
  { id: 'ticket_created',    label: 'Ticket Created',       color: '#bf55ec' },
  { id: 'emergency_action',  label: 'Emergency Actions',    color: '#ff4655' },
  { id: 'audit_complete',    label: 'Audit Complete',       color: '#00ff88' }
];

const Integrations = () => {
  const { token, activeGuildId } = useStore();
  const [webhooks, setWebhooks] = useState([]);
  const [modal, setModal] = useState(null); // 'add' | 'edit'
  const [editTarget, setEditTarget] = useState(null);
  const [form, setForm] = useState({ name: '', url: '', events: [] });
  const [saving, setSaving] = useState(false);
  const [testLoading, setTestLoading] = useState(null);
  const [testResults, setTestResults] = useState({});
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = 'success') => { setToast({ msg, type }); setTimeout(() => setToast(null), 3000); };

  const fetchWebhooks = async () => {
    if (!activeGuildId || !token) return;
    try {
      const res = await fetch(`http://localhost:5000/api/integrations/${activeGuildId}/webhooks`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setWebhooks(Array.isArray(data) ? data : []);
    } catch (err) { console.error(err); }
  };

  const socket = useStore((state) => state.socket);

  useEffect(() => { fetchWebhooks(); }, [activeGuildId, token]);

  useEffect(() => {
    if (!socket) return;
    const handleRealtimeUpdate = () => {
      fetchWebhooks();
    };
    socket.on('webhooks_updated', handleRealtimeUpdate);
    return () => {
      socket.off('webhooks_updated', handleRealtimeUpdate);
    };
  }, [socket, activeGuildId]);

  const openAdd = () => { setForm({ name: '', url: '', events: [] }); setEditTarget(null); setModal('add'); };
  const openEdit = (wh) => { setForm({ name: wh.name, url: wh.url, events: wh.events || [] }); setEditTarget(wh); setModal('edit'); };

  const save = async () => {
    if (!form.name || !form.url) return;
    setSaving(true);
    try {
      const method = modal === 'edit' ? 'PUT' : 'POST';
      const url = modal === 'edit'
        ? `http://localhost:5000/api/integrations/${activeGuildId}/webhooks/${editTarget.id}`
        : `http://localhost:5000/api/integrations/${activeGuildId}/webhooks`;
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(form)
      });
      if (res.ok) { showToast(`✅ Webhook ${modal === 'edit' ? 'updated' : 'created'}`); setModal(null); fetchWebhooks(); }
      else { const e = await res.json(); showToast(`⚠️ ${e.error}`, 'error'); }
    } catch { showToast('⚠️ Error', 'error'); }
    finally { setSaving(false); }
  };

  const remove = async (id) => {
    if (!confirm('Delete this webhook?')) return;
    try {
      await fetch(`http://localhost:5000/api/integrations/${activeGuildId}/webhooks/${id}`, {
        method: 'DELETE', headers: { Authorization: `Bearer ${token}` }
      });
      showToast('✅ Webhook deleted'); fetchWebhooks();
    } catch { showToast('⚠️ Error', 'error'); }
  };

  const toggleEnabled = async (wh) => {
    try {
      await fetch(`http://localhost:5000/api/integrations/${activeGuildId}/webhooks/${wh.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ enabled: !wh.enabled })
      });
      fetchWebhooks();
    } catch { showToast('⚠️ Error', 'error'); }
  };

  const testWebhook = async (id) => {
    setTestLoading(id);
    try {
      const res = await fetch(`http://localhost:5000/api/integrations/${activeGuildId}/webhooks/${id}/test`, {
        method: 'POST', headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setTestResults(prev => ({ ...prev, [id]: data }));
      showToast(data.success ? `✅ Test sent (${data.status})` : `⚠️ Test failed (${data.status})`, data.success ? 'success' : 'error');
      fetchWebhooks();
    } catch { showToast('⚠️ Connection error', 'error'); }
    finally { setTestLoading(null); }
  };

  const toggleEvent = (evId) => setForm(f => ({
    ...f, events: f.events.includes(evId) ? f.events.filter(e => e !== evId) : [...f.events, evId]
  }));

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
          <div className="bg-[#0a0b0f] border border-[#ff4655]/20 rounded-2xl p-6 w-full max-w-lg mx-4 shadow-glow space-y-5 max-h-[90vh] overflow-y-auto">
            <h3 className="text-base font-black text-white">{modal === 'edit' ? 'Edit Webhook' : 'New Webhook'}</h3>
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1.5">Webhook Name</label>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Security Alerts → #staff-alerts"
                className="w-full bg-gray-900 border border-gray-700 text-white text-sm p-3 rounded-xl outline-none focus:border-[#ff4655]/40 transition-colors placeholder-gray-600" />
            </div>
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1.5">Webhook URL</label>
              <input value={form.url} onChange={e => setForm(f => ({ ...f, url: e.target.value }))}
                placeholder="https://discord.com/api/webhooks/..."
                className="w-full bg-gray-900 border border-gray-700 text-white text-sm p-3 rounded-xl outline-none focus:border-[#ff4655]/40 transition-colors placeholder-gray-600 font-mono" />
            </div>
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-2">Events to Forward</label>
              <div className="grid grid-cols-2 gap-2">
                {ALL_EVENTS.map(ev => {
                  const selected = form.events.includes(ev.id);
                  return (
                    <button key={ev.id} onClick={() => toggleEvent(ev.id)} type="button"
                      className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-medium transition-all text-left ${selected ? 'bg-[#ff4655]/10 border-[#ff4655]/30 text-white' : 'bg-gray-900 border-gray-800 text-gray-500 hover:border-gray-700'}`}>
                      <div className={`w-4 h-4 rounded flex items-center justify-center border transition-all ${selected ? 'bg-[#ff4655] border-[#ff4655]' : 'border-gray-600 bg-gray-800'}`}>
                        {selected && <Check size={9} className="text-white" />}
                      </div>
                      {ev.label}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="flex gap-3 pt-1">
              <button onClick={() => setModal(null)} className="flex-1 py-2.5 rounded-xl border border-gray-700 text-gray-400 text-sm font-bold hover:border-gray-600 transition-all">Cancel</button>
              <button onClick={save} disabled={saving || !form.name || !form.url}
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
          <h2 className="text-2xl font-black text-white tracking-wide">Integrations & Webhooks</h2>
          <p className="text-xs text-gray-400 mt-1">Forward AEGIS X security events to external endpoints.</p>
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-rage text-white text-xs font-black hover:opacity-90 transition-all shadow-glow">
          <Plus size={13} /> New Webhook
        </button>
      </div>

      {/* Webhooks List */}
      {webhooks.length === 0 ? (
        <div className="glass-panel rounded-2xl border border-gray-800 flex flex-col items-center justify-center h-48 text-gray-500 gap-3">
          <Globe size={36} className="text-[#ff4655]/20" />
          <span className="text-sm">No webhooks configured.</span>
          <button onClick={openAdd} className="text-xs text-[#ff4655] underline">Create your first webhook</button>
        </div>
      ) : (
        <div className="space-y-4">
          {webhooks.map(wh => {
            const testRes = testResults[wh.id];
            return (
              <div key={wh.id} className={`glass-panel p-5 rounded-2xl border transition-all ${wh.enabled ? 'border-gray-800 hover:border-[#ff4655]/20' : 'border-gray-800/50 opacity-60'}`}>
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="text-sm font-black text-white">{wh.name}</h4>
                      <span className={`px-2 py-0.5 rounded-md text-[9px] font-black border ${wh.enabled ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-gray-800 border-gray-700 text-gray-500'}`}>
                        {wh.enabled ? 'ACTIVE' : 'DISABLED'}
                      </span>
                    </div>
                    <p className="text-[10px] text-gray-500 font-mono truncate">{wh.url}</p>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {(wh.events || []).map(ev => {
                        const evDef = ALL_EVENTS.find(e => e.id === ev);
                        return evDef ? (
                          <span key={ev} className="px-1.5 py-0.5 rounded-md text-[9px] font-bold bg-gray-900 border border-gray-800 text-gray-400">{evDef.label}</span>
                        ) : null;
                      })}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {wh.last_triggered && (
                      <span className="text-[10px] text-gray-500 hidden md:block">
                        Last: {new Date(wh.last_triggered).toLocaleDateString()}
                        {wh.last_status && <span className={` ml-1 font-mono ${wh.last_status === 200 ? 'text-emerald-400' : 'text-[#ff4655]'}`}>{wh.last_status}</span>}
                      </span>
                    )}
                    <button onClick={() => testWebhook(wh.id)} disabled={testLoading === wh.id}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-gray-900 border border-gray-800 hover:border-[#ff4655]/30 text-[10px] text-gray-400 hover:text-[#ff4655] transition-all disabled:opacity-50">
                      {testLoading === wh.id ? <RefreshCw size={10} className="animate-spin" /> : <Zap size={10} />} Test
                    </button>
                    <button onClick={() => toggleEnabled(wh)} className="p-1.5 rounded-lg bg-gray-900 border border-gray-800 hover:border-gray-700 text-gray-400 transition-all">
                      {wh.enabled ? <ToggleRight size={14} className="text-emerald-400" /> : <ToggleLeft size={14} />}
                    </button>
                    <button onClick={() => openEdit(wh)} className="p-1.5 rounded-lg bg-gray-900 border border-gray-800 hover:border-[#ff4655]/30 text-gray-400 hover:text-[#ff4655] transition-all"><Edit2 size={12} /></button>
                    <button onClick={() => remove(wh.id)} className="p-1.5 rounded-lg bg-gray-900 border border-gray-800 hover:border-red-500/30 text-gray-400 hover:text-red-400 transition-all"><Trash2 size={12} /></button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Event Reference */}
      <div className="glass-panel p-5 rounded-2xl border border-gray-800">
        <h3 className="text-sm font-bold text-white mb-3 uppercase tracking-wider font-mono flex items-center gap-2">
          <Webhook size={14} className="text-[#bf55ec]" /> Supported Events
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {ALL_EVENTS.map(ev => (
            <div key={ev.id} className="p-2.5 rounded-xl bg-gray-900/60 border border-gray-800">
              <p className="text-xs font-bold text-white">{ev.label}</p>
              <p className="text-[10px] text-gray-500 font-mono mt-0.5">{ev.id}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Integrations;
