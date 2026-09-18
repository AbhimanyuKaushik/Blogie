"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import InterestCard from "../Components/InterestCard";

import {
  Trophy,
  Clapperboard,
  Landmark,
  Gamepad2,
  Cpu,
  Music2,
} from "lucide-react";

export default function OnboardingPage() {
  const router = useRouter();

  // ============================================
  // INTERESTS
  // ============================================

  const INTERESTS = [
    {
      title: "Sports",
      icon: Trophy,
    },
    {
      title: "Movies",
      icon: Clapperboard,
    },
    {
      title: "Politics",
      icon: Landmark,
    },
    {
      title: "Gaming",
      icon: Gamepad2,
    },
    {
      title: "Technology",
      icon: Cpu,
    },
    {
      title: "Music",
      icon: Music2,
    },
  ];

  // ============================================
  // STATE
  // ============================================

  const [stage, setStage] = useState(1);

  const [form, setForm] = useState({
    name: "",
    age: "",
    bio: "",
    location: "",
    interests: [] as string[],
    social: {
      instagram: "",
      twitter: "",
      linkedin: "",
    },
  });

  // ============================================
  // HANDLE INPUT CHANGE
  // ============================================

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // ============================================
  // TOGGLE INTEREST
  // ============================================

  const toggleInterest = (interest: string) => {
    setForm((prev) => {
      const isSelected = prev.interests.includes(interest);

      return {
        ...prev,

        interests: isSelected
          ? prev.interests.filter((i) => i !== interest)
          : [...prev.interests, interest],
      };
    });
  };

  const selectedInterest = form.interests.length > 0;

  // ============================================
  // SUBMIT ONBOARDING
  // ============================================

  const submit = async () => {
    try {
      const res = await fetch("http://localhost:8080/api/profile/onboarding", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        console.error("Onboarding failed:", await res.text());
        return;
      }

      router.push("/");
    } catch (error) {
      console.error("Onboarding submission error:", error);
    }
  };

  // ============================================
  // UI
  // ============================================

  return (
    <div className="min-h-screen mx-auto p-6 bg-blue-50">
      {/* ============================================
          STAGE 1 - INTERESTS
      ============================================ */}

      {stage === 1 && (
        <div>
          <h1 className="text-2xl font-bold mb-4 text-center text-black">
            Tell us about your interests
          </h1>

          <div className="grid sm:grid-cols-3 md:grid-cols-4 gap-4 max-w-4xl mx-auto mt-6">
            {INTERESTS.map((interest) => {
              const Icon = interest.icon;

              return (
                <InterestCard
                  key={interest.title}
                  title={interest.title}
                  selected={form.interests.includes(interest.title)}
                  icon={Icon}
                  onClick={() => toggleInterest(interest.title)}
                />
              );
            })}
          </div>

          {/* Bottom buttons */}

          <div className="fixed bottom-6 right-6 flex items-center gap-4">
            <button
              onClick={() => router.push("/feed")}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Skip for now
            </button>

            <button
              onClick={() => setStage(2)}
              disabled={!selectedInterest}
              className={`px-6 py-2 text-white rounded-md ${
                selectedInterest
                  ? "bg-green-500 hover:bg-green-600"
                  : "bg-gray-400 cursor-not-allowed"
              }`}
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* ============================================
          STAGE 2 - PROFILE
      ============================================ */}

      {stage === 2 && (
        <div className="border-2 w-full min-h-screen flex flex-col items-center">
          <h1 className="text-black text-2xl font-bold mt-6">
            Complete your profile
          </h1>

          <div className="mt-10 flex flex-col gap-10">
            {/* Name */}

            <div className="text-black flex items-center gap-4">
              <label className="w-20">Name:</label>

              <input
                name="name"
                className="bg-white border rounded px-3 py-2"
                type="text"
                placeholder="Name"
                value={form.name}
                onChange={handleChange}
              />
            </div>

            {/* Age */}

            <div className="text-black flex items-center gap-4">
              <label className="w-20">Age:</label>

              <input
                name="age"
                className="bg-white border rounded px-3 py-2"
                type="number"
                placeholder="Age"
                value={form.age}
                onChange={handleChange}
              />
            </div>

            {/* Bio */}

            <div className="text-black flex items-center gap-4">
              <label className="w-20">Bio:</label>

              <input
                name="bio"
                className="bg-white border rounded px-3 py-2"
                type="text"
                placeholder="Bio"
                value={form.bio}
                onChange={handleChange}
              />
            </div>
          </div>

          {/* Bottom buttons */}

          <div className="fixed bottom-6 right-6 flex items-center gap-4">
            <button
              onClick={() => router.push("/feed")}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Skip for now
            </button>

            <button
              onClick={submit}
              disabled={!selectedInterest}
              className={`px-6 py-2 text-white rounded-md ${
                selectedInterest
                  ? "bg-green-500 hover:bg-green-600"
                  : "bg-gray-400 cursor-not-allowed"
              }`}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
