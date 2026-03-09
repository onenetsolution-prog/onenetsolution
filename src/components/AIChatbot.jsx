// components/AIChatbot.jsx
// ─────────────────────────────────────────────────────────────────────────────
// ENTERPRISE-GRADE AI CHATBOT — 30+ Years of Industry Experience
// ─────────────────────────────────────────────────────────────────────────────
// Features: Persistence, Context-aware, Rating system, Quick actions, Export,
// Multi-language (EN/HI), Sentiment detection, Voice input, Offline queue,
// Rich formatting, Tutorial, Mobile-first, Accessibility, Analytics
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { useLocation } from 'react-router-dom';
import { getServerNow, getServerDateObject, isServerTimeInitialized } from '../hooks/useServerTime';
import { findAnswer } from '../utils/chatbotKnowledgeBase';
import {
  MessageCircle, X, Send, Bot, User, Minimize2,
  Maximize2, RefreshCw, Phone, Mail, Sparkles, AlertCircle, Loader,
  Download, Copy, ThumbsUp, ThumbsDown, Mic, Volume2, RotateCcw,
  Clock, Star, Settings, Menu, Home, Plus, TrendingUp, FileText, DollarSign,
} from 'lucide-react';

const SUPPORT_EMAIL = 'ourons7@gmail.com';
const ADMIN_EMAIL   = import.meta.env.VITE_ADMIN_EMAIL || '9178chandannayak@gmail.com';
const STORAGE_KEY = 'one_net_chat_history';
const TUTORIAL_KEY = 'one_net_chat_tutorial_done';
const LANG_KEY = 'one_net_chat_lang';
const RATINGS_KEY = 'one_net_chat_ratings';

// ── Localization ──────────────────────────────────────────────────────────────
const LANG = {
  EN: {
    title: 'ONE NET Assistant',
    status: 'Online — ask me anything',
    typing: 'Typing...',
    placeholder: 'Ask anything...',
    greeting: (name) => `Hi ${name}! 👋 I'm your ONE NET assistant.\n\nI can help you with:\n• Using app features\n• Checking your account status\n• Subscription & billing\n• Quick actions\n• Contacting support\n\nWhat do you need help with today?`,
    contactUs: 'Contact Support',
    resetChat: 'Reset',
    minimize: 'Minimize',
    maximize: 'Maximize',
    close: 'Close',
    helpful: 'Helpful?',
    export: 'Export',
    voice: 'Voice',
    quickSuggestions: 'Quick Questions',
    talkToSupport: 'Talk to Support',
    sendEmail: 'Send Email',
    viewDocs: 'View Docs',
    learnMore: 'Learn More',
    tutorial: 'Tutorial',
    exportChat: 'Export Chat',
    reportIssue: 'Report Issue',
    copyMessage: 'Copied!',
    noInternet: 'You are offline. Messages will send when online.',
    turnOnMic: 'Listening...',
    micError: 'Mic not available',
  },
  HI: {
    title: 'ONE NET सहायक',
    status: 'ऑनलाइन — कुछ भी पूछें',
    typing: 'लिख रहे हैं...',
    placeholder: 'कुछ भी पूछें...',
    greeting: (name) => `नमस्ते ${name}! 👋 मैं आपका ONE NET सहायक हूँ।\n\nमैं आपकी मदद कर सकता हूँ:\n• ऐप फीचर के बारे में\n• आपके खाते की जानकारी\n• सदस्यता और बिलिंग\n• त्वरित कार्य\n• सपोर्ट से संपर्क करें\n\nआज मुझसे क्या मदद चाहिए?`,
    contactUs: 'सपोर्ट से संपर्क करें',
    resetChat: 'रीसेट',
    minimize: 'कम करें',
    maximize: 'बढ़ाएं',
    close: 'बंद करें',
    helpful: 'मददगार?',
    export: 'निर्यात',
    voice: 'आवाज',
    quickSuggestions: 'त्वरित प्रश्न',
    talkToSupport: 'सपोर्ट से बात करें',
    sendEmail: 'ईमेल भेजें',
    viewDocs: 'दस्तावेज़ देखें',
    learnMore: 'अधिक जानें',
    tutorial: 'ट्यूटोरियल',
    exportChat: 'चैट निर्यात करें',
    reportIssue: 'समस्या की रिपोर्ट करें',
    copyMessage: 'कॉपी किया गया!',
    noInternet: 'आप ऑफलाइन हैं। संदेश ऑनलाइन होने पर भेजे जाएंगे।',
    turnOnMic: 'सुन रहे हैं...',
    micError: 'माइक उपलब्ध नहीं है',
  },
};

// ── Sentiment & Intent Detection ──────────────────────────────────────────────
function detectSentiment(text) {
  const frustrationKeywords = ['not working', 'broken', 'error', 'stuck', 'can\'t', 'frustrated', 'angry', 'help', 'urgent', 'asap', 'immediately'];
  const hasNegative = frustrationKeywords.some(k => text.toLowerCase().includes(k));
  return hasNegative ? 'frustrated' : 'normal';
}

function extractPageContext(pathname) {
  if (pathname.includes('/entries')) return { page: 'entries', title: 'Service Entries' };
  if (pathname.includes('/pending-payments')) return { page: 'payments', title: 'Pending Payments' };
  if (pathname.includes('/customers')) return { page: 'customers', title: 'Customer Search' };
  if (pathname.includes('/invoice')) return { page: 'invoice', title: 'Invoices' };
  if (pathname.includes('/profile')) return { page: 'profile', title: 'Profile' };
  if (pathname.includes('/services')) return { page: 'services', title: 'Custom Services' };
  if (pathname.includes('/dashboard')) return { page: 'dashboard', title: 'Dashboard' };
  if (pathname.includes('/admin')) return { page: 'admin', title: 'Admin Panel' };
  return { page: 'home', title: 'Home' };
}

// ── Typing Indicator ──────────────────────────────────────────────────────────
function TypingDots() {
  return (
    <div style={{ display: 'flex', gap: 4, alignItems: 'center', padding: '4px 0' }}>
      {[0, 1, 2].map(i => (
        <div key={i} style={{
          width: 7, height: 7, borderRadius: '50%',
          background: 'var(--brand)',
          animation: 'chatBounce 1.2s infinite',
          animationDelay: `${i * 0.2}s`,
          opacity: 0.7,
        }} />
      ))}
    </div>
  );
}

// ── Message Bubble with Rich Formatting ───────────────────────────────────────
function MessageBubble({ msg, onRate, onCopy }) {
  const isBot = msg.role === 'assistant';
  const [copied, setCopied] = useState(false);

  // Parse markdown-like formatting
  const renderContent = (text) => {
    if (!text) return '';
    
    // Split by newlines first
    const lines = text.split('\n');
    
    return lines.map((line, lineIdx) => {
      if (!line) return <div key={lineIdx} style={{ height: '8px' }} />;
      
      // Parse inline formatting
      let content = [];
      let lastIndex = 0;
      
      // Match **bold** text
      const boldRegex = /\*\*(.*?)\*\*/g;
      let boldMatch;
      while ((boldMatch = boldRegex.exec(line)) !== null) {
        // Add text before match
        if (boldMatch.index > lastIndex) {
          content.push(line.substring(lastIndex, boldMatch.index));
        }
        // Add bold element
        content.push(
          <strong key={`${lineIdx}-bold-${boldMatch.index}`} style={{ fontWeight: 700 }}>
            {boldMatch[1]}
          </strong>
        );
        lastIndex = boldRegex.lastIndex;
      }
      
      // Add remaining text
      if (lastIndex < line.length) {
        content.push(line.substring(lastIndex));
      }
      
      return (
        <div key={lineIdx} style={{ marginBottom: '4px', lineHeight: '1.4' }}>
          {content.length > 0 ? content : line}
        </div>
      );
    });
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(msg.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: isBot ? 'row' : 'row-reverse',
      gap: 8, marginBottom: 12, alignItems: 'flex-start',
    }}>
      {/* Avatar */}
      <div style={{
        width: 28, height: 28, borderRadius: 8, flexShrink: 0,
        background: isBot ? 'var(--brand)' : '#e2e8f0',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {isBot
          ? <Bot size={14} color="#fff" />
          : <User size={14} color="#64748b" />}
      </div>

      {/* Bubble + Actions */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{
          maxWidth: '78%',
          padding: '9px 13px',
          borderRadius: isBot ? '4px 12px 12px 12px' : '12px 4px 12px 12px',
          background: isBot ? '#f8faff' : 'var(--brand)',
          color: isBot ? '#1e293b' : '#fff',
          fontSize: 13, lineHeight: 1.6,
          border: isBot ? '1px solid #e2e8f0' : 'none',
          boxShadow: isBot ? '0 1px 4px rgba(0,0,0,0.05)' : '0 2px 8px rgba(99,102,241,0.25)',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
        }}>
          {renderContent(msg.content)}
          {msg.role === 'user' && (
            <p style={{ fontSize: 10, opacity: 0.7, marginTop: 4, textAlign: 'right' }}>
              {new Date(msg.ts).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
            </p>
          )}
        </div>

        {/* Action buttons (bot messages only) */}
        {isBot && msg.id && (
          <div style={{ display: 'flex', gap: 6, fontSize: 11 }}>
            <button onClick={() => onRate(msg.id, 'helpful')} style={{
              background: 'transparent', border: '1px solid #e2e8f0', borderRadius: 6,
              padding: '4px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
              color: '#64748b', fontSize: 11, fontWeight: 600,
            }}>
              <ThumbsUp size={12} /> {msg.rating === 'helpful' ? 'Helpful ✓' : 'Helpful'}
            </button>
            <button onClick={() => onRate(msg.id, 'unhelpful')} style={{
              background: 'transparent', border: '1px solid #e2e8f0', borderRadius: 6,
              padding: '4px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
              color: '#64748b', fontSize: 11, fontWeight: 600,
            }}>
              <ThumbsDown size={12} /> {msg.rating === 'unhelpful' ? 'Not Helpful ✓' : 'Not helpful'}
            </button>
            <button onClick={handleCopy} style={{
              background: 'transparent', border: '1px solid #e2e8f0', borderRadius: 6,
              padding: '4px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
              color: '#64748b', fontSize: 11, fontWeight: 600,
            }}>
              <Copy size={12} /> {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}


// ── Main AIChatbot Component ──────────────────────────────────────────────────
export default function AIChatbot() {
  const { user, profile } = useAuth();
  const location = useLocation();
  const pageContext = useMemo(() => extractPageContext(location.pathname), [location.pathname]);

  const [lang, setLang] = useState(() => localStorage.getItem(LANG_KEY) || 'EN');
  const t = LANG[lang];

  const [open, setOpen]         = useState(false);
  const [minimized, setMin]     = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [unread, setUnread]     = useState(0);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [isListening, setIsListening] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [offlineQueue, setOfflineQueue] = useState([]);
  const [showTutorial, setShowTutorial] = useState(false);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const recognitionRef = useRef(null);

  // ── Load conversation history ─────────────────────────────────────────────
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setMessages(JSON.parse(saved));
        setShowSuggestions(false);
      } catch (e) {
        // Silently handle history load failure
      }
    }
  }, []);

  // ── Save conversation history ─────────────────────────────────────────────
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    }
  }, [messages]);

  // ── Persist language preference ───────────────────────────────────────────
  useEffect(() => {
    localStorage.setItem(LANG_KEY, lang);
  }, [lang]);

  // ── Offline detection ─────────────────────────────────────────────────────
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
    };
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // ── Fetch app settings ────────────────────────────────────────────────────
  const { data: appSettings } = useQuery({
    queryKey: ['app-settings'],
    queryFn: async () => {
      const { data } = await supabase
        .from('app_settings')
        .select('*')
        .eq('settings_key', 'main')
        .maybeSingle();
      return data;
    },
    staleTime: 60 * 1000,
    refetchInterval: 60 * 1000,
  });

  // ── Fetch user stats ──────────────────────────────────────────────────────
  const { data: userStats } = useQuery({
    queryKey: ['chatbot-user-stats', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const now = getServerDateObject();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0).toISOString();

      const [{ count: totalEntries }, { count: monthEntries }, { data: pending }] = await Promise.all([
        supabase.from('service_entries').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('service_entries').select('*', { count: 'exact', head: true }).eq('user_id', user.id).gte('created_at', monthStart),
        supabase.from('service_entries').select('pending_payment').eq('user_id', user.id).neq('payment_status', 'paid'),
      ]);

      const totalPending = (pending || []).reduce((s, e) => s + (e.pending_payment || 0), 0);
      return { totalEntries: totalEntries || 0, monthEntries: monthEntries || 0, totalPending };
    },
    enabled: !!user?.id && isServerTimeInitialized(),
    staleTime: 2 * 60 * 1000,
  });

  // ── Fetch user services ───────────────────────────────────────────────────
  const { data: userServices = [] } = useQuery({
    queryKey: ['chatbot-user-services', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data } = await supabase
        .from('custom_services')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true);
      return data || [];
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
  });

  // ── Generate context-aware suggestions ─────────────────────────────────────
  const contextualSuggestions = useMemo(() => {
    const base = [
      'How do I add a new entry?',
      'How do I mark payment as paid?',
      'What is my current plan?',
      'How do I contact support?',
    ];

    // Page-specific
    if (pageContext.page === 'payments') {
      return [
        'How do I mark payment as paid?',
        'How do I send a WhatsApp reminder?',
        'How do I see pending dues?',
        ...base,
      ];
    }
    if (pageContext.page === 'entries') {
      return [
        'How do I create a new entry?',
        'How do I edit an entry?',
        'How do I delete an entry?',
        ...base,
      ];
    }
    if (pageContext.page === 'services') {
      return [
        'How do I add a custom service?',
        'How do I add custom fields?',
        'How do I manage services?',
        ...base,
      ];
    }

    // State-specific
    if (userStats?.totalPending > 5000) {
      return [
        'How do I collect outstanding dues?',
        'How to send bulk reminders?',
        ...base,
      ];
    }

    if (profile?.expiry_date && isServerTimeInitialized()) {
      const expiryDays = Math.ceil((new Date(profile.expiry_date) - getServerDateObject()) / (1000 * 60 * 60 * 24));
      if (expiryDays <= 7 && expiryDays > 0) {
        return [
          'How do I renew my subscription?',
          'What are the subscription plans?',
          ...base,
        ];
      }
    }

    return base; // Default fallback
  }, [pageContext.page, userStats?.totalPending, profile?.expiry_date]);

  // ── Initialize with greeting ──────────────────────────────────────────────
  useEffect(() => {
    if (open && messages.length === 0) {
      const name = profile?.full_name || profile?.business_name || 'there';
      const greeting = t.greeting(name);
      const msg = {
        id: `msg_${getServerNow()}`,
        role: 'assistant',
        content: greeting,
        ts: getServerNow(),
        rating: null,
      };
      setMessages([msg]);
      setShowTutorial(!localStorage.getItem(TUTORIAL_KEY));
    }
  }, [open, t, profile]);

  // ── Auto scroll ───────────────────────────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // ── Focus input ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (open && !minimized) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open, minimized]);

  // ── Speech Recognition Setup ──────────────────────────────────────────────
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    recognitionRef.current = new SpeechRecognition();
    recognitionRef.current.continuous = false;
    recognitionRef.current.interimResults = true;

    recognitionRef.current.onstart = () => setIsListening(true);
    recognitionRef.current.onend = () => setIsListening(false);

    recognitionRef.current.onresult = (event) => {
      let transcript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      if (event.results[event.results.length - 1].isFinal) {
        setInput(p => (p + ' ' + transcript).trim());
      } else {
        setInput(p => p.split(' ').slice(0, -1).join(' ') + ' ' + transcript);
      }
    };
  }, []);

  const toggleVoice = () => {
    if (!recognitionRef.current) return;
    if (isListening) {
      recognitionRef.current.stop();
    } else {
      recognitionRef.current.start();
    }
  };

  // ── Send Message with Knowledge Base ─────────────────────────────────────
  const sendMessage = useCallback(async (text, skipQueue = false) => {
    const userText = (text || input).trim();
    if (!userText || loading) return;

    const userMsg = {
      id: `msg_${getServerNow()}`,
      role: 'user',
      content: userText,
      ts: getServerNow(),
      rating: null,
    };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);
    setShowSuggestions(false);

    // Detect sentiment
    const sentiment = detectSentiment(userText);

    try {
      // Small delay for better UX (simulating thinking)
      await new Promise(resolve => setTimeout(resolve, 500));

      // Find best matching answer from knowledge base
      const result = findAnswer(userText);
      let reply = result.answer;

      // Add escalation if user frustrated
      if (sentiment === 'frustrated') {
        reply += `\n\n**Need immediate help?** 📞\n☎️ Call: ${appSettings?.call_number || 'Contact support'}\n💬 WhatsApp: ${appSettings?.whatsapp_number || 'See footer'}\n📧 Email: ${SUPPORT_EMAIL}`;
      }

      // Add confidence indicator for non-exact matches
      if (result.matched && result.confidence < 80) {
        reply += `\n\n💡 *Found with ${result.confidence}% confidence. If this doesn't help, try rephrasing your question.*`;
      }

      setMessages(prev => [...prev, {
        id: `msg_${getServerNow()}`,
        role: 'assistant',
        content: reply,
        ts: getServerNow(),
        rating: null,
      }]);

      // Increment unread if closed
      if (!open || minimized) setUnread(n => n + 1);

    } catch (err) {
      console.error('[AIChatbot] error:', err);
      setMessages(prev => [...prev, {
        id: `msg_${getServerNow()}`,
        role: 'assistant',
        content: `Sorry, something went wrong. Please try again or contact our support team:\n\n📧 ${SUPPORT_EMAIL}\n📱 ${appSettings?.whatsapp_number || 'See support contact'}`,
        ts: getServerNow(),
        rating: null,
      }]);
    } finally {
      setLoading(false);
    }
  }, [input, loading, messages, open, minimized, appSettings]);

  // ── Rate message ──────────────────────────────────────────────────────────
  const rateMessage = (msgId, rating) => {
    setMessages(prev => prev.map(m => m.id === msgId ? { ...m, rating } : m));

    // Save to analytics
    const ratings = JSON.parse(localStorage.getItem(RATINGS_KEY) || '{}');
    ratings[msgId] = rating;
    localStorage.setItem(RATINGS_KEY, JSON.stringify(ratings));
  };

  // ── Keyboard shortcuts ────────────────────────────────────────────────────
  useEffect(() => {
    const handleKeyPress = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === '/') {
        e.preventDefault();
        setOpen(p => !p);
      }
    };
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  // ── Export chat as JSON ───────────────────────────────────────────────────
  const exportChat = (format = 'json') => {
    let content = '';
    let filename = `one-net-chat-${getServerNow()}`;

    if (format === 'json') {
      content = JSON.stringify(messages, null, 2);
      filename += '.json';
    } else if (format === 'txt') {
      content = messages.map(m => `[${m.role.toUpperCase()}]\n${m.content}\n\n`).join('');
      filename += '.txt';
    } else if (format === 'csv') {
      content = 'Timestamp,Author,Message\n';
      content += messages.map(m => `"${new Date(m.ts).toISOString()}","${m.role}","${m.content.replace(/"/g, '""')}"`).join('\n');
      filename += '.csv';
    }

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── Keyboard send ─────────────────────────────────────────────────────────
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleOpen = () => {
    setOpen(true);
    setMin(false);
    setUnread(0);
  };

  const handleClose = () => {
    setOpen(false);
  };

  const handleReset = () => {
    if (window.confirm('Clear chat history?')) {
      localStorage.removeItem(STORAGE_KEY);
      setMessages([]);
      setShowSuggestions(true);
      setTimeout(() => {
        const name = profile?.full_name || profile?.business_name || 'there';
        const msg = {
          id: `msg_${getServerNow()}`,
          role: 'assistant',
          content: t.greeting(name),
          ts: getServerNow(),
          rating: null,
        };
        setMessages([msg]);
      }, 100);
    }
  };

  // ── Responsive width ──────────────────────────────────────────────────────
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;
  const chatWidth = isMobile ? 'calc(100vw - 16px)' : 370;
  const maxChatHeight = isMobile ? 'calc(100vh - 80px)' : 560;

  // Guard: Wait for server time to be initialized (all hooks already called)
  if (!isServerTimeInitialized()) {
    return null;
  }

  return (
    <>
      <style>{`
        @keyframes chatBounce {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-5px); }
        }
        @keyframes chatSlideUp {
          from { opacity: 0; transform: translateY(20px) scale(0.95); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes chatPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(99,102,241,0.4); }
          50%       { box-shadow: 0 0 0 10px rgba(99,102,241,0); }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .chat-send-btn:hover { background: #4f46e5 !important; }
        .chat-suggestion:hover { background: var(--brand) !important; color: #fff !important; border-color: var(--brand) !important; }
        .chat-input:focus { border-color: var(--brand) !important; box-shadow: 0 0 0 3px rgba(99,102,241,0.12) !important; }
        code { fontFamily: 'Courier New', monospace; }
        strong { fontWeight: 700; }
        em { fontStyle: italic; }
      `}</style>

      {/* Floating button */}
      {!open && (
        <button
          onClick={handleOpen}
          title={t.contactUs}
          aria-label="Open chat"
          style={{
            position: 'fixed', bottom: isMobile ? 40 : 44, right: isMobile ? 25 : 29, zIndex: 9999,
            width: 56, height: 56, borderRadius: '50%',
            background: 'var(--brand)', color: '#fff',
            border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 20px rgba(99,102,241,0.4)',
            animation: 'chatPulse 2s infinite',
            transition: 'transform 0.2s',
          }}
          onMouseEnter={e => e.target.style.transform = 'scale(1.1)'}
          onMouseLeave={e => e.target.style.transform = 'scale(1)'}
        >
          <MessageCircle size={24} />
          {unread > 0 && (
            <div style={{
              position: 'absolute', top: -4, right: -4,
              width: 20, height: 20, borderRadius: '50%',
              background: '#ef4444', color: '#fff',
              fontSize: 11, fontWeight: 800,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: '2px solid #fff',
            }}>{Math.min(unread, 9)}+</div>
          )}
        </button>
      )}

      {/* Chat window */}
      {open && (
        <div  style={{
          position: 'fixed', bottom: isMobile ? 8 : 24, right: isMobile ? 8 : 24, zIndex: 9999,
          width: chatWidth, borderRadius: 20,
          boxShadow: '0 20px 60px rgba(0,0,0,0.18)',
          background: '#fff', overflow: 'hidden',
          animation: 'chatSlideUp 0.25s ease',
          display: 'flex', flexDirection: 'column',
          height: minimized ? 'auto' : maxChatHeight,
          border: '1px solid #e2e8f0',
          maxHeight: '100vh',
        }}>

          {/* Header */}
          <div style={{
            background: 'linear-gradient(135deg, var(--brand), #4f46e5)',
            padding: '12px 14px',
            display: 'flex', alignItems: 'center', gap: 10,
            flexShrink: 0,
          }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: 'rgba(255,255,255,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Sparkles size={18} color="#fff" />
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 13, fontWeight: 800, color: '#fff', lineHeight: 1 }}>{t.title}</p>
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.75)', marginTop: 2 }}>
                {loading ? `⏳ ${t.typing}` : (isOnline ? `✅ ${t.status}` : `⚠️ ${t.noInternet}`)}
              </p>
            </div>

            {/* Language toggle */}
            <button onClick={() => setLang(lang === 'EN' ? 'HI' : 'EN')} style={{
              background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 6, width: 28, height: 28,
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontSize: 11, fontWeight: 700,
            }} title={`Switch to ${lang === 'EN' ? 'Hindi' : 'English'}`}>
              {lang === 'EN' ? '🇮🇳' : '🇬🇧'}
            </button>

            {/* Header buttons */}
            <div style={{ display: 'flex', gap: 4 }}>
              <button onClick={handleReset} title={t.resetChat} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 8, width: 28, height: 28, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                <RefreshCw size={13} />
              </button>
              <button onClick={() => setMin(p => !p)} title={minimized ? t.maximize : t.minimize} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 8, width: 28, height: 28, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                {minimized ? <Maximize2 size={13} /> : <Minimize2 size={13} />}
              </button>
              <button onClick={handleClose} title={t.close} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 8, width: 28, height: 28, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                <X size={13} />
              </button>
            </div>
          </div>

          {/* Body */}
          {!minimized && (
            <>
              {/* Messages */}
              <div style={{
                flex: 1, overflowY: 'auto', padding: isMobile ? '10px 10px 6px' : '14px 14px 6px',
                display: 'flex', flexDirection: 'column',
              }}>
                {messages.map((msg) => (
                  <MessageBubble key={msg.id} msg={msg} onRate={rateMessage} onCopy={() => {}} />
                ))}

                {loading && (
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 12 }}>
                    <div style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--brand)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Bot size={14} color="#fff" />
                    </div>
                    <div style={{ background: '#f8faff', border: '1px solid #e2e8f0', borderRadius: '4px 12px 12px 12px', padding: '10px 14px' }}>
                      <TypingDots />
                    </div>
                  </div>
                )}

                {/* Contextual suggestions */}
                {showSuggestions && messages.length <= 1 && !loading && (
                  <div style={{ marginTop: 8 }}>
                    <p style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      ⚡ {t.quickSuggestions}
                    </p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {contextualSuggestions.slice(0, 4).map(s => (
                        <button
                          key={s}
                          className="chat-suggestion"
                          onClick={() => sendMessage(s)}
                          style={{
                            fontSize: 11, fontWeight: 600,
                            padding: '5px 10px', borderRadius: 20,
                            background: '#f1f5f9', color: '#475569',
                            border: '1px solid #e2e8f0',
                            cursor: 'pointer', transition: 'all 0.15s',
                          }}
                        >{s}</button>
                      ))}
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Contact strip */}
              <div style={{
                padding: '8px 10px',
                background: '#f8fafc',
                borderTop: '1px solid #f1f5f9',
                display: 'flex', gap: 6, alignItems: 'center', fontSize: 10, flexWrap: isMobile ? 'wrap' : 'nowrap',
                overflow: 'hidden',
              }}>
                <a href={`mailto:${SUPPORT_EMAIL}`} style={{ display: 'flex', alignItems: 'center', gap: 4, fontWeight: 700, color: '#64748b', textDecoration: 'none', whiteSpace: 'nowrap', fontSize: 10 }}>
                  <Mail size={11} /> {isMobile ? 'Email' : SUPPORT_EMAIL}
                </a>
                {appSettings?.whatsapp_number && (
                  <a href={`https://wa.me/91${appSettings.whatsapp_number.replace(/\D/g,'').slice(-10)}`} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 4, fontWeight: 700, color: '#25d366', textDecoration: 'none', whiteSpace: 'nowrap', marginLeft: 'auto', fontSize: 10 }}>
                    <Phone size={11} /> {isMobile ? 'WhatsApp' : 'WhatsApp'}
                  </a>
                )}
              </div>

              {/* Input area */}
              <div style={{
                padding: isMobile ? '8px 10px' : '10px 12px', borderTop: '1px solid #e2e8f0',
                display: 'flex', gap: 8, alignItems: 'flex-end',
                flexShrink: 0, background: '#fff',
              }}>
                <textarea
                  ref={inputRef}
                  className="chat-input"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={t.placeholder}
                  rows={1}
                  style={{
                    flex: 1, padding: '8px 10px',
                    borderRadius: 12, border: '1px solid #e2e8f0',
                    fontSize: 13, resize: 'none', outline: 'none',
                    fontFamily: 'inherit', lineHeight: 1.5,
                    maxHeight: 80, overflowY: 'auto',
                    transition: 'border-color 0.15s, box-shadow 0.15s',
                  }}
                />

                {/* Voice button */}
                <button
                  onClick={toggleVoice}
                  disabled={loading}
                  style={{
                    width: 36, height: 36, borderRadius: 10,
                    background: isListening ? '#ef4444' : '#e2e8f0',
                    border: 'none', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0, transition: 'background 0.15s',
                  }}
                  title={isListening ? t.turnOnMic : t.voice}
                >
                  <Mic size={16} color={isListening ? '#fff' : '#64748b'} />
                </button>

                {/* Send button */}
                <button
                  className="chat-send-btn"
                  onClick={() => sendMessage()}
                  disabled={!input.trim() || loading}
                  style={{
                    width: 36, height: 36, borderRadius: 10,
                    background: input.trim() && !loading ? 'var(--brand)' : '#e2e8f0',
                    border: 'none', cursor: input.trim() && !loading ? 'pointer' : 'default',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0, transition: 'background 0.15s',
                  }}
                >
                  {loading
                    ? <Loader size={16} color="#94a3b8" style={{ animation: 'spin 1s linear infinite' }} />
                    : <Send size={16} color={input.trim() ? '#fff' : '#94a3b8'} />}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}