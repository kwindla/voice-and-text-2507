import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  active?: boolean;
}

export const Button: React.FC<ButtonProps> = ({ children, active = false, ...props }) => {
  const activeClasses = active ? 'bg-green-400 text-black shadow-[0_0_15px_rgba(7,255,7,0.8)]' : '';
  return (
    <button
      {...props}
      className={`border-2 border-green-400 px-4 py-1 text-lg uppercase font-bold
                  hover:bg-green-400 hover:text-black transition-all duration-150
                  disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-transparent disabled:text-green-400
                  ${activeClasses} ${props.className || ''}`}
    >
      {children}
    </button>
  );
};
