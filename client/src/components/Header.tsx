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
      return <span className="animate-pulse">[ USER ]</span>;
    } else if (isBotSpeaking) {
      return <span className="animate-pulse">[ BOT ]</span>;
    } else {
      return <span>[ READY ]</span>;
    }
  };

  const getConnectionStatus = () => {
    const isConnected = transportState === "ready";
    const isConnecting = transportState === "connecting" || transportState === "initializing";
    
    return {
      color: isConnected ? "bg-terminal-green" : isConnecting ? "bg-yellow-500" : error ? "bg-red-500" : "bg-terminal-green/20",
      text: isConnected ? "ONLINE" : isConnecting ? "DIALING..." : error ? "ERROR" : "OFFLINE"
    };
  };

  const connectionStatus = getConnectionStatus();

  return (
    <header className="terminal-frame mb-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl tracking-wider">{title}</h1>
        <div className="flex items-center gap-6 text-sm">
          {getSpeakingStateIndicator()}
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${connectionStatus.color}`} />
            <span>{connectionStatus.text}</span>
          </div>
        </div>
      </div>
    </header>
  );
}