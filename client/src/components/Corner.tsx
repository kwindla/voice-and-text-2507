import React from 'react';

interface CornerProps extends React.SVGProps<SVGSVGElement> {
  position: 'tl' | 'tr' | 'bl' | 'br';
}

export const Corner: React.FC<CornerProps> = ({ position, ...props }) => {
  const paths = {
    tl: 'M 10 0 L 0 0 L 0 10',
    tr: 'M 0 0 L 10 0 L 10 10',
    bl: 'M 0 0 L 0 10 L 10 10',
    br: 'M 10 0 L 10 10 L 0 10',
  };

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      {...props}
    >
      <path d={paths[position]} />
    </svg>
  );
};
