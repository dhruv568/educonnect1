"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { PreJoinScreen } from "@/components/classroom/prejoin-screen";
import { ClassroomHeader } from "@/components/classroom/classroom-header";
import { VideoStage } from "@/components/classroom/video-stage";
import { ControlBar } from "@/components/classroom/control-bar";
import { ParticipantsPanel } from "@/components/classroom/participants-panel";
import { ChatPanel } from "@/components/classroom/chat-panel";
import { WhiteboardPanel } from "@/components/classroom/whiteboard-panel";
import { FilesPanel } from "@/components/classroom/files-panel";
import { SettingsModal } from "@/components/classroom/settings-modal";
import { ClassSummary } from "@/components/classroom/class-summary";
import { WebRTCAdapter } from "@/lib/classroom/webrtc-adapter";
import {
  ClassroomFileItem,
  ClassroomMessageItem,
  ClassroomParticipant,
  ConnectionQuality,
  DeviceSelection,
  LiveSessionDetails,
  WhiteboardElement,
} from "@/types/classroom";
import { LoadingSkeleton } from "@/components/shared/loading-skeleton";

export default function VirtualClassroomPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.sessionId as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sessionDetails, setSessionDetails] = useState<LiveSessionDetails | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [currentUserName, setCurrentUserName] = useState<string>("");
  const [isTeacher, setIsTeacher] = useState<boolean>(false);
  const [hasJoined, setHasJoined] = useState(false);

  // LiveKit connection state
  const [livekitToken, setLivekitToken] = useState<string>("");
  const [livekitServerUrl, setLivekitServerUrl] = useState<string>("");

  // Media states
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<Record<string, MediaStream>>({});
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const [screenPresenterName, setScreenPresenterName] = useState<string | null>(null);
  const [isAudioOn, setIsAudioOn] = useState(true);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isLocalScreenSharing, setIsLocalScreenSharing] = useState(false);
  const [connectionQuality, setConnectionQuality] = useState<ConnectionQuality>("CONNECTING");
  const [activeSpeakerId, setActiveSpeakerId] = useState<string | null>(null);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [autoplayBlocked, setAutoplayBlocked] = useState(false);

  // Drawers & Modals
  const [activeDrawer, setActiveDrawer] = useState<"participants" | "chat" | "whiteboard" | "files" | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Room data
  const [participants, setParticipants] = useState<ClassroomParticipant[]>([]);
  const [messages, setMessages] = useState<ClassroomMessageItem[]>([]);
  const [files, setFiles] = useState<ClassroomFileItem[]>([]);
  const [whiteboardElements, setWhiteboardElements] = useState<WhiteboardElement[]>([]);
  const [studentCanDraw, setStudentCanDraw] = useState(false);

  // Post-Class Summary Data
  const [isClassEnded, setIsClassEnded] = useState(false);
  const [summaryData, setSummaryData] = useState<any>(null);

  const providerRef = useRef<WebRTCAdapter | null>(null);
  const heartbeatTimerRef = useRef<NodeJS.Timeout | null>(null);
  const pollTimerRef = useRef<NodeJS.Timeout | null>(null);

  // 1. Initial Session Load
  useEffect(() => {
    async function loadSession() {
      try {
        setLoading(true);
        const res = await fetch(`/api/classroom/${sessionId}`);
        if (res.status === 401) {
          const returnDestination = `/classroom/${sessionId}`;
          window.location.replace(`/student/login?returnTo=${encodeURIComponent(returnDestination)}&redirectTo=${encodeURIComponent(returnDestination)}`);
          return;
        }
        const data = await res.json();

        if (!data.success) {
          const reason = data.error || data.data?.reason || "Failed to load classroom session.";
          if (data.data?.requiresBooking || reason.includes("booking") || reason.includes("book") || reason.includes("not have a confirmed booking")) {
            const targetId = data.data?.sessionDetails?.liveClassSlotId || data.data?.sessionDetails?.id || sessionId;
            window.location.replace(`/live-class/${targetId}`);
            return;
          }
          setError(reason);
          if (data.data?.sessionDetails) {
            setSessionDetails(data.data.sessionDetails);
          }
          return;
        }

        setSessionDetails(data.data.sessionDetails);
        setIsTeacher(data.data.userPermissions.isTeacher);
        setStudentCanDraw(data.data.sessionDetails.studentCanDraw);

        if (data.data.sessionDetails.status === "ENDED") {
          setIsClassEnded(true);
        }

        // Fetch User Info & LiveKit Token
        const tokenRes = await fetch(`/api/classroom/${sessionId}/token`, { method: "POST" });
        const tokenData = await tokenRes.json();
        if (tokenData.success) {
          setCurrentUserId(tokenData.data.userId);
          setCurrentUserName(tokenData.data.userName);
          if (tokenData.data.token) {
            setLivekitToken(tokenData.data.token);
            setLivekitServerUrl(tokenData.data.serverUrl || "wss://demo.livekit.cloud");
          }
        }
      } catch (err: any) {
        setError(err.message || "Could not connect to classroom server.");
      } finally {
        setLoading(false);
      }
    }

    loadSession();
  }, [sessionId]);

  // Merge signaling peers into participant list
  const handleSignalingPeersUpdate = useCallback((peers: any[]) => {
    if (!sessionDetails) return;

    setParticipants((prev) => {
      // Find or build self participant
      const me: ClassroomParticipant = {
        userId: currentUserId,
        name: currentUserName || (isTeacher ? "Teacher" : "Student"),
        role: isTeacher ? "TEACHER" : "STUDENT",
        isCameraOn: isVideoOn,
        isMicOn: isAudioOn,
        isScreenSharing,
        isMutedByTeacher: false,
        isSpotlighted: false,
        canDrawOnWhiteboard: isTeacher || studentCanDraw,
        connectionQuality,
        joinedAt: new Date().toISOString(),
      };

      const others: ClassroomParticipant[] = [];

      peers.forEach((peer) => {
        if (peer.userId === currentUserId) return;
        others.push({
          userId: peer.userId,
          name: peer.userName || (peer.role === "TEACHER" ? "Teacher" : "Student"),
          role: peer.role || (peer.userId === sessionDetails.teacherId ? "TEACHER" : "STUDENT"),
          isCameraOn: peer.isVideoOn ?? true,
          isMicOn: peer.isAudioOn ?? true,
          isScreenSharing: peer.isScreenSharing ?? false,
          isMutedByTeacher: false,
          isSpotlighted: false,
          canDrawOnWhiteboard: peer.role === "TEACHER" || studentCanDraw,
          connectionQuality: "CONNECTED",
          joinedAt: new Date().toISOString(),
        });
      });

      // If educator is not currently connected via signaling yet, keep placeholder so student sees stage
      if (!isTeacher && !others.some((p) => p.role === "TEACHER") && sessionDetails.teacherId) {
        others.unshift({
          userId: sessionDetails.teacherId,
          name: sessionDetails.teacherName || "Teacher",
          role: "TEACHER",
          isCameraOn: false,
          isMicOn: false,
          isScreenSharing: false,
          isMutedByTeacher: false,
          isSpotlighted: false,
          canDrawOnWhiteboard: true,
          connectionQuality: "CONNECTING",
          joinedAt: sessionDetails.scheduledStartAt,
        });
      }

      return [me, ...others];
    });
  }, [sessionDetails, currentUserId, currentUserName, isTeacher, isVideoOn, isAudioOn, isScreenSharing, studentCanDraw, connectionQuality]);

  const handlePeerMediaStateUpdate = useCallback((data: any) => {
    setParticipants((prev) =>
      prev.map((p) => {
        if (p.userId === data.userId) {
          return {
            ...p,
            isMicOn: data.isAudioOn ?? p.isMicOn,
            isCameraOn: data.isVideoOn ?? p.isCameraOn,
            isScreenSharing: data.isScreenSharing ?? p.isScreenSharing,
          };
        }
        return p;
      })
    );
  }, []);

  // 2. Handle Joining Classroom
  const handleJoinClassroom = async (
    devices: DeviceSelection,
    initialAudio: boolean,
    initialVideo: boolean
  ) => {
    try {
      setLoading(true);

      // Get Access Token
      const tokenRes = await fetch(`/api/classroom/${sessionId}/token`, { method: "POST" });
      const tokenData = await tokenRes.json();
      if (!tokenData.success) {
        throw new Error(tokenData.error || "Failed to issue room token.");
      }

      const { token, serverUrl, roomId, userId, userName } = tokenData.data;

      setLivekitToken(token);
      setLivekitServerUrl(serverUrl || "wss://demo.livekit.cloud");

      // Instantiate WebRTC Adapter
      const adapter = new WebRTCAdapter();
      providerRef.current = adapter;

      // Event listeners
      adapter.on("local-stream-changed", (data) => {
        setLocalStream(data.stream);
        if (typeof data.isAudioOn === "boolean") setIsAudioOn(data.isAudioOn);
        if (typeof data.isVideoOn === "boolean") setIsVideoOn(data.isVideoOn);
      });

      adapter.on("remote-stream-added", (data) => {
        if (data.userId && data.stream) {
          setRemoteStreams((prev) => ({
            ...prev,
            [data.userId]: data.stream,
          }));
        }
      });

      adapter.on("remote-stream-removed", (data) => {
        if (data.userId) {
          setRemoteStreams((prev) => {
            const next = { ...prev };
            delete next[data.userId];
            return next;
          });
        }
      });

      adapter.on("screen-share-changed", (data) => {
        setIsScreenSharing(data.isSharing);
        setScreenStream(data.stream);
        setIsLocalScreenSharing(data.isSharing);
        setScreenPresenterName(data.isSharing ? "You" : null);
      });

      adapter.on("remote-screen-changed", (data) => {
        setIsScreenSharing(data.isSharing);
        setScreenStream(data.stream);
        setIsLocalScreenSharing(false);
        if (data.isSharing) {
          setParticipants((currentParticipants) => {
            const presenter = currentParticipants.find((p) => p.userId === data.presenterId);
            setScreenPresenterName(presenter ? presenter.name : "Participant");
            return currentParticipants;
          });
        } else {
          setScreenPresenterName(null);
        }
      });

      adapter.on("participants-changed", (data) => {
        if (Array.isArray(data.peers)) {
          handleSignalingPeersUpdate(data.peers);
        }
      });

      adapter.on("peer-media-state-changed", (data) => {
        handlePeerMediaStateUpdate(data);
      });

      adapter.on("connection-state-changed", (data) => {
        setConnectionQuality(data.state);
      });

      adapter.on("active-speaker-changed", (data) => {
        setActiveSpeakerId(data.speakerId);
      });

      adapter.on("device-permission-denied", (data) => {
        setPermissionError(data.message);
      });

      // Connect to Provider
      await adapter.connect({
        sessionId,
        roomId,
        token,
        userId,
        userName,
        isTeacher,
        initialAudioEnabled: initialAudio,
        initialVideoEnabled: initialVideo,
      });

      // Select chosen devices if set
      if (devices.cameraId || devices.microphoneId || devices.speakerId) {
        await adapter.selectDevices(devices);
      }

      setIsAudioOn(initialAudio);
      setIsVideoOn(initialVideo);
      setHasJoined(true);

      // Start Attendance Heartbeat & Realtime Polling
      startHeartbeat();
      startPolling();

      // Initial Fetch of Data
      fetchChatMessages();
      fetchWhiteboardState();
      fetchFiles();
    } catch (err: any) {
      setError(err.message || "Unable to enter classroom.");
    } finally {
      setLoading(false);
    }
  };

  // Heartbeat logging
  const startHeartbeat = () => {
    if (heartbeatTimerRef.current) clearInterval(heartbeatTimerRef.current);
    heartbeatTimerRef.current = setInterval(async () => {
      try {
        await fetch(`/api/classroom/${sessionId}/attendance`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ secondsElapsed: 30 }),
        });
      } catch (e) {
        console.warn("Heartbeat update failed:", e);
      }
    }, 30000);
  };

  // Polling for updates
  const startPolling = () => {
    if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    pollTimerRef.current = setInterval(() => {
      fetchChatMessages();
      fetchWhiteboardState();
    }, 4000);
  };

  // Fetch Chat
  const fetchChatMessages = async () => {
    try {
      const res = await fetch(`/api/classroom/${sessionId}/messages`);
      const data = await res.json();
      if (data.success) {
        setMessages(data.data.messages || []);
      }
    } catch (e) {
      console.warn("Chat fetch error:", e);
    }
  };

  // Fetch Whiteboard
  const fetchWhiteboardState = async () => {
    try {
      const res = await fetch(`/api/classroom/${sessionId}/whiteboard`);
      const data = await res.json();
      if (data.success) {
        setWhiteboardElements(data.data.elements || []);
        setStudentCanDraw(data.data.studentCanDraw);
      }
    } catch (e) {
      console.warn("Whiteboard fetch error:", e);
    }
  };

  // Fetch Files
  const fetchFiles = async () => {
    try {
      const res = await fetch(`/api/classroom/${sessionId}/files`);
      const data = await res.json();
      if (data.success) {
        setFiles(data.data.files || []);
      }
    } catch (e) {
      console.warn("Files fetch error:", e);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (providerRef.current) providerRef.current.disconnect();
      if (heartbeatTimerRef.current) clearInterval(heartbeatTimerRef.current);
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, []);

  // Handlers for Control Bar & Moderation
  const handleToggleAudio = async () => {
    if (providerRef.current) {
      const nextState = await providerRef.current.setAudioEnabled(!isAudioOn);
      setIsAudioOn(nextState);
    }
  };

  const handleToggleVideo = async () => {
    if (providerRef.current) {
      const nextState = await providerRef.current.setVideoEnabled(!isVideoOn);
      setIsVideoOn(nextState);
    }
  };

  const handleToggleScreenShare = async () => {
    if (!providerRef.current) return;
    if (isScreenSharing && isLocalScreenSharing) {
      await providerRef.current.stopScreenShare();
    } else {
      await providerRef.current.startScreenShare();
    }
  };

  const handleUnlockAutoplay = () => {
    setAutoplayBlocked(false);
    if (typeof document !== "undefined") {
      document.querySelectorAll("audio, video").forEach((el) => {
        (el as HTMLMediaElement).play().catch(() => {});
      });
    }
  };

  const handleLeaveClass = async () => {
    if (providerRef.current) await providerRef.current.disconnect();
    router.push(isTeacher ? "/teacher/dashboard" : "/student/dashboard");
  };

  const handleEndClass = async () => {
    try {
      const res = await fetch(`/api/classroom/${sessionId}/end`, { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setIsClassEnded(true);
        setSummaryData(data.data);
      }
    } catch (e) {
      console.error("Failed to end class:", e);
    }
  };

  const handleSendMessage = async (text: string) => {
    const res = await fetch(`/api/classroom/${sessionId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: text }),
    });
    const data = await res.json();
    if (data.success) {
      fetchChatMessages();
    }
  };

  const handleSaveWhiteboardState = async (elements: WhiteboardElement[]) => {
    await fetch(`/api/classroom/${sessionId}/whiteboard`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ elements }),
    });
  };

  const handleUploadFile = async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch(`/api/classroom/${sessionId}/files`, {
      method: "POST",
      body: formData,
    });
    const data = await res.json();
    if (data.success) {
      fetchFiles();
    } else {
      throw new Error(data.error || "Upload failed");
    }
  };

  const handleToggleStudentDraw = async (enabled: boolean) => {
    const res = await fetch(`/api/classroom/${sessionId}/moderate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "TOGGLE_STUDENT_DRAW", enabled }),
    });
    const data = await res.json();
    if (data.success) {
      setStudentCanDraw(enabled);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-white space-y-4">
        <LoadingSkeleton className="w-16 h-16 rounded-full" />
        <p className="text-sm font-semibold text-slate-400">Connecting to EduConnects Virtual Classroom...</p>
      </div>
    );
  }

  if (error || !sessionDetails) {
    const isBookingIssue = error?.includes("booking") || error?.includes("book") || error?.includes("not have a confirmed booking");
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center space-y-4">
        <div className="bg-red-500/10 border border-red-500/30 rounded-3xl p-6 max-w-md w-full text-red-200">
          <h2 className="text-lg font-bold text-white mb-2">Classroom Access Notice</h2>
          <p className="text-xs text-red-300 mb-4">{error || "Unable to access this classroom."}</p>
          <div className="flex flex-col gap-2">
            {isBookingIssue && (
              <button
                type="button"
                onClick={() => window.location.replace(`/live-class/${sessionDetails?.liveClassSlotId || sessionId}`)}
                className="w-full h-10 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl transition-colors"
              >
                View Class Details & Enroll
              </button>
            )}
            <button
              type="button"
              onClick={() => router.push(isTeacher ? "/teacher/dashboard" : "/student/dashboard")}
              className="w-full h-10 bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs rounded-xl"
            >
              Return to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  // If Class Ended -> Render Summary Screen
  if (isClassEnded) {
    return (
      <ClassSummary
        sessionDetails={sessionDetails}
        isTeacher={isTeacher}
        summaryStats={summaryData?.stats}
        attendances={summaryData?.attendances}
      />
    );
  }

  // Pre-join Setup View
  if (!hasJoined) {
    return (
      <PreJoinScreen
        sessionDetails={sessionDetails}
        userName={currentUserName || (isTeacher ? "Teacher" : "Student")}
        isTeacher={isTeacher}
        onJoin={handleJoinClassroom}
      />
    );
  }

  return (
    <div className="h-[100dvh] bg-slate-950 flex flex-col overflow-hidden text-slate-100 font-sans select-none">
      {/* Top Header */}
      <ClassroomHeader
        title={sessionDetails.title}
        subject={sessionDetails.subject}
        teacherName={sessionDetails.teacherName}
        status={sessionDetails.status}
        scheduledStartAt={sessionDetails.scheduledStartAt}
        actualStartAt={sessionDetails.actualStartAt}
        connectionQuality={connectionQuality}
        isTeacher={isTeacher}
      />

      {/* Main Classroom Body */}
      <div className="flex-1 flex min-h-0 relative overflow-hidden">
        {/* Video Stage & Spotlight */}
        <VideoStage
          participants={participants}
          localStream={localStream}
          remoteStreams={remoteStreams}
          screenStream={screenStream}
          screenPresenterName={screenPresenterName}
          isScreenSharing={isScreenSharing}
          isLocalScreenSharing={isLocalScreenSharing}
          currentUserId={currentUserId}
          isTeacher={isTeacher}
          activeSpeakerId={activeSpeakerId}
          permissionError={permissionError}
          autoplayBlocked={autoplayBlocked}
          onUnlockAutoplay={handleUnlockAutoplay}
          onStopScreenShare={handleToggleScreenShare}
        />

        {/* Right Drawer Panel with Mobile Overlay Backdrop */}
        {activeDrawer && (
          <>
            {/* Backdrop for small screens */}
            <div
              className="md:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-30"
              onClick={() => setActiveDrawer(null)}
            />

            <div className="w-full md:w-96 h-full absolute right-0 top-0 bottom-0 z-40 shadow-2xl bg-slate-900 border-l border-slate-800 flex flex-col animate-in slide-in-from-right duration-200">
              {activeDrawer === "participants" && (
                <ParticipantsPanel
                  participants={participants}
                  currentUserId={currentUserId}
                  isTeacher={isTeacher}
                  studentCanDraw={studentCanDraw}
                  onToggleStudentDraw={handleToggleStudentDraw}
                  onMuteStudent={() => {}}
                  onSpotlightParticipant={() => {}}
                  onRemoveStudent={() => {}}
                  onClose={() => setActiveDrawer(null)}
                />
              )}

              {activeDrawer === "chat" && (
                <ChatPanel
                  messages={messages}
                  currentUserId={currentUserId}
                  onSendMessage={handleSendMessage}
                  onClose={() => setActiveDrawer(null)}
                />
              )}

              {activeDrawer === "whiteboard" && (
                <WhiteboardPanel
                  initialElements={whiteboardElements}
                  canDraw={isTeacher || studentCanDraw}
                  isTeacher={isTeacher}
                  onSaveState={handleSaveWhiteboardState}
                  onClose={() => setActiveDrawer(null)}
                />
              )}

              {activeDrawer === "files" && (
                <FilesPanel
                  files={files}
                  sessionId={sessionId}
                  isTeacher={isTeacher}
                  onUploadFile={handleUploadFile}
                  onClose={() => setActiveDrawer(null)}
                />
              )}
            </div>
          </>
        )}
      </div>

      {/* Control Toolbar */}
      <ControlBar
        isTeacher={isTeacher}
        isAudioOn={isAudioOn}
        isVideoOn={isVideoOn}
        isScreenSharing={isScreenSharing && isLocalScreenSharing}
        activeDrawer={activeDrawer}
        unreadCount={unreadCount}
        participantCount={participants.length}
        onToggleAudio={handleToggleAudio}
        onToggleVideo={handleToggleVideo}
        onToggleScreenShare={handleToggleScreenShare}
        onToggleDrawer={(drawer) =>
          setActiveDrawer((prev) => (prev === drawer ? null : drawer))
        }
        onOpenSettings={() => setShowSettings(true)}
        onLeaveClass={handleLeaveClass}
        onEndClass={handleEndClass}
      />

      {/* Settings Modal */}
      {showSettings && (
        <SettingsModal
          currentDevices={{}}
          onApplyDevices={async (devices) => {
            if (providerRef.current) await providerRef.current.selectDevices(devices);
          }}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  );
}
