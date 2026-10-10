"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Calendar,
  FileText,
  Instagram,
  Linkedin,
  Loader2,
  MapPin,
  Twitter,
  UserPlus,
  Users,
} from "lucide-react";
import FollowButton from "../../Components/FollowingButton";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api";

type Profile = {
  _id: string;
  username: string;
  profileImage?: string;
  age?: string;
  bio?: string;
  location?: string;
  interests?: string[];
  social?: {
    instagram?: string;
    twitter?: string;
    linkedin?: string;
  };
  followers?: string[];
  following?: string[];
};

export default function PublicProfilePage() {
  const params = useParams();
  const router = useRouter();

  const userId = params.id as string;

  const [profile, setProfile] = useState<Profile | null>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;

    const fetchProfile = async () => {
      try {
        setLoading(true);

        const response = await fetch(`${API_BASE_URL}/profile/${userId}`, {
          method: "GET",
          credentials: "include",
          headers: {
            Accept: "application/json",
          },
          cache: "no-store",
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data?.message || "Failed to load profile");
        }

        setProfile(data.profile);

        // IMPORTANT:
        // Backend must return isFollowing
        setIsFollowing(Boolean(data.isFollowing));
      } catch (error) {
        console.error("Failed to load public profile:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [userId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#fafafa] flex items-center justify-center">
        <Loader2 className="animate-spin text-zinc-500" size={24} />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-[#fafafa] flex flex-col items-center justify-center">
        <h1 className="text-2xl font-semibold">User not found</h1>

        <button
          type="button"
          onClick={() => router.back()}
          className="mt-5 border border-black px-5 py-2 text-sm hover:bg-black hover:text-white transition"
        >
          Go back
        </button>
      </div>
    );
  }

  const initials = getInitials(profile.username);

  return (
    <main className="min-h-screen bg-[#fafafa] text-zinc-900">
      {/* =====================================================
          TOP
      ===================================================== */}

      <div className="max-w-6xl mx-auto px-6 lg:px-10 pt-8">
        <div className="flex items-center justify-between border-b border-zinc-200 pb-5">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex items-center gap-2 text-sm text-zinc-500 hover:text-black transition"
          >
            <ArrowLeft size={16} />
            Back
          </button>

          <p className="text-xs text-zinc-400">BLOGIE / @{profile.username}</p>
        </div>
      </div>

      {/* =====================================================
          PROFILE HERO
      ===================================================== */}

      <section className="max-w-6xl mx-auto px-6 lg:px-10 py-10">
        <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] lg:grid-cols-[240px_1fr] gap-8 lg:gap-12">
          {/* IMAGE */}

          <div className="flex justify-center md:block">
            <div className="relative w-[200px] h-[200px] lg:w-[220px] lg:h-[220px]">
              {profile.profileImage ? (
                <img
                  src={profile.profileImage}
                  alt={profile.username}
                  className="w-full h-full object-cover rounded-2xl"
                />
              ) : (
                <div className="w-full h-full rounded-2xl bg-zinc-900 flex items-center justify-center">
                  <span className="text-6xl font-semibold text-white">
                    {initials}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* INFORMATION */}

          <div className="flex flex-col justify-center">
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
              <div>
                <h1 className="mt-3 text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-[-0.04em] leading-none">
                  {profile.username}
                </h1>
              </div>

              {/* FOLLOW / UNFOLLOW */}

              <FollowButton
                targetUserId={profile._id}
                initialFollowing={isFollowing}
                onFollowChange={(following) => {
                  setIsFollowing(following);

                  setProfile((previous) => {
                    if (!previous) return previous;

                    const followers = previous.followers || [];

                    return {
                      ...previous,
                      followers: following
                        ? [...followers, "current-user"]
                        : followers.filter((id) => id !== "current-user"),
                    };
                  });
                }}
              />
            </div>

            {/* BIO */}

            <p className="mt-7 max-w-2xl text-lg leading-7 text-zinc-600">
              {profile.bio || "This writer hasn't added a bio yet."}
            </p>

            {/* META */}

            <div className="flex flex-wrap items-center gap-5 mt-6">
              {profile.location && (
                <div className="flex items-center gap-2 text-sm text-zinc-500">
                  <MapPin size={16} />
                  {profile.location}
                </div>
              )}

              {profile.age && (
                <div className="flex items-center gap-2 text-sm text-zinc-500">
                  <Calendar size={16} />
                  {profile.age} years old
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================
          STATS
      ===================================================== */}

      <section className="border-y border-zinc-200 bg-white">
        <div className="max-w-6xl mx-auto px-6 lg:px-10">
          <div className="grid grid-cols-3">
            <Stat icon={<FileText size={17} />} value="0" label="Posts" />

            <Stat
              icon={<Users size={17} />}
              value={String(profile.followers?.length || 0)}
              label="Followers"
            />

            <Stat
              icon={<UserPlus size={17} />}
              value={String(profile.following?.length || 0)}
              label="Following"
            />
          </div>
        </div>
      </section>

      {/* =====================================================
          CONTENT
      ===================================================== */}

      <section className="max-w-6xl mx-auto px-6 lg:px-10 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-12">
          {/* LEFT */}

          <div>
            {/* ABOUT */}

            <section>
              <SectionHeading number="01" title="About" />

              <p className="mt-6 max-w-2xl text-base leading-7 text-zinc-600">
                {profile.bio || `${profile.username} hasn't added a bio yet.`}
              </p>
            </section>

            {/* INTERESTS */}

            <section className="mt-14">
              <SectionHeading number="02" title="Interests" />

              {profile.interests && profile.interests.length > 0 ? (
                <div className="flex flex-wrap gap-2 mt-6">
                  {profile.interests.map((interest) => (
                    <span
                      key={interest}
                      className="px-4 py-2 bg-white border border-zinc-200 rounded-full text-sm text-zinc-600 hover:border-zinc-900 hover:text-zinc-900 transition"
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

          {/* RIGHT */}

          <aside>
            <SectionHeading number="03" title="Connect" />

            <div className="mt-5">
              <SocialLink
                name="Instagram"
                url={profile.social?.instagram}
                icon={<Instagram size={17} />}
              />

              <SocialLink
                name="Twitter"
                url={profile.social?.twitter}
                icon={<Twitter size={17} />}
              />

              <SocialLink
                name="LinkedIn"
                url={profile.social?.linkedin}
                icon={<Linkedin size={17} />}
              />

              {!profile.social?.instagram &&
                !profile.social?.twitter &&
                !profile.social?.linkedin && (
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

/* ============================================================
   STAT
============================================================ */

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

/* ============================================================
   SECTION HEADING
============================================================ */

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

/* ============================================================
   SOCIAL LINK
============================================================ */

function SocialLink({
  name,
  url,
  icon,
}: {
  name: string;
  url?: string;
  icon: React.ReactNode;
}) {
  if (!url) return null;

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center justify-between py-4 border-b border-zinc-200 hover:border-zinc-900 transition"
    >
      <div className="flex items-center gap-3">
        <span className="text-zinc-400">{icon}</span>

        <span className="text-sm font-medium">{name}</span>
      </div>

      <span className="text-zinc-400">↗</span>
    </a>
  );
}

/* ============================================================
   INITIALS
============================================================ */

function getInitials(name: string) {
  if (!name) return "?";

  const parts = name.trim().split(/\s+/);

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
