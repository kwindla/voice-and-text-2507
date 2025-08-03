import { useState, useEffect, useCallback } from "react";
import { RTVIEvent } from "@pipecat-ai/client-js";
import { usePipecatClient, usePipecatClientTransportState, usePipecatClientMicControl, useRTVIClientEvent } from "@pipecat-ai/client-react";
import { TerminalDropdown } from "./TerminalDropdown";

interface ControlsAreaProps {
  onConnect?: () => void;
  onDisconnect?: () => void;
}

export function ControlsArea({ onConnect, onDisconnect }: ControlsAreaProps) {
  const [selectedMicrophone, setSelectedMicrophone] = useState<string>("");
  const [availableMicrophones, setAvailableMicrophones] = useState<MediaDeviceInfo[]>([]);
  const [inputText, setInputText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isUserSpeaking, setIsUserSpeaking] = useState(false);
  const [isBotSpeaking, setIsBotSpeaking] = useState(false);
  
  const client = usePipecatClient();
  const transportState = usePipecatClientTransportState();
  const { enableMic, isMicEnabled } = usePipecatClientMicControl();

  const isConnected = transportState === "ready";
  const isConnecting = transportState === "connecting" || transportState === "initializing";
  
  // Listen for user speaking events
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
  
  // Listen for bot speaking events
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

  const handleToggleMute = () => {
    enableMic(!isMicEnabled);
  };

  const handleMicrophoneChange = (value: string) => {
    setSelectedMicrophone(value);
    if (client && client.updateMicrophone) {
      client.updateMicrophone(value);
    }
  };

  const handleConnectionToggle = () => {
    if (isConnected || isConnecting) {
      onDisconnect?.();
    } else {
      onConnect?.();
    }
  };

  const handleSendMessage = async () => {
    if (!client || !isConnected || !inputText.trim() || isSending) return;
    
    const message = inputText.trim();
    setInputText("");
    setIsSending(true);
    
    try {
      // Send the message to the bot
      console.log('Sending message to bot:', message);
      client.sendClientMessage('custom-message', { text: message });
      
      // You could also use sendClientRequest to wait for a response:
      // const response = await client.sendClientRequest('custom-message', { text: message }, 5000);
      // console.log('Bot response:', response);
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="terminal-box p-4 space-y-4">
      {/* Control Panel Header */}
      <div className="flex items-center justify-between pb-2 border-b border-green-400">
        <h3 className="text-sm font-bold terminal-text tracking-wider">
          CONTROL INTERFACE
        </h3>
        <div className="text-xs opacity-50">
          [AUDIO/TEXT INPUT]
        </div>
      </div>

      {/* Audio Controls */}
      <div className="grid grid-cols-2 gap-4">
        {/* Microphone Selection */}
        <div className="space-y-2">
          <label className="text-xs terminal-text opacity-70 uppercase tracking-wider">
            ► Audio Input Device
          </label>
          <TerminalDropdown
            value={selectedMicrophone}
            onChange={handleMicrophoneChange}
            options={availableMicrophones.map((mic) => ({
              value: mic.deviceId,
              label: mic.label || `MIC-${mic.deviceId.slice(0, 8)}`
            }))}
            disabled={!isConnected}
          />
        </div>

        {/* Mute Control */}
        <div className="space-y-2">
          <label className="text-xs terminal-text opacity-70 uppercase tracking-wider">
            ► Audio Control
          </label>
          <button
            onClick={handleToggleMute}
            disabled={!isConnected}
            className={`w-full terminal-button text-xs ${
              !isConnected
                ? ""
                : !isMicEnabled
                ? "border-red-400 text-red-400 hover:bg-red-400 hover:text-black"
                : "border-green-400 text-green-400"
            }`}
          >
            {!isMicEnabled ? "◉ UNMUTE" : "◉ MUTE"}
          </button>
        </div>
      </div>

      {/* Text Input */}
      <div className="space-y-2">
        <label className="text-xs terminal-text opacity-70 uppercase tracking-wider">
          ► Text Command Input
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={isConnected ? "ENTER TEXT COMMAND..." : "CONNECT TO ENABLE"}
            className="flex-1 terminal-input text-xs uppercase"
            disabled={!isConnected || isSending}
          />
          <button
            onClick={handleSendMessage}
            disabled={!isConnected || !inputText.trim() || isSending}
            className="terminal-button text-xs px-4"
          >
            {isSending ? "SENDING..." : "TRANSMIT"}
          </button>
        </div>
      </div>

      {/* Connection Control */}
      <div className="pt-2">
        <button
          onClick={handleConnectionToggle}
          disabled={isConnecting}
          className={`w-full py-3 terminal-button font-bold tracking-wider ${
            isConnected
              ? "border-red-400 text-red-400 hover:bg-red-400 hover:text-black"
              : isConnecting
              ? "border-yellow-400 text-yellow-400 animate-pulse"
              : "border-green-400 text-green-400 hover:bg-green-400 hover:text-black"
          }`}
        >
          {isConnected ? "◄ DISCONNECT ►" : isConnecting ? "◄ ESTABLISHING LINK... ►" : "◄ INITIALIZE CONNECTION ►"}
        </button>
      </div>

      {/* Status Indicators */}
      <div className="flex justify-between pt-2 border-t border-green-400/30">
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-2">
            <span className={`status-indicator ${isConnected ? 'active' : ''}`}></span>
            <span className="opacity-70">LINK</span>
          </div>
          <div className="flex items-center gap-2">
            <span className={`status-indicator ${isUserSpeaking ? 'active' : ''}`} style={{
              animation: isUserSpeaking ? 'blink-fast 0.3s infinite' : 'none'
            }}></span>
            <span className="opacity-70">AUDIO</span>
          </div>
          <div className="flex items-center gap-2">
            <span className={`status-indicator ${isBotSpeaking ? 'active' : ''}`} style={{
              animation: isBotSpeaking ? 'blink-fast 0.3s infinite' : 'none'
            }}></span>
            <span className="opacity-70">DATA</span>
          </div>
        </div>
        <div className="text-xs opacity-50">
          PROTOCOL: RTVI
        </div>
      </div>
    </div>
  );
}