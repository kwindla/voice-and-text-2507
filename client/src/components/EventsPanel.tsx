import { useState, useEffect, useRef } from "react";
import { RTVIEvent } from "@pipecat-ai/client-js";
import { usePipecatClient, usePipecatClientTransportState } from "@pipecat-ai/client-react";

interface RTVIEventLog {
  id: string;
  type: string;
  data: any;
  timestamp: Date;
}

export function EventsPanel() {
  const [events, setEvents] = useState<RTVIEventLog[]>([]);
  const eventsEndRef = useRef<HTMLDivElement>(null);
  const client = usePipecatClient();
  const transportState = usePipecatClientTransportState();
  const previousTransportState = useRef(transportState);

  // Clear events when connection is established
  useEffect(() => {
    if (previousTransportState.current !== "ready" && transportState === "ready") {
      setEvents([]);
    }
    previousTransportState.current = transportState;
  }, [transportState]);

  // Auto-scroll to bottom when new events arrive
  useEffect(() => {
    eventsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [events]);

  // Subscribe to ALL RTVI events using enum enumeration
  useEffect(() => {
    if (!client) return;

    const handleRTVIEvent = (eventType: string, data: any) => {
      const newEvent: RTVIEventLog = {
        id: Date.now().toString() + Math.random(),
        type: eventType,
        data: data,
        timestamp: new Date(),
      };
      setEvents(prev => [...prev.slice(-99), newEvent]); // Keep last 100 events
    };

    // Create handlers for all events in the RTVIEvent enum
    const eventHandlers: Record<string, (data: any) => void> = {};
    
    Object.values(RTVIEvent).forEach((eventName) => {
      eventHandlers[eventName] = (data: any) => handleRTVIEvent(eventName, data);
    });

    // Subscribe to all events
    Object.entries(eventHandlers).forEach(([event, handler]) => {
      try {
        client.on(event as any, handler);
      } catch (e) {
        console.debug(`Could not subscribe to event: ${event}`);
      }
    });

    return () => {
      // Unsubscribe from all events
      Object.entries(eventHandlers).forEach(([event, handler]) => {
        try {
          client.off(event as any, handler);
        } catch (e) {
          console.debug(`Could not unsubscribe from event: ${event}`);
        }
      });
    };
  }, [client]);

  return (
    <div className="bg-gray-800 rounded-lg p-4 mb-4 h-32 overflow-y-auto">
      <h3 className="text-sm font-medium text-gray-400 mb-2">RTVI Events</h3>
      <div className="space-y-1 text-xs font-mono">
        {events.length === 0 ? (
          <div className="text-gray-600">No events yet...</div>
        ) : (
          events.map((event) => (
            <div key={event.id} className="text-gray-400 truncate">
              <span className="text-gray-500">{event.timestamp.toLocaleTimeString()}</span>
              {" "}
              <span className="text-blue-400">{event.type}</span>:
              {" "}
              <span className="text-gray-300">
                {event.data ? JSON.stringify(event.data).slice(0, 100) : "{}"}
                {event.data && JSON.stringify(event.data).length > 100 ? "..." : ""}
              </span>
            </div>
          ))
        )}
        <div ref={eventsEndRef} />
      </div>
    </div>
  );
}