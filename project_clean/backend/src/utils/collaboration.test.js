const test = require("node:test");
const assert = require("node:assert/strict");
const {
  canEditPost,
  canManageCollaborators,
  getUserRole,
} = require("./collaboration");

test("owners can edit and manage collaborators", () => {
  const post = {
    author: "owner-id",
    collaborators: [{ user: "collab-id", role: "editor" }],
  };

  assert.equal(canEditPost(post, "owner-id"), true);
  assert.equal(canManageCollaborators(post, "owner-id"), true);
  assert.equal(getUserRole(post, "owner-id"), "owner");
});

test("editors can edit but not manage collaborators", () => {
  const post = {
    author: "owner-id",
    collaborators: [{ user: "collab-id", role: "editor" }],
  };

  assert.equal(canEditPost(post, "collab-id"), true);
  assert.equal(canManageCollaborators(post, "collab-id"), false);
  assert.equal(getUserRole(post, "collab-id"), "editor");
});

test("commenters can only read", () => {
  const post = {
    author: "owner-id",
    collaborators: [{ user: "collab-id", role: "commenter" }],
  };

  assert.equal(canEditPost(post, "collab-id"), false);
  assert.equal(canManageCollaborators(post, "collab-id"), false);
  assert.equal(getUserRole(post, "collab-id"), "commenter");
});
