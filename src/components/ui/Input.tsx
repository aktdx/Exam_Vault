import React from 'react';
import { cn } from './Button';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export const Input: React.FC<InputProps> = ({ className, label, id, ...props }) => {
  return (
    <div className="w-full">
      {label && <label htmlFor={id} className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">{label}</label>}
      <input
        id={id}
        className={cn(
          "w-full bg-slate-50 border-2 border-slate-100 rounded-xl p-3 focus:outline-none focus:border-indigo-500 focus:bg-white transition-colors text-slate-800 font-medium",
          className
        )}
        {...props}
      />
    </div>
  );
};
