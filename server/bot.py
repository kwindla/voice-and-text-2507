"""
Interruptible bot using SmallWebRTCTransport.
Based on Pipecat's 07-interruptible.py example.
"""

import asyncio
import os
import sys
from typing import Optional

from dotenv import load_dotenv
from loguru import logger

from pipecat.audio.vad.silero import SileroVADAnalyzer
from pipecat.frames.frames import TranscriptionFrame, StartInterruptionFrame, StopInterruptionFrame
from pipecat.pipeline.pipeline import Pipeline
from pipecat.pipeline.runner import PipelineRunner
from pipecat.pipeline.task import PipelineParams, PipelineTask
from pipecat.processors.aggregators.openai_llm_context import OpenAILLMContext
from pipecat.processors.frameworks.rtvi import RTVIConfig, RTVIObserver, RTVIProcessor
from pipecat.services.cartesia.tts import CartesiaTTSService
from pipecat.services.deepgram.stt import DeepgramSTTService
from pipecat.services.openai.llm import OpenAILLMService
from pipecat.transports.base_transport import TransportParams
from pipecat.transports.network.small_webrtc import SmallWebRTCTransport

load_dotenv()

logger.remove()
logger.add(sys.stderr, level="DEBUG")


async def bot(session_args):
    """Main bot function that creates and runs the pipeline."""
    
    # Check if we have a webrtc_connection attribute (SmallWebRTC transport)
    if not hasattr(session_args, 'webrtc_connection'):
        logger.error(f"Expected session args with webrtc_connection, got {type(session_args)}")
        return
    
    # Get WebRTC connection from session args
    webrtc_connection = session_args.webrtc_connection
    if not webrtc_connection:
        logger.error("No WebRTC connection provided in session args")
        return

    # Configure transport parameters with Silero VAD
    transport_params = TransportParams(
        audio_in_enabled=True,
        audio_out_enabled=True,
        vad_analyzer=SileroVADAnalyzer(),
    )
    
    # Configure SmallWebRTCTransport
    transport = SmallWebRTCTransport(
        webrtc_connection=webrtc_connection,
        params=transport_params,
    )
    
    # Create RTVI processor with config
    rtvi = RTVIProcessor(config=RTVIConfig(config=[]))

    # Initialize STT service
    stt = DeepgramSTTService(
        api_key=os.getenv("DEEPGRAM_API_KEY"),
        model="nova-2",
        language="en",
        smartformat=True,
        encoding="linear16",
        sample_rate=16000,
        channels=1,
    )

    # Initialize TTS service
    tts = CartesiaTTSService(
        api_key=os.getenv("CARTESIA_API_KEY"),
        voice_id="79a125e8-cd45-4c13-8a67-188112f4dd22",  # British Lady
    )

    # Initialize LLM service
    llm = OpenAILLMService(
        api_key=os.getenv("OPENAI_API_KEY"),
        model="gpt-4o-mini",
    )

    # System prompt
    messages = [
        {
            "role": "system",
            "content": "You are a helpful and friendly AI assistant. You love to chat about life, answer questions, and help people. Keep your responses concise and natural.",
        }
    ]

    # Create context aggregator
    context = OpenAILLMContext(messages)
    context_aggregator = llm.create_context_aggregator(context)

    # Create pipeline
    pipeline = Pipeline([
        transport.input(),
        stt,
        rtvi,  # Add RTVI processor for transcription events
        context_aggregator.user(),
        llm,
        tts,
        transport.output(),
        context_aggregator.assistant(),
    ])

    # Create task with RTVI observer
    task = PipelineTask(
        pipeline,
        params=PipelineParams(
            allow_interruptions=True,
            enable_metrics=True,
            enable_usage_metrics=True,
        ),
        observers=[RTVIObserver(rtvi)],
    )

    @rtvi.event_handler("on_client_ready")
    async def on_client_ready(rtvi):
        await rtvi.set_bot_ready()
        # Kick off the conversation
        await task.queue_frames([context_aggregator.user().get_context_frame()])
    
    @rtvi.event_handler("on_client_message")
    async def on_client_message(rtvi, message):
        """Handle custom messages from the client."""
        logger.info(f"Received client message: {message}")
        
        # Extract message type and data from RTVIClientMessage object
        msg_type = message.type
        msg_data = message.data if hasattr(message, 'data') else {}
        
        if msg_type == "custom-message":
            text = msg_data.get("text", "") if isinstance(msg_data, dict) else ""
            if text:
                # Process the text message as user input
                logger.info(f"Processing custom message: {text}")
                # Send the text as a TranscriptionFrame which will be processed by the context aggregator
                await task.queue_frames([
                    StartInterruptionFrame(),
                    TranscriptionFrame(
                    text=text,
                    user_id="text-input",
                    timestamp="",
                    ),
                    StopInterruptionFrame(),
                ])
                
                # Send acknowledgment back to client
                await rtvi.send_server_message({
                    "type": "message-received",
                    "text": f"Received: {text}"
                })

    @transport.event_handler("on_client_connected")
    async def on_client_connected(transport, client):
        """Handle new connection."""
        logger.info("Client connected")

    @transport.event_handler("on_client_disconnected")
    async def on_client_disconnected(transport, client):
        """Handle disconnection."""
        logger.info("Client disconnected")
        await task.cancel()
        logger.info("Bot stopped")

    # Create runner and run the task
    runner = PipelineRunner(handle_sigint=False)
    await runner.run(task)


if __name__ == "__main__":
    # This file is meant to be imported and used with a WebSocket connection
    # Use main.py to run the server
    logger.info("This module should be imported, not run directly. Use 'python run.py' to start the server.")