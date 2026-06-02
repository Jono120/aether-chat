import { useEffect, useRef } from 'react';
import { fetchMessages, isApiEnabled } from '../api/client';

/**
 * Polls conversation messages when SignalR is not wired in the SPA.
 * Replace with @microsoft/signalr client when VITE_SIGNALR_URL is set.
 */
export function useRealtimeMessages(conversationId, onEnvelope, intervalMs = 3000) {
  const lastSeenRef = useRef(new Set());

  useEffect(() => {
    if (!isApiEnabled() || !conversationId) return undefined;

    const poll = async () => {
      try {
        const messages = await fetchMessages(conversationId);
        for (const msg of messages) {
          if (lastSeenRef.current.has(msg.id)) continue;
          lastSeenRef.current.add(msg.id);
          onEnvelope({
            id: msg.id,
            senderEntraOid: msg.sender_entra_oid,
            ciphertext: msg.ciphertext,
            iv: msg.iv,
            cipherSuite: msg.cipher_suite,
            keyId: msg.key_id,
            sentAt: msg.sent_at,
            expiresAt: msg.expires_at,
          });
        }
      } catch (err) {
        console.warn('Message poll failed', err);
      }
    };

    poll();
    const timer = setInterval(poll, intervalMs);
    return () => clearInterval(timer);
  }, [conversationId, onEnvelope, intervalMs]);
}
