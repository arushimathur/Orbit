"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { LocationUpdateEvent, MemberLocation, SOCKET_EVENTS } from "@fetchlocation/shared";
import { useAuth } from "../../context/AuthContext";
import { useCircle } from "../../context/CircleContext";
import * as api from "../../api/endpoints";
import { connectSocket, disconnectSocket, joinCircleRoom } from "../../api/socket";
import { MapView } from "../../components/MapView";

function lastSeenLabel(recordedAt: string): string {
  const minutesAgo = Math.max(0, Math.round((Date.now() - new Date(recordedAt).getTime()) / 60000));
  if (minutesAgo < 1) return "just now";
  if (minutesAgo < 60) return `${minutesAgo}m ago`;
  return `${Math.round(minutesAgo / 60)}h ago`;
}

export default function MapPage() {
  const router = useRouter();
  const { user, isLoading: isAuthLoading, logout } = useAuth();
  const { circle, isLoading: isCircleLoading } = useCircle();
  const [memberLocations, setMemberLocations] = useState<Record<string, MemberLocation>>({});
  const pollRef = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => {
    if (isAuthLoading || isCircleLoading) return;
    if (!user) router.replace("/login");
    else if (!circle) router.replace("/circle");
  }, [user, isAuthLoading, circle, isCircleLoading, router]);

  useEffect(() => {
    if (!circle) return;

    const loadLatest = async () => {
      const latest = await api.getLatestLocations(circle.id);
      setMemberLocations(Object.fromEntries(latest.map((m) => [m.user.id, m])));
    };
    loadLatest();
    // Fallback refresh in case a socket update is missed while the tab was backgrounded.
    pollRef.current = setInterval(loadLatest, 60000);

    const socket = connectSocket();
    joinCircleRoom(circle.id);
    const onLocationUpdate = (event: LocationUpdateEvent) => {
      if (event.circleId !== circle.id) return;
      setMemberLocations((prev) => ({ ...prev, [event.user.id]: { user: event.user, ping: event.ping } }));
    };
    socket.on(SOCKET_EVENTS.LOCATION_UPDATE, onLocationUpdate);

    return () => {
      socket.off(SOCKET_EVENTS.LOCATION_UPDATE, onLocationUpdate);
      disconnectSocket();
      clearInterval(pollRef.current);
    };
  }, [circle]);

  if (!circle) return null;

  const members = Object.values(memberLocations);

  return (
    <main style={styles.container}>
      <aside style={styles.sidebar}>
        <div style={styles.sidebarHeader}>
          <h2 style={{ margin: 0 }}>{circle.name}</h2>
          <p style={styles.inviteCode}>Invite code: {circle.inviteCode}</p>
        </div>
        <ul style={styles.list}>
          {members.map(({ user: member, ping }) => (
            <li key={member.id} style={styles.row}>
              <span style={styles.name}>{member.name}</span>
              <span style={styles.meta}>
                {ping
                  ? `${lastSeenLabel(ping.recordedAt)}${
                      ping.batteryPct !== null ? ` · ${Math.round(ping.batteryPct)}% battery` : ""
                    }`
                  : "No location yet"}
              </span>
            </li>
          ))}
        </ul>
        <button style={styles.logoutButton} onClick={logout}>
          Log out
        </button>
      </aside>
      <div style={styles.mapArea}>
        <MapView members={members} />
      </div>
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { display: "flex", height: "100vh" },
  sidebar: { width: 300, borderRight: "1px solid #ddd", display: "flex", flexDirection: "column", padding: 16 },
  sidebarHeader: { marginBottom: 16 },
  inviteCode: { color: "#666", fontSize: 13 },
  list: { listStyle: "none", padding: 0, margin: 0, flex: 1, overflowY: "auto" },
  row: { display: "flex", flexDirection: "column", padding: "10px 0", borderBottom: "1px solid #f0f0f0" },
  name: { fontWeight: 600 },
  meta: { color: "#666", fontSize: 13 },
  logoutButton: { padding: 10, borderRadius: 8, border: "1px solid #ccc", background: "white" },
  mapArea: { flex: 1 },
};
