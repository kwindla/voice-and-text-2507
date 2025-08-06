import { RTVIEvent } from "@pipecat-ai/client-js";
import {
  usePipecatClient,
  usePipecatClientTransportState,
} from "@pipecat-ai/client-react";
import {
  ErrorCard,
  PipecatBaseChildProps,
  TriangleAlertIcon,
} from "@pipecat-ai/voice-ui-kit";
import { useEffect, useState } from "react";
import {
  ControlsArea,
  EventsPanel,
  Header,
  MessagesPanel,
  ResizablePanels,
} from "./components";

export function App({
  handleConnect,
  handleDisconnect,
  error,
}: Partial<PipecatBaseChildProps>) {
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [previousTransportState, setPreviousTransportState] =
    useState<string>("disconnected");
  const transportState = usePipecatClientTransportState();
  const client = usePipecatClient();

  // Listen for error events
  useEffect(() => {
    if (!client) return;

    const handleError = (data: any) => {
      console.log("Error event received:", data);
      setConnectionError(data?.message || "Connection failed");
    };

    client.on(RTVIEvent.Error as any, handleError);

    return () => {
      client.off(RTVIEvent.Error as any, handleError);
    };
  }, [client]);

  // Clear error when reconnecting or connected
  useEffect(() => {
    if (transportState === "initializing" || transportState === "ready") {
      setConnectionError(null);
    }
  }, [transportState]);

  // Set error when connection fails after all retries
  useEffect(() => {
    // If we go from connecting to disconnected, it's a failure
    if (
      previousTransportState === "connecting" &&
      transportState === "disconnected"
    ) {
      setConnectionError(
        "Failed to connect to server. Please check if the server is running."
      );
    }
    setPreviousTransportState(transportState);
  }, [transportState, previousTransportState]);

  return (
    <div className="min-h-screen bg-black text-green-400 flex flex-col terminal-container">
      {/* CRT screen effect overlay */}
      <div className="crt-overlay"></div>

      <Header error={!!connectionError} />

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto w-full p-4 flex flex-col min-h-0 gap-4">
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
          <ErrorCard
            noShadow
            className="terminal-box terminal-box-error terminal-text"
            icon={<TriangleAlertIcon size={16} className="animate-pulse" />}
            title={`ERROR: ${
              connectionError || error || "Connection failure detected"
            }`}
          />
        )}

        <ControlsArea
          onConnect={handleConnect}
          onDisconnect={handleDisconnect}
        />
      </main>

      {/* Terminal scanlines */}
      <div className="scanlines"></div>
    </div>
  );
}
