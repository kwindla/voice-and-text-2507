import "@fontsource-variable/geist-mono";

import { PipecatClientProvider } from "@pipecat-ai/client-react";
import SimpleVoiceUI from "./SimpleVoiceUI";

export default function App() {
  // AudioClientHelper provides its own client, so we wrap the app with an empty provider
  return (
    <PipecatClientProvider client={undefined as any}>
      <SimpleVoiceUI />
    </PipecatClientProvider>
  );
}