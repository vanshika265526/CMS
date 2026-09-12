import React from "react";

interface CardProps {
  children: React.ReactNode;
  className?: string;
}

const Card: React.FC<CardProps> = ({ children, className = "" }) => {
  return (
    <div
      className={`bg-surface-container-lowest shadow-ambient rounded-2xl border border-outline-variant overflow-hidden ${className}`}
    >
      {children}
    </div>
  );
};

export default Card;
