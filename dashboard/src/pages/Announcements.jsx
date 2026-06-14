import React, { useState, useEffect, useRef } from 'react';
import { Megaphone, Save, CheckCircle2, ShieldAlert, Sparkles, MessageSquare, LogOut, UserCheck } from 'lucide-react';
import useStore from '../store/useStore';

const Announcements = () => {
  const token = useStore((state) => state.token);
  const activeGuildId = useStore((state) => state.activeGuildId);
  const activeGuild = useStore((state) => state.guilds.find(g => g.id === state.activeGuildId));

  const [settings, setSettings] = useState({
    welcome_enabled: false,
    welcome_channel: 'general',
    welcome_message: 'Welcome [user] to [server]! You are member #[membercount].',
    welcome_dm_enabled: false,
    welcome_dm_message: 'Hello [username], welcome to [server]!',
    leave_enabled: false,
    leave_channel: 'general',
    leave_message: '[username] has left the server. We now have [membercount] members.',
    autorole_enabled: false,
    autorole_roles: '',
    welcome_embed: {
      enabled: false,
      color: '#e67e22',
      author_name: '',
      author_icon: '',
      title: '',
      title_url: '',
      description: '',
      thumbnail_url: '',
      image_url: '',
      footer_text: '',
      footer_icon: '',
      fields: []
    },
    welcome_dm_embed: {
      enabled: false,
      color: '#3498db',
      author_name: '',
      author_icon: '',
      title: '',
      title_url: '',
      description: '',
      thumbnail_url: '',
      image_url: '',
      footer_text: '',
      footer_icon: '',
      fields: []
    },
    leave_embed: {
      enabled: false,
      color: '#e74c3c',
      author_name: '',
      author_icon: '',
      title: '',
      title_url: '',
      description: '',
      thumbnail_url: '',
      image_url: '',
      footer_text: '',
      footer_icon: '',
      fields: []
    }
  });

  const [activeTab, setActiveTab] = useState('welcome');
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [simulationResult, setSimulationResult] = useState(null);
  const [guildRoles, setGuildRoles] = useState([]);
  const [guildChannels, setGuildChannels] = useState([]);

  // Refs for cursors to insert tags
  const welcomeTextRef = useRef(null);
  const dmTextRef = useRef(null);
  const leaveTextRef = useRef(null);

  useEffect(() => {
    if (!activeGuildId || !token) return;
    fetch(`http://localhost:5000/api/guilds/${activeGuildId}/roles`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setGuildRoles(data);
        }
      })
      .catch(err => console.error('Error fetching guild roles:', err));

    fetch(`http://localhost:5000/api/guilds/${activeGuildId}/channels`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setGuildChannels(data);
        }
      })
      .catch(err => console.error('Error fetching guild channels:', err));
  }, [activeGuildId, token]);

  useEffect(() => {
    fetch(`http://localhost:5000/api/guilds/${activeGuildId}/settings`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        if (data) {
          // Fill default structures if database rows return empty or old schema values
          const cleanData = {
            ...data,
            welcome_embed: {
              enabled: false,
              color: '#e67e22',
              author_name: '',
              author_icon: '',
              title: '',
              title_url: '',
              description: '',
              thumbnail_url: '',
              image_url: '',
              footer_text: '',
              footer_icon: '',
              fields: [],
              ...(data.welcome_embed || {})
            },
            welcome_dm_embed: {
              enabled: false,
              color: '#3498db',
              author_name: '',
              author_icon: '',
              title: '',
              title_url: '',
              description: '',
              thumbnail_url: '',
              image_url: '',
              footer_text: '',
              footer_icon: '',
              fields: [],
              ...(data.welcome_dm_embed || {})
            },
            leave_embed: {
              enabled: false,
              color: '#e74c3c',
              author_name: '',
              author_icon: '',
              title: '',
              title_url: '',
              description: '',
              thumbnail_url: '',
              image_url: '',
              footer_text: '',
              footer_icon: '',
              fields: [],
              ...(data.leave_embed || {})
            }
          };
          setSettings(cleanData);
        }
      })
      .catch(err => console.error(err));
  }, [activeGuildId, token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setSaved(false);

    try {
      const res = await fetch(`http://localhost:5000/api/guilds/${activeGuildId}/settings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(settings)
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const insertPlaceholder = (tab, tag) => {
    let targetField = '';
    let ref = null;

    if (tab === 'welcome') {
      targetField = 'welcome_message';
      ref = welcomeTextRef;
    } else if (tab === 'welcome_dm') {
      targetField = 'welcome_dm_message';
      ref = dmTextRef;
    } else if (tab === 'leave') {
      targetField = 'leave_message';
      ref = leaveTextRef;
    }

    if (!ref || !ref.current) return;

    const textarea = ref.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const value = settings[targetField] || '';
    const newValue = value.substring(0, start) + tag + value.substring(end);

    setSettings({
      ...settings,
      [targetField]: newValue
    });

    // Reset cursor focus
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + tag.length, start + tag.length);
    }, 0);
  };

  const resolveImagePlaceholder = (url) => {
    if (!url) return '';
    const userAvatar = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100';
    const guildIcon = activeGuild?.icon_url || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=80';
    return url
      .replace(/\[user_avatar\]/g, userAvatar)
      .replace(/\[useravatar\]/g, userAvatar)
      .replace(/\[avatar\]/g, userAvatar)
      .replace(/\[server_icon\]/g, guildIcon)
      .replace(/\[servericon\]/g, guildIcon)
      .replace(/\[icon\]/g, guildIcon);
  };

  const renderRichPreviewText = (template) => {
    if (!template) return '';
    const guildName = activeGuild?.name || 'AEGIS X HQ';
    const memberCount = activeGuild?.member_count || 1245;

    let resolved = template
      .replace(/\[username\]/g, 'ShadowBlade')
      .replace(/\[server\]/g, guildName)
      .replace(/\[membercount\]/g, memberCount.toString());

    const parts = resolved.split(/(\[user\]|<#\d+>)/g);
    return parts.map((part, index) => {
      if (part === '[user]') {
        return (
          <span key={index} className="bg-[#5865F2]/30 text-[#c9cdfb] font-semibold px-1 py-0.5 rounded text-xs select-none">
            @ShadowBlade
          </span>
        );
      } else if (part.startsWith('<#') && part.endsWith('>')) {
        const channelId = part.slice(2, -1);
        const channelObj = guildChannels.find(c => c.id === channelId);
        const channelName = channelObj ? channelObj.name : `channel-${channelId}`;
        return (
          <a
            key={index}
            href={`https://discord.com/channels/${activeGuildId}/${channelId}`}
            target="_blank"
            rel="noreferrer"
            className="bg-[#5865F2]/10 hover:bg-[#5865F2] text-[#c9cdfb] hover:text-white font-medium px-1 py-0.5 rounded transition-colors inline-flex items-center gap-0.5 cursor-pointer text-xs"
          >
            #{channelName}
          </a>
        );
      }
      return part;
    });
  };

  const triggerSimulation = async (type) => {
    setSimulationResult({ status: 'running', type });
    try {
      const endpoint = type === 'join' ? 'join' : 'leave';
      const body = type === 'join' 
        ? { username: 'KoyaUser', ageDays: 12 } 
        : { username: 'KoyaUser' };

      const res = await fetch(`http://localhost:5000/api/security/${activeGuildId}/simulate/${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (data.success) {
        setSimulationResult({
          status: 'success',
          type,
          message: type === 'join' 
            ? 'Member join event simulated successfully! Welcome alert broadcasted and auto-roles evaluated.'
            : 'Member leave event simulated successfully! Leave alert broadcasted.'
        });
      } else {
        setSimulationResult({ status: 'error', type, message: data.error || 'Simulation failed' });
      }
    } catch (err) {
      setSimulationResult({ status: 'error', type, message: err.message });
    }
    setTimeout(() => setSimulationResult(null), 5000);
  };

  // Map active Tab to embed configuration key
  const embedKeyMap = {
    welcome: 'welcome_embed',
    welcome_dm: 'welcome_dm_embed',
    leave: 'leave_embed'
  };

  const currentEmbedKey = embedKeyMap[activeTab];
  const embedConfig = settings[currentEmbedKey] || {
    enabled: false,
    color: '#e67e22',
    author_name: '',
    author_icon: '',
    title: '',
    title_url: '',
    description: '',
    thumbnail_url: '',
    image_url: '',
    footer_text: '',
    footer_icon: '',
    fields: []
  };

  // Discord Embed Preview UI component
  const DiscordEmbedPreview = ({ embed }) => {
    if (!embed || !embed.enabled) return null;
    return (
      <div 
        className="mt-2 bg-[#2b2d31] rounded border-l-[4px] overflow-hidden max-w-full"
        style={{ borderLeftColor: embed.color || '#e67e22' }}
      >
        <div className="p-3 space-y-2 text-xs text-[#dbdee1]">
          {/* Author */}
          {embed.author_name && (
            <div className="flex items-center gap-1.5">
              {embed.author_icon && (
                <img 
                  key={embed.author_icon}
                  src={resolveImagePlaceholder(embed.author_icon)} 
                  alt="" 
                  className="w-5 h-5 rounded-full object-cover flex-shrink-0" 
                  onLoad={(e) => { e.target.style.display = 'block'; }}
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
              )}
              <span className="font-semibold text-white text-[11px]">
                {renderRichPreviewText(embed.author_name)}
              </span>
            </div>
          )}

          {/* Title */}
          {embed.title && (
            <div className="font-bold text-white text-[13px] leading-snug">
              {embed.title_url ? (
                <a href={embed.title_url} target="_blank" rel="noopener noreferrer" className="text-[#00a8fc] hover:underline">
                  {renderRichPreviewText(embed.title)}
                </a>
              ) : (
                renderRichPreviewText(embed.title)
              )}
            </div>
          )}

          {/* Description & Thumbnail Flex */}
          <div className="flex gap-4 justify-between items-start">
            <div className="space-y-2 flex-1">
              {embed.description && (
                <p className="whitespace-pre-wrap leading-snug text-[11.5px] text-[#dbdee1]">
                  {renderRichPreviewText(embed.description)}
                </p>
              )}

              {/* Fields */}
              {embed.fields && embed.fields.length > 0 && (
                <div className="grid grid-cols-2 gap-2 mt-2 pt-1.5">
                  {embed.fields.map((field, idx) => (
                    <div 
                      key={idx} 
                      className={`${field.inline ? 'col-span-1' : 'col-span-2'} min-w-[100px]`}
                    >
                      <span className="block font-bold text-white text-[10.5px]">
                        {renderRichPreviewText(field.name)}
                      </span>
                      <span className="block text-[11px] text-[#dbdee1] mt-0.5">
                        {renderRichPreviewText(field.value)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {embed.thumbnail_url && (
              <img 
                key={embed.thumbnail_url}
                src={resolveImagePlaceholder(embed.thumbnail_url)} 
                alt="" 
                className="w-14 h-14 rounded object-cover flex-shrink-0"
                onLoad={(e) => { e.target.style.display = 'block'; }}
                onError={(e) => { e.target.style.display = 'none'; }}
              />
            )}
          </div>

          {/* Image */}
          {embed.image_url && (
            <div className="mt-2 rounded overflow-hidden max-h-[200px]">
              <img 
                key={embed.image_url}
                src={resolveImagePlaceholder(embed.image_url)} 
                alt="" 
                className="max-w-full max-h-[200px] object-cover rounded"
                onLoad={(e) => { e.target.style.display = 'block'; }}
                onError={(e) => { e.target.style.display = 'none'; }}
              />
            </div>
          )}

          {/* Footer */}
          {(embed.footer_text || embed.footer_icon) && (
            <div className="flex items-center gap-1.5 mt-2 pt-1 text-[9.5px] text-[#949ba4]">
              {embed.footer_icon && (
                <img 
                  key={embed.footer_icon}
                  src={resolveImagePlaceholder(embed.footer_icon)} 
                  alt="" 
                  className="w-4 h-4 rounded-full object-cover flex-shrink-0" 
                  onLoad={(e) => { e.target.style.display = 'block'; }}
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
              )}
              <span>{renderRichPreviewText(embed.footer_text || '')}</span>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-extrabold text-white flex items-center gap-2">
            <Megaphone className="text-cyber-green" />
            Welcome & Farewell
          </h2>
          <p className="text-sm text-gray-400">Configure automatic welcome messages, direct messages, and entrance roles.</p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => triggerSimulation('join')}
            disabled={simulationResult?.status === 'running'}
            className="bg-cyber-blue/10 hover:bg-cyber-blue/20 text-cyber-blue border border-cyber-blue/20 py-2 px-3 text-xs rounded-xl transition-all cursor-pointer font-bold disabled:opacity-50"
          >
            Simulate Join
          </button>
          <button
            onClick={() => triggerSimulation('leave')}
            disabled={simulationResult?.status === 'running'}
            className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 py-2 px-3 text-xs rounded-xl transition-all cursor-pointer font-bold disabled:opacity-50"
          >
            Simulate Leave
          </button>
        </div>
      </div>

      {saved && (
        <div className="p-4 bg-cyber-green/10 border border-cyber-green/20 rounded-xl flex items-center gap-3 text-xs text-cyber-green">
          <CheckCircle2 size={16} />
          <span>Announcements & Auto-Role configuration updated successfully.</span>
        </div>
      )}

      {simulationResult && (
        <div className={`p-4 rounded-xl border flex items-center gap-3 text-xs ${
          simulationResult.status === 'success' 
            ? 'bg-cyber-green/10 border-cyber-green/20 text-cyber-green'
            : simulationResult.status === 'error'
            ? 'bg-red-500/10 border-red-500/20 text-red-400'
            : 'bg-cyber-blue/10 border-cyber-blue/20 text-cyber-blue'
        }`}>
          <Sparkles size={16} className={simulationResult.status === 'running' ? 'animate-spin' : ''} />
          <span>{simulationResult.status === 'running' ? 'Triggering simulation event...' : simulationResult.message}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Settings Tabs */}
          <div className="flex bg-cyber-darker p-1 rounded-xl border border-gray-800 gap-1">
            <button
              type="button"
              onClick={() => setActiveTab('welcome')}
              className={`flex-1 flex justify-center items-center gap-2 py-2 text-xs rounded-lg font-bold transition-all cursor-pointer ${
                activeTab === 'welcome' ? 'bg-cyber-green/10 text-cyber-green border border-cyber-green/20' : 'text-gray-400 hover:text-white'
              }`}
            >
              <MessageSquare size={14} />
              Welcome Channel
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('welcome_dm')}
              className={`flex-1 flex justify-center items-center gap-2 py-2 text-xs rounded-lg font-bold transition-all cursor-pointer ${
                activeTab === 'welcome_dm' ? 'bg-cyber-green/10 text-cyber-green border border-cyber-green/20' : 'text-gray-400 hover:text-white'
              }`}
            >
              <Sparkles size={14} />
              Welcome DM
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('leave')}
              className={`flex-1 flex justify-center items-center gap-2 py-2 text-xs rounded-lg font-bold transition-all cursor-pointer ${
                activeTab === 'leave' ? 'bg-cyber-green/10 text-cyber-green border border-cyber-green/20' : 'text-gray-400 hover:text-white'
              }`}
            >
              <LogOut size={14} />
              Farewell Channel
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('autorole')}
              className={`flex-1 flex justify-center items-center gap-2 py-2 text-xs rounded-lg font-bold transition-all cursor-pointer ${
                activeTab === 'autorole' ? 'bg-cyber-green/10 text-cyber-green border border-cyber-green/20' : 'text-gray-400 hover:text-white'
              }`}
            >
              <UserCheck size={14} />
              Auto-Role
            </button>
          </div>

          {/* Active Tab Panel */}
          <div className="glass-panel p-6 rounded-2xl border border-gray-800 space-y-6">
            {activeTab === 'welcome' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-sm font-bold text-white">Welcome Announcements</h3>
                    <p className="text-[11px] text-gray-400">Post a welcome message to a channel when a user joins.</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.welcome_enabled || false}
                      onChange={(e) => setSettings({ ...settings, welcome_enabled: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-cyber-darker rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-gray-400 after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-cyber-green peer-checked:after:bg-cyber-darker"></div>
                  </label>
                </div>

                <div className="space-y-2">
                  <label className="block text-[10px] font-semibold uppercase tracking-widest text-gray-400">
                    Welcome Target Channel
                  </label>
                  <select
                    required
                    value={settings.welcome_channel || ''}
                    onChange={(e) => setSettings({ ...settings, welcome_channel: e.target.value })}
                    className="w-full bg-cyber-darker border border-gray-800 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-cyber-green transition-all cursor-pointer"
                  >
                    <option value="">-- Select Welcome Channel --</option>
                    {guildChannels.map(c => (
                      <option key={c.id} value={c.id}>
                        #{c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="block text-[10px] font-semibold uppercase tracking-widest text-gray-400">
                      Announcement Message
                    </label>
                    <div className="flex gap-1">
                      {['[user]', '[username]', '[server]', '[membercount]'].map(tag => (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => insertPlaceholder('welcome', tag)}
                          className="bg-cyber-darker hover:bg-gray-800 border border-gray-800 text-gray-400 hover:text-white px-2 py-0.5 text-[9px] rounded-lg font-mono transition-all"
                        >
                          {tag}
                        </button>
                      ))}
                    </div>
                  </div>
                  <textarea
                    ref={welcomeTextRef}
                    rows={4}
                    value={settings.welcome_message || ''}
                    onChange={(e) => setSettings({ ...settings, welcome_message: e.target.value })}
                    className="w-full bg-cyber-darker border border-gray-800 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-cyber-green transition-all font-mono"
                    placeholder="Type welcome message..."
                  />
                </div>
              </div>
            )}

            {activeTab === 'welcome_dm' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-sm font-bold text-white">Direct Message Welcome</h3>
                    <p className="text-[11px] text-gray-400">DM a private welcome message to members on arrival.</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.welcome_dm_enabled || false}
                      onChange={(e) => setSettings({ ...settings, welcome_dm_enabled: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-cyber-darker rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-gray-400 after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-cyber-green peer-checked:after:bg-cyber-darker"></div>
                  </label>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="block text-[10px] font-semibold uppercase tracking-widest text-gray-400">
                      DM Text Content
                    </label>
                    <div className="flex gap-1">
                      {['[user]', '[username]', '[server]', '[membercount]'].map(tag => (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => insertPlaceholder('welcome_dm', tag)}
                          className="bg-cyber-darker hover:bg-gray-800 border border-gray-800 text-gray-400 hover:text-white px-2 py-0.5 text-[9px] rounded-lg font-mono transition-all"
                        >
                          {tag}
                        </button>
                      ))}
                    </div>
                  </div>
                  <textarea
                    ref={dmTextRef}
                    rows={4}
                    value={settings.welcome_dm_message || ''}
                    onChange={(e) => setSettings({ ...settings, welcome_dm_message: e.target.value })}
                    className="w-full bg-cyber-darker border border-gray-800 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-cyber-green transition-all font-mono"
                    placeholder="Type direct welcome message..."
                  />
                </div>
              </div>
            )}

            {activeTab === 'leave' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-sm font-bold text-white">Farewell Announcements</h3>
                    <p className="text-[11px] text-gray-400">Post a farewell message to a channel when a user leaves.</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.leave_enabled || false}
                      onChange={(e) => setSettings({ ...settings, leave_enabled: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-cyber-darker rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-gray-400 after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-cyber-green peer-checked:after:bg-cyber-darker"></div>
                  </label>
                </div>

                <div className="space-y-2">
                  <label className="block text-[10px] font-semibold uppercase tracking-widest text-gray-400">
                    Farewell Target Channel
                  </label>
                  <select
                    required
                    value={settings.leave_channel || ''}
                    onChange={(e) => setSettings({ ...settings, leave_channel: e.target.value })}
                    className="w-full bg-cyber-darker border border-gray-800 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-cyber-green transition-all cursor-pointer"
                  >
                    <option value="">-- Select Farewell Channel --</option>
                    {guildChannels.map(c => (
                      <option key={c.id} value={c.id}>
                        #{c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="block text-[10px] font-semibold uppercase tracking-widest text-gray-400">
                      Farewell Message Content
                    </label>
                    <div className="flex gap-1">
                      {['[user]', '[username]', '[server]', '[membercount]'].map(tag => (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => insertPlaceholder('leave', tag)}
                          className="bg-cyber-darker hover:bg-gray-800 border border-gray-800 text-gray-400 hover:text-white px-2 py-0.5 text-[9px] rounded-lg font-mono transition-all"
                        >
                          {tag}
                        </button>
                      ))}
                    </div>
                  </div>
                  <textarea
                    ref={leaveTextRef}
                    rows={4}
                    value={settings.leave_message || ''}
                    onChange={(e) => setSettings({ ...settings, leave_message: e.target.value })}
                    className="w-full bg-cyber-darker border border-gray-800 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-cyber-green transition-all font-mono"
                    placeholder="Type farewell message..."
                  />
                </div>
              </div>
            )}

            {activeTab === 'autorole' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-sm font-bold text-white">Join Auto-Role</h3>
                    <p className="text-[11px] text-gray-400">Automatically assign roles to members when they first join.</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.autorole_enabled || false}
                      onChange={(e) => setSettings({ ...settings, autorole_enabled: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-cyber-darker rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-gray-400 after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-cyber-green peer-checked:after:bg-cyber-darker"></div>
                  </label>
                </div>

                <div className="space-y-3">
                  <label className="block text-[10px] font-semibold uppercase tracking-widest text-gray-400">
                    Roles to Assign
                  </label>
                  
                  {/* Selected Roles Pills */}
                  <div className="flex flex-wrap gap-2 mb-1 p-2 bg-cyber-darker/40 border border-gray-800/80 rounded-xl min-h-[44px]">
                    {(settings.autorole_roles || '')
                      .split(',')
                      .map(r => r.trim())
                      .filter(Boolean)
                      .map((roleNameOrId, index) => {
                        const roleObj = guildRoles.find(gr => gr.name === roleNameOrId || gr.id === roleNameOrId);
                        const displayColor = roleObj?.color || '#5865F2';
                        return (
                          <div 
                            key={index} 
                            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-800 border border-gray-700 text-white"
                            style={{ borderLeft: `3px solid ${displayColor}` }}
                          >
                            <span>{roleObj?.name || roleNameOrId}</span>
                            <button
                              type="button"
                              onClick={() => {
                                const currentRoles = (settings.autorole_roles || '')
                                  .split(',')
                                  .map(r => r.trim())
                                  .filter(Boolean);
                                const updated = currentRoles.filter(r => r !== roleNameOrId);
                                setSettings({ ...settings, autorole_roles: updated.join(', ') });
                              }}
                              className="text-gray-400 hover:text-red-400 font-bold ml-1 cursor-pointer"
                            >
                              ✕
                            </button>
                          </div>
                        );
                      })}
                    {!(settings.autorole_roles || '').trim() && (
                      <span className="text-xs text-gray-500 italic flex items-center pl-1">No roles selected. Choose from the dropdown below.</span>
                    )}
                  </div>

                  {/* Dropdown Selector */}
                  <div className="relative">
                    <select
                      onChange={(e) => {
                        const val = e.target.value;
                        if (!val) return;
                        const currentRoles = (settings.autorole_roles || '')
                          .split(',')
                          .map(r => r.trim())
                          .filter(Boolean);
                        if (!currentRoles.includes(val)) {
                          currentRoles.push(val);
                          setSettings({ ...settings, autorole_roles: currentRoles.join(', ') });
                        }
                        e.target.value = ''; // Reset selector
                      }}
                      className="w-full bg-cyber-darker border border-gray-800 rounded-xl py-2.5 px-3 text-xs text-white focus:outline-none focus:border-cyber-green transition-all"
                    >
                      <option value="">-- Select a Role --</option>
                      {guildRoles
                        .filter(gr => {
                          const currentRoles = (settings.autorole_roles || '')
                            .split(',')
                            .map(r => r.trim())
                            .filter(Boolean);
                          return !currentRoles.includes(gr.name) && !currentRoles.includes(gr.id);
                        })
                        .map(gr => (
                          <option key={gr.id} value={gr.name}>
                            {gr.name}
                          </option>
                        ))}
                    </select>
                  </div>
                  <span className="block text-[10px] text-gray-500">Select roles from the dropdown to assign them automatically when members join.</span>
                </div>
              </div>
            )}

            {/* Embed Configuration Panel (for Welcome, Welcome DM, and Leave tabs) */}
            {currentEmbedKey && (
              <div className="border-t border-gray-800 pt-6 mt-6 space-y-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider">Send an embed with this message</h4>
                    <p className="text-[10px] text-gray-500">Configure a rich Discord embed to display under your plain text message.</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={embedConfig.enabled || false}
                      onChange={(e) => {
                        setSettings({
                          ...settings,
                          [currentEmbedKey]: {
                            ...embedConfig,
                            enabled: e.target.checked
                          }
                        });
                      }}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-cyber-darker rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-gray-400 after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-cyber-green peer-checked:after:bg-cyber-darker"></div>
                  </label>
                </div>

                {embedConfig.enabled && (
                  <div className="space-y-4 bg-cyber-darker/30 p-4 rounded-xl border border-gray-800/50">
                    {/* Color Palette Picker */}
                    <div className="space-y-2">
                      <label className="block text-[10px] font-semibold uppercase tracking-widest text-gray-400">Embed Color</label>
                      <div className="flex flex-wrap items-center gap-2">
                        {[
                          { name: 'Orange', hex: '#e67e22' },
                          { name: 'Blue', hex: '#3498db' },
                          { name: 'Green', hex: '#2ecc71' },
                          { name: 'Purple', hex: '#9b59b6' },
                          { name: 'Pink', hex: '#e91e63' },
                          { name: 'Yellow', hex: '#f1c40f' },
                          { name: 'Red', hex: '#e74c3c' },
                          { name: 'Slate', hex: '#5865F2' },
                          { name: 'Dark', hex: '#2c3e50' },
                          { name: 'White', hex: '#ffffff' }
                        ].map(c => (
                          <button
                            key={c.hex}
                            type="button"
                            onClick={() => {
                              setSettings({
                                ...settings,
                                [currentEmbedKey]: {
                                  ...embedConfig,
                                  color: c.hex
                                }
                              });
                            }}
                            className={`w-6 h-6 rounded-full cursor-pointer transition-all border ${
                              embedConfig.color === c.hex ? 'border-white scale-110' : 'border-transparent hover:scale-105'
                            }`}
                            style={{ backgroundColor: c.hex }}
                            title={c.name}
                          />
                        ))}
                        <input
                          type="text"
                          value={embedConfig.color || ''}
                          onChange={(e) => {
                            setSettings({
                              ...settings,
                              [currentEmbedKey]: {
                                ...embedConfig,
                                color: e.target.value
                              }
                            });
                          }}
                          className="bg-cyber-darker border border-gray-800 rounded-lg py-1 px-2 text-[10px] text-white focus:outline-none focus:border-cyber-green w-20 font-mono"
                          placeholder="#e67e22"
                        />
                      </div>
                    </div>

                    {/* Author Section */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="block text-[10px] font-semibold uppercase tracking-widest text-gray-400">Author Name</label>
                        <input
                          type="text"
                          value={embedConfig.author_name || ''}
                          onChange={(e) => {
                            setSettings({
                              ...settings,
                              [currentEmbedKey]: {
                                ...embedConfig,
                                author_name: e.target.value
                              }
                            });
                          }}
                          className="w-full bg-cyber-darker border border-gray-800 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-cyber-green transition-all"
                          placeholder="e.g. Server Owner"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="block text-[10px] font-semibold uppercase tracking-widest text-gray-400">Author Icon URL</label>
                        <input
                          type="text"
                          value={embedConfig.author_icon || ''}
                          onChange={(e) => {
                            setSettings({
                              ...settings,
                              [currentEmbedKey]: {
                                ...embedConfig,
                                author_icon: e.target.value
                              }
                            });
                          }}
                          className="w-full bg-cyber-darker border border-gray-800 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-cyber-green transition-all"
                          placeholder="e.g. https://domain.com/icon.png"
                        />
                      </div>
                    </div>

                    {/* Title Section */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="block text-[10px] font-semibold uppercase tracking-widest text-gray-400">Title Text</label>
                        <input
                          type="text"
                          value={embedConfig.title || ''}
                          onChange={(e) => {
                            setSettings({
                              ...settings,
                              [currentEmbedKey]: {
                                ...embedConfig,
                                title: e.target.value
                              }
                            });
                          }}
                          className="w-full bg-cyber-darker border border-gray-800 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-cyber-green transition-all"
                          placeholder="e.g. Welcome To Aura Xtremez"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="block text-[10px] font-semibold uppercase tracking-widest text-gray-400">Title Link URL</label>
                        <input
                          type="text"
                          value={embedConfig.title_url || ''}
                          onChange={(e) => {
                            setSettings({
                              ...settings,
                              [currentEmbedKey]: {
                                ...embedConfig,
                                title_url: e.target.value
                              }
                            });
                          }}
                          className="w-full bg-cyber-darker border border-gray-800 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-cyber-green transition-all"
                          placeholder="e.g. https://youtube.com"
                        />
                      </div>
                    </div>

                    {/* Description Text */}
                    <div className="space-y-1">
                      <div className="flex justify-between items-center">
                        <label className="block text-[10px] font-semibold uppercase tracking-widest text-gray-400">Description Text</label>
                        <div className="flex gap-1">
                          {['[user]', '[username]', '[server]', '[membercount]'].map(tag => (
                            <button
                              key={tag}
                              type="button"
                              onClick={() => {
                                const val = embedConfig.description || '';
                                setSettings({
                                  ...settings,
                                  [currentEmbedKey]: {
                                    ...embedConfig,
                                    description: val + tag
                                  }
                                });
                              }}
                              className="bg-cyber-darker hover:bg-gray-800 border border-gray-800 text-gray-400 hover:text-white px-2 py-0.5 text-[9px] rounded-lg font-mono transition-all"
                            >
                              {tag}
                            </button>
                          ))}
                        </div>
                      </div>
                      <textarea
                        rows={4}
                        value={embedConfig.description || ''}
                        onChange={(e) => {
                          setSettings({
                            ...settings,
                            [currentEmbedKey]: {
                              ...embedConfig,
                              description: e.target.value
                            }
                          });
                        }}
                        className="w-full bg-cyber-darker border border-gray-800 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-cyber-green transition-all font-mono"
                        placeholder="Type embed description content..."
                      />
                    </div>

                    {/* Media Section */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="block text-[10px] font-semibold uppercase tracking-widest text-gray-400">Thumbnail Image URL</label>
                        <input
                          type="text"
                          value={embedConfig.thumbnail_url || ''}
                          onChange={(e) => {
                            setSettings({
                              ...settings,
                              [currentEmbedKey]: {
                                ...embedConfig,
                                thumbnail_url: e.target.value
                              }
                            });
                          }}
                          className="w-full bg-cyber-darker border border-gray-800 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-cyber-green transition-all"
                          placeholder="e.g. Small image top right"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="block text-[10px] font-semibold uppercase tracking-widest text-gray-400">Banner Image URL</label>
                        <input
                          type="text"
                          value={embedConfig.image_url || ''}
                          onChange={(e) => {
                            setSettings({
                              ...settings,
                              [currentEmbedKey]: {
                                ...embedConfig,
                                image_url: e.target.value
                              }
                            });
                          }}
                          className="w-full bg-cyber-darker border border-gray-800 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-cyber-green transition-all"
                          placeholder="e.g. Big banner image bottom"
                        />
                      </div>
                    </div>

                    {/* Fields Builder */}
                    <div className="space-y-2">
                      <label className="block text-[10px] font-semibold uppercase tracking-widest text-gray-400">Embed Fields</label>
                      <div className="space-y-2">
                        {(embedConfig.fields || []).map((field, idx) => (
                          <div key={idx} className="flex gap-2 items-center bg-cyber-darker/60 p-3 rounded-lg border border-gray-800/40">
                            <input
                              type="text"
                              value={field.name || ''}
                              onChange={(e) => {
                                const fields = [...(embedConfig.fields || [])];
                                fields[idx].name = e.target.value;
                                setSettings({
                                  ...settings,
                                  [currentEmbedKey]: { ...embedConfig, fields }
                                });
                              }}
                              className="bg-cyber-darker border border-gray-800 rounded-lg py-1.5 px-2 text-[11px] text-white focus:outline-none focus:border-cyber-green w-1/3"
                              placeholder="Field Title"
                            />
                            <input
                              type="text"
                              value={field.value || ''}
                              onChange={(e) => {
                                const fields = [...(embedConfig.fields || [])];
                                fields[idx].value = e.target.value;
                                setSettings({
                                  ...settings,
                                  [currentEmbedKey]: { ...embedConfig, fields }
                                });
                              }}
                              className="bg-cyber-darker border border-gray-800 rounded-lg py-1.5 px-2 text-[11px] text-white focus:outline-none focus:border-cyber-green w-1/2"
                              placeholder="Field Value"
                            />
                            <label className="flex items-center gap-1 text-[9px] text-gray-400 select-none">
                              <input
                                type="checkbox"
                                checked={field.inline || false}
                                onChange={(e) => {
                                  const fields = [...(embedConfig.fields || [])];
                                  fields[idx].inline = e.target.checked;
                                  setSettings({
                                    ...settings,
                                    [currentEmbedKey]: { ...embedConfig, fields }
                                  });
                                }}
                                className="accent-cyber-green"
                              />
                              Inline
                            </label>
                            <button
                              type="button"
                              onClick={() => {
                                const fields = (embedConfig.fields || []).filter((_, i) => i !== idx);
                                setSettings({
                                  ...settings,
                                  [currentEmbedKey]: { ...embedConfig, fields }
                                });
                              }}
                              className="text-red-400 hover:text-red-300 text-xs px-2 cursor-pointer font-bold"
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={() => {
                            const fields = [...(embedConfig.fields || []), { name: '', value: '', inline: true }];
                            setSettings({
                              ...settings,
                              [currentEmbedKey]: { ...embedConfig, fields }
                            });
                          }}
                          className="bg-cyber-darker hover:bg-gray-800 border border-gray-800 text-cyber-green text-[10px] py-1.5 px-3 rounded-lg font-bold transition-all cursor-pointer inline-flex items-center gap-1"
                        >
                          + Add Field
                        </button>
                      </div>
                    </div>

                    {/* Footer Section */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="block text-[10px] font-semibold uppercase tracking-widest text-gray-400">Footer Text</label>
                        <input
                          type="text"
                          value={embedConfig.footer_text || ''}
                          onChange={(e) => {
                            setSettings({
                              ...settings,
                              [currentEmbedKey]: {
                                ...embedConfig,
                                footer_text: e.target.value
                              }
                            });
                          }}
                          className="w-full bg-cyber-darker border border-gray-800 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-cyber-green transition-all"
                          placeholder="e.g. AEGIS X Core System"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="block text-[10px] font-semibold uppercase tracking-widest text-gray-400">Footer Icon URL</label>
                        <input
                          type="text"
                          value={embedConfig.footer_icon || ''}
                          onChange={(e) => {
                            setSettings({
                              ...settings,
                              [currentEmbedKey]: {
                                ...embedConfig,
                                footer_icon: e.target.value
                              }
                            });
                          }}
                          className="w-full bg-cyber-darker border border-gray-800 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-cyber-green transition-all"
                          placeholder="e.g. Footer Icon image"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-cyber-green text-cyber-darker hover:bg-cyber-green-hover py-2.5 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50"
            >
              <Save size={14} />
              {loading ? 'Applying Settings...' : 'Save Configuration'}
            </button>
          </div>
        </div>

        {/* Live Preview Column */}
        <div className="space-y-4">
          <label className="block text-[10px] font-semibold uppercase tracking-widest text-gray-400">
            Discord UI Render Preview
          </label>

          <div className="bg-[#313338] border border-[#232428] rounded-2xl p-4 font-sans text-white text-xs select-none">
            {activeTab === 'welcome_dm' ? (
              // Direct Message Preview
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-[10px] text-gray-400 border-b border-[#3f4147] pb-2">
                  <span className="font-bold text-white">💬 Direct Message</span>
                  <span>•</span>
                  <span>AEGIS X Bot</span>
                </div>
                <div className="flex gap-3 items-start">
                  <div className="w-8 h-8 rounded-full bg-cyber-green/20 flex items-center justify-center text-cyber-green font-bold text-xs">
                    AE
                  </div>
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-white text-xs">AEGIS X</span>
                      <span className="bg-[#5865F2] text-[9px] px-1 py-0.2 rounded font-semibold text-white uppercase scale-90">Bot</span>
                      <span className="text-[10px] text-gray-400">Today at 10:15 PM</span>
                    </div>
                    <div className="text-[#dbdee1] whitespace-pre-wrap leading-relaxed text-xs">
                      {settings.welcome_dm_enabled 
                        ? renderRichPreviewText(settings.welcome_dm_message)
                        : <span className="text-gray-500 italic">Direct messages welcome is disabled.</span>}
                    </div>
                    <DiscordEmbedPreview embed={settings.welcome_dm_embed} />
                  </div>
                </div>
              </div>
            ) : activeTab === 'autorole' ? (
              // Auto-role Preview
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-[10px] text-gray-400 border-b border-[#3f4147] pb-2">
                  <span className="font-bold text-white">👤 Member Profile Updates</span>
                </div>
                <div className="bg-[#1e1f22] p-4 rounded-xl space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center font-bold text-gray-300">
                      SB
                    </div>
                    <div>
                      <div className="font-bold text-white text-sm">ShadowBlade</div>
                      <div className="text-[10px] text-gray-400">Joined just now</div>
                    </div>
                  </div>
                  <div className="border-t border-[#2e3035] pt-3 space-y-2">
                    <span className="block text-[9px] font-bold uppercase tracking-wider text-gray-400">Roles</span>
                    <div className="flex flex-wrap gap-1">
                      {settings.autorole_enabled && settings.autorole_roles ? (
                        settings.autorole_roles.split(',').map((role, idx) => (
                          <span key={idx} className="bg-[#2b2d31] border border-gray-700 text-gray-300 px-2 py-0.5 rounded text-[10px] flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-cyber-green"></span>
                            {role.trim()}
                          </span>
                        ))
                      ) : (
                        <span className="text-gray-500 italic text-[10px]">No auto-roles will be assigned.</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              // Chat Channel Preview (Welcome / Leave)
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-[10px] text-gray-400 border-b border-[#3f4147] pb-2">
                  <span className="font-bold text-white"># {
                    (() => {
                      const activeChanId = activeTab === 'welcome' ? settings.welcome_channel : settings.leave_channel;
                      const ch = guildChannels.find(c => c.id === activeChanId);
                      return ch ? ch.name : 'general';
                    })()
                  }</span>
                </div>
                <div className="flex gap-3 items-start">
                  <div className="w-8 h-8 rounded-full bg-cyber-green/20 flex items-center justify-center text-cyber-green font-bold text-xs">
                    AE
                  </div>
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-white text-xs">AEGIS X</span>
                      <span className="bg-[#5865F2] text-[9px] px-1 py-0.2 rounded font-semibold text-white uppercase scale-90">Bot</span>
                      <span className="text-[10px] text-gray-400">Today at 10:15 PM</span>
                    </div>
                    <div className="text-[#dbdee1] whitespace-pre-wrap leading-relaxed text-xs">
                      {activeTab === 'welcome' ? (
                        settings.welcome_enabled 
                          ? renderRichPreviewText(settings.welcome_message)
                          : <span className="text-gray-500 italic">Welcome message is disabled.</span>
                      ) : (
                        settings.leave_enabled 
                          ? renderRichPreviewText(settings.leave_message)
                          : <span className="text-gray-500 italic">Farewell message is disabled.</span>
                      )}
                    </div>
                    <DiscordEmbedPreview embed={activeTab === 'welcome' ? settings.welcome_embed : settings.leave_embed} />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Placeholders Guide */}
          <div className="bg-[#1a1b1e] border border-gray-800 rounded-xl p-4 space-y-3 text-[11px] text-gray-400">
            <span className="font-bold text-white block">Placeholder Legend</span>
            <div className="space-y-2">
              <div className="flex justify-between font-mono">
                <span className="text-cyber-green">[user]</span>
                <span>Mention user (<span className="text-gray-500">@ShadowBlade</span>)</span>
              </div>
              <div className="flex justify-between font-mono">
                <span className="text-cyber-green">[username]</span>
                <span>Raw name (<span className="text-gray-500">ShadowBlade</span>)</span>
              </div>
              <div className="flex justify-between font-mono">
                <span className="text-cyber-green">[server]</span>
                <span>Server name (<span className="text-gray-500">AEGIS X HQ</span>)</span>
              </div>
              <div className="flex justify-between font-mono">
                <span className="text-cyber-green">[membercount]</span>
                <span>Guild total (<span className="text-gray-500">1245</span>)</span>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};

export default Announcements;
