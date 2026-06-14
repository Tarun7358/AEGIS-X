import React, { useState, useEffect, useRef } from 'react';
import { Ticket, Send, CheckCircle, RefreshCw, MessageSquare, Bot } from 'lucide-react';
import useStore from '../store/useStore';

const Tickets = () => {
  const token = useStore((state) => state.token);
  const user = useStore((state) => state.user);
  const activeGuildId = useStore((state) => state.activeGuildId);
  const socket = useStore((state) => state.socket);
  const [tickets, setTickets] = useState([]);
  const [activeTicket, setActiveTicket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [replyText, setReplyText] = useState('');
  const [loading, setLoading] = useState(false);
  const [aiSummary, setAiSummary] = useState('');
  const messagesEndRef = useRef(null);

  const fetchTickets = () => {
    setLoading(true);
    fetch(`http://localhost:5000/api/tickets/guild/${activeGuildId}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setTickets(data);
          if (data.length > 0) handleSelectTicket(data[0]);
        } else {
          setTickets([]);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setTickets([]);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchTickets();
  }, [activeGuildId, token]);

  // Hook into realtime ticket updates
  useEffect(() => {
    if (!socket) return;

    socket.on('ticket_message', (data) => {
      if (activeTicket && data.ticketId === activeTicket.id) {
        setMessages(prev => [...prev, data.message]);
      }
    });

    socket.on('ticket_update', (data) => {
      if (data.status === 'CLOSED') {
        // Refresh ticket list
        fetch(`http://localhost:5000/api/tickets/guild/${activeGuildId}`, {
          headers: { Authorization: `Bearer ${token}` }
        })
          .then(res => res.json())
          .then(list => {
            if (Array.isArray(list)) {
              setTickets(list);
              const updated = list.find(t => t.id === data.ticketId);
              if (activeTicket && activeTicket.id === data.ticketId) {
                setActiveTicket(updated);
                setAiSummary(data.summary);
              }
            }
          });
      }
    });

    return () => {
      socket.off('ticket_message');
      socket.off('ticket_update');
    };
  }, [socket, activeTicket, activeGuildId, token]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSelectTicket = async (ticket) => {
    setActiveTicket(ticket);
    setAiSummary(ticket.transcript_url || ''); // Set transcript if already closed
    try {
      const res = await fetch(`http://localhost:5000/api/tickets/${ticket.id}/messages`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (Array.isArray(data)) {
        setMessages(data);
      } else {
        setMessages([]);
      }
    } catch (err) {
      console.error(err);
      setMessages([]);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!replyText || !activeTicket) return;

    try {
      await fetch(`http://localhost:5000/api/tickets/${activeTicket.id}/messages`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ senderId: user?.id || '1002', content: replyText })
      });
      setReplyText('');
    } catch (err) {
      console.error(err);
    }
  };

  const handleCloseTicket = async () => {
    if (!activeTicket) return;
    try {
      const res = await fetch(`http://localhost:5000/api/tickets/${activeTicket.id}/close`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setAiSummary(data.summary);
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-extrabold text-white">Ticket Center</h2>
          <p className="text-sm text-gray-400">Manage support chats, view transcripts, and review AI summaries.</p>
        </div>
        <button
          onClick={fetchTickets}
          className="bg-gray-800 hover:bg-gray-700 text-gray-300 p-2 rounded-xl border border-gray-800/80 transition-colors"
        >
          <RefreshCw size={16} />
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Ticket List */}
        <div className="lg:col-span-1 glass-panel p-5 rounded-2xl border border-gray-800 flex flex-col h-[520px]">
          <h3 className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-4">Support Cases</h3>
          <div className="flex-1 overflow-y-auto space-y-2 pr-2">
            {tickets.length === 0 ? (
              <div className="text-center py-12 text-xs text-gray-500">No support tickets active.</div>
            ) : (
              tickets.map((t) => (
                <button
                  key={t.id}
                  onClick={() => handleSelectTicket(t)}
                  className={`w-full text-left p-3 rounded-xl border transition-all flex items-center justify-between ${
                    activeTicket?.id === t.id
                      ? 'bg-cyber-dark border-[#ff4655]/45'
                      : 'bg-cyber-darker/50 border-gray-800/80 hover:bg-cyber-dark'
                  }`}
                >
                  <div>
                    <span className="text-xs font-bold text-white block">
                      Case: {t.user?.username || 'Member'}
                    </span>
                    <span className="text-[10px] text-gray-500 block mt-0.5">Category: {t.category}</span>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                    t.status === 'OPEN' ? 'bg-[#ff4655]/10 text-[#ff4655]' : 'bg-gray-800 text-gray-500'
                  }`}>
                    {t.status}
                  </span>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Ticket Transcript Chat Box */}
        <div className="lg:col-span-2 glass-panel p-6 rounded-2xl border border-gray-800 h-[520px] flex flex-col justify-between relative">
          {activeTicket ? (
            <div className="flex-1 flex flex-col justify-between h-full">
              {/* Header */}
              <div className="flex justify-between items-center border-b border-gray-800 pb-4 mb-4">
                <div>
                  <h3 className="text-sm font-bold text-white">
                    Ticket # {activeTicket.user?.username || 'Chat'}
                  </h3>
                  <span className="text-[10px] text-gray-500">Category: {activeTicket.category}</span>
                </div>
                {activeTicket.status === 'OPEN' && (
                  <button
                    onClick={handleCloseTicket}
                    className="bg-cyber-red/10 text-cyber-red border border-cyber-red/20 hover:bg-cyber-red hover:text-white text-xs font-bold px-3 py-1.5 rounded-xl transition-all"
                  >
                    Close Ticket
                  </button>
                )}
              </div>

              {/* Messages feed */}
              <div className="flex-1 overflow-y-auto space-y-3 mb-4 pr-2 max-h-[280px]">
                {messages.map((m) => {
                  const isSelf = m.sender_id === (user?.id || '1002');
                  return (
                    <div key={m.id} className={`flex ${isSelf ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-xs p-3 rounded-2xl text-xs leading-relaxed ${
                        isSelf 
                          ? 'bg-[#ff4655]/10 text-white border border-[#ff4655]/20' 
                          : 'bg-cyber-dark text-gray-300 border border-gray-850'
                      }`}>
                        <span className="font-semibold block text-[10px] text-gray-400 mb-1">
                          {isSelf ? `${user?.username || 'ShadowBlade'} (Staff)` : m.sender?.username || 'User'}
                        </span>
                        {m.content}
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* AI summary banner if closed */}
              {aiSummary && (
                <div className="p-3 bg-cyber-blue/10 border border-cyber-blue/20 rounded-xl mb-4 text-xs leading-relaxed flex items-start gap-2 animate-pulse-glow">
                  <Bot size={16} className="text-cyber-blue shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-cyber-blue uppercase tracking-wider block text-[10px]">AI Ticket Summary</span>
                    <span className="text-gray-300 mt-1 block">{aiSummary}</span>
                  </div>
                </div>
              )}

              {/* Input Form */}
              {activeTicket.status === 'OPEN' ? (
                <form onSubmit={handleSendMessage} className="flex gap-2">
                  <input
                    type="text"
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Type a support reply..."
                    className="flex-1 bg-cyber-darker border border-gray-800 rounded-xl py-3 px-4 text-xs text-white focus:outline-none focus:border-[#ff4655] transition-all"
                  />
                  <button
                    type="submit"
                    className="bg-gradient-rage text-white font-bold p-3 rounded-xl hover:opacity-90 transition-all shadow-neon-red"
                  >
                    <Send size={16} />
                  </button>
                </form>
              ) : (
                <div className="text-center py-3 bg-cyber-darker border border-gray-850 rounded-xl text-xs text-gray-500 font-medium">
                  This support ticket is closed.
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center text-gray-500">
              <MessageSquare size={32} className="text-gray-700 mb-2" />
              <span className="text-xs">Select a support ticket from the sidebar to inspect case history.</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Tickets;
