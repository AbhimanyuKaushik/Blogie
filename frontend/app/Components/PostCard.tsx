import { Bookmark, Heart, MessageCircle } from "lucide-react";
import { Post } from "../Types/PostTypes";

export default function PostCard({ post }: { post: Post }) {
  return (
    <article className="flex flex-col gap-3 py-6 border-b cursor-pointer">
      <div className="flex items-center gap-2 text-sm text-gray-600">
        <div className="w-6 h-6 rounded-full bg-gray-300 flex items-center justify-center text-xs">
          {(post.author?.username?.[0] ?? "?").toUpperCase()}
        </div>
        <span className="font-medium text-black">
          {post.author?.username ?? "Unknown"}
        </span>
        <span>·</span>
        <span>{new Date(post.createdAt).toLocaleDateString()}</span>
      </div>

      <h2 className="text-xl font-bold leading-snug text-black">
        {post.title}
      </h2>

      <p className="text-gray-600 line-clamp-2">{post.content}</p>

      <div className="flex items-center justify-between text-sm text-gray-500">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1">
            <Heart className="w-4 h-4" />
            {post.likesCount}
          </span>
          <span className="flex items-center gap-1">
            <MessageCircle className="w-4 h-4" />
            {post.commentCount}
          </span>
        </div>

        <Bookmark className="w-4 h-4 hover:text-black" />
      </div>
    </article>
  );
}
