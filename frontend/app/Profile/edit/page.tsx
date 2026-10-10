"use client";

import { ChangeEvent, FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Camera,
  Check,
  Instagram,
  Linkedin,
  Loader2,
  MapPin,
  Twitter,
  User,
} from "lucide-react";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api";

const availableInterests = [
  "Technology",
  "AI",
  "Web Development",
  "Programming",
  "Design",
  "Business",
  "Startups",
  "Science",
  "Travel",
  "Books",
  "Photography",
  "Gaming",
];

type FormData = {
  username: string;
  age: string;
  location: string;
  bio: string;
  interests: string[];
  instagram: string;
  twitter: string;
  linkedin: string;
};

export default function EditProfilePage() {
  const router = useRouter();

  const [formData, setFormData] = useState<FormData>({
    username: "",
    age: "",
    location: "",
    bio: "",
    interests: [],
    instagram: "",
    twitter: "",
    linkedin: "",
  });

  const [profileImage, setProfileImage] = useState<string>("");
  const [imageFile, setImageFile] = useState<File | null>(null);

  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  /*
   * ---------------------------------------------------------
   * INPUT HANDLERS
   * ---------------------------------------------------------
   */

  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleInterestToggle = (interest: string) => {
    setFormData((previous) => {
      const alreadySelected = previous.interests.includes(interest);

      return {
        ...previous,
        interests: alreadySelected
          ? previous.interests.filter((item) => item !== interest)
          : [...previous.interests, interest],
      };
    });
  };

  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please select a valid image.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("Image size must be less than 5MB.");
      return;
    }

    setError("");

    setImageFile(file);

    const previewUrl = URL.createObjectURL(file);
    setProfileImage(previewUrl);
  };

  /*
   * ---------------------------------------------------------
   * SAVE PROFILE
   * ---------------------------------------------------------
   */

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    setError("");
    setSuccess("");
    setLoading(true);

    try {
      /*
       * We are intentionally preparing the payload here.
       *
       * Once we confirm your exact backend profile-update
       * endpoint, this request can be connected directly.
       */

      const payload = {
        username: formData.username.trim(),
        age: formData.age,
        location: formData.location.trim(),
        bio: formData.bio.trim(),
        interests: formData.interests,
        social: {
          instagram: formData.instagram.trim(),
          twitter: formData.twitter.trim(),
          linkedin: formData.linkedin.trim(),
        },
      };

      console.log("Profile update payload:", payload);
      console.log("Profile image:", imageFile);

      /*
       * TEMPORARY
       *
       * Do not send an invented endpoint to your backend.
       * Once we inspect your existing profile update controller,
       * we'll replace this section with the real API call.
       */

      await new Promise((resolve) => setTimeout(resolve, 500));

      setSuccess("Profile changes are ready to be saved.");
    } catch (err) {
      console.error(err);
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  /*
   * ---------------------------------------------------------
   * INITIAL LOADING
   * ---------------------------------------------------------
   */

  if (initialLoading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-[#fafafa]">
        <Loader2 className="animate-spin text-zinc-500" size={24} />
      </main>
    );
  }

  /*
   * ---------------------------------------------------------
   * UI
   * ---------------------------------------------------------
   */

  return (
    <main className="min-h-screen bg-[#fafafa] text-zinc-900">
      <div className="max-w-6xl mx-auto px-6 lg:px-10 py-8">
        {/* HEADER */}
        <div className="flex items-center justify-between border-b border-zinc-200 pb-5">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex items-center gap-2 text-sm text-zinc-500 hover:text-black transition"
          >
            <ArrowLeft size={17} />
            Back
          </button>

          <p className="text-xs text-zinc-400">BLOGIE / PROFILE / EDIT</p>
        </div>

        {/* PAGE TITLE */}
        <div className="py-10 border-b border-zinc-200">
          <p className="text-xs uppercase tracking-[0.2em] text-zinc-400">
            Profile
          </p>

          <h1 className="mt-3 text-5xl font-semibold tracking-[-0.04em]">
            Edit Profile
          </h1>

          <p className="mt-4 text-zinc-500 max-w-xl">
            Update your personal information and customize how other Blogie
            users see your profile.
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          {/* PROFILE SECTION */}
          <section className="py-10 border-b border-zinc-200">
            <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-12">
              {/* PROFILE IMAGE */}
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-zinc-400">
                  01 / Photo
                </p>

                <div className="mt-6">
                  <div className="relative w-48 h-48">
                    {profileImage ? (
                      <img
                        src={profileImage}
                        alt="Profile preview"
                        className="w-full h-full object-cover rounded-2xl"
                      />
                    ) : (
                      <div className="w-full h-full bg-zinc-900 rounded-2xl flex items-center justify-center">
                        <User
                          size={64}
                          strokeWidth={1.3}
                          className="text-white"
                        />
                      </div>
                    )}

                    <label
                      htmlFor="profile-image"
                      className="absolute bottom-3 right-3 w-11 h-11 bg-white border border-zinc-200 rounded-full flex items-center justify-center cursor-pointer hover:bg-black hover:text-white transition"
                    >
                      <Camera size={18} />

                      <input
                        id="profile-image"
                        type="file"
                        accept="image/*"
                        onChange={handleImageChange}
                        className="hidden"
                      />
                    </label>
                  </div>

                  <p className="mt-4 text-xs text-zinc-400">
                    JPG, PNG or WEBP
                    <br />
                    Maximum 5MB
                  </p>
                </div>
              </div>

              {/* BASIC INFORMATION */}
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-zinc-400">
                  02 / Information
                </p>

                <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Input
                    label="Username"
                    name="username"
                    value={formData.username}
                    onChange={handleChange}
                    placeholder="Your username"
                  />

                  <Input
                    label="Age"
                    name="age"
                    value={formData.age}
                    onChange={handleChange}
                    placeholder="Your age"
                    type="number"
                  />

                  <div className="md:col-span-2">
                    <Input
                      label="Location"
                      name="location"
                      value={formData.location}
                      onChange={handleChange}
                      placeholder="e.g. Jaipur, India"
                      icon={<MapPin size={16} />}
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="text-xs uppercase tracking-[0.15em] text-zinc-500">
                      Bio
                    </label>

                    <textarea
                      name="bio"
                      value={formData.bio}
                      onChange={handleChange}
                      placeholder="Tell people a little about yourself..."
                      rows={5}
                      maxLength={500}
                      className="mt-3 w-full resize-none border-b border-zinc-300 bg-transparent py-3 text-base outline-none focus:border-black transition placeholder:text-zinc-400"
                    />

                    <p className="mt-2 text-right text-xs text-zinc-400">
                      {formData.bio.length}/500
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* INTERESTS */}
          <section className="py-10 border-b border-zinc-200">
            <p className="text-xs uppercase tracking-[0.18em] text-zinc-400">
              03 / Interests
            </p>

            <div className="mt-6">
              <h2 className="text-2xl font-medium">
                What are you interested in?
              </h2>

              <p className="mt-2 text-sm text-zinc-500">
                Select the topics you enjoy reading and writing about.
              </p>

              <div className="flex flex-wrap gap-3 mt-6">
                {availableInterests.map((interest) => {
                  const selected = formData.interests.includes(interest);

                  return (
                    <button
                      key={interest}
                      type="button"
                      onClick={() => handleInterestToggle(interest)}
                      className={`px-5 py-3 rounded-full border text-sm transition flex items-center gap-2 ${
                        selected
                          ? "bg-black text-white border-black"
                          : "bg-white text-zinc-600 border-zinc-200 hover:border-black hover:text-black"
                      }`}
                    >
                      {selected && <Check size={15} />}
                      {interest}
                    </button>
                  );
                })}
              </div>
            </div>
          </section>

          {/* SOCIAL LINKS */}
          <section className="py-10 border-b border-zinc-200">
            <p className="text-xs uppercase tracking-[0.18em] text-zinc-400">
              04 / Social
            </p>

            <div className="mt-6 max-w-3xl space-y-6">
              <SocialInput
                label="Instagram"
                name="instagram"
                value={formData.instagram}
                onChange={handleChange}
                icon={<Instagram size={18} />}
                placeholder="https://instagram.com/username"
              />

              <SocialInput
                label="Twitter / X"
                name="twitter"
                value={formData.twitter}
                onChange={handleChange}
                icon={<Twitter size={18} />}
                placeholder="https://x.com/username"
              />

              <SocialInput
                label="LinkedIn"
                name="linkedin"
                value={formData.linkedin}
                onChange={handleChange}
                icon={<Linkedin size={18} />}
                placeholder="https://linkedin.com/in/username"
              />
            </div>
          </section>

          {/* ERROR / SUCCESS */}
          {(error || success) && (
            <div className="py-6">
              {error && <p className="text-sm text-red-500">{error}</p>}

              {success && <p className="text-sm text-green-600">{success}</p>}
            </div>
          )}

          {/* ACTIONS */}
          <div className="py-8 flex items-center justify-end gap-4">
            <button
              type="button"
              onClick={() => router.back()}
              className="px-6 py-3 border border-zinc-300 text-sm hover:border-black transition"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={loading}
              className="px-7 py-3 bg-black text-white text-sm font-medium hover:bg-zinc-800 transition disabled:opacity-50 flex items-center gap-2"
            >
              {loading && <Loader2 size={16} className="animate-spin" />}

              {loading ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}

/*
|--------------------------------------------------------------------------
| INPUT
|--------------------------------------------------------------------------
*/

function Input({
  label,
  name,
  value,
  onChange,
  placeholder,
  type = "text",
  icon,
}: {
  label: string;
  name: string;
  value: string;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  type?: string;
  icon?: React.ReactNode;
}) {
  return (
    <div>
      <label className="text-xs uppercase tracking-[0.15em] text-zinc-500">
        {label}
      </label>

      <div className="relative mt-3">
        {icon && (
          <span className="absolute left-0 top-1/2 -translate-y-1/2 text-zinc-400">
            {icon}
          </span>
        )}

        <input
          type={type}
          name={name}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className={`w-full border-b border-zinc-300 bg-transparent py-3 text-base outline-none focus:border-black transition placeholder:text-zinc-400 ${
            icon ? "pl-7" : ""
          }`}
        />
      </div>
    </div>
  );
}

/*
|--------------------------------------------------------------------------
| SOCIAL INPUT
|--------------------------------------------------------------------------
*/

function SocialInput({
  label,
  name,
  value,
  onChange,
  icon,
  placeholder,
}: {
  label: string;
  name: string;
  value: string;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  icon: React.ReactNode;
  placeholder?: string;
}) {
  return (
    <div className="flex items-center gap-4 border-b border-zinc-200 pb-4">
      <div className="w-9 h-9 rounded-full border border-zinc-200 bg-white flex items-center justify-center text-zinc-500">
        {icon}
      </div>

      <div className="flex-1">
        <label className="text-xs uppercase tracking-[0.12em] text-zinc-400">
          {label}
        </label>

        <input
          type="text"
          name={name}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className="mt-1 w-full bg-transparent outline-none text-sm placeholder:text-zinc-400"
        />
      </div>
    </div>
  );
}
