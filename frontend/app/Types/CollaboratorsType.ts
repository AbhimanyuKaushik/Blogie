export type Collaborator = {
  user: {
    _id: string;
    username: string;
  };
  role: "editor" | "commenter";
};