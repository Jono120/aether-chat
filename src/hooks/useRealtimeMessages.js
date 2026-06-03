import { useEffect, useRef } from 'react';
import * as signalR from '@microsoft/signalr';
import { fetchMessages, isApiEnabled, negotiateSignalR } from '../api/client';

const SIGNALR_HUB = import.meta.env.VITE_SIGNALR_URL ?? '';

/**
 * Receives conversation messages via Azure SignalR when configured, otherwise polls REST.
 */
export function useRealtimeMessages(conversationId, onEnvelope, intervalMs = 3000) {
  const lastSeenRef = useRef(new Set());

  useEffect(() => {
    if (!isApiEnabled() || !conversationId) return undefined;

    let connection;
    let pollTimer;
    let cancelled = false;

    const deliver = (msg) => {
      if (!msg?.id || lastSeenRef.current.has(msg.id)) return;
      lastSeenRef.current.add(msg.id);
      onEnvelope({
        id: msg.id,
        senderEntraOid: msg.sender_entra_oid ?? msg.senderEntraOid,
        ciphertext: msg.ciphertext,
        iv: msg.iv,
        cipherSuite: msg.cipher_suite ?? msg.cipherSuite,
        keyId: msg.key_id ?? msg.keyId,
        sentAt: msg.sent_at ?? msg.sentAt,
        expiresAt: msg.expires_at ?? msg.expiresAt,
      });
    };

    const poll = async () => {
      try {
        const messages = await fetchMessages(conversationId);
        for (const msg of messages) deliver(msg);
      } catch (err) {
        console.warn('Message poll failed', err);
      }
    };

    const startPolling = () => {
      poll();
      pollTimer = setInterval(poll, intervalMs);
    };

    const startSignalR = async () => {
      try {
        const negotiated = await negotiateSignalR();
        if (cancelled || !negotiated?.url || !negotiated?.accessToken) {
          startPolling();
          return;
        }
        connection = new signalR.HubConnectionBuilder()
          .withUrl(negotiated.url, {
            accessTokenFactory: () => negotiated.accessToken,
          })
          .withAutomaticReconnect()
          .build();

        connection.on('ReceiveEnvelope', (payload) => {
          deliver(payload);
        });

        await connection.start();
        if (SIGNALR_HUB) {
          await connection.invoke('JoinConversation', conversationId).catch(() => {});
        }
        await poll();
      } catch (err) {
        console.warn('SignalR unavailable, falling back to polling', err);
        if (!cancelled) startPolling();
      }
    };

    startSignalR();

    return () => {
      cancelled = true;
      if (pollTimer) clearInterval(pollTimer);
      if (connection) {
        connection.stop().catch(() => {});
      }
    };
  }, [conversationId, onEnvelope, intervalMs]);
}
