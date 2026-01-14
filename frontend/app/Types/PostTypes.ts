export type Post = {
  _id: string;
  title: string;
  content: string;
  createdAt: string;
  likesCount: number;
  commentCount: number;
  tags: string[];
  author?: {
    username: string;
    profileImage?: string;
  };
};
