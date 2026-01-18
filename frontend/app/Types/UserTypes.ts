export type User = {
  id: string;
  username: string;
  email?: string;
  profileImage?: string;
  role?: "user" | "admin";
  interests?: string[];
};
