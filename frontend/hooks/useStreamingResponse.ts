"use client";

import { useRef, useCallback, useState } from "react";

export interface StreamEvent {
  type: string;
  data: any;
}

interface UseStreamingResponseReturn {
  response: string;
  sources: any[];
  status: string;
  transcript: string;
  isStreaming: boolean;
  processStream: (response: Response) => Promise<void>;
  reset: () => void;
}

export function useStreamingResponse(): UseStreamingResponseReturn {
  const [response, setResponse] = useState("");
  const [sources, setSources] = useState<any[]>([]);
  const [status, setStatus] = useState("");
  const [transcript, setTranscript] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const processStream = useCallback(async (res: Response) => {
    abortRef.current = new AbortController();
    setIsStreaming(true);
    setResponse("");
    setSources([]);
    setStatus("");

    const reader = res.body?.getReader();
    if (!reader) {
      setIsStreaming(false);
      return;
    }

    const decoder = new TextDecoder();
    let buffer = "";

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const event: StreamEvent = JSON.parse(line.slice(6));
            switch (event.type) {
              case "transcript":
                setTranscript(event.data);
                break;
              case "status":
                setStatus(event.data);
                break;
              case "search_results":
                setSources(event.data);
                break;
              case "token":
                setResponse((prev) => prev + event.data);
                break;
              case "done":
                if (event.data?.sources) setSources(event.data.sources);
                break;
              case "error":
                setStatus(event.data || "Request failed");
                break;
            }
          } catch {
            // skip malformed lines
          }
        }
      }
    } catch (err: any) {
      if (err.name !== "AbortError") {
        setStatus("Connection error");
      }
    } finally {
      setIsStreaming(false);
      reader.releaseLock();
    }
  }, []);

  const reset = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
    }
    setResponse("");
    setSources([]);
    setStatus("");
    setTranscript("");
    setIsStreaming(false);
  }, []);

  return { response, sources, status, transcript, isStreaming, processStream, reset };
}
