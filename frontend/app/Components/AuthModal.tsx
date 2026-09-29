"use client";

import { useState } from "react";
import Image from "next/image";
import { useAuth } from "../Context/AuthContext";
import { useRouter } from "next/navigation";

const API_BASE_URL = "http://localhost:8080/api";

export default function AuthModal({ onClose }: { onClose: () => void }) {
  const router = useRouter();

  const [currState, setCurrState] = useState<"Login" | "Sign Up">("Login");

  const [data, setData] = useState({
    name: "",
    email: "",
    password: "",
  });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const { refetchUser } = useAuth();

  // ============================================================
  // INPUT CHANGE
  // ============================================================

  const onChangeHandler = (e: React.ChangeEvent<HTMLInputElement>) => {
    setData({
      ...data,
      [e.target.name]: e.target.value,
    });
  };

  // ============================================================
  // GOOGLE OAUTH
  // ============================================================

  const handleGoogleLogin = () => {
    setError("");

    window.location.href = `${API_BASE_URL}/auth/google`;
  };

  // ============================================================
  // NORMAL LOGIN / SIGNUP
  // ============================================================

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (loading) return;

    setError("");
    setLoading(true);

    const isLogin = currState === "Login";

    const url = isLogin
      ? `${API_BASE_URL}/auth/login`
      : `${API_BASE_URL}/auth/register`;

    const body = isLogin
      ? {
          email: data.email,
          password: data.password,
        }
      : {
          username: data.name,
          email: data.email,
          password: data.password,
        };

    try {
      // ========================================================
      // AUTH REQUEST
      // ========================================================

      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(body),
      });

      const result = await res.json();

      if (!res.ok) {
        setError(result.message || "Something went wrong.");
        return;
      }

      // ========================================================
      // REFRESH AUTH CONTEXT
      // ========================================================
      //
      // IMPORTANT:
      //
      // Do NOT use:
      //
      // result.user.isOnboarded
      //
      // because the login endpoint may not return `user`.
      //
      // refetchUser() calls /api/auth/me and returns the
      // authenticated user from the current session.
      //
      // ========================================================

      const authenticatedUser = await refetchUser();

      if (!authenticatedUser) {
        setError("Authentication succeeded, but the user could not be loaded.");
        return;
      }

      // ========================================================
      // CLOSE MODAL
      // ========================================================

      onClose();

      // ========================================================
      // ONBOARDING REDIRECT
      // ========================================================

      if (authenticatedUser.isOnboarded) {
        router.replace("/");
      } else {
        router.replace("/Onboarding");
      }
    } catch (error) {
      console.error("AUTH ERROR:", error);

      setError("Server error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-popup fixed inset-0 z-50 grid bg-[#00000090]">
      <form
        onSubmit={handleSubmit}
        className="login-popup-container place-self-center flex w-87.5 flex-col gap-4 rounded-lg bg-white p-6"
      >
        {/* ==================================================
            HEADER
        ================================================== */}

        <div className="flex items-center justify-between text-xl font-bold">
          <h2>{currState}</h2>

          <Image
            className="w-4 cursor-pointer"
            src="/cross_icon.png"
            width={16}
            height={16}
            onClick={onClose}
            alt="Close"
          />
        </div>

        {/* ==================================================
            GOOGLE LOGIN
        ================================================== */}

        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={loading}
          className="flex w-full items-center justify-center gap-3 rounded-lg border border-gray-300 py-2.5 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {/* Google logo */}

          <span className="text-lg font-bold">G</span>

          <span className="text-sm font-medium">Continue with Google</span>
        </button>

        {/* ==================================================
            DIVIDER
        ================================================== */}

        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-gray-200" />

          <span className="text-xs text-gray-500">OR</span>

          <div className="h-px flex-1 bg-gray-200" />
        </div>

        {/* ==================================================
            SIGNUP NAME
        ================================================== */}

        {currState === "Sign Up" && (
          <input
            className="rounded border p-2"
            name="name"
            value={data.name}
            onChange={onChangeHandler}
            type="text"
            placeholder="Your Name"
            disabled={loading}
            required
          />
        )}

        {/* ==================================================
            EMAIL
        ================================================== */}

        <input
          className="rounded border p-2"
          name="email"
          value={data.email}
          onChange={onChangeHandler}
          type="email"
          placeholder="Your email"
          disabled={loading}
          required
        />

        {/* ==================================================
            PASSWORD
        ================================================== */}

        <input
          className="rounded border p-2"
          name="password"
          value={data.password}
          onChange={onChangeHandler}
          type="password"
          placeholder="Your password"
          disabled={loading}
          required
        />

        {/* ==================================================
            ERROR
        ================================================== */}

        {error && <p className="text-sm text-red-500">{error}</p>}

        {/* ==================================================
            LOGIN / SIGNUP BUTTON
        ================================================== */}

        <button
          type="submit"
          disabled={loading}
          className="rounded bg-green-600 p-2 text-sm text-white transition-colors hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-gray-400"
        >
          {loading
            ? "Please wait..."
            : currState === "Sign Up"
              ? "Create account"
              : "Login"}
        </button>

        {/* ==================================================
            TERMS
        ================================================== */}

        <div className="flex items-start gap-2 text-sm">
          <input type="checkbox" disabled={loading} required />

          <p>By continuing, I agree to the terms of use & privacy policy.</p>
        </div>

        {/* ==================================================
            SWITCH LOGIN / SIGNUP
        ================================================== */}

        {currState === "Login" ? (
          <p className="text-sm">
            Create a new account?{" "}
            <span
              className="cursor-pointer text-green-600 hover:underline"
              onClick={() => {
                if (loading) return;

                setCurrState("Sign Up");
                setError("");
              }}
            >
              Click here
            </span>
          </p>
        ) : (
          <p className="text-sm">
            Already have an account?{" "}
            <span
              className="cursor-pointer text-green-600 hover:underline"
              onClick={() => {
                if (loading) return;

                setCurrState("Login");
                setError("");
              }}
            >
              Login here
            </span>
          </p>
        )}
      </form>
    </div>
  );
}
