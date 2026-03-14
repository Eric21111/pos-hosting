import React from 'react';


export const StockInIcon = ({ size = 20, className = '' }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}>
      
      {}
      <path
        d="M8 8L12 6L16 8L12 10L8 8Z"
        fill="white"
        stroke="#22C55E"
        strokeWidth="1.5" />
      
      {}
      <path
        d="M8 8V14L12 16V10L8 8Z"
        fill="white"
        stroke="#22C55E"
        strokeWidth="1.5" />
      
      {}
      <path
        d="M16 8V14L12 16V10L16 8Z"
        fill="white"
        stroke="#22C55E"
        strokeWidth="1.5" />
      
      {}
      <circle
        cx="19"
        cy="19"
        r="3.5"
        fill="#22C55E" />
      
      <path
        d="M19 16.5V21.5M16.5 19H21.5"
        stroke="white"
        strokeWidth="1.2"
        strokeLinecap="round" />
      
    </svg>);

};


export const StockOutIcon = ({ size = 24, className = '' }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}>
      
      {}
      <path
        d="M8 8L12 6L16 8L12 10L8 8Z"
        fill="white"
        stroke="#4B5563"
        strokeWidth="1.5" />
      
      {}
      <path
        d="M8 8V14L12 16V10L8 8Z"
        fill="white"
        stroke="#4B5563"
        strokeWidth="1.5" />
      
      {}
      <path
        d="M16 8V14L12 16V10L16 8Z"
        fill="white"
        stroke="#4B5563"
        strokeWidth="1.5" />
      
      {}
      <circle
        cx="19"
        cy="19"
        r="3.5"
        fill="#EF4444" />
      
      <path
        d="M16.5 19H21.5"
        stroke="white"
        strokeWidth="1.2"
        strokeLinecap="round" />
      
    </svg>);

};


export const PullOutIcon = ({ size = 24, className = '' }) => {
  return <StockOutIcon size={size} className={className} />;
};