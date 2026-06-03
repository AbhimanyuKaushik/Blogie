"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";

import {
  User,
} from "../Types/UserTypes";

type AuthContextType =
  {
    user:
      | User
      | null;

    loading:
      boolean;

    logout:
      () => Promise<void>;

    refetchUser:
      () => Promise<void>;
  };

const AuthContext =
  createContext<
    AuthContextType | null
  >(null);

export function AuthProvider({
  children,
}: {
  children:
    ReactNode;
}) {

  const [
    user,
    setUser,
  ] = useState<
    User | null
  >(null);

  const [
    loading,
    setLoading,
  ] = useState(
    true,
  );

  // -----------------------------------
  // INITIAL AUTH CHECK
  // -----------------------------------

  useEffect(() => {

    const fetchMe =
      async () => {

        try {

          const res =
            await fetch(
              "http://localhost:5000/api/auth/me",
              {
                credentials:
                  "include",
              },
            );

          if (
            !res.ok
          ) {
            setUser(
              null,
            );

            return;
          }

          const data =
            await res.json();

          if (
            data.authenticated
          ) {

            const normalizedUser =
              {
                ...data.user,

                _id:
                  data.user
                    ?._id ||
                  data._id,

                id:
                  data.user
                    ?.id ||
                  data.user
                    ?._id ||
                  data._id,
              };

            console.log(
              "Auth normalized user:",
              normalizedUser,
            );

            setUser(
              normalizedUser,
            );
          }

        } catch (
          err
        ) {

          console.error(
            "Auth check failed",
            err,
          );

          setUser(
            null,
          );

        } finally {

          setLoading(
            false,
          );
        }
      };

    fetchMe();

  }, []);

  // -----------------------------------
  // LOGOUT
  // -----------------------------------

  const logout =
    async () => {

      try {

        await fetch(
          "http://localhost:5000/api/auth/logout",
          {
            method:
              "POST",

            credentials:
              "include",
          },
        );

        setUser(
          null,
        );

      } catch (
        error
      ) {

        console.error(
          "Logout failed",
          error,
        );
      }
    };

  // -----------------------------------
  // REFETCH
  // -----------------------------------

  const refetchUser =
    async () => {

      setLoading(
        true,
      );

      const res =
        await fetch(
          "http://localhost:5000/api/auth/me",
          {
            credentials:
              "include",
          },
        );

      if (
        res.ok
      ) {

        const data =
          await res.json();

        const normalizedUser =
          {
            ...data.user,

            _id:
              data.user
                ?._id ||
              data._id,

            id:
              data.user
                ?.id ||
              data.user
                ?._id ||
              data._id,
          };

        console.log(
          "Refetched user:",
          normalizedUser,
        );

        setUser(
          normalizedUser,
        );
      }

      setLoading(
        false,
      );
    };

  return (
    <AuthContext.Provider
      value={{
        user,

        loading,

        logout,

        refetchUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {

  const context =
    useContext(
      AuthContext,
    );

  if (
    !context
  ) {
    throw new Error(
      "useAuth must be used within an AuthProvider",
    );
  }

  return context;
}