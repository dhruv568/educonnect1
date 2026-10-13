import { ConnectionQuality, DeviceSelection } from "@/types/classroom";

export type ClassroomEventType =
  | "local-stream-changed"
  | "remote-stream-added"
  | "remote-stream-removed"
  | "connection-state-changed"
  | "active-speaker-changed"
  | "screen-share-changed"
  | "device-permission-denied"
  | "participants-changed"
  | "peer-media-state-changed"
  | "remote-screen-changed"
  | "error";

export type ClassroomEventHandler = (data: any) => void;

export interface ClassroomProviderOptions {
  sessionId: string;
  roomId: string;
  token: string;
  userId: string;
  userName: string;
  isTeacher: boolean;
  initialAudioEnabled?: boolean;
  initialVideoEnabled?: boolean;
  cameraId?: string;
  microphoneId?: string;
}

/**
 * Service Abstraction for Real-Time Classroom Video & Audio Provider
 */
export interface ClassroomProvider {
  /**
   * Connect to the virtual classroom session room
   */
  connect(options: ClassroomProviderOptions): Promise<void>;

  /**
   * Disconnect from classroom
   */
  disconnect(): Promise<void>;

  /**
   * Toggle local microphone state
   */
  setAudioEnabled(enabled: boolean): Promise<boolean>;

  /**
   * Toggle local camera state
   */
  setVideoEnabled(enabled: boolean): Promise<boolean>;

  /**
   * Start screen sharing
   */
  startScreenShare(): Promise<MediaStream | null>;

  /**
   * Stop screen sharing
   */
  stopScreenShare(): Promise<void>;

  /**
   * Select specific input/output devices
   */
  selectDevices(devices: DeviceSelection): Promise<void>;

  /**
   * Get list of available audio/video media devices
   */
  getAvailableDevices(): Promise<{
    cameras: MediaDeviceInfo[];
    microphones: MediaDeviceInfo[];
    speakers: MediaDeviceInfo[];
  }>;

  /**
   * Get current connection status
   */
  getConnectionState(): ConnectionQuality;

  /**
   * Register event listener
   */
  on(event: ClassroomEventType, handler: ClassroomEventHandler): void;

  /**
   * Unregister event listener
   */
  off(event: ClassroomEventType, handler: ClassroomEventHandler): void;
}
