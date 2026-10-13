"use client";

import React, { useEffect, useRef, useState } from "react";
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

import { LiveKitRoom, RoomAudioRenderer } from "@livekit/components-react";
import "@livekit/components-styles";

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
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const [isAudioOn, setIsAudioOn] = useState(true);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [connectionQuality, setConnectionQuality] = useState<ConnectionQuality>("CONNECTING");
  const [activeSpeakerId, setActiveSpeakerId] = useState<string | null>(null);
  const [permissionError, setPermissionError] = useState<string | null>(null);

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
          setError(data.error || "Failed to load classroom session.");
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

  // 2. Handle Joining Classroom
  const handleJoinClassroom = async (
    devices: DeviceSelection,
    initialAudio: boolean,
    initialVideo: boolean
  ) => {
    try {
      setLoading(true);

      // Get LiveKit Access Token
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

      adapter.on("screen-share-changed", (data) => {
        setIsScreenSharing(data.isSharing);
        setScreenStream(data.stream);
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

      // Update Participant list
      updateRoster();
    }, 4000);
  };

  const updateRoster = async () => {
    if (!sessionDetails) return;
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

    const peerParticipants: ClassroomParticipant[] = [];

    // If current participant is student, include the educator in roster
    if (!isTeacher && sessionDetails.teacherId) {
      peerParticipants.push({
        userId: sessionDetails.teacherId,
        name: sessionDetails.teacherName || "Teacher",
        role: "TEACHER",
        isCameraOn: true,
        isMicOn: true,
        isScreenSharing: false,
        isMutedByTeacher: false,
        isSpotlighted: false,
        canDrawOnWhiteboard: true,
        connectionQuality: "CONNECTED",
        joinedAt: sessionDetails.scheduledStartAt,
      });
    }

    // Fetch active student attendance records
    try {
      const attRes = await fetch(`/api/classroom/${sessionId}/attendance`);
      const attData = await attRes.json();
      if (attData.success && Array.isArray(attData.data?.attendances)) {
        attData.data.attendances.forEach((att: any) => {
          if (att.studentId && att.studentId !== currentUserId) {
            peerParticipants.push({
              userId: att.studentId,
              name: att.studentName || "Student",
              role: "STUDENT",
              isCameraOn: true,
              isMicOn: true,
              isScreenSharing: false,
              isMutedByTeacher: false,
              isSpotlighted: false,
              canDrawOnWhiteboard: studentCanDraw,
              connectionQuality: "CONNECTED",
              joinedAt: att.joinedAt,
            });
          }
        });
      }
    } catch {}

    setParticipants([me, ...peerParticipants]);
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
    if (isScreenSharing) {
      await providerRef.current.stopScreenShare();
    } else {
      await providerRef.current.startScreenShare();
    }
  };

  const handleStartClass = async () => {
    try {
      const res = await fetch(`/api/classroom/${sessionId}/start`, { method: "POST" });
      const data = await res.json();
      if (data.success && sessionDetails) {
        setSessionDetails({
          ...sessionDetails,
          status: "LIVE",
          actualStartAt: data.data.actualStartAt,
        });
      }
    } catch (e) {
      console.error("Failed to start class:", e);
    }
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

  const handleLeaveClass = async () => {
    if (providerRef.current) await providerRef.current.disconnect();
    router.push(isTeacher ? "/teacher/dashboard" : "/student/dashboard");
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
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center space-y-4">
        <div className="bg-red-500/10 border border-red-500/30 rounded-3xl p-6 max-w-md w-full text-red-200">
          <h2 className="text-lg font-bold text-white mb-2">Classroom Access Error</h2>
          <p className="text-xs text-red-300 mb-4">{error || "Unable to access this classroom."}</p>
          <button
            type="button"
            onClick={() => router.push(isTeacher ? "/teacher/dashboard" : "/student/dashboard")}
            className="w-full h-10 bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs rounded-xl"
          >
            Return to Dashboard
          </button>
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
    <div className="min-h-screen h-screen bg-slate-950 flex flex-col overflow-hidden text-slate-100 font-sans">
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
          screenStream={screenStream}
          currentUserId={currentUserId}
          isTeacher={isTeacher}
          activeSpeakerId={activeSpeakerId}
          permissionError={permissionError}
        />

        {/* Right Drawer Panel */}
        {activeDrawer && (
          <div className="w-full md:w-96 h-full absolute right-0 top-0 bottom-0 z-20 shadow-2xl">
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
        )}
      </div>

      {/* Control Toolbar */}
      <ControlBar
        isTeacher={isTeacher}
        isAudioOn={isAudioOn}
        isVideoOn={isVideoOn}
        isScreenSharing={isScreenSharing}
        activeDrawer={activeDrawer}
        unreadCount={unreadCount}
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
