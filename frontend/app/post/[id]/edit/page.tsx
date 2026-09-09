"use client";

import { useParams } from "next/navigation";
import NewPostEditor from "../../../Components/NewPostEditor";

export default function EditPostPage() {
  const params = useParams();

  const postId = typeof params.id === "string" ? params.id : "";

  if (!postId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Loading editor...</p>
      </div>
    );
  }

  return <NewPostEditor postId={postId} />;
}
