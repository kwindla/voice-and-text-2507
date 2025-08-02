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
    if (client && client.updateMicrophone) {
      client.updateMicrophone(e.target.value);
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
    <div className="bg-gray-800 rounded-lg p-4 space-y-4">
      {/* Microphone Controls */}
      <div className="flex gap-4 items-center">
        <div className="flex-1">
          <label htmlFor="microphone-select" className="block text-sm font-medium text-gray-400 mb-1">
            Microphone
          </label>
          <select
            id="microphone-select"
            value={selectedMicrophone}
            onChange={handleMicrophoneChange}
            className="w-full bg-gray-700 text-gray-100 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
          className={`px-6 py-2 rounded-lg font-medium transition-colors ${
            !isConnected
              ? "bg-gray-700 text-gray-500 cursor-not-allowed"
              : !isMicEnabled
              ? "bg-red-600 hover:bg-red-700 text-white"
              : "bg-gray-700 hover:bg-gray-600 text-gray-100"
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
          className="flex-1 bg-gray-700 text-gray-100 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          disabled={!isConnected || isSending}
        />
        <button
          onClick={handleSendMessage}
          disabled={!isConnected || !inputText.trim() || isSending}
          className={`px-6 py-2 rounded-lg font-medium transition-colors ${
            !isConnected || !inputText.trim() || isSending
              ? "bg-gray-700 text-gray-400 cursor-not-allowed opacity-50"
              : "bg-blue-600 hover:bg-blue-700 text-white"
          }`}
        >
          {isSending ? "Sending..." : "Send"}
        </button>
      </div>

      {/* Voice Control Button */}
      <button
        onClick={handleConnectionToggle}
        disabled={isConnecting}
        className={`w-full py-4 rounded-lg font-medium transition-colors ${
          isConnected
            ? "bg-red-600 hover:bg-red-700 text-white"
            : isConnecting
            ? "bg-yellow-600 text-white opacity-75 cursor-wait"
            : "bg-blue-600 hover:bg-blue-700 text-white"
        }`}
      >
        {isConnected ? "Disconnect" : isConnecting ? "Connecting..." : "Start Voice Chat"}
      </button>
    </div>
  );
}