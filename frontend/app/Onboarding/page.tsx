"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Instagram,
  Linkedin,
  MapPin,
  Sparkles,
  Twitter,
  User,
  Trophy,
  Clapperboard,
  Landmark,
  Gamepad2,
  Cpu,
  Music2,
  Plane,
  Utensils,
  Dumbbell,
  BookOpen,
  Palette,
  Camera,
  Shirt,
  BriefcaseBusiness,
  FlaskConical,
  GraduationCap,
  Trees,
  Tv,
} from "lucide-react";

import InterestCard from "../Components/InterestCard";

const BRAND = "#00A63E";
const BRAND_DARK = "#008C35";

const INTERESTS = [
  { title: "Sports", icon: Trophy },
  { title: "Movies", icon: Clapperboard },
  { title: "Politics", icon: Landmark },
  { title: "Gaming", icon: Gamepad2 },
  { title: "Technology", icon: Cpu },
  { title: "Music", icon: Music2 },
  { title: "Travel", icon: Plane },
  { title: "Food", icon: Utensils },
  { title: "Fitness", icon: Dumbbell },
  { title: "Books", icon: BookOpen },
  { title: "Art", icon: Palette },
  { title: "Photography", icon: Camera },
  { title: "Fashion", icon: Shirt },
  { title: "Business", icon: BriefcaseBusiness },
  { title: "Science", icon: FlaskConical },
  { title: "Education", icon: GraduationCap },
  { title: "Nature", icon: Trees },
  { title: "Anime", icon: Tv },
];

type FormState = {
  name: string;
  age: string;
  bio: string;
  location: string;
  interests: string[];
  social: {
    instagram: string;
    twitter: string;
    linkedin: string;
  };
};

export default function OnboardingPage() {
  const router = useRouter();

  const [stage, setStage] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState("");
  const [coordinates, setCoordinates] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);

  const [form, setForm] = useState<FormState>({
    name: "",
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

  const selectedInterest = form.interests.length > 0;
  const progress = stage === 1 ? 50 : 100;

  const selectedText = useMemo(() => {
    const count = form.interests.length;

    if (count === 0) return "Choose at least one";

    return `${count} ${count === 1 ? "interest" : "interests"} selected`;
  }, [form.interests.length]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSocialChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      social: {
        ...prev.social,
        [name]: value,
      },
    }));
  };

  const toggleInterest = (interest: string) => {
    setForm((prev) => {
      const alreadySelected = prev.interests.includes(interest);

      return {
        ...prev,
        interests: alreadySelected
          ? prev.interests.filter((item) => item !== interest)
          : [...prev.interests, interest],
      };
    });
  };

  const goNext = () => {
    if (!selectedInterest) return;

    setError("");
    setStage(2);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const goBack = () => {
    setError("");
    setStage(1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const submit = async () => {
    if (!selectedInterest || isSubmitting) return;

    // Require a name before completing onboarding
    if (!form.name.trim()) {
      setError("Please enter your name before completing your profile.");
      return;
    }

    // Validate age only if provided
    if (
      form.age &&
      (!Number.isFinite(Number(form.age)) ||
        Number(form.age) < 13 ||
        Number(form.age) > 120)
    ) {
      setError("Please enter a valid age between 13 and 120.");
      return;
    }

    try {
      setIsSubmitting(true);
      setError("");

      const response = await fetch(
        "http://localhost:8080/api/profile/onboarding",
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            ...form,
            name: form.name.trim(),
            age: form.age ? Number(form.age) : "",
          }),
        },
      );

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.message || "Unable to save your profile.");
      }

      router.push("/");
    } catch (err) {
      console.error("ONBOARDING ERROR:", err);

      setError(
        err instanceof Error ? err.message : "Something went wrong. Try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const detectLocation = () => {
    if (!navigator.geolocation) {
      setLocationError("Your browser does not support location detection.");
      return;
    }

    setLocationLoading(true);
    setLocationError("");

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;

        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}&zoom=10`,
          );

          if (!response.ok) {
            throw new Error("Could not resolve your location.");
          }

          const data = await response.json();
          const address = data.address;

          const city =
            address.city ||
            address.town ||
            address.village ||
            address.municipality ||
            address.county;

          if (!city) {
            throw new Error(
              "Could not identify your city. Please enter it manually.",
            );
          }

          const readableLocation = [city, address.state, address.country]
            .filter(Boolean)
            .join(", ");

          setForm((previous) => ({
            ...previous,
            location: readableLocation,
          }));

          setCoordinates({ latitude, longitude });
        } catch (err) {
          setLocationError(
            err instanceof Error
              ? err.message
              : "Unable to resolve your location. Please enter it manually.",
          );
        } finally {
          setLocationLoading(false);
        }
      },
      (err) => {
        setLocationError(
          err.code === err.PERMISSION_DENIED
            ? "Location permission denied. Enter your location manually."
            : "Could not detect your location. Please try again.",
        );
        setLocationLoading(false);
      },
      {
        enableHighAccuracy: false,
        timeout: 10000,
        maximumAge: 300000,
      },
    );
  };

  const inputClass =
    "w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-[#00A63E] focus:bg-white focus:ring-4 focus:ring-[#00A63E]/10";

  const sectionClass =
    "rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7";

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 sm:px-8">
          <button
            type="button"
            onClick={() => router.push("/")}
            className="text-xl font-black tracking-tight"
          >
            Blogie<span className="text-[#00A63E]">.</span>
          </button>

          <div className="flex items-center gap-3 text-sm font-semibold text-slate-500">
            <span className="hidden sm:inline">Profile setup</span>
            <span className="rounded-full bg-slate-100 px-3 py-1.5">
              {stage} / 2
            </span>
          </div>
        </div>
      </header>

      <div className="h-1 bg-slate-100">
        <div
          className="h-full bg-[#00A63E] transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      <section className="mx-auto w-full max-w-6xl px-5 py-10 sm:px-8 sm:py-14">
        {stage === 1 && (
          <div className="animate-in fade-in duration-300">
            <div className="mx-auto max-w-3xl text-center">
              <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#00A63E]/10 text-[#00A63E]">
                <Sparkles size={27} />
              </div>

              <p className="mb-2 text-sm font-bold uppercase tracking-[0.18em] text-[#00A63E]">
                Step 1 of 2
              </p>

              <h1 className="text-3xl font-black tracking-tight sm:text-5xl">
                What are you into?
              </h1>

              <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-slate-500 sm:text-lg">
                Pick the topics you enjoy. We&apos;ll use them to personalize
                your Blogie feed and help you discover better conversations.
              </p>
            </div>

            <div className="mx-auto mt-8 flex max-w-6xl items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm sm:px-5">
              <div>
                <p className="text-sm font-bold">Your interests</p>
                <p className="text-xs text-slate-500">{selectedText}</p>
              </div>

              <span className="text-sm font-semibold text-slate-400">
                {form.interests.length}/{INTERESTS.length}
              </span>
            </div>

            <div className="mx-auto mt-6 grid max-w-6xl grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-6">
              {INTERESTS.map(({ title, icon: Icon }) => {
                const selected = form.interests.includes(title);

                return (
                  <InterestCard
                    key={title}
                    title={title}
                    selected={selected}
                    icon={Icon}
                    onClick={() => toggleInterest(title)}
                  />
                );
              })}
            </div>

            <div className="mx-auto mt-10 flex max-w-6xl flex-col-reverse gap-4 border-t border-slate-200 pt-6 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="button"
                onClick={() => router.push("/")}
                className="text-sm font-semibold text-slate-500 hover:text-slate-900"
              >
                Skip for now
              </button>

              <button
                type="button"
                onClick={goNext}
                disabled={!selectedInterest}
                className="group flex items-center justify-center gap-2 rounded-xl bg-[#00A63E] px-6 py-3 text-sm font-bold text-white shadow-lg shadow-[#00A63E]/20 transition hover:bg-[#008C35] disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
              >
                Continue
                <ArrowRight size={17} />
              </button>
            </div>
          </div>
        )}

        {stage === 2 && (
          <div className="mx-auto max-w-3xl animate-in fade-in duration-300">
            <button
              type="button"
              onClick={goBack}
              className="mb-6 flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-[#008C35]"
            >
              <ArrowLeft size={16} />
              Back to interests
            </button>

            <p className="mb-2 text-sm font-bold uppercase tracking-[0.18em] text-[#00A63E]">
              Step 2 of 2
            </p>

            <h1 className="text-3xl font-black tracking-tight sm:text-4xl">
              Make your profile yours
            </h1>

            <p className="mt-3 text-base leading-7 text-slate-500">
              Add a few details so other readers know who you are. You can
              change these later.
            </p>

            <div className="mt-8 space-y-5">
              <div className={sectionClass}>
                <div className="mb-6 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#00A63E]/5 text-[#00A63E]">
                    <User size={19} />
                  </div>

                  <div>
                    <h2 className="font-bold">Basic information</h2>
                    <p className="text-xs text-slate-500">A little about you</p>
                  </div>
                </div>

                <div className="grid gap-5 sm:grid-cols-2">
                  <label>
                    <span className="mb-2 block text-sm font-semibold text-slate-700">
                      Name
                    </span>
                    <input
                      name="name"
                      type="text"
                      placeholder="Your name"
                      value={form.name}
                      onChange={handleChange}
                      className={inputClass}
                    />
                  </label>

                  <label>
                    <span className="mb-2 block text-sm font-semibold text-slate-700">
                      Age
                    </span>
                    <input
                      name="age"
                      type="number"
                      min="13"
                      max="120"
                      placeholder="Your age"
                      value={form.age}
                      onChange={handleChange}
                      className={inputClass}
                    />
                  </label>
                </div>

                <label className="mt-5 block">
                  <span className="mb-2 block text-sm font-semibold text-slate-700">
                    Bio
                  </span>
                  <textarea
                    name="bio"
                    rows={4}
                    maxLength={300}
                    placeholder="Tell people what you write about or what you're curious about..."
                    value={form.bio}
                    onChange={handleChange}
                    className={`${inputClass} resize-none leading-6`}
                  />
                  <span className="mt-1 block text-right text-xs text-slate-400">
                    {form.bio.length}/300
                  </span>
                </label>

                <label className="mt-4 block">
                  <span className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
                    <MapPin size={15} />
                    Location
                  </span>
                  <input
                    name="location"
                    type="text"
                    placeholder="City, Country"
                    value={form.location}
                    onChange={handleChange}
                    className={inputClass}
                  />
                </label>
                <button
                  type="button"
                  onClick={detectLocation}
                  disabled={locationLoading}
                  className="mt-3 inline-flex items-center gap-2 rounded-lg bg-[#00A63E] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#008C35] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {locationLoading
                    ? "Detecting location..."
                    : "Detect my location"}
                </button>

                {locationError && (
                  <p className="mt-2 text-sm text-red-600" role="alert">
                    {locationError}
                  </p>
                )}

                {coordinates && (
                  <p className="mt-2 text-sm text-gray-600">
                    Location detected successfully.
                  </p>
                )}
              </div>

              <div className={sectionClass}>
                <div className="mb-6">
                  <h2 className="font-bold">
                    Social links{" "}
                    <span className="text-xs font-medium text-slate-400">
                      Optional
                    </span>
                  </h2>
                  <p className="mt-1 text-xs text-slate-500">
                    Let people find you elsewhere.
                  </p>
                </div>

                <div className="space-y-4">
                  {[
                    ["instagram", "Instagram username", Instagram],
                    ["twitter", "Twitter / X username", Twitter],
                    ["linkedin", "LinkedIn profile", Linkedin],
                  ].map(([name, placeholder, Icon]) => {
                    const FieldIcon = Icon as typeof Instagram;

                    return (
                      <label
                        key={name as string}
                        className="flex items-center gap-3"
                      >
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#00A63E]/5 text-[#008C35]">
                          <FieldIcon size={18} />
                        </div>

                        <input
                          name={name as string}
                          type="text"
                          placeholder={placeholder as string}
                          value={form.social[name as keyof typeof form.social]}
                          onChange={handleSocialChange}
                          className={inputClass}
                        />
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-3xl border border-[#00A63E]/20 bg-[#00A63E]/5 p-5 sm:p-7">
                <h2 className="font-bold">Your interests</h2>
                <div className="mt-4 flex flex-wrap gap-2">
                  {form.interests.map((interest) => (
                    <span
                      key={interest}
                      className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-[#008C35] shadow-sm ring-1 ring-[#00A63E]/20"
                    >
                      {interest}
                    </span>
                  ))}
                </div>
              </div>

              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                  {error}
                </div>
              )}
            </div>

            <div className="mt-8 flex flex-col-reverse gap-4 border-t border-slate-200 pt-6 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="button"
                onClick={() => router.push("/")}
                disabled={isSubmitting}
                className="text-sm font-semibold text-slate-500 hover:text-slate-900 disabled:opacity-50"
              >
                Skip for now
              </button>

              <button
                type="button"
                onClick={submit}
                disabled={!selectedInterest || isSubmitting}
                className="flex items-center justify-center gap-2 rounded-xl bg-[#00A63E] px-7 py-3 text-sm font-bold text-white shadow-lg shadow-[#00A63E]/20 transition hover:bg-[#008C35] disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
              >
                {isSubmitting ? "Saving profile..." : "Finish profile"}
                {!isSubmitting && <Check size={17} strokeWidth={3} />}
              </button>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
