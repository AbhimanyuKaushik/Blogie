import PostCard from "./Components/PostCard";
import type { Post } from "./Types/PostTypes";

async function getFeed(): Promise<Post[]>{
  const res = await fetch("http://localhost:5000/api/posts",{
    cache:"no-store",
    credentials:"include"
  })

  if(!res.ok){
    throw new Error("Failed to fetch posts")
  }

  return (await res.json()) as Post[]

}

export default async function Home() {
  const posts: Post[] = await getFeed();
  return (
    <div className="flex min-h-screen justify-center font-sans">
      <section>
        {posts.length === 0 ? (
          <EmptyFeed />
        ) : (
          posts.map((post: Post) => (
            <PostCard key={post._id} post={post} />
          ))
        )}
      </section>
    </div>
  );
}

function EmptyFeed() {
  return (
    <div className="text-center mt-24 text-gray-500">
      <h2 className="text-xl font-medium mb-2">
        Your feed is empty
      </h2>
      <p>Follow writers or start writing.</p>
    </div>
  );
}
