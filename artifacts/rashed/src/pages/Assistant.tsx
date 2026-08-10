import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Send, Bot, User, Plus, Loader2, MessageCircle } from 'lucide-react';
import { PageShell } from '@/components/PageShell';
import { useI18n } from '@/lib/i18n';
import { api, type Message, type Conversation } from '@/lib/api';

export default function Assistant() {
  const { t, isRtl, lang } = useI18n();
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
    if (!content || !activeConvId || sending) return;
    setInput('');
    setSending(true);

    const userMsg: Message = { id: Date.now(), conversationId: activeConvId, role: 'user', content, createdAt: new Date().toISOString() };
    setLocalMessages((prev) => [...prev, userMsg]);

    try {
      const { assistantMessage } = await api.assistant.sendMessage(activeConvId, content, lang);
      setLocalMessages((prev) => [...prev.filter((m) => m.id !== userMsg.id), userMsg, assistantMessage]);
    } catch {
      const errMsg: Message = { id: Date.now() + 1, conversationId: activeConvId, role: 'assistant', content: t('assistant_error'), createdAt: new Date().toISOString() };
      setLocalMessages((prev) => [...prev, errMsg]);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex flex-col h-screen max-w-md mx-auto bg-white" dir={isRtl ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-safe pt-4 pb-3 border-b border-gray-100 bg-white">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 bg-blue-100 rounded-xl flex items-center justify-center">
            <Bot size={18} className="text-blue-600" />
          </div>
          <div>
            <p className="font-semibold text-gray-900 text-sm">{t('assistant_title')}</p>
            <p className="text-xs text-gray-400">رَشَد AI</p>
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

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 pb-20">
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
              <div className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${msg.role === 'user' ? 'bg-blue-600 text-white rounded-tr-sm' : 'bg-gray-100 text-gray-800 rounded-tl-sm'}`}>
                {msg.content}
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

      {/* Input */}
      {activeConvId && (
        <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white border-t border-gray-100 px-4 py-3 pb-safe">
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
      )}
    </div>
  );
}
