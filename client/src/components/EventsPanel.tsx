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
  
  const formatTimestamp = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      fractionalSecondDigits: 3
    });
  };

  const getEventColor = (type: string) => {
    if (type.includes('error') || type.includes('Error')) return 'text-red-400';
    if (type.includes('warning') || type.includes('Warning')) return 'text-amber-400';
    if (type.includes('bot')) return 'text-green-400';
    if (type.includes('user')) return 'text-cyan';
    if (type.includes('transport')) return 'text-yellow-400';
    return 'text-green-300';
  };

  return (
    <div className="h-full terminal-box p-4 flex flex-col relative">
      {/* Terminal header */}
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-green-400">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-bold terminal-text tracking-wider">
            SYSTEM EVENT MONITOR
          </h3>
          <span className="text-xs opacity-50">// RTVI PROTOCOL</span>
        </div>
        <div className="text-xs terminal-text opacity-50">
          EVENTS: {events.length}
        </div>
      </div>
      
      {/* Events area */}
      <div className="flex-1 overflow-y-auto min-h-0 terminal-scrollbar font-mono" style={{ fontSize: '11px', lineHeight: '1.4' }}>
        {events.length === 0 ? (
          <div className="text-center py-8">
            <div className="terminal-text opacity-50 text-sm mb-2">
              ◄ NO EVENTS RECORDED ►
            </div>
            <div className="text-xs opacity-30">
              System events will appear here
            </div>
          </div>
        ) : (
          <div className="space-y-0">
            {eventGroups.map((group) => {
              const isExpanded = expandedGroups.has(group.id);
              const hasMultiple = group.events.length > 1;
              const eventColor = getEventColor(group.type);
              
              if (!hasMultiple || isExpanded) {
                // Show all events in the group
                return group.events.map((event, index) => (
                  <div key={event.id} className="flex items-start hover:bg-green-400/5 px-1">
                    {hasMultiple && index === 0 && (
                      <button
                        onClick={() => toggleGroup(group.id)}
                        className="text-green-400 hover:text-green-300 mr-2 mt-0.5"
                        style={{ fontSize: '10px' }}
                      >
                        ▼
                      </button>
                    )}
                    {(!hasMultiple || index > 0) && <span className="text-green-600 mr-2">│</span>}
                    <div className="flex-1 flex items-start gap-2">
                      <span className="text-green-600 opacity-50">[{formatTimestamp(event.timestamp)}]</span>
                      <span className={`${eventColor} font-bold`}>{event.type}:</span>
                      <span className="text-green-300 opacity-80 break-all">
                        {event.data ? JSON.stringify(event.data).slice(0, 100) : "null"}
                        {event.data && JSON.stringify(event.data).length > 100 ? "..." : ""}
                      </span>
                    </div>
                  </div>
                ));
              } else {
                // Show collapsed group
                return (
                  <div key={group.id} className="flex items-start hover:bg-green-400/5 px-1">
                    <button
                      onClick={() => toggleGroup(group.id)}
                      className="text-green-400 hover:text-green-300 mr-2 mt-0.5"
                      style={{ fontSize: '10px' }}
                    >
                      ▶
                    </button>
                    <div className="flex-1 flex items-start gap-2">
                      <span className="text-green-600 opacity-50">[{formatTimestamp(group.events[0].timestamp)}]</span>
                      <span className={`${eventColor} font-bold`}>{group.type}</span>
                      <span className="text-green-300 opacity-60">
                        ({group.events.length} events)
                      </span>
                    </div>
                  </div>
                );
              }
            })}
            <div ref={eventsEndRef} />
          </div>
        )}
      </div>
      
      {/* Status line */}
      <div className="mt-3 pt-2 border-t border-green-400/30 text-xs opacity-50 flex justify-between">
        <span>MONITOR: ACTIVE</span>
        <span>FILTER: ALL</span>
      </div>
    </div>
  );
}