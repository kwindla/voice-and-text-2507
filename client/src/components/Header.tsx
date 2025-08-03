import { useState, useCallback } from "react";
import { RTVIEvent } from "@pipecat-ai/client-js";
import { usePipecatClientTransportState, useRTVIClientEvent } from "@pipecat-ai/client-react";

interface HeaderProps {
  title?: string;
  error?: boolean;
}

export function Header({ title = "PIPECAT // TERMINAL", error }: HeaderProps) {
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
      return <span className="animate-pulse">USR ▶</span>;
    } else if (isBotSpeaking) {
      return <span className="animate-pulse">BOT ▶</span>;
    } else {
      return <span>IDLE</span>;
    }
  };

  const getConnectionStatus = () => {
    const isConnected = transportState === "ready";
    const isConnecting = transportState === "connecting" || transportState === "initializing";
    
    return {
      color: isConnected
        ? "bg-terminal-green"
        : isConnecting
        ? "bg-yellow-500"
        : error
        ? "bg-red-500"
        : "bg-terminal-green/30",
      text: isConnected
        ? "CONNECTED"
        : isConnecting
        ? "CONNECTING"
        : error
        ? "ERROR"
        : "DISCONNECTED",
    };
  };

  const connectionStatus = getConnectionStatus();

  return (
    <header className="border-b border-terminal-green bg-black shadow-terminal-glow p-2">
      <div className="max-w-6xl mx-auto flex items-center justify-between">
        <h1 className="text-xl tracking-widest">{title}</h1>
        <div className="flex items-center gap-8 text-sm">
          <div className="flex items-center gap-2">
            <span className={`inline-block w-3 h-3 ${connectionStatus.color} shadow-terminal-glow`}></span>
            <span className="uppercase">{connectionStatus.text}</span>
          </div>
          <div className="uppercase">{getSpeakingStateIndicator()}</div>
        </div>
      </div>
    </header>
  );
}