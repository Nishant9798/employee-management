import { useState, useEffect, useRef } from 'react';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import { MessageCircle, Send, Search, ArrowLeft, Hash, Users, Plus, X, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Messages() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [channels, setChannels] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageInput, setMessageInput] = useState('');
  const [search, setSearch] = useState('');
  const [contacts, setContacts] = useState([]);
  const [showNewChat, setShowNewChat] = useState(false);
  const [contactSearch, setContactSearch] = useState('');
  const [tab, setTab] = useState('direct');
  const [mobileShowChat, setMobileShowChat] = useState(false);
  const messagesEndRef = useRef(null);
  const pollRef = useRef(null);

  useEffect(() => { loadConversations(); loadChannels(); loadContacts(); }, []);

  useEffect(() => {
    if (activeConversation) {
      loadMessages(activeConversation);
      // Poll for new messages every 5 seconds
      pollRef.current = setInterval(() => loadMessages(activeConversation), 5000);
    }
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [activeConversation]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadConversations = () => {
    api.get('/messages/conversations').then(r => setConversations(r.data)).catch(() => setConversations([]));
  };

  const loadChannels = () => {
    api.get('/messages/channels').then(r => setChannels(r.data)).catch(() => setChannels([]));
  };

  const loadContacts = () => {
    api.get('/employees').then(r => setContacts(r.data.filter(e => e.id !== user?.id && e.status === 'active'))).catch(() => setContacts([]));
  };

  const loadMessages = (conv) => {
    const endpoint = conv.type === 'channel' ? `/messages/channel/${conv.id}` : `/messages/direct/${conv.id}`;
    api.get(endpoint).then(r => setMessages(r.data)).catch(() => setMessages([]));
  };

  const handleSend = async () => {
    if (!messageInput.trim() || !activeConversation) return;
    try {
      const payload = { content: messageInput };
      if (activeConversation.type === 'channel') {
        payload.channel = activeConversation.channel || activeConversation.id;
      } else {
        payload.receiverId = activeConversation.recipientId || activeConversation.id;
      }
      await api.post('/messages/send', payload);
      setMessageInput('');
      loadMessages(activeConversation);
      loadConversations();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to send');
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const startConversation = (contact) => {
    setActiveConversation({ id: contact.id, name: contact.name, type: 'direct', recipientId: contact.id });
    setShowNewChat(false);
    setMobileShowChat(true);
  };

  const openConversation = (conv) => {
    setActiveConversation(conv);
    setMobileShowChat(true);
  };

  const openChannel = (channel) => {
    setActiveConversation({ ...channel, type: 'channel' });
    setMobileShowChat(true);
  };

  const filteredConversations = conversations.filter(c =>
    !search || c.name?.toLowerCase().includes(search.toLowerCase())
  );

  const filteredContacts = contacts.filter(c =>
    !contactSearch || c.name?.toLowerCase().includes(contactSearch.toLowerCase()) || c.email?.toLowerCase().includes(contactSearch.toLowerCase())
  );

  const formatTime = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const now = new Date();
    const diff = now - d;
    if (diff < 86400000 && d.getDate() === now.getDate()) {
      return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    }
    if (diff < 604800000) {
      return d.toLocaleDateString('en-IN', { weekday: 'short' });
    }
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="page-header">
        <div className="relative z-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1>Messages</h1>
            <p>Chat with your team members</p>
          </div>
          <button onClick={() => setShowNewChat(true)} className="flex items-center gap-2 px-4 py-2 bg-white text-indigo-700 rounded-xl text-sm font-medium hover:bg-white/90 transition shadow-lg">
            <Plus size={16} /> New Conversation
          </button>
        </div>
        <div className="absolute right-8 top-1/2 -translate-y-1/2 opacity-10">
          <MessageCircle size={100} className="text-white" />
        </div>
      </div>

      {/* Chat Container */}
      <div className="card p-0 overflow-hidden" style={{ height: 'calc(100vh - 280px)', minHeight: '500px' }}>
        <div className="flex h-full">

          {/* Left Panel: Conversation List */}
          <div className={`w-full sm:w-80 border-r dark:border-slate-700 flex flex-col shrink-0 ${mobileShowChat ? 'hidden sm:flex' : 'flex'}`}>
            {/* Channel/DM Tabs */}
            <div className="flex gap-1 bg-slate-50 dark:bg-slate-700/50 p-1.5 m-3 rounded-xl">
              <button onClick={() => setTab('direct')}
                className={`flex-1 px-3 py-1.5 rounded-md text-xs font-medium transition ${tab === 'direct' ? 'bg-white dark:bg-slate-700 text-indigo-700 dark:text-indigo-400 shadow-sm' : 'text-slate-600 dark:text-slate-400'}`}>
                <Users size={12} className="inline mr-1" /> Direct
              </button>
              <button onClick={() => setTab('channels')}
                className={`flex-1 px-3 py-1.5 rounded-md text-xs font-medium transition ${tab === 'channels' ? 'bg-white dark:bg-slate-700 text-indigo-700 dark:text-indigo-400 shadow-sm' : 'text-slate-600 dark:text-slate-400'}`}>
                <Hash size={12} className="inline mr-1" /> Channels
              </button>
            </div>

            {/* Search */}
            <div className="px-3 pb-2">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..." className="input pl-8 py-2 text-xs" />
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto">
              {tab === 'direct' && filteredConversations.map(conv => (
                <div key={conv.id || conv.recipientId}
                  onClick={() => openConversation(conv)}
                  className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition hover:bg-slate-50 dark:hover:bg-slate-700/50 ${activeConversation?.id === conv.id ? 'bg-indigo-50 dark:bg-indigo-900/20 border-r-2 border-indigo-600' : ''}`}>
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-semibold text-xs shrink-0">
                    {conv.name?.split(' ').map(n => n[0]).join('').slice(0, 2)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center">
                      <p className="text-sm font-medium text-slate-800 dark:text-white truncate">{conv.name}</p>
                      <span className="text-[10px] text-slate-400 shrink-0">{formatTime(conv.lastMessageAt)}</span>
                    </div>
                    <p className="text-xs text-slate-400 truncate">{conv.lastMessage || 'Start a conversation'}</p>
                  </div>
                  {conv.unreadCount > 0 && (
                    <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                      {conv.unreadCount}
                    </span>
                  )}
                </div>
              ))}

              {tab === 'channels' && channels.map(channel => (
                <div key={channel.channel}
                  onClick={() => openChannel({ id: channel.channel, name: channel.channel, type: 'channel', channel: channel.channel })}
                  className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition hover:bg-slate-50 dark:hover:bg-slate-700/50 ${activeConversation?.id === channel.channel && activeConversation?.type === 'channel' ? 'bg-indigo-50 dark:bg-indigo-900/20 border-r-2 border-indigo-600' : ''}`}>
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center text-white shrink-0">
                    <Hash size={16} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 dark:text-white truncate">#{channel.channel}</p>
                    <p className="text-xs text-slate-400 truncate">{channel.messageCount || 0} messages</p>
                  </div>
                  <ChevronRight size={14} className="text-slate-400 shrink-0" />
                </div>
              ))}

              {tab === 'direct' && filteredConversations.length === 0 && (
                <div className="text-center py-8 text-slate-400 text-sm">No conversations yet</div>
              )}
              {tab === 'channels' && channels.length === 0 && (
                <div className="text-center py-8 text-slate-400 text-sm">No channels available</div>
              )}
            </div>
          </div>

          {/* Right Panel: Chat Area */}
          <div className={`flex-1 flex flex-col ${mobileShowChat ? 'flex' : 'hidden sm:flex'}`}>
            {activeConversation ? (
              <>
                {/* Chat Header */}
                <div className="flex items-center gap-3 px-4 py-3 border-b dark:border-slate-700 bg-white dark:bg-slate-800">
                  <button onClick={() => setMobileShowChat(false)} className="sm:hidden p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700">
                    <ArrowLeft size={18} className="text-slate-600 dark:text-slate-400" />
                  </button>
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white font-semibold text-xs shrink-0 ${activeConversation.type === 'channel' ? 'bg-gradient-to-br from-emerald-500 to-teal-500' : 'bg-gradient-to-br from-indigo-500 to-purple-500'}`}>
                    {activeConversation.type === 'channel' ? <Hash size={16} /> : activeConversation.name?.split(' ').map(n => n[0]).join('').slice(0, 2)}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-800 dark:text-white">{activeConversation.name}</p>
                    <p className="text-xs text-slate-400">{activeConversation.type === 'channel' ? 'Channel' : 'Direct message'}</p>
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50 dark:bg-slate-900/50">
                  {messages.length === 0 && (
                    <div className="text-center py-12 text-slate-400 text-sm">
                      <MessageCircle size={40} className="mx-auto mb-2 opacity-50" />
                      <p>No messages yet. Start the conversation!</p>
                    </div>
                  )}
                  {messages.map((msg, i) => {
                    const isMe = msg.senderId === user?.id;
                    const showSender = !isMe && (i === 0 || messages[i - 1]?.senderId !== msg.senderId);
                    return (
                      <div key={msg.id || i} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[75%] ${isMe ? 'order-2' : ''}`}>
                          {showSender && (
                            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 ml-1">{msg.senderName}</p>
                          )}
                          <div className={`px-4 py-2.5 rounded-2xl text-sm ${isMe
                            ? 'bg-indigo-600 text-white rounded-br-md'
                            : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-bl-md shadow-sm border dark:border-slate-700'
                          }`}>
                            <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                          </div>
                          <p className={`text-[10px] text-slate-400 mt-1 ${isMe ? 'text-right mr-1' : 'ml-1'}`}>
                            {formatTime(msg.createdAt)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>

                {/* Message Input */}
                <div className="p-3 border-t dark:border-slate-700 bg-white dark:bg-slate-800">
                  <div className="flex items-end gap-2">
                    <textarea
                      value={messageInput}
                      onChange={e => setMessageInput(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Type a message..."
                      rows={1}
                      className="input resize-none py-2.5"
                      style={{ minHeight: '40px', maxHeight: '120px' }}
                    />
                    <button onClick={handleSend} disabled={!messageInput.trim()}
                      className="p-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition disabled:opacity-50 shrink-0">
                      <Send size={18} />
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center bg-slate-50 dark:bg-slate-900/50">
                <div className="text-center">
                  <MessageCircle size={64} className="mx-auto text-slate-300 dark:text-slate-600 mb-3" />
                  <p className="text-slate-500 dark:text-slate-400 font-medium">Select a conversation</p>
                  <p className="text-sm text-slate-400 mt-1">Choose from your existing conversations or start a new one</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* New Chat Modal */}
      {showNewChat && (
        <>
          <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={() => setShowNewChat(false)} />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-md">
            <div className="flex justify-between items-center p-4 border-b dark:border-slate-700">
              <h3 className="text-lg font-semibold dark:text-white">New Conversation</h3>
              <button onClick={() => setShowNewChat(false)}><X size={20} className="text-slate-400" /></button>
            </div>
            <div className="p-4">
              <div className="relative mb-3">
                <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
                <input value={contactSearch} onChange={e => setContactSearch(e.target.value)} placeholder="Search contacts..." className="input pl-8" autoFocus />
              </div>
              <div className="max-h-80 overflow-y-auto space-y-1">
                {filteredContacts.map(contact => (
                  <div key={contact.id} onClick={() => startConversation(contact)}
                    className="flex items-center gap-3 p-3 rounded-xl cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 transition">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-semibold text-xs shrink-0">
                      {contact.name?.split(' ').map(n => n[0]).join('').slice(0, 2)}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-800 dark:text-white">{contact.name}</p>
                      <p className="text-xs text-slate-400">{contact.department} - {contact.designation}</p>
                    </div>
                  </div>
                ))}
                {filteredContacts.length === 0 && (
                  <p className="text-center py-4 text-slate-400 text-sm">No contacts found</p>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
