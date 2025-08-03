import { useState, useEffect, useRef } from "react";
import { RTVIEvent } from "@pipecat-ai/client-js";
import { usePipecatClient, usePipecatClientTransportState } from "@pipecat-ai/client-react";

interface RTVIEventLog {
  id: string;
  type: string;
  data: any;
  timestamp: Date;
}

interface EventGroup {
  id: string;
  type: string;
  events: RTVIEventLog[];
  isExpanded: boolean;
}

export function EventsPanel() {
  const [events, setEvents] = useState<RTVIEventLog[]>([]);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const eventsEndRef = useRef<HTMLDivElement>(null);
  const client = usePipecatClient();
  const transportState = usePipecatClientTransportState();
  const previousTransportState = useRef(transportState);

  // Debug mounting/unmounting
  useEffect(() => {
    console.log('EventsPanel mounted');
    return () => console.log('EventsPanel unmounted');
  }, []);

  // Clear events when starting a new connection (not when it becomes ready)
  useEffect(() => {
    console.log('Transport state changed:', previousTransportState.current, '->', transportState);
    // Clear when we start connecting from a disconnected state
    if (previousTransportState.current === "disconnected" && transportState === "initializing") {
      console.log('Clearing events because starting new connection');
      setEvents([]);
      setExpandedGroups(new Set());
    }
    previousTransportState.current = transportState;
  }, [transportState]);

  // Auto-scroll to bottom when new events arrive
  useEffect(() => {
    eventsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [events]);

  // Group consecutive events of the same type
  const groupEvents = (eventList: RTVIEventLog[]): EventGroup[] => {
    const groups: EventGroup[] = [];
    let currentGroup: EventGroup | null = null;

    eventList.forEach((event) => {
      if (!currentGroup || currentGroup.type !== event.type) {
        // Start a new group
        currentGroup = {
          id: event.id,
          type: event.type,
          events: [event],
          isExpanded: expandedGroups.has(event.id)
        };
        groups.push(currentGroup);
      } else {
        // Add to existing group
        currentGroup.events.push(event);
      }
    });

    return groups;
  };

  const toggleGroup = (groupId: string) => {
    setExpandedGroups(prev => {
      const newSet = new Set(prev);
      if (newSet.has(groupId)) {
        newSet.delete(groupId);
      } else {
        newSet.add(groupId);
      }
      return newSet;
    });
  };

  // Subscribe to ALL RTVI events using enum enumeration
  useEffect(() => {
    if (!client) return;

    const handleRTVIEvent = (eventType: string, data: any) => {
      // Skip localAudioLevel events - they're too frequent and not useful for debugging
      if (eventType === 'localAudioLevel') {
        return;
      }
      
      const newEvent: RTVIEventLog = {
        id: Date.now().toString() + Math.random(),
        type: eventType,
        data: data,
        timestamp: new Date(),
      };
      setEvents(prev => [...prev.slice(-499), newEvent]); // Keep last 500 events
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

  const eventGroups = groupEvents(events);

    return (
      <div className="h-full bg-black border border-terminal-green rounded p-4 flex flex-col">
        <h3 className="text-sm font-medium mb-2 flex-shrink-0">RTVI Events</h3>
        <div className="flex-1 overflow-y-auto min-h-0 space-y-1 text-xs" style={{ fontFamily: 'Menlo, Monaco, \"Courier New\", monospace', fontSize: '11px' }}>
          {events.length === 0 ? (
            <div className="opacity-50">No events yet...</div>
          ) : (
            eventGroups.map((group) => {
            const isExpanded = expandedGroups.has(group.id);
            const hasMultiple = group.events.length > 1;
            
            if (!hasMultiple || isExpanded) {
              // Show all events in the group
              return group.events.map((event, index) => (
                  <div key={event.id} className="flex items-center gap-2">
                    {hasMultiple && index === 0 && (
                      <button
                        onClick={() => toggleGroup(group.id)}
                        className="opacity-50 hover:opacity-100 transition-colors"
                      >
                        ▼
                      </button>
                    )}
                    {(!hasMultiple || index > 0) && <span className="opacity-50">•</span>}
                    <div className="flex-1 truncate">
                      <span className="opacity-50">{event.timestamp.toLocaleTimeString()}</span>
                      {" "}
                      <span>{event.type}</span>:
                      {" "}
                      <span>
                        {event.data ? JSON.stringify(event.data).slice(0, 100) : "{}"}
                        {event.data && JSON.stringify(event.data).length > 100 ? "..." : ""}
                      </span>
                    </div>
                  </div>
                ));
            } else {
              // Show collapsed group
                return (
                  <div key={group.id} className="flex items-center gap-2">
                    <button
                      onClick={() => toggleGroup(group.id)}
                      className="opacity-50 hover:opacity-100 transition-colors"
                    >
                      ▶
                    </button>
                    <div className="flex-1">
                      <span className="opacity-50">
                        {group.events[0].timestamp.toLocaleTimeString()} - {group.events[group.events.length - 1].timestamp.toLocaleTimeString()}
                      </span>
                      {" "}
                      <span>{group.type}</span>
                      {" "}
                      <span>({group.events.length} events)</span>
                    </div>
                  </div>
                );
            }
          })
        )}
        <div ref={eventsEndRef} />
      </div>
    </div>
  );
}