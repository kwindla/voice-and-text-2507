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
      setIsUserSpeaking(false);
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
      setIsBotSpeaking(false);
    }, [])
  );
  
  useRTVIClientEvent(
    RTVIEvent.UserStoppedSpeaking,
    useCallback(() => {
      setIsUserSpeaking(false);
    }, [])
  );
  
  const getSpeakingStateIndicator = () => {
    if (isUserSpeaking) {
      return <span className="animate-pulse">USR▸</span>;
    }
    if (isBotSpeaking) {
      return <span className="animate-pulse">BOT▸</span>;
    }
    return <span className="text-green-700">IDLE</span>;
  };

  const getConnectionStatus = () => {
    const isConnected = transportState === "ready";
    const isConnecting = transportState === "connecting" || transportState === "initializing";
    
    return {
      color: isConnected ? "text-green-400" : isConnecting ? "text-yellow-400" : error ? "text-red-400" : "text-green-700",
      text: isConnected ? "ONLINE" : isConnecting ? "DIALING" : error ? "ERROR" : "OFFLINE"
    };
  };

  const connectionStatus = getConnectionStatus();

  return (
    <header className="terminal-panel border-b-2 border-green-700 p-4">
      <div className="max-w-6xl mx-auto flex items-center justify-between">
        <h1 className="text-2xl tracking-widest">{title}</h1>
        <div className="flex items-center gap-6 text-sm">
          <div>{getSpeakingStateIndicator()}</div>
          <div className={`px-2 py-1 border border-green-700 ${connectionStatus.color}`}>{connectionStatus.text}</div>
        </div>
      </div>
    </header>
  );
}