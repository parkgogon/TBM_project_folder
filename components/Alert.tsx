
import React from 'react';
import { XCircleIcon, InformationCircleIcon, ExclamationTriangleIcon } from './Icons'; // Assuming you have these icons

interface AlertProps {
  message: string;
  type: 'error' | 'success' | 'info' | 'warning';
  onClose?: () => void;
}

export const Alert: React.FC<AlertProps> = ({ message, type, onClose }) => {
  let bgColor = 'bg-red-500';
  let textColor = 'text-white';
  let IconComponent = XCircleIcon;

  switch (type) {
    case 'success':
      bgColor = 'bg-green-500';
      IconComponent = InformationCircleIcon; // Placeholder, better CheckCircleIcon
      break;
    case 'info':
      bgColor = 'bg-blue-500';
      IconComponent = InformationCircleIcon;
      break;
    case 'warning':
      bgColor = 'bg-yellow-500';
      textColor = 'text-yellow-800';
      IconComponent = ExclamationTriangleIcon;
      break;
    case 'error':
    default:
      // Default is error
      break;
  }

  return (
    <div className={`${bgColor} ${textColor} p-4 rounded-md flex items-start justify-between shadow-lg`}>
      <div className="flex items-start">
        <IconComponent className="h-6 w-6 mr-3 flex-shrink-0" />
        <p>{message}</p>
      </div>
      {onClose && (
        <button onClick={onClose} className="ml-4 -mr-1 -mt-1 p-1 rounded-md hover:bg-black/20 focus:outline-none focus:ring-2 focus:ring-white">
          <span className="sr-only">Close</span>
          <XCircleIcon className="h-5 w-5" />
        </button>
      )}
    </div>
  );
};
    
