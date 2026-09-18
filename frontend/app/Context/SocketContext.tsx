"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  io,
  Socket,
} from "socket.io-client";

import { useAuth } from "./AuthContext";

type NotificationType = {
  _id?: string;
  type: string;
  message: string;
  isRead?: boolean;
  post?: {
    _id: string;
    title: string;
  };
};

type SocketContextType = {
  socket: Socket | null;
  notifications: NotificationType[];
};

const SocketContext =
  createContext<SocketContextType>({
    socket: null,
    notifications: [],
  });

export function SocketProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } =
    useAuth();

  const [
    notifications,
    setNotifications,
  ] = useState<
    NotificationType[]
  >([]);

  const socketRef =
    useRef<
      Socket | null
    >(null);

  // -----------------------------------
  // CREATE SOCKET ONCE
  // -----------------------------------

  useEffect(() => {
    if (
      socketRef.current
    ) {
      return;
    }

    const socket =
      io(
        "http://localhost:5000/collaboration",
        {
          withCredentials:
            true,

          transports: [
            "websocket",
          ],
        },
      );

    socketRef.current =
      socket;

    socket.on(
      "connect",
      () => {
        console.log(
          "Frontend socket connected:",
          socket.id,
        );

        // register immediately if user exists

        if (
          user?._id
        ) {
          socket.emit(
            "register-user",
            user._id,
          );

          console.log(
            "Registered on connect:",
            user._id,
          );
        }
      },
    );

    return () => {
      socket.disconnect();

      socketRef.current =
        null;
    };
  }, []);

  // -----------------------------------
  // REGISTER WHEN USER CHANGES
  // -----------------------------------

  useEffect(() => {
    const socket =
      socketRef.current;

    if (
      !socket ||
      !user?._id
    ) {
      return;
    }

    socket.emit(
      "register-user",
      user._id,
    );

    console.log(
      "Registered on auth:",
      user._id,
    );
  }, [user?._id]);

  // -----------------------------------
  // FETCH NOTIFICATIONS
  // -----------------------------------

  useEffect(() => {
    if (!user)
      return;

    const fetchNotifications =
      async () => {
        const res =
          await fetch(
            "http://localhost:5000/api/notifications",
            {
              credentials:
                "include",
            },
          );

        if (
          !res.ok
        )
          return;

        const data =
          await res.json();

        setNotifications(
          data.notifications ||
            [],
        );
      };

    fetchNotifications();
  }, [user]);

  // -----------------------------------
  // REALTIME
  // -----------------------------------

  useEffect(() => {
    const socket =
      socketRef.current;

    if (!socket)
      return;

    const handler = (
      notification:
        NotificationType,
    ) => {
      console.log(
        "RECEIVED:",
        notification,
      );

      setNotifications(
        (
          prev,
        ) => [
          notification,
          ...prev,
        ],
      );

      alert(
        notification.message,
      );
    };

    socket.on(
      "new-notification",
      handler,
    );

    return () => {
      socket.off(
        "new-notification",
        handler,
      );
    };
  }, []);

  return (
    <SocketContext.Provider
      value={{
        socket:
          socketRef.current,

        notifications,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
}

export const useSocket =
  () =>
    useContext(
      SocketContext,
    );