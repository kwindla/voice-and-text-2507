import { useState, useEffect } from "react";
import { AudioClientHelper } from "@pipecat-ai/voice-ui-kit";
import { usePipecatClient, usePipecatClientTransportState } from "@pipecat-ai/client-react";
import { RTVIEvent } from "@pipecat-ai/client-js";
import { Header, MessagesPanel, EventsPanel, ControlsArea, ResizablePanels } from "./components";

interface VoiceUIProps {
  handleConnect?: () => void;
  handleDisconnect?: () => void;
  error?: Error | string | null;
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
    <div className="min-h-screen flex flex-col">
      <Header error={!!connectionError} />

      {/* Main Content */}
      <main className="flex-1 max-w-6xl mx-auto w-full p-2 flex flex-col min-h-0 space-y-2">
        <div className="flex-1 flex flex-col min-h-0 terminal-window">
          <ResizablePanels
            topPanel={<MessagesPanel />}
            bottomPanel={<EventsPanel />}
            defaultTopHeight={80}
            minTopHeight={10}
            minBottomHeight={10}
          />
        </div>

        {/* Error Display */}
        {(error || connectionError) && (
          <div className="terminal-window border-red-500 text-red-500">
            <p className="text-sm">
              {connectionError || (typeof error === 'string' ? error : error?.message) || 'Connection error'}
            </p>
          </div>
        )}

        <div className="terminal-window">
          <ControlsArea
            onConnect={handleConnect}
            onDisconnect={handleDisconnect}
          />
        </div>
      </main>
    </div>
  );
}

export default function SimpleVoiceUI() {
  return (
    // @ts-ignore - helper provides render prop component
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