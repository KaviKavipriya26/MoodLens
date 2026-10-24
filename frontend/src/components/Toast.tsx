import React from 'react';

export interface ToastMessage {
  id: number;
  text: string;
}

interface ToastContainerProps {
  messages: ToastMessage[];
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ messages }) => {
  return (
    <div className="toast-container" id="toast">
      {messages.map((m) => (
        <div key={m.id}>{m.text}</div>
      ))}
    </div>
  );
};
