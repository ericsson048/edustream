import { useCallback, useRef, useState } from 'react';
import { liveService } from '../../../../services/liveService';

interface UseCompositeRecordingOptions {
  sessionId: string;
  remoteStreams: Record<string, MediaStream>;
  localStream: MediaStream | null;
}

export function useCompositeRecording({ sessionId, remoteStreams, localStream }: UseCompositeRecordingOptions) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const videoElementsRef = useRef<Map<string, HTMLVideoElement>>(new Map());
  const audioNodesRef = useRef<{ context: AudioContext; dest: MediaStreamAudioDestinationNode; sources: MediaStreamAudioSourceNode[] } | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const animFrameRef = useRef<number>(0);
  const remoteStreamsRef = useRef(remoteStreams);
  const localStreamRef = useRef(localStream);
  const [isRecording, setIsRecording] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  remoteStreamsRef.current = remoteStreams;
  localStreamRef.current = localStream;

  const syncVideoElements = useCallback(() => {
    const remote = remoteStreamsRef.current;
    const local = localStreamRef.current;

    for (const [userId, stream] of Object.entries(remote)) {
      if (!videoElementsRef.current.has(userId)) {
        const video = document.createElement('video');
        video.srcObject = stream;
        video.muted = true;
        video.playsInline = true;
        video.play().catch(() => undefined);
        videoElementsRef.current.set(userId, video);
      }
    }

    for (const userId of videoElementsRef.current.keys()) {
      if (userId !== '__local__' && !remote[userId]) {
        videoElementsRef.current.get(userId)!.remove();
        videoElementsRef.current.delete(userId);
      }
    }

    if (local) {
      let localVideo = videoElementsRef.current.get('__local__');
      if (!localVideo) {
        localVideo = document.createElement('video');
        localVideo.muted = true;
        localVideo.playsInline = true;
        localVideo.play().catch(() => undefined);
        videoElementsRef.current.set('__local__', localVideo);
      }
      localVideo.srcObject = local;
    }
  }, []);

  const drawFrame = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = ctxRef.current;
    if (!canvas || !ctx) return;

    syncVideoElements();

    const { width, height } = canvas;
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, width, height);

    const entries = Array.from(videoElementsRef.current.entries());
    const count = entries.length;
    if (count === 0) {
      ctx.fillStyle = '#334155';
      ctx.font = '18px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('No video', width / 2, height / 2);
      animFrameRef.current = requestAnimationFrame(drawFrame);
      return;
    }

    const cols = count <= 1 ? 1 : count <= 4 ? 2 : 3;
    const rows = Math.ceil(count / cols);
    const tileW = width / cols;
    const tileH = height / rows;

    entries.forEach(([userId, video], i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = col * tileW;
      const y = row * tileH;

      ctx.save();
      ctx.beginPath();
      ctx.rect(x, y, tileW, tileH);
      ctx.clip();

      try {
        ctx.drawImage(video, x, y, tileW, tileH);
      } catch {
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(x, y, tileW, tileH);
      }

      const label = userId === '__local__' ? 'You' : (userId.slice(0, 8) + '…');
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(x + 8, y + tileH - 28, ctx.measureText(label).width + 16, 22);
      ctx.fillStyle = '#e2e8f0';
      ctx.font = '12px system-ui, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(label, x + 16, y + tileH - 12);

      ctx.restore();
    });

    animFrameRef.current = requestAnimationFrame(drawFrame);
  }, [syncVideoElements]);

  const setupAudioMixing = useCallback(() => {
    const audioContext = new AudioContext();
    const dest = audioContext.createMediaStreamDestination();
    const sources: MediaStreamAudioSourceNode[] = [];

    const connectStream = (stream: MediaStream) => {
      const audioTracks = stream.getAudioTracks();
      if (audioTracks.length > 0) {
        const source = audioContext.createMediaStreamSource(new MediaStream(audioTracks));
        source.connect(dest);
        sources.push(source);
      }
    };

    if (localStreamRef.current) connectStream(localStreamRef.current);
    for (const stream of Object.values(remoteStreamsRef.current)) connectStream(stream);

    audioNodesRef.current = { context: audioContext, dest, sources };
    return dest;
  }, []);

  const startRecording = useCallback(() => {
    if (typeof MediaRecorder === 'undefined') return;

    const canvas = document.createElement('canvas');
    canvas.width = 1280;
    canvas.height = 720;
    canvasRef.current = canvas;
    ctxRef.current = canvas.getContext('2d');

    const audioDest = setupAudioMixing();

    animFrameRef.current = requestAnimationFrame(drawFrame);

    const canvasStream = canvas.captureStream(30);
    const audioTracks = audioDest.stream.getAudioTracks();
    const combined = new MediaStream([...canvasStream.getVideoTracks(), ...audioTracks]);

    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')
      ? 'video/webm;codecs=vp9,opus'
      : 'video/webm';

    const recorder = new MediaRecorder(combined, { mimeType });
    recorderRef.current = recorder;
    chunksRef.current = [];

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };

    recorder.onstop = async () => {
      cancelAnimationFrame(animFrameRef.current);
      audioNodesRef.current?.sources.forEach((s) => s.disconnect());
      audioNodesRef.current?.context.close().catch(() => undefined);
      audioNodesRef.current = null;

      for (const video of videoElementsRef.current.values()) {
        video.srcObject = null;
        video.remove();
      }
      videoElementsRef.current.clear();
      canvasRef.current = null;
      ctxRef.current = null;

      if (chunksRef.current.length === 0) return;

      const blob = new Blob(chunksRef.current, { type: 'video/webm' });

      setIsUploading(true);
      try {
        await liveService.uploadRecording(sessionId, blob);
      } catch {
        // Upload failed — still download locally
      }
      setIsUploading(false);

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `edustream-live-${sessionId}.webm`;
      link.click();
      URL.revokeObjectURL(url);
    };

    recorder.start(1000);
    setIsRecording(true);
  }, [sessionId, drawFrame, setupAudioMixing]);

  const stopRecording = useCallback(() => {
    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      recorderRef.current.stop();
    }
    setIsRecording(false);
  }, []);

  const cleanup = useCallback(() => {
    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      recorderRef.current.stop();
    }
    cancelAnimationFrame(animFrameRef.current);
    audioNodesRef.current?.sources.forEach((s) => s.disconnect());
    audioNodesRef.current?.context.close().catch(() => undefined);
    audioNodesRef.current = null;
    for (const video of videoElementsRef.current.values()) {
      video.srcObject = null;
      video.remove();
    }
    videoElementsRef.current.clear();
    setIsRecording(false);
  }, []);

  return { isRecording, isUploading, startRecording, stopRecording, cleanup };
}
