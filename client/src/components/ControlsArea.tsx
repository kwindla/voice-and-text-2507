import { useState, useEffect } from "react";
import { usePipecatClient, usePipecatClientTransportState, usePipecatClientMicControl } from "@pipecat-ai/client-react";
import { Panel } from "./Panel";
import { Button } from "./Button";
import { Select } from "./Select";

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
      client.sendClientMessage('custom-message', { text: message });
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
    <Panel title="CONTROLS">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="microphone-select" className="block text-sm mb-1 opacity-70">
              AUDIO INPUT
            </label>
            <Select
              id="microphone-select"
              value={selectedMicrophone}
              onChange={handleMicrophoneChange}
              disabled={!isConnected}
            >
              {availableMicrophones.map((mic) => (
                <option key={mic.deviceId} value={mic.deviceId} className="bg-black text-green-400">
                  {mic.label || `Microphone ${mic.deviceId.slice(0, 8)}`}
                </option>
              ))}
            </Select>
          </div>
          <div className="flex items-end">
            <Button
              onClick={handleToggleMute}
              disabled={!isConnected}
              active={!isMicEnabled}
              className="w-full"
            >
              {!isMicEnabled ? "MIC MUTED" : "MIC OPEN"}
            </Button>
          </div>
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={isConnected ? "TEXT COMMAND..." : "AWAITING CONNECTION..."}
            className="flex-1 bg-transparent border-2 border-green-400 text-green-400 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-400 disabled:opacity-50 placeholder-green-400/50"
            disabled={!isConnected || isSending}
          />
          <Button
            onClick={handleSendMessage}
            disabled={!isConnected || !inputText.trim() || isSending}
          >
            {isSending ? "SENDING" : "SEND"}
          </Button>
        </div>

        <Button
          onClick={handleConnectionToggle}
          disabled={isConnecting}
          className="w-full py-4 text-2xl"
          active={isConnected}
        >
          {isConnected ? "DISCONNECT" : isConnecting ? "CONNECTING..." : "INITIATE CONNECTION"}
        </Button>
      </div>
    </Panel>
  );
}