#
# Copyright (c) 2024–2025, Daily
#
# SPDX-License-Identifier: BSD 2-Clause License
#

"""Pipecat development runner.

This development runner executes Pipecat bots and provides the supporting
infrastructure they need - creating Daily rooms and tokens, managing WebRTC
connections, and setting up telephony webhook/WebSocket infrastructure. It
supports multiple transport types with a unified interface.

Install with::

    pip install pipecat-ai[runner]

All bots must implement a `bot(session_args)` async function as the entry point.
The server automatically discovers and executes this function when connections
are established.

Single transport example::

    async def bot(session_args: DailySessionArguments):
        transport = DailyTransport(
            session_args.room_url,
            session_args.token,
            "Bot",
            DailyParams(...)
        )
        # Your bot logic here
        await run_pipeline(transport)

    if __name__ == "__main__":
        from pipecat.runner.run import main
        main()

Multiple transport example::

    async def bot(session_args):
        # Type-safe transport detection
        if isinstance(session_args, DailySessionArguments):
            transport = setup_daily_transport(session_args)  # Your application code
        elif isinstance(session_args, SmallWebRTCSessionArguments):
            transport = setup_webrtc_transport(session_args)  # Your application code
        elif isinstance(session_args, WebSocketSessionArguments):
            transport = setup_telephony_transport(session_args)  # Your application code

        # Your bot implementation
        await run_pipeline(transport)

Supported transports:

- Daily - Creates rooms and tokens, runs bot as participant
- WebRTC - Provides local WebRTC interface with prebuilt UI
- Telephony - Handles webhook and WebSocket connections for Twilio, Telnyx, Plivo

To run locally:

- WebRTC: `python bot.py -t webrtc`
- ESP32: `python bot.py -t webrtc --esp32 --host 192.168.1.100`
- Daily (server): `python bot.py -t daily`
- Daily (direct, testing only): `python bot.py -d`
- Telephony: `python bot.py -t twilio -x your_username.ngrok.io`
"""

import argparse
import asyncio
import os
import sys
from contextlib import asynccontextmanager
from dataclasses import dataclass
from typing import Any, Dict, Optional

from loguru import logger

try:
    import uvicorn
    from dotenv import load_dotenv
    from fastapi import BackgroundTasks, FastAPI, WebSocket
    from fastapi.middleware.cors import CORSMiddleware
    from fastapi.responses import HTMLResponse, RedirectResponse
except ImportError as e:
    logger.error(f"Runner dependencies not available: {e}")
    logger.error("To use Pipecat runners, install with: pip install pipecat-ai[runner]")
    raise ImportError(
        "Runner dependencies required. Install with: pip install pipecat-ai[runner]"
    ) from e

try:
    from pipecatcloud.agent import DailySessionArguments, WebSocketSessionArguments
except ImportError:
    raise ImportError(
        "pipecatcloud package is required for cloud-compatible bots. "
        "Install with: pip install pipecat-ai[runner]"
    )


# Define WebRTC type locally until it's added to pipecatcloud
@dataclass
class SmallWebRTCSessionArguments:
    """Small WebRTC session arguments.

    .. deprecated:: 0.0.77
        This will be replaced by pipecatcloud.agent.SmallWebRTCSessionArguments
        once WebRTC support is added to the `pipecatcloud` package.

    Parameters:
        websocket: The WebSocket connection for the session.
        session_id: Optional session ID for tracking.
    """

    webrtc_connection: Any
    session_id: Optional[str] = None


load_dotenv(override=True)
os.environ["LOCAL_RUN"] = "1"


def _get_bot_module():
    """Get the bot module from the calling script."""
    import importlib.util

    # Get the main module (the file that was executed)
    main_module = sys.modules["__main__"]

    # Check if it has a bot function
    if hasattr(main_module, "bot"):
        return main_module

    # Try to import 'bot' module from current directory
    try:
        import bot  # type: ignore[import-untyped]

        return bot
    except ImportError:
        pass

    # Look for any .py file in current directory that has a bot function
    # (excluding server.py).
    cwd = os.getcwd()
    for filename in os.listdir(cwd):
        if filename.endswith(".py") and filename != "server.py":
            try:
                module_name = filename[:-3]  # Remove .py extension
                spec = importlib.util.spec_from_file_location(
                    module_name, os.path.join(cwd, filename)
                )
                module = importlib.util.module_from_spec(spec)
                spec.loader.exec_module(module)

                if hasattr(module, "bot"):
                    return module
            except Exception:
                continue

    raise ImportError(
        "Could not find 'bot' function. Make sure your bot file has a 'bot' function."
    )


async def _run_telephony_bot(websocket: WebSocket):
    """Run a bot for telephony transports."""
    bot_module = _get_bot_module()

    # Just pass the WebSocket - let the bot handle parsing
    session_args = WebSocketSessionArguments(websocket=websocket, session_id=None)

    await bot_module.bot(session_args)


def _create_server_app(
    transport_type: str, host: str = "localhost", proxy: str = None, esp32_mode: bool = False
):
    """Create FastAPI app with transport-specific routes."""
    app = FastAPI()

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Set up transport-specific routes
    if transport_type == "webrtc":
        _setup_webrtc_routes(app, esp32_mode=esp32_mode, host=host)
    elif transport_type == "daily":
        _setup_daily_routes(app)
    elif transport_type in ["twilio", "telnyx", "plivo"]:
        _setup_telephony_routes(app, transport_type, proxy)
    else:
        logger.warning(f"Unknown transport type: {transport_type}")

    return app


def _setup_webrtc_routes(app: FastAPI, esp32_mode: bool = False, host: str = "localhost"):
    """Set up WebRTC-specific routes."""
    try:
        from pipecat_ai_small_webrtc_prebuilt.frontend import SmallWebRTCPrebuiltUI

        from pipecat.transports.network.webrtc_connection import SmallWebRTCConnection
    except ImportError as e:
        logger.error(f"WebRTC transport dependencies not installed.")
        return

    # Store connections by pc_id
    pcs_map: Dict[str, SmallWebRTCConnection] = {}

    # Mount the frontend
    app.mount("/client", SmallWebRTCPrebuiltUI)

    @app.get("/", include_in_schema=False)
    async def root_redirect():
        """Redirect root requests to client interface."""
        return RedirectResponse(url="/client/")

    @app.post("/api/offer")
    async def offer(request: dict, background_tasks: BackgroundTasks):
        """Handle WebRTC offer requests and manage peer connections."""
        pc_id = request.get("pc_id")

        if pc_id and pc_id in pcs_map:
            pipecat_connection = pcs_map[pc_id]
            logger.info(f"Reusing existing connection for pc_id: {pc_id}")
            await pipecat_connection.renegotiate(
                sdp=request["sdp"],
                type=request["type"],
                restart_pc=request.get("restart_pc", False),
            )
        else:
            pipecat_connection = SmallWebRTCConnection()
            await pipecat_connection.initialize(sdp=request["sdp"], type=request["type"])

            @pipecat_connection.event_handler("closed")
            async def handle_disconnected(webrtc_connection: SmallWebRTCConnection):
                """Handle WebRTC connection closure and cleanup."""
                logger.info(f"Discarding peer connection for pc_id: {webrtc_connection.pc_id}")
                pcs_map.pop(webrtc_connection.pc_id, None)

            bot_module = _get_bot_module()
            session_args = SmallWebRTCSessionArguments(
                webrtc_connection=pipecat_connection,
                session_id=None,
            )
            background_tasks.add_task(bot_module.bot, session_args)

        answer = pipecat_connection.get_answer()

        # Apply ESP32 SDP munging if enabled
        if esp32_mode and host != "localhost":
            from pipecat.runner.utils import smallwebrtc_sdp_munging

            answer["sdp"] = smallwebrtc_sdp_munging(answer["sdp"], host)

        pcs_map[answer["pc_id"]] = pipecat_connection
        return answer

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        """Manage FastAPI application lifecycle and cleanup connections."""
        yield
        coros = [pc.disconnect() for pc in pcs_map.values()]
        await asyncio.gather(*coros)
        pcs_map.clear()

    app.router.lifespan_context = lifespan


def _setup_daily_routes(app: FastAPI):
    """Set up Daily-specific routes."""

    @app.get("/")
    async def start_agent():
        """Launch a Daily bot and redirect to room."""
        print("Starting bot with Daily transport")

        import aiohttp

        from pipecat.runner.daily import configure

        async with aiohttp.ClientSession() as session:
            room_url, token = await configure(session)

            # Start the bot in the background
            bot_module = _get_bot_module()
            session_args = DailySessionArguments(
                room_url=room_url, token=token, body={}, session_id=None
            )
            asyncio.create_task(bot_module.bot(session_args))
            return RedirectResponse(room_url)

    @app.post("/connect")
    async def rtvi_connect():
        """Launch a Daily bot and return connection info for RTVI clients."""
        print("Starting bot with Daily transport")

        import aiohttp

        from pipecat.runner.daily import configure

        async with aiohttp.ClientSession() as session:
            room_url, token = await configure(session)

            # Start the bot in the background
            bot_module = _get_bot_module()
            session_args = DailySessionArguments(
                room_url=room_url, token=token, body={}, session_id=None
            )
            asyncio.create_task(bot_module.bot(session_args))
            return {"room_url": room_url, "token": token}


def _setup_telephony_routes(app: FastAPI, transport_type: str, proxy: str):
    """Set up telephony-specific routes."""
    # XML response templates
    XML_TEMPLATES = {
        "twilio": f"""<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Connect>
    <Stream url="wss://{proxy}/ws"></Stream>
  </Connect>
  <Pause length="40"/>
</Response>""",
        "telnyx": f"""<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Connect>
    <Stream url="wss://{proxy}/ws" bidirectionalMode="rtp"></Stream>
  </Connect>
  <Pause length="40"/>
</Response>""",
        "plivo": f"""<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Stream bidirectional="true" keepCallAlive="true" contentType="audio/x-mulaw;rate=8000">wss://{proxy}/ws</Stream>
</Response>""",
    }

    @app.post("/")
    async def start_call():
        """Handle telephony webhook and return XML response."""
        logger.debug(f"POST {transport_type.upper()} XML")
        xml_content = XML_TEMPLATES.get(transport_type, "<Response></Response>")
        return HTMLResponse(content=xml_content, media_type="application/xml")

    @app.websocket("/ws")
    async def websocket_endpoint(websocket: WebSocket):
        """Handle WebSocket connections for telephony."""
        await websocket.accept()
        logger.debug("WebSocket connection accepted")
        await _run_telephony_bot(websocket)

    @app.get("/")
    async def start_agent():
        """Simple status endpoint for telephony transports."""
        return {"status": f"Bot started with {transport_type}"}


async def _run_daily_direct():
    """Run Daily bot with direct connection (no FastAPI server)."""
    try:
        import aiohttp

        from pipecat.runner.daily import configure
    except ImportError as e:
        logger.error("Daily transport dependencies not installed.")
        return

    logger.info("Running with direct Daily connection...")

    async with aiohttp.ClientSession() as session:
        room_url, token = await configure(session)

        # Create session args like the cloud runner would
        from pipecatcloud.agent import DailySessionArguments

        session_args = DailySessionArguments(
            room_url=room_url, token=token, body={}, session_id=None
        )

        # Get the bot module and run it directly
        bot_module = _get_bot_module()

        print(f"📞 Joining Daily room: {room_url}")
        print("   (Direct connection - no web server needed)")
        print()

        await bot_module.bot(session_args)


def main():
    """Start the Pipecat development runner.

    Parses command-line arguments and starts a FastAPI server configured
    for the specified transport type. The runner will discover and run
    any bot() function found in the current directory.

    Command-line arguments:

    Args:
        --host: Server host address (default: localhost)
        --port: Server port (default: 7860)
        -t/--transport: Transport type (daily, webrtc, twilio, telnyx, plivo)
        -x/--proxy: Public proxy hostname for telephony webhooks
        --esp32: Enable SDP munging for ESP32 compatibility (requires --host with IP address)
        -d/--direct: Connect directly to Daily room (automatically sets transport to daily)
        -v/--verbose: Increase logging verbosity

    The bot file must contain a `bot(session_args)` function as the entry point.
    """
    parser = argparse.ArgumentParser(description="Pipecat Development Runner")
    parser.add_argument("--host", type=str, default="localhost", help="Host address")
    parser.add_argument("--port", type=int, default=7860, help="Port number")
    parser.add_argument(
        "-t",
        "--transport",
        type=str,
        choices=["daily", "webrtc", "twilio", "telnyx", "plivo"],
        default="webrtc",
        help="Transport type",
    )
    parser.add_argument("--proxy", "-x", help="Public proxy host name")
    parser.add_argument(
        "--esp32",
        action="store_true",
        default=False,
        help="Enable SDP munging for ESP32 compatibility (requires --host with IP address)",
    )
    parser.add_argument(
        "-d",
        "--direct",
        action="store_true",
        default=False,
        help="Connect directly to Daily room (automatically sets transport to daily)",
    )
    parser.add_argument(
        "--verbose", "-v", action="count", default=0, help="Increase logging verbosity"
    )

    args = parser.parse_args()

    # Auto-set transport to daily if --direct is used without explicit transport
    if args.direct and args.transport == "webrtc":  # webrtc is the default
        args.transport = "daily"
    elif args.direct and args.transport != "daily":
        logger.error("--direct flag only works with Daily transport (-t daily)")
        return

    # Validate ESP32 requirements
    if args.esp32 and args.host == "localhost":
        logger.error("For ESP32, you need to specify `--host IP` so we can do SDP munging.")
        return

    # Log level
    logger.remove()
    logger.add(sys.stderr, level="TRACE" if args.verbose else "DEBUG")

    # Handle direct Daily connection (no FastAPI server)
    if args.direct:
        print()
        print("🚀 Connecting directly to Daily room...")
        print()

        # Run direct Daily connection
        asyncio.run(_run_daily_direct())
        return

    # Print startup message for server-based transports
    if args.transport == "webrtc":
        print()
        if args.esp32:
            print(
                f"🚀 WebRTC server starting at http://{args.host}:{args.port}/client (ESP32 mode)"
            )
        else:
            print(f"🚀 WebRTC server starting at http://{args.host}:{args.port}/client")
        print(f"   Open this URL in your browser to connect!")
        print()
    elif args.transport == "daily":
        print()
        print(f"🚀 Daily server starting at http://{args.host}:{args.port}")
        print(f"   Open this URL in your browser to start a session!")
        print()

    # Create the app with transport-specific setup
    app = _create_server_app(args.transport, args.host, args.proxy, args.esp32)

    # Run the server
    uvicorn.run(app, host=args.host, port=args.port)


if __name__ == "__main__":
    main()
