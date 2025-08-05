import { RTVIEvent, type TransportState } from "@pipecat-ai/client-js";
import { usePipecatClient, useRTVIClientEvent } from "@pipecat-ai/client-react";
import { ConnectButton, UserAudioControl } from "@pipecat-ai/voice-ui-kit";
import { useState } from "react";

export function ControlBar({
  onConnect,
  onDisconnect,
}: {
  onConnect: () => void;
  onDisconnect: () => void;
}) {
  const [inputText, setInputText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  const client = usePipecatClient();

  useRTVIClientEvent(
    RTVIEvent.TransportStateChanged,
    (state: TransportState) => {
      setIsConnected(state === "ready");
    }
  );

  const handleSendMessage = async () => {
    if (!client || !isConnected || !inputText.trim() || isSending) return;

    const message = inputText.trim();
    setInputText("");
    setIsSending(true);

    try {
      // Send the message to the bot
      console.log("Sending message to bot:", message);
      client.sendClientMessage("custom-message", { text: message });

      // You could also use sendClientRequest to wait for a response:
      // const response = await client.sendClientRequest('custom-message', { text: message }, 5000);
      // console.log('Bot response:', response);
    } catch (error) {
      console.error("Error sending message:", error);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="border border-terminal-green bg-black p-4 space-y-4 shadow-terminal-glow">
      {/* Microphone Controls */}
      <div className="flex gap-4 items-end">
        <UserAudioControl size="lg" variant="outline" />
      </div>

      {/* Text Input */}
      <div className="flex gap-2">
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={handleKeyPress}
          placeholder={isConnected ? "TYPE MESSAGE…" : "CONNECT FIRST"}
          className="flex-1 bg-black border border-terminal-green text-terminal-green px-2 py-1 focus:outline-none placeholder-terminal-green/50 disabled:opacity-50"
          disabled={!isConnected || isSending}
        />
        <button
          onClick={handleSendMessage}
          disabled={!isConnected || !inputText.trim() || isSending}
          className={`border border-terminal-green px-4 py-1 hover:bg-terminal-green/20 ${
            !isConnected || !inputText.trim() || isSending
              ? "opacity-30 cursor-not-allowed"
              : ""
          }`}
        >
          {isSending ? "SENDING..." : "SEND"}
        </button>
      </div>

      <ConnectButton
        size="lg"
        className="w-full uppercase"
        defaultVariant="outline"
        onConnect={onConnect}
        onDisconnect={onDisconnect}
      />
    </div>
  );
}
