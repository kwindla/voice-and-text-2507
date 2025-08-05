import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

//@ts-expect-error - fontsource-variable/geist is not typed
import "@fontsource-variable/geist";
//@ts-expect-error - fontsource-variable/geist is not typed
import "@fontsource-variable/geist-mono";

import { PipecatAppBase, SpinLoader } from "@pipecat-ai/voice-ui-kit";

import SimpleVoiceUI from "./SimpleVoiceUI";

import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <PipecatAppBase
      themeProps={{ defaultTheme: "dark" }}
      transportType="smallwebrtc"
      connectParams={{
        connectionUrl: "/api/offer",
      }}
    >
      {({ loading, ...rest }) =>
        loading ? <SpinLoader /> : <SimpleVoiceUI {...rest} />
      }
    </PipecatAppBase>
  </StrictMode>
);
