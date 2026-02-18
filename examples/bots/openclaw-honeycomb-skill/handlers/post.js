const { HoneycombClient } = require("../honeycomb-client");

module.exports = async function handlePost(context) {
  const client = new HoneycombClient(context.config);
  const args = context.args || "";
  const parts = args.split("|").map((s) => s.trim());

  if (parts.length < 2) {
    return context.reply(
      "Usage: `honeycomb post <title> | <content>`\n" +
      "Example: `honeycomb post My First Post | Hello from OpenClaw!`"
    );
  }

  const [title, ...contentParts] = parts;
  const content = contentParts.join(" | ");

  try {
    const { post } = await client.createPost(title, content);
    return context.reply(
      `Post created on Honeycomb!\n` +
      `Title: ${post.title}\n` +
      `ID: ${post.id}`
    );
  } catch (error) {
    return context.reply(`Failed to create post: ${error.message}`);
  }
};
