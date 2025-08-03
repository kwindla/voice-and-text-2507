import { useState, useEffect } from "react";
import { AudioClientHelper } from "@pipecat-ai/voice-ui-kit";
import { usePipecatClient, usePipecatClientTransportState } from "@pipecat-ai/client-react";
import { RTVIEvent } from "@pipecat-ai/client-js";
import { Header, MessagesPanel, EventsPanel, ControlsArea, ResizablePanels } from "./components";

interface VoiceUIProps {
  handleConnect?: () => void;
  handleDisconnect?: () => void;
  error?: Error | null;
}

function VoiceUI({ handleConnect, handleDisconnect, error }: VoiceUIProps) {
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [previousTransportState, setPreviousTransportState] = useState<string>('disconnected');
  const transportState = usePipecatClientTransportState();
  const client = usePipecatClient();
  
  // Listen for error events
  useEffect(() => {
    if (!client) return;
    
    const handleError = (data: any) => {
      console.log('Error event received:', data);
      setConnectionError(data?.message || 'Connection failed');
    };
    
    client.on(RTVIEvent.Error as any, handleError);
    
    return () => {
      client.off(RTVIEvent.Error as any, handleError);
    };
  }, [client]);
  
  // Clear error when reconnecting or connected
  useEffect(() => {
    if (transportState === 'initializing' || transportState === 'ready') {
      setConnectionError(null);
    }
  }, [transportState]);
  
  // Set error when connection fails after all retries
  useEffect(() => {
    // If we go from connecting to disconnected, it's a failure
    if (previousTransportState === 'connecting' && transportState === 'disconnected') {
      setConnectionError('Failed to connect to server. Please check if the server is running.');
    }
    setPreviousTransportState(transportState);
  }, [transportState, previousTransportState]);
  
  return (
    <div className="min-h-screen bg-black text-green-400 flex flex-col terminal-container">
      {/* CRT screen effect overlay */}
      <div className="crt-overlay"></div>
      
      <Header error={!!connectionError} />
      
      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto w-full p-4 flex flex-col min-h-0">
        <div className="flex-1 flex flex-col min-h-0">
          <ResizablePanels
            topPanel={<MessagesPanel />}
            bottomPanel={<EventsPanel />}
            defaultTopHeight={90}
            minTopHeight={10}
            minBottomHeight={10}
          />
        </div>
        
        {/* Error Display */}
        {(error || connectionError) && (
          <div className="terminal-box border-red-400 bg-red-400/10 p-4 mt-4">
            <div className="flex items-center gap-3">
              <span className="text-red-400 text-lg animate-pulse">⚠</span>
              <p className="text-red-400 text-sm terminal-text uppercase">
                ERROR: {connectionError || error?.message || 'Connection failure detected'}
              </p>
            </div>
          </div>
        )}
        
        <div className="mt-4">
          <ControlsArea 
            onConnect={handleConnect}
            onDisconnect={handleDisconnect}
          />
        </div>
      </main>
      
      {/* Terminal scanlines */}
      <div className="scanlines"></div>
    </div>
  );
}

export default function SimpleVoiceUI() {
  return (
    <AudioClientHelper
      transportType="smallwebrtc"
      connectParams={{
        connectionUrl: "/api/offer",
      }}
    >
      {({ handleConnect, handleDisconnect, error }) => (
        <VoiceUI
          handleConnect={handleConnect}
          handleDisconnect={handleDisconnect}
          error={error}
        />
      )}
    </AudioClientHelper>
  );
}