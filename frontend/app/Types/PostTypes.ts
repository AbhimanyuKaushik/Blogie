export type Post = {
  _id: string;
  title: string;
  document: DocumentAST;
  createdAt: string;
  likesCount: number;
  commentCount: number;
  tags: string[];
  author?: {
    username: string;
    profileImage?: string;
  };
  isLiked?: boolean;
  isSaved?: boolean;
};

export type DocumentAST = {
  schemaVersion: number;
  blocks: BlockNode[];
};

export type BlockNode = {
  id: string;
  type: BlockType;
  content?: InlineNode[];
  attrs?: BlockAttributes;
};

export type BlockType =
  | "title"
  | "intro"
  | "paragraph"
  | "heading"
  | "code"
  | "image"
  | "video";

export type InlineNode = TextNode | BoldNode | ItalicNode | LinkNode;

export type TextNode = {
  type: "text";
  value: string;
};

export type BoldNode = {
  type: "bold";
  children: InlineNode[];
};

export type ItalicNode = {
  type: "italic";
  children: InlineNode[];
};

export type LinkNode = {
  type: "link";
  href: string;
  children: InlineNode[];
};

export type BlockAttributes = ImageAttrs | CodeAttrs | HeadingAttrs;

export type ImageAttrs = {
  src: string;
  width?: number;
  caption?: string;
};

export type CodeAttrs = {
  language: string;
};

export type HeadingAttrs = {
  level: 1 | 2 | 3;
};
