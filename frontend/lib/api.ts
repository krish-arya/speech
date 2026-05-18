const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

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
  return fetch(`${API_BASE}/api/tts?text=${encodeURIComponent(text)}`);
}
