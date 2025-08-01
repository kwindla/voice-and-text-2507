import { useState, useEffect, useRef } from "react";
import { AudioClientHelper } from "@pipecat-ai/voice-ui-kit";
import { usePipecatClient, usePipecatClientTransportState, usePipecatClientMicControl } from "@pipecat-ai/client-react";

interface RTVIEvent {
  id: string;
  type: string;
  data: any;
  timestamp: Date;
}

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

interface VoiceUIProps {
  handleConnect?: () => void;
  handleDisconnect?: () => void;
  error?: Error | null;
}

function VoiceUI({ handleConnect, handleDisconnect, error }: VoiceUIProps) {
  const [inputText, setInputText] = useState("");
  const [isBotSpeaking, setIsBotSpeaking] = useState(false);
  const [isUserSpeaking, setIsUserSpeaking] = useState(false);
  const [selectedMicrophone, setSelectedMicrophone] = useState<string>("");
  const [availableMicrophones, setAvailableMicrophones] = useState<MediaDeviceInfo[]>([]);
  const [rtviEvents, setRtviEvents] = useState<RTVIEvent[]>([]);
  const [transcriptMessages, setTranscriptMessages] = useState<TranscriptMessage[]>([]);
  const eventsEndRef = useRef<HTMLDivElement>(null);
  const transcriptEndRef = useRef<HTMLDivElement>(null);
  
  const client = usePipecatClient();
  const transportState = usePipecatClientTransportState();
  const { enableMic, isMicEnabled } = usePipecatClientMicControl();

  // Get available microphone devices
  useEffect(() => {
    const getDevices = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const mics = devices.filter(device => device.kind === 'audioinput');
        setAvailableMicrophones(mics);
        if (mics.length > 0 && !selectedMicrophone) {
          setSelectedMicrophone(mics[0].deviceId);
        }
      } catch (error) {
        console.error("Error getting devices:", error);
      }
    };

    getDevices();
    navigator.mediaDevices.addEventListener('devicechange', getDevices);
    return () => {
      navigator.mediaDevices.removeEventListener('devicechange', getDevices);
    };
  }, [selectedMicrophone]);

  // Auto-scroll to bottom when new events arrive
  useEffect(() => {
    eventsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [rtviEvents]);

  // Auto-scroll to bottom when new transcript messages arrive
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [transcriptMessages]);


  // Listen to ALL RTVI events
  useEffect(() => {
    if (!client) return;

    const handleRTVIEvent = (event: string, data: any) => {
      const newEvent: RTVIEvent = {
        id: Date.now().toString() + Math.random(),
        type: event,
        data: data,
        timestamp: new Date(),
      };
      setRtviEvents(prev => [...prev.slice(-99), newEvent]); // Keep last 100 events
    };

    // List of all RTVI events from the RTVIEvent enum
    const rtviEventHandlers = {
      // Connection events
      connected: () => handleRTVIEvent('connected', {}),
      disconnected: () => handleRTVIEvent('disconnected', {}),
      transportStateChanged: (state: any) => handleRTVIEvent('transportStateChanged', state),
      
      // Bot events
      botReady: (data: any) => handleRTVIEvent('botReady', data),
      botDisconnected: (participant: any) => handleRTVIEvent('botDisconnected', participant),
      error: (message: any) => handleRTVIEvent('error', message),
      
      // Server messaging
      serverMessage: (data: any) => handleRTVIEvent('serverMessage', data),
      serverResponse: (data: any) => handleRTVIEvent('serverResponse', data),
      appendToContextResult: (data: any) => handleRTVIEvent('appendToContextResult', data),
      
      // Transcription events
      userTranscript: (data: any) => {
        handleRTVIEvent('userTranscript', data);
        if (data?.text) {
          setTranscriptMessages(prev => {
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
      },
      botTranscript: (data: any) => {
        handleRTVIEvent('botTranscript', data);
        // We're using botTTSText for real-time rendering instead
      },
      transcript: (data: any) => handleRTVIEvent('transcript', data),
      
      // Speaking events
      userStartedSpeaking: () => {
        handleRTVIEvent('userStartedSpeaking', {});
        setIsUserSpeaking(true);
        setIsBotSpeaking(false);
      },
      userStoppedSpeaking: () => {
        handleRTVIEvent('userStoppedSpeaking', {});
        setIsUserSpeaking(false);
      },
      botStartedSpeaking: () => {
        handleRTVIEvent('botStartedSpeaking', {});
        setIsBotSpeaking(true);
        setIsUserSpeaking(false);
      },
      botStoppedSpeaking: () => {
        handleRTVIEvent('botStoppedSpeaking', {});
        setIsBotSpeaking(false);
      },
      
      // LLM events
      userLLMText: (data: any) => handleRTVIEvent('userLLMText', data),
      botLLMText: (data: any) => handleRTVIEvent('botLLMText', data),
      botLLMStarted: (data: any) => handleRTVIEvent('botLLMStarted', data),
      botLLMStopped: (data: any) => handleRTVIEvent('botLLMStopped', data),
      llmFunctionCall: (data: any) => handleRTVIEvent('llmFunctionCall', data),
      llmFunctionCallResult: (data: any) => handleRTVIEvent('llmFunctionCallResult', data),
      botLLMSearchResponse: (data: any) => handleRTVIEvent('botLLMSearchResponse', data),
      
      // TTS events
      botTtsText: (data: any) => {
        handleRTVIEvent('botTtsText', data);
        // Update bot message with word-by-word text as it's spoken
        if (data?.text) {
          setTranscriptMessages(prev => {
            const chunkId = Date.now().toString() + Math.random();
            const newChunk: TranscriptChunk = {
              id: chunkId,
              text: data.text,
              final: false,  // TTS text chunks are not final until TTS stops
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
      },
      botTtsStarted: (data: any) => {
        handleRTVIEvent('botTtsStarted', data);
        // Could use this to show typing indicator or prepare for new bot message
      },
      botTtsStopped: (data: any) => {
        handleRTVIEvent('botTtsStopped', data);
        // Mark all bot chunks as final when TTS stops
        setTranscriptMessages(prev => {
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
      },
      
      // Metrics
      metrics: (data: any) => handleRTVIEvent('metrics', data),
      messageError: (message: any) => handleRTVIEvent('messageError', message),
      
      // Participant events
      participantJoined: (participant: any) => handleRTVIEvent('participantJoined', participant),
      participantLeft: (participant: any) => handleRTVIEvent('participantLeft', participant),
      
      // Track events
      trackStarted: (data: any) => handleRTVIEvent('trackStarted', data),
      trackStopped: (data: any) => handleRTVIEvent('trackStopped', data),
      
      // Message for generic events
      message: (message: any) => handleRTVIEvent('message', message),
    };

    // Subscribe to all events
    Object.entries(rtviEventHandlers).forEach(([event, handler]) => {
      try {
        client.on(event as any, handler as any);
      } catch (e) {
        console.debug(`Could not subscribe to event: ${event}`);
      }
    });

    return () => {
      // Unsubscribe from all events
      Object.entries(rtviEventHandlers).forEach(([event, handler]) => {
        try {
          client.off(event as any, handler as any);
        } catch (e) {
          console.debug(`Could not unsubscribe from event: ${event}`);
        }
      });
    };
  }, [client]);

  const handleToggleMute = () => {
    enableMic(!isMicEnabled);
  };

  const handleMicrophoneChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedMicrophone(e.target.value);
    if (client && client.updateMicrophone) {
      client.updateMicrophone(e.target.value);
    }
  };

  const getSpeakingStateIndicator = () => {
    if (isUserSpeaking) {
      return (
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse" />
          <span className="text-blue-400">User Speaking...</span>
        </div>
      );
    } else if (isBotSpeaking) {
      return (
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
          <span className="text-green-400">Bot Speaking...</span>
        </div>
      );
    } else {
      return (
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-gray-600 rounded-full" />
          <span className="text-gray-500">Ready</span>
        </div>
      );
    }
  };

  const isConnected = transportState === "ready";
  const isConnecting = transportState === "connecting" || transportState === "initializing";

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 flex flex-col">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 p-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <h1 className="text-2xl font-mono">ᓚᘏᗢ Pipecat</h1>
          <div className="flex items-center gap-4">
            {getSpeakingStateIndicator()}
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${
                isConnected ? "bg-green-500" : 
                isConnecting ? "bg-yellow-500" :
                error ? "bg-red-500" : "bg-gray-600"
              }`} />
              <span className="text-sm">
                {isConnected ? "Connected" : 
                 isConnecting ? "Connecting..." :
                 error ? "Error" : "Disconnected"}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-6xl mx-auto w-full p-4 flex flex-col">
        {/* Transcript Area */}
        <div className="flex-1 bg-gray-800 rounded-lg p-4 mb-4 overflow-y-auto">
          {transcriptMessages.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              Start a conversation by clicking the button below
            </div>
          ) : (
            <div className="space-y-4">
              {transcriptMessages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${
                    message.role === 'user' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  <div
                    className={`max-w-[70%] rounded-lg p-4 ${
                      message.role === 'user'
                        ? 'bg-blue-900/50 border border-blue-700'
                        : 'bg-gray-700 border border-gray-600'
                    }`}
                  >
                    <div className={`text-xs font-medium mb-1 ${
                      message.role === 'user' ? 'text-blue-400' : 'text-green-400'
                    }`}>
                      {message.role === 'user' ? 'User' : 'Bot'}
                    </div>
                    <div className={`text-sm ${
                      message.role === 'user' ? 'text-blue-100' : 'text-gray-100'
                    }`}>
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
              <div ref={transcriptEndRef} />
            </div>
          )}
        </div>

        {/* Events Panel */}
        <div className="bg-gray-800 rounded-lg p-4 mb-4 h-32 overflow-y-auto">
          <h3 className="text-sm font-medium text-gray-400 mb-2">RTVI Events</h3>
          <div className="space-y-1 text-xs font-mono">
            {rtviEvents.length === 0 ? (
              <div className="text-gray-600">No events yet...</div>
            ) : (
              rtviEvents.map((event) => (
                <div key={event.id} className="text-gray-400 truncate">
                  <span className="text-gray-500">{event.timestamp.toLocaleTimeString()}</span>
                  {" "}
                  <span className="text-blue-400">{event.type}</span>:
                  {" "}
                  <span className="text-gray-300">
                    {event.data ? JSON.stringify(event.data).slice(0, 100) : "{}"}
                    {event.data && JSON.stringify(event.data).length > 100 ? "..." : ""}
                  </span>
                </div>
              ))
            )}
            <div ref={eventsEndRef} />
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-900/20 border border-red-700 rounded-lg p-4 mb-4">
            <p className="text-red-400 text-sm">{error.message}</p>
          </div>
        )}

        {/* Controls Area */}
        <div className="bg-gray-800 rounded-lg p-4 space-y-4">
          {/* Microphone Controls */}
          <div className="flex gap-4 items-center">
            <div className="flex-1">
              <label htmlFor="microphone-select" className="block text-sm font-medium text-gray-400 mb-1">
                Microphone
              </label>
              <select
                id="microphone-select"
                value={selectedMicrophone}
                onChange={handleMicrophoneChange}
                className="w-full bg-gray-700 text-gray-100 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={!isConnected}
              >
                {availableMicrophones.map((mic) => (
                  <option key={mic.deviceId} value={mic.deviceId}>
                    {mic.label || `Microphone ${mic.deviceId.slice(0, 8)}`}
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={handleToggleMute}
              disabled={!isConnected}
              className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                !isConnected
                  ? "bg-gray-700 text-gray-500 cursor-not-allowed"
                  : !isMicEnabled
                  ? "bg-red-600 hover:bg-red-700 text-white"
                  : "bg-gray-700 hover:bg-gray-600 text-gray-100"
              }`}
            >
              {!isMicEnabled ? "Unmute" : "Mute"}
            </button>
          </div>

          {/* Text Input */}
          <div className="flex gap-2">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Type a message... (not yet implemented)"
              className="flex-1 bg-gray-700 text-gray-100 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              disabled
            />
            <button
              disabled
              className="bg-gray-700 text-gray-400 px-6 py-2 rounded-lg cursor-not-allowed opacity-50"
            >
              Send
            </button>
          </div>

          {/* Voice Control Button */}
          <button
            onClick={() => {
              if (isConnected || isConnecting) {
                handleDisconnect?.();
                setIsBotSpeaking(false);
                setIsUserSpeaking(false);
              } else {
                handleConnect?.();
              }
            }}
            disabled={isConnecting}
            className={`w-full py-4 rounded-lg font-medium transition-colors ${
              isConnected
                ? "bg-red-600 hover:bg-red-700 text-white"
                : isConnecting
                ? "bg-yellow-600 text-white opacity-75 cursor-wait"
                : "bg-blue-600 hover:bg-blue-700 text-white"
            }`}
          >
            {isConnected ? "Disconnect" : isConnecting ? "Connecting..." : "Start Voice Chat"}
          </button>
        </div>
      </main>
    </div>
  );
}

export default function SimpleVoiceUI() {
  return (
    <AudioClientHelper
      transportType="smallwebrtc"
      connectParams={{
        connectionUrl: "/api/offer",  // Changed to relative path like Jon's demo
      }}
    >
      {({ handleConnect, handleDisconnect, error }) => (
        <VoiceUI
          handleConnect={handleConnect}
          handleDisconnect={handleDisconnect}
          error={error}
        />
      )}
    </AudioClientHelper>
  );
}