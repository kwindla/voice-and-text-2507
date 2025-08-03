interface ResizablePanelsProps {
  topPanel: React.ReactNode;
  bottomPanel: React.ReactNode;
  defaultTopHeight?: number;
  minTopHeight?: number;
  minBottomHeight?: number;
}

export function ResizablePanels({ topPanel, bottomPanel }: ResizablePanelsProps) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-hidden">{topPanel}</div>
      <div className="h-1 bg-terminal-green my-1" />
      <div className="flex-1 overflow-hidden">{bottomPanel}</div>
    </div>
  );
}
