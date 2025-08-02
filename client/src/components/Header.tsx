import { useState, useCallback } from "react";
import { RTVIEvent } from "@pipecat-ai/client-js";
import { usePipecatClientTransportState, useRTVIClientEvent } from "@pipecat-ai/client-react";

interface HeaderProps {
  title?: string;
  error?: boolean;
}

export function Header({ title = "ᓚᘏᗢ Pipecat", error }: HeaderProps) {
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

  const getConnectionStatus = () => {
    const isConnected = transportState === "ready";
    const isConnecting = transportState === "connecting" || transportState === "initializing";
    
    return {
      color: isConnected ? "bg-green-500" : isConnecting ? "bg-yellow-500" : error ? "bg-red-500" : "bg-gray-600",
      text: isConnected ? "Connected" : isConnecting ? "Connecting..." : error ? "Error" : "Disconnected"
    };
  };

  const connectionStatus = getConnectionStatus();

  return (
    <header className="bg-gray-800 border-b border-gray-700 p-4">
      <div className="max-w-6xl mx-auto flex items-center justify-between">
        <h1 className="text-2xl font-mono">{title}</h1>
        <div className="flex items-center gap-4">
          {getSpeakingStateIndicator()}
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${connectionStatus.color}`} />
            <span className="text-sm">{connectionStatus.text}</span>
          </div>
        </div>
      </div>
    </header>
  );
}