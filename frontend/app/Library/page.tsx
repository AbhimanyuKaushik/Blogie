import { cookies } from "next/headers";
import { Post } from "../Types/PostTypes";
import LibraryClient from "../Components/LibraryClient";
async function getSavedPosts(): Promise<Post[]> {
  const cookieStore = await cookies();

  const cookieHeader = cookieStore
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join("; ");

  const res = await fetch("http://localhost:5000/api/posts/saved", {
    headers: { Cookie: cookieHeader },
    cache: "no-store",
  });

  if (!res.ok) return [];

  return res.json();
}

export default async function LibraryPage() {
  const posts = await getSavedPosts();

  return <LibraryClient initialPosts={posts} />;
}