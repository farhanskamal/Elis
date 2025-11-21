
import React, { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
}

const Card: React.FC<CardProps> = ({ children, className = '' }) => {
  return (
    <div className={`bg-white dark:bg-slate-800 dark:text-slate-100 rounded-lg shadow p-6 ${className}`}>
      {children}
    </div>
  );
};

export default Card;
   