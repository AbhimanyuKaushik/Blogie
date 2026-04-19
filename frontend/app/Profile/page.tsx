"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Camera, Edit3, MapPin, Calendar, Link as LinkIcon } from "lucide-react";

interface ProfileForm {
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
}

export default function ProfilePage() {
  const router = useRouter();
  const [form, setForm] = useState<ProfileForm>({
    name: "",
    age: "",
    bio: "",
    location: "",
    interests: [],
    profileImage: "",
    social: { instagram: "", twitter: "", linkedin: "" },
  });

  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const defaultImage =
    "https://plus.unsplash.com/premium_photo-1677252438425-e4125f74fbbe?q=80&w=880&auto=format&fit=crop";

  useEffect(() => {
    const fetchProfile = async () => {
      const res = await fetch("http://localhost:5000/api/profile/me", {
        credentials: "include",
      });
      const data = await res.json();

      if (data.profile) {
        setForm({
          name: data.profile.username || "",
          age: data.profile.age || "",
          bio: data.profile.bio || "",
          location: data.profile.location || "",
          interests: data.profile.interests || [],
          profileImage: data.profile.profileImage,
          social: {
            instagram: data.profile.social?.instagram || "",
            twitter: data.profile.social?.twitter || "",
            linkedin: data.profile.social?.linkedin || "",
          },
        });
      }
      setLoading(false);
    };
    fetchProfile();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-zinc-500">
        Loading profile...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-100 to-white dark:from-zinc-950 dark:to-black pb-16">
      
      {/* 🔥 Cover */}
      <div className="h-52 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 relative">
        <div className="absolute inset-0 backdrop-blur-sm bg-black/20" />

        {/* Profile Image */}
        <div className="absolute -bottom-16 left-1/2 -translate-x-1/2">
          <div className="relative group">
            <img
              src={form.profileImage || defaultImage}
              className="w-36 h-36 rounded-full object-cover border-4 border-white shadow-2xl transition-transform group-hover:scale-105"
            />

            <label className="absolute bottom-2 right-2 bg-black/70 hover:bg-black text-white p-2 rounded-full cursor-pointer">
              <Camera size={16} />
              <input type="file" className="hidden" />
            </label>
          </div>
        </div>
      </div>

      {/* 🔥 Main Card */}
      <div className="max-w-3xl mx-auto px-6 pt-24">
        <div className="bg-white/70 dark:bg-zinc-900/70 backdrop-blur-xl border border-zinc-200 dark:border-zinc-800 rounded-3xl p-8 shadow-xl">
          
          {/* Header */}
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-4xl font-bold text-zinc-900 dark:text-white tracking-tight">
                {form.name || "Your Name"}
              </h1>

              {form.age && (
                <p className="flex items-center gap-1 text-zinc-500 mt-2">
                  <Calendar size={16} /> {form.age} years old
                </p>
              )}
            </div>

            <button
              onClick={() => router.push("/profile/edit")}
              className="flex items-center gap-2 px-5 py-2 rounded-full bg-gradient-to-r from-black to-zinc-700 text-white hover:scale-105 transition"
            >
              <Edit3 size={16} />
              Edit
            </button>
          </div>

          {/* Location */}
          {form.location && (
            <p className="flex items-center gap-2 text-zinc-500 mt-4">
              <MapPin size={18} /> {form.location}
            </p>
          )}

          {/* Divider */}
          <div className="my-6 border-t border-zinc-200 dark:border-zinc-800" />

          {/* Bio */}
          <div>
            <h3 className="text-lg font-semibold mb-2">About</h3>
            <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed">
              {form.bio || "No bio added yet."}
            </p>
          </div>

          {/* Interests */}
          <div className="mt-8">
            <h3 className="text-lg font-semibold mb-3">Interests</h3>

            <div className="flex flex-wrap gap-2">
              {form.interests.length > 0 ? (
                form.interests.map((i: string) => (
                  <span
                    key={i}
                    className="px-4 py-1.5 rounded-full bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border border-indigo-200 dark:border-zinc-700 text-sm"
                  >
                    {i}
                  </span>
                ))
              ) : (
                <p className="text-zinc-500 italic">No interests yet</p>
              )}
            </div>
          </div>

          {/* Social */}
          <div className="mt-10">
            <h3 className="flex items-center gap-2 font-semibold text-lg mb-4">
              <LinkIcon size={18} /> Connect
            </h3>

            <div className="grid sm:grid-cols-3 gap-4">
              {["instagram", "twitter", "linkedin"].map((platform) => {
                const url = form.social[platform as keyof typeof form.social];
                if (!url) return null;

                return (
                  <a
                    key={platform}
                    href={url}
                    target="_blank"
                    className="p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:shadow-lg hover:-translate-y-1 transition-all"
                  >
                    <p className="font-medium capitalize">{platform}</p>
                    <p className="text-xs text-zinc-500">Open profile</p>
                  </a>
                );
              })}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}