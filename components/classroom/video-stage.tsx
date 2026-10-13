"use client";

import React, { useEffect, useRef, useState } from "react";
import { ClassroomParticipant } from "@/types/classroom";
import {
  CameraOff,
  Mic,
  MicOff,
  Monitor,
  Sparkles,
  User,
  AlertCircle,
  Volume2,
  StopCircle,
  Maximize2,
  Minimize2,
  LayoutGrid,
  SquareUser,
  Wifi,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface VideoStageProps {
  participants: ClassroomParticipant[];
  localStream: MediaStream | null;
  remoteStreams: Record<string, MediaStream>;
  screenStream: MediaStream | null;
  screenPresenterName?: string | null;
  isScreenSharing: boolean;
  isLocalScreenSharing: boolean;
  currentUserId: string;
  isTeacher: boolean;
  spotlightUserId?: string | null;
  activeSpeakerId?: string | null;
  permissionError?: string | null;
  autoplayBlocked?: boolean;
  onUnlockAutoplay?: () => void;
  onStopScreenShare?: () => void;
}

// Subcomponent for individual video element with safe autoplay
function ParticipantVideoElement({
  stream,
  muted = false,
  isMirrored = false,
  className = "w-full h-full object-cover",
  onAutoplayFailed,
}: {
  stream: MediaStream | null;
  muted?: boolean;
  isMirrored?: boolean;
  className?: string;
  onAutoplayFailed?: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (!stream) {
      if (video.srcObject) {
        video.srcObject = null;
      }
      return;
    }

    // Only assign if the stream reference changed to avoid flushing the hardware video decoder
    if (video.srcObject !== stream) {
      video.srcObject = stream;
    }

    if (video.paused) {
      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise.catch((err) => {
          if (err.name === "NotAllowedError" && !muted) {
            onAutoplayFailed?.();
          }
        });
      }
    }
  }, [stream, muted, onAutoplayFailed]);

  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      muted={muted}
      className={`${className} ${isMirrored ? "transform -scale-x-100" : ""}`}
    />
  );
}

// Subcomponent for remote participant audio playback
function RemoteAudioPlayer({
  peerId,
  stream,
  onAutoplayFailed,
}: {
  peerId: string;
  stream: MediaStream;
  onAutoplayFailed?: () => void;
}) {
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (!stream) {
      if (audio.srcObject) {
        audio.srcObject = null;
      }
      return;
    }

    // Only assign if stream changed to prevent audio crackles and drops
    if (audio.srcObject !== stream) {
      audio.srcObject = stream;
    }

    if (audio.paused) {
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch((err) => {
          if (err.name === "NotAllowedError") {
            onAutoplayFailed?.();
          }
        });
      }
    }
  }, [stream, onAutoplayFailed]);

  return <audio ref={audioRef} autoPlay playsInline />;
}

export function VideoStage({
  participants,
  localStream,
  remoteStreams,
  screenStream,
  screenPresenterName,
  isScreenSharing,
  isLocalScreenSharing,
  currentUserId,
  isTeacher,
  spotlightUserId,
  activeSpeakerId,
  permissionError,
  autoplayBlocked = false,
  onUnlockAutoplay,
  onStopScreenShare,
}: VideoStageProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [viewMode, setViewMode] = useState<"gallery" | "speaker">("gallery");
  const stageContainerRef = useRef<HTMLDivElement>(null);

  const toggleFullscreen = () => {
    if (!stageContainerRef.current) return;
    if (!document.fullscreenElement) {
      stageContainerRef.current.requestFullscreen?.().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.().catch(() => {});
      setIsFullscreen(false);
    }
  };

  // Helper to render a Zoom-style participant video tile
  const renderParticipantTile = (p: ClassroomParticipant, isProminent = false) => {
    const isMe = p.userId === currentUserId;
    const stream = isMe ? localStream : remoteStreams[p.userId] || null;
    const hasLiveVideoTrack =
      p.isCameraOn &&
      (stream?.getVideoTracks().some((t) => t.enabled && t.readyState === "live") ?? true);
    const isSpeaking = activeSpeakerId === p.userId;
    const isHost = p.role === "TEACHER";

    return (
      <div
        key={p.userId}
        className={`relative w-full h-full bg-[#12161f] rounded-2xl sm:rounded-3xl overflow-hidden flex items-center justify-center shadow-xl border transition-all duration-200 select-none ${
          isSpeaking
            ? "border-emerald-500 ring-2 ring-emerald-500/50 shadow-emerald-500/20"
            : isMe
            ? "border-slate-800/90"
            : "border-slate-800/80"
        }`}
      >
        {/* Real Live Video */}
        {stream && hasLiveVideoTrack ? (
          <ParticipantVideoElement
            stream={stream}
            muted={isMe}
            isMirrored={isMe}
            onAutoplayFailed={onUnlockAutoplay}
            className="w-full h-full object-cover"
          />
        ) : (
          /* Zoom-Style Camera Off Avatar */
          <div className="flex flex-col items-center justify-center gap-3 p-4 text-center">
            <div
              className={`w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-tr ${
                isHost ? "from-blue-600 to-indigo-600" : "from-slate-700 to-slate-800"
              } flex items-center justify-center text-white text-xl sm:text-2xl font-black shadow-lg transition-transform ${
                isSpeaking ? "ring-4 ring-emerald-400 scale-105" : ""
              }`}
            >
              {p.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex items-center gap-1.5 text-slate-400 text-xs font-semibold">
              <CameraOff className="h-3.5 w-3.5 text-slate-500" />
              <span>Camera Off</span>
            </div>
          </div>
        )}

        {/* Zoom-Style Bottom-Left Name Pill */}
        <div className="absolute bottom-2.5 left-2.5 sm:bottom-3 sm:left-3 bg-slate-950/85 backdrop-blur-md border border-slate-700/60 px-2 sm:px-2.5 py-1 rounded-xl text-xs font-semibold text-white flex items-center gap-1.5 z-10 shadow-lg pointer-events-none max-w-[85%]">
          {p.isMicOn ? (
            <Mic className="h-3.5 w-3.5 text-slate-300 shrink-0" />
          ) : (
            <span className="bg-red-500/90 p-0.5 rounded text-white shrink-0">
              <MicOff className="h-2.5 w-2.5" />
            </span>
          )}
          <span className="truncate max-w-[120px] sm:max-w-[160px] text-[11px] sm:text-xs">
            {p.name}
          </span>
          {isMe && <span className="text-[10px] text-slate-400 font-normal">(Me)</span>}
          {isHost && (
            <Badge variant="teacher" className="text-[9px] px-1 py-0 ml-0.5 bg-blue-600/80">
              Host
            </Badge>
          )}
        </div>

        {/* Speaking Pulsing Badge (Top Right) */}
        {isSpeaking && (
          <div className="absolute top-2.5 right-2.5 sm:top-3 sm:right-3 bg-emerald-500/90 text-white px-2.5 py-1 rounded-xl text-[10px] sm:text-xs font-bold flex items-center gap-1 animate-pulse shadow-md z-10">
            <Sparkles className="h-3 w-3" /> Speaking
          </div>
        )}
      </div>
    );
  };

  // Determine active speaker participant for Speaker View
  const activeSpeakerParticipant =
    participants.find((p) => p.userId === activeSpeakerId) ||
    participants.find((p) => p.role === "TEACHER") ||
    participants[0];

  const otherParticipants = participants.filter(
    (p) => p.userId !== activeSpeakerParticipant?.userId
  );

  return (
    <div
      ref={stageContainerRef}
      className="flex-1 bg-[#0b0f17] p-2 sm:p-3 flex flex-col gap-2 overflow-hidden relative select-none w-full min-h-0"
    >
      {/* Hidden Audio Elements for Remote Participants */}
      {Object.entries(remoteStreams).map(([peerId, stream]) => (
        <RemoteAudioPlayer
          key={peerId}
          peerId={peerId}
          stream={stream}
          onAutoplayFailed={onUnlockAutoplay}
        />
      ))}

      {/* Autoplay Blocked Notification Banner */}
      {autoplayBlocked && (
        <div className="bg-amber-500/20 border border-amber-500/50 rounded-2xl p-2.5 sm:p-3 flex items-center justify-between gap-3 text-amber-200 text-xs z-30 animate-pulse shadow-lg backdrop-blur-md">
          <div className="flex items-center gap-2">
            <Volume2 className="h-4 w-4 text-amber-400 shrink-0" />
            <span>Audio autoplay was restricted by your browser. Tap to enable classroom audio.</span>
          </div>
          <button
            type="button"
            onClick={onUnlockAutoplay}
            className="px-3 py-1 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl text-xs shrink-0 transition-colors shadow-md"
          >
            Enable Audio
          </button>
        </div>
      )}

      {/* Device Permission Error Banner */}
      {permissionError && (
        <div className="bg-red-500/20 border border-red-500/40 rounded-2xl p-2.5 sm:p-3 flex items-center gap-3 text-red-200 text-xs z-20">
          <AlertCircle className="h-4 w-4 text-red-400 shrink-0" />
          <span>{permissionError}</span>
        </div>
      )}

      {/* Top Floating View Switcher & Fullscreen Bar */}
      <div className="absolute top-3 right-3 sm:top-4 sm:right-4 z-20 flex items-center gap-1.5 bg-slate-950/75 backdrop-blur-md border border-slate-800 rounded-xl p-1 shadow-lg">
        {!isScreenSharing && (
          <>
            <button
              type="button"
              onClick={() => setViewMode("gallery")}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                viewMode === "gallery"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
              title="Zoom-style Gallery View"
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Gallery</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("speaker")}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                viewMode === "speaker"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
              title="Speaker View"
            >
              <SquareUser className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Speaker</span>
            </button>
          </>
        )}
        <button
          type="button"
          onClick={toggleFullscreen}
          className="p-1 rounded-lg text-slate-400 hover:text-white transition-colors"
          title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
        >
          {isFullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
        </button>
      </div>

      {/* 1. SCREEN SHARING VIEW */}
      {isScreenSharing && (
        <div className="relative flex-1 bg-black border border-slate-800 rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl flex flex-col min-h-0">
          <div className="relative flex-1 bg-black flex items-center justify-center overflow-hidden min-h-0">
            {screenStream && (
              <ParticipantVideoElement
                stream={screenStream}
                muted={isLocalScreenSharing}
                className="w-full h-full object-contain"
              />
            )}

            {/* Presenter Pill */}
            <div className="absolute top-3 left-3 bg-slate-950/90 backdrop-blur-md border border-slate-700/60 px-3 py-1.5 rounded-xl text-xs font-semibold text-emerald-400 flex items-center gap-2 z-10 shadow-lg">
              <Monitor className="h-4 w-4" />
              <span>
                {isLocalScreenSharing
                  ? "You are sharing your screen"
                  : `Viewing ${screenPresenterName || "Presenter"}'s screen`}
              </span>
            </div>

            {/* Stop Sharing Button (for Presenter) */}
            {isLocalScreenSharing && onStopScreenShare && (
              <button
                type="button"
                onClick={onStopScreenShare}
                className="absolute top-3 right-16 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xl transition-all z-10"
              >
                <StopCircle className="h-4 w-4" /> Stop Share
              </button>
            )}
          </div>

          {/* Floating Strip of Participants below screen share */}
          <div className="h-20 sm:h-24 bg-slate-950/95 border-t border-slate-800/80 p-1.5 sm:p-2 flex items-center gap-2 overflow-x-auto shrink-0 no-scrollbar">
            {participants.map((p) => {
              const isMe = p.userId === currentUserId;
              const stream = isMe ? localStream : remoteStreams[p.userId] || null;
              const hasVideo =
                p.isCameraOn &&
                (stream?.getVideoTracks().some((t) => t.enabled && t.readyState === "live") ?? true);

              return (
                <div
                  key={p.userId}
                  className="h-full aspect-video bg-slate-900 rounded-xl overflow-hidden relative border border-slate-800 shrink-0 flex items-center justify-center"
                >
                  {stream && hasVideo ? (
                    <ParticipantVideoElement
                      stream={stream}
                      muted={isMe}
                      isMirrored={isMe}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-white text-xs font-bold border border-slate-700">
                      {p.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <span className="absolute bottom-1 left-1 bg-slate-950/85 px-1 py-0.2 text-[9px] text-white rounded truncate max-w-[80px]">
                    {p.name} {isMe && "(You)"}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 2. GALLERY VIEW (Zoom-Style Grid) */}
      {!isScreenSharing && viewMode === "gallery" && (
        <div className="flex-1 min-h-0 w-full overflow-hidden flex items-center justify-center p-1">
          {participants.length === 1 ? (
            /* Single Participant */
            <div className="w-full h-full max-w-5xl">
              {renderParticipantTile(participants[0], true)}
            </div>
          ) : participants.length === 2 ? (
            /* 2 Participants: Side-by-Side on Desktop, Stacked on Mobile (50/50 Zoom Split) */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 sm:gap-3 w-full h-full">
              {participants.map((p) => (
                <div key={p.userId} className="w-full h-full min-h-0">
                  {renderParticipantTile(p, true)}
                </div>
              ))}
            </div>
          ) : participants.length <= 4 ? (
            /* 3-4 Participants: 2x2 Grid */
            <div className="grid grid-cols-2 gap-2 sm:gap-3 w-full h-full">
              {participants.map((p) => (
                <div key={p.userId} className="w-full h-full min-h-0">
                  {renderParticipantTile(p)}
                </div>
              ))}
            </div>
          ) : (
            /* 5+ Participants: Responsive Grid */
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 sm:gap-3 w-full h-full overflow-y-auto">
              {participants.map((p) => (
                <div key={p.userId} className="aspect-video w-full">
                  {renderParticipantTile(p)}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 3. SPEAKER VIEW (Main Spotlight + Filmstrip) */}
      {!isScreenSharing && viewMode === "speaker" && (
        <div className="flex-1 min-h-0 flex flex-col md:flex-row gap-2 sm:gap-3 overflow-hidden">
          {/* Main Speaker Stage */}
          <div className="flex-1 min-h-0 h-full">
            {activeSpeakerParticipant && renderParticipantTile(activeSpeakerParticipant, true)}
          </div>

          {/* Filmstrip of other participants */}
          {otherParticipants.length > 0 && (
            <div className="h-28 md:h-full md:w-64 flex md:flex-col gap-2 overflow-x-auto md:overflow-y-auto shrink-0 no-scrollbar">
              {otherParticipants.map((p) => (
                <div key={p.userId} className="h-full aspect-video md:h-auto md:w-full shrink-0">
                  {renderParticipantTile(p)}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
