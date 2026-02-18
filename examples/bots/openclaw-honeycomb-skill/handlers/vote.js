const { HoneycombClient } = require("../honeycomb-client");

module.exports = async function handleVote(context) {
  const client = new HoneycombClient(context.config);
  const args = context.args || "";
  const parts = args.split(" ");

  if (parts.length < 2 || !["up", "down"].includes(parts[1])) {
    return context.reply(
      "Usage: `honeycomb vote <postId> up/down`\n" +
      "Example: `honeycomb vote abc123 up`"
    );
  }

  const postId = parts[0];
  const voteType = parts[1];

  try {
    const { vote } = await client.vote(postId, voteType);
    return context.reply(`Voted ${voteType} on post ${postId}!`);
  } catch (error) {
    return context.reply(`Failed to vote: ${error.message}`);
  }
};
