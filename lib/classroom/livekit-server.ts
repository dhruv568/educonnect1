import { AccessToken, RoomServiceClient } from "livekit-server-sdk";

export interface LiveKitTokenParams {
  sessionId: string;
  roomId?: string;
  userId: string;
  userName: string;
  userRole: string;
  isTeacher: boolean;
}

/**
 * Generates a short-lived LiveKit access token server-side.
 * LiveKit credentials MUST remain server-side.
 */
export async function generateLiveKitRoomToken(params: LiveKitTokenParams): Promise<string> {
  const apiKey = process.env.LIVEKIT_API_KEY || "devkey";
  const apiSecret = process.env.LIVEKIT_API_SECRET || "secretsecretsecretsecretsecretsecret";

  const roomName = `edu-session-${params.sessionId}`;
  const identity = `user-${params.userId}`;

  const at = new AccessToken(apiKey, apiSecret, {
    identity,
    name: params.userName || "User",
    ttl: "4h",
  });

  at.addGrant({
    roomJoin: true,
    room: roomName,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true,
  });

  return await at.toJwt();
}

/**
 * Safely closes and removes a LiveKit room when a class session is ended.
 */
export async function closeLiveKitRoom(sessionId: string): Promise<boolean> {
  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;
  const livekitUrl = process.env.LIVEKIT_URL;

  if (!apiKey || !apiSecret || !livekitUrl || livekitUrl.includes("demo.livekit.cloud")) {
    return false;
  }

  try {
    const roomService = new RoomServiceClient(
      livekitUrl.replace(/^ws/, "http"),
      apiKey,
      apiSecret
    );
    const roomName = `edu-session-${sessionId}`;
    await roomService.deleteRoom(roomName);
    return true;
  } catch (err) {
    console.warn("[LiveKit closeLiveKitRoom warning]:", err);
    return false;
  }
}
