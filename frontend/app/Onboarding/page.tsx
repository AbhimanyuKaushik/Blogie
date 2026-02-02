"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function OnboardingPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    age: "",
    bio: "",
    location: "",
    interests: [],
    social: {
      instagram: "",
      twitter: "",
      linkedin: "",
    },
  });

  const submit = async () => {
    await fetch("http://localhost:5000/api/profile/onboarding", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify(form),
    });

    router.push("/");
  };

  return (
    <div className="max-w-xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Tell us a bit about yourself</h1>
      <button
        onClick={submit}
        className="mt-6 bg-green-600 text-white px-4 py-2"
      >
        Continue
      </button>

      <button
        onClick={() => router.push("/feed")}
        className="block mt-4 text-sm text-gray-500"
      >
        Skip for now
      </button>
    </div>
  );
}
