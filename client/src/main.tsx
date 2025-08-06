import React from "react";
import ReactDOM from "react-dom/client";

import {
  PipecatAppBase,
  PipecatBaseChildProps,
  SpinLoader,
} from "@pipecat-ai/voice-ui-kit";

import { App } from "./App";

// Fonts and styles
import "@fontsource/vt323";
import "./theme.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <PipecatAppBase
      transportType="smallwebrtc"
      connectParams={{
        connectionUrl: "/api/offer",
      }}
      noThemeProvider
    >
      {({
        client,
        handleConnect,
        handleDisconnect,
        error,
      }: PipecatBaseChildProps) =>
        !client ? (
          <SpinLoader />
        ) : (
          <App
            handleConnect={handleConnect}
            handleDisconnect={handleDisconnect}
            error={error}
          />
        )
      }
    </PipecatAppBase>
  </React.StrictMode>
);
