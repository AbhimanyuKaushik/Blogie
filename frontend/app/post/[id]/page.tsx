import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import PostViewer from "../../Components/PostViewer";

// Fetch post on server (with auth + logs)
async function getPost(id: string) {
  const cookieStore = await cookies();

  // ✅ Convert cookies to "key=value; key2=value2"
  const cookieHeader = cookieStore
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join("; ");

  try {
    const res = await fetch(`http://localhost:8080/api/posts/${id}`, {
      cache: "no-store",
      headers: {
        Cookie: cookieHeader, // ✅ works
      },
    });

    console.log(`[POST FETCH] Status: ${res.status} for ID: ${id}`);

    if (!res.ok) return null;

    const data = await res.json();
    return data.post || data;
  } catch (err) {
    console.error("[POST FETCH ERROR]:", err);
    return null;
  }
}

export default async function PostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const post = await getPost(id);

  if (!post) {
    notFound(); // Or custom "Post not found" UI
  }

  const canCollaborate =
    post.currentUserRole === "owner" ||
    post.currentUserRole === "editor" ||
    post.currentUserRole === "commenter";

  return (
    <div>
      {post.currentUserRole === "owner" && !post.collaborationEnabled && (
        <div className="max-w-3xl mx-auto px-4 pt-8 text-right">hi</div>
      )}
      <PostViewer post={post} />
    </div>
  );
}

// SEO
export async function generateMetadata({ params }: { params: { id: string } }) {
  return {
    title: "Post | BLOGIE",
    description: "Read on BLOGIE",
  };
}
