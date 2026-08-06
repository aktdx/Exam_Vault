import React from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger';
}

export const Button: React.FC<ButtonProps> = ({ className, variant = 'primary', ...props }) => {
  return (
    <button
      className={cn(
        "font-bold py-2 px-4 rounded-xl transition-all disabled:opacity-50",
        variant === 'primary' && "bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm",
        variant === 'secondary' && "bg-white border-2 border-slate-200 text-slate-600 hover:border-indigo-600 hover:text-indigo-600",
        variant === 'danger' && "bg-red-500 text-white hover:bg-red-600 shadow-sm shadow-red-200",
        className
      )}
      {...props}
    />
  );
};
