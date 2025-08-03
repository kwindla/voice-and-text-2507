import { useState, useCallback } from "react";
import { RTVIEvent } from "@pipecat-ai/client-js";
import { usePipecatClientTransportState, useRTVIClientEvent } from "@pipecat-ai/client-react";
import { Corner } from "./Corner";

interface HeaderProps {
  title?: string;
  error?: boolean;
}

export function Header({ title = "V.O.I.C.E. Interface", error }: HeaderProps) {
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
    let text = "SYSTEM READY";
    if (isUserSpeaking) text = "USER TRANSMITTING...";
    if (isBotSpeaking) text = "SYSTEM RESPONSE...";

    return (
      <div className="flex items-center gap-2">
        <span className={`text-xl ${isUserSpeaking || isBotSpeaking ? 'animate-pulse' : ''}`}>{text}</span>
      </div>
    );
  };

  const getConnectionStatus = () => {
    const isConnected = transportState === "ready";
    const isConnecting = transportState === "connecting" || transportState === "initializing";
    
    let statusText = "OFFLINE";
    if (isConnected) statusText = "ONLINE";
    if (isConnecting) statusText = "LINKING...";
    if (error) statusText = "ERROR";

    return (
      <div className="flex items-center gap-2">
        <span className="text-xl">STATUS:</span>
        <span className={`text-xl ${isConnecting ? 'animate-pulse' : ''}`}>{statusText}</span>
      </div>
    );
  };

  return (
    <header className="border-2 border-green-400 p-2 relative">
      <Corner position="tl" className="absolute top-0 left-0 text-green-400" />
      <Corner position="tr" className="absolute top-0 right-0 text-green-400" />
      <Corner position="bl" className="absolute bottom-0 left-0 text-green-400" />
      <Corner position="br" className="absolute bottom-0 right-0 text-green-400" />
      <div className="max-w-6xl mx-auto flex items-center justify-between">
        <h1 className="text-3xl font-mono">{title}</h1>
        <div className="flex items-center gap-8">
          {getSpeakingStateIndicator()}
          {getConnectionStatus()}
        </div>
      </div>
    </header>
  );
}