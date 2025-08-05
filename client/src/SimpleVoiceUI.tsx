import { type PipecatBasePassedProps } from "@pipecat-ai/voice-ui-kit";
import { ControlBar } from "./components/ControlBar";
import { EventsPanel } from "./components/EventsPanel";
import { Header } from "./components/Header";
import { MessagesPanel } from "./components/MessagesPanel";
import { ResizablePanels } from "./components/ResizablePanels";

export default function SimpleVoiceUI({
  handleConnect,
  handleDisconnect,
  error,
}: PipecatBasePassedProps) {
  return (
    <div className="min-h-screen flex flex-col bg-terminal-dark text-terminal-green">
      <Header error={!!error} />

      <main className="flex-1 max-w-6xl mx-auto w-full p-4 flex flex-col min-h-0 space-y-4">
        <div className="flex-1 flex flex-col min-h-0">
          <ResizablePanels
            topPanel={<MessagesPanel />}
            bottomPanel={<EventsPanel />}
            defaultTopHeight={80}
            minTopHeight={10}
            minBottomHeight={10}
          />
        </div>
        {/* Error Display */}
        {error && (
          <div className="border border-red-500 bg-red-950/40 p-2 shadow-terminal-glow">
            <p className="text-red-400 text-sm font-mono">
              {String(error) || "Connection error"}
            </p>
          </div>
        )}

        <ControlBar
          onConnect={() => handleConnect?.()}
          onDisconnect={() => handleDisconnect?.()}
        />
      </main>
    </div>
  );
}
