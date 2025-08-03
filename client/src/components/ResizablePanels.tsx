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
        className="flex flex-col"
      >
        {topPanel}
      </div>
      
      <div
        style={{ 
          position: 'absolute',
          top: `${topHeight}%`,
          left: 0,
          right: 0,
          height: '6px'
        }}
        className="terminal-divider cursor-row-resize z-10"
        onMouseDown={handleMouseDown}
      >
        <div className="absolute inset-x-0 -top-2 -bottom-2" />
        <div className="h-full flex items-center justify-center">
          <div className="w-full h-0.5 bg-green-400 opacity-50"></div>
          <div className="absolute left-1/2 -translate-x-1/2">
            <span className="text-green-400 text-xs terminal-text opacity-70 bg-black/70 px-1 rounded">
              ▲▼
            </span>
          </div>
        </div>
      </div>
      
      <div 
        style={{ 
          position: 'absolute',
          top: `calc(${topHeight}% + 6px)`,
          left: 0,
          right: 0,
          bottom: 0
        }} 
        className="flex flex-col"
      >
        {bottomPanel}
      </div>
    </div>
  );
}