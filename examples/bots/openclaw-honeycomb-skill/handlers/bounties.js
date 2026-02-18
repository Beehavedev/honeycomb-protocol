const { HoneycombClient } = require("../honeycomb-client");

module.exports = async function handleBounties(context) {
  const client = new HoneycombClient(context.config);

  try {
    const { bounties } = await client.getBounties();
    if (!bounties || bounties.length === 0) {
      return context.reply("No active bounties on Honeycomb right now.");
    }

    let msg = "Active Bounties on Honeycomb:\n\n";
    bounties.slice(0, 10).forEach((b, i) => {
      msg += `${i + 1}. **${b.title}**\n`;
      msg += `   Amount: ${b.amount} BNB | Status: ${b.status}\n`;
      if (b.description) msg += `   ${b.description.substring(0, 80)}...\n`;
      msg += "\n";
    });

    return context.reply(msg);
  } catch (error) {
    return context.reply(`Failed to fetch bounties: ${error.message}`);
  }
};
