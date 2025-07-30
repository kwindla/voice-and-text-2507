import { useState, useEffect, useRef } from "react";
import { AudioClientHelper, TranscriptOverlay } from "@pipecat-ai/voice-ui-kit";
import { usePipecatClient, usePipecatClientTransportState, useRTVIClientEvent } from "@pipecat-ai/client-react";

interface RTVIEvent {
  id: string;
  type: string;
  data: any;
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
  const [isMuted, setIsMuted] = useState(false);
  const [selectedMicrophone, setSelectedMicrophone] = useState<string>("");
  const [availableMicrophones, setAvailableMicrophones] = useState<MediaDeviceInfo[]>([]);
  const [rtviEvents, setRtviEvents] = useState<RTVIEvent[]>([]);
  const eventsEndRef = useRef<HTMLDivElement>(null);
  
  const client = usePipecatClient();
  const transportState = usePipecatClientTransportState();

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

  // Set up event listeners when client is ready
  useEffect(() => {
    if (!client) return;

    const handleBotStartedSpeaking = () => {
      console.log("Bot started speaking");
      setIsBotSpeaking(true);
      setIsUserSpeaking(false);
    };
    
    const handleBotStoppedSpeaking = () => {
      console.log("Bot stopped speaking");
      setIsBotSpeaking(false);
    };
    
    const handleUserStartedSpeaking = () => {
      console.log("User started speaking");
      setIsUserSpeaking(true);
      setIsBotSpeaking(false);
    };
    
    const handleUserStoppedSpeaking = () => {
      console.log("User stopped speaking");
      setIsUserSpeaking(false);
    };

    // Subscribe to events
    client.on("botStartedSpeaking", handleBotStartedSpeaking);
    client.on("botStoppedSpeaking", handleBotStoppedSpeaking);
    client.on("userStartedSpeaking", handleUserStartedSpeaking);
    client.on("userStoppedSpeaking", handleUserStoppedSpeaking);

    return () => {
      client.off("botStartedSpeaking", handleBotStartedSpeaking);
      client.off("botStoppedSpeaking", handleBotStoppedSpeaking);
      client.off("userStartedSpeaking", handleUserStartedSpeaking);
      client.off("userStoppedSpeaking", handleUserStoppedSpeaking);
    };
  }, [client]);

  // Listen to client events and messages
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

    // Handle various client events
    const handleTranscript = (data: any) => {
      handleRTVIEvent('transcript', data);
    };
    
    const handleMessage = (message: any) => {
      handleRTVIEvent('message', message);
    };
    
    const handleError = (error: any) => {
      handleRTVIEvent('error', error);
    };

    const handleConnected = () => {
      handleRTVIEvent('connected', {});
    };

    const handleDisconnected = () => {
      handleRTVIEvent('disconnected', {});
    };

    // Subscribe to events
    client.on("transcript", handleTranscript);
    client.on("message", handleMessage);
    client.on("error", handleError);
    client.on("connected", handleConnected);
    client.on("disconnected", handleDisconnected);

    return () => {
      client.off("transcript", handleTranscript);
      client.off("message", handleMessage);
      client.off("error", handleError);
      client.off("connected", handleConnected);
      client.off("disconnected", handleDisconnected);
    };
  }, [client]);

  const handleToggleMute = () => {
    if (client) {
      const newMutedState = !isMuted;
      if (client.setMicEnabled) {
        client.setMicEnabled(!newMutedState);
      }
      setIsMuted(newMutedState);
    }
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
        <div className="flex-1 bg-gray-800 rounded-lg p-4 mb-4 overflow-y-auto flex items-center justify-center">
          {transportState === "ready" ? (
            <TranscriptOverlay participant="both" className="w-full max-w-2xl" />
          ) : (
            <div className="text-center text-gray-500 py-8">
              Start a conversation by clicking the button below
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
                    {JSON.stringify(event.data).slice(0, 100)}
                    {JSON.stringify(event.data).length > 100 ? "..." : ""}
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
                  : isMuted
                  ? "bg-red-600 hover:bg-red-700 text-white"
                  : "bg-gray-700 hover:bg-gray-600 text-gray-100"
              }`}
            >
              {isMuted ? "Unmute" : "Mute"}
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