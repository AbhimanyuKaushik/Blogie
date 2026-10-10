"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Camera,
  Edit3,
  MapPin,
  Calendar,
  ArrowUpRight,
  Instagram,
  Linkedin,
  Twitter,
  FileText,
  Users,
  UserPlus,
} from "lucide-react";

interface ProfileForm {
  id: string;
  name: string;
  age: string;
  bio: string;
  location: string;
  interests: string[];
  profileImage: string;
  social: {
    instagram: string;
    twitter: string;
    linkedin: string;
  };
  followers: string[];
  following: string[];
}

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api";

export default function ProfilePage() {
  const router = useRouter();

  const [form, setForm] = useState<ProfileForm>({
    id: "",
    name: "",
    age: "",
    bio: "",
    location: "",
    interests: [],
    profileImage: "",
    social: {
      instagram: "",
      twitter: "",
      linkedin: "",
    },
    followers: [],
    following: [],
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/profile/me`, {
          credentials: "include",
          headers: {
            Accept: "application/json",
          },
        });

        if (!res.ok) {
          throw new Error("Failed to fetch profile");
        }

        const data = await res.json();

        if (data.profile) {
          setForm({
            id: data.profile._id || data.profile.id || "",
            name: data.profile.username || "",
            age: data.profile.age || "",
            bio: data.profile.bio || "",
            location: data.profile.location || "",
            interests: data.profile.interests || [],
            profileImage: data.profile.profileImage || "",
            social: {
              instagram: data.profile.social?.instagram || "",
              twitter: data.profile.social?.twitter || "",
              linkedin: data.profile.social?.linkedin || "",
            },
            followers: data.profile.followers || [],
            following: data.profile.following || [],
          });
        }
      } catch (error) {
        console.error("Failed to load profile:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  if (loading) {
    return <ProfileSkeleton />;
  }

  const initials = getInitials(form.name);

  return (
    <main className="min-h-screen bg-[#fafafa] text-zinc-900">
      {/* =========================================================
          TOP PROFILE BAR
      ========================================================= */}

      <div className="max-w-6xl mx-auto px-6 lg:px-10 pt-8">
        <div className="flex items-center justify-between border-b border-zinc-200 pb-5">
          <div>
            <p className="text-[11px] font-semibold tracking-[0.25em] text-zinc-400 uppercase">
              Profile
            </p>
          </div>

          <p className="text-xs text-zinc-400 tracking-wide">
            @{form.name || "user"}
          </p>
        </div>
      </div>

      {/* =========================================================
          HERO
      ========================================================= */}

      <section className="max-w-6xl mx-auto px-6 lg:px-10 py-10">
        <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] lg:grid-cols-[240px_1fr] gap-8 lg:gap-12">
          {/* -----------------------------------------------------
              AVATAR
          ----------------------------------------------------- */}

          <div className="flex justify-center md:block">
            <div className="relative w-[200px] h-[200px] lg:w-[220px] lg:h-[220px]">
              {form.profileImage ? (
                <img
                  src={form.profileImage}
                  alt={form.name || "Profile"}
                  className="w-full h-full object-cover rounded-2xl"
                />
              ) : (
                <div className="w-full h-full rounded-2xl bg-zinc-900 flex items-center justify-center">
                  <span className="text-6xl font-semibold text-white">
                    {initials}
                  </span>
                </div>
              )}

              {/* Camera */}
              <button
                type="button"
                aria-label="Change profile picture"
                onClick={() => router.push("/publicProfile/edit")}
                className="
                  absolute
                  bottom-3
                  right-3
                  w-10
                  h-10
                  rounded-full
                  bg-white
                  border
                  border-zinc-200
                  shadow-sm
                  flex
                  items-center
                  justify-center
                  hover:bg-zinc-900
                  hover:text-white
                  transition
                "
              >
                <Camera size={16} />
              </button>
            </div>
          </div>

          {/* -----------------------------------------------------
              PROFILE INFO
          ----------------------------------------------------- */}

          <div className="flex flex-col justify-center">
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
              <div>
                <div className="flex items-center gap-3">
                  <h1
                    className="
                    text-4xl
                    sm:text-5xl
                    lg:text-6xl
                    font-semibold
                    tracking-[-0.04em]
                    leading-none
                  "
                  >
                    {form.name || "Your Name"}
                  </h1>
                </div>
              </div>

              {/* EDIT BUTTON */}

              <button
                type="button"
                onClick={() => router.push("/profile/edit")}
                className="
                  shrink-0
                  inline-flex
                  items-center
                  justify-center
                  gap-2
                  px-5
                  py-2.5
                  border
                  border-zinc-900
                  bg-zinc-900
                  text-white
                  text-sm
                  font-medium
                  rounded-full
                  hover:bg-white
                  hover:text-zinc-900
                  transition
                "
              >
                <Edit3 size={15} />
                Edit Profile
              </button>
            </div>

            {/* BIO */}

            <div className="mt-7 max-w-2xl">
              <p className="text-lg leading-7 text-zinc-600">
                {form.bio || "New here. Start writing and tell your story."}
              </p>
            </div>

            {/* LOCATION / AGE */}

            <div className="flex flex-wrap items-center gap-5 mt-6">
              {form.location && (
                <div className="flex items-center gap-2 text-sm text-zinc-500">
                  <MapPin size={16} />

                  <span>{form.location}</span>
                </div>
              )}

              {form.age && (
                <div className="flex items-center gap-2 text-sm text-zinc-500">
                  <Calendar size={16} />

                  <span>{form.age} years old</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================
          STATS
      ========================================================= */}

      <section className="border-y border-zinc-200 bg-white">
        <div className="max-w-6xl mx-auto px-6 lg:px-10">
          <div className="grid grid-cols-3">
            <Stat icon={<FileText size={17} />} value="0" label="Posts" />

            <Stat
              icon={<Users size={17} />}
              value={String(form.followers.length)}
              label="Followers"
            />

            <Stat
              icon={<UserPlus size={17} />}
              value={String(form.following.length)}
              label="Following"
            />
          </div>
        </div>
      </section>

      {/* =========================================================
          CONTENT
      ========================================================= */}

      <section className="max-w-6xl mx-auto px-6 lg:px-10 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-12">
          {/* =====================================================
              LEFT
          ===================================================== */}

          <div>
            {/* ABOUT */}

            <section>
              <SectionHeading number="01" title="About" />

              <p className="mt-6 max-w-2xl text-base leading-7 text-zinc-600">
                {form.bio ||
                  "You haven't added a bio yet. Add something about yourself from your profile settings."}
              </p>
            </section>

            {/* INTERESTS */}

            <section className="mt-14">
              <SectionHeading number="02" title="Interests" />

              {form.interests.length > 0 ? (
                <div className="flex flex-wrap gap-2 mt-6">
                  {form.interests.map((interest) => (
                    <span
                      key={interest}
                      className="
                        px-4
                        py-2
                        bg-white
                        border
                        border-zinc-200
                        rounded-full
                        text-sm
                        text-zinc-600
                        hover:border-zinc-900
                        hover:text-zinc-900
                        transition
                      "
                    >
                      {interest}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="mt-6 text-sm text-zinc-400">
                  No interests added yet.
                </p>
              )}
            </section>
          </div>

          {/* =====================================================
              RIGHT / CONNECT
          ===================================================== */}

          <aside>
            <SectionHeading number="03" title="Connect" />

            <div className="mt-5">
              <SocialLink
                name="Instagram"
                url={form.social.instagram}
                icon={<Instagram size={17} />}
              />

              <SocialLink
                name="Twitter"
                url={form.social.twitter}
                icon={<Twitter size={17} />}
              />

              <SocialLink
                name="LinkedIn"
                url={form.social.linkedin}
                icon={<Linkedin size={17} />}
              />

              {!form.social.instagram &&
                !form.social.twitter &&
                !form.social.linkedin && (
                  <p className="text-sm text-zinc-400 mt-5">
                    No social links added yet.
                  </p>
                )}
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}

/* ================================================================
   STAT
================================================================ */

function Stat({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
}) {
  return (
    <div className="py-6 flex items-center justify-center gap-3 border-r last:border-r-0 border-zinc-200">
      <div className="text-zinc-400">{icon}</div>

      <div>
        <p className="text-xl font-semibold leading-none">{value}</p>

        <p className="mt-1 text-[10px] uppercase tracking-[0.18em] text-zinc-400">
          {label}
        </p>
      </div>
    </div>
  );
}

/* ================================================================
   SECTION HEADING
================================================================ */

function SectionHeading({ number, title }: { number: string; title: string }) {
  return (
    <div className="flex items-center justify-between border-b border-zinc-200 pb-4">
      <h2 className="text-sm font-semibold uppercase tracking-[0.18em]">
        {title}
      </h2>

      <span className="text-[10px] text-zinc-400">{number}</span>
    </div>
  );
}

/* ================================================================
   SOCIAL LINK
================================================================ */

function SocialLink({
  name,
  url,
  icon,
}: {
  name: string;
  url: string;
  icon: React.ReactNode;
}) {
  if (!url) return null;

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="
        group
        flex
        items-center
        justify-between
        py-4
        border-b
        border-zinc-200
        hover:border-zinc-900
        transition
      "
    >
      <div className="flex items-center gap-3">
        <span className="text-zinc-400 group-hover:text-zinc-900 transition">
          {icon}
        </span>

        <span className="text-sm font-medium">{name}</span>
      </div>

      <ArrowUpRight
        size={16}
        className="
          text-zinc-300
          group-hover:text-zinc-900
          group-hover:translate-x-0.5
          group-hover:-translate-y-0.5
          transition
        "
      />
    </a>
  );
}

/* ================================================================
   INITIALS
================================================================ */

function getInitials(name: string) {
  if (!name) return "?";

  const parts = name.trim().split(/\s+/);

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/* ================================================================
   LOADING
================================================================ */

function ProfileSkeleton() {
  return (
    <main className="min-h-screen bg-[#fafafa]">
      <div className="max-w-6xl mx-auto px-6 lg:px-10 pt-8">
        <div className="h-4 w-20 bg-zinc-200 animate-pulse" />

        <div className="border-b border-zinc-200 mt-5" />

        <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-10 py-10">
          <div className="w-[200px] h-[200px] bg-zinc-200 animate-pulse rounded-2xl" />

          <div className="flex flex-col justify-center">
            <div className="h-14 w-96 max-w-full bg-zinc-200 animate-pulse rounded" />

            <div className="h-5 w-32 bg-zinc-200 animate-pulse mt-4 rounded" />

            <div className="h-6 w-full max-w-xl bg-zinc-200 animate-pulse mt-8 rounded" />
          </div>
        </div>
      </div>
    </main>
  );
}
