import { ConnectionQuality, DeviceSelection } from "@/types/classroom";
import {
  ClassroomEventHandler,
  ClassroomEventType,
  ClassroomProvider,
  ClassroomProviderOptions,
} from "./classroom-provider";

export class WebRTCAdapter implements ClassroomProvider {
  private localStream: MediaStream | null = null;
  private screenStream: MediaStream | null = null;
  private connectionState: ConnectionQuality = "DISCONNECTED";
  private listeners: Map<ClassroomEventType, Set<ClassroomEventHandler>> = new Map();
  private audioAnalyser: AnalyserNode | null = null;
  private audioContext: AudioContext | null = null;
  private activeSpeakerCheckInterval: NodeJS.Timeout | null = null;
  private lastSpeakerId: string | null = null;
  private options: ClassroomProviderOptions | null = null;
  private isAudioEnabled: boolean = true;
  private isVideoEnabled: boolean = true;

  // WebRTC Peer Connections and Remote Streams
  private peerConnections: Map<string, RTCPeerConnection> = new Map();
  private remoteStreams: Map<string, MediaStream> = new Map();
  private pendingCandidates: Map<string, RTCIceCandidateInit[]> = new Map();
  private pollInterval: NodeJS.Timeout | null = null;
  private isPolling: boolean = false;
  private knownPeers: Set<string> = new Set();
  private lastPeersSignature: string = "";

  private readonly iceServers: RTCIceServer[] = [
    { urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] },
    { urls: ["stun:stun2.l.google.com:19302", "stun:stun3.l.google.com:19302"] },
    { urls: ["stun:stun4.l.google.com:19302"] },
  ];

  constructor() {
    this.initListenersMap();
  }

  private initListenersMap() {
    const eventTypes: ClassroomEventType[] = [
      "local-stream-changed",
      "remote-stream-added",
      "remote-stream-removed",
      "connection-state-changed",
      "active-speaker-changed",
      "screen-share-changed",
      "device-permission-denied",
      "participants-changed",
      "peer-media-state-changed",
      "remote-screen-changed",
      "error",
    ];
    eventTypes.forEach((evt) => this.listeners.set(evt, new Set()));
  }

  public async connect(options: ClassroomProviderOptions): Promise<void> {
    this.options = options;
    this.setConnectionState("CONNECTING");

    try {
      // 1. Acquire local camera & microphone with physical camera prioritization
      if (typeof window !== "undefined" && navigator.mediaDevices) {
        try {
          // If no specific camera ID provided, discover available cameras and sort physical first
          let targetCameraId = options.cameraId;
          if (!targetCameraId && navigator.mediaDevices.enumerateDevices) {
            try {
              const allDevs = await navigator.mediaDevices.enumerateDevices();
              const cams = allDevs.filter((d) => d.kind === "videoinput");
              const sortedCams = [...cams].sort((a, b) => {
                const aVirt = /iriun|triun|virtual|obs|droidcam|splitcam/i.test(a.label);
                const bVirt = /iriun|triun|virtual|obs|droidcam|splitcam/i.test(b.label);
                if (aVirt && !bVirt) return 1;
                if (!aVirt && bVirt) return -1;
                return 0;
              });
              if (sortedCams[0]?.deviceId) {
                targetCameraId = sortedCams[0].deviceId;
              }
            } catch (e) {
              console.warn("[WebRTCAdapter] Device enumeration note:", e);
            }
          }

          const videoConstraints: any = options.initialVideoEnabled !== false
            ? targetCameraId
              ? {
                  deviceId: { exact: targetCameraId },
                  width: { ideal: 1280, max: 1280 },
                  height: { ideal: 720, max: 720 },
                  frameRate: { ideal: 24, max: 30 },
                }
              : {
                  facingMode: "user",
                  width: { ideal: 1280, max: 1280 },
                  height: { ideal: 720, max: 720 },
                  frameRate: { ideal: 24, max: 30 },
                }
            : false;

          const audioConstraints: any = options.initialAudioEnabled !== false
            ? options.microphoneId
              ? {
                  deviceId: { exact: options.microphoneId },
                  echoCancellation: true,
                  noiseSuppression: true,
                  autoGainControl: true,
                }
              : {
                  echoCancellation: true,
                  noiseSuppression: true,
                  autoGainControl: true,
                }
            : false;

          try {
            this.localStream = await navigator.mediaDevices.getUserMedia({
              video: videoConstraints,
              audio: audioConstraints,
            });
          } catch (initialErr: any) {
            // Fallback: If exact deviceId fails, retry with general constraints
            console.warn("[WebRTCAdapter] Exact constraints failed, falling back to default:", initialErr);
            this.localStream = await navigator.mediaDevices.getUserMedia({
              video: options.initialVideoEnabled !== false ? { facingMode: "user" } : false,
              audio: options.initialAudioEnabled !== false,
            });
          }

          this.isAudioEnabled = options.initialAudioEnabled !== false;
          this.isVideoEnabled = options.initialVideoEnabled !== false;

          // Sync track enabled states
          this.localStream.getAudioTracks().forEach((t) => (t.enabled = this.isAudioEnabled));
          this.localStream.getVideoTracks().forEach((t) => (t.enabled = this.isVideoEnabled));

          this.setupAudioAnalysis(this.localStream);
        } catch (err: any) {
          console.warn("[WebRTCAdapter] Media acquisition issue:", err);
          if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
            this.emit("device-permission-denied", {
              message: "Microphone or camera permission was blocked. Please enable browser permissions to talk and show video.",
            });
          }
          this.localStream = new MediaStream();
        }
      }

      this.emit("local-stream-changed", {
        stream: this.localStream,
        isAudioOn: this.isAudioEnabled,
        isVideoOn: this.isVideoEnabled,
      });

      // 2. Register presence in signaling room
      await this.joinSignalingRoom();

      // 3. Start signaling poll loop (every 600ms)
      this.startSignalingLoop();

      // 4. Start active speaker detector
      this.startActiveSpeakerDetection();

      this.setConnectionState("CONNECTED");
    } catch (err: any) {
      console.error("[WebRTCAdapter] Connection error:", err);
      this.setConnectionState("DISCONNECTED");
      this.emit("error", { message: err.message || "Failed to connect to room" });
    }
  }

  private async joinSignalingRoom(): Promise<void> {
    if (!this.options) return;

    try {
      const res = await fetch(`/api/classroom/${this.options.sessionId}/signal`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "join",
          userId: this.options.userId,
          userName: this.options.userName,
          role: this.options.isTeacher ? "TEACHER" : "STUDENT",
          isAudioOn: this.isAudioEnabled,
          isVideoOn: this.isVideoEnabled,
          isScreenSharing: false,
        }),
      });

      const data = await res.json();
      if (data.success) {
        if (data.data?.canonicalRoomId) {
          this.options.sessionId = data.data.canonicalRoomId;
        }

        if (Array.isArray(data.data?.peers)) {
          this.updatePeersIfChanged(data.data.peers);

          // Educator initiates offers to existing participants
          for (const peer of data.data.peers) {
            if (peer.userId !== this.options.userId) {
              this.knownPeers.add(peer.userId);
              const shouldInitiate = this.options.isTeacher;
              this.getOrCreatePeerConnection(peer.userId, shouldInitiate);
            }
          }
        }
      }
    } catch (e) {
      console.warn("[WebRTCAdapter] Failed to register join in signaling:", e);
    }
  }

  private updatePeersIfChanged(peers: any[]) {
    // Generate signature to avoid unnecessary React re-renders and flickering
    const sig = peers.map((p) => `${p.userId}_${p.isAudioOn}_${p.isVideoOn}_${p.isScreenSharing}`).sort().join("|");
    if (sig !== this.lastPeersSignature) {
      this.lastPeersSignature = sig;
      this.emit("participants-changed", { peers });
    }
  }

  private startSignalingLoop(): void {
    if (this.pollInterval) clearInterval(this.pollInterval);

    this.pollInterval = setInterval(async () => {
      if (this.isPolling || !this.options) return;
      this.isPolling = true;

      try {
        const res = await fetch(
          `/api/classroom/${this.options.sessionId}/signal?userId=${encodeURIComponent(this.options.userId)}`
        );
        if (!res.ok) return;

        const data = await res.json();
        if (data.success) {
          if (data.data?.isEnded) {
            this.emit("class-ended", { message: "The educator has ended this live class." });
            this.disconnect();
            return;
          }

          if (data.data?.canonicalRoomId && this.options.sessionId !== data.data.canonicalRoomId) {
            this.options.sessionId = data.data.canonicalRoomId;
          }

          // 1. Process active peers
          if (Array.isArray(data.data?.peers)) {
            const currentPeerIds = new Set(data.data.peers.map((p: any) => p.userId));
            this.updatePeersIfChanged(data.data.peers);

            // Handle new peers (Educator initiates offer)
            for (const peer of data.data.peers) {
              if (peer.userId !== this.options.userId && !this.knownPeers.has(peer.userId)) {
                this.knownPeers.add(peer.userId);
                const shouldOffer = this.options.isTeacher || this.options.userId < peer.userId;
                this.getOrCreatePeerConnection(peer.userId, shouldOffer);
              }
            }

            // Handle removed peers
            for (const knownId of Array.from(this.knownPeers)) {
              if (!currentPeerIds.has(knownId)) {
                this.handlePeerLeft(knownId);
              }
            }
          }

          // 2. Process incoming signals
          if (Array.isArray(data.data?.signals)) {
            for (const signal of data.data.signals) {
              await this.handleIncomingSignal(signal);
            }
          }
        }
      } catch (e) {
        console.warn("[WebRTCAdapter] Signaling poll error:", e);
      } finally {
        this.isPolling = false;
      }
    }, 600);
  }

  private async sendSignal(toUserId: string, type: string, payload: any): Promise<void> {
    if (!this.options) return;
    try {
      await fetch(`/api/classroom/${this.options.sessionId}/signal`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "signal",
          userId: this.options.userId,
          toUserId,
          type,
          payload,
        }),
      });
    } catch (e) {
      console.error("[WebRTCAdapter] Failed to send signal:", e);
    }
  }

  private getOrCreatePeerConnection(peerId: string, shouldInitiateOffer = false): RTCPeerConnection {
    let pc = this.peerConnections.get(peerId);
    if (pc) return pc;

    pc = new RTCPeerConnection({
      iceServers: this.iceServers,
      iceCandidatePoolSize: 4,
    });

    this.peerConnections.set(peerId, pc);

    // Add local media tracks to peer connection
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => {
        pc.addTrack(track, this.localStream!);
      });
    }

    // ICE Candidate handler
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.sendSignal(peerId, "candidate", event.candidate.toJSON());
      }
    };

    // Remote Track handler
    pc.ontrack = (event) => {
      // Use the browser's native stream provided in event.streams[0]
      let stream = event.streams[0];
      const existing = this.remoteStreams.get(peerId);
      if (!stream) {
        stream = existing || new MediaStream();
        if (!stream.getTracks().includes(event.track)) {
          stream.addTrack(event.track);
        }
      } else if (existing && existing !== stream) {
        // Retain previously received tracks if browser emits a different stream instance
        existing.getTracks().forEach((t) => {
          if (!stream.getTracks().some((st) => st.id === t.id)) {
            stream.addTrack(t);
          }
        });
      }
      this.remoteStreams.set(peerId, stream);

      this.emit("remote-stream-added", {
        userId: peerId,
        stream,
        track: event.track,
        kind: event.track.kind,
      });

      // Handle unmuting when first media frames arrive (especially on mobile)
      event.track.onunmute = () => {
        this.emit("remote-stream-added", {
          userId: peerId,
          stream,
          track: event.track,
          kind: event.track.kind,
        });
      };

      // Set up speaking detector on remote audio stream
      if (event.track.kind === "audio") {
        this.setupRemoteAudioAnalysis(peerId, stream);
      }
    };

    // Connection state handler
    pc.onconnectionstatechange = () => {
      const state = pc.connectionState;
      if (state === "connected") {
        this.setConnectionState("CONNECTED");
      } else if (state === "connecting") {
        this.setConnectionState("CONNECTING");
      } else if (state === "disconnected" || state === "failed") {
        this.setConnectionState("POOR_CONNECTION");
        this.restartIce(peerId, pc);
      }
    };

    pc.oniceconnectionstatechange = () => {
      const state = pc.iceConnectionState;
      if (state === "connected" || state === "completed") {
        this.setConnectionState("CONNECTED");
      } else if (state === "disconnected" || state === "failed") {
        this.setConnectionState("POOR_CONNECTION");
      }
    };

    // Strictly initiate offer if designated
    if (shouldInitiateOffer) {
      this.initiateOffer(peerId, pc);
    }

    return pc;
  }

  private async restartIce(peerId: string, pc: RTCPeerConnection): Promise<void> {
    try {
      const offer = await pc.createOffer({ iceRestart: true });
      await pc.setLocalDescription(offer);
      await this.sendSignal(peerId, "offer", offer);
    } catch (e) {
      console.warn("[WebRTCAdapter] ICE restart note:", e);
    }
  }

  private async initiateOffer(peerId: string, pc: RTCPeerConnection): Promise<void> {
    try {
      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true,
      });
      await pc.setLocalDescription(offer);
      await this.sendSignal(peerId, "offer", offer);
    } catch (err) {
      console.error(`[WebRTCAdapter] Failed to create offer for ${peerId}:`, err);
    }
  }

  private async handleIncomingSignal(signal: any): Promise<void> {
    const { fromUserId, type, payload } = signal;
    if (!fromUserId) return;

    if (type === "class-ended") {
      this.emit("class-ended", payload || { message: "The educator has ended this live class." });
      await this.disconnect();
      return;
    }

    if (type === "whiteboard-update") {
      this.emit("whiteboard-update", payload);
      return;
    }

    if (type === "draw-permission") {
      this.emit("draw-permission-changed", payload);
      return;
    }

    if (type === "peer-left") {
      this.handlePeerLeft(fromUserId);
      return;
    }

    if (type === "peer-joined") {
      const peer = payload?.peer;
      const peerId = peer?.userId || fromUserId;
      if (peerId && peerId !== this.options?.userId) {
        this.knownPeers.add(peerId);
        // Only educator initiates offer
        const shouldOffer = this.options?.isTeacher || (this.options?.userId ?? "") < peerId;
        this.getOrCreatePeerConnection(peerId, shouldOffer);
      }
      return;
    }

    if (type === "media-state") {
      this.emit("peer-media-state-changed", payload);
      if (payload.isScreenSharing === false) {
        this.emit("remote-screen-changed", {
          isSharing: false,
          stream: null,
          presenterId: fromUserId,
        });
      } else if (payload.isScreenSharing === true) {
        // Stream of this peer is presenting screen
        const peerStream = this.remoteStreams.get(fromUserId);
        this.emit("remote-screen-changed", {
          isSharing: true,
          stream: peerStream || null,
          presenterId: fromUserId,
        });
      }
      return;
    }

    const pc = this.getOrCreatePeerConnection(fromUserId, false);

    try {
      if (type === "offer") {
        await pc.setRemoteDescription(new RTCSessionDescription(payload));

        // Flush queued candidates
        const queued = this.pendingCandidates.get(fromUserId) || [];
        for (const cand of queued) {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(cand));
          } catch (e) {
            console.warn("[WebRTCAdapter] Queued ICE candidate note:", e);
          }
        }
        this.pendingCandidates.delete(fromUserId);

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        await this.sendSignal(fromUserId, "answer", answer);
      } else if (type === "answer") {
        if (pc.signalingState === "have-local-offer") {
          await pc.setRemoteDescription(new RTCSessionDescription(payload));

          // Flush queued candidates
          const queued = this.pendingCandidates.get(fromUserId) || [];
          for (const cand of queued) {
            try {
              await pc.addIceCandidate(new RTCIceCandidate(cand));
            } catch (e) {
              console.warn("[WebRTCAdapter] Queued ICE candidate note:", e);
            }
          }
          this.pendingCandidates.delete(fromUserId);
        }
      } else if (type === "candidate") {
        if (pc.remoteDescription && pc.remoteDescription.type) {
          await pc.addIceCandidate(new RTCIceCandidate(payload));
        } else {
          const queue = this.pendingCandidates.get(fromUserId) || [];
          queue.push(payload);
          this.pendingCandidates.set(fromUserId, queue);
        }
      }
    } catch (err) {
      console.error(`[WebRTCAdapter] Signal handling note for ${type}:`, err);
    }
  }

  private handlePeerLeft(peerId: string): void {
    const pc = this.peerConnections.get(peerId);
    if (pc) {
      pc.close();
      this.peerConnections.delete(peerId);
    }
    this.remoteStreams.delete(peerId);
    this.pendingCandidates.delete(peerId);
    this.knownPeers.delete(peerId);

    this.emit("remote-stream-removed", { userId: peerId });
    this.emit("remote-screen-changed", { isSharing: false, stream: null, presenterId: peerId });
  }

  public async disconnect(): Promise<void> {
    this.stopActiveSpeakerDetection();

    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }

    if (this.options) {
      try {
        await fetch(`/api/classroom/${this.options.sessionId}/signal`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "leave",
            userId: this.options.userId,
          }),
        });
      } catch (e) {
        console.warn("[WebRTCAdapter] Leave signal error:", e);
      }
    }

    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => track.stop());
      this.localStream = null;
    }

    if (this.screenStream) {
      this.screenStream.getTracks().forEach((track) => track.stop());
      this.screenStream = null;
    }

    for (const pc of Array.from(this.peerConnections.values())) {
      pc.close();
    }
    this.peerConnections.clear();
    this.remoteStreams.clear();
    this.pendingCandidates.clear();
    this.knownPeers.clear();

    if (this.audioContext && this.audioContext.state !== "closed") {
      await this.audioContext.close();
      this.audioContext = null;
    }

    this.setConnectionState("DISCONNECTED");
    this.emit("local-stream-changed", { stream: null });
  }

  public async setAudioEnabled(enabled: boolean): Promise<boolean> {
    this.isAudioEnabled = enabled;
    if (this.localStream) {
      const audioTracks = this.localStream.getAudioTracks();
      if (audioTracks.length > 0) {
        audioTracks.forEach((track) => {
          track.enabled = enabled;
        });
      } else if (enabled && typeof window !== "undefined" && navigator.mediaDevices) {
        try {
          const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
          const newTrack = micStream.getAudioTracks()[0];
          if (newTrack) {
            this.localStream.addTrack(newTrack);
            for (const pc of Array.from(this.peerConnections.values())) {
              for (const sender of pc.getSenders()) {
                if (sender.track?.kind === "audio") {
                  await sender.replaceTrack(newTrack);
                }
              }
            }
          }
        } catch (err) {
          console.error("Failed to re-acquire microphone:", err);
          return false;
        }
      }
    }

    this.broadcastMediaState({ isAudioOn: enabled });

    this.emit("local-stream-changed", {
      stream: this.localStream,
      isAudioOn: enabled,
      isVideoOn: this.isVideoEnabled,
    });
    return enabled;
  }

  public async setVideoEnabled(enabled: boolean): Promise<boolean> {
    this.isVideoEnabled = enabled;
    if (this.localStream) {
      const videoTracks = this.localStream.getVideoTracks();
      if (videoTracks.length > 0) {
        videoTracks.forEach((track) => {
          track.enabled = enabled;
        });
      } else if (enabled && typeof window !== "undefined" && navigator.mediaDevices) {
        try {
          const camStream = await navigator.mediaDevices.getUserMedia({
            video: {
              width: { ideal: 1280, max: 1280 },
              height: { ideal: 720, max: 720 },
              facingMode: "user",
            },
          });
          const newTrack = camStream.getVideoTracks()[0];
          if (newTrack) {
            this.localStream.addTrack(newTrack);
            for (const pc of Array.from(this.peerConnections.values())) {
              for (const sender of pc.getSenders()) {
                if (sender.track?.kind === "video") {
                  await sender.replaceTrack(newTrack);
                }
              }
            }
          }
        } catch (err) {
          console.error("Failed to re-acquire camera:", err);
          return false;
        }
      }
    }

    this.broadcastMediaState({ isVideoOn: enabled });

    this.emit("local-stream-changed", {
      stream: this.localStream,
      isAudioOn: this.isAudioEnabled,
      isVideoOn: enabled,
    });
    return enabled;
  }

  private async broadcastMediaState(state: { isAudioOn?: boolean; isVideoOn?: boolean; isScreenSharing?: boolean }): Promise<void> {
    if (!this.options) return;
    try {
      await fetch(`/api/classroom/${this.options.sessionId}/signal`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "media-state",
          userId: this.options.userId,
          isAudioOn: state.isAudioOn ?? this.isAudioEnabled,
          isVideoOn: state.isVideoOn ?? this.isVideoEnabled,
          isScreenSharing: state.isScreenSharing ?? !!this.screenStream,
        }),
      });
    } catch (e) {
      console.warn("[WebRTCAdapter] Error broadcasting media state:", e);
    }
  }

  public async startScreenShare(): Promise<MediaStream | null> {
    if (typeof window === "undefined" || !navigator.mediaDevices?.getDisplayMedia) {
      throw new Error("Screen sharing is not supported on this mobile browser or device.");
    }

    try {
      this.screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true,
      });

      const screenTrack = this.screenStream.getVideoTracks()[0];
      (screenTrack as any).contentHint = "detail";

      screenTrack.onended = () => {
        this.stopScreenShare();
      };

      // Seamless Track Replacement: Replace video sender track on peer connections
      for (const pc of Array.from(this.peerConnections.values())) {
        for (const sender of pc.getSenders()) {
          if (sender.track?.kind === "video") {
            await sender.replaceTrack(screenTrack);
          }
        }
      }

      this.broadcastMediaState({ isScreenSharing: true });

      this.emit("screen-share-changed", {
        isSharing: true,
        stream: this.screenStream,
        presenterId: this.options?.userId,
      });
      return this.screenStream;
    } catch (err: any) {
      if (err.name !== "NotAllowedError") {
        console.error("Screen share error:", err);
      }
      return null;
    }
  }

  public async stopScreenShare(): Promise<void> {
    if (this.screenStream) {
      this.screenStream.getTracks().forEach((track) => track.stop());
      this.screenStream = null;
    }

    // Restore camera track seamlessly on peer connections
    const cameraTrack = this.localStream?.getVideoTracks()[0] || null;
    for (const pc of Array.from(this.peerConnections.values())) {
      for (const sender of pc.getSenders()) {
        if (sender.track?.kind === "video") {
          await sender.replaceTrack(cameraTrack);
        }
      }
    }

    this.broadcastMediaState({ isScreenSharing: false });

    this.emit("screen-share-changed", { isSharing: false, stream: null });
  }

  public async selectDevices(devices: DeviceSelection): Promise<void> {
    if (typeof window === "undefined" || !navigator.mediaDevices) return;

    try {
      const constraints: MediaStreamConstraints = {
        audio: devices.microphoneId ? { deviceId: { exact: devices.microphoneId } } : this.isAudioEnabled,
        video: devices.cameraId
          ? {
              deviceId: { exact: devices.cameraId },
              width: { ideal: 1280, max: 1280 },
              height: { ideal: 720, max: 720 },
            }
          : this.isVideoEnabled,
      };

      const newStream = await navigator.mediaDevices.getUserMedia(constraints);
      const newVideoTrack = newStream.getVideoTracks()[0];
      const newAudioTrack = newStream.getAudioTracks()[0];

      // Seamlessly replace tracks across peer connections without reconnecting
      for (const pc of Array.from(this.peerConnections.values())) {
        for (const sender of pc.getSenders()) {
          if (sender.track?.kind === "video" && newVideoTrack) {
            await sender.replaceTrack(newVideoTrack);
          } else if (sender.track?.kind === "audio" && newAudioTrack) {
            await sender.replaceTrack(newAudioTrack);
          }
        }
      }

      if (this.localStream) {
        this.localStream.getTracks().forEach((track) => track.stop());
      }
      this.localStream = newStream;
      this.setupAudioAnalysis(newStream);

      this.emit("local-stream-changed", {
        stream: this.localStream,
        isAudioOn: this.isAudioEnabled,
        isVideoOn: this.isVideoEnabled,
      });
    } catch (err: any) {
      console.error("Error changing media devices:", err);
      this.emit("error", { message: "Could not switch to selected device." });
    }
  }

  public async getAvailableDevices(): Promise<{
    cameras: MediaDeviceInfo[];
    microphones: MediaDeviceInfo[];
    speakers: MediaDeviceInfo[];
  }> {
    if (typeof window === "undefined" || !navigator.mediaDevices?.enumerateDevices) {
      return { cameras: [], microphones: [], speakers: [] };
    }

    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      return {
        cameras: devices.filter((d) => d.kind === "videoinput"),
        microphones: devices.filter((d) => d.kind === "audioinput"),
        speakers: devices.filter((d) => d.kind === "audiooutput"),
      };
    } catch (err) {
      console.error("Error enumerating devices:", err);
      return { cameras: [], microphones: [], speakers: [] };
    }
  }

  public async broadcastWhiteboard(elements: any[], actionType = "update"): Promise<void> {
    if (!this.options) return;
    try {
      await fetch(`/api/classroom/${this.options.sessionId}/signal`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "broadcast",
          userId: this.options.userId,
          type: "whiteboard-update",
          payload: {
            elements,
            actionType,
            fromUserId: this.options.userId,
            timestamp: Date.now(),
          },
        }),
      });
    } catch (err) {
      console.warn("[WebRTCAdapter] Whiteboard broadcast note:", err);
    }
  }

  public getConnectionState(): ConnectionQuality {
    return this.connectionState;
  }

  public on(event: ClassroomEventType, handler: ClassroomEventHandler): void {
    const set = this.listeners.get(event);
    if (set) {
      set.add(handler);
    }
  }

  public off(event: ClassroomEventType, handler: ClassroomEventHandler): void {
    const set = this.listeners.get(event);
    if (set) {
      set.delete(handler);
    }
  }

  private setConnectionState(state: ConnectionQuality) {
    this.connectionState = state;
    this.emit("connection-state-changed", { state });
  }

  private emit(event: ClassroomEventType, data: any) {
    const handlers = this.listeners.get(event);
    if (handlers) {
      handlers.forEach((fn) => {
        try {
          fn(data);
        } catch (e) {
          console.error(`Error in ${event} handler:`, e);
        }
      });
    }
  }

  private setupAudioAnalysis(stream: MediaStream) {
    if (typeof window === "undefined") return;
    const audioTracks = stream.getAudioTracks();
    if (audioTracks.length === 0) return;

    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;

      if (!this.audioContext || this.audioContext.state === "closed") {
        this.audioContext = new AudioCtx();
      }

      if (this.audioContext.state === "suspended") {
        this.audioContext.resume().catch(() => {});
      }

      const source = this.audioContext.createMediaStreamSource(stream);
      this.audioAnalyser = this.audioContext.createAnalyser();
      this.audioAnalyser.fftSize = 256;
      source.connect(this.audioAnalyser);
    } catch (e) {
      console.warn("Could not set up Web Audio analyser:", e);
    }
  }

  private setupRemoteAudioAnalysis(peerId: string, stream: MediaStream) {
    if (typeof window === "undefined" || !this.audioContext) return;
    try {
      const source = this.audioContext.createMediaStreamSource(stream);
      const analyser = this.audioContext.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);

      const checkInterval = setInterval(() => {
        if (!this.peerConnections.has(peerId)) {
          clearInterval(checkInterval);
          return;
        }
        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
        const average = sum / dataArray.length;
        if (average > 18 && this.lastSpeakerId !== peerId) {
          this.lastSpeakerId = peerId;
          this.emit("active-speaker-changed", {
            speakerId: peerId,
            volume: average,
          });
        }
      }, 500);
    } catch (e) {
      console.warn("Could not set up remote Web Audio analyser:", e);
    }
  }

  private startActiveSpeakerDetection() {
    this.stopActiveSpeakerDetection();
    this.activeSpeakerCheckInterval = setInterval(() => {
      if (!this.audioAnalyser || !this.isAudioEnabled) return;
      const dataArray = new Uint8Array(this.audioAnalyser.frequencyBinCount);
      this.audioAnalyser.getByteFrequencyData(dataArray);

      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) {
        sum += dataArray[i];
      }
      const average = sum / dataArray.length;
      const isSpeaking = average > 16;

      if (isSpeaking && this.options) {
        if (this.lastSpeakerId !== this.options.userId) {
          this.lastSpeakerId = this.options.userId;
          this.emit("active-speaker-changed", {
            speakerId: this.options.userId,
            speakerName: this.options.userName,
            volume: average,
          });
        }
      } else if (!isSpeaking && this.lastSpeakerId === this.options?.userId) {
        this.lastSpeakerId = null;
        this.emit("active-speaker-changed", {
          speakerId: null,
          volume: 0,
        });
      }
    }, 500);
  }

  private stopActiveSpeakerDetection() {
    if (this.activeSpeakerCheckInterval) {
      clearInterval(this.activeSpeakerCheckInterval);
      this.activeSpeakerCheckInterval = null;
    }
  }
}
