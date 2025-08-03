import { useState, useCallback, useRef, useEffect } from "react";
import { RTVIEvent } from "@pipecat-ai/client-js";
import { useRTVIClientEvent, usePipecatClientTransportState } from "@pipecat-ai/client-react";

interface TranscriptChunk {
  id: string;
  text: string;
  final: boolean;
}

interface TranscriptMessage {
  id: string;
  role: "user" | "bot";
  chunks: TranscriptChunk[];
  timestamp: Date;
}

export function MessagesPanel() {
  const [messages, setMessages] = useState<TranscriptMessage[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const transportState = usePipecatClientTransportState();
  const previousTransportState = useRef(transportState);

  // Clear messages when connection is established
  useEffect(() => {
    if (previousTransportState.current !== "ready" && transportState === "ready") {
      setMessages([]);
    }
    previousTransportState.current = transportState;
  }, [transportState]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Handle user transcripts
  useRTVIClientEvent(
    RTVIEvent.UserTranscript,
    useCallback((data: any) => {
      if (data?.text) {
        setMessages(prev => {
          const chunkId = Date.now().toString() + Math.random();
          const newChunk: TranscriptChunk = {
            id: chunkId,
            text: data.text,
            final: data.final || false,
          };

          if (prev.length === 0 || prev[prev.length - 1].role !== 'user') {
            // Create new user message
            return [...prev, {
              id: Date.now().toString() + Math.random(),
              role: 'user',
              chunks: [newChunk],
              timestamp: new Date(),
            }];
          }
          
          // Update existing user message
          const updated = [...prev];
          const lastMessage = updated[updated.length - 1];
          const updatedChunks = [...lastMessage.chunks];
          
          // Find if there's a non-final chunk to replace
          const nonFinalIndex = updatedChunks.findIndex(chunk => !chunk.final);
          
          if (nonFinalIndex !== -1) {
            // Replace the non-final chunk
            updatedChunks[nonFinalIndex] = newChunk;
          } else {
            // All chunks are final, add new chunk
            updatedChunks.push(newChunk);
          }
          
          updated[updated.length - 1] = {
            ...lastMessage,
            chunks: updatedChunks,
          };
          
          return updated;
        });
      }
    }, [])
  );

  // Handle bot TTS text
  useRTVIClientEvent(
    RTVIEvent.BotTtsText,
    useCallback((data: any) => {
      if (data?.text) {
        setMessages(prev => {
          const chunkId = Date.now().toString() + Math.random();
          const newChunk: TranscriptChunk = {
            id: chunkId,
            text: data.text,
            final: false,
          };

          if (prev.length === 0 || prev[prev.length - 1].role !== 'bot') {
            // Create new bot message
            return [...prev, {
              id: Date.now().toString() + Math.random(),
              role: 'bot',
              chunks: [newChunk],
              timestamp: new Date(),
            }];
          }
          
          // Update existing bot message
          const updated = [...prev];
          const lastMessage = updated[updated.length - 1];
          
          // For bot messages, always append (don't replace)
          updated[updated.length - 1] = {
            ...lastMessage,
            chunks: [...lastMessage.chunks, newChunk],
          };
          
          return updated;
        });
      }
    }, [])
  );

  // Mark bot chunks as final when TTS stops
  useRTVIClientEvent(
    RTVIEvent.BotTtsStopped,
    useCallback(() => {
      setMessages(prev => {
        if (prev.length > 0 && prev[prev.length - 1].role === 'bot') {
          const updated = [...prev];
          const lastMessage = updated[updated.length - 1];
          
          // Mark all chunks as final
          updated[updated.length - 1] = {
            ...lastMessage,
            chunks: lastMessage.chunks.map(chunk => ({ ...chunk, final: true })),
          };
          
          return updated;
        }
        return prev;
      });
    }, [])
  );

  const formatTimestamp = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour12: true,
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit'
    }).toUpperCase();
  };

  return (
    <div className="h-full terminal-box p-4 flex flex-col relative">
      {/* Terminal header */}
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-green-400">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-bold terminal-text tracking-wider">
            COMMUNICATION LOG
          </h3>
          <span className="text-xs opacity-50">// ENCRYPTED CHANNEL</span>
        </div>
        <div className="text-xs terminal-text opacity-50">
          MSGS: {messages.length}
        </div>
      </div>
      
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto min-h-0 terminal-scrollbar">
        {messages.length === 0 ? (
          <div className="text-center py-8">
            <div className="terminal-text opacity-50 text-sm mb-2">
              ═══ AWAITING TRANSMISSION ═══
            </div>
            <div className="text-xs opacity-30">
              Initialize voice link to begin communication
            </div>
          </div>
        ) : (
          <div className="space-y-0">
            {messages.map((message) => (
              <div
                key={message.id}
                className="font-mono text-sm"
              >
                <div className={`flex ${
                  message.role === 'user' ? 'text-cyan' : 'text-green-400'
                }`}>
                  <span className="opacity-70">[{formatTimestamp(message.timestamp)}]</span>
                  <span className="mx-2">
                    {message.role === 'user' ? ' USR >' : ' BOT <'}
                  </span>
                  <span className="flex-1">
                    {message.chunks.map((chunk, index) => (
                      <span key={chunk.id} className={
                        message.role === 'user' && !chunk.final ? 'opacity-60' : ''
                      }>
                        {chunk.text}
                        {index < message.chunks.length - 1 ? ' ' : ''}
                      </span>
                    ))}
                    {message.role === 'user' && !message.chunks[message.chunks.length - 1]?.final && (
                      <span className="inline-block w-2 h-4 bg-current ml-1 animate-pulse"></span>
                    )}
                  </span>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>
      
      {/* Status line */}
      <div className="mt-3 pt-2 border-t border-green-400/30 text-xs opacity-50 flex justify-between">
        <span>MODE: VOICE/TEXT</span>
        <span>BUFFER: OK</span>
      </div>
    </div>
  );
}