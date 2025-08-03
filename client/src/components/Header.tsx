import { useState, useCallback } from "react";
import { RTVIEvent } from "@pipecat-ai/client-js";
import { usePipecatClientTransportState, useRTVIClientEvent } from "@pipecat-ai/client-react";

interface HeaderProps {
  title?: string;
  error?: boolean;
}

export function Header({ title = "PIPECAT TERMINAL", error }: HeaderProps) {
  const transportState = usePipecatClientTransportState();
  const [isBotSpeaking, setIsBotSpeaking] = useState(false);
  const [isUserSpeaking, setIsUserSpeaking] = useState(false);
  
  useRTVIClientEvent(
    RTVIEvent.BotStartedSpeaking,
    useCallback(() => {
      setIsBotSpeaking(true);
    }, [])
  );

  useRTVIClientEvent(
    RTVIEvent.BotStoppedSpeaking,
    useCallback(() => {
      setIsBotSpeaking(false);
    }, [])
  );

  useRTVIClientEvent(
    RTVIEvent.UserStartedSpeaking,
    useCallback(() => {
      setIsUserSpeaking(true);
    }, [])
  );

  useRTVIClientEvent(
    RTVIEvent.UserStoppedSpeaking,
    useCallback(() => {
      setIsUserSpeaking(false);
    }, [])
  );

  const getAudioIndicator = () => {
    if (isUserSpeaking) {
      return (
        <div className="flex items-center gap-2 text-cyan">
          <span className="status-indicator active" style={{ background: '#00ffff' }}></span>
          <span className="terminal-text">USER TRANSMITTING</span>
        </div>
      );
    } else if (isBotSpeaking) {
      return (
        <div className="flex items-center gap-2 text-green-400">
          <span className="status-indicator active"></span>
          <span className="terminal-text">BOT RESPONDING</span>
        </div>
      );
    } else {
      return (
        <div className="flex items-center gap-2">
          <span className="status-indicator" style={{ background: '#00ff4133' }}></span>
          <span className="terminal-text opacity-50">AUDIO IDLE</span>
        </div>
      );
    }
  };

  const getConnectionStatus = () => {
    const isConnected = transportState === "ready";
    const isConnecting = transportState === "connecting" || transportState === "initializing";
    
    let statusText = "";
    let statusClass = "";
    
    if (isConnected) {
      statusText = "LINK ESTABLISHED";
      statusClass = "text-green-400";
    } else if (isConnecting) {
      statusText = "CONNECTING...";
      statusClass = "text-amber-400";
    } else if (error) {
      statusText = "CONNECTION FAILED";
      statusClass = "text-red-400";
    } else {
      statusText = "OFFLINE";
      statusClass = "text-gray-500";
    }
    
    return { statusText, statusClass };
  };

  const connectionStatus = getConnectionStatus();
  const currentTime = new Date().toLocaleTimeString('en-US', { hour12: false });

  return (
    <header className="border-b-2 border-green-400 bg-black relative overflow-hidden">
      {/* Grid background */}
      <div className="absolute inset-0 grid-pattern"></div>
      
      {/* Main header content */}
      <div className="relative z-10 p-4">
        <div className="max-w-7xl mx-auto">
          {/* Top row */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-6">
              <h1 className="text-2xl font-bold terminal-text terminal-glow tracking-wider">
                {title} <span className="text-green-300 opacity-70">v2.0</span>
              </h1>
              <div className="text-xs opacity-70 terminal-text">
                SYS:AUDIO/COMM MODULE
              </div>
            </div>
            <div className="text-xs terminal-text font-mono">
              <span className="opacity-50">TIME:</span> <span className="text-green-300">{currentTime}</span>
            </div>
          </div>
          
          {/* Status row */}
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-8">
              {/* Connection Status */}
              <div className="flex items-center gap-2">
                <span className="terminal-text opacity-50">STATUS:</span>
                <span className={`terminal-text font-bold ${connectionStatus.statusClass}`}>
                  [{connectionStatus.statusText}]
                </span>
              </div>
              
              {/* Audio Status */}
              {getAudioIndicator()}
            </div>
            
            {/* ASCII decoration */}
            <div className="text-xs opacity-30 terminal-text font-mono">
              ◄►─═══─◄►
            </div>
          </div>
        </div>
      </div>
      
      {/* Animated data streams */}
      <div className="absolute top-0 left-10 data-stream" style={{ animationDelay: '0s' }}></div>
      <div className="absolute top-0 left-20 data-stream" style={{ animationDelay: '0.5s' }}></div>
      <div className="absolute top-0 right-10 data-stream" style={{ animationDelay: '1s' }}></div>
      <div className="absolute top-0 right-20 data-stream" style={{ animationDelay: '1.5s' }}></div>
    </header>
  );
}