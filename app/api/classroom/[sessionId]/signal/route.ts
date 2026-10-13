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
  joinedAt: number;
}

interface SignalItem {
  id: string;
  fromUserId: string;
  toUserId: string;
  type:
    | "offer"
    | "answer"
    | "candidate"
    | "media-state"
    | "peer-left"
    | "peer-joined"
    | "class-ended"
    | "whiteboard-update"
    | "draw-permission";
  payload: any;
  timestamp: number;
}

interface RoomSignalingState {
  canonicalId: string;
  peers: Map<string, PeerState>;
  signals: Map<string, SignalItem[]>; // destination userId -> pending signals
  isEnded?: boolean;
  endedAt?: number;
  whiteboardState?: any;
}

// Global in-memory storage for classroom signaling
declare global {
  var __classroomSignaling: Map<string, RoomSignalingState> | undefined;
  var __classroomSessionAliasMap: Map<string, string> | undefined;
}

if (!global.__classroomSignaling) {
  global.__classroomSignaling = new Map<string, RoomSignalingState>();
}
if (!global.__classroomSessionAliasMap) {
  global.__classroomSessionAliasMap = new Map<string, string>();
}

const signalingStore = global.__classroomSignaling;
const aliasMap = global.__classroomSessionAliasMap;

function getOrCreateRoom(roomId: string): RoomSignalingState {
  let room = signalingStore.get(roomId);
  if (!room) {
    room = {
      canonicalId: roomId,
      peers: new Map<string, PeerState>(),
      signals: new Map<string, SignalItem[]>(),
    };
    signalingStore.set(roomId, room);
  }
  return room;
}

function cleanStalePeers(room: RoomSignalingState, timeoutMs = 20000) {
  const now = Date.now();
  for (const [peerId, peer] of Array.from(room.peers.entries())) {
    if (now - peer.lastSeen > timeoutMs) {
      room.peers.delete(peerId);
      room.signals.delete(peerId);
      // Notify remaining peers that this peer timed out / left
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

// Helper to resolve canonical room ID from any session alias (slotId, sessionId, roomId)
async function resolveCanonicalRoomId(sessionId: string, session: any): Promise<string> {
  const cached = aliasMap.get(sessionId);
  if (cached) return cached;

  const accessCheck = await verifyRoomAccess(sessionId, session);
  if (accessCheck.authorized && accessCheck.liveSession?.id) {
    const canonicalId = accessCheck.liveSession.id;
    aliasMap.set(sessionId, canonicalId);
    if (accessCheck.liveSession.liveClassSlotId) {
      aliasMap.set(accessCheck.liveSession.liveClassSlotId, canonicalId);
    }
    if (accessCheck.liveSession.roomId) {
      aliasMap.set(accessCheck.liveSession.roomId, canonicalId);
    }
    return canonicalId;
  }
  return sessionId;
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

    const canonicalRoomId = accessCheck.liveSession?.id || (await resolveCanonicalRoomId(sessionId, session));

    // Register all aliases
    if (accessCheck.liveSession) {
      aliasMap.set(sessionId, canonicalRoomId);
      if (accessCheck.liveSession.liveClassSlotId) aliasMap.set(accessCheck.liveSession.liveClassSlotId, canonicalRoomId);
      if (accessCheck.liveSession.roomId) aliasMap.set(accessCheck.liveSession.roomId, canonicalRoomId);
    }

    const body = await req.json();
    const { action, userId, userName, role, isAudioOn, isVideoOn, isScreenSharing, toUserId, type, payload } = body;

    const currentUserId = session.userId || session.id;
    const effectiveUserId = userId || currentUserId;
    const effectiveUserName = userName || `${session.firstName || ""} ${session.lastName || ""}`.trim() || session.email;
    const effectiveRole = role || session.role || (accessCheck.isTeacher ? "TEACHER" : "STUDENT");

    const room = getOrCreateRoom(canonicalRoomId);
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
        joinedAt: existingPeer?.joinedAt || now,
      };
      room.peers.set(effectiveUserId, peerState);

      if (!room.signals.has(effectiveUserId)) {
        room.signals.set(effectiveUserId, []);
      }

      // Notify all other active peers in room immediately that this peer joined
      for (const destId of Array.from(room.peers.keys())) {
        if (destId !== effectiveUserId) {
          const queue = room.signals.get(destId) || [];
          queue.push({
            id: Math.random().toString(36).substring(2),
            fromUserId: effectiveUserId,
            toUserId: destId,
            type: "peer-joined",
            payload: { peer: peerState },
            timestamp: now,
          });
          room.signals.set(destId, queue);
        }
      }

      // Return all active peers in room (including self)
      const allPeers = Array.from(room.peers.values());

      return apiSuccess({
        canonicalRoomId,
        self: peerState,
        peers: allPeers,
        peerCount: allPeers.length,
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

      return apiSuccess({ updated: true, peers: Array.from(room.peers.values()) });
    }

    if (action === "broadcast") {
      if (!type) {
        return apiError("Missing broadcast signal type", 400);
      }

      // Update sender lastSeen
      const sender = room.peers.get(effectiveUserId);
      if (sender) sender.lastSeen = now;

      if (type === "whiteboard-update") {
        (room as any).whiteboardState = payload?.elements;
      } else if (type === "class-ended") {
        (room as any).isEnded = true;
      }

      // Queue for all other peers in the room
      for (const destId of Array.from(room.peers.keys())) {
        if (destId !== effectiveUserId) {
          const queue = room.signals.get(destId) || [];
          queue.push({
            id: Math.random().toString(36).substring(2),
            fromUserId: effectiveUserId,
            toUserId: destId,
            type: type as any,
            payload,
            timestamp: now,
          });
          room.signals.set(destId, queue);
        }
      }

      return apiSuccess({ broadcast: true, peerCount: room.peers.size });
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
      return apiSuccess({ alive: true, peerCount: room.peers.size, isEnded: !!(room as any).isEnded });
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

    // Resolve canonical room ID
    const canonicalRoomId = await resolveCanonicalRoomId(sessionId, session);
    const room = getOrCreateRoom(canonicalRoomId);
    cleanStalePeers(room);

    // Update receiver lastSeen
    const currentPeer = room.peers.get(userId);
    if (currentPeer) {
      currentPeer.lastSeen = Date.now();
    }

    // Fetch and flush queued signals
    const signals = room.signals.get(userId) || [];
    room.signals.set(userId, []);

    const allPeers = Array.from(room.peers.values());

    return apiSuccess({
      canonicalRoomId,
      signals,
      peers: allPeers,
      peerCount: allPeers.length,
      isEnded: !!(room as any).isEnded,
      whiteboardState: (room as any).whiteboardState || null,
    });
  } catch (error: any) {
    console.error("[Signaling Poll Error]:", error);
    return apiError("Signaling poll failed", 500);
  }
}
