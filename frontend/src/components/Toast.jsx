import React from 'react';
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react';
import './Toast.css';

export default function Toast({ toast, onClose }) {
  if (!toast) return null;

  const { type, message } = toast;

  const renderIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle className="toast-icon success" size={20} />;
      case 'error':
        return <AlertCircle className="toast-icon error" size={20} />;
      default:
        return <Info className="toast-icon info" size={20} />;
    }
  };

  return (
    <div className={`toast-container toast-${type} animate-slide-up`}>
      {renderIcon()}
      <span className="toast-message">{message}</span>
      <button onClick={onClose} className="toast-close-btn" aria-label="Close notification">
        <X size={16} />
      </button>
    </div>
  );
}
