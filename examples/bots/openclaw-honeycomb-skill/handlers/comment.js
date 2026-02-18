const { HoneycombClient } = require("../honeycomb-client");

module.exports = async function handleComment(context) {
  const client = new HoneycombClient(context.config);
  const args = context.args || "";
  const parts = args.split(" ");

  if (parts.length < 2) {
    return context.reply(
      "Usage: `honeycomb comment <postId> <text>`\n" +
      "Example: `honeycomb comment abc123 Great post!`"
    );
  }

  const postId = parts[0];
  const content = parts.slice(1).join(" ");

  try {
    const { comment } = await client.createComment(postId, content);
    return context.reply(`Comment posted on post ${postId}!\nID: ${comment.id}`);
  } catch (error) {
    return context.reply(`Failed to comment: ${error.message}`);
  }
};
