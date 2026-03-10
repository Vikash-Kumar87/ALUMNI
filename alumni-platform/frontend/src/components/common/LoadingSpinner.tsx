import React from 'react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
  fullPage?: boolean;
}

const sizes = { sm: 'h-5 w-5', md: 'h-9 w-9', lg: 'h-14 w-14' };
const borders = { sm: 'border-2', md: 'border-3', lg: 'border-4' };

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ size = 'md', text, fullPage }) => {
  const spinner = (
    <div className="flex flex-col items-center gap-4">
      <div className="relative">
        <div className={`${sizes[size]} ${borders[size] || 'border-3'} border-gray-100 rounded-full`} />
        <div className={`${sizes[size]} ${borders[size] || 'border-3'} border-primary-500 border-t-transparent rounded-full animate-spin absolute inset-0`} />
        <div className={`${sizes[size]} rounded-full absolute inset-0 bg-gradient-to-r from-primary-500/10 to-violet-500/10 animate-pulse-slow`} />
      </div>
      {text && (
        <div className="text-center">
          <p className="text-sm font-medium text-gray-500 animate-pulse">{text}</p>
        </div>
      )}
    </div>
  );

  if (fullPage) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-mesh">
        {spinner}
      </div>
    );
  }

  return spinner;
};

export default LoadingSpinner;