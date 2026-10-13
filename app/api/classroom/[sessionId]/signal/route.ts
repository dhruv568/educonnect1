import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { verifyRoomAccess } from "@/lib/classroom/classroom-token";
import { apiError, apiSuccess } from "@/lib/api-response";

interface PeerState {
  userId: string;
  userName: string;
  role: "TEACHER" | "STUDENT" | "STAFF" | "ADMIN";
  isAudioOn: boolean;
  isVideoOn: boolean;
  isScreenSharing: boolean;
  lastSeen: number;
}

interface SignalItem {
  id: string;
  fromUserId: string;
  toUserId: string;
  type: "offer" | "answer" | "candidate" | "media-state" | "peer-left";
  payload: any;
  timestamp: number;
}

interface RoomSignalingState {
  peers: Map<string, PeerState>;
  signals: Map<string, SignalItem[]>; // destination userId -> pending signals
}

// Global in-memory storage for classroom signaling
declare global {
  var __classroomSignaling: Map<string, RoomSignalingState> | undefined;
}

if (!global.__classroomSignaling) {
  global.__classroomSignaling = new Map<string, RoomSignalingState>();
}

const signalingStore = global.__classroomSignaling;

function getOrCreateRoom(sessionId: string): RoomSignalingState {
  let room = signalingStore.get(sessionId);
  if (!room) {
    room = {
      peers: new Map<string, PeerState>(),
      signals: new Map<string, SignalItem[]>(),
    };
    signalingStore.set(sessionId, room);
  }
  return room;
}

function cleanStalePeers(room: RoomSignalingState, timeoutMs = 15000) {
  const now = Date.now();
  for (const [peerId, peer] of Array.from(room.peers.entries())) {
    if (now - peer.lastSeen > timeoutMs) {
      room.peers.delete(peerId);
      room.signals.delete(peerId);
      // Notify remaining peers that this peer left
      for (const destId of Array.from(room.peers.keys())) {
        const queue = room.signals.get(destId) || [];
        queue.push({
          id: Math.random().toString(36).substring(2),
          fromUserId: peerId,
          toUserId: destId,
          type: "peer-left",
          payload: { userId: peerId },
          timestamp: now,
        });
        room.signals.set(destId, queue);
      }
    }
  }
}

// POST: Join, leave, send signal (offer/answer/candidate), update media state
export async function POST(
  req: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const session = await getSession();
    if (!session) {
      return apiError("Authentication required.", 401);
    }

    const { sessionId } = params;
    const accessCheck = await verifyRoomAccess(sessionId, session);
    if (!accessCheck.authorized) {
      return apiError(accessCheck.reason || "Classroom access denied.", 403);
    }

    const body = await req.json();
    const { action, userId, userName, role, isAudioOn, isVideoOn, isScreenSharing, toUserId, type, payload } = body;

    const currentUserId = session.userId || session.id;
    const effectiveUserId = userId || currentUserId;
    const effectiveUserName = userName || `${session.firstName || ""} ${session.lastName || ""}`.trim() || session.email;
    const effectiveRole = role || session.role || (accessCheck.isTeacher ? "TEACHER" : "STUDENT");

    const room = getOrCreateRoom(sessionId);
    cleanStalePeers(room);

    const now = Date.now();

    if (action === "join") {
      const existingPeer = room.peers.get(effectiveUserId);
      const peerState: PeerState = {
        userId: effectiveUserId,
        userName: effectiveUserName,
        role: effectiveRole,
        isAudioOn: isAudioOn ?? existingPeer?.isAudioOn ?? true,
        isVideoOn: isVideoOn ?? existingPeer?.isVideoOn ?? true,
        isScreenSharing: isScreenSharing ?? existingPeer?.isScreenSharing ?? false,
        lastSeen: now,
      };
      room.peers.set(effectiveUserId, peerState);

      if (!room.signals.has(effectiveUserId)) {
        room.signals.set(effectiveUserId, []);
      }

      // Return all other active peers in room
      const activePeers = Array.from(room.peers.values()).filter((p) => p.userId !== effectiveUserId);

      return apiSuccess({
        self: peerState,
        peers: activePeers,
      });
    }

    if (action === "signal") {
      if (!toUserId || !type) {
        return apiError("Missing toUserId or signal type", 400);
      }

      // Update sender lastSeen
      const sender = room.peers.get(effectiveUserId);
      if (sender) sender.lastSeen = now;

      // Add to recipient's queue
      const queue = room.signals.get(toUserId) || [];
      queue.push({
        id: Math.random().toString(36).substring(2),
        fromUserId: effectiveUserId,
        toUserId,
        type,
        payload,
        timestamp: now,
      });
      room.signals.set(toUserId, queue);

      return apiSuccess({ sent: true });
    }

    if (action === "media-state") {
      const peer = room.peers.get(effectiveUserId);
      if (peer) {
        if (typeof isAudioOn === "boolean") peer.isAudioOn = isAudioOn;
        if (typeof isVideoOn === "boolean") peer.isVideoOn = isVideoOn;
        if (typeof isScreenSharing === "boolean") peer.isScreenSharing = isScreenSharing;
        peer.lastSeen = now;

        // Broadcast media-state update to all other peers
        for (const destId of Array.from(room.peers.keys())) {
          if (destId !== effectiveUserId) {
            const queue = room.signals.get(destId) || [];
            queue.push({
              id: Math.random().toString(36).substring(2),
              fromUserId: effectiveUserId,
              toUserId: destId,
              type: "media-state",
              payload: {
                userId: effectiveUserId,
                isAudioOn: peer.isAudioOn,
                isVideoOn: peer.isVideoOn,
                isScreenSharing: peer.isScreenSharing,
              },
              timestamp: now,
            });
            room.signals.set(destId, queue);
          }
        }
      }

      return apiSuccess({ updated: true });
    }

    if (action === "leave") {
      room.peers.delete(effectiveUserId);
      room.signals.delete(effectiveUserId);

      // Notify others
      for (const destId of Array.from(room.peers.keys())) {
        const queue = room.signals.get(destId) || [];
        queue.push({
          id: Math.random().toString(36).substring(2),
          fromUserId: effectiveUserId,
          toUserId: destId,
          type: "peer-left",
          payload: { userId: effectiveUserId },
          timestamp: now,
        });
        room.signals.set(destId, queue);
      }

      return apiSuccess({ left: true });
    }

    if (action === "heartbeat") {
      const peer = room.peers.get(effectiveUserId);
      if (peer) peer.lastSeen = now;
      return apiSuccess({ alive: true });
    }

    return apiError("Unknown signaling action", 400);
  } catch (error: any) {
    console.error("[Signaling API Error]:", error);
    return apiError("Signaling request failed", 500);
  }
}

// GET: Retrieve pending signals for current user and current room peers
export async function GET(
  req: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const session = await getSession();
    if (!session) {
      return apiError("Authentication required.", 401);
    }

    const { sessionId } = params;
    const url = new URL(req.url);
    const userId = url.searchParams.get("userId") || session.userId || session.id;

    const room = getOrCreateRoom(sessionId);
    cleanStalePeers(room);

    // Update receiver lastSeen
    const currentPeer = room.peers.get(userId);
    if (currentPeer) {
      currentPeer.lastSeen = Date.now();
    }

    // Fetch and flush queued signals
    const signals = room.signals.get(userId) || [];
    room.signals.set(userId, []);

    const activePeers = Array.from(room.peers.values()).filter((p) => p.userId !== userId);

    return apiSuccess({
      signals,
      peers: activePeers,
    });
  } catch (error: any) {
    console.error("[Signaling Poll Error]:", error);
    return apiError("Signaling poll failed", 500);
  }
}
