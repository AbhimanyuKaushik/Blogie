"use client";

import { createClient } from "@liveblocks/client";
import { createRoomContext } from "@liveblocks/react";
import { API_URL } from "./config";

export type Presence = {
  cursor: { x: number; y: number } | null;
};

export type UserMeta = {
  id: string;
  info: {
    name: string;
    color: string;
    role: string;
  };
};

export type Storage = Record<string, never>;

const client = createClient({
  authEndpoint: async (room) => {
    const response = await fetch(`${API_URL}/api/liveblocks/auth`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ room }),
    });

    if (!response.ok) {
      throw new Error("Failed to authenticate with Liveblocks");
    }

    return response.json();
  },
});

export const {
  RoomProvider,
  useRoom,
  useOthers,
  useSelf,
  useMyPresence,
  useUpdateMyPresence,
} = createRoomContext<Presence, Storage, UserMeta>(client);
