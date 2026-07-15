import React from 'react';

interface DevToolsBlockerProps {
  onBlocked: (reason: 'devtools') => void;
}

export default function DevToolsBlocker({ onBlocked }: DevToolsBlockerProps) {
  return null;
}
