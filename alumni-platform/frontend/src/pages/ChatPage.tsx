import React, { useEffect, useState, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { usersAPI, chatAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { User } from '../types';

interface RealTimeMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderPhoto?: string | null;
  text: string;
  createdAt: string;
}
import toast from 'react-hot-toast';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { FiSend, FiMessageCircle, FiSearch, FiUser, FiArrowLeft } from 'react-icons/fi';
import { formatDistanceToNow } from 'date-fns';

interface Conversation {
  userId: string;
  displayName: string;
  photoURL?: string;
  role: 'student' | 'alumni';
  lastMessage?: string;
  lastMessageAt?: string;
}

const ChatPage: React.FC = () => {
  const { userProfile } = useAuth();
  const [searchParams] = useSearchParams();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<RealTimeMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [mobileView, setMobileView] = useState<'list' | 'chat'>('list');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Track known message IDs to avoid wiping state on empty poll response
  const knownIdsRef = useRef<Set<string>>(new Set());

  const hasFetched = useRef(false);

  useEffect(() => {
    if (hasFetched.current) return; // prevent React StrictMode double-invoke
    hasFetched.current = true;
    fetchUsers();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await usersAPI.getAllUsers();
      const users: User[] = res.data.users;
      const filtered = users.filter(u => u.uid !== userProfile?.uid);
      setAllUsers(filtered);
      const convs: Conversation[] = filtered.map(u => ({
        userId: u.uid,
        displayName: u.name,
        photoURL: u.avatar,
        role: u.role as 'student' | 'alumni',
      }));
      setConversations(convs);

      // Auto-select user from ?userId= query param (e.g. from alumni dashboard)
      const targetUserId = searchParams.get('userId');
      if (targetUserId) {
        const target = convs.find(c => c.userId === targetUserId);
        if (target) {
          // defer so state is set first
          setTimeout(() => selectConversation(target), 0);
        }
      }
    } catch {
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (chatRoomId: string) => {
    try {
      const res = await chatAPI.getMessages(chatRoomId);
      const msgs: RealTimeMessage[] = res.data.messages || [];
      if (msgs.length > 0) {
        // Merge: keep any optimistic messages not yet confirmed, add real ones
        setMessages(prev => {
          // remove optimistic (temp_*) entries that now have a real counterpart
          const merged = [
            ...prev.filter(m => m.id.startsWith('temp_') && !msgs.some(r => r.text === m.text && r.senderId === m.senderId)),
            ...msgs,
          ];
          merged.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
          // update known IDs
          msgs.forEach(m => knownIdsRef.current.add(m.id));
          return merged;
        });
      }
      // if msgs is empty but we already have messages, keep them (transient fetch issue)
    } catch {
      // silently ignore poll errors
    }
  };

  const selectConversation = (conv: Conversation) => {
    setSelectedUser(conv);
    setMessages([]);
    knownIdsRef.current = new Set();
    setMobileView('chat');

    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
    }

    const chatRoomId = [userProfile!.uid, conv.userId].sort().join('_');
    fetchMessages(chatRoomId);
    pollIntervalRef.current = setInterval(() => fetchMessages(chatRoomId), 2000);
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedUser || !userProfile) return;
    setSendingMessage(true);
    const msgText = newMessage.trim();
    const tempId = `temp_${Date.now()}`;
    const optimistic: RealTimeMessage = {
      id: tempId,
      senderId: userProfile.uid,
      senderName: userProfile.name,
      senderPhoto: userProfile.avatar || null,
      text: msgText,
      createdAt: new Date().toISOString(),
    };
    // Show immediately
    setMessages(prev => [...prev, optimistic]);
    setNewMessage('');
    try {
      await chatAPI.sendMessage(selectedUser.userId, msgText);
      // Fetch real messages to replace optimistic one
      const chatRoomId = [userProfile.uid, selectedUser.userId].sort().join('_');
      await fetchMessages(chatRoomId);
    } catch {
      // Remove optimistic message on failure
      setMessages(prev => prev.filter(m => m.id !== tempId));
      setNewMessage(msgText);
      toast.error('Failed to send message');
    } finally {
      setSendingMessage(false);
    }
  };

  const filteredConversations = conversations.filter(c =>
    c.displayName.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div className="flex items-center justify-center h-96"><LoadingSpinner /></div>;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 animate-fade-in">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="icon-box w-9 h-9 bg-gradient-to-br from-primary-500 to-violet-600">
            <FiMessageCircle className="w-4 h-4 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Messages</h1>
        </div>
        <p className="text-gray-500 ml-12">Connect and chat with alumni and students</p>
      </div>

      <div className="card p-0 overflow-hidden flex h-[70vh] min-h-[400px] md:h-[600px]">
        {/* Sidebar */}
        <div className={`${mobileView === 'chat' ? 'hidden' : 'flex'} md:flex w-full md:w-72 border-r border-gray-100 flex-col flex-shrink-0`}>
          <div className="p-3 border-b border-gray-100">
            <div className="relative">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search users..."
                className="input pl-9 text-sm py-2"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {filteredConversations.length === 0 ? (
              <div className="text-center py-8 text-gray-400 text-sm px-4">No users found</div>
            ) : (
              filteredConversations.map(conv => (
                <button
                  key={conv.userId}
                  onClick={() => selectConversation(conv)}
                  className={`w-full text-left px-3 py-3 flex items-center gap-3 transition-all duration-150 border-b border-gray-50 ${
                    selectedUser?.userId === conv.userId
                      ? 'bg-gradient-to-r from-primary-50 to-violet-50 border-l-4 border-primary-500'
                      : 'hover:bg-gray-50 hover:translate-x-0.5'
                  }`}
                >
                  <div className="relative flex-shrink-0">
                    {conv.photoURL ? (
                      <img src={conv.photoURL} alt={conv.displayName} className="w-9 h-9 rounded-full object-cover" />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center">
                        <FiUser className="w-4 h-4 text-gray-500" />
                      </div>
                    )}
                    <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white ${conv.role === 'alumni' ? 'bg-accent-500' : 'bg-primary-500'}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-gray-800 truncate">{conv.displayName}</p>
                    <p className={`text-xs capitalize ${conv.role === 'alumni' ? 'text-accent-600' : 'text-primary-600'}`}>{conv.role}</p>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Chat Area */}
        <div className={`flex-1 flex flex-col overflow-hidden ${mobileView === 'list' ? 'hidden md:flex' : ''}`}>
        {!selectedUser ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center text-gray-400">
              <FiMessageCircle className="w-14 h-14 mx-auto mb-3 opacity-40" />
              <p className="font-medium">Select a user to start chatting</p>
              <p className="text-sm mt-1 text-gray-300">Connect with alumni and students</p>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col">
            {/* Chat header */}
            <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-3 bg-white">
              <button
                onClick={() => setMobileView('list')}
                className="md:hidden flex-shrink-0 p-1.5 rounded-xl hover:bg-gray-100 text-gray-500 transition-colors"
                aria-label="Back"
              >
                <FiArrowLeft className="w-4 h-4" />
              </button>
              {selectedUser.photoURL ? (
                <img src={selectedUser.photoURL} alt="" className="w-9 h-9 rounded-full object-cover" />
              ) : (
                <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center">
                  <FiUser className="w-4 h-4 text-gray-500" />
                </div>
              )}
              <div>
                <p className="font-semibold text-sm text-gray-800">{selectedUser.displayName}</p>
                <p className={`text-xs capitalize ${selectedUser.role === 'alumni' ? 'text-accent-600' : 'text-primary-600'}`}>{selectedUser.role}</p>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
              {messages.length === 0 ? (
                <div className="text-center py-8 text-gray-400 text-sm">
                  No messages yet. Say hello!
                </div>
              ) : (
                messages.map(msg => {
                  const isOwn = msg.senderId === userProfile?.uid;
                  return (
                    <div key={msg.id} className={`flex items-end gap-2 ${isOwn ? 'flex-row-reverse' : ''}`}>
                      {!isOwn && (
                        <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                          {msg.senderPhoto ? (
                            <img src={msg.senderPhoto} alt="" className="w-7 h-7 rounded-full object-cover" />
                          ) : (
                            <FiUser className="w-3 h-3 text-gray-500" />
                          )}
                        </div>
                      )}
                      <div className={`max-w-[75%] sm:max-w-xs lg:max-w-sm ${isOwn ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
                        <div className={`px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
                          isOwn
                            ? 'bg-gradient-to-br from-primary-600 to-violet-600 text-white rounded-br-sm shadow-sm'
                            : 'bg-white text-gray-800 shadow-sm rounded-bl-sm'
                        }`}>
                          {msg.text}
                        </div>
                        <p className="text-xs text-gray-400 px-1">
                          {formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <form onSubmit={sendMessage} className="p-3 border-t border-gray-100 bg-white flex gap-2">
              <input
                type="text"
                value={newMessage}
                onChange={e => setNewMessage(e.target.value)}
                placeholder={`Message ${selectedUser.displayName}...`}
                className="input flex-1 text-sm"
                disabled={sendingMessage}
              />
              <button
                type="submit"
                disabled={sendingMessage || !newMessage.trim()}
                className="btn-gradient px-4 py-2.5 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FiSend className="w-4 h-4" />
              </button>
            </form>
          </div>
        )}
        </div>
      </div>
    </div>
  );
};

export default ChatPage;
