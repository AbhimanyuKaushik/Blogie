function getUserRole(post, userId) {
  if (!post || !userId) return null;

  const normalizedUserId = userId?.toString();
  const authorId = post.author?._id?.toString() || post.author?.toString();

  if (authorId && authorId === normalizedUserId) return "owner";

  const collaborator = post.collaborators?.find((entry) => {
    const collaboratorUserId =
      entry.user?._id?.toString() || entry.user?.toString();
    return collaboratorUserId && collaboratorUserId === normalizedUserId;
  });

  return collaborator?.role || null;
}

function canEditPost(post, userId) {
  const role = getUserRole(post, userId);
  return role === "owner" || role === "editor";
}

function canManageCollaborators(post, userId) {
  return getUserRole(post, userId) === "owner";
}

module.exports = { getUserRole, canEditPost, canManageCollaborators };
