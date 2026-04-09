const buildSseEvent = (eventBlock) => {
  const lines = eventBlock.split('\n');
  let event = 'message';
  const dataLines = [];

  lines.forEach((line) => {
    if (line.startsWith('event:')) {
      event = line.slice(6).trim() || 'message';
      return;
    }
    if (line.startsWith('data:')) {
      dataLines.push(line.slice(5).trim());
    }
  });

  const rawData = dataLines.join('\n');
  let parsedData = rawData;
  if (rawData) {
    try {
      parsedData = JSON.parse(rawData);
    } catch (err) {
      parsedData = rawData;
    }
  }

  return { event, data: parsedData };
};

export const streamGuideAnswer = async ({
  query,
  history = [],
  signal,
  onEvent,
}) => {
  if (!query || !query.trim()) {
    throw new Error('Query is required.');
  }

  const token = localStorage.getItem('token');
  const apiBase = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001').replace(/\/+$/, '');
  const response = await fetch(`${apiBase}/api/guide/ask`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({
      query: query.trim(),
      history,
    }),
    signal,
  });

  if (!response.ok || !response.body) {
    throw new Error('Guide is temporarily unavailable');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const blocks = buffer.split('\n\n');
    buffer = blocks.pop() || '';

    blocks.forEach((block) => {
      if (!block.trim()) return;
      const parsed = buildSseEvent(block);
      if (typeof onEvent === 'function') {
        onEvent(parsed);
      }
    });
  }

  if (buffer.trim()) {
    const parsed = buildSseEvent(buffer);
    if (typeof onEvent === 'function') {
      onEvent(parsed);
    }
  }
};
