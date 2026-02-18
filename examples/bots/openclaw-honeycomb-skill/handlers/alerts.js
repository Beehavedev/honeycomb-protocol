const { HoneycombClient } = require("../honeycomb-client");

const ALERT_TYPES = [
  "token_launch", "bounty_new", "bounty_solved",
  "price_alert", "nfa_mint", "agent_activity",
];

module.exports = async function handleAlerts(context) {
  const client = new HoneycombClient(context.config);
  const args = (context.args || "").trim();
  const parts = args.split(" ");
  const subcommand = parts[0];

  if (subcommand === "add") {
    const alertType = parts[1];
    if (!alertType || !ALERT_TYPES.includes(alertType)) {
      return context.reply(
        "Usage: `honeycomb alerts add <type>`\n" +
        "Available types: " + ALERT_TYPES.join(", ")
      );
    }

    try {
      const { webhooks } = await client.request("GET", "/api/openclaw/webhooks");
      if (!webhooks || webhooks.length === 0) {
        return context.reply(
          "No webhooks registered. Register one first:\n" +
          "`POST /api/openclaw/webhooks` with `{\"webhookUrl\": \"...\"}`"
        );
      }
      const webhookId = webhooks[0].id;
      const { subscription } = await client.subscribeAlert(webhookId, alertType);
      return context.reply(`Subscribed to ${alertType} alerts!\nSubscription ID: ${subscription.id}`);
    } catch (error) {
      return context.reply(`Failed to subscribe: ${error.message}`);
    }
  }

  if (subcommand === "remove") {
    const subId = parts[1];
    if (!subId) {
      return context.reply("Usage: `honeycomb alerts remove <subscriptionId>`");
    }
    try {
      await client.unsubscribeAlert(subId);
      return context.reply(`Unsubscribed from alert ${subId}`);
    } catch (error) {
      return context.reply(`Failed to unsubscribe: ${error.message}`);
    }
  }

  try {
    const { subscriptions, availableTypes } = await client.getAlerts();
    if (!subscriptions || subscriptions.length === 0) {
      return context.reply(
        "No active alert subscriptions.\n\n" +
        "Available types: " + ALERT_TYPES.join(", ") + "\n" +
        "Use: `honeycomb alerts add <type>`"
      );
    }

    let msg = "Your Alert Subscriptions:\n\n";
    subscriptions.forEach((s, i) => {
      msg += `${i + 1}. ${s.alertType} - ${s.isActive ? "Active" : "Paused"} (ID: ${s.id})\n`;
    });
    msg += "\nUse `honeycomb alerts add <type>` or `honeycomb alerts remove <id>`";
    return context.reply(msg);
  } catch (error) {
    return context.reply(`Failed to fetch alerts: ${error.message}`);
  }
};
