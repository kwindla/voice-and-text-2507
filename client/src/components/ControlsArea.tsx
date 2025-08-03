import { useState, useEffect } from "react";
import { usePipecatClient, usePipecatClientTransportState, usePipecatClientMicControl } from "@pipecat-ai/client-react";

interface ControlsAreaProps {
  onConnect?: () => void;
  onDisconnect?: () => void;
}

export function ControlsArea({ onConnect, onDisconnect }: ControlsAreaProps) {
  const [selectedMicrophone, setSelectedMicrophone] = useState<string>("");
  const [availableMicrophones, setAvailableMicrophones] = useState<MediaDeviceInfo[]>([]);
  const [inputText, setInputText] = useState("");
  const [isSending, setIsSending] = useState(false);
  
  const client = usePipecatClient();
  const transportState = usePipecatClientTransportState();
  const { enableMic, isMicEnabled } = usePipecatClientMicControl();

  const isConnected = transportState === "ready";
  const isConnecting = transportState === "connecting" || transportState === "initializing";

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

  const handleMicrophoneChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedMicrophone(e.target.value);
    if (client && (client as any).updateMicrophone) {
      (client as any).updateMicrophone(e.target.value);
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
    <div className="bg-black border border-terminal-green p-4 space-y-4">
      {/* Microphone Controls */}
      <div className="flex gap-4 items-center">
        <div className="flex-1">
          <label htmlFor="microphone-select" className="block text-sm mb-1">
            Microphone
          </label>
          <select
            id="microphone-select"
            value={selectedMicrophone}
            onChange={handleMicrophoneChange}
            className="w-full bg-black border border-terminal-green text-terminal-green rounded px-4 py-2 focus:outline-none focus:ring-2 focus:ring-terminal-green"
            disabled={!isConnected}
          >
            {availableMicrophones.map((mic) => (
              <option key={mic.deviceId} value={mic.deviceId}>
                {mic.label || `Microphone ${mic.deviceId.slice(0, 8)}`}
              </option>
            ))}
          </select>
        </div>
        <button
          onClick={handleToggleMute}
          disabled={!isConnected}
          className={`px-6 py-2 border border-terminal-green bg-black text-terminal-green ${
            !isConnected
              ? "opacity-50 cursor-not-allowed"
              : "hover:bg-terminal-green hover:text-black"
          }`}
        >
          {!isMicEnabled ? "Unmute" : "Mute"}
        </button>
      </div>

      {/* Text Input */}
      <div className="flex gap-2">
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder={isConnected ? "Type a message to send to the bot..." : "Connect to send messages"}
          className="flex-1 bg-black border border-terminal-green text-terminal-green rounded px-4 py-2 focus:outline-none focus:ring-2 focus:ring-terminal-green disabled:opacity-50"
          disabled={!isConnected || isSending}
        />
        <button
          onClick={handleSendMessage}
          disabled={!isConnected || !inputText.trim() || isSending}
          className={`px-6 py-2 border border-terminal-green bg-black text-terminal-green ${
            !isConnected || !inputText.trim() || isSending
              ? "opacity-50 cursor-not-allowed"
              : "hover:bg-terminal-green hover:text-black"
          }`}
        >
          {isSending ? "Sending..." : "Send"}
        </button>
      </div>

      {/* Voice Control Button */}
      <button
        onClick={handleConnectionToggle}
        disabled={isConnecting}
        className={`w-full py-4 border border-terminal-green ${
          isConnected
            ? "bg-terminal-green text-black hover:bg-terminal-green/80"
            : "bg-black text-terminal-green hover:bg-terminal-green hover:text-black"
        } ${isConnecting ? "opacity-50 cursor-wait" : ""}`}
      >
        {isConnected ? "Disconnect" : isConnecting ? "Connecting..." : "Start Voice Chat"}
      </button>
    </div>
  );
}