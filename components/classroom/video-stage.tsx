"use client";

import React, { useEffect, useRef, useState } from "react";
import { ClassroomParticipant } from "@/types/classroom";
import {
  CameraOff,
  MicOff,
  Monitor,
  Sparkles,
  User,
  AlertCircle,
  Volume2,
  StopCircle,
  Maximize2,
  Minimize2,
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
    if (!video || !stream) return;

    video.srcObject = stream;
    const playPromise = video.play();
    if (playPromise !== undefined) {
      playPromise.catch((err) => {
        if (err.name === "NotAllowedError" && !muted) {
          onAutoplayFailed?.();
        }
      });
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
    if (!audio || !stream) return;

    audio.srcObject = stream;
    const playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise.catch((err) => {
        if (err.name === "NotAllowedError") {
          onAutoplayFailed?.();
        }
      });
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
  const stageContainerRef = useRef<HTMLDivElement>(null);

  const teacherParticipant = participants.find((p) => p.role === "TEACHER");
  const studentParticipants = participants.filter((p) => p.role === "STUDENT");

  // Determine teacher stream
  const teacherStream = isTeacher
    ? localStream
    : teacherParticipant
    ? remoteStreams[teacherParticipant.userId] || null
    : null;

  const isTeacherCameraActive = teacherParticipant
    ? teacherParticipant.isCameraOn && (teacherStream?.getVideoTracks().some((t) => t.enabled && t.readyState === "live") ?? true)
    : false;

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

  return (
    <div
      ref={stageContainerRef}
      className="flex-1 bg-slate-950 p-2 sm:p-4 flex flex-col gap-2 sm:gap-3 overflow-hidden relative select-none w-full min-h-0"
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

      {/* Autoplay blocked notification prompt */}
      {autoplayBlocked && (
        <div className="bg-amber-500/20 border border-amber-500/50 rounded-2xl p-2.5 sm:p-3 flex items-center justify-between gap-3 text-amber-200 text-xs z-30 animate-pulse shadow-lg backdrop-blur-md">
          <div className="flex items-center gap-2">
            <Volume2 className="h-4 w-4 text-amber-400 shrink-0" />
            <span>Audio autoplay was restricted by your browser. Tap to hear classroom audio.</span>
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

      {/* Permission Warning Banner */}
      {permissionError && (
        <div className="bg-red-500/20 border border-red-500/40 rounded-2xl p-2.5 sm:p-3 flex items-center gap-3 text-red-200 text-xs z-20">
          <AlertCircle className="h-4 w-4 text-red-400 shrink-0" />
          <span>{permissionError}</span>
        </div>
      )}

      {/* MAIN SCREEN SHARING VIEW */}
      {isScreenSharing && (
        <div className="relative flex-1 bg-slate-900 border border-slate-800 rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl flex flex-col min-h-0">
          <div className="relative flex-1 bg-black flex items-center justify-center overflow-hidden min-h-0">
            {screenStream && (
              <ParticipantVideoElement
                stream={screenStream}
                muted={isLocalScreenSharing}
                className="w-full h-full object-contain"
              />
            )}

            {/* Presenter Pill */}
            <div className="absolute top-2.5 left-2.5 sm:top-3 sm:left-3 bg-slate-950/85 backdrop-blur-md border border-slate-700/60 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-xl text-[11px] sm:text-xs font-semibold text-blue-400 flex items-center gap-1.5 sm:gap-2 z-10 shadow-lg">
              <Monitor className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span>
                {isLocalScreenSharing
                  ? "You are sharing your screen"
                  : `${screenPresenterName || "Presenter"} is sharing screen`}
              </span>
            </div>

            {/* Stop Sharing Button (for the local presenter) */}
            {isLocalScreenSharing && onStopScreenShare && (
              <button
                type="button"
                onClick={onStopScreenShare}
                className="absolute top-2.5 right-2.5 sm:top-3 sm:right-3 bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xl transition-all z-10 active:scale-95"
              >
                <StopCircle className="h-4 w-4" /> Stop Sharing
              </button>
            )}

            {/* Fullscreen Toggle */}
            <button
              type="button"
              onClick={toggleFullscreen}
              className="absolute bottom-2.5 right-2.5 bg-slate-950/80 hover:bg-slate-900 text-slate-300 p-1.5 rounded-lg border border-slate-700/50 transition-all z-10"
              title={isFullscreen ? "Exit Fullscreen" : "Fullscreen Stage"}
            >
              {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </button>
          </div>

          {/* Mini Participant Strip while screen sharing is active */}
          <div className="h-20 sm:h-24 bg-slate-950/90 border-t border-slate-800/80 p-1.5 sm:p-2 flex items-center gap-2 overflow-x-auto shrink-0 no-scrollbar">
            {/* Educator Mini Tile */}
            {teacherParticipant && (
              <div className="h-full aspect-video bg-slate-900 rounded-xl overflow-hidden relative border border-slate-800 shrink-0 flex items-center justify-center">
                {teacherStream && teacherParticipant.isCameraOn ? (
                  <ParticipantVideoElement
                    stream={teacherStream}
                    muted={isTeacher}
                    isMirrored={isTeacher}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold">
                    {teacherParticipant.name.charAt(0)}
                  </div>
                )}
                <span className="absolute bottom-1 left-1 bg-slate-950/80 px-1 py-0.2 text-[9px] text-white rounded">
                  {teacherParticipant.name} (Teacher)
                </span>
              </div>
            )}

            {/* Students Mini Tiles */}
            {studentParticipants.map((student) => {
              const isLocal = student.userId === currentUserId;
              const stream = isLocal ? localStream : remoteStreams[student.userId] || null;
              return (
                <div
                  key={student.userId}
                  className="h-full aspect-video bg-slate-900 rounded-xl overflow-hidden relative border border-slate-800 shrink-0 flex items-center justify-center"
                >
                  {stream && student.isCameraOn ? (
                    <ParticipantVideoElement
                      stream={stream}
                      muted={isLocal}
                      isMirrored={isLocal}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-200 text-xs font-bold border border-slate-700">
                      {student.name.charAt(0)}
                    </div>
                  )}
                  <span className="absolute bottom-1 left-1 bg-slate-950/80 px-1 py-0.2 text-[9px] text-white rounded truncate max-w-[80px]">
                    {student.name} {isLocal && "(You)"}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* NORMAL STAGE VIEW (When not screen sharing) */}
      {!isScreenSharing && (
        <div className="flex-1 flex flex-col lg:grid lg:grid-cols-12 gap-2 sm:gap-3 min-h-0 overflow-hidden">
          {/* Main Stage (Educator / Spotlight) */}
          <div
            className={`flex-1 lg:col-span-8 bg-slate-900 border rounded-2xl sm:rounded-3xl overflow-hidden relative flex items-center justify-center shadow-2xl min-h-0 transition-all ${
              activeSpeakerId === (teacherParticipant?.userId || (isTeacher ? currentUserId : null))
                ? "border-emerald-500/80 ring-2 ring-emerald-500/30"
                : "border-slate-800/80"
            }`}
          >
            {/* Real Camera Stream Active */}
            {teacherStream && isTeacherCameraActive ? (
              <ParticipantVideoElement
                stream={teacherStream}
                muted={isTeacher}
                isMirrored={isTeacher}
                onAutoplayFailed={onUnlockAutoplay}
                className="w-full h-full object-cover"
              />
            ) : (
              /* Camera Off Placeholder */
              <div className="flex flex-col items-center justify-center gap-2 sm:gap-4 text-slate-400 p-4 sm:p-6 text-center">
                <div
                  className={`w-16 h-16 sm:w-24 sm:h-24 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white text-2xl sm:text-3xl font-extrabold shadow-xl transition-transform ${
                    activeSpeakerId === (teacherParticipant?.userId || (isTeacher ? currentUserId : null))
                      ? "ring-4 ring-emerald-400 scale-105"
                      : ""
                  }`}
                >
                  {teacherParticipant ? teacherParticipant.name.charAt(0).toUpperCase() : "T"}
                </div>
                <div>
                  <h3 className="text-sm sm:text-lg font-bold text-white">
                    {teacherParticipant ? teacherParticipant.name : "Teacher"}
                  </h3>
                  <p className="text-[11px] sm:text-xs text-slate-400 flex items-center justify-center gap-1.5 mt-0.5">
                    <CameraOff className="h-3 w-3 text-slate-500" /> Camera Off
                  </p>
                </div>
              </div>
            )}

            {/* EduConnects Watermark Brand */}
            <div className="absolute top-2.5 left-2.5 sm:top-3.5 sm:left-3.5 bg-slate-950/80 backdrop-blur-md border border-slate-700/50 px-2.5 py-1 rounded-xl text-[10px] sm:text-xs font-bold text-white flex items-center gap-1.5 z-10 shadow-md">
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
              <span className="bg-gradient-to-r from-blue-400 to-indigo-300 bg-clip-text text-transparent font-black">
                EduConnects
              </span>
              <span className="text-[9px] sm:text-[10px] text-slate-400 font-semibold uppercase tracking-wider hidden xs:inline">
                Live
              </span>
            </div>

            {/* Teacher Details Overlay */}
            <div className="absolute bottom-2.5 left-2.5 sm:bottom-3.5 sm:left-3.5 bg-slate-950/85 backdrop-blur-md border border-slate-700/60 px-2.5 sm:px-3 py-1 rounded-xl text-xs font-bold text-white flex items-center gap-1.5 sm:gap-2 shadow-lg">
              <span className="truncate max-w-[140px] sm:max-w-[200px]">
                {teacherParticipant ? teacherParticipant.name : "Educator"}
                {isTeacher && " (You)"}
              </span>
              <Badge variant="teacher" className="text-[9px] sm:text-[10px] px-1.5 py-0">
                Educator
              </Badge>
            </div>

            {/* Speaking / Mute Badges on Teacher Tile */}
            <div className="absolute top-2.5 right-2.5 sm:top-3.5 sm:right-3.5 flex items-center gap-1.5 z-10">
              {teacherParticipant && !teacherParticipant.isMicOn && (
                <div className="bg-red-500/90 text-white p-1.5 rounded-xl shadow-md" title="Microphone Muted">
                  <MicOff className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </div>
              )}
              {activeSpeakerId === (teacherParticipant?.userId || (isTeacher ? currentUserId : null)) && (
                <div className="bg-emerald-500/90 text-white px-2.5 py-1 rounded-xl text-[10px] sm:text-xs font-bold flex items-center gap-1 animate-pulse shadow-md">
                  <Sparkles className="h-3 w-3 sm:h-3.5 sm:w-3.5" /> Speaking
                </div>
              )}
            </div>
          </div>

          {/* Student Participant Tiles Grid */}
          <div className="h-28 sm:h-36 lg:h-auto lg:col-span-4 flex lg:flex-col gap-2 overflow-x-auto lg:overflow-y-auto shrink-0 lg:shrink min-h-0 pr-0.5 no-scrollbar">
            {studentParticipants.length > 0 ? (
              studentParticipants.map((student) => {
                const isLocalStudent = student.userId === currentUserId;
                const stream = isLocalStudent ? localStream : remoteStreams[student.userId] || null;
                const isStudentCameraActive = student.isCameraOn && (stream?.getVideoTracks().some((t) => t.enabled && t.readyState === "live") ?? true);
                const isStudentSpeaking = activeSpeakerId === student.userId;

                return (
                  <div
                    key={student.userId}
                    className={`relative aspect-video h-full lg:h-auto lg:w-full bg-slate-900 border rounded-2xl overflow-hidden flex items-center justify-center shadow-md shrink-0 transition-all ${
                      isStudentSpeaking
                        ? "border-emerald-500 ring-2 ring-emerald-500/40"
                        : student.isSpotlighted
                        ? "border-amber-500 ring-2 ring-amber-500/30"
                        : "border-slate-800 hover:border-slate-700"
                    }`}
                  >
                    {/* Student Video Element */}
                    {stream && isStudentCameraActive ? (
                      <ParticipantVideoElement
                        stream={stream}
                        muted={isLocalStudent}
                        isMirrored={isLocalStudent}
                        onAutoplayFailed={onUnlockAutoplay}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      /* Student Camera Off Placeholder */
                      <div className="flex flex-col items-center justify-center gap-1.5 text-slate-400 p-2">
                        <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-slate-800 flex items-center justify-center text-slate-200 text-xs sm:text-sm font-bold border border-slate-700 shadow">
                          {student.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-[10px] sm:text-xs font-medium text-slate-300 truncate max-w-[100px]">
                          {student.name}
                        </span>
                      </div>
                    )}

                    {/* Participant Name Overlay */}
                    <div className="absolute bottom-1.5 left-1.5 right-1.5 flex items-center justify-between pointer-events-none z-10">
                      <span className="bg-slate-950/85 backdrop-blur-md px-1.5 py-0.5 rounded-lg text-[10px] font-medium text-slate-200 truncate max-w-[100px] shadow">
                        {student.name} {isLocalStudent && "(You)"}
                      </span>
                      <div className="flex items-center gap-1">
                        {!student.isMicOn && (
                          <span className="bg-red-500/90 p-1 rounded-md text-white shadow">
                            <MicOff className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                          </span>
                        )}
                        {!student.isCameraOn && (
                          <span className="bg-slate-800/90 p-1 rounded-md text-slate-300 shadow">
                            <CameraOff className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                          </span>
                        )}
                        {isStudentSpeaking && (
                          <span className="bg-emerald-500 p-1 rounded-md text-white shadow animate-pulse">
                            <Sparkles className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="w-full h-full bg-slate-900/50 border border-slate-800/60 rounded-2xl p-3 sm:p-6 flex flex-col items-center justify-center text-center gap-1.5 sm:gap-2 text-slate-500">
                <User className="h-6 w-6 sm:h-8 sm:w-8 text-slate-600" />
                <p className="text-[11px] sm:text-xs font-semibold text-slate-400">
                  {isTeacher ? "Waiting for learners to join..." : "Connecting to classroom..."}
                </p>
                <p className="text-[10px] text-slate-600 hidden sm:block">
                  Learners will appear here automatically
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
