const STORAGE_KEY = 'aether_read_receipts';

function loadMap() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { incoming: {}, outgoing: {} };
    const parsed = JSON.parse(raw);
    return {
      incoming: parsed.incoming && typeof parsed.incoming === 'object' ? parsed.incoming : {},
      outgoing: parsed.outgoing && typeof parsed.outgoing === 'object' ? parsed.outgoing : {},
    };
  } catch {
    return { incoming: {}, outgoing: {} };
  }
}

function saveMap(map) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
}

export function receiptKey(chatId, messageId) {
  return `${chatId}:${messageId}`;
}

/** Mark a received message as read on this device. */
export function markMessageRead(chatId, messageId) {
  const map = loadMap();
  map.incoming[receiptKey(chatId, messageId)] = new Date().toISOString();
  saveMap(map);
}

/** Mark your sent message as read by the other person (local / simulated). */
export function markOutgoingReadByPeer(chatId, messageId) {
  const map = loadMap();
  map.outgoing[receiptKey(chatId, messageId)] = new Date().toISOString();
  saveMap(map);
}

export function isMessageReadByMe(chatId, messageId) {
  const map = loadMap();
  return Boolean(map.incoming[receiptKey(chatId, messageId)]);
}

export function isOutgoingReadByPeer(chatId, messageId) {
  const map = loadMap();
  return Boolean(map.outgoing[receiptKey(chatId, messageId)]);
}

export function getReadReceiptsSnapshot() {
  return loadMap();
}

export function replaceReadReceipts(snapshot) {
  saveMap({
    incoming: snapshot?.incoming ?? {},
    outgoing: snapshot?.outgoing ?? {},
  });
}

export function markChatIncomingRead(chatId, messageIds) {
  const map = loadMap();
  const now = new Date().toISOString();
  for (const id of messageIds) {
    map.incoming[receiptKey(chatId, id)] = now;
  }
  saveMap(map);
}
