const DEFAULT_SETTINGS = {
  temperature: 0.7,
  top_p: 1.0,
  top_k: 0,
  presence_penalty: 0.0,
  frequency_penalty: 0.0,
  repetition_penalty: 1.0,
  max_tokens: 2000,
};

const CHAT_HISTORY_LIMIT = 20;

const SSE_HEADERS = {
  'Content-Type': 'text/event-stream',
  'Cache-Control': 'no-cache',
  Connection: 'keep-alive',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Cache-Control',
};

module.exports = {
  DEFAULT_SETTINGS,
  CHAT_HISTORY_LIMIT,
  SSE_HEADERS,
};
