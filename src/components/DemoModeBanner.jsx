import React from 'react';
import { isApiEnabled } from '../api/client';

export default function DemoModeBanner() {
  if (isApiEnabled()) return null;

  return (
    <div className="demo-mode-banner" role="status">
      <strong>Demo mode</strong>
      <span> — profiles, chats, and sign-in data stay on this device only. No server is connected.</span>
    </div>
  );
}
