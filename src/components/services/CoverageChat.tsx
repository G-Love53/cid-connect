import React, { useState, useEffect, useRef } from 'react';
import { 
  ArrowLeft, 
  MessageCircle, 
  Send, 
  Loader2,
  Bot,
  User,
  RefreshCw,
  Phone,
  Sparkles,
  Info
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Policy, ChatMessage } from '@/types';
import { toast } from '@/components/ui/use-toast';
import { getAiSummaryForPolicy, getActivePolicyForUser } from '@/api';
import { isConnectInsuranceApiEnabled, connectPost } from '@/lib/connectApi';

interface CoverageChatProps {
  onBack: () => void;
}

const CoverageChat: React.FC<CoverageChatProps> = ({ onBack }) => {
  const { user } = useAuth();
  const [policy, setPolicy] = useState<Policy | null>(null);
  const [aiSummary, setAiSummary] = useState<any>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [hasCoverageContext, setHasCoverageContext] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user) {
      fetchPolicyAndSummary();
      fetchChatHistory();
    }
  }, [user]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchPolicyAndSummary = async () => {
    if (!user) return;
    
    try {
      const policyData = await getActivePolicyForUser(user.id);
      if (policyData) {
        setPolicy(policyData);
        const summary = await getAiSummaryForPolicy(user.id, policyData.segment);
        if (summary) {
          setAiSummary(summary);
          setHasCoverageContext(true);
        }
      }
    } catch (err) {
      console.error('Error fetching policy:', err);
    }
  };

  const fetchChatHistory = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true })
        .limit(50);

      if (!error && data) {
        setMessages(data);
      }
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const saveChatMessage = async (role: 'user' | 'assistant', content: string) => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .insert({
          user_id: user.id,
          policy_id: policy?.id || null,
          role,
          content
        })
        .select()
        .single();

      if (!error && data) {
        return data;
      }
    } catch (err) {
      console.error('Error saving message:', err);
    }
    return null;
  };

  const handleSend = async () => {
    if (!inputMessage.trim() || sending) return;

    const userMessage = inputMessage.trim();
    setInputMessage('');
    setSending(true);

    // Add user message to UI immediately
    const tempUserMessage: ChatMessage = {
      id: `temp-${Date.now()}`,
      user_id: user?.id || '',
      policy_id: policy?.id || null,
      role: 'user',
      content: userMessage,
      created_at: new Date().toISOString()
    };
    setMessages(prev => [...prev, tempUserMessage]);

    try {
      // Save user message
      await saveChatMessage('user', userMessage);

      // Get recent chat history for context (last 10 messages)
      const recentHistory = messages.slice(-10).map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      let assistantMessage: string;

      if (isConnectInsuranceApiEnabled()) {
        const chatRes = await connectPost<{ message: string }>('/chat', {
          message: userMessage,
          policyContext: policy,
          chatHistory: recentHistory,
          aiSummary: aiSummary
        });
        if (!chatRes.ok || !chatRes.data?.message) {
          throw new Error(chatRes.error || 'Chat request failed');
        }
        assistantMessage = chatRes.data.message;
      } else {
        const { data, error } = await supabase.functions.invoke('coverage-chat', {
          body: {
            message: userMessage,
            policyContext: policy,
            chatHistory: recentHistory,
            aiSummary: aiSummary
          }
        });
        if (error) throw error;
        assistantMessage = data.message || "I'm sorry, I couldn't process your request.";
      }

      // Save and display assistant message
      const savedAssistant = await saveChatMessage('assistant', assistantMessage);
      
      const assistantChatMessage: ChatMessage = {
        id: savedAssistant?.id || `temp-assistant-${Date.now()}`,
        user_id: user?.id || '',
        policy_id: policy?.id || null,
        role: 'assistant',
        content: assistantMessage,
        created_at: new Date().toISOString()
      };
      
      setMessages(prev => [...prev, assistantChatMessage]);

    } catch (err: any) {
      console.error('Error sending message:', err);
      toast({
        title: 'Error',
        description: 'Failed to get response. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  // Enhanced quick questions based on coverage context
  const quickQuestions = hasCoverageContext ? [
    "What are my coverage limits?",
    "What's my deductible for property damage?",
    "Am I covered for water damage?",
    "What exclusions apply to my policy?",
    "How do I file a claim?",
    "When does my policy renew?"
  ] : [
    "What does my policy cover?",
    "How do I file a claim?",
    "What's my deductible?",
    "When does my policy renew?"
  ];

  return (
    <div className="flex flex-col h-[calc(100vh-180px)]">
      {/* Header */}
      <div className="flex-shrink-0 mb-4">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-4"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Back to Policy</span>
        </button>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <MessageCircle className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-800">Policy Chat</h1>
              <p className="text-sm text-gray-500">AI-powered coverage assistant</p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="text-[#1B3A5F] border-[#1B3A5F] hover:bg-[#1B3A5F]/10"
            onClick={() => toast({ title: 'Connecting...', description: 'An agent will call you shortly.' })}
          >
            <Phone className="w-4 h-4 mr-1" />
            Talk to Agent
          </Button>
        </div>

        {/* Coverage Context Indicator */}
        {hasCoverageContext && (
          <div className="mt-3 flex items-center gap-2 px-3 py-2 bg-green-50 rounded-lg border border-green-200">
            <Sparkles className="w-4 h-4 text-green-600" />
            <span className="text-sm text-green-700">
              Enhanced mode: I have access to your detailed coverage analysis
            </span>
          </div>
        )}
        
        {!hasCoverageContext && policy && (
          <div className="mt-3 flex items-center gap-2 px-3 py-2 bg-yellow-50 rounded-lg border border-yellow-200">
            <Info className="w-4 h-4 text-yellow-600" />
            <span className="text-sm text-yellow-700">
              Basic mode: Limited coverage details available
            </span>
          </div>
        )}
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto bg-gray-50 rounded-xl p-4 space-y-4">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <RefreshCw className="w-6 h-6 animate-spin text-[#F7941D]" />
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-8">
            <Bot className="w-12 h-12 mx-auto text-gray-300 mb-3" />
            <h3 className="font-medium text-gray-600 mb-2">How can I help you today?</h3>
            <p className="text-sm text-gray-400 mb-6">
              {hasCoverageContext 
                ? "Ask me about your specific coverage limits, deductibles, and what's covered"
                : "Ask me anything about your coverage"
              }
            </p>
            <div className="space-y-2">
              {quickQuestions.map((question, index) => (
                <button
                  key={index}
                  onClick={() => {
                    setInputMessage(question);
                  }}
                  className="block w-full text-left px-4 py-2 bg-white rounded-lg text-sm text-gray-600 hover:bg-orange-50 hover:text-[#F7941D] transition-colors border border-transparent hover:border-[#F7941D]/20"
                >
                  {question}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {message.role === 'assistant' && (
                  <div className="flex-shrink-0 w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                    <Bot className="w-4 h-4 text-green-600" />
                  </div>
                )}
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                    message.role === 'user'
                      ? 'bg-[#1B3A5F] text-white rounded-br-md'
                      : 'bg-white shadow-sm rounded-bl-md'
                  }`}
                >
                  <p className={`text-sm whitespace-pre-wrap ${message.role === 'user' ? 'text-white' : 'text-gray-700'}`}>
                    {message.content}
                  </p>
                  <p className={`text-xs mt-1 ${message.role === 'user' ? 'text-blue-200' : 'text-gray-400'}`}>
                    {formatTime(message.created_at)}
                  </p>
                </div>
                {message.role === 'user' && (
                  <div className="flex-shrink-0 w-8 h-8 bg-[#F7941D] rounded-full flex items-center justify-center">
                    <User className="w-4 h-4 text-white" />
                  </div>
                )}
              </div>
            ))}
            {sending && (
              <div className="flex gap-3 justify-start">
                <div className="flex-shrink-0 w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                  <Bot className="w-4 h-4 text-green-600" />
                </div>
                <div className="bg-white shadow-sm rounded-2xl rounded-bl-md px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-[#F7941D]" />
                    <span className="text-sm text-gray-400">Analyzing your coverage...</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input Area */}
      <div className="flex-shrink-0 mt-4">
        <div className="flex gap-2">
          <Textarea
            placeholder={hasCoverageContext 
              ? "Ask about your coverage limits, deductibles, exclusions..." 
              : "Type your question..."
            }
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            rows={1}
            className="flex-1 resize-none border-gray-200 rounded-xl min-h-[48px] max-h-[120px] focus:ring-[#F7941D] focus:border-[#F7941D]"
            disabled={sending}
          />
          <Button
            onClick={handleSend}
            disabled={!inputMessage.trim() || sending}
            className="h-12 w-12 bg-[#F7941D] hover:bg-[#E07D0D] rounded-xl"
          >
            {sending ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </Button>
        </div>
        <p className="text-xs text-gray-400 text-center mt-2">
          {hasCoverageContext 
            ? "Powered by your policy's AI coverage analysis. Contact your agent for policy changes."
            : "AI responses are for informational purposes. Contact your agent for policy changes."
          }
        </p>
      </div>
    </div>
  );
};

export default CoverageChat;
