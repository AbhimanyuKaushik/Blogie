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
} from "lucide-react";
import InterestCard from "../Components/InterestCard";

const INTERESTS = [
  ["Sports", "https://images.unsplash.com/photo-1517649763962-0c623066013b"],
  ["Movies", "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba"],
  ["Politics", "https://images.unsplash.com/photo-1529107386315-e1a2ed48a620"],
  ["Gaming", "https://images.unsplash.com/photo-1511512578047-dfb367046420"],
  [
    "Technology",
    "https://images.unsplash.com/photo-1518770660439-4636190af475",
  ],
  ["Music", "https://images.unsplash.com/photo-1511379938547-c1f69419868d"],
  ["Travel", "https://images.unsplash.com/photo-1488646953014-85cb44e25828"],
  ["Food", "https://images.unsplash.com/photo-1504674900247-0877df9cc836"],
  ["Fitness", "https://images.unsplash.com/photo-1534438327276-14e5300c3a48"],
  ["Books", "https://images.unsplash.com/photo-1495446815901-a7297e633e8d"],
  ["Art", "https://images.unsplash.com/photo-1561214115-f2f134cc4912"],
  [
    "Photography",
    "https://images.unsplash.com/photo-1452780212940-6f5c0d14d848",
  ],
  ["Fashion", "https://images.unsplash.com/photo-1490481651871-ab68de25d43d"],
  ["Business", "https://images.unsplash.com/photo-1556761175-b413da4baf72"],
  ["Science", "https://images.unsplash.com/photo-1532094349884-543bc11b234d"],
  ["Education", "https://images.unsplash.com/photo-1503676260728-1c00da094a0b"],
  ["Nature", "https://images.unsplash.com/photo-1441974231531-c6227db76b6e"],
  ["Anime", "https://images.unsplash.com/photo-1578632767115-351597cf2477"],
];

type FormState = {
  name: string;
  age: string;
  bio: string;
  location: string;
  interests: string[];
  social: { instagram: string; twitter: string; linkedin: string };
};

export default function OnboardingPage() {
  const router = useRouter();
  const [stage, setStage] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState<FormState>({
    name: "",
    age: "",
    bio: "",
    location: "",
    interests: [],
    social: { instagram: "", twitter: "", linkedin: "" },
  });

  const selectedInterest = form.interests.length > 0;
  const progress = stage === 1 ? 50 : 100;

  const selectedText = useMemo(
    () =>
      form.interests.length
        ? `${form.interests.length} ${
            form.interests.length === 1 ? "interest" : "interests"
          } selected`
        : "Choose at least one",
    [form.interests.length],
  );

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSocialChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      social: { ...prev.social, [name]: value },
    }));
  };

  const toggleInterest = (interest: string) => {
    setForm((prev) => {
      const selected = prev.interests.includes(interest);
      return {
        ...prev,
        interests: selected
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

    try {
      setIsSubmitting(true);
      setError("");

      const response = await fetch(
        "http://localhost:8080/api/profile/onboarding",
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            ...form,
            age: form.age ? Number(form.age) : "",
          }),
        },
      );

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.message || "Unable to save your profile.");
      }

      router.push("/feed");
    } catch (err) {
      console.error("ONBOARDING ERROR:", err);
      setError(
        err instanceof Error ? err.message : "Something went wrong. Try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 sm:px-8">
          <button
            type="button"
            onClick={() => router.push("/")}
            className="text-xl font-black tracking-tight"
          >
            Blogie<span className="text-blue-600">.</span>
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
          className="h-full bg-blue-600 transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      <section className="mx-auto w-full max-w-6xl px-5 py-10 sm:px-8 sm:py-14">
        {stage === 1 && (
          <div className="animate-in fade-in duration-300">
            <div className="mx-auto max-w-3xl text-center">
              <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-100 text-blue-600">
                <Sparkles size={27} />
              </div>
              <p className="mb-2 text-sm font-bold uppercase tracking-[0.18em] text-blue-600">
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
              {INTERESTS.map(([title, image]) => {
                const selected = form.interests.includes(title);

                return (
                  <div
                    key={title}
                    className={`relative rounded-2xl transition-all duration-200 ${
                      selected
                        ? "scale-[1.02] ring-2 ring-blue-600 ring-offset-2"
                        : "hover:-translate-y-1"
                    }`}
                  >
                    <InterestCard
                      title={title}
                      selected={selected}
                      images={image}
                      onClick={() => toggleInterest(title)}
                    />
                    {selected && (
                      <div className="pointer-events-none absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg">
                        <Check size={15} strokeWidth={3} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="mx-auto mt-10 flex max-w-6xl flex-col-reverse gap-4 border-t border-slate-200 pt-6 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="button"
                onClick={() => router.push("/feed")}
                className="text-sm font-semibold text-slate-500 hover:text-slate-900"
              >
                Skip for now
              </button>
              <button
                type="button"
                onClick={goNext}
                disabled={!selectedInterest}
                className="group flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
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
              className="mb-6 flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-900"
            >
              <ArrowLeft size={16} />
              Back to interests
            </button>

            <p className="mb-2 text-sm font-bold uppercase tracking-[0.18em] text-blue-600">
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
              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
                <div className="mb-6 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
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
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
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
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
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
                    className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
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
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                  />
                </label>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
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
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                          <FieldIcon size={18} />
                        </div>
                        <input
                          name={name as string}
                          type="text"
                          placeholder={placeholder as string}
                          value={form.social[name as keyof typeof form.social]}
                          onChange={handleSocialChange}
                          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                        />
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-3xl border border-blue-100 bg-blue-50 p-5 sm:p-7">
                <h2 className="font-bold">Your interests</h2>
                <div className="mt-4 flex flex-wrap gap-2">
                  {form.interests.map((interest) => (
                    <span
                      key={interest}
                      className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-blue-700 shadow-sm ring-1 ring-blue-100"
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
                onClick={() => router.push("/feed")}
                disabled={isSubmitting}
                className="text-sm font-semibold text-slate-500 hover:text-slate-900 disabled:opacity-50"
              >
                Skip for now
              </button>

              <button
                type="button"
                onClick={submit}
                disabled={!selectedInterest || isSubmitting}
                className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-7 py-3 text-sm font-bold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
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
