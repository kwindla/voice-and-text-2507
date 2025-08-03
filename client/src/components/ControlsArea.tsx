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
    <div className="space-y-4">
      <div className="flex gap-4 items-center">
        <div className="flex-1">
          <label htmlFor="microphone-select" className="block text-xs mb-1">MIC</label>
          <select
            id="microphone-select"
            value={selectedMicrophone}
            onChange={handleMicrophoneChange}
            className="w-full bg-black border border-terminal-green p-2"
            disabled={!isConnected}
          >
            {availableMicrophones.map((mic) => (
              <option key={mic.deviceId} value={mic.deviceId}>
                {mic.label || `mic-${mic.deviceId.slice(0, 4)}`}
              </option>
            ))}
          </select>
        </div>
        <button
          onClick={handleToggleMute}
          disabled={!isConnected}
          className={`border border-terminal-green px-4 py-2 hover:bg-terminal-green hover:text-black ${!isConnected ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          {!isMicEnabled ? 'UNMUTE' : 'MUTE'}
        </button>
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder={isConnected ? 'type message...' : 'connect to send'}
          className="flex-1 bg-black border border-terminal-green p-2 disabled:opacity-50"
          disabled={!isConnected || isSending}
        />
        <button
          onClick={handleSendMessage}
          disabled={!isConnected || !inputText.trim() || isSending}
          className="border border-terminal-green px-4 py-2 hover:bg-terminal-green hover:text-black disabled:opacity-50"
        >
          {isSending ? '...' : 'SEND'}
        </button>
      </div>

      <button
        onClick={handleConnectionToggle}
        disabled={isConnecting}
        className={`w-full border-2 border-terminal-green py-3 hover:bg-terminal-green hover:text-black ${isConnecting ? 'opacity-50 cursor-wait' : ''}`}
      >
        {isConnected ? 'TERMINATE' : isConnecting ? 'LINKING...' : 'CONNECT'}
      </button>
    </div>
  );
}