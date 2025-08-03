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

  return (
    <div className="h-full bg-black border border-terminal/50 rounded-lg p-4 flex flex-col">
      <div className="flex-1 overflow-y-auto min-h-0">
        {messages.length === 0 ? (
          <div className="text-center text-terminal/70 py-8">
            Start a conversation by clicking the button below
          </div>
        ) : (
          <div className="space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${
                message.role === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              <div
                className="max-w-[70%] bg-black border border-terminal/50 rounded-lg p-4"
              >
                <div className="text-xs font-medium mb-1 text-terminal">
                  {message.role === 'user' ? 'User' : 'Bot'}
                </div>
                <div className="text-sm text-terminal">
                  {message.chunks.map((chunk, index) => (
                    <span key={chunk.id} className={
                      message.role === 'user' && !chunk.final ? 'italic opacity-70' : ''
                    }>
                      {chunk.text}
                      {index < message.chunks.length - 1 ? ' ' : ''}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      )}
      </div>
    </div>
  );
}