"use client";

import { BlockNode, InlineNode } from "../Types/PostTypes";
import { FC } from "react";

const BlockRenderer: FC<{ block: BlockNode }> = ({ block }) => {
  if (block.type !== "paragraph") return null;

  return (
    <p className="mb-4 text-base leading-relaxed">
      {renderInline(block.content)}
    </p>
  );
};

const renderInline = (nodes?: InlineNode[]) => {
  if (!nodes) return null;

  return nodes.map((node, index) => {
    if (node.type === "text") {
      return <span key={index}>{node.value}</span>;
    }

    return null;
  });
};

export default BlockRenderer;
