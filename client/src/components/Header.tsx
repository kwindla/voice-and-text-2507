import { RTVIEvent } from "@pipecat-ai/client-js";
import {
  usePipecatClientTransportState,
  useRTVIClientEvent,
} from "@pipecat-ai/client-react";
import { useCallback, useEffect, useRef, useState } from "react";

interface HeaderProps {
  title?: string;
  error?: boolean;
}

export function Header({
  title = "PIPECAT // ᓚᘏᗢ // TERMINAL",
  error,
}: HeaderProps) {
  const transportState = usePipecatClientTransportState();
  const [isBotSpeaking, setIsBotSpeaking] = useState(false);
  const [isUserSpeaking, setIsUserSpeaking] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const startTimeRef = useRef<number | null>(null);
  const intervalRef = useRef<number | null>(null);

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
          <span
            className="status-indicator active"
            style={{ background: "#00ffff" }}
          ></span>
          <span className="terminal-text">USER TRANSMITTING</span>
        </div>
      );
    } else if (isBotSpeaking) {
      return (
        <div className="flex items-center gap-2">
          <span className="status-indicator active"></span>
          <span className="terminal-text">BOT RESPONDING</span>
        </div>
      );
    } else {
      return (
        <div className="flex items-center gap-2">
          <span
            className="status-indicator"
            style={{ background: "#00ff4133" }}
          ></span>
          <span className="terminal-text opacity-50">AUDIO IDLE</span>
        </div>
      );
    }
  };

  const getConnectionStatus = () => {
    let statusText = "";
    let statusClass = "";

    if (error) {
      statusText = "CONNECTION FAILED";
      statusClass = "text-terminal-red";
      return { statusText, statusClass };
    }

    switch (transportState) {
      case "ready":
        statusText = "LINK ESTABLISHED";
        statusClass = "text-terminal";
        break;
      case "authenticating":
      case "authenticated":
      case "connecting":
      case "connecting":
        statusText = "CONNECTING...";
        statusClass = "text-terminal-amber animate-blink";
        break;
      default:
        statusText = "OFFLINE";
        statusClass = "text-terminal-dim";
    }

    return { statusText, statusClass };
  };

  // Start/stop timer based on connection state
  useEffect(() => {
    const isConnected = transportState === "ready";

    if (isConnected && !startTimeRef.current) {
      // Start the timer
      startTimeRef.current = Date.now();
      setElapsedTime(0);

      intervalRef.current = setInterval(() => {
        if (startTimeRef.current) {
          const elapsed = Math.floor(
            (Date.now() - startTimeRef.current) / 1000
          );
          setElapsedTime(elapsed);
        }
      }, 1000);
    } else if (!isConnected && startTimeRef.current) {
      // Stop the timer
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      startTimeRef.current = null;
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [transportState]);

  const formatElapsedTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };

  const connectionStatus = getConnectionStatus();

  return (
    <header className="border-b-2 border-terminal-bright relative overflow-hidden">
      {/* Grid background */}
      <div className="absolute inset-0 bg-grid-pattern"></div>
      {/* Main header content */}
      <div className="relative z-10 p-4">
        <div className="max-w-7xl mx-auto">
          {/* Top row */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-6">
              <h1 className="text-2xl font-bold terminal-text">{title}</h1>
              <div className="text-xs opacity-70 terminal-text">
                SYS:AUDIO/COMM MODULE
              </div>
            </div>
            <div className="text-xs terminal-text">
              <span className="opacity-50">TIME:</span>{" "}
              <span className="text-terminal-bright">
                {formatElapsedTime(elapsedTime)}
              </span>
            </div>
          </div>

          {/* Status row */}
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-8">
              {/* Connection Status */}
              <div className="flex items-center gap-2">
                <span className="terminal-text opacity-50">STATUS:</span>
                <span
                  className={`terminal-text font-bold ${connectionStatus.statusClass}`}
                >
                  [{connectionStatus.statusText}]
                </span>
              </div>

              {/* Audio Status */}
              {getAudioIndicator()}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
