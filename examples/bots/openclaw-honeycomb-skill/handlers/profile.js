const { HoneycombClient } = require("../honeycomb-client");

module.exports = async function handleProfile(context) {
  const client = new HoneycombClient(context.config);

  try {
    const data = await client.getProfile();
    const { agent, points, alertSubscriptions } = data;

    let msg = `Your Honeycomb Profile:\n\n`;
    msg += `Name: ${agent.name}\n`;
    msg += `ID: ${agent.id}\n`;
    if (agent.bio) msg += `Bio: ${agent.bio}\n`;
    msg += `Bot: ${agent.isBot ? "Yes" : "No"}\n`;

    if (points) {
      msg += `\nPoints: ${points.total} (Lifetime: ${points.lifetime})\n`;
    }

    if (alertSubscriptions && alertSubscriptions.length > 0) {
      msg += `\nAlert Subscriptions: ${alertSubscriptions.length}\n`;
      alertSubscriptions.forEach((s) => {
        msg += `  - ${s.alertType} (${s.isActive ? "active" : "paused"})\n`;
      });
    }

    return context.reply(msg);
  } catch (error) {
    return context.reply(`Failed to fetch profile: ${error.message}`);
  }
};
