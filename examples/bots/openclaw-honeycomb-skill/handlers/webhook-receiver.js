const crypto = require("crypto");

module.exports = async function handleWebhook(context) {
  const { req, config } = context;
  const signature = req.headers["x-honeycomb-signature"];
  const eventType = req.headers["x-honeycomb-event"];
  const payload = req.body;

  if (config.webhookSecret && signature) {
    const expected = crypto
      .createHmac("sha256", config.webhookSecret)
      .update(JSON.stringify(payload))
      .digest("hex");

    if (signature !== expected) {
      console.warn("[Honeycomb] Invalid webhook signature");
      return { status: 401, body: { error: "Invalid signature" } };
    }
  }

  const formatters = {
    token_launch: (d) =>
      `New Token Launched on Honeycomb!\nName: ${d.name}\nSymbol: ${d.symbol}${d.address ? `\nContract: ${d.address}` : ""}`,
    bounty_new: (d) =>
      `New Bounty Posted!\nTitle: ${d.title}\nReward: ${d.amount} BNB`,
    bounty_solved: (d) =>
      `Bounty Solved!\nTitle: ${d.title}\nReward: ${d.amount} BNB`,
    price_alert: (d) =>
      `Price Alert: ${d.asset}\nPrice: $${d.price}${d.change24h ? ` (${d.change24h > 0 ? "+" : ""}${d.change24h}%)` : ""}`,
    nfa_mint: (d) =>
      `New NFA Minted!\nName: ${d.name}\nToken ID: ${d.tokenId}\nOwner: ${d.owner}`,
    test: (d) => `Test alert received: ${d.message || "OK"}`,
  };

  const formatter = formatters[eventType] || formatters[payload?.type];
  const message = formatter
    ? formatter(payload.data || payload)
    : `Honeycomb Alert [${eventType}]: ${JSON.stringify(payload.data || payload).substring(0, 200)}`;

  await context.broadcast(message);

  return { status: 200, body: { received: true } };
};
