"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { API_URL } from "@/lib/config";
import { useAuth } from "@/app/Context/AuthContext";

function AcceptInviteContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [status, setStatus] = useState<
    "loading" | "accepting" | "success" | "error"
  >("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (authLoading) return;

    if (!token) {
      setStatus("error");
      setMessage("No invitation token provided.");
      return;
    }

    if (!user) {
      setStatus("error");
      setMessage("Please log in to accept this invitation.");
      return;
    }

    const acceptInvite = async () => {
      setStatus("accepting");

      try {
        const validateRes = await fetch(
          `${API_URL}/api/invites/token/${token}`,
          { credentials: "include" },
        );

        if (!validateRes.ok) {
          const err = await validateRes.json().catch(() => ({}));
          setStatus("error");
          setMessage(err.message || "Invalid invitation.");
          return;
        }

        const acceptRes = await fetch(`${API_URL}/api/invites/accept-token`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ token }),
        });

        const data = await acceptRes.json();

        if (!acceptRes.ok) {
          setStatus("error");
          setMessage(data.message || "Failed to accept invitation.");
          return;
        }

        setStatus("success");
        setMessage("Invitation accepted! Redirecting to the post...");

        setTimeout(() => {
          router.replace(`/post/${data.postId}`);
        }, 1500);
      } catch {
        setStatus("error");
        setMessage("Something went wrong. Please try again.");
      }
    };

    acceptInvite();
  }, [token, user, authLoading, router]);

  return (
    <div className="flex items-center justify-center min-h-[60vh] px-4">
      <div className="max-w-md w-full text-center space-y-4">
        {(status === "loading" || status === "accepting") && (
          <>
            <div className="w-10 h-10 border-4 border-gray-200 border-t-black rounded-full animate-spin mx-auto" />
            <p className="text-gray-600">
              {status === "loading"
                ? "Validating invitation..."
                : "Accepting invitation..."}
            </p>
          </>
        )}

        {status === "success" && (
          <>
            <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto text-2xl">
              ✓
            </div>
            <p className="text-green-700 font-medium">{message}</p>
          </>
        )}

        {status === "error" && (
          <>
            <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto text-2xl">
              ✕
            </div>
            <p className="text-red-600 font-medium">{message}</p>
            <button
              onClick={() => router.push("/")}
              className="mt-4 bg-black text-white px-6 py-2 rounded hover:bg-gray-800 transition-colors"
            >
              Go Home
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default function AcceptInvitePage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[60vh] text-gray-500">
          Loading...
        </div>
      }
    >
      <AcceptInviteContent />
    </Suspense>
  );
}
