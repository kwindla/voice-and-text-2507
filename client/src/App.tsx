import "@fontsource-variable/geist";
import "@fontsource-variable/geist-mono";

import "@pipecat-ai/voice-ui-kit/styles.css";

import {
  ConsoleTemplate,
  ThemeProvider,
  FullScreenContainer,
} from "@pipecat-ai/voice-ui-kit";

export default function App() {
  return (
    <ThemeProvider>
      <FullScreenContainer>
        <ConsoleTemplate
          transportType="smallwebrtc"
          connectParams={{
            connectionUrl: "http://localhost:7860/api/offer",
          }}
          noUserVideo={true}
        />
      </FullScreenContainer>
    </ThemeProvider>
  );
}