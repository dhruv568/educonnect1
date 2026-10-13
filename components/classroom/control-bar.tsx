"use client";

import React, { useState } from "react";
import {
  Mic,
  MicOff,
  Camera,
  CameraOff,
  Monitor,
  MessageSquare,
  PenTool,
  Folder,
  Users,
  Settings,
  PhoneOff,
  LogOut,
  MoreVertical,
  Loader2,
  AlertCircle,
  X,
  ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface ControlBarProps {
  isTeacher: boolean;
  isAudioOn: boolean;
  isVideoOn: boolean;
  isScreenSharing: boolean;
  activeDrawer: "participants" | "chat" | "whiteboard" | "files" | null;
  unreadCount: number;
  participantCount?: number;
  onToggleAudio: () => Promise<void> | void;
  onToggleVideo: () => Promise<void> | void;
  onToggleScreenShare: () => Promise<void> | void;
  onToggleDrawer: (drawer: "participants" | "chat" | "whiteboard" | "files") => void;
  onOpenSettings: () => void;
  onLeaveClass: () => void;
  onEndClass: () => void;
}

export function ControlBar({
  isTeacher,
  isAudioOn,
  isVideoOn,
  isScreenSharing,
  activeDrawer,
  unreadCount,
  participantCount = 1,
  onToggleAudio,
  onToggleVideo,
  onToggleScreenShare,
  onToggleDrawer,
  onOpenSettings,
  onLeaveClass,
  onEndClass,
}: ControlBarProps) {
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showMobileMore, setShowMobileMore] = useState(false);
  const [screenShareNotice, setScreenShareNotice] = useState<string | null>(null);

  // Anti-double-click loading states
  const [isAudioLoading, setIsAudioLoading] = useState(false);
  const [isVideoLoading, setIsVideoLoading] = useState(false);
  const [isScreenLoading, setIsScreenLoading] = useState(false);

  // Check if browser supports screen sharing
  const isDisplayMediaSupported =
    typeof window !== "undefined" &&
    typeof navigator !== "undefined" &&
    !!navigator.mediaDevices?.getDisplayMedia;

  const handleAudioClick = async () => {
    if (isAudioLoading) return;
    setIsAudioLoading(true);
    try {
      await onToggleAudio();
    } finally {
      setIsAudioLoading(false);
    }
  };

  const handleVideoClick = async () => {
    if (isVideoLoading) return;
    setIsVideoLoading(true);
    try {
      await onToggleVideo();
    } finally {
      setIsVideoLoading(false);
    }
  };

  const handleScreenShareClick = async () => {
    if (isScreenLoading) return;

    if (!isDisplayMediaSupported && !isScreenSharing) {
      setScreenShareNotice(
        "Screen sharing is not supported by mobile web browsers on iOS/Android. You can view screens shared by the educator or desktop participants."
      );
      return;
    }

    setIsScreenLoading(true);
    try {
      await onToggleScreenShare();
    } catch (err: any) {
      setScreenShareNotice(err.message || "Failed to start screen share.");
    } finally {
      setIsScreenLoading(false);
    }
  };

  return (
    <>
      <footer className="bg-[#12161f] border-t border-slate-800/90 px-2 sm:px-4 md:px-6 py-2 sm:py-2.5 flex items-center justify-between gap-1 sm:gap-3 backdrop-blur-xl sticky bottom-0 z-30 pb-[max(0.5rem,env(safe-area-inset-bottom))] select-none">
        {/* LEFT: Audio & Video Media Controls */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          {/* Mic Button */}
          <button
            type="button"
            disabled={isAudioLoading}
            onClick={handleAudioClick}
            className={`min-w-[42px] h-[42px] sm:min-w-[46px] sm:h-[46px] px-2.5 sm:px-3 rounded-xl flex items-center justify-center gap-1.5 transition-all touch-manipulation select-none ${
              isAudioLoading
                ? "bg-slate-800/60 text-slate-400 cursor-wait"
                : isAudioOn
                ? "bg-slate-800/90 hover:bg-slate-700 active:bg-slate-600 text-slate-100 border border-slate-700/60 shadow-sm"
                : "bg-red-600 hover:bg-red-700 active:bg-red-800 text-white shadow-md shadow-red-600/30"
            }`}
            title={isAudioOn ? "Mute Microphone" : "Unmute Microphone"}
            aria-label={isAudioOn ? "Mute Microphone" : "Unmute Microphone"}
          >
            {isAudioLoading ? (
              <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 animate-spin" />
            ) : isAudioOn ? (
              <Mic className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-400" />
            ) : (
              <MicOff className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
            )}
            <span className="text-[11px] font-semibold hidden md:inline">
              {isAudioOn ? "Mute" : "Unmute"}
            </span>
          </button>

          {/* Camera Button */}
          <button
            type="button"
            disabled={isVideoLoading}
            onClick={handleVideoClick}
            className={`min-w-[42px] h-[42px] sm:min-w-[46px] sm:h-[46px] px-2.5 sm:px-3 rounded-xl flex items-center justify-center gap-1.5 transition-all touch-manipulation select-none ${
              isVideoLoading
                ? "bg-slate-800/60 text-slate-400 cursor-wait"
                : isVideoOn
                ? "bg-slate-800/90 hover:bg-slate-700 active:bg-slate-600 text-slate-100 border border-slate-700/60 shadow-sm"
                : "bg-red-600 hover:bg-red-700 active:bg-red-800 text-white shadow-md shadow-red-600/30"
            }`}
            title={isVideoOn ? "Stop Video" : "Start Video"}
            aria-label={isVideoOn ? "Stop Video" : "Start Video"}
          >
            {isVideoLoading ? (
              <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 animate-spin" />
            ) : isVideoOn ? (
              <Camera className="h-4 w-4 sm:h-5 sm:w-5 text-blue-400" />
            ) : (
              <CameraOff className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
            )}
            <span className="text-[11px] font-semibold hidden md:inline">
              {isVideoOn ? "Stop Video" : "Start Video"}
            </span>
          </button>
        </div>

        {/* CENTER: Meeting Collaboration Tools (Zoom-style green Share Screen & feature buttons) */}
        <div className="flex items-center gap-1 sm:gap-2">
          {/* Zoom Signature Green Screen Share Button */}
          <button
            type="button"
            disabled={isScreenLoading}
            onClick={handleScreenShareClick}
            className={`min-w-[42px] h-[42px] sm:h-[46px] px-2.5 sm:px-3.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all touch-manipulation select-none ${
              isScreenLoading
                ? "bg-emerald-800/50 text-slate-300 cursor-wait"
                : isScreenSharing
                ? "bg-red-600 hover:bg-red-700 text-white shadow-md shadow-red-600/30"
                : "bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white shadow-md shadow-emerald-600/30"
            }`}
            title={isScreenSharing ? "Stop Screen Share" : "Share Screen"}
            aria-label={isScreenSharing ? "Stop Screen Share" : "Share Screen"}
          >
            {isScreenLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Monitor className="h-4 w-4 shrink-0" />
            )}
            <span className="hidden sm:inline">
              {isScreenSharing ? "Stop Share" : "Share Screen"}
            </span>
          </button>

          {/* Participants Button (with live synchronized count badge) */}
          <button
            type="button"
            onClick={() => onToggleDrawer("participants")}
            className={`min-w-[42px] h-[42px] sm:h-[46px] px-2.5 sm:px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all touch-manipulation relative select-none ${
              activeDrawer === "participants"
                ? "bg-blue-600 text-white shadow-sm"
                : "bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700/60"
            }`}
            title="Meeting Participants"
            aria-label="Meeting Participants"
          >
            <Users className="h-4 w-4 shrink-0" />
            <span className="hidden md:inline">Participants</span>
            <span className="text-[10px] font-black bg-blue-500/30 text-blue-300 border border-blue-400/30 px-1.5 py-0.2 rounded-md">
              {participantCount}
            </span>
          </button>

          {/* Chat Button (with unread count badge) */}
          <button
            type="button"
            onClick={() => onToggleDrawer("chat")}
            className={`min-w-[42px] h-[42px] sm:h-[46px] px-2.5 sm:px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all touch-manipulation relative select-none ${
              activeDrawer === "chat"
                ? "bg-blue-600 text-white shadow-sm"
                : "bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700/60"
            }`}
            title="Meeting Chat"
            aria-label="Meeting Chat"
          >
            <MessageSquare className="h-4 w-4 shrink-0" />
            <span className="hidden md:inline">Chat</span>
            {unreadCount > 0 && activeDrawer !== "chat" && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-extrabold w-4 h-4 rounded-full flex items-center justify-center animate-pulse shadow-md">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>

          {/* Whiteboard (Desktop) */}
          <button
            type="button"
            onClick={() => onToggleDrawer("whiteboard")}
            className={`hidden sm:flex h-[42px] sm:h-[46px] px-3 rounded-xl text-xs font-semibold items-center justify-center gap-1.5 transition-all touch-manipulation select-none ${
              activeDrawer === "whiteboard"
                ? "bg-blue-600 text-white shadow-sm"
                : "bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700/60"
            }`}
            title="Interactive Whiteboard"
          >
            <PenTool className="h-4 w-4 shrink-0" />
            <span className="hidden lg:inline">Whiteboard</span>
          </button>

          {/* Files (Desktop) */}
          <button
            type="button"
            onClick={() => onToggleDrawer("files")}
            className={`hidden sm:flex h-[42px] sm:h-[46px] px-3 rounded-xl text-xs font-semibold items-center justify-center gap-1.5 transition-all touch-manipulation select-none ${
              activeDrawer === "files"
                ? "bg-blue-600 text-white shadow-sm"
                : "bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700/60"
            }`}
            title="Shared Files"
          >
            <Folder className="h-4 w-4 shrink-0" />
            <span className="hidden lg:inline">Files</span>
          </button>

          {/* Mobile "More" Button */}
          <button
            type="button"
            onClick={() => setShowMobileMore(!showMobileMore)}
            className={`sm:hidden min-w-[42px] h-[42px] rounded-xl flex items-center justify-center transition-all touch-manipulation ${
              showMobileMore
                ? "bg-blue-600 text-white"
                : "bg-slate-800/80 text-slate-300 border border-slate-700/60"
            }`}
            title="More Options"
            aria-label="More Options"
          >
            <MoreVertical className="h-4 w-4" />
          </button>
        </div>

        {/* RIGHT: Settings & End/Leave Group */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          {/* Settings button (Desktop) */}
          <button
            type="button"
            onClick={onOpenSettings}
            className="hidden sm:flex min-w-[42px] h-[42px] sm:min-w-[46px] sm:h-[46px] rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700/60 items-center justify-center transition-all touch-manipulation"
            title="Meeting Audio/Video Settings"
            aria-label="Meeting Settings"
          >
            <Settings className="h-4 w-4" />
          </button>

          {/* Zoom-Style Red Leave / End Meeting Button */}
          {isTeacher ? (
            <Button
              onClick={() => setShowConfirmModal(true)}
              className="bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-extrabold text-xs h-[42px] sm:h-[46px] px-3 sm:px-4 rounded-xl shadow-md shadow-red-600/30 transition-all touch-manipulation"
            >
              <PhoneOff className="h-4 w-4 mr-1 sm:mr-1.5 shrink-0" />
              <span className="hidden sm:inline">End Meeting</span>
              <span className="sm:hidden">End</span>
            </Button>
          ) : (
            <Button
              onClick={() => setShowConfirmModal(true)}
              className="bg-red-600/90 hover:bg-red-600 text-white font-extrabold text-xs h-[42px] sm:h-[46px] px-3 sm:px-4 rounded-xl border border-red-500/40 shadow-sm shadow-red-900/30 transition-all touch-manipulation"
            >
              <LogOut className="h-4 w-4 mr-1 sm:mr-1.5 shrink-0" />
              <span>Leave</span>
            </Button>
          )}
        </div>
      </footer>

      {/* Mobile "More" Sheet */}
      {showMobileMore && (
        <div className="sm:hidden fixed inset-x-0 bottom-16 bg-[#161b26] border-t border-slate-800 p-4 rounded-t-3xl shadow-2xl z-40 space-y-3 backdrop-blur-xl animate-in slide-in-from-bottom-5">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Meeting Tools
            </span>
            <button
              type="button"
              onClick={() => setShowMobileMore(false)}
              className="p-1 rounded-lg text-slate-400 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => {
                setShowMobileMore(false);
                onToggleDrawer("whiteboard");
              }}
              className={`p-3 rounded-2xl flex flex-col items-center justify-center gap-1.5 text-xs font-semibold border transition-all ${
                activeDrawer === "whiteboard"
                  ? "bg-blue-600 text-white border-blue-500"
                  : "bg-slate-800 text-slate-200 border-slate-700/60"
              }`}
            >
              <PenTool className="h-5 w-5" />
              <span>Whiteboard</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setShowMobileMore(false);
                onToggleDrawer("files");
              }}
              className={`p-3 rounded-2xl flex flex-col items-center justify-center gap-1.5 text-xs font-semibold border transition-all ${
                activeDrawer === "files"
                  ? "bg-blue-600 text-white border-blue-500"
                  : "bg-slate-800 text-slate-200 border-slate-700/60"
              }`}
            >
              <Folder className="h-5 w-5" />
              <span>Files</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setShowMobileMore(false);
                onOpenSettings();
              }}
              className="p-3 rounded-2xl flex flex-col items-center justify-center gap-1.5 text-xs font-semibold bg-slate-800 text-slate-200 border border-slate-700/60"
            >
              <Settings className="h-5 w-5" />
              <span>Settings</span>
            </button>
          </div>
        </div>
      )}

      {/* Screen Sharing Mobile Notice */}
      {screenShareNotice && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[#161b26] border border-slate-800 rounded-3xl p-5 sm:p-6 max-w-sm w-full space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-amber-400">
              <AlertCircle className="h-6 w-6 shrink-0" />
              <h4 className="text-sm font-bold text-white">Screen Sharing Notice</h4>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">{screenShareNotice}</p>
            <div className="flex justify-end pt-1">
              <Button
                onClick={() => setScreenShareNotice(null)}
                className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl h-9 px-4"
              >
                Understood
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Zoom-Style Leave / End Confirmation Dialog */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[#161b26] border border-slate-800 rounded-3xl p-5 sm:p-6 max-w-md w-full space-y-4 shadow-2xl">
            <h3 className="text-base sm:text-lg font-extrabold text-white">
              {isTeacher ? "End meeting for all participants?" : "Leave this meeting?"}
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              {isTeacher
                ? "Ending the meeting will disconnect all participants and record attendance."
                : "You can rejoin this meeting anytime while it remains active."}
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <Button
                variant="outline"
                onClick={() => setShowConfirmModal(false)}
                className="bg-slate-800 border-slate-700 text-slate-300 text-xs rounded-xl h-10 px-4"
              >
                Cancel
              </Button>

              {isTeacher ? (
                <Button
                  onClick={() => {
                    setShowConfirmModal(false);
                    onEndClass();
                  }}
                  className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl h-10 px-4 shadow-lg shadow-red-600/30"
                >
                  End Meeting for All
                </Button>
              ) : (
                <Button
                  onClick={() => {
                    setShowConfirmModal(false);
                    onLeaveClass();
                  }}
                  className="bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-xl h-10 px-4 shadow-lg shadow-red-600/30"
                >
                  Leave Meeting
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
