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
  onToggleAudio: () => void;
  onToggleVideo: () => void;
  onToggleScreenShare: () => void;
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
  onToggleAudio,
  onToggleVideo,
  onToggleScreenShare,
  onToggleDrawer,
  onOpenSettings,
  onLeaveClass,
  onEndClass,
}: ControlBarProps) {
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  return (
    <>
      <footer className="h-16 sm:h-20 bg-slate-950/95 border-t border-slate-800 px-2 sm:px-4 md:px-8 flex items-center justify-between gap-1 sm:gap-2 backdrop-blur-lg sticky bottom-0 z-30 overflow-x-auto no-scrollbar">
        {/* Media Controls Group */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          {/* Mic Button */}
          <button
            type="button"
            onClick={onToggleAudio}
            className={`p-2 sm:p-3 rounded-xl sm:rounded-2xl flex items-center justify-center transition-all ${
              isAudioOn
                ? "bg-slate-800 hover:bg-slate-700 text-slate-100"
                : "bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/20"
            }`}
            title={isAudioOn ? "Mute Microphone" : "Unmute Microphone"}
          >
            {isAudioOn ? <Mic className="h-4 w-4 sm:h-5 sm:w-5" /> : <MicOff className="h-4 w-4 sm:h-5 sm:w-5" />}
          </button>

          {/* Camera Button */}
          <button
            type="button"
            onClick={onToggleVideo}
            className={`p-2 sm:p-3 rounded-xl sm:rounded-2xl flex items-center justify-center transition-all ${
              isVideoOn
                ? "bg-slate-800 hover:bg-slate-700 text-slate-100"
                : "bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/20"
            }`}
            title={isVideoOn ? "Turn Camera Off" : "Turn Camera On"}
          >
            {isVideoOn ? <Camera className="h-4 w-4 sm:h-5 sm:w-5" /> : <CameraOff className="h-4 w-4 sm:h-5 sm:w-5" />}
          </button>

          {/* Screen Share Button */}
          <button
            type="button"
            onClick={onToggleScreenShare}
            className={`p-2 sm:p-3 rounded-xl sm:rounded-2xl flex items-center justify-center transition-all ${
              isScreenSharing
                ? "bg-blue-600 text-white shadow-lg shadow-blue-500/30"
                : "bg-slate-800 hover:bg-slate-700 text-slate-100"
            }`}
            title={isScreenSharing ? "Stop Sharing Screen" : "Share Screen"}
          >
            <Monitor className="h-4 w-4 sm:h-5 sm:w-5" />
          </button>
        </div>

        {/* Feature Drawers Group */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          {/* Participants */}
          <button
            type="button"
            onClick={() => onToggleDrawer("participants")}
            className={`px-2.5 sm:px-3 py-2 sm:py-2.5 rounded-xl sm:rounded-2xl text-xs font-semibold flex items-center gap-1.5 sm:gap-2 transition-all ${
              activeDrawer === "participants"
                ? "bg-blue-600 text-white"
                : "bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800"
            }`}
          >
            <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Participants</span>
          </button>

          {/* Chat */}
          <button
            type="button"
            onClick={() => onToggleDrawer("chat")}
            className={`px-2.5 sm:px-3 py-2 sm:py-2.5 rounded-xl sm:rounded-2xl text-xs font-semibold flex items-center gap-1.5 sm:gap-2 relative transition-all ${
              activeDrawer === "chat"
                ? "bg-blue-600 text-white"
                : "bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800"
            }`}
          >
            <MessageSquare className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Chat</span>
            {unreadCount > 0 && activeDrawer !== "chat" && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>

          {/* Whiteboard */}
          <button
            type="button"
            onClick={() => onToggleDrawer("whiteboard")}
            className={`px-2.5 sm:px-3 py-2 sm:py-2.5 rounded-xl sm:rounded-2xl text-xs font-semibold flex items-center gap-1.5 sm:gap-2 transition-all ${
              activeDrawer === "whiteboard"
                ? "bg-blue-600 text-white"
                : "bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800"
            }`}
          >
            <PenTool className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Whiteboard</span>
          </button>

          {/* Files */}
          <button
            type="button"
            onClick={() => onToggleDrawer("files")}
            className={`px-2.5 sm:px-3 py-2 sm:py-2.5 rounded-xl sm:rounded-2xl text-xs font-semibold flex items-center gap-1.5 sm:gap-2 transition-all ${
              activeDrawer === "files"
                ? "bg-blue-600 text-white"
                : "bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800"
            }`}
          >
            <Folder className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Files</span>
          </button>
        </div>

        {/* Right Settings & Action Group */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Settings button */}
          <button
            type="button"
            onClick={onOpenSettings}
            className="p-2 sm:p-3 rounded-xl sm:rounded-2xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 transition-all"
            title="Audio/Video Settings"
          >
            <Settings className="h-4 w-4 sm:h-5 sm:w-5" />
          </button>

          {/* End Class / Leave Class Button */}
          {isTeacher ? (
            <Button
              onClick={() => setShowConfirmModal(true)}
              className="bg-red-600 hover:bg-red-700 text-white font-bold text-xs h-9 sm:h-11 px-2.5 sm:px-4 rounded-xl sm:rounded-2xl shadow-lg shadow-red-600/20"
            >
              <PhoneOff className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1 sm:mr-1.5" /> <span className="hidden xs:inline">End Class</span><span className="xs:hidden">End</span>
            </Button>
          ) : (
            <Button
              onClick={() => setShowConfirmModal(true)}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs h-9 sm:h-11 px-2.5 sm:px-4 rounded-xl sm:rounded-2xl border border-slate-700"
            >
              <LogOut className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1 sm:mr-1.5" /> Leave
            </Button>
          )}
        </div>
      </footer>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <h3 className="text-lg font-extrabold text-white">
              {isTeacher ? "End this live class?" : "Leave classroom?"}
            </h3>
            <p className="text-xs text-slate-400">
              {isTeacher
                ? "Ending the class will disconnect all active participants and finalize attendance reports."
                : "Are you sure you want to leave the classroom? You can rejoin anytime while the class is live."}
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => setShowConfirmModal(false)}
                className="bg-slate-800 border-slate-700 text-slate-300 text-xs rounded-xl"
              >
                Cancel
              </Button>

              {isTeacher ? (
                <Button
                  onClick={() => {
                    setShowConfirmModal(false);
                    onEndClass();
                  }}
                  className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl"
                >
                  End Class Now
                </Button>
              ) : (
                <Button
                  onClick={() => {
                    setShowConfirmModal(false);
                    onLeaveClass();
                  }}
                  className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl"
                >
                  Leave Classroom
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
