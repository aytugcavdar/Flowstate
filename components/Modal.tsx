
import React from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl max-w-md w-full flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex justify-between items-center shrink-0">
          <h2 className="text-xl font-bold text-white tracking-wider">{title}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-2">✕</button>
        </div>
        
        {/* Scrollable Content */}
        <div className="p-4 sm:p-6 text-slate-300 overflow-y-auto custom-scrollbar">
          {children}
        </div>
      </div>
    </div>
  );
};
