"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { io, Socket } from "socket.io-client";

import {
  BlockType,
  DocumentAST,
  ImageAttrs,
} from "../Types/PostTypes";

import { EditorOperation } from "../Types/OperationTypes";

import TextBlock from "../Components/StateBlocks/TextBlock";

// ----------------------------------------------------
// HELPERS
// ----------------------------------------------------

const createTextNode = (
  value: string,
) => ({
  type: "text" as const,
  value,
});

export function getVideoEmbedUrl(
  url: string,
): string {
  const trimmed = url.trim();

  const ytMatch = trimmed.match(
    /(?:youtube\.com\/watch\?v=|youtube\.com\/embed\/|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
  );

  if (ytMatch) {
    return `https://www.youtube.com/embed/${ytMatch[1]}`;
  }

  const vimeoMatch = trimmed.match(
    /vimeo\.com\/(?:video\/)?(\d+)/,
  );

  if (vimeoMatch) {
    return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
  }

  return trimmed;
}

// ----------------------------------------------------
// TYPES
// ----------------------------------------------------

type Props = {
  postId: string;
  currentUserId: string;
};

type ActiveUser = {
  socketId: string;
  username: string;
};

// ----------------------------------------------------
// COMPONENT
// ----------------------------------------------------

export default function NewPostEditor({
  postId,
  currentUserId,
}: Props) {
  // ----------------------------------------------------
  // SOCKET
  // ----------------------------------------------------

  const socket: Socket =
    useMemo(() => {
      return io(
        "http://localhost:5000/collaboration",
        {
          withCredentials: true,
        },
      );
    }, []);

  const clientId = useMemo(
    () => crypto.randomUUID(),
    [],
  );

  // ----------------------------------------------------
  // STATE
  // ----------------------------------------------------

  const [ast, setAst] =
    useState<DocumentAST>({
      schemaVersion: 1,

      blocks: [
        {
          id: crypto.randomUUID(),

          type: "title",

          content: [
            createTextNode(""),
          ],
        },

        {
          id: crypto.randomUUID(),

          type: "intro",

          content: [
            createTextNode(""),
          ],
        },

        {
          id: crypto.randomUUID(),

          type: "paragraph",

          content: [
            createTextNode(""),
          ],
        },
      ],
    });

  const [focusedBlockId, setFocusedBlockId] =
    useState<string | null>(null);

  const [slashTargetId, setSlashTargetId] =
    useState<string | null>(null);

  const [slashIndex, setSlashIndex] =
    useState(0);

  const [isEditable, setIsEditable] =
    useState(true);

  const [
    slashMenuPosition,
    setSlashMenuPosition,
  ] = useState<{
    top: number;
    left: number;
  } | null>(null);

  const [
    showCollaboratorModal,
    setShowCollaboratorModal,
  ] = useState(false);

  const [
    collaboratorEmail,
    setCollaboratorEmail,
  ] = useState("");

  const [activeUsers, setActiveUsers] =
    useState<ActiveUser[]>([]);

  // ----------------------------------------------------
  // LOAD DOCUMENT
  // ----------------------------------------------------

  useEffect(() => {
    const loadDocument =
      async () => {
        try {
          const res =
            await fetch(
              `http://localhost:5000/api/posts/${postId}`,
              {
                credentials:
                  "include",
              },
            );

          if (!res.ok) {
            return;
          }

          const data =
            await res.json();

          if (
            data.post?.document
          ) {
            setAst(
              data.post.document,
            );
          }
        } catch (err) {
          console.error(err);
        }
      };

    loadDocument();
  }, [postId]);

  // ----------------------------------------------------
  // SOCKET EVENTS
  // ----------------------------------------------------

  useEffect(() => {
    socket.emit(
      "register-user",
      currentUserId,
    );

    socket.emit(
      "join:post",
      {
        postId,
      },
    );

    socket.on(
      "receive-operation",
      (
        operation: EditorOperation,
      ) => {
        if (
          operation.clientId ===
          clientId
        ) {
          return;
        }

        setAst((prev) => {
          switch (operation.type) {
            case "UPDATE_BLOCK":
              return {
                ...prev,

                blocks:
                  prev.blocks.map(
                    (b) =>
                      b.id ===
                        operation.blockId
                        ? {
                          ...b,

                          content:
                            [
                              createTextNode(
                                operation.content,
                              ),
                            ],
                        }
                        : b,
                  ),
              };

            case "INSERT_BLOCK": {
              const index =
                prev.blocks.findIndex(
                  (b) =>
                    b.id ===
                    operation.afterBlockId,
                );

              if (
                index === -1
              ) {
                return prev;
              }

              const updated =
                [
                  ...prev.blocks,
                ];

              updated.splice(
                index + 1,
                0,
                operation.block,
              );

              return {
                ...prev,

                blocks:
                  updated,
              };
            }

            case "DELETE_BLOCK":
              return {
                ...prev,

                blocks:
                  prev.blocks.filter(
                    (b) =>
                      b.id !==
                      operation.blockId,
                  ),
              };

            case "REPLACE_BLOCK":
              return {
                ...prev,

                blocks:
                  prev.blocks.map(
                    (b) =>
                      b.id ===
                        operation.blockId
                        ? operation.block
                        : b,
                  ),
              };

            case "MERGE_BLOCKS":
              return {
                ...prev,

                blocks:
                  prev.blocks
                    .map(
                      (b) => {
                        if (
                          b.id ===
                          operation.targetBlockId
                        ) {
                          return {
                            ...b,

                            content:
                              [
                                createTextNode(
                                  operation.mergedContent,
                                ),
                              ],
                          };
                        }

                        return b;
                      },
                    )
                    .filter(
                      (b) =>
                        b.id !==
                        operation.sourceBlockId,
                    ),
              };

            default:
              return prev;
          }
        });
      },
    );

    socket.on(
      "user:joined",
      (user: ActiveUser) => {
        setActiveUsers(
          (prev) => {
            const exists =
              prev.some(
                (u) =>
                  u.socketId ===
                  user.socketId,
              );

            if (exists)
              return prev;

            return [
              ...prev,
              user,
            ];
          },
        );
      },
    );

    socket.on(
      "new-notification",
      (notification) => {
        alert(
          notification.message,
        );
      },
    );

    return () => {
      socket.emit(
        "leave:post",
        {
          postId,
        },
      );

      socket.off(
        "receive-operation",
      );

      socket.off(
        "user:joined",
      );

      socket.off(
        "new-notification",
      );
    };
  }, [
    socket,
    postId,
    clientId,
  ]);

  // ----------------------------------------------------
  // AUTOSAVE
  // ----------------------------------------------------

  useEffect(() => {
    const timeout =
      setTimeout(async () => {
        try {
          await fetch(
            `http://localhost:5000/api/posts/${postId}/document`,
            {
              method: "PATCH",

              headers: {
                "Content-Type":
                  "application/json",
              },

              credentials:
                "include",

              body: JSON.stringify(
                {
                  document:
                    ast,
                },
              ),
            },
          );
        } catch (err) {
          console.error(err);
        }
      }, 1000);

    return () =>
      clearTimeout(timeout);
  }, [ast, postId]);

  // ----------------------------------------------------
  // APPLY OPERATION
  // ----------------------------------------------------

  const applyOperation =
    useCallback(
      (
        operation: EditorOperation,
      ) => {
        socket.emit(
          "editor-operation",
          {
            documentId:
              postId,

            operation,
          },
        );

        setAst((prev) => {
          switch (
          operation.type
          ) {
            case "UPDATE_BLOCK":
              return {
                ...prev,

                blocks:
                  prev.blocks.map(
                    (b) =>
                      b.id ===
                        operation.blockId
                        ? {
                          ...b,

                          content:
                            [
                              createTextNode(
                                operation.content,
                              ),
                            ],
                        }
                        : b,
                  ),
              };

            case "INSERT_BLOCK": {
              const index =
                prev.blocks.findIndex(
                  (b) =>
                    b.id ===
                    operation.afterBlockId,
                );

              if (
                index === -1
              )
                return prev;

              const updated =
                [
                  ...prev.blocks,
                ];

              updated.splice(
                index + 1,
                0,
                operation.block,
              );

              return {
                ...prev,

                blocks:
                  updated,
              };
            }

            case "DELETE_BLOCK":
              return {
                ...prev,

                blocks:
                  prev.blocks.filter(
                    (b) =>
                      b.id !==
                      operation.blockId,
                  ),
              };

            case "REPLACE_BLOCK":
              return {
                ...prev,

                blocks:
                  prev.blocks.map(
                    (b) =>
                      b.id ===
                        operation.blockId
                        ? operation.block
                        : b,
                  ),
              };

            case "MERGE_BLOCKS":
              return {
                ...prev,

                blocks:
                  prev.blocks
                    .map(
                      (b) => {
                        if (
                          b.id ===
                          operation.targetBlockId
                        ) {
                          return {
                            ...b,

                            content:
                              [
                                createTextNode(
                                  operation.mergedContent,
                                ),
                              ],
                          };
                        }

                        return b;
                      },
                    )
                    .filter(
                      (b) =>
                        b.id !==
                        operation.sourceBlockId,
                    ),
              };

            default:
              return prev;
          }
        });
      },
      [socket, postId],
    );

  // ----------------------------------------------------
  // UPDATE BLOCK
  // ----------------------------------------------------

  const updateBlock = (
    id: string,
    value: string,
  ) => {
    applyOperation({
      type: "UPDATE_BLOCK",

      blockId: id,

      content: value,

      clientId,
    });
  };

  // ----------------------------------------------------
  // ENTER
  // ----------------------------------------------------

  const handleEnter = (
    id: string,
    offset: number,
    plainText?: string,
  ) => {
    const index =
      ast.blocks.findIndex(
        (b) => b.id === id,
      );

    if (index === -1)
      return;

    const block =
      ast.blocks[index];

    if (
      block.type === "title"
    )
      return;

    const text =
      typeof plainText ===
        "string"
        ? plainText
        : "";

    const before =
      text.slice(
        0,
        offset,
      );

    const after =
      text.slice(offset);

    const updatedCurrentBlock =
    {
      ...block,

      content: [
        createTextNode(
          before,
        ),
      ],
    };

    const newBlock = {
      id: crypto.randomUUID(),

      type:
        "paragraph" as const,

      content: [
        createTextNode(
          after,
        ),
      ],
    };

    applyOperation({
      type:
        "REPLACE_BLOCK",

      blockId: block.id,

      block:
        updatedCurrentBlock,

      clientId,
    });

    applyOperation({
      type:
        "INSERT_BLOCK",

      afterBlockId:
        block.id,

      block: newBlock,

      clientId,
    });

    setFocusedBlockId(
      newBlock.id,
    );
  };

  // ----------------------------------------------------
  // DELETE BLOCK
  // ----------------------------------------------------

  const deleteEmptyBlock = (
    id: string,
  ) => {
    applyOperation({
      type:
        "DELETE_BLOCK",

      blockId: id,

      clientId,
    });
  };

  // ----------------------------------------------------
  // MOVE FOCUS
  // ----------------------------------------------------

  const moveFocus = (
    id: string,
    direction:
      | "up"
      | "down",
  ) => {
    const index =
      ast.blocks.findIndex(
        (b) => b.id === id,
      );

    if (index === -1)
      return;

    const target =
      ast.blocks[
      direction === "up"
        ? index - 1
        : index + 1
      ];

    if (target) {
      setFocusedBlockId(
        target.id,
      );
    }
  };

  // ----------------------------------------------------
  // ADD COLLABORATOR
  // ----------------------------------------------------

  const handleAddCollaborator =
    async () => {
      if (
        !collaboratorEmail.trim()
      ) {
        return;
      }

      const res = await fetch(
        `http://localhost:5000/api/posts/${postId}/collaborators`,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          credentials:
            "include",

          body: JSON.stringify({
            email:
              collaboratorEmail,
          }),
        },
      );

      if (!res.ok) {
        alert(
          "Failed to add collaborator",
        );

        return;
      }

      alert(
        "Collaborator added",
      );

      setCollaboratorEmail(
        "",
      );

      setShowCollaboratorModal(
        false,
      );
    };

  // ----------------------------------------------------
  // RENDER
  // ----------------------------------------------------

  return (
    <>
      <div className="max-w-5xl mx-auto px-4 py-8">

        <div className="flex items-center justify-between mb-6">

          <div className="flex items-center gap-2">

            {activeUsers.map(
              (user) => (
                <div
                  key={
                    user.socketId
                  }
                  className="px-3 py-1 bg-gray-100 rounded-full text-sm"
                >
                  {
                    user.username
                  }
                </div>
              ),
            )}

          </div>

          <div className="flex items-center gap-3">

            <button
              type="button"
              onClick={() =>
                setShowCollaboratorModal(
                  true,
                )
              }
              className="px-4 py-2 bg-blue-500 text-white rounded-md"
            >
              Add Editor
            </button>

            <button
              type="button"
              onClick={() =>
                setIsEditable(
                  !isEditable,
                )
              }
              className="px-4 py-2 border rounded-md"
            >
              {isEditable
                ? "Preview"
                : "Edit"}
            </button>

          </div>

        </div>

        <form>

          {ast.blocks.map(
            (block) => (
              <TextBlock
                key={block.id}
                block={block}
                onChange={
                  updateBlock
                }
                onEnter={
                  handleEnter
                }
                onDelete={
                  deleteEmptyBlock
                }
                onMove={
                  moveFocus
                }
                onBackspaceAtStart={() => { }}
                onSlash={() => { }}
                onFormat={() => { }}
                onSelectionChange={() => { }}
                isFocused={
                  focusedBlockId ===
                  block.id
                }
                isEditable={
                  isEditable
                }
                slashMenuOpen={
                  false
                }
              />
            ),
          )}

        </form>

      </div>

      {showCollaboratorModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">

          <div className="bg-white p-6 rounded-lg w-[400px]">

            <h2 className="text-lg font-semibold mb-4">
              Add Collaborator
            </h2>

            <input
              type="email"
              placeholder="Enter email"
              value={
                collaboratorEmail
              }
              onChange={(e) =>
                setCollaboratorEmail(
                  e.target.value,
                )
              }
              className="w-full border px-3 py-2 rounded-md mb-4"
            />

            <div className="flex justify-end gap-2">

              <button
                type="button"
                onClick={() =>
                  setShowCollaboratorModal(
                    false,
                  )
                }
                className="px-3 py-2 border rounded-md"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={
                  handleAddCollaborator
                }
                className="px-3 py-2 bg-black text-white rounded-md"
              >
                Add
              </button>

            </div>

          </div>

        </div>
      )}
    </>
  );
}