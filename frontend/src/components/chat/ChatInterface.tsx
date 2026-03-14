'use client';

import { useState, useEffect, useRef } from 'react';
import { ragService, type ChatMessage, type ChatSource } from '@/services/ragService';
import { authService } from '@/services/authService';
import { useNovaTutorSocket } from '@/hooks/useNovaTutorSocket';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface ChatInterfaceProps {
  courseId?: string;
  courseName?: string;
  onVoiceStateChange?: (state: {
    isConnected: boolean;
    isRecording: boolean;
    isSpeaking: boolean;
    currentEmotion: string;
    currentViseme: Record<string, number>;
  }) => void;
}

export default function ChatInterface({ courseId, courseName, onVoiceStateChange }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sources, setSources] = useState<ChatSource[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Voice chat integration
  const {
    connect,
    disconnect,
    isConnected,
    isRecording,
    startRecording,
    stopRecording,
    transcript,
    error: voiceError,
    currentViseme,
    isSpeaking,
    currentEmotion,
  } = useNovaTutorSocket();

  // Notify parent of voice state changes
  useEffect(() => {
    if (onVoiceStateChange) {
      onVoiceStateChange({
        isConnected,
        isRecording,
        isSpeaking,
        currentEmotion,
        currentViseme,
      });
    }
  }, [isConnected, isRecording, isSpeaking, currentEmotion, currentViseme, onVoiceStateChange]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load welcome message
  useEffect(() => {
    const welcomeMsg: ChatMessage = {
      role: 'assistant',
      content: `Hi! I'm Nova, your AI tutor${courseName ? ` for ${courseName}` : ''}. How can I help you today?`,
      timestamp: new Date(),
    };
    setMessages([welcomeMsg]);
  }, [courseName]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const user = authService.getUser();
    if (!user) {
      alert('Please login to chat');
      return;
    }

    // Add user message
    const userMessage: ChatMessage = {
      role: 'user',
      content: input,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      // Get AI response
      const response = await ragService.chat(input, courseId, messages);

      // Add assistant message
      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: response.response,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
      setSources(response.sources);
    } catch (error: any) {
      console.error('Chat error:', error);
      const errorMessage: ChatMessage = {
        role: 'assistant',
        content: `Sorry, I encountered an error: ${error.message}. Please try again.`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const toggleVoice = async () => {
    if (isConnected) {
      disconnect();
    } else {
      await connect();
    }
  };

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  // Auto-send transcript as message
  useEffect(() => {
    if (transcript && transcript.trim()) {
      setInput(transcript);
    }
  }, [transcript]);

  return (
    <div className="flex flex-col h-full bg-white rounded-lg shadow-lg">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4 rounded-t-lg">
        <h2 className="text-xl font-bold">💬 Chat with Nova</h2>
        {courseName && (
          <p className="text-sm opacity-90">{courseName}</p>
        )}
      </div>

      {/* Messages */}
      <div className="h-0 min-h-0 grow space-y-4 overflow-y-auto bg-gray-50 p-4">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[75%] rounded-lg p-3 ${
                msg.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-800 shadow'
              }`}
            >
              {msg.role === 'assistant' && (
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl">🤖</span>
                  <span className="font-semibold text-sm">Nova</span>
                </div>
              )}
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                className={
                  msg.role === 'user'
                    ? 'prose prose-sm prose-invert max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0'
                    : 'prose prose-sm max-w-none text-gray-800 [&>*:first-child]:mt-0 [&>*:last-child]:mb-0'
                }
              >
                {msg.content}
              </ReactMarkdown>
              <p className="text-xs opacity-70 mt-2">
                {msg.timestamp.toLocaleTimeString()}
              </p>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-white rounded-lg p-3 shadow">
              <div className="flex items-center gap-2">
                <span className="text-2xl">🤖</span>
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200"></div>
                </div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Sources */}
      {sources.length > 0 && (
        <div className="border-t p-3 bg-gray-100">
          <p className="text-xs font-semibold text-gray-600 mb-2">📚 Sources:</p>
          <div className="space-y-1">
            {sources.map((source, idx) => (
              <div key={idx} className="text-xs text-gray-700 bg-white p-2 rounded">
                <span className="font-medium">{source.document_name}</span>
                <span className="text-gray-500 ml-2">
                  (Relevance: {(source.similarity_score * 100).toFixed(0)}%)
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="border-t p-4 bg-white rounded-b-lg">
        {/* Voice Controls */}
        <div className="flex gap-2 mb-3">
          <button
            onClick={toggleVoice}
            className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors text-sm font-medium ${
              isConnected
                ? 'bg-red-600 hover:bg-red-700 text-white'
                : 'bg-green-600 hover:bg-green-700 text-white'
            }`}
          >
            {isConnected ? '🎙️ Stop Voice' : '🎙️ Start Voice'}
          </button>

          {isConnected && (
            <button
              onClick={toggleRecording}
              className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors text-sm font-medium ${
                isRecording
                  ? 'bg-red-600 hover:bg-red-700 text-white'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              {isRecording ? (
                <>
                  <span className="inline-block w-2 h-2 rounded-full bg-white animate-pulse" />
                  Recording
                </>
              ) : (
                '🎤 Record'
              )}
            </button>
          )}

          {transcript && (
            <div className="flex-1 px-3 py-2 bg-blue-50 text-blue-800 rounded-lg text-xs flex items-center">
              <span className="font-medium">Transcript:</span>
              <span className="ml-2 truncate">{transcript}</span>
            </div>
          )}

          {voiceError && (
            <div className="flex-1 px-3 py-2 bg-red-50 text-red-800 rounded-lg text-xs">
              {voiceError}
            </div>
          )}
        </div>

        {/* Text Input */}
        <div className="flex gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask me anything..."
            className="flex-1 border rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            rows={2}
            disabled={loading}
          />
          <button
            onClick={handleSend}
            disabled={loading || !input.trim()}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? '⏳' : '📤'}
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Press Enter to send, Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}

