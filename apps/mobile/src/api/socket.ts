import { io, Socket } from "socket.io-client";
import { SOCKET_EVENTS } from "@fetchlocation/shared";
import { API_URL } from "../config";
import { tokenStore } from "./tokenStore";

let socket: Socket | null = null;

export async function connectSocket(): Promise<Socket> {
  if (socket?.connected) return socket;

  const accessToken = await tokenStore.getAccessToken();
  socket = io(API_URL, {
    auth: { token: accessToken },
    transports: ["websocket"],
  });
  return socket;
}

export function joinCircleRoom(circleId: string) {
  socket?.emit(SOCKET_EVENTS.JOIN_CIRCLE, { circleId });
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}

export { SOCKET_EVENTS };
export type { Socket };
