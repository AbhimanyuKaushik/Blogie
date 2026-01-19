"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import InterestCard from "../Components/InterestCard";

export default function OnboardingPage() {
  const router = useRouter();

  const INTERESTS = [
    {
      title: "Sports",
      image: "https://images.unsplash.com/photo-1517649763962-0c623066013b",
    },
    {
      title: "Movies",
      image: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba",
    },
    {
      title: "Politics",
      image: "https://images.unsplash.com/photo-1529107386315-e1a2ed48a620",
    },
    {
      title: "Gaming",
      image: "https://images.unsplash.com/photo-1511512578047-dfb367046420",
    },
    {
      title: "Technology",
      image: "https://images.unsplash.com/photo-1518770660439-4636190af475",
    },
    {
      title: "Music",
      image: "https://images.unsplash.com/photo-1511379938547-c1f69419868d",
    },
  ];

  const [stage, setStage] = useState(1);
  const [form, setForm] = useState({
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

  const submit = async () => {
    await fetch("http://localhost:5000/api/profile/onboarding", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify(form),
    });

    router.push("/Feed");
  };

  return (
    <div className="min-h-screen mx-auto p-6 bg-blue-50">
      {stage === 1 && (
        <div>
          <h1 className="text-2xl font-bold mb-4 text-center text-black">
            Tell us about your interests
          </h1>
          <div className="grid sm:grid-cols-3 md:grid-cols-4 gap-4 max-w-4xl mx-auto mt-6">
            {INTERESTS.map((interest) => (
              <InterestCard
                key={interest.title}
                title={interest.title}
                selected={form.interests.includes(interest.title)}
                images={interest.image}
                onClick={() => toggleInterest(interest.title)}
              />
            ))}
          </div>
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
              className={`px-6 py-2 bg-green-500 text-white rounded-md 
          ${
            selectedInterest
              ? "bg-green-500 hover:bg-gray-500"
              : "bg-gray-400 cursor-not-allowed"
          }
        `}
            >
              Next
            </button>
          </div>
        </div>
      )}
      {stage === 2 && (
        <div className="border-2 w-full h-screen flex flex-col items-center">
          <h1 className="text-black">Complete your profile</h1>
          <div className="mt-10 flex flex-col gap-10">
            <div className="text-black">
              Name:
              <input
                id="name"
                className="bg-white"
                type="text"
                placeholder="Name"
              />
            </div>
            <div className="text-black">
              Age:
              <input
                id="age"
                className="bg-white"
                type="number"
                placeholder="Age"
              />
            </div>
            <div className="text-black">
              Bio:
              <input
                id="bio"
                className="bg-white"
                type="text"
                placeholder="Bio"
              />
            </div>
          </div>
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
          className={`px-6 py-2 bg-green-500 text-white rounded-md 
          ${
            selectedInterest
              ? "bg-green-500 hover:bg-gray-500"
              : "bg-gray-400 cursor-not-allowed"
          }
        `}
        >
          Next
        </button>
      </div>
        </div>
      )}
    </div>
  );
}
