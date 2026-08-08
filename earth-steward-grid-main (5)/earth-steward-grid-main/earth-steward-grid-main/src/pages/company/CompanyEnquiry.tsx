import { useState, useRef, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { createSession, sendMessage } from '@/services/chatbot';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, Bot, User, Phone, Mail, Loader2 } from 'lucide-react';

interface Message {
  id: string;
  sender: 'bot' | 'user';
  text: string;
  timestamp: Date;
}

const quickQuestions = [
  'What is the current price per carbon credit?',
  'How long is a certificate valid?',
  'What documents are required for a purchase?',
  'How do I track my purchase request?'
];

export default function CompanyEnquiry() {
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([
    { id: '1', sender: 'bot', text: 'Welcome to the Carbon Credit Helpdesk! How can I assist you today? You can ask me about pricing, documents, validity, or certificates.', timestamp: new Date() },
  ]);
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Init session on mount
  useEffect(() => {
    createSession().then(token => setSessionToken(token)).catch(console.error);
  }, []);

  const chatMutation = useMutation({
    mutationFn: (text: string) => sendMessage(sessionToken!, text),
    onSuccess: (reply) => {
      setMessages(prev => [...prev, { id: Date.now().toString(), sender: 'bot', text: reply, timestamp: new Date() }]);
    },
    onError: (error: any) => {
      const isLoading = error?.message?.includes('loading');
      const errText = isLoading
        ? '⏳ The AI model is warming up. Please wait a moment and try again.'
        : 'Sorry, I am having trouble connecting. Please try again later.';
      setMessages(prev => [...prev, { id: Date.now().toString(), sender: 'bot', text: errText, timestamp: new Date() }]);
    }
  });

  const handleSend = (text: string) => {
    if (!text.trim() || chatMutation.isPending) return;
    setMessages(prev => [...prev, { id: Date.now().toString(), sender: 'user', text, timestamp: new Date() }]);
    setInput('');
    chatMutation.mutate(text);
  };

  return (
    <div className="flex gap-4 h-[calc(100vh-8rem)]">
      <aside className="hidden md:block w-72 shrink-0">
        <Card className="h-full">
          <CardContent className="p-4 space-y-4">
            <h3 className="text-sm font-semibold">Quick Questions</h3>
            <div className="space-y-2">
              {quickQuestions.map((q, i) => (
                <Button key={i} variant="outline" size="sm" className="w-full text-left justify-start text-xs h-auto py-2 whitespace-normal text-left" onClick={() => handleSend(q)} disabled={chatMutation.isPending}>
                  {q}
                </Button>
              ))}
            </div>
            <div className="border-t border-border pt-4">
              <h3 className="text-sm font-semibold mb-3">Contact Authority</h3>
              <div className="space-y-2 text-xs text-muted-foreground">
                <div className="flex items-center gap-2"><Phone className="h-3.5 w-3.5" /> 1800-123-4567</div>
                <div className="flex items-center gap-2"><Mail className="h-3.5 w-3.5" /> carbon.credits@gov.in</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </aside>

      <Card className="flex-1 flex flex-col">
        <div className="p-4 border-b border-border">
          <h2 className="text-sm font-semibold text-foreground">Carbon Credit Helpdesk</h2>
          <p className="text-xs text-muted-foreground">Powered by HuggingFace AI (Mistral-7B)</p>
        </div>
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4">
            {messages.map(msg => (
              <div key={msg.id} className={`flex gap-3 ${msg.sender === 'user' ? 'justify-end' : ''}`}>
                {msg.sender === 'bot' && (
                  <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center shrink-0">
                    <Bot className="h-4 w-4 text-primary-foreground" />
                  </div>
                )}
                <div className={`max-w-[75%] rounded-xl p-3 text-sm ${msg.sender === 'bot' ? 'bg-secondary text-foreground' : 'bg-primary text-primary-foreground'}`}>
                  <p className="whitespace-pre-wrap">{msg.text}</p>
                  <p className={`text-xs mt-1 ${msg.sender === 'bot' ? 'text-muted-foreground' : 'opacity-70'}`}>
                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                {msg.sender === 'user' && (
                  <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center shrink-0">
                    <User className="h-4 w-4 text-accent-foreground" />
                  </div>
                )}
              </div>
            ))}
            {chatMutation.isPending && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center shrink-0"><Bot className="h-4 w-4 text-primary-foreground" /></div>
                <div className="bg-secondary text-foreground rounded-xl p-3 text-sm flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Thinking...</div>
              </div>
            )}
            <div ref={scrollRef} />
          </div>
        </ScrollArea>
        <div className="p-4 border-t border-border">
          <form onSubmit={e => { e.preventDefault(); handleSend(input); }} className="flex gap-2">
            <Input placeholder="Type your question..." value={input} onChange={e => setInput(e.target.value)} disabled={chatMutation.isPending} />
            <Button type="submit" size="icon" disabled={chatMutation.isPending || !input.trim()}><Send className="h-4 w-4" /></Button>
          </form>
        </div>
      </Card>
    </div>
  );
}
