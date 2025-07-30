import { useState, useEffect, useRef } from "react";
import { AudioClientHelper } from "@pipecat-ai/voice-ui-kit";

interface Message {
  id: string;
  speaker: "bot" | "user";
  text: string;
  timestamp: Date;
}

interface VoiceUIProps {
  onConnect: () => void;
  onDisconnect: () => void;
  error: Error | null;
  isConnecting: boolean;
  isConnected: boolean;
}

function VoiceUI({ onConnect, onDisconnect, error, isConnecting, isConnected }: VoiceUIProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [botState, setBotState] = useState<"idle" | "listening" | "speaking">("idle");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // For demo purposes, cycle through states when connected
  useEffect(() => {
    if (isConnected) {
      const interval = setInterval(() => {
        setBotState(prev => {
          if (prev === "idle") return "listening";
          if (prev === "listening") return "speaking";
          return "idle";
        });
      }, 3000);
      return () => clearInterval(interval);
    } else {
      setBotState("idle");
    }
  }, [isConnected]);

  // Add welcome message when connected
  useEffect(() => {
    if (isConnected) {
      const welcomeMessage: Message = {
        id: Date.now().toString(),
        speaker: "bot",
        text: "Hello! I'm connected and ready to chat. How can I help you today?",
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, welcomeMessage]);
    }
  }, [isConnected]);

  const handleToggleConnection = () => {
    if (isConnected || isConnecting) {
      onDisconnect();
      
      // Add disconnect message
      const disconnectMessage: Message = {
        id: Date.now().toString(),
        speaker: "bot",
        text: "Goodbye! Feel free to reconnect whenever you'd like to chat again.",
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, disconnectMessage]);
    } else {
      onConnect();
    }
  };

  const getConnectionStatusColor = () => {
    if (isConnected) return "bg-green-500";
    if (isConnecting) return "bg-yellow-500";
    if (error) return "bg-red-500";
    return "bg-gray-600";
  };

  const getConnectionStatusText = () => {
    if (isConnected) return "Connected";
    if (isConnecting) return "Connecting...";
    if (error) return "Error";
    return "Disconnected";
  };

  const getBotStateIndicator = () => {
    switch (botState) {
      case "listening":
        return (
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse" />
            <span className="text-blue-400">Listening...</span>
          </div>
        );
      case "speaking":
        return (
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
            <span className="text-green-400">Speaking...</span>
          </div>
        );
      default:
        return (
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-gray-600 rounded-full" />
            <span className="text-gray-500">Idle</span>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 flex flex-col">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 p-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <h1 className="text-2xl font-mono">ᓚᘏᗢ Pipecat</h1>
          <div className="flex items-center gap-4">
            {getBotStateIndicator()}
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${getConnectionStatusColor()}`} />
              <span className="text-sm">{getConnectionStatusText()}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-6xl mx-auto w-full p-4 flex flex-col">
        {/* Messages Area */}
        <div className="flex-1 bg-gray-800 rounded-lg p-4 mb-4 overflow-y-auto">
          <div className="space-y-4">
            {messages.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                Start a conversation by clicking the button below
              </div>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${
                    message.speaker === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-[70%] rounded-lg p-3 ${
                      message.speaker === "user"
                        ? "bg-blue-600 text-white"
                        : "bg-gray-700 text-gray-100"
                    }`}
                  >
                    <p className="text-sm font-medium mb-1">
                      {message.speaker === "user" ? "You" : "Bot"}
                    </p>
                    <p>{message.text}</p>
                    <p className="text-xs opacity-70 mt-1">
                      {message.timestamp.toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
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
            onClick={handleToggleConnection}
            disabled={isConnecting}
            className={`w-full py-4 rounded-lg font-medium transition-colors ${
              isConnected || isConnecting
                ? "bg-red-600 hover:bg-red-700 text-white"
                : "bg-blue-600 hover:bg-blue-700 text-white"
            } ${isConnecting ? "opacity-75 cursor-wait" : ""}`}
          >
            {isConnected ? "Stop Voice Chat" : isConnecting ? "Connecting..." : "Start Voice Chat"}
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
        connectionUrl: "http://localhost:7860/api/offer",
      }}
      onMessages={(messages) => {
        // Handle transcript messages here if needed
        console.log("Messages:", messages);
      }}
    >
      {({ handleConnect, handleDisconnect, error, isConnecting, isConnected }) => (
        <VoiceUI
          onConnect={handleConnect}
          onDisconnect={handleDisconnect}
          error={error}
          isConnecting={isConnecting}
          isConnected={isConnected}
        />
      )}
    </AudioClientHelper>
  );
}