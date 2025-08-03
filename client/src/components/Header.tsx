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
      return <span className="animate-pulse">USR&gt;</span>;
    } else if (isBotSpeaking) {
      return <span className="animate-pulse">BOT&gt;</span>;
    } else {
      return <span>IDLE&gt;</span>;
    }
  };

  const getConnectionStatus = () => {
    const isConnected = transportState === "ready";
    const isConnecting = transportState === "connecting" || transportState === "initializing";

    return isConnected
      ? "ONLINE"
      : isConnecting
        ? "LINKING"
        : error
          ? "ERROR"
          : "OFFLINE";
  };

  const connectionStatus = getConnectionStatus();

  return (
    <header className="terminal-window mb-2 flex items-center justify-between">
      <pre className="tracking-tight text-xl">[{title}]</pre>
      <div className="flex items-center gap-6 text-sm">
        <div>{getSpeakingStateIndicator()}</div>
        <div>STATUS:{connectionStatus}</div>
      </div>
    </header>
  );
}