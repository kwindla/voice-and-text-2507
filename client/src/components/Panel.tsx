import React from 'react';
import { Corner } from './Corner';

interface PanelProps {
  title: string;
  children: React.ReactNode;
  className?: string;
}

export const Panel: React.FC<PanelProps> = ({ title, children, className = '' }) => {
  return (
    <div className={`border-2 border-green-400 p-1 relative flex flex-col h-full ${className}`}>
      <Corner position="tl" className="absolute top-0 left-0 text-green-400" />
      <Corner position="tr" className="absolute top-0 right-0 text-green-400" />
      <Corner position="bl" className="absolute bottom-0 left-0 text-green-400" />
      <Corner position="br" className="absolute bottom-0 right-0 text-green-400" />
      <h2 className="text-xl text-center flex-shrink-0 p-1">[ {title} ]</h2>
      <div className="border-t-2 border-green-400 border-dashed my-1 flex-shrink-0"></div>
      <div className="p-2 flex-grow overflow-y-auto min-h-0">
        {children}
      </div>
    </div>
  );
};
