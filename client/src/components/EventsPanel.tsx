import { useState, useEffect, useRef } from "react";
import { RTVIEvent } from "@pipecat-ai/client-js";
import { usePipecatClient, usePipecatClientTransportState } from "@pipecat-ai/client-react";
import { Panel } from "./Panel";

interface RTVIEventLog {
  id: string;
  type: string;
  data: any;
  timestamp: Date;
}

interface EventGroup {
  id:string;
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

  useEffect(() => {
    if (previousTransportState.current === "disconnected" && transportState === "initializing") {
      setEvents([]);
      setExpandedGroups(new Set());
    }
    previousTransportState.current = transportState;
  }, [transportState]);

  useEffect(() => {
    eventsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [events]);

  const groupEvents = (eventList: RTVIEventLog[]): EventGroup[] => {
    const groups: EventGroup[] = [];
    let currentGroup: EventGroup | null = null;
    eventList.forEach((event) => {
      if (!currentGroup || currentGroup.type !== event.type) {
        currentGroup = {
          id: event.id,
          type: event.type,
          events: [event],
          isExpanded: expandedGroups.has(event.id)
        };
        groups.push(currentGroup);
      } else {
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

  useEffect(() => {
    if (!client) return;

    const handleRTVIEvent = (eventType: string, data: any) => {
      if (eventType === 'localAudioLevel') return;
      const newEvent: RTVIEventLog = {
        id: Date.now().toString() + Math.random(),
        type: eventType,
        data: data,
        timestamp: new Date(),
      };
      setEvents(prev => [...prev.slice(-499), newEvent]);
    };

    const eventHandlers: Record<string, (data: any) => void> = {};
    Object.values(RTVIEvent).forEach((eventName) => {
      eventHandlers[eventName] = (data: any) => handleRTVIEvent(eventName, data);
    });

    Object.entries(eventHandlers).forEach(([event, handler]) => {
      try {
        client.on(event as any, handler);
      } catch (e) {
        console.debug(`Could not subscribe to event: ${event}`);
      }
    });

    return () => {
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
    <Panel title="EVENT LOG">
      <div className="text-sm">
        {events.length === 0 ? (
          <div className="opacity-50">&gt; No events...</div>
        ) : (
          eventGroups.map((group) => {
            const isExpanded = expandedGroups.has(group.id);
            const hasMultiple = group.events.length > 1;
            
            if (!hasMultiple || isExpanded) {
              return group.events.map((event, index) => (
                <div key={event.id} className="flex items-start gap-2">
                  <div className="w-16 flex-shrink-0 opacity-70">
                    {index === 0 ? group.events[0].timestamp.toLocaleTimeString() : ''}
                  </div>
                  <div className="flex-grow">
                    <span className="text-retro-green-light">{event.type}</span>
                    <span className="opacity-70">
                      : {event.data ? JSON.stringify(event.data).slice(0, 100) : "{}"}
                      {event.data && JSON.stringify(event.data).length > 100 ? "..." : ""}
                    </span>
                  </div>
                </div>
              ));
            } else {
              return (
                <div key={group.id} className="flex items-start gap-2">
                   <div className="w-16 flex-shrink-0 opacity-70">
                    {group.events[0].timestamp.toLocaleTimeString()}
                  </div>
                  <button
                    onClick={() => toggleGroup(group.id)}
                    className="text-retro-green-light hover:text-white transition-colors"
                  >
                    [+] {group.type} ({group.events.length} events)
                  </button>
                </div>
              );
            }
          })
        )}
        <div ref={eventsEndRef} />
      </div>
    </Panel>
  );
}