import React, { useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { isConnectInsuranceApiEnabled, connectPost } from '@/lib/connectApi';
import {
  getCoverageScenariosForSegment,
  getSegmentDisplayName,
  type CoverageScenario,
} from '@/constants/coverageScenarios';
import { usePolicySelection } from '@/contexts/PolicySelectionContext';
import { Bot, Send, Shield, Sparkles } from 'lucide-react';

type Msg = { role: 'user' | 'assistant'; content: string };

interface Props {
  onBack: () => void;
}

const AmICoveredChat: React.FC<Props> = ({ onBack }) => {
  const { user } = useAuth();
  const { selectedPolicy } = usePolicySelection();
  const [inChat, setInChat] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Msg[]>([]);
  const [sending, setSending] = useState(false);
  const [lastModelUsed, setLastModelUsed] = useState<string | null>(null);
  const [lastFallbackUsed, setLastFallbackUsed] = useState<boolean>(false);
  const [lastFallbackReason, setLastFallbackReason] = useState<string | null>(null);
  const segment = selectedPolicy?.segment ?? null;

  const scenarios: CoverageScenario[] = useMemo(
    () => getCoverageScenariosForSegment(segment),
    [segment],
  );

  const segmentLabel = useMemo(() => getSegmentDisplayName(segment), [segment]);

  const modelBadge = useMemo(() => {
    if (!lastModelUsed) return 'Claude primary, Gemini fallback';
    if (lastFallbackUsed) return `${lastModelUsed} (fallback: ${lastFallbackReason || 'yes'})`;
    return lastModelUsed;
  }, [lastModelUsed, lastFallbackReason, lastFallbackUsed]);

  const send = async (q?: string) => {
    const message = (q ?? input).trim();
    if (!message || sending) return;
    setInput('');
    setInChat(true);
    setSending(true);
    setMessages((prev) => [...prev, { role: 'user', content: message }]);
    try {
      let reply: string;
      if (isConnectInsuranceApiEnabled()) {
        const chatRes = await connectPost<{ message: string }>('/chat', {
          message,
          chatHistory: messages.slice(-8),
          policyId: selectedPolicy?.id ?? null,
          policyContext: selectedPolicy,
          aiSummary: null,
        });
        if (!chatRes.ok || !chatRes.data?.message) {
          throw new Error(chatRes.error || 'Chat failed');
        }
        reply = chatRes.data.message;
        setLastModelUsed('CID-PDF-API');
        setLastFallbackUsed(false);
        setLastFallbackReason(null);
      } else {
        const { data, error } = await supabase.functions.invoke('coverage-chat', {
          body: {
            message,
            chatHistory: messages.slice(-8),
            userId: user?.id ?? null,
          },
        });
        if (error) throw error;
        reply = data?.message || 'I could not process that request.';
        setLastModelUsed(data?.model_used ?? null);
        setLastFallbackUsed(Boolean(data?.fallback_used));
        setLastFallbackReason(data?.fallback_reason ?? null);
      }
      setMessages((prev) => [...prev, { role: 'assistant', content: reply }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Coverage chat is temporarily unavailable. Please try again.' },
      ]);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card className="border-0 shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-green-600" />
            Am I Covered?
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2 flex-wrap">
            <Badge className="bg-green-100 text-green-700 border-0">AI Coverage Assistant</Badge>
            <Badge variant="outline">{segmentLabel} scenarios</Badge>
            <Badge variant="outline">{modelBadge}</Badge>
          </div>
          <p className="text-sm text-gray-600">
            Tap a scenario built for {segmentLabel.toLowerCase()} businesses, or ask your own question about limits, exclusions, and deductibles.
          </p>
          <div className="flex gap-2">
            <Button onClick={() => setInChat(true)}>
              <Sparkles className="w-4 h-4 mr-2" />
              Start Chat
            </Button>
            <Button variant="outline" onClick={onBack}>Back</Button>
          </div>
        </CardContent>
      </Card>

      {!inChat && (
        <Card className="border-0 shadow-md">
          <CardHeader>
            <CardTitle className="text-base">Quick scenarios for {segmentLabel}</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {scenarios.map((s) => (
              <button
                key={s.id}
                onClick={() => send(s.prompt)}
                disabled={sending}
                className="text-left p-3 rounded-lg border border-green-100 bg-green-50/40 hover:bg-green-50 transition-colors"
              >
                <span className="font-medium text-sm text-gray-800">{s.label}</span>
                <span className="block text-xs text-gray-500 mt-1 line-clamp-2">{s.prompt}</span>
              </button>
            ))}
          </CardContent>
        </Card>
      )}

      {inChat && (
        <Card className="border-0 shadow-md">
          <CardContent className="p-4 space-y-3">
            {!messages.length && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pb-2">
                {scenarios.slice(0, 4).map((s) => (
                  <button
                    key={s.id}
                    onClick={() => send(s.prompt)}
                    disabled={sending}
                    className="text-left p-2 rounded-md border text-xs hover:bg-gray-50"
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            )}
            <div className="max-h-80 overflow-y-auto space-y-2">
              {messages.length === 0 && (
                <p className="text-sm text-gray-500">Ask about limits, exclusions, and deductibles.</p>
              )}
              {messages.map((m, idx) => (
                <div
                  key={idx}
                  className={`p-3 rounded-lg ${m.role === 'user' ? 'bg-[#1B3A5F] text-white' : 'bg-gray-100 text-gray-800'}`}
                >
                  <div className="flex items-center gap-2 text-xs mb-1">
                    {m.role === 'assistant' && <Bot className="w-3 h-3" />}
                    {m.role}
                  </div>
                  {m.content}
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask: Am I covered for ...?"
                rows={2}
              />
              <Button disabled={sending} onClick={() => send()}>
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AmICoveredChat;
