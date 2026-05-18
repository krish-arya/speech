const DEFAULT_API_BASE = "http://localhost:8000";

function normalizeApiBase(rawBase?: string): string {
  const value = (rawBase || "").trim();
  if (!value) return DEFAULT_API_BASE;

  const withProtocol = /^https?:\/\//i.test(value) ? value : `https://${value}`;

  try {
    const url = new URL(withProtocol);
    return url.toString().replace(/\/$/, "");
  } catch {
    return DEFAULT_API_BASE;
  }
}

const API_BASE = normalizeApiBase(process.env.NEXT_PUBLIC_API_URL);

export async function sendAudioForQuery(audioBlob: Blob): Promise<Response> {
  const formData = new FormData();
  formData.append("audio", audioBlob, "recording.webm");

  return fetch(`${API_BASE}/api/query`, {
    method: "POST",
    body: formData,
  });
}

export async function sendTextForQuery(text: string): Promise<Response> {
  const formData = new FormData();
  formData.append("text", text);

  return fetch(`${API_BASE}/api/query-text`, {
    method: "POST",
    body: formData,
  });
}

export async function fetchTTS(text: string): Promise<Response> {
  const formData = new FormData();
  formData.append("text", text);

  return fetch(`${API_BASE}/api/tts`, {
    method: "POST",
    body: formData,
  });
}
