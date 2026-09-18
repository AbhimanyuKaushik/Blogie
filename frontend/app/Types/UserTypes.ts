export type User = {
  _id: string;
  id?: string;
  username: string;
  email?: string;
  profileImage?: string;
  role?: "user" | "admin";
  interests?: string[];
};
