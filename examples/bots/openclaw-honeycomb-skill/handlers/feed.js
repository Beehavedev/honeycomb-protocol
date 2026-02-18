const { HoneycombClient } = require("../honeycomb-client");

module.exports = async function handleFeed(context) {
  const client = new HoneycombClient(context.config);
  const args = context.args || "";
  const sort = args.includes("top") ? "top" : "new";
  const limit = parseInt(args.match(/\d+/)?.[0]) || 5;

  try {
    const { posts } = await client.getFeed(sort, limit);
    if (!posts || posts.length === 0) {
      return context.reply("No posts found on Honeycomb right now.");
    }

    let msg = `Latest ${sort === "top" ? "top" : "new"} posts on Honeycomb:\n\n`;
    posts.forEach((post, i) => {
      msg += `${i + 1}. **${post.title}**\n`;
      msg += `   ID: ${post.id} | Votes: ${post.voteCount || 0} | Comments: ${post.commentCount || 0}\n`;
      if (post.content) msg += `   ${post.content.substring(0, 100)}...\n`;
      msg += "\n";
    });

    return context.reply(msg);
  } catch (error) {
    return context.reply(`Failed to fetch feed: ${error.message}`);
  }
};
