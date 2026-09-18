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

  const { refetchUser } = useAuth();

  const onChangeHandler = (e: React.ChangeEvent<HTMLInputElement>) => {
    setData({
      ...data,
      [e.target.name]: e.target.value,
    });
  };

  // ============================================
  // GOOGLE OAUTH
  // ============================================
  const handleGoogleLogin = () => {
    setError("");

    // Redirect browser to Express OAuth endpoint.
    // Express will redirect the user to Google.
    window.location.href = `${API_BASE_URL}/auth/google`;
  };

  // ============================================
  // NORMAL LOGIN / SIGNUP
  // ============================================
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

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
        setError(result.message || "Something went wrong");
        return;
      }

      // Refresh AuthContext with the newly created session.
      await refetchUser();

      onClose();

      // Existing onboarding logic.
      if (isLogin && result.user.isOnboarded) {
        router.push("/");
      } else {
        router.push("/Onboarding");
      }
    } catch (error) {
      console.error("AUTH ERROR:", error);
      setError("Server error. Please try again.");
    }
  };

  return (
    <div className="login-popup fixed inset-0 z-50 bg-[#00000090] grid">
      <form
        onSubmit={handleSubmit}
        className="login-popup-container place-self-center bg-white p-6 rounded-lg flex flex-col gap-4 w-[350px]"
      >
        {/* ============================================
            HEADER
        ============================================ */}
        <div className="flex justify-between items-center text-xl font-bold">
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

        {/* ============================================
            GOOGLE LOGIN
        ============================================ */}
        <button
          type="button"
          onClick={handleGoogleLogin}
          className="w-full border border-gray-300 rounded-lg py-2.5 flex items-center justify-center gap-3 hover:bg-gray-50 transition-colors"
        >
          {/* Google logo */}
          <span className="text-lg font-bold">G</span>

          <span className="text-sm font-medium">Continue with Google</span>
        </button>

        {/* ============================================
            DIVIDER
        ============================================ */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-gray-200" />

          <span className="text-xs text-gray-500">OR</span>

          <div className="flex-1 h-px bg-gray-200" />
        </div>

        {/* ============================================
            SIGNUP NAME
        ============================================ */}
        {currState === "Sign Up" && (
          <input
            className="border p-2 rounded"
            name="name"
            value={data.name}
            onChange={onChangeHandler}
            type="text"
            placeholder="Your Name"
            required
          />
        )}

        {/* ============================================
            EMAIL
        ============================================ */}
        <input
          className="border p-2 rounded"
          name="email"
          value={data.email}
          onChange={onChangeHandler}
          type="email"
          placeholder="Your email"
          required
        />

        {/* ============================================
            PASSWORD
        ============================================ */}
        <input
          className="border p-2 rounded"
          name="password"
          value={data.password}
          onChange={onChangeHandler}
          type="password"
          placeholder="Your password"
          required
        />

        {/* ============================================
            ERROR
        ============================================ */}
        {error && <p className="text-red-500 text-sm">{error}</p>}

        {/* ============================================
            NORMAL LOGIN / SIGNUP BUTTON
        ============================================ */}
        <button
          type="submit"
          className="p-2 bg-green-600 text-white rounded text-sm hover:bg-green-700 transition-colors"
        >
          {currState === "Sign Up" ? "Create account" : "Login"}
        </button>

        {/* ============================================
            TERMS
        ============================================ */}
        <div className="flex items-start gap-2 text-sm">
          <input type="checkbox" required />

          <p>By continuing, I agree to the terms of use & privacy policy.</p>
        </div>

        {/* ============================================
            SWITCH LOGIN / SIGNUP
        ============================================ */}
        {currState === "Login" ? (
          <p className="text-sm">
            Create a new account?{" "}
            <span
              className="text-green-600 cursor-pointer hover:underline"
              onClick={() => {
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
              className="text-green-600 cursor-pointer hover:underline"
              onClick={() => {
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
