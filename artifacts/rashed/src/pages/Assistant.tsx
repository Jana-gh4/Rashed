import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Send, Bot, User, Plus, Loader2, MessageCircle } from 'lucide-react';
import { BottomNav } from '@/components/BottomNav';
import { useI18n } from '@/lib/i18n';
import { api, type Message } from '@/lib/api';
import { useAuth } from '@/lib/auth';

// ── Markdown renderer ────────────────────────────────────────────────────────
function renderInline(text: string): React.ReactNode[] {
  // Split on **bold** and *italic* patterns
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
      return <em key={i}>{part.slice(1, -1)}</em>;
    }
    return part;
  });
}

function MarkdownMessage({ content, isUser }: { content: string; isUser: boolean }) {
  const lines = content.split('\n');
  const nodes: React.ReactNode[] = [];
  let bulletBuffer: string[] = [];

  const flushBullets = () => {
    if (bulletBuffer.length === 0) return;
    nodes.push(
      <ul key={`ul-${nodes.length}`} className="list-disc list-inside space-y-0.5 my-1">
        {bulletBuffer.map((b, i) => (
          <li key={i} className="text-sm leading-relaxed">{renderInline(b)}</li>
        ))}
      </ul>
    );
    bulletBuffer = [];
  };

  lines.forEach((line, i) => {
    const bulletMatch = line.match(/^[\*\-•] (.+)/);
    if (bulletMatch) {
      bulletBuffer.push(bulletMatch[1]);
    } else {
      flushBullets();
      if (line.trim() === '') {
        // empty line — spacer
        nodes.push(<div key={`sp-${i}`} className="h-1" />);
      } else {
        nodes.push(
          <p key={`p-${i}`} className="text-sm leading-relaxed">{renderInline(line)}</p>
        );
      }
    }
  });
  flushBullets();

  return <div className={`space-y-0.5 ${isUser ? 'text-white' : 'text-gray-800'}`}>{nodes}</div>;
}

// ── Main page ────────────────────────────────────────────────────────────────
export default function Assistant() {
  const { t, isRtl, lang } = useI18n();
  const { user } = useAuth();
  const qc = useQueryClient();

  const [activeConvId, setActiveConvId] = useState<number | null>(null);
  const [input, setInput] = useState('');
  const [localMessages, setLocalMessages] = useState<Message[]>([]);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: conversations } = useQuery({ queryKey: ['conversations'], queryFn: api.assistant.getConversations });

  const { data: serverMessages } = useQuery({
    queryKey: ['messages', activeConvId],
    queryFn: () => api.assistant.getMessages(activeConvId!),
    enabled: activeConvId != null,
  });

  useEffect(() => {
    if (serverMessages) setLocalMessages(serverMessages);
  }, [serverMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [localMessages]);

  // Auto-start first conversation
  useEffect(() => {
    if (conversations && conversations.length > 0 && !activeConvId) {
      setActiveConvId(conversations[0].id);
    }
  }, [conversations]);

  const createConv = useMutation({
    mutationFn: () => api.assistant.createConversation(),
    onSuccess: (conv) => {
      qc.invalidateQueries({ queryKey: ['conversations'] });
      setActiveConvId(conv.id);
      setLocalMessages([]);
    },
  });

  const SAMPLE_QUESTIONS = [
    t('assistant_sample_q1'),
    t('assistant_sample_q2'),
    t('assistant_sample_q3'),
    t('assistant_sample_q4'),
  ];

  const sendMessage = async (text?: string) => {
    const content = text ?? input.trim();
    if (!content || sending) return;
    setInput('');
    setSending(true);

    // Auto-create conversation if none exists
    let convId = activeConvId;
    if (!convId) {
      try {
        const conv = await api.assistant.createConversation();
        qc.invalidateQueries({ queryKey: ['conversations'] });
        setActiveConvId(conv.id);
        convId = conv.id;
      } catch {
        setSending(false);
        return;
      }
    }

    const userMsg: Message = { id: Date.now(), conversationId: convId, role: 'user', content, createdAt: new Date().toISOString() };
    setLocalMessages((prev) => [...prev, userMsg]);

    try {
      const { assistantMessage } = await api.assistant.sendMessage(convId, content, lang);
      setLocalMessages((prev) => [...prev.filter((m) => m.id !== userMsg.id), userMsg, assistantMessage]);
    } catch {
      const errMsg: Message = { id: Date.now() + 1, conversationId: convId, role: 'assistant', content: t('assistant_error'), createdAt: new Date().toISOString() };
      setLocalMessages((prev) => [...prev, errMsg]);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex flex-col h-screen max-w-md mx-auto bg-white" dir={isRtl ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-safe pt-4 pb-3 border-b border-gray-100 bg-white flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 bg-blue-100 rounded-xl flex items-center justify-center">
            <Bot size={18} className="text-blue-600" />
          </div>
          <div>
            <p className="font-semibold text-gray-900 text-sm">{t('assistant_title')}</p>
            <p className="text-xs text-gray-400">رشّد AI</p>
          </div>
        </div>
        <button
          onClick={() => createConv.mutate()}
          disabled={createConv.isPending}
          className="w-8 h-8 bg-gray-100 rounded-xl flex items-center justify-center hover:bg-gray-200"
        >
          <Plus size={16} className="text-gray-600" />
        </button>
      </div>

      {/* Messages — scrollable, leaves room for input + nav */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4" style={{ paddingBottom: '8rem' }}>
        {!activeConvId ? (
          <div className="flex flex-col items-center justify-center h-full gap-6 text-center py-12">
            <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center">
              <MessageCircle size={28} className="text-blue-400" />
            </div>
            <div>
              <p className="font-semibold text-gray-700 mb-1">{t('assistant_title')}</p>
              <p className="text-sm text-gray-400">{isRtl ? 'ابدأ محادثة جديدة' : 'Start a new conversation'}</p>
            </div>
            <button onClick={() => createConv.mutate()} className="px-6 py-3 bg-blue-600 text-white rounded-xl font-medium text-sm">
              {t('assistant_new_chat')}
            </button>

            {/* Sample questions */}
            <div className="w-full space-y-2 mt-4">
              <p className="text-xs text-gray-400 text-center">{isRtl ? 'أسئلة مقترحة:' : 'Suggested questions:'}</p>
              {SAMPLE_QUESTIONS.map((q, i) => (
                <button
                  key={i}
                  onClick={() => createConv.mutate()}
                  className="w-full text-start px-4 py-3 bg-gray-50 rounded-xl text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        ) : localMessages.length === 0 ? (
          <div className="space-y-2 mt-4">
            <p className="text-xs text-gray-400 text-center">{isRtl ? 'أسئلة مقترحة:' : 'Suggested questions:'}</p>
            {SAMPLE_QUESTIONS.map((q, i) => (
              <button
                key={i}
                onClick={() => sendMessage(q)}
                className="w-full text-start px-4 py-3 bg-gray-50 rounded-xl text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors"
              >
                {q}
              </button>
            ))}
          </div>
        ) : (
          localMessages.map((msg) => (
            <div key={msg.id} className={`flex gap-2 ${msg.role === 'user' ? (isRtl ? 'flex-row' : 'flex-row-reverse') : (isRtl ? 'flex-row-reverse' : 'flex-row')}`}>
              <div className={`w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center ${msg.role === 'user' ? 'bg-blue-600' : 'bg-gray-100'}`}>
                {msg.role === 'user' ? <User size={14} className="text-white" /> : <Bot size={14} className="text-gray-600" />}
              </div>
              <div className={`max-w-[80%] px-4 py-3 rounded-2xl ${msg.role === 'user' ? 'bg-blue-600 text-white rounded-tr-sm' : 'bg-gray-100 text-gray-800 rounded-tl-sm'}`}>
                <MarkdownMessage content={msg.content} isUser={msg.role === 'user'} />
              </div>
            </div>
          ))
        )}

        {sending && (
          <div className={`flex gap-2 ${isRtl ? 'flex-row-reverse' : 'flex-row'}`}>
            <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
              <Bot size={14} className="text-gray-600" />
            </div>
            <div className="bg-gray-100 px-4 py-3 rounded-2xl rounded-tl-sm">
              <Loader2 size={16} className="text-gray-500 animate-spin" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Chat input — always visible, auto-creates conversation on first send */}
      <div className="border-t border-gray-100 bg-white px-4 pt-3 pb-3 flex-shrink-0">
        <div className="flex items-center gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
            placeholder={t('assistant_placeholder')}
            disabled={sending}
            className="flex-1 px-4 py-3 bg-gray-100 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
            dir={isRtl ? 'rtl' : 'ltr'}
          />
          <button
            onClick={() => sendMessage()}
            disabled={!input.trim() || sending}
            className="w-11 h-11 bg-blue-600 rounded-2xl flex items-center justify-center disabled:opacity-40 hover:bg-blue-700 transition-colors flex-shrink-0"
          >
            <Send size={18} className="text-white" />
          </button>
        </div>
      </div>

      {/* Spacer so the fixed BottomNav doesn't cover the input */}
      <div className="h-16 flex-shrink-0" />

      {/* Bottom nav (fixed) */}
      <BottomNav />
    </div>
  );
}
