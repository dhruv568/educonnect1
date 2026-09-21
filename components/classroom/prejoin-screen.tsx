"use client";

import React, { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Camera, CameraOff, Mic, MicOff, Volume2, Settings, ShieldCheck, Clock } from "lucide-react";
import { DeviceSelection, LiveSessionDetails } from "@/types/classroom";
import { BackButton } from "@/components/ui/back-button";
import { Logo } from "@/components/brand/logo";

interface PreJoinScreenProps {
  sessionDetails: LiveSessionDetails;
  userName: string;
  isTeacher: boolean;
  onJoin: (devices: DeviceSelection, isAudioOn: boolean, isVideoOn: boolean) => void;
}

export function PreJoinScreen({
  sessionDetails,
  userName,
  isTeacher,
  onJoin,
}: PreJoinScreenProps) {
  const [isAudioOn, setIsAudioOn] = useState(true);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [availableDevices, setAvailableDevices] = useState<{
    cameras: MediaDeviceInfo[];
    mics: MediaDeviceInfo[];
    speakers: MediaDeviceInfo[];
  }>({ cameras: [], mics: [], speakers: [] });
  const [selectedDevices, setSelectedDevices] = useState<DeviceSelection>({});
  const [audioLevel, setAudioLevel] = useState(0);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Check join window: allow joining 10 minutes before start time
  const scheduledStart = new Date(sessionDetails.scheduledStartAt).getTime();
  const now = Date.now();
  const minutesToStart = Math.ceil((scheduledStart - now) / (1000 * 60));
  const isEarly = !isTeacher && minutesToStart > 10;

  useEffect(() => {
    async function initPreview() {
      if (typeof window === "undefined" || !navigator.mediaDevices) return;

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: isVideoOn ? { width: 1280, height: 720 } : false,
          audio: isAudioOn,
        });

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }

        // Setup mic level meter
        if (isAudioOn && stream.getAudioTracks().length > 0) {
          setupAudioMeter(stream);
        }

        // List devices
        const devices = await navigator.mediaDevices.enumerateDevices();
        setAvailableDevices({
          cameras: devices.filter((d) => d.kind === "videoinput"),
          mics: devices.filter((d) => d.kind === "audioinput"),
          speakers: devices.filter((d) => d.kind === "audiooutput"),
        });

        setPermissionError(null);
      } catch (err: any) {
        console.warn("Pre-join stream acquisition warning:", err);
        if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
          setPermissionError(
            "Camera and microphone access is blocked. Please enable camera & mic permissions in your browser settings to join."
          );
        }
      }
    }

    initPreview();

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
      if (audioContextRef.current && audioContextRef.current.state !== "closed") {
        audioContextRef.current.close();
      }
    };
  }, [isAudioOn, isVideoOn]);

  const setupAudioMeter = (stream: MediaStream) => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;

      const audioCtx = new AudioCtx();
      audioContextRef.current = audioCtx;
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;
      source.connect(analyser);
      analyserRef.current = analyser;

      const updateLevel = () => {
        if (!analyserRef.current) return;
        const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(dataArray);

        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const avg = sum / dataArray.length;
        setAudioLevel(Math.min(100, Math.round((avg / 128) * 100)));

        animFrameRef.current = requestAnimationFrame(updateLevel);
      };

      updateLevel();
    } catch (e) {
      console.warn("Audio meter setup error:", e);
    }
  };

  const handleTestSpeaker = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(440, audioCtx.currentTime); // 440Hz tone
      gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.5);
    } catch (e) {
      console.warn("Audio test error:", e);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 md:p-8">
      <div className="max-w-4xl w-full space-y-6">
        <div className="flex items-center justify-between">
          <Logo
            variant="compact"
            size="sm"
            theme="dark"
            href="/"
            showTagline
            priority
          />
          <BackButton
            fallbackUrl={isTeacher ? "/teacher/live-classes" : "/student/live-classes"}
            label={isTeacher ? "Back to Live Classes" : "Back to Schedule"}
            variant="dark"
          />
        </div>

        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/30 px-3 py-1 rounded-full text-xs font-semibold text-blue-400">
            <ShieldCheck className="h-4 w-4" /> EduConnects Virtual Classroom Setup
          </div>
          <h1 className="text-2xl md:text-4xl font-extrabold text-white">
            {sessionDetails.title}
          </h1>
          <p className="text-sm text-slate-400">
            {sessionDetails.subject} • Educator: <span className="text-slate-200 font-medium">{sessionDetails.teacherName}</span>
          </p>
        </div>

        {/* Join Early Warning Notice */}
        {isEarly && (
          <div className="bg-amber-500/15 border border-amber-500/30 rounded-2xl p-4 flex items-center gap-3 text-amber-200 text-sm">
            <Clock className="h-5 w-5 shrink-0 text-amber-400" />
            <div>
              <p className="font-bold">This classroom isn't open yet.</p>
              <p className="text-xs text-amber-300/80">
                Your class starts in {minutesToStart} minutes. You can join 10 minutes before the start time.
              </p>
            </div>
          </div>
        )}

        {/* Permission Denied Warning Notice */}
        {permissionError && (
          <div className="bg-red-500/15 border border-red-500/30 rounded-2xl p-4 text-red-200 text-sm">
            <p className="font-bold">Camera/Microphone Access Blocked</p>
            <p className="text-xs text-red-300/80">{permissionError}</p>
          </div>
        )}

        {/* Main Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
          {/* Camera Preview Tile */}
          <div className="md:col-span-7 space-y-4">
            <div className="relative aspect-video bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex items-center justify-center">
              {isVideoOn ? (
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover transform -scale-x-100"
                />
              ) : (
                <div className="flex flex-col items-center justify-center gap-3 text-slate-500">
                  <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center text-slate-400">
                    <CameraOff className="h-8 w-8" />
                  </div>
                  <span className="text-xs font-semibold">Camera is Turned Off</span>
                </div>
              )}

              {/* Name Tag Badge */}
              <div className="absolute bottom-3 left-3 bg-slate-950/80 backdrop-blur-md border border-slate-700/50 px-3 py-1.5 rounded-xl text-xs font-medium text-slate-200">
                {userName} {isTeacher && <Badge variant="teacher" className="ml-1 text-[10px]">Teacher</Badge>}
              </div>

              {/* Toggle Quick Buttons */}
              <div className="absolute bottom-3 right-3 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsAudioOn(!isAudioOn)}
                  className={`p-2.5 rounded-full transition-all ${
                    isAudioOn ? "bg-slate-800 hover:bg-slate-700 text-white" : "bg-red-500 hover:bg-red-600 text-white"
                  }`}
                  title={isAudioOn ? "Mute Microphone" : "Unmute Microphone"}
                >
                  {isAudioOn ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
                </button>
                <button
                  type="button"
                  onClick={() => setIsVideoOn(!isVideoOn)}
                  className={`p-2.5 rounded-full transition-all ${
                    isVideoOn ? "bg-slate-800 hover:bg-slate-700 text-white" : "bg-red-500 hover:bg-red-600 text-white"
                  }`}
                  title={isVideoOn ? "Turn Camera Off" : "Turn Camera On"}
                >
                  {isVideoOn ? <Camera className="h-4 w-4" /> : <CameraOff className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Audio Level Meter */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-3 flex items-center gap-3">
              <Mic className="h-4 w-4 text-emerald-400 shrink-0" />
              <div className="flex-1 space-y-1">
                <div className="flex justify-between text-xs text-slate-400 font-medium">
                  <span>Microphone Input Level</span>
                  <span>{isAudioOn ? `${audioLevel}%` : "Muted"}</span>
                </div>
                <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 transition-all duration-75"
                    style={{ width: `${isAudioOn ? audioLevel : 0}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Device Controls Card */}
          <div className="md:col-span-5 bg-slate-900/70 border border-slate-800/80 rounded-3xl p-5 space-y-5">
            <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
              <Settings className="h-4 w-4 text-blue-400" /> Device Setup
            </h3>

            {/* Camera Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
                <Camera className="h-3.5 w-3.5 text-blue-400" /> Camera
              </label>
              <select
                className="w-full h-10 px-3 text-xs bg-slate-800 border border-slate-700 rounded-xl text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={selectedDevices.cameraId || ""}
                onChange={(e) => setSelectedDevices({ ...selectedDevices, cameraId: e.target.value })}
              >
                {availableDevices.cameras.map((device, idx) => (
                  <option key={device.deviceId} value={device.deviceId}>
                    {device.label || `Camera ${idx + 1}`}
                  </option>
                ))}
              </select>
            </div>

            {/* Microphone Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
                <Mic className="h-3.5 w-3.5 text-emerald-400" /> Microphone
              </label>
              <select
                className="w-full h-10 px-3 text-xs bg-slate-800 border border-slate-700 rounded-xl text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={selectedDevices.microphoneId || ""}
                onChange={(e) => setSelectedDevices({ ...selectedDevices, microphoneId: e.target.value })}
              >
                {availableDevices.mics.map((device, idx) => (
                  <option key={device.deviceId} value={device.deviceId}>
                    {device.label || `Microphone ${idx + 1}`}
                  </option>
                ))}
              </select>
            </div>

            {/* Speaker Selector & Test Tone */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
                  <Volume2 className="h-3.5 w-3.5 text-purple-400" /> Speaker
                </label>
                <button
                  type="button"
                  onClick={handleTestSpeaker}
                  className="text-[11px] font-semibold text-purple-400 hover:text-purple-300 underline"
                >
                  Test Sound
                </button>
              </div>
              <select
                className="w-full h-10 px-3 text-xs bg-slate-800 border border-slate-700 rounded-xl text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={selectedDevices.speakerId || ""}
                onChange={(e) => setSelectedDevices({ ...selectedDevices, speakerId: e.target.value })}
              >
                {availableDevices.speakers.length > 0 ? (
                  availableDevices.speakers.map((device, idx) => (
                    <option key={device.deviceId} value={device.deviceId}>
                      {device.label || `Speaker ${idx + 1}`}
                    </option>
                  ))
                ) : (
                  <option value="">Default System Speaker</option>
                )}
              </select>
            </div>

            {/* Join Action Button */}
            <Button
              disabled={isEarly}
              onClick={() => onJoin(selectedDevices, isAudioOn, isVideoOn)}
              className="w-full h-12 text-sm font-bold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-2xl shadow-lg shadow-blue-500/20 transition-all"
            >
              {isTeacher ? "Start Live Class" : "Join Classroom"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
