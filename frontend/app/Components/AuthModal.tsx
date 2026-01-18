"use client";
import { useState } from "react";
import Image from "next/image";
import { useAuth } from "../Context/AuthContext";
import { useRouter } from "next/navigation";

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
    setData({ ...data, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const isLogin = currState === "Login";

    const url = isLogin
      ? "http://localhost:5000/api/auth/login"
      : "http://localhost:5000/api/auth/register";

    const body = isLogin
      ? { email: data.email, password: data.password }
      : {
          username: data.name,
          email: data.email,
          password: data.password,
        };

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });

      const result = await res.json();

      if (!res.ok) {
        setError(result.message || "Something went wrong");
        return;
      }

      await refetchUser();
      onClose();

      if (isLogin && result.user.isOnboarded) {
        router.push("/feed");
      } else {
        router.push("/Onboarding");
      }
    } catch (err) {
      setError("Server error. Please try again.");
    }
  };

  return (
    <div className="login-popup fixed inset-0 z-50 bg-[#00000090] grid">
      <form
        onSubmit={handleSubmit}
        className="login-popup-container place-self-center bg-white p-6 rounded-lg flex flex-col gap-4 w-[360px]"
      >
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

        <input
          className="border p-2 rounded"
          name="email"
          value={data.email}
          onChange={onChangeHandler}
          type="email"
          placeholder="Your email"
          required
        />

        <input
          className="border p-2 rounded"
          name="password"
          value={data.password}
          onChange={onChangeHandler}
          type="password"
          placeholder="Your password"
          required
        />

        {error && <p className="text-red-500 text-sm">{error}</p>}

        <button
          type="submit"
          className="p-2 bg-green-600 text-white rounded text-sm"
        >
          {currState === "Sign Up" ? "Create account" : "Login"}
        </button>

        <div className="flex items-start gap-2 text-sm">
          <input type="checkbox" required />
          <p>By continuing, I agree to the terms of use & privacy policy.</p>
        </div>

        {currState === "Login" ? (
          <p className="text-sm">
            Create a new account?{" "}
            <span
              className="text-green-600 cursor-pointer"
              onClick={() => setCurrState("Sign Up")}
            >
              Click here
            </span>
          </p>
        ) : (
          <p className="text-sm">
            Already have an account?{" "}
            <span
              className="text-green-600 cursor-pointer"
              onClick={() => setCurrState("Login")}
            >
              Login here
            </span>
          </p>
        )}
      </form>
    </div>
  );
}
