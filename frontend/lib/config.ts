export const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

export const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export function getPostRoomId(postId: string) {
  return `post-${postId}`;
}

export function getInviteLink(token: string) {
  return `${APP_URL}/accept-invite?token=${token}`;
}
