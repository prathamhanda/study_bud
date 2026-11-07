import React, { useEffect, useRef, useState } from 'react';
import { Mic, SkipForward, Play, Square, VolumeX, Brain, AlertTriangle, CheckCircle, Cpu } from 'lucide-react';
import { Button } from '../components/Button';

// ─── Whisper (client-side, zero cost, zero backend) ─────────────────────────
// Loaded from jsdelivr's +esm build so dependencies (onnxruntime-web) resolve.
const TRANSFORMERS_CDN = 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.3.1/+esm';
// Quantized (q8) ONNX build ≈ 73 MB, downloaded once and cached by the browser.
const WHISPER_MODEL = 'onnx-community/whisper-base';
const MAX_RECORD_MS = 15000;
const MODEL_WAIT_MS = 120000;

const prompts = [
  'Say: Hello, how are you?',
  'Describe your day in one sentence.',
  'Ask for directions to the nearest station.',
];

type Engine = 'whisper' | 'webspeech';
type ModelState = 'loading' | 'ready' | 'error';
type TranscriptSource = Engine | null;

/** Decode any recorded blob (webm/opus, mp4/aac, …) to mono 16 kHz Float32 — Whisper's expected input. */
const blobTo16kMono = async (blob: Blob): Promise<Float32Array> => {
  const arrayBuffer = await blob.arrayBuffer();
  const AudioCtx: typeof AudioContext =
    (window as any).AudioContext || (window as any).webkitAudioContext;
  const ctx = new AudioCtx();
  try {
    const decoded = await ctx.decodeAudioData(arrayBuffer);
    const length = Math.ceil(decoded.duration * 16000);
    if (!Number.isFinite(length) || length <= 0) {
      throw new Error('Could not decode recorded audio');
    }
    const offline = new OfflineAudioContext(1, length, 16000);
    const source = offline.createBufferSource();
    source.buffer = decoded;
    source.connect(offline.destination);
    source.start();
    const rendered = await offline.startRendering();
    return rendered.getChannelData(0);
  } finally {
    ctx.close().catch(() => {});
  }
};

const VoiceLesson: React.FC = () => {
  const [current, setCurrent] = useState(0);
  const [recording, setRecording] = useState(false);
  const [listening, setListening] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [transcript, setTranscript] = useState<string>('');
  const [transcriptSource, setTranscriptSource] = useState<TranscriptSource>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [error, setError] = useState<string>('');
  const [isPlaying, setIsPlaying] = useState(false);

  // STT engine / model state
  const [engine, setEngine] = useState<Engine>('whisper');
  const [modelState, setModelState] = useState<ModelState>('loading');
  const [modelPct, setModelPct] = useState(0);

  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const recognitionRef = useRef<any>(null);
  const recognitionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const recordTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const transcriberRef = useRef<any>(null);
  const loadPromiseRef = useRef<Promise<any> | null>(null);
  const fileProgressRef = useRef<Record<string, { loaded: number; total: number }>>({});

  const log = (s: string) => setLogs((prev) => [s, ...prev].slice(0, 200));

  const clearRecognitionTimeout = () => {
    if (recognitionTimeoutRef.current) {
      clearTimeout(recognitionTimeoutRef.current);
      recognitionTimeoutRef.current = null;
    }
  };

  const clearRecordTimeout = () => {
    if (recordTimeoutRef.current) {
      clearTimeout(recordTimeoutRef.current);
      recordTimeoutRef.current = null;
    }
  };

  // ── Whisper model lifecycle ────────────────────────────────────────────────
  const loadModel = (): Promise<any> => {
    if (transcriberRef.current) return Promise.resolve(transcriberRef.current);
    if (loadPromiseRef.current) return loadPromiseRef.current;

    setModelState('loading');
    const promise = (async () => {
      try {
        log('Loading Whisper base (~73 MB, downloaded once, then cached)…');
        const moduleUrl = TRANSFORMERS_CDN;
        const mod: any = await import(/* @vite-ignore */ moduleUrl);
        const { pipeline, env } = mod;
        env.allowLocalModels = false;
        env.allowRemoteModels = true;
        env.useBrowserCache = true;
        // Threads need cross-origin isolation (SharedArrayBuffer); without it, stay single-threaded.
        try {
          if (!(self as any).crossOriginIsolated && env?.backends?.onnx?.wasm) {
            env.backends.onnx.wasm.numThreads = 1;
          }
        } catch {
          /* backend not initialized yet — safe to ignore */
        }

        fileProgressRef.current = {};
        const transcriber = await pipeline('automatic-speech-recognition', WHISPER_MODEL, {
          dtype: 'q8',
          progress_callback: (p: any) => {
            if (p?.status === 'progress' && p.file && typeof p.loaded === 'number') {
              fileProgressRef.current[p.file] = {
                loaded: p.loaded,
                total: p.total || 0,
              };
              const entries = Object.values(fileProgressRef.current);
              const total = entries.reduce((s, e) => s + e.total, 0);
              const loaded = entries.reduce((s, e) => s + e.loaded, 0);
              if (total > 0) {
                setModelPct(Math.min(100, Math.round((loaded / total) * 100)));
              }
            } else if (p?.status === 'done' && p.file) {
              log(`Fetched ${String(p.file).split('/').pop()}`);
            }
          },
        });

        transcriberRef.current = transcriber;
        setModelState('ready');
        setModelPct(100);
        log('Whisper base ready — transcription runs 100% in your browser');
        return transcriber;
      } catch (e: any) {
        console.error('Whisper model load failed:', e);
        setModelState('error');
        log(`Whisper load failed: ${e?.message || e}`);
        setEngine('webspeech');
        log('Automatic fallback engaged — browser Web Speech API active');
        throw e;
      } finally {
        loadPromiseRef.current = null;
      }
    })();

    loadPromiseRef.current = promise;
    return promise;
  };

  // ── TTS (prompt playback, browser speech synthesis) ────────────────────────
  const playPrompt = () => {
    setError('');
    clearRecognitionTimeout();
    const text = prompts[current] || 'Say anything you like.';
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-IN';
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      utteranceRef.current = utterance;
      window.speechSynthesis.speak(utterance);
      setIsPlaying(true);
      utterance.onend = () => setIsPlaying(false);
      log(`Played prompt: ${text}`);
    } else {
      setError('Browser does not support speech synthesis');
    }
  };

  const stopPlaying = () => {
    window.speechSynthesis.cancel();
    setIsPlaying(false);
    if (utteranceRef.current) {
      utteranceRef.current.onend = null;
    }
  };

  // ── STT: Web Speech API (fallback engine) ─────────────────────────────────
  const startWebSpeech = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError('Browser does not support speech recognition');
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-IN';
    recognition.maxAlternatives = 1;
    recognitionRef.current = recognition;

    recognition.onstart = () => {
      setListening(true);
      setRecording(true);
      log('Listening (Web Speech API) — speak now');
      recognitionTimeoutRef.current = setTimeout(() => {
        try {
          recognition.stop();
        } catch {
          /* already stopped */
        }
        setListening(false);
        setRecording(false);
        log('Listening timed out — try again');
      }, 6000);
    };

    recognition.onresult = (event: any) => {
      clearRecognitionTimeout();
      const transcriptText = event.results[0][0].transcript;
      setTranscript(transcriptText);
      setTranscriptSource('webspeech');
      setListening(false);
      setRecording(false);
      log(`Transcript: ${transcriptText}`);
      recognition.stop();
    };

    recognition.onerror = (event: any) => {
      clearRecognitionTimeout();
      setListening(false);
      setRecording(false);
      if (event.error === 'aborted') {
        log('Recognition aborted — no speech detected. Click START_RECORDING again.');
      } else if (event.error === 'not-allowed') {
        setError('Microphone permission denied. Please allow microphone access.');
        log('Error: microphone not allowed');
      } else if (event.error === 'no-speech') {
        log('No speech detected — try again');
      } else {
        setError(`Speech recognition error: ${event.error}`);
        log(`Error: ${event.error}`);
      }
    };

    recognition.onend = () => {
      clearRecognitionTimeout();
      setListening(false);
      setRecording(false);
    };

    try {
      recognition.start();
      log('Recording started (browser speech recognition)');
    } catch (e: any) {
      setError(e?.message || 'Failed to start recording');
    }
  };

  // ── STT: Whisper via MediaRecorder (primary engine) ───────────────────────
  const handleRecordedBlob = async (blob: Blob) => {
    setListening(false);
    if (blob.size < 1024) {
      log('Recording too short — try again');
      setError('Recording too short — hold the mic a little longer');
      return;
    }
    setTranscribing(true);
    log(`Audio captured: ${Math.round(blob.size / 1024)} KB`);
    try {
      let transcriber = transcriberRef.current;
      if (!transcriber) {
        log('Waiting for Whisper model download to finish…');
        transcriber = await Promise.race([
          loadModel(),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Model download timed out')), MODEL_WAIT_MS),
          ),
        ]);
      }
      const audio = await blobTo16kMono(blob);
      log('Transcribing with Whisper base (on-device)…');
      const startedAt = Date.now();
      const out: any = await transcriber(audio, {
        task: 'transcribe',
        chunk_length_s: 30,
        stride_length_s: 5,
      });
      const text = String(out?.text ?? '').trim();
      if (text) {
        setTranscript(text);
        setTranscriptSource('whisper');
        log(`Transcript (${((Date.now() - startedAt) / 1000).toFixed(1)}s): ${text}`);
      } else {
        log('Whisper returned no text');
        setError('No speech detected — try again');
      }
    } catch (e: any) {
      console.error('Whisper transcription failed:', e);
      log(`Whisper failed: ${e?.message || e}`);
      setModelState((s) => (s === 'ready' ? s : 'error'));
      setEngine('webspeech');
      setError('Whisper unavailable — browser STT enabled, please record again');
      log('Automatic fallback engaged — browser Web Speech API active');
    } finally {
      setTranscribing(false);
    }
  };

  const startWhisperRecording = async () => {
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('Microphone API not available in this browser');
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeTypes = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'];
      const mimeType = mimeTypes.find(
        (m) => (window as any).MediaRecorder?.isTypeSupported?.(m),
      );
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      chunksRef.current = [];
      recorder.ondataavailable = (ev) => {
        if (ev.data.size > 0) chunksRef.current.push(ev.data);
      };
      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, {
          type: recorder.mimeType || 'audio/webm',
        });
        void handleRecordedBlob(blob);
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      setRecording(true);
      setListening(true);
      log(`Recording started (Whisper engine${mimeType ? `, ${mimeType}` : ''})`);
      recordTimeoutRef.current = setTimeout(() => {
        log('Auto-stopped at 15 s limit');
        stopRecording();
      }, MAX_RECORD_MS);
    } catch (e: any) {
      console.error('Mic capture failed:', e);
      setRecording(false);
      setListening(false);
      if (e?.name === 'NotAllowedError' || e?.name === 'SecurityError') {
        setError('Microphone permission denied. Please allow microphone access.');
        log('Error: microphone not allowed');
      } else {
        setError(e?.message || 'Failed to start recording');
        log(`Error: ${e?.message || e}`);
      }
    }
  };

  const startRecording = async () => {
    setError('');
    stopPlaying();
    clearRecognitionTimeout();
    clearRecordTimeout();
    if (engine === 'whisper') {
      await startWhisperRecording();
    } else {
      startWebSpeech();
    }
  };

  const stopRecording = () => {
    clearRecordTimeout();
    clearRecognitionTimeout();
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== 'inactive') {
      try {
        recorder.stop(); // onstop → handleRecordedBlob
      } catch (e: any) {
        setError(e?.message || 'Failed to stop recording');
      }
    }
    mediaRecorderRef.current = null;
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        /* already stopped */
      }
      recognitionRef.current = null;
    }
    setRecording(false);
    setListening(false);
    if (recorder) log('Recording stopped');
  };

  const toggleEngine = () => {
    if (recording || transcribing) return;
    const next: Engine = engine === 'whisper' ? 'webspeech' : 'whisper';
    setEngine(next);
    setError('');
    log(
      next === 'whisper'
        ? 'STT engine → Whisper base (local, private)'
        : 'STT engine → Web Speech API',
    );
    if (next === 'whisper' && !transcriberRef.current) {
      loadModel().catch(() => {});
    }
  };

  const nextPrompt = () => {
    setTranscript('');
    setTranscriptSource(null);
    stopPlaying();
    stopRecording();
    setCurrent((c) => (c + 1) % prompts.length);
  };

  useEffect(() => {
    loadModel().catch(() => {}); // errors handled inside
    return () => {
      clearRecognitionTimeout();
      clearRecordTimeout();
      window.speechSynthesis.cancel();
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      const recorder = mediaRecorderRef.current;
      if (recorder && recorder.state !== 'inactive') {
        try {
          recorder.stop();
        } catch {
          /* page unloading */
        }
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const statusLine =
    engine === 'webspeech'
      ? modelState === 'error'
        ? 'Whisper unavailable — using browser Web Speech API'
        : 'Engine: browser Web Speech API'
      : modelState === 'loading'
      ? `Downloading Whisper base… ${modelPct}%`
      : modelState === 'ready'
      ? 'Whisper ready — audio never leaves your device'
      : 'Whisper failed — using browser Web Speech API';

  return (
    <div className="min-h-screen bg-neo-bg relative p-4">
      <div className="max-w-2xl mx-auto space-y-8 relative z-10">
        {/* Header */}
        <div className="flex flex-col items-center justify-center text-center mb-2">
          <div className="bg-neo-accent border-4 border-black p-6 inline-block -rotate-6 shadow-[8px_8px_0px_0px_#000] mb-6">
            <Brain className="w-12 h-12 text-black stroke-[3px]" />
          </div>
          <h1 className="text-5xl font-black text-black uppercase tracking-tighter italic mb-2 leading-tight">
            Voice<span className="text-neo-accent">Lesson</span>
          </h1>
          <p className="text-lg font-bold text-black/70 uppercase tracking-widest italic">
            Speak • Learn • Repeat
          </p>
        </div>

        {/* Prompt Card */}
        <div className="bg-white border-4 border-black shadow-[6px_6px_0px_0px_#000] p-8 rounded-none relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-12 h-12 bg-neo-secondary border-b-4 border-r-4 border-black" />
          <div className="absolute bottom-0 right-0 w-12 h-12 bg-neo-accent border-t-4 border-l-4 border-black" />

          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-black border-4 border-black flex items-center justify-center text-white font-black uppercase text-xs shadow-[4px_4px_0px_0px_#000]">
                <span>{current + 1}</span>
              </div>
              <span className="text-xl font-black text-black uppercase tracking-tight italic">
                Prompt
              </span>
            </div>
            <Badge label={`${current + 1} / ${prompts.length}`} />
          </div>

          <div className="relative mb-8">
            <div className="bg-black border-4 border-black p-6 font-mono text-2xl font-black text-white relative overflow-hidden group-hover:scale-105 transition-transform duration-200">
              <span className="absolute top-2 right-2 text-xs font-black text-neo-accent uppercase">
                VOICE_INPUT
              </span>
              {prompts[current]}
            </div>
          </div>

          {/* TTS Controls */}
          <div className="flex items-center justify-between gap-4">
            <Button
              variant="primary"
              size="lg"
              onClick={playPrompt}
              disabled={isPlaying}
              icon={
                isPlaying ? (
                  <VolumeX className="w-5 h-5 stroke-[3px]" />
                ) : (
                  <Play className="w-5 h-5 stroke-[3px]" />
                )
              }
              className="flex-1"
            >
              {isPlaying ? 'STOP_VOICE' : 'PLAY_PROMPT'}
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={nextPrompt}
              icon={<SkipForward className="w-5 h-5 stroke-[3px]" />}
              className="flex-1"
            >
              NEXT_PROMPT
            </Button>
          </div>
        </div>

        {/* Recording Card */}
        <div className="bg-white border-4 border-black shadow-[6px_6px_0px_0px_#000] p-8 rounded-none relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-12 h-12 bg-neo-accent border-b-4 border-l-4 border-black" />
          <div className="absolute bottom-0 left-0 w-12 h-12 bg-neo-secondary border-t-4 border-r-4 border-black" />

          <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-black border-4 border-black flex items-center justify-center text-white font-black uppercase text-xs shadow-[4px_4px_0px_0px_#000]">
                <Mic className="w-5 h-5 stroke-[3px]" />
              </div>
              <span className="text-xl font-black text-black uppercase tracking-tight italic">
                Record
              </span>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={toggleEngine}
                disabled={recording || transcribing}
                title="Switch speech-to-text engine"
                className={`flex items-center gap-1.5 border-4 border-black px-3 py-1 text-[10px] font-black uppercase tracking-widest shadow-[3px_3px_0px_0px_#000] transition-all ${
                  engine === 'whisper'
                    ? 'bg-neo-accent text-black'
                    : 'bg-black text-white'
                } ${recording || transcribing ? 'opacity-50 cursor-not-allowed' : 'hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_0px_#000]'}`}
              >
                <Cpu className="w-3.5 h-3.5 stroke-[3px]" />
                {engine === 'whisper' ? 'WHISPER' : 'WEB_SPEECH'}
              </button>
              <RecordingIndicator recording={recording} listening={listening} />
            </div>
          </div>

          {/* Model / engine status bar */}
          <div className="mb-6 border-4 border-black bg-black/5 h-8 relative overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${
                engine === 'webspeech' || modelState === 'error'
                  ? 'bg-black/20 w-full'
                  : modelState === 'ready'
                  ? 'bg-neo-secondary w-full'
                  : 'bg-neo-accent'
              }`}
              style={{
                width:
                  engine === 'whisper' && modelState === 'loading'
                    ? `${modelPct}%`
                    : '100%',
              }}
            />
            <span className="absolute inset-0 flex items-center justify-center text-xs font-black uppercase tracking-widest text-black">
              {statusLine}
            </span>
          </div>

          <div className="flex flex-col items-center justify-center gap-6 py-10 relative">
            {/* Recording visualizer */}
            <div className="relative w-full h-32 flex items-end justify-center gap-2">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                <div
                  key={i}
                  className={`w-2 bg-black rounded-t transition-all duration-300 ${
                    recording
                      ? `animate-[audio_${i}s_cubic-bezier(0.4,0,0.6,1)_infinite]`
                      : ''
                  }`}
                  style={{
                    height: recording ? `${40 + Math.sin(i + Date.now() / 100) * 20}%` : '20%',
                    animationDelay: `${i * 0.1}s`,
                  }}
                />
              ))}
            </div>

            <Button
              variant={recording ? 'danger' : 'success'}
              size="xl"
              onClick={recording ? stopRecording : startRecording}
              disabled={isPlaying || transcribing}
              loading={transcribing}
              icon={
                recording ? (
                  <Square className="w-6 h-6 stroke-[3px]" />
                ) : (
                  <Mic className="w-6 h-6 stroke-[3px]" />
                )
              }
              className="relative group"
            >
              <span className="font-black uppercase tracking-tighter">
                {transcribing
                  ? 'TRANSCRIBING…'
                  : recording
                  ? 'STOP_RECORDING'
                  : 'START_RECORDING'}
              </span>
              {recording && (
                <span className="absolute -top-4 -right-4 bg-neo-accent border-4 border-black text-black font-black text-xs uppercase px-2 py-1 animate-pulse">
                  LIVE
                </span>
              )}
            </Button>
            {listening && !transcribing && (
              <p className="text-sm font-bold text-neo-accent italic uppercase tracking-tighter">
                Listening — say something now
              </p>
            )}
            {transcribing && (
              <p className="text-sm font-bold text-black italic uppercase tracking-tighter animate-pulse">
                Transcribing on your device — no upload, no API key
              </p>
            )}
            {!recording && !listening && !transcribing && (
              <p className="text-sm font-black text-black/40 uppercase tracking-tighter italic">
                {engine === 'whisper'
                  ? 'Click start and speak clearly — up to 15 seconds'
                  : 'Click start and speak within 6 seconds'}
              </p>
            )}
          </div>
        </div>

        {/* Transcript Card */}
        <div className="bg-white border-4 border-black shadow-[6px_6px_0px_0px_#000] p-8 rounded-none relative overflow-hidden">
          <div className="absolute top-0 left-0 w-12 h-12 bg-neo-secondary border-b-4 border-r-4 border-black" />
          <div className="absolute bottom-0 right-0 w-12 h-12 bg-neo-accent border-t-4 border-l-4 border-black" />

          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-black border-4 border-black flex items-center justify-center text-white font-black uppercase text-xs shadow-[4px_4px_0px_0px_#000]">
                <CheckCircle className="w-5 h-5 stroke-[3px]" />
              </div>
              <span className="text-xl font-black text-black uppercase tracking-tight italic">
                Transcript
              </span>
            </div>
            <span className="text-xs font-black text-black/50 uppercase tracking-widest">
              {transcriptSource === 'whisper'
                ? 'WHISPER_BASE'
                : transcriptSource === 'webspeech'
                ? 'WEB_SPEECH'
                : 'STANDBY'}
            </span>
          </div>

          <div className="relative">
            <div className="bg-black/5 border-4 border-black p-6 font-mono text-lg font-bold text-black min-h-[120px] whitespace-pre-wrap break-words italic relative overflow-hidden group-hover:scale-[1.01] transition-transform duration-200">
              {transcript || <span className="text-black/20 italic">Your transcript appears here...</span>}
            </div>
            {transcript && (
              <div className="absolute top-2 right-2 bg-neo-secondary border-4 border-black text-black font-black text-xs px-2 py-1 uppercase italic">
                RECOGNIZED
              </div>
            )}
          </div>
        </div>

        {/* Error / Logs */}
        {error && (
          <div className="bg-red-50 border-4 border-red-500 shadow-[4px_4px_0px_0px_#000] p-6 text-red-700 font-bold uppercase text-sm italic flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 shrink-0 stroke-[3px] mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <div className="bg-black border-4 border-black shadow-[4px_4px_0px_0px_#000] p-4 text-xs font-mono text-white/60 uppercase tracking-tighter max-h-32 overflow-y-auto">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-neo-accent" />
            <span className="font-black">LOGS</span>
          </div>
          {logs.map((entry, i) => (
            <div key={i} className="mb-1 truncate">
              <span className="text-black/30">[{logs.length - i}]</span> {entry}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="text-center mt-8">
          <p className="text-xs font-black text-black/40 uppercase tracking-[0.2em]">
            STUDYBUD &bull; VOICE_LEARNING_PROTOCOL &bull; WHISPER_BASE &bull; 100% FREE
          </p>
        </div>
      </div>
    </div>
  );
};

interface BadgeProps {
  label: string;
}

const Badge: React.FC<BadgeProps> = ({ label }) => (
  <div className="bg-black border-4 border-black text-white font-black text-xs uppercase px-3 py-1 shadow-[4px_4px_0px_0px_#000]">
    {label}
  </div>
);

interface RecordingIndicatorProps {
  recording: boolean;
  listening: boolean;
}

const RecordingIndicator: React.FC<RecordingIndicatorProps> = ({ recording, listening }) => (
  <div
    className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest transition-all duration-300 ${
      listening
        ? 'bg-neo-accent text-black shadow-[0_0_0_4px_rgba(255,107,107,0.4)] animate-pulse'
        : recording
        ? 'bg-red-500 text-white shadow-[0_0_0_4px_rgba(239,68,68,0.4)] animate-pulse'
        : 'bg-black text-white shadow-[4px_4px_0px_0px_#000]'
    }`}
  >
    {listening ? (
      <>
        <span className="relative w-2 h-2 rounded-full bg-white animate-pulse" />
        LISTENING
      </>
    ) : recording ? (
      <>
        <span className="relative w-2 h-2 rounded-full bg-white animate-pulse" />
        RECORDING
      </>
    ) : (
      'READY'
    )}
  </div>
);

export default VoiceLesson;
