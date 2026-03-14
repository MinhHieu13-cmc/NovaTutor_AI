import { useState, useEffect, useCallback, useRef } from 'react';
import { GoogleGenAI, Modality } from "@google/genai";
import { authService } from '@/services/authService';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

// --- Constants & Types ---
const MODEL_NAME = "gemini-2.5-flash-native-audio-preview-09-2025";
const SYSTEM_INSTRUCTION = `Role: You are "NovaTutor," an AI-powered educational assistant designed to help students learn effectively. You are patient, encouraging, and knowledgeable across various subjects including math, science, literature, and more.

IMPORTANT: As soon as the session starts, greet the user warmly and introduce yourself as NovaTutor. Ask them what subject they need help with today.

Core Objective: Your goal is to provide personalized tutoring, explain concepts clearly, and guide students through their learning journey. You handle three main tasks:
1. Explaining difficult concepts in simple terms.
2. Providing step-by-step solutions to problems.
3. Offering practice exercises and feedback.

Your Capabilities: You can assist with homework, prepare for exams, explain textbook material, and adapt to different learning styles.

Target Audience: Students of all ages who want to improve their understanding and academic performance.

Interaction Guidelines:
- Be encouraging and supportive.
- Break down complex ideas into manageable parts.
- Use examples and analogies when possible.
- Ask questions to check understanding.
- Provide positive reinforcement for correct answers.

Constraints:
- Always verify information accuracy.
- If a question is beyond your scope, suggest consulting a human teacher.
- Keep responses clear and concise while being thorough.
- Encourage critical thinking and problem-solving skills.`;

// --- Audio Utilities ---
function pcmToFloat32(pcmData: Uint8Array): Float32Array {
  const int16Array = new Int16Array(pcmData.buffer, pcmData.byteOffset, pcmData.byteLength / 2);
  const float32Array = new Float32Array(int16Array.length);
  for (let i = 0; i < int16Array.length; i++) {
    float32Array[i] = int16Array[i] / 32768;
  }
  return float32Array;
}

function float32ToPcm(float32Array: Float32Array): Int16Array {
  const pcmData = new Int16Array(float32Array.length);
  for (let i = 0; i < float32Array.length; i++) {
    const s = Math.max(-1, Math.min(1, float32Array[i]));
    pcmData[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return pcmData;
}

function arrayBufferToBase64(buffer: ArrayBuffer | Int16Array): string {
  let binary = '';
  const bytes = buffer instanceof Int16Array ? new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength) : new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

interface NovaTutorSocketHook {
  connect: () => void;
  disconnect: () => void;
  sendMessage: (message: any) => void;
  startRecording: () => void;
  stopRecording: () => void;
  currentViseme: Record<string, number>;
  currentEmotion: string;
  isSpeaking: boolean;
  isConnected: boolean;
  isRecording: boolean;
  transcript: string;
  debugInfo: string;
  error: string | null;
}

/**
 * Custom Hook React: useNovaTutorSocket
 * Dành cho dự án NovaTutor AI (Phase 4.1)
 * Hỗ trợ Web Audio API, ARKit 52 Blendshapes và GoogleGenAI Live Session.
 */
export const useNovaTutorSocket = (): NovaTutorSocketHook => {
  const [isConnected, setIsConnected] = useState(false);
  const isConnectedRef = useRef(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<string>("");
  const [msgCount, setMsgCount] = useState(0);
  const msgCountRef = useRef(0);
  const [currentViseme, setCurrentViseme] = useState<Record<string, number>>({});
  const [currentEmotion, setCurrentEmotion] = useState('neutral');
  const [debugInfo, setDebugInfo] = useState<string>("");

  const audioContextRef = useRef<AudioContext | null>(null);
  const sessionRef = useRef<any>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const audioQueueRef = useRef<Float32Array[]>([]);
  const nextStartTimeRef = useRef<number>(0);

  // Initialize Audio Context
  const initAudio = async () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    }
    if (audioContextRef.current.state === 'suspended') {
      await audioContextRef.current.resume();
    }
  };

  const playQueuedAudio = () => {
    if (audioQueueRef.current.length === 0 || !audioContextRef.current) return;

    const ctx = audioContextRef.current;

    while (audioQueueRef.current.length > 0) {
      const data = audioQueueRef.current.shift()!;
      const buffer = ctx.createBuffer(1, data.length, 24000);
      buffer.getChannelData(0).set(data);


      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);

      // If nextStartTime is in the past, reset to now + small buffer
      if (nextStartTimeRef.current < ctx.currentTime) {
        nextStartTimeRef.current = ctx.currentTime + 0.05;
      }

      const startTime = nextStartTimeRef.current;
      source.start(startTime);

      // Update next start time based on buffer duration
      nextStartTimeRef.current += buffer.duration;

      setIsSpeaking(true);
      source.onended = () => {
        // Check if we're roughly at the end of all scheduled audio
        if (ctx.currentTime >= nextStartTimeRef.current - 0.1) {
          setIsSpeaking(false);
        }
      };
    }
  };

  // Start Gemini Live Session
  const startSession = async () => {
    try {
      setError(null);
      setTranscript("");
      setDebugInfo("Initializing audio...");
      await initAudio();

      setDebugInfo("Requesting secure Gemini key...");
      const token = authService.getToken();
      const keyResponse = await fetch(`${API_URL}/system/gemini-key`, {
        method: 'GET',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        credentials: 'include',
      });

      if (!keyResponse.ok) {
        throw new Error('Cannot get Gemini runtime key from backend');
      }

      const { api_key } = await keyResponse.json();
      if (!api_key) {
        throw new Error('Gemini runtime key is empty');
      }

      setDebugInfo("Connecting to Gemini...");

      const ai = new GoogleGenAI({ apiKey: api_key });

      const sessionPromise = ai.live.connect({
        model: MODEL_NAME,
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: "Zephyr" } },
          },
          inputAudioTranscription: {},
        },
        callbacks: {
          onopen: () => {
            setIsConnected(true);
            isConnectedRef.current = true;
            setDebugInfo("Connected! Starting mic...");
            startMic(sessionPromise);
          },
          onmessage: async (message: any) => {
            setMsgCount(prev => {
              const next = prev + 1;
              msgCountRef.current = next;
              return next;
            });
            console.log("Gemini Message:", message);

            // Handle audio and text from model
            if (message.serverContent?.modelTurn?.parts) {
              for (const part of message.serverContent.modelTurn.parts) {
                if (part.inlineData) {
                  const base64Data = part.inlineData.data;
                  const binaryData = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
                  const float32Data = pcmToFloat32(binaryData);
                  audioQueueRef.current.push(float32Data);
                }
                if (part.text) {
                  setTranscript(prev => (prev + "\nNovaTutor: " + part.text).slice(-500));
                }
              }
              playQueuedAudio();
            }

            // Handle user transcription
            if (message.serverContent?.inputAudioTranscription?.text) {
               const userText = message.serverContent.inputAudioTranscription.text;
               setTranscript(prev => (prev + "\nYou: " + userText).slice(-500));
            }

            if (message.serverContent?.interrupted) {
              audioQueueRef.current = [];
              nextStartTimeRef.current = 0;
              setIsSpeaking(false);
              setDebugInfo("Interrupted");
            }
          },
          onclose: () => {
            stopMic();
            setIsConnected(false);
            isConnectedRef.current = false;
            setDebugInfo("Session closed");
          },
          onerror: (err) => {
            console.error("Live API Error:", err);
            const errMsg = err instanceof Error ? err.message : "Unknown connection error";
            setError(`Connection error: ${errMsg}`);
            setDebugInfo("Error occurred");
            stopMic();
            setIsConnected(false);
            isConnectedRef.current = false;
          }
        }
      });

      sessionRef.current = await sessionPromise;
    } catch (err) {
      console.error("Failed to connect:", err);
      setError("Failed to initialize NovaTutor. Check your connection and credentials.");
      setDebugInfo("Failed to connect");
    }
  };

  const [micLevel, setMicLevel] = useState<number>(0);

  const startMic = async (sessionPromise: Promise<any>) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Create context with 16000Hz as required by Gemini Live
      const micContext = new AudioContext({ sampleRate: 16000 });
      const source = micContext.createMediaStreamSource(stream);
      const processor = micContext.createScriptProcessor(4096, 1, 1);

      // Ensure context is running
      if (micContext.state === 'suspended') {
        await micContext.resume();
      }

      const session = await sessionPromise;
      sessionRef.current = session;

      let chunkCount = 0;
      processor.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0);

        // Calculate mic level directly from PCM data
        let sum = 0;
        for (let i = 0; i < inputData.length; i++) {
          sum += Math.abs(inputData[i]);
        }
        const level = (sum / inputData.length) * 500;
        setMicLevel(level);

        // Use Ref to avoid stale closure issues
        if (isConnectedRef.current && sessionRef.current) {
          const pcmData = float32ToPcm(inputData);
          const base64Data = arrayBufferToBase64(pcmData.buffer as ArrayBuffer);

          try {
            sessionRef.current.sendRealtimeInput({
              media: { data: base64Data, mimeType: 'audio/pcm;rate=16000' }
            });
            chunkCount++;
            // Update debug info more frequently at start
            if (chunkCount < 100 || chunkCount % 50 === 0) {
              setDebugInfo(`Streaming: ${chunkCount} pkts | Msgs: ${msgCountRef.current}`);
            }
          } catch (sendErr) {
            console.error("Error sending audio:", sendErr);
          }
        }
      };

      source.connect(processor);
      processor.connect(micContext.destination);
      processorRef.current = processor;
      setIsRecording(true);
      setDebugInfo("Microphone active and streaming");
    } catch (err) {
      console.error("Mic error:", err);
      setError("Microphone error: " + (err instanceof Error ? err.message : "Access denied"));
      setDebugInfo("Mic Error");
    }
  };

  const stopMic = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    setIsRecording(false);
  };

  const connect = useCallback(async () => {
    if (isConnected) {
      sessionRef.current?.close();
      setIsConnected(false);
    } else {
      await initAudio();
      startSession();
    }
  }, [isConnected]);

  const disconnect = useCallback(() => {
    sessionRef.current?.close();
    setIsConnected(false);
  }, []);

  const sendMessage = useCallback((message: any) => {
    // Not used in this implementation
  }, []);

  const startRecording = useCallback(() => {
    // Handled by connect
  }, []);

  const stopRecording = useCallback(() => {
    stopMic();
  }, []);

  return {
    connect,
    disconnect,
    sendMessage,
    startRecording,
    stopRecording,
    currentViseme,
    currentEmotion,
    isSpeaking,
    isConnected,
    isRecording,
    transcript,
    debugInfo,
    error
  };
};
