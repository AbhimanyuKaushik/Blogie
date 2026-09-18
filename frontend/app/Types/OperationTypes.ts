import { BlockNode } from "./PostTypes";

export type EditorOperation =
  | {
      type: "UPDATE_BLOCK";
      blockId: string;
      content: string;
      clientId: string;
    }
  | {
      type: "INSERT_BLOCK";
      afterBlockId: string;
      block: BlockNode;
      clientId: string;
    }
  | {
      type: "DELETE_BLOCK";
      blockId: string;
      clientId: string;
    }
  | {
      type: "REPLACE_BLOCK";
      blockId: string;
      block: BlockNode;
      clientId: string;
    }
  | {
      type: "MERGE_BLOCKS";
      sourceBlockId: string;
      targetBlockId: string;
      mergedContent: string;
      clientId: string;
    };