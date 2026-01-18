"use client";
import { useState } from "react";

export default function NewPostpage() {
  const [data, setData] = useState({
    title: "",
    content: "",
    tags: [] as string[],
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const res = await fetch("http://localhost:5000/api/posts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const text = await res.text();
        console.error("Server error:", text);
        return;
      }

      const result = await res.json();
      console.log("Post created:", result);

      setData({ title: "", content: "", tags: [] });
    } catch (error) {
      console.error("Network error:", error);
    }
  };

  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Enter") return;

    e.preventDefault();
    const value = e.currentTarget.value.trim();
    if (!value) return;

    setData((prev) => ({
      ...prev,
      tags: [...prev.tags, value],
    }));

    e.currentTarget.value = "";
  };

  const removeTag = (index: number) => {
    setData((prev) => ({
      ...prev,
      tags: prev.tags.filter((_, i) => i !== index),
    }));
  };

  return (
    <form
      className="max-w-4xl mx-auto flex flex-col gap-4 border p-6"
      onSubmit={handleSubmit}
    >
      <input
        placeholder="Title"
        className="w-full p-4 border"
        value={data.title}
        onChange={(e) => setData({ ...data, title: e.target.value })}
      />

      <textarea
        placeholder="Write your post..."
        className="w-full h-64 p-4 border"
        value={data.content}
        onChange={(e) => setData({ ...data, content: e.target.value })}
      />

      
      <input
        placeholder="Press Enter to add tags"
        className="w-full p-3 border"
        onKeyDown={handleTagKeyDown}
      />

      
      <div className="flex flex-wrap gap-2">
        {data.tags.map((tag, index) => (
          <span
            key={index}
            className="flex items-center gap-2 bg-gray-200 rounded-full px-3 py-1 text-sm"
          >
            {tag}
            <button
              type="button"
              onClick={() => removeTag(index)}
              className="text-red-500"
            >
              ✕
            </button>
          </span>
        ))}
      </div>

      <button type="submit" className="border px-6 py-2 self-start">
        Publish
      </button>
    </form>
  );
}
