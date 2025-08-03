import { useState, useRef, useEffect, ReactNode } from "react";

interface ResizablePanelsProps {
  topPanel: ReactNode;
  bottomPanel: ReactNode;
  defaultTopHeight?: number; // percentage
  minTopHeight?: number; // percentage
  minBottomHeight?: number; // percentage
}

export function ResizablePanels({
  topPanel,
  bottomPanel,
  defaultTopHeight = 60,
  minTopHeight = 20,
  minBottomHeight = 20,
}: ResizablePanelsProps) {
  const [topHeight, setTopHeight] = useState(defaultTopHeight);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current || !containerRef.current) return;

      const containerRect = containerRef.current.getBoundingClientRect();
      const newTopHeight = ((e.clientY - containerRect.top) / containerRect.height) * 100;
      
      // Enforce min heights
      if (newTopHeight >= minTopHeight && newTopHeight <= (100 - minBottomHeight)) {
        setTopHeight(newTopHeight);
      }
    };

    const handleMouseUp = () => {
      isDragging.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [minTopHeight, minBottomHeight]);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    isDragging.current = true;
    document.body.style.cursor = 'row-resize';
    document.body.style.userSelect = 'none';
  };

  return (
    <div ref={containerRef} className="relative flex-1 h-full">
      <div 
        style={{ 
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: `${topHeight}%` 
        }} 
        className="overflow-hidden flex flex-col"
      >
        {topPanel}
      </div>
      
      <div
        style={{
          position: 'absolute',
          top: `${topHeight}%`,
          left: 0,
          right: 0,
          height: '4px'
        }}
        className="bg-terminal-green/40 cursor-row-resize hover:bg-terminal-green transition-colors group z-10"
        onMouseDown={handleMouseDown}
      >
        <div className="absolute inset-x-0 -top-1 -bottom-1" />
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-12 h-1 bg-terminal-green rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
      
      <div 
        style={{ 
          position: 'absolute',
          top: `calc(${topHeight}% + 4px)`,
          left: 0,
          right: 0,
          bottom: 0
        }} 
        className="overflow-hidden flex flex-col"
      >
        {bottomPanel}
      </div>
    </div>
  );
}