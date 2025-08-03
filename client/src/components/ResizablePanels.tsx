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

  const resizerHeight = 8; // px

  return (
    <div ref={containerRef} className="relative flex-1 h-full">
      <div 
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: `calc(${topHeight}% - ${resizerHeight / 2}px)`
        }}
        className="overflow-hidden flex flex-col"
      >
        {topPanel}
      </div>
      
      <div
        style={{
          position: 'absolute',
          top: `calc(${topHeight}% - ${resizerHeight / 2}px)`,
          left: 0,
          right: 0,
          height: `${resizerHeight}px`
        }}
        className="cursor-row-resize group z-10 flex items-center justify-center"
        onMouseDown={handleMouseDown}
      >
        <div className="w-full border-t-2 border-b-2 border-green-400 border-dashed h-2 group-hover:border-solid"></div>
      </div>
      
      <div 
        style={{
          position: 'absolute',
          top: `calc(${topHeight}% + ${resizerHeight / 2}px)`,
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