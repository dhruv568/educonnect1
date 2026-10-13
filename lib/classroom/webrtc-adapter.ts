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
  private options: ClassroomProviderOptions | null = null;
  private isAudioEnabled: boolean = true;
  private isVideoEnabled: boolean = true;

  // WebRTC Peer Connections and Remote Streams
  private peerConnections: Map<string, RTCPeerConnection> = new Map();
  private remoteStreams: Map<string, MediaStream> = new Map();
  private pendingCandidates: Map<string, RTCIceCandidateInit[]> = new Map();
  private screenSenders: Map<string, RTCRtpSender> = new Map();
  private pollInterval: NodeJS.Timeout | null = null;
  private isPolling: boolean = false;
  private knownPeers: Set<string> = new Set();

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
      // 1. Acquire local camera & microphone
      if (typeof window !== "undefined" && navigator.mediaDevices) {
        try {
          const constraints: MediaStreamConstraints = {
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
            },
            video: options.initialVideoEnabled !== false
              ? {
                  width: { ideal: 1280, max: 1920 },
                  height: { ideal: 720, max: 1080 },
                  frameRate: { ideal: 30, max: 30 },
                  facingMode: "user",
                }
              : false,
          };
          this.localStream = await navigator.mediaDevices.getUserMedia(constraints);
          this.isAudioEnabled = options.initialAudioEnabled !== false;
          this.isVideoEnabled = options.initialVideoEnabled !== false;

          // Apply initial enabled states
          this.localStream.getAudioTracks().forEach((t) => (t.enabled = this.isAudioEnabled));
          this.localStream.getVideoTracks().forEach((t) => (t.enabled = this.isVideoEnabled));

          this.setupAudioAnalysis(this.localStream);
        } catch (err: any) {
          console.warn("[WebRTCAdapter] Initial media permission issue:", err);
          if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
            this.emit("device-permission-denied", {
              message: "Microphone and camera access was blocked. Please enable browser permissions to speak and show video.",
            });
          }
          // Fallback to empty stream so user can still enter classroom to watch/listen
          this.localStream = new MediaStream();
        }
      }

      this.emit("local-stream-changed", {
        stream: this.localStream,
        isAudioOn: this.isAudioEnabled,
        isVideoOn: this.isVideoEnabled,
      });

      // 2. Join classroom signaling room
      await this.joinSignalingRoom();

      // 3. Start signaling poll loop
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
      if (data.success && Array.isArray(data.data?.peers)) {
        this.emit("participants-changed", { peers: data.data.peers });
        // Initiate peer connections with existing participants
        for (const peer of data.data.peers) {
          if (peer.userId !== this.options.userId) {
            this.knownPeers.add(peer.userId);
            this.getOrCreatePeerConnection(peer.userId, true);
          }
        }
      }
    } catch (e) {
      console.warn("[WebRTCAdapter] Failed to register join in signaling:", e);
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
          // 1. Process active peers
          if (Array.isArray(data.data?.peers)) {
            const currentPeerIds = new Set(data.data.peers.map((p: any) => p.userId));
            this.emit("participants-changed", { peers: data.data.peers });

            // Check for new peers
            for (const peer of data.data.peers) {
              if (peer.userId !== this.options.userId && !this.knownPeers.has(peer.userId)) {
                this.knownPeers.add(peer.userId);
                // The participant with smaller ID or teacher creates offer
                const shouldOffer = this.options.isTeacher || this.options.userId < peer.userId;
                this.getOrCreatePeerConnection(peer.userId, shouldOffer);
              }
            }

            // Check for removed peers
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
    }, 700);
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
      iceCandidatePoolSize: 6,
    });

    this.peerConnections.set(peerId, pc);

    // Track remote stream for this peer
    const remoteStream = new MediaStream();
    this.remoteStreams.set(peerId, remoteStream);

    // Add local media tracks to peer connection
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => {
        pc.addTrack(track, this.localStream!);
      });
    }

    // Add local screen share track if already sharing
    if (this.screenStream) {
      const screenTrack = this.screenStream.getVideoTracks()[0];
      if (screenTrack) {
        const sender = pc.addTrack(screenTrack, this.screenStream);
        this.screenSenders.set(peerId, sender);
      }
    }

    // ICE Candidate handler
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.sendSignal(peerId, "candidate", event.candidate.toJSON());
      }
    };

    // Remote Track handler
    pc.ontrack = (event) => {
      const stream = this.remoteStreams.get(peerId);
      if (stream) {
        stream.addTrack(event.track);

        // Check if track is screen share (indicated by contentHint or label)
        const isScreen = (event.track as any).contentHint === "detail" ||
          event.track.label.toLowerCase().includes("screen") ||
          event.track.label.toLowerCase().includes("display");

        if (isScreen) {
          const screenMediaStream = new MediaStream([event.track]);
          this.emit("remote-screen-changed", {
            isSharing: true,
            stream: screenMediaStream,
            presenterId: peerId,
          });
        }

        this.emit("remote-stream-added", {
          userId: peerId,
          stream,
          track: event.track,
          kind: event.track.kind,
        });

        // Set up speaking detector on remote audio stream
        if (event.track.kind === "audio") {
          this.setupRemoteAudioAnalysis(peerId, stream);
        }
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
        // Try ICE restart
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

    // If this participant is designated to initiate the offer
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
      console.warn("[WebRTCAdapter] ICE restart failed:", e);
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

    if (type === "peer-left") {
      this.handlePeerLeft(fromUserId);
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
            console.warn("[WebRTCAdapter] Error adding queued ICE candidate:", e);
          }
        }
        this.pendingCandidates.delete(fromUserId);

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        await this.sendSignal(fromUserId, "answer", answer);
      } else if (type === "answer") {
        await pc.setRemoteDescription(new RTCSessionDescription(payload));

        // Flush queued candidates
        const queued = this.pendingCandidates.get(fromUserId) || [];
        for (const cand of queued) {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(cand));
          } catch (e) {
            console.warn("[WebRTCAdapter] Error adding queued ICE candidate:", e);
          }
        }
        this.pendingCandidates.delete(fromUserId);
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
      console.error(`[WebRTCAdapter] Error handling ${type} signal from ${fromUserId}:`, err);
    }
  }

  private handlePeerLeft(peerId: string): void {
    const pc = this.peerConnections.get(peerId);
    if (pc) {
      pc.close();
      this.peerConnections.delete(peerId);
    }
    this.remoteStreams.delete(peerId);
    this.screenSenders.delete(peerId);
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

    // Notify peers that we are leaving
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
        console.warn("[WebRTCAdapter] Error sending leave signal:", e);
      }
    }

    // Stop all local tracks
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => track.stop());
      this.localStream = null;
    }

    // Stop all screen tracks
    if (this.screenStream) {
      this.screenStream.getTracks().forEach((track) => track.stop());
      this.screenStream = null;
    }

    // Close all peer connections
    for (const [peerId, pc] of Array.from(this.peerConnections.entries())) {
      pc.close();
    }
    this.peerConnections.clear();
    this.remoteStreams.clear();
    this.screenSenders.clear();
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
            // Replace or add track across peer connections
            for (const pc of Array.from(this.peerConnections.values())) {
              pc.addTrack(newTrack, this.localStream);
            }
          }
        } catch (err) {
          console.error("Failed to re-acquire microphone:", err);
          return false;
        }
      }
    }

    // Broadcast media-state to peers
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
              width: { ideal: 1280 },
              height: { ideal: 720 },
              facingMode: "user",
            },
          });
          const newTrack = camStream.getVideoTracks()[0];
          if (newTrack) {
            this.localStream.addTrack(newTrack);
            // Replace or add track across peer connections
            for (const pc of Array.from(this.peerConnections.values())) {
              pc.addTrack(newTrack, this.localStream);
            }
          }
        } catch (err) {
          console.error("Failed to re-acquire camera:", err);
          return false;
        }
      }
    }

    // Broadcast media-state to peers
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

      // Listen for browser native "Stop Sharing" floating button
      screenTrack.onended = () => {
        this.stopScreenShare();
      };

      // Add screen track to all active peer connections
      for (const [peerId, pc] of Array.from(this.peerConnections.entries())) {
        const sender = pc.addTrack(screenTrack, this.screenStream);
        this.screenSenders.set(peerId, sender);
        // Renegotiate offer with peers
        this.initiateOffer(peerId, pc);
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

    // Remove track from peer connections
    for (const [peerId, sender] of Array.from(this.screenSenders.entries())) {
      const pc = this.peerConnections.get(peerId);
      if (pc) {
        try {
          pc.removeTrack(sender);
          this.initiateOffer(peerId, pc);
        } catch (e) {
          console.warn("[WebRTCAdapter] Error removing screen track sender:", e);
        }
      }
    }
    this.screenSenders.clear();

    this.broadcastMediaState({ isScreenSharing: false });

    this.emit("screen-share-changed", { isSharing: false, stream: null });
  }

  public async selectDevices(devices: DeviceSelection): Promise<void> {
    if (typeof window === "undefined" || !navigator.mediaDevices) return;

    try {
      const constraints: MediaStreamConstraints = {
        audio: devices.microphoneId ? { deviceId: { exact: devices.microphoneId } } : this.isAudioEnabled,
        video: devices.cameraId ? { deviceId: { exact: devices.cameraId } } : this.isVideoEnabled,
      };

      const newStream = await navigator.mediaDevices.getUserMedia(constraints);
      const newVideoTrack = newStream.getVideoTracks()[0];
      const newAudioTrack = newStream.getAudioTracks()[0];

      // Seamlessly replace tracks across peer connections
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
        if (average > 18) {
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
      const isSpeaking = average > 15;

      if (isSpeaking && this.options) {
        this.emit("active-speaker-changed", {
          speakerId: this.options.userId,
          speakerName: this.options.userName,
          volume: average,
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
