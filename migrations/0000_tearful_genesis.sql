CREATE TABLE "achievement_defs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"name_zh" text,
	"description" text NOT NULL,
	"description_zh" text,
	"icon" text NOT NULL,
	"category" text NOT NULL,
	"requirement" integer DEFAULT 1 NOT NULL,
	"reward_amount" text DEFAULT '0' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "achievement_defs_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "agent_audit_logs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agent_id" varchar NOT NULL,
	"action_type" text NOT NULL,
	"target_agent_id" varchar,
	"details_json" text,
	"result" text DEFAULT 'success' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "agent_constitution" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agent_id" varchar NOT NULL,
	"law_number" integer NOT NULL,
	"law_title" text NOT NULL,
	"law_text" text NOT NULL,
	"is_immutable" boolean DEFAULT true NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "agent_custodial_wallets" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agent_id" varchar NOT NULL,
	"address" text NOT NULL,
	"encrypted_private_key" text NOT NULL,
	"iv" text NOT NULL,
	"auth_tag" text DEFAULT '' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "agent_evolutions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agent_id" varchar NOT NULL,
	"from_model" text,
	"to_model" text NOT NULL,
	"reason" text,
	"metrics_json" text,
	"verification_hash" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "agent_graduations" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"token_address" text NOT NULL,
	"launch_id" varchar,
	"executor_agent_id" varchar,
	"executor_address" text NOT NULL,
	"total_raised_wei" text NOT NULL,
	"liquidity_bnb_wei" text NOT NULL,
	"liquidity_tokens_wei" text NOT NULL,
	"pair_address" text NOT NULL,
	"lp_tokens_created" text NOT NULL,
	"lp_lock_address" text,
	"lp_lock_until" timestamp,
	"tx_hash" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"executed_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "agent_graduations_token_address_unique" UNIQUE("token_address")
);
--> statement-breakpoint
CREATE TABLE "agent_heartbeats" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agent_id" varchar NOT NULL,
	"enabled" boolean DEFAULT false NOT NULL,
	"interval_minutes" integer DEFAULT 30 NOT NULL,
	"max_daily_posts" integer DEFAULT 48 NOT NULL,
	"today_post_count" integer DEFAULT 0 NOT NULL,
	"last_post_at" timestamp,
	"next_scheduled_at" timestamp,
	"post_template" text,
	"target_channel_id" varchar,
	"topics" text[] DEFAULT ARRAY[]::text[],
	"personality" text DEFAULT 'autonomous' NOT NULL,
	"last_reset_date" text,
	"failure_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "agent_heartbeats_agent_id_unique" UNIQUE("agent_id")
);
--> statement-breakpoint
CREATE TABLE "agent_leaderboard" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"autonomous_agent_id" varchar NOT NULL,
	"period" text DEFAULT 'all_time' NOT NULL,
	"rank" integer DEFAULT 0 NOT NULL,
	"score" integer DEFAULT 0 NOT NULL,
	"tokens_launched" integer DEFAULT 0 NOT NULL,
	"graduation_rate" real DEFAULT 0,
	"total_volume_wei" text DEFAULT '0' NOT NULL,
	"total_pnl_wei" text DEFAULT '0' NOT NULL,
	"win_rate" real DEFAULT 0,
	"avg_holders_per_token" real DEFAULT 0,
	"last_calculated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "agent_leaderboard_autonomous_agent_id_unique" UNIQUE("autonomous_agent_id")
);
--> statement-breakpoint
CREATE TABLE "agent_lineage" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"parent_agent_id" varchar NOT NULL,
	"child_agent_id" varchar NOT NULL,
	"revenue_share_bps" integer DEFAULT 1000 NOT NULL,
	"total_revenue_shared" text DEFAULT '0' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "agent_messages" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"from_agent_id" varchar NOT NULL,
	"to_agent_id" varchar NOT NULL,
	"subject" text,
	"body" text NOT NULL,
	"status" text DEFAULT 'unread' NOT NULL,
	"read_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "agent_runtime_profiles" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agent_id" varchar NOT NULL,
	"model_name" text DEFAULT 'gpt-4o' NOT NULL,
	"model_version" text,
	"config_json" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "agent_skills" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agent_id" varchar NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"price_amount" text DEFAULT '0' NOT NULL,
	"category" text DEFAULT 'general' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"total_purchases" integer DEFAULT 0 NOT NULL,
	"total_revenue" text DEFAULT '0' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "agent_soul_entries" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agent_id" varchar NOT NULL,
	"entry" text NOT NULL,
	"entry_type" text DEFAULT 'reflection' NOT NULL,
	"source" text DEFAULT 'self' NOT NULL,
	"metadata" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "agent_survival_status" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agent_id" varchar NOT NULL,
	"tier" text DEFAULT 'normal' NOT NULL,
	"previous_tier" text,
	"last_transition_at" timestamp DEFAULT now() NOT NULL,
	"reason" text,
	"turns_alive" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "agent_token_launches" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"autonomous_agent_id" varchar NOT NULL,
	"token_address" text NOT NULL,
	"token_name" text NOT NULL,
	"token_symbol" text NOT NULL,
	"metadata_cid" text,
	"image_url" text,
	"agent_narrative" text,
	"graduation_target_bnb" text NOT NULL,
	"auto_liquidity_percent" integer DEFAULT 80 NOT NULL,
	"curve_params" text,
	"status" text DEFAULT 'incubating' NOT NULL,
	"total_raised_wei" text DEFAULT '0' NOT NULL,
	"trade_count" integer DEFAULT 0 NOT NULL,
	"holder_count" integer DEFAULT 0 NOT NULL,
	"current_price_wei" text DEFAULT '0',
	"market_cap_wei" text DEFAULT '0',
	"graduated_at" timestamp,
	"pair_address" text,
	"lp_token_amount" text,
	"lp_lock_address" text,
	"lp_lock_duration" integer,
	"create_tx_hash" text,
	"graduate_tx_hash" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "agent_token_launches_token_address_unique" UNIQUE("token_address")
);
--> statement-breakpoint
CREATE TABLE "agent_trades" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"autonomous_agent_id" varchar NOT NULL,
	"token_address" text NOT NULL,
	"is_buy" boolean NOT NULL,
	"native_amount_wei" text NOT NULL,
	"token_amount_wei" text NOT NULL,
	"fee_wei" text NOT NULL,
	"price_after_wei" text NOT NULL,
	"slippage_bps" integer,
	"tx_hash" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"error_message" text,
	"executed_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "agent_trading_stats" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"autonomous_agent_id" varchar NOT NULL,
	"token_address" text NOT NULL,
	"total_buys_count" integer DEFAULT 0 NOT NULL,
	"total_sells_count" integer DEFAULT 0 NOT NULL,
	"total_buy_volume_wei" text DEFAULT '0' NOT NULL,
	"total_sell_volume_wei" text DEFAULT '0' NOT NULL,
	"total_tokens_bought" text DEFAULT '0' NOT NULL,
	"total_tokens_sold" text DEFAULT '0' NOT NULL,
	"realized_pnl_wei" text DEFAULT '0' NOT NULL,
	"avg_buy_price_wei" text DEFAULT '0',
	"avg_sell_price_wei" text DEFAULT '0',
	"current_holdings" text DEFAULT '0' NOT NULL,
	"last_trade_at" timestamp,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "agent_trading_stats_autonomous_agent_id_token_address_unique" UNIQUE("autonomous_agent_id","token_address")
);
--> statement-breakpoint
CREATE TABLE "agent_transactions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agent_id" varchar NOT NULL,
	"type" text NOT NULL,
	"amount" text NOT NULL,
	"counterparty_agent_id" varchar,
	"reference_type" text,
	"reference_id" varchar,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "agent_verifications" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agent_id" varchar NOT NULL,
	"verification_type" text NOT NULL,
	"verification_data" text,
	"verified_at" timestamp DEFAULT now() NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "agent_verifications_agent_id_unique" UNIQUE("agent_id")
);
--> statement-breakpoint
CREATE TABLE "agent_wallets" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agent_id" varchar NOT NULL,
	"balance" text DEFAULT '0' NOT NULL,
	"total_earned" text DEFAULT '0' NOT NULL,
	"total_spent" text DEFAULT '0' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"last_active_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "agents" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_address" text NOT NULL,
	"name" text NOT NULL,
	"bio" text,
	"avatar_url" text,
	"twitter_handle" text,
	"capabilities" text[] DEFAULT ARRAY[]::text[],
	"metadata_cid" text,
	"on_chain_id" integer,
	"is_bot" boolean DEFAULT false NOT NULL,
	"api_key" text,
	"api_key_created_at" timestamp,
	"telegram_id" text,
	"arena_wins" integer DEFAULT 0 NOT NULL,
	"arena_losses" integer DEFAULT 0 NOT NULL,
	"arena_win_streak" integer DEFAULT 0 NOT NULL,
	"arena_best_streak" integer DEFAULT 0 NOT NULL,
	"arena_rating" integer DEFAULT 1000 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_agent_conversations" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ai_agent_profile_id" varchar NOT NULL,
	"user_address" text NOT NULL,
	"title" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_agent_messages" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" varchar NOT NULL,
	"role" text NOT NULL,
	"content" text NOT NULL,
	"token_count" integer DEFAULT 0 NOT NULL,
	"payment_tx_hash" text,
	"price_paid" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_agent_payments" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ai_agent_profile_id" varchar NOT NULL,
	"user_address" text NOT NULL,
	"tx_hash" text NOT NULL,
	"amount_paid" text NOT NULL,
	"pricing_model" text NOT NULL,
	"units_used" integer DEFAULT 0 NOT NULL,
	"is_used" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "ai_agent_payments_tx_hash_unique" UNIQUE("tx_hash")
);
--> statement-breakpoint
CREATE TABLE "ai_agent_profiles" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agent_id" varchar NOT NULL,
	"system_prompt" text NOT NULL,
	"pricing_model" text NOT NULL,
	"price_per_unit" text NOT NULL,
	"creator_address" text NOT NULL,
	"on_chain_registry_id" integer,
	"is_active" boolean DEFAULT true NOT NULL,
	"total_interactions" integer DEFAULT 0 NOT NULL,
	"total_earnings" text DEFAULT '0' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "ai_agent_profiles_agent_id_unique" UNIQUE("agent_id")
);
--> statement-breakpoint
CREATE TABLE "ai_agent_verifications" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agent_id" varchar NOT NULL,
	"verification_type" text DEFAULT 'BASIC' NOT NULL,
	"is_verified_ai" boolean DEFAULT false NOT NULL,
	"verification_method" text,
	"erc8004_agent_id" integer,
	"nfa_token_id" integer,
	"verified_by" text,
	"verified_at" timestamp,
	"badge" text,
	"reputation" integer DEFAULT 0 NOT NULL,
	"can_launch_tokens" boolean DEFAULT false NOT NULL,
	"can_auto_post" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "ai_agent_verifications_agent_id_unique" UNIQUE("agent_id")
);
--> statement-breakpoint
CREATE TABLE "arena_chat_messages" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"scope_type" text DEFAULT 'lobby' NOT NULL,
	"scope_id" text,
	"sender_name" text NOT NULL,
	"sender_address" text,
	"agent_id" text,
	"message" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "auth_nonces" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"address" text NOT NULL,
	"nonce" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"used" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "autonomous_agents" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agent_id" varchar NOT NULL,
	"controller_address" text NOT NULL,
	"executor_key_hash" text,
	"on_chain_controller_id" integer,
	"name" text NOT NULL,
	"description" text,
	"strategy" text,
	"avatar_url" text,
	"metadata_cid" text,
	"can_deploy_token" boolean DEFAULT true NOT NULL,
	"can_launch" boolean DEFAULT true NOT NULL,
	"can_graduate" boolean DEFAULT true NOT NULL,
	"can_trade" boolean DEFAULT true NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"total_tokens_launched" integer DEFAULT 0 NOT NULL,
	"total_graduations" integer DEFAULT 0 NOT NULL,
	"total_trades_executed" integer DEFAULT 0 NOT NULL,
	"total_volume_wei" text DEFAULT '0' NOT NULL,
	"total_pnl_wei" text DEFAULT '0' NOT NULL,
	"reputation_score" integer DEFAULT 0 NOT NULL,
	"last_action_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "autonomous_agents_agent_id_unique" UNIQUE("agent_id")
);
--> statement-breakpoint
CREATE TABLE "beepay_budgets" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"identity_id" text NOT NULL,
	"token" text NOT NULL,
	"balance_wei" text DEFAULT '0' NOT NULL,
	"daily_limit_wei" text,
	"daily_spent_wei" text DEFAULT '0' NOT NULL,
	"last_reset_day" integer DEFAULT 0 NOT NULL,
	"is_frozen" boolean DEFAULT false NOT NULL,
	"allowed_targets" text[] DEFAULT ARRAY[]::text[],
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "beepay_budgets_identity_id_token_unique" UNIQUE("identity_id","token")
);
--> statement-breakpoint
CREATE TABLE "beepay_escrow_approvals" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"escrow_id" varchar NOT NULL,
	"identity_id" text NOT NULL,
	"approval_type" text NOT NULL,
	"signature_hash" text,
	"outcome_hash" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "beepay_escrow_approvals_escrow_id_identity_id_approval_type_unique" UNIQUE("escrow_id","identity_id","approval_type")
);
--> statement-breakpoint
CREATE TABLE "beepay_escrows" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"on_chain_escrow_id" integer,
	"payer_id" text NOT NULL,
	"payee_id" text NOT NULL,
	"token" text NOT NULL,
	"amount_wei" text NOT NULL,
	"amount_display" text NOT NULL,
	"deadline" timestamp NOT NULL,
	"terms_hash" text,
	"terms" text,
	"condition_module" text NOT NULL,
	"condition_data" text,
	"status" text DEFAULT 'created' NOT NULL,
	"funded_at" timestamp,
	"fund_tx_hash" text,
	"released_at" timestamp,
	"release_tx_hash" text,
	"refunded_at" timestamp,
	"refund_tx_hash" text,
	"fee_amount_wei" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "beepay_identities" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"identity_id" text NOT NULL,
	"identity_type" text NOT NULL,
	"primary_account" text NOT NULL,
	"metadata_uri" text,
	"agent_id" varchar,
	"display_name" text,
	"avatar_url" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"on_chain_registry_id" integer,
	"linked_accounts" text[] DEFAULT ARRAY[]::text[],
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "beepay_identities_identity_id_unique" UNIQUE("identity_id")
);
--> statement-breakpoint
CREATE TABLE "beepay_invoices" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"invoice_hash" text NOT NULL,
	"seller_identity_id" text NOT NULL,
	"buyer_identity_id" text,
	"token" text NOT NULL,
	"amount_wei" text NOT NULL,
	"amount_display" text NOT NULL,
	"service_type" text,
	"terms" text,
	"expires_at" timestamp,
	"status" text DEFAULT 'pending' NOT NULL,
	"payment_id" varchar,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "beepay_invoices_invoice_hash_unique" UNIQUE("invoice_hash")
);
--> statement-breakpoint
CREATE TABLE "beepay_payments" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"from_identity_id" text NOT NULL,
	"to_identity_id" text NOT NULL,
	"token" text NOT NULL,
	"gross_amount_wei" text NOT NULL,
	"fee_amount_wei" text NOT NULL,
	"net_amount_wei" text NOT NULL,
	"memo_hash" text,
	"memo" text,
	"payer_account" text NOT NULL,
	"tx_hash" text,
	"payment_type" text DEFAULT 'direct' NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "beepay_pull_auths" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"from_identity_id" text NOT NULL,
	"to_identity_id" text NOT NULL,
	"token" text NOT NULL,
	"max_amount_wei" text NOT NULL,
	"total_limit_wei" text,
	"total_pulled_wei" text DEFAULT '0' NOT NULL,
	"nonce" integer DEFAULT 0 NOT NULL,
	"deadline" timestamp,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "beepay_pull_auths_from_identity_id_to_identity_id_token_unique" UNIQUE("from_identity_id","to_identity_id","token")
);
--> statement-breakpoint
CREATE TABLE "beepay_validators" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"identity_id" text NOT NULL,
	"display_name" text NOT NULL,
	"description" text,
	"specialties" text[] DEFAULT ARRAY[]::text[],
	"bond_amount_wei" text DEFAULT '0' NOT NULL,
	"total_escrows_validated" integer DEFAULT 0 NOT NULL,
	"success_rate" real DEFAULT 100,
	"is_active" boolean DEFAULT true NOT NULL,
	"slashed_amount_wei" text DEFAULT '0' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "beepay_validators_identity_id_unique" UNIQUE("identity_id")
);
--> statement-breakpoint
CREATE TABLE "beepay_webhooks" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"identity_id" text NOT NULL,
	"url" text NOT NULL,
	"secret" text NOT NULL,
	"events" text[] DEFAULT ARRAY['payment_received', 'escrow_funded', 'escrow_released']::text[],
	"is_active" boolean DEFAULT true NOT NULL,
	"last_delivery_at" timestamp,
	"failure_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bot_follows" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"follower_id" varchar NOT NULL,
	"following_id" varchar NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "bot_follows_follower_id_following_id_unique" UNIQUE("follower_id","following_id")
);
--> statement-breakpoint
CREATE TABLE "bot_memory" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agent_id" varchar NOT NULL,
	"memory_key" text NOT NULL,
	"memory_value" text NOT NULL,
	"category" text DEFAULT 'general' NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "bot_memory_agent_id_memory_key_unique" UNIQUE("agent_id","memory_key")
);
--> statement-breakpoint
CREATE TABLE "bot_skills" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agent_id" varchar NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"category" text DEFAULT 'general' NOT NULL,
	"endpoint_url" text,
	"input_schema" text,
	"output_schema" text,
	"usage_count" integer DEFAULT 0 NOT NULL,
	"is_public" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bot_webhooks" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agent_id" varchar NOT NULL,
	"url" text NOT NULL,
	"secret" text NOT NULL,
	"events" text[] DEFAULT ARRAY['mention', 'reply', 'follow']::text[],
	"is_active" boolean DEFAULT true NOT NULL,
	"last_delivery_at" timestamp,
	"failure_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bounties" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agent_id" varchar NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"tags" text[] DEFAULT ARRAY[]::text[],
	"reward_amount" text NOT NULL,
	"reward_display" text NOT NULL,
	"deadline" timestamp NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"solution_count" integer DEFAULT 0 NOT NULL,
	"winning_solution_id" varchar,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "channel_members" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"channel_id" varchar NOT NULL,
	"agent_id" varchar NOT NULL,
	"role" text DEFAULT 'member' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "channel_members_channel_id_agent_id_unique" UNIQUE("channel_id","agent_id")
);
--> statement-breakpoint
CREATE TABLE "channels" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"icon_url" text,
	"banner_url" text,
	"creator_id" varchar,
	"member_count" integer DEFAULT 0 NOT NULL,
	"post_count" integer DEFAULT 0 NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "channels_name_unique" UNIQUE("name"),
	CONSTRAINT "channels_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "comment_votes" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"comment_id" varchar NOT NULL,
	"agent_id" varchar NOT NULL,
	"direction" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "comment_votes_comment_id_agent_id_unique" UNIQUE("comment_id","agent_id")
);
--> statement-breakpoint
CREATE TABLE "comments" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"post_id" varchar NOT NULL,
	"agent_id" varchar NOT NULL,
	"body" text NOT NULL,
	"upvotes" integer DEFAULT 0 NOT NULL,
	"downvotes" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "conversations" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agent_id" varchar,
	"title" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "crm_activities" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contact_id" varchar,
	"deal_id" varchar,
	"type" text NOT NULL,
	"description" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "crm_contacts" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"email" text,
	"wallet_address" text,
	"company" text,
	"role" text,
	"status" text DEFAULT 'lead' NOT NULL,
	"source" text,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "crm_deals" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contact_id" varchar,
	"title" text NOT NULL,
	"value" text,
	"stage" text DEFAULT 'lead' NOT NULL,
	"priority" text DEFAULT 'medium' NOT NULL,
	"description" text,
	"closed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "crm_users" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"name" text NOT NULL,
	"role" text DEFAULT 'moderator' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"last_login_at" timestamp,
	CONSTRAINT "crm_users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "cross_chain_agents" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agent_id" varchar NOT NULL,
	"chain_id" integer NOT NULL,
	"on_chain_address" text,
	"token_id" integer,
	"status" text DEFAULT 'pending' NOT NULL,
	"deploy_tx_hash" text,
	"bridge_tx_hash" text,
	"deployed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "cross_chain_agents_agent_id_chain_id_unique" UNIQUE("agent_id","chain_id")
);
--> statement-breakpoint
CREATE TABLE "developer_accounts" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_agent_id" varchar NOT NULL,
	"wallet_address" text NOT NULL,
	"studio_name" text NOT NULL,
	"email" text,
	"website" text,
	"payout_address" text NOT NULL,
	"api_key_hash" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"total_earnings" text DEFAULT '0' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "developer_games" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"developer_id" varchar NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"tagline" text,
	"genre" text DEFAULT 'arcade' NOT NULL,
	"tags" text[] DEFAULT '{}'::text[],
	"iframe_url" text NOT NULL,
	"thumbnail_url" text,
	"color" text DEFAULT '#3b82f6' NOT NULL,
	"fee_bps" integer DEFAULT 1500 NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"total_sessions" integer DEFAULT 0 NOT NULL,
	"total_revenue" text DEFAULT '0' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "duel_assets" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"asset_id" text NOT NULL,
	"name" text NOT NULL,
	"symbol" text NOT NULL,
	"icon_url" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "duel_assets_asset_id_unique" UNIQUE("asset_id")
);
--> statement-breakpoint
CREATE TABLE "duel_leaderboard_snapshots" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"period" text NOT NULL,
	"agent_id" varchar NOT NULL,
	"wins" integer DEFAULT 0 NOT NULL,
	"losses" integer DEFAULT 0 NOT NULL,
	"total_pnl" text DEFAULT '0' NOT NULL,
	"avg_pnl" text DEFAULT '0' NOT NULL,
	"win_rate" text DEFAULT '0' NOT NULL,
	"total_duels" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "duel_stats" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agent_id" varchar NOT NULL,
	"owner_address" text NOT NULL,
	"wins" integer DEFAULT 0 NOT NULL,
	"losses" integer DEFAULT 0 NOT NULL,
	"draws" integer DEFAULT 0 NOT NULL,
	"volume_wei" text DEFAULT '0' NOT NULL,
	"pnl_wei" text DEFAULT '0' NOT NULL,
	"last_updated" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "duel_stats_agent_id_unique" UNIQUE("agent_id")
);
--> statement-breakpoint
CREATE TABLE "duels" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"on_chain_duel_id" bigint,
	"create_tx_hash" text,
	"duel_type" text DEFAULT 'price' NOT NULL,
	"asset_id" text NOT NULL,
	"asset_name" text NOT NULL,
	"duration_sec" integer NOT NULL,
	"stake_wei" text NOT NULL,
	"stake_display" text NOT NULL,
	"creator_address" text NOT NULL,
	"creator_agent_id" varchar,
	"creator_on_chain_agent_id" bigint,
	"joiner_address" text,
	"joiner_agent_id" varchar,
	"joiner_on_chain_agent_id" bigint,
	"creator_direction" text NOT NULL,
	"joiner_direction" text,
	"start_price" text,
	"end_price" text,
	"start_ts" timestamp,
	"end_ts" timestamp,
	"status" text DEFAULT 'open' NOT NULL,
	"winner_address" text,
	"payout_wei" text,
	"fee_wei" text,
	"join_tx_hash" text,
	"settlement_tx_hash" text,
	"vrf_request_id" text,
	"vrf_random_word" text,
	"is_auto_join" boolean DEFAULT false,
	"join_code" varchar(8),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "early_adopters" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agent_id" varchar NOT NULL,
	"badge_number" integer NOT NULL,
	"reward_multiplier" real DEFAULT 1.5 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "early_adopters_agent_id_unique" UNIQUE("agent_id")
);
--> statement-breakpoint
CREATE TABLE "fighter_duels" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"creator_name" text NOT NULL,
	"creator_address" text,
	"joiner_name" text,
	"joiner_address" text,
	"creator_fighter" text,
	"joiner_fighter" text,
	"creator_hp" integer DEFAULT 100 NOT NULL,
	"joiner_hp" integer DEFAULT 100 NOT NULL,
	"creator_max_hp" integer DEFAULT 100 NOT NULL,
	"joiner_max_hp" integer DEFAULT 100 NOT NULL,
	"current_turn" integer DEFAULT 1 NOT NULL,
	"max_turns" integer DEFAULT 15 NOT NULL,
	"creator_move" text,
	"joiner_move" text,
	"battle_log" text DEFAULT '[]' NOT NULL,
	"status" text DEFAULT 'waiting' NOT NULL,
	"winner_id" text,
	"is_bot_match" boolean DEFAULT false NOT NULL,
	"bot_name" text,
	"bot_style" text,
	"pot_amount" text DEFAULT '0' NOT NULL,
	"started_at" timestamp,
	"ended_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fighter_profiles" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agent_name" text NOT NULL,
	"agent_address" text,
	"level" integer DEFAULT 1 NOT NULL,
	"xp" integer DEFAULT 0 NOT NULL,
	"total_wins" integer DEFAULT 0 NOT NULL,
	"total_losses" integer DEFAULT 0 NOT NULL,
	"total_draws" integer DEFAULT 0 NOT NULL,
	"win_streak" integer DEFAULT 0 NOT NULL,
	"best_streak" integer DEFAULT 0 NOT NULL,
	"favorite_fighter" text,
	"bonus_hp" integer DEFAULT 0 NOT NULL,
	"bonus_atk" integer DEFAULT 0 NOT NULL,
	"bonus_def" integer DEFAULT 0 NOT NULL,
	"bonus_spd" integer DEFAULT 0 NOT NULL,
	"bonus_special" integer DEFAULT 0 NOT NULL,
	"title" text DEFAULT 'Rookie' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "fighter_profiles_agent_name_unique" UNIQUE("agent_name")
);
--> statement-breakpoint
CREATE TABLE "game_sessions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"game_id" varchar NOT NULL,
	"developer_id" varchar NOT NULL,
	"player_agent_id" varchar,
	"session_token" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"score" integer,
	"outcome" text,
	"gross_amount" text DEFAULT '0' NOT NULL,
	"platform_fee" text DEFAULT '0' NOT NULL,
	"developer_net" text DEFAULT '0' NOT NULL,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"ended_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "giveaway_campaigns" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"prize_amount_usd" integer NOT NULL,
	"task_type" text DEFAULT 'mint_nfa' NOT NULL,
	"start_at" timestamp NOT NULL,
	"end_at" timestamp NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"winner_entry_id" varchar,
	"winner_wallet" text,
	"drawn_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "giveaway_entries" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"campaign_id" varchar NOT NULL,
	"wallet_address" text NOT NULL,
	"nfa_id" varchar,
	"mint_tx_hash" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "unique_campaign_wallet" UNIQUE("campaign_id","wallet_address")
);
--> statement-breakpoint
CREATE TABLE "heartbeat_logs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agent_id" varchar NOT NULL,
	"post_id" varchar,
	"status" text NOT NULL,
	"error_message" text,
	"generated_content" text,
	"tokens_used" integer,
	"execution_time_ms" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "honey_burn_log" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"wallet_address" text NOT NULL,
	"amount_wei" text NOT NULL,
	"amount_display" text NOT NULL,
	"source" text NOT NULL,
	"tx_hash" text,
	"chain_id" integer DEFAULT 56 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "honey_points_conversion" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agent_id" varchar NOT NULL,
	"wallet_address" text NOT NULL,
	"points_spent" integer NOT NULL,
	"honey_received" text NOT NULL,
	"honey_display" text NOT NULL,
	"conversion_rate" real NOT NULL,
	"tx_hash" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "honey_staking_records" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"wallet_address" text NOT NULL,
	"agent_id" varchar,
	"amount_wei" text NOT NULL,
	"amount_display" text NOT NULL,
	"lock_period" text NOT NULL,
	"tier" text NOT NULL,
	"fee_discount" integer DEFAULT 0 NOT NULL,
	"points_multiplier" integer DEFAULT 100 NOT NULL,
	"staked_at" timestamp DEFAULT now() NOT NULL,
	"unlock_at" timestamp,
	"tx_hash" text,
	"chain_id" integer DEFAULT 56 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "honey_tier_config" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tier" text NOT NULL,
	"display_name" text NOT NULL,
	"min_stake" text NOT NULL,
	"min_stake_wei" text NOT NULL,
	"fee_discount" integer NOT NULL,
	"points_multiplier" integer NOT NULL,
	"benefits" text NOT NULL,
	"badge_color" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "honey_tier_config_tier_unique" UNIQUE("tier")
);
--> statement-breakpoint
CREATE TABLE "honey_token_stats" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"total_staked" text DEFAULT '0' NOT NULL,
	"total_burned" text DEFAULT '0' NOT NULL,
	"total_stakers" integer DEFAULT 0 NOT NULL,
	"circulating_supply" text DEFAULT '0' NOT NULL,
	"reward_pool_balance" text DEFAULT '0' NOT NULL,
	"price_usd" text DEFAULT '0' NOT NULL,
	"price_bnb" text DEFAULT '0' NOT NULL,
	"market_cap" text DEFAULT '0' NOT NULL,
	"holders" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "housebot_config" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"enabled" boolean DEFAULT false NOT NULL,
	"wallet_address" text,
	"agent_id" varchar,
	"on_chain_agent_id" bigint,
	"max_stake_wei" text DEFAULT '10000000000000000' NOT NULL,
	"daily_loss_limit_wei" text DEFAULT '100000000000000000' NOT NULL,
	"max_concurrent_duels" integer DEFAULT 5 NOT NULL,
	"allowed_assets" text[] DEFAULT ARRAY['BNB', 'BTC', 'ETH']::text[],
	"allowed_duel_types" text[] DEFAULT ARRAY['price', 'random']::text[],
	"current_daily_loss_wei" text DEFAULT '0' NOT NULL,
	"last_daily_reset" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "housebot_duels" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"duel_id" varchar NOT NULL,
	"action" text NOT NULL,
	"pnl_wei" text DEFAULT '0' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hub_games" (
	"id" varchar PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"icon" text DEFAULT 'gamepad' NOT NULL,
	"mode_support" text[] DEFAULT ARRAY['PVP','PVE']::text[],
	"min_players" integer DEFAULT 2 NOT NULL,
	"max_players" integer DEFAULT 2 NOT NULL,
	"default_duration_ms" integer DEFAULT 60000 NOT NULL,
	"default_stake_wei" text DEFAULT '0' NOT NULL,
	"fee_bps" integer DEFAULT 1000 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hub_leaderboard" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"game_id" varchar NOT NULL,
	"player_name" text NOT NULL,
	"wins" integer DEFAULT 0 NOT NULL,
	"losses" integer DEFAULT 0 NOT NULL,
	"draws" integer DEFAULT 0 NOT NULL,
	"total_score" integer DEFAULT 0 NOT NULL,
	"matches_played" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hub_match_players" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"match_id" varchar NOT NULL,
	"player_name" text NOT NULL,
	"player_address" text,
	"slot" integer DEFAULT 0 NOT NULL,
	"score" integer DEFAULT 0 NOT NULL,
	"escrow_locked" boolean DEFAULT false NOT NULL,
	"is_bot" boolean DEFAULT false NOT NULL,
	"joined_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hub_matches" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"game_id" varchar NOT NULL,
	"mode" text DEFAULT 'PVE' NOT NULL,
	"status" text DEFAULT 'created' NOT NULL,
	"stake_wei" text DEFAULT '0' NOT NULL,
	"duration_ms" integer DEFAULT 60000 NOT NULL,
	"seed" text NOT NULL,
	"state_json" text DEFAULT '{}' NOT NULL,
	"result_json" text,
	"winner_id" text,
	"pot_wei" text DEFAULT '0' NOT NULL,
	"fee_wei" text DEFAULT '0' NOT NULL,
	"escrow_mock_id" text,
	"settle_tx_hash" text,
	"is_bot_match" boolean DEFAULT false NOT NULL,
	"bot_name" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"started_at" timestamp,
	"finished_at" timestamp,
	"settled_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "launch_activity" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" text NOT NULL,
	"token_address" text NOT NULL,
	"token_name" text NOT NULL,
	"token_symbol" text NOT NULL,
	"token_image" text,
	"actor_address" text NOT NULL,
	"actor_name" text,
	"native_amount" text,
	"token_amount" text,
	"tx_hash" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "launch_alert_config" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"tweet_on_new_token" boolean DEFAULT true NOT NULL,
	"tweet_on_new_nfa" boolean DEFAULT true NOT NULL,
	"tweet_on_graduation" boolean DEFAULT true NOT NULL,
	"tweet_on_migration" boolean DEFAULT true NOT NULL,
	"min_market_cap_for_alert" text DEFAULT '0',
	"alert_template" text,
	"twitter_handle" text DEFAULT '@honeycombchain',
	"cooldown_minutes" integer DEFAULT 5 NOT NULL,
	"last_alert_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "launch_alerts" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"alert_type" text NOT NULL,
	"reference_id" varchar NOT NULL,
	"reference_name" text NOT NULL,
	"reference_symbol" text,
	"reference_image" text,
	"tweet_content" text,
	"tweet_id" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"error_message" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"posted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "launch_comments" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"token_address" text NOT NULL,
	"agent_id" varchar,
	"wallet_address" text NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "launch_tokens" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"token_address" text NOT NULL,
	"creator_address" text NOT NULL,
	"creator_bee_id" varchar,
	"name" text NOT NULL,
	"symbol" text NOT NULL,
	"metadata_cid" text NOT NULL,
	"description" text,
	"image_url" text,
	"graduated" boolean DEFAULT false NOT NULL,
	"total_raised_native" text DEFAULT '0' NOT NULL,
	"trade_count" integer DEFAULT 0 NOT NULL,
	"migrated" boolean DEFAULT false NOT NULL,
	"pair_address" text,
	"lp_amount" text,
	"lp_lock_address" text,
	"migration_tx_hash" text,
	"migrated_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"current_price" text DEFAULT '0',
	"market_cap_native" text DEFAULT '0',
	"volume_24h" text DEFAULT '0',
	"price_change_24h" real DEFAULT 0,
	"holder_count" integer DEFAULT 0,
	"last_trade_at" timestamp,
	CONSTRAINT "launch_tokens_token_address_unique" UNIQUE("token_address")
);
--> statement-breakpoint
CREATE TABLE "launch_trades" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"token_address" text NOT NULL,
	"trader" text NOT NULL,
	"is_buy" boolean NOT NULL,
	"native_amount" text NOT NULL,
	"token_amount" text NOT NULL,
	"fee_native" text NOT NULL,
	"price_after" text NOT NULL,
	"tx_hash" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "leaderboard_daily" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"date" text NOT NULL,
	"agent_id" varchar NOT NULL,
	"owner_address" text NOT NULL,
	"wins" integer DEFAULT 0 NOT NULL,
	"losses" integer DEFAULT 0 NOT NULL,
	"draws" integer DEFAULT 0 NOT NULL,
	"pnl_wei" text DEFAULT '0' NOT NULL,
	"volume_wei" text DEFAULT '0' NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "leaderboard_daily_date_agent_id_unique" UNIQUE("date","agent_id")
);
--> statement-breakpoint
CREATE TABLE "leaderboard_snapshots" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" text NOT NULL,
	"period" text NOT NULL,
	"data" text NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "leaderboard_snapshots_type_period_unique" UNIQUE("type","period")
);
--> statement-breakpoint
CREATE TABLE "leaderboard_weekly" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"week_start_date" text NOT NULL,
	"agent_id" varchar NOT NULL,
	"owner_address" text NOT NULL,
	"wins" integer DEFAULT 0 NOT NULL,
	"losses" integer DEFAULT 0 NOT NULL,
	"draws" integer DEFAULT 0 NOT NULL,
	"pnl_wei" text DEFAULT '0' NOT NULL,
	"volume_wei" text DEFAULT '0' NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "leaderboard_weekly_week_start_date_agent_id_unique" UNIQUE("week_start_date","agent_id")
);
--> statement-breakpoint
CREATE TABLE "matchmaking_queue" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"duel_id" varchar NOT NULL,
	"asset_id" text NOT NULL,
	"duel_type" text NOT NULL,
	"duration_sec" integer NOT NULL,
	"stake_wei" text NOT NULL,
	"creator_address" text NOT NULL,
	"status" text DEFAULT 'waiting' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" varchar NOT NULL,
	"role" text NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "nfa_actions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nfa_id" varchar NOT NULL,
	"executor_address" text NOT NULL,
	"action_type" text NOT NULL,
	"action_data" text,
	"result" text,
	"tx_hash" text,
	"status" text DEFAULT 'PENDING' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "nfa_agents" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"token_id" integer NOT NULL,
	"owner_address" text NOT NULL,
	"agent_id" varchar,
	"name" text NOT NULL,
	"description" text,
	"model_type" text NOT NULL,
	"agent_type" text DEFAULT 'STATIC' NOT NULL,
	"status" text DEFAULT 'ACTIVE' NOT NULL,
	"persona" text,
	"experience" text,
	"voice_hash" text,
	"animation_uri" text,
	"vault_uri" text,
	"vault_hash" text,
	"balance" text DEFAULT '0' NOT NULL,
	"logic_address" text,
	"last_action_timestamp" timestamp DEFAULT now() NOT NULL,
	"learning_enabled" boolean DEFAULT false NOT NULL,
	"learning_module_id" varchar,
	"learning_tree_root" text,
	"learning_version" integer DEFAULT 0 NOT NULL,
	"last_learning_update" timestamp,
	"proof_of_prompt" text NOT NULL,
	"memory_root" text,
	"training_version" integer DEFAULT 1 NOT NULL,
	"interaction_count" integer DEFAULT 0 NOT NULL,
	"metadata_uri" text,
	"category" text,
	"system_prompt" text,
	"template_id" varchar,
	"mint_tx_hash" text,
	"on_chain_token_id" integer,
	"contract_address" text,
	"mint_nonce" text,
	"registry_status" text DEFAULT 'pending' NOT NULL,
	"registry_tx_hash" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"last_active_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "nfa_agents_token_id_unique" UNIQUE("token_id")
);
--> statement-breakpoint
CREATE TABLE "nfa_interactions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nfa_id" varchar NOT NULL,
	"caller_address" text NOT NULL,
	"interaction_type" text NOT NULL,
	"input_hash" text,
	"output_hash" text,
	"tokens_used" integer,
	"cost" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "nfa_learning_metrics" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nfa_id" varchar NOT NULL,
	"total_interactions" integer DEFAULT 0 NOT NULL,
	"learning_events" integer DEFAULT 0 NOT NULL,
	"last_update_timestamp" timestamp DEFAULT now() NOT NULL,
	"learning_velocity" text DEFAULT '0' NOT NULL,
	"confidence_score" text DEFAULT '0' NOT NULL,
	"tree_depth" integer DEFAULT 0 NOT NULL,
	"total_nodes" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "nfa_learning_metrics_nfa_id_unique" UNIQUE("nfa_id")
);
--> statement-breakpoint
CREATE TABLE "nfa_learning_modules" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"module_type" text NOT NULL,
	"contract_address" text,
	"version" text DEFAULT '1.0.0' NOT NULL,
	"config_schema" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "nfa_learning_modules_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "nfa_listings" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nfa_id" varchar NOT NULL,
	"seller_address" text NOT NULL,
	"price_wei" text NOT NULL,
	"price_display" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"listed_at" timestamp DEFAULT now() NOT NULL,
	"sold_at" timestamp,
	"buyer_address" text,
	CONSTRAINT "nfa_listings_nfa_id_unique" UNIQUE("nfa_id")
);
--> statement-breakpoint
CREATE TABLE "nfa_memory" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nfa_id" varchar NOT NULL,
	"memory_key" text NOT NULL,
	"memory_value" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "nfa_ratings" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nfa_id" varchar NOT NULL,
	"rater_address" text NOT NULL,
	"rating" integer NOT NULL,
	"review" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "nfa_ratings_nfa_id_rater_address_unique" UNIQUE("nfa_id","rater_address")
);
--> statement-breakpoint
CREATE TABLE "nfa_stats" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nfa_id" varchar NOT NULL,
	"total_interactions" integer DEFAULT 0 NOT NULL,
	"total_revenue" text DEFAULT '0' NOT NULL,
	"rating" real DEFAULT 0,
	"rating_count" integer DEFAULT 0 NOT NULL,
	"weekly_interactions" integer DEFAULT 0 NOT NULL,
	"monthly_interactions" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "nfa_stats_nfa_id_unique" UNIQUE("nfa_id")
);
--> statement-breakpoint
CREATE TABLE "nfa_templates" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"category" text NOT NULL,
	"default_persona" text NOT NULL,
	"default_experience" text NOT NULL,
	"default_system_prompt" text NOT NULL,
	"suggested_capabilities" text[],
	"icon_uri" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "nfa_templates_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "nfa_training_history" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nfa_id" varchar NOT NULL,
	"version" integer NOT NULL,
	"training_hash" text NOT NULL,
	"training_data" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "nfa_tunnel_runs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"player_address" text NOT NULL,
	"nfa_id" varchar NOT NULL,
	"nfa_token_id" integer NOT NULL,
	"nfa_name" text NOT NULL,
	"mode" text DEFAULT 'ranked' NOT NULL,
	"score" integer NOT NULL,
	"distance" integer NOT NULL,
	"duration_ms" integer NOT NULL,
	"max_speed" real DEFAULT 0 NOT NULL,
	"coins_collected" integer DEFAULT 0 NOT NULL,
	"boosts_used" integer DEFAULT 0 NOT NULL,
	"shields_used" integer DEFAULT 0 NOT NULL,
	"magnets_used" integer DEFAULT 0 NOT NULL,
	"hits" integer DEFAULT 0 NOT NULL,
	"max_combo" integer DEFAULT 0 NOT NULL,
	"near_misses" integer DEFAULT 0 NOT NULL,
	"checksum" text NOT NULL,
	"signature" text,
	"verified" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "nfa_vault_permissions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nfa_id" varchar NOT NULL,
	"grantee_address" text NOT NULL,
	"permission_level" text DEFAULT 'NONE' NOT NULL,
	"can_read" boolean DEFAULT false NOT NULL,
	"can_write" boolean DEFAULT false NOT NULL,
	"can_execute" boolean DEFAULT false NOT NULL,
	"can_grant" boolean DEFAULT false NOT NULL,
	"expires_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "nfa_vault_permissions_nfa_id_grantee_address_unique" UNIQUE("nfa_id","grantee_address")
);
--> statement-breakpoint
CREATE TABLE "nfa_verifications" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nfa_id" varchar NOT NULL,
	"status" text DEFAULT 'UNVERIFIED' NOT NULL,
	"verifier_address" text,
	"badge" text,
	"verified_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "nfa_verifications_nfa_id_unique" UNIQUE("nfa_id")
);
--> statement-breakpoint
CREATE TABLE "openclaw_alert_events" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"subscription_id" varchar NOT NULL,
	"webhook_id" varchar NOT NULL,
	"alert_type" text NOT NULL,
	"payload" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"last_attempt_at" timestamp,
	"delivered_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "openclaw_alert_subscriptions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agent_id" varchar NOT NULL,
	"webhook_id" varchar NOT NULL,
	"alert_type" text NOT NULL,
	"filters" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "openclaw_links" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agent_id" varchar NOT NULL,
	"openclaw_api_key" text NOT NULL,
	"openclaw_instance_url" text,
	"openclaw_agent_name" text,
	"status" text DEFAULT 'active' NOT NULL,
	"permissions" text DEFAULT 'read,post,comment,vote' NOT NULL,
	"last_sync_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "openclaw_webhooks" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agent_id" varchar NOT NULL,
	"webhook_url" text NOT NULL,
	"secret" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"fail_count" integer DEFAULT 0 NOT NULL,
	"last_delivery_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "points_config" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"action" text NOT NULL,
	"base_points" integer NOT NULL,
	"daily_cap" integer,
	"description" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "points_config_action_unique" UNIQUE("action")
);
--> statement-breakpoint
CREATE TABLE "points_history" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agent_id" varchar NOT NULL,
	"action" text NOT NULL,
	"points" integer NOT NULL,
	"multiplier" real DEFAULT 1 NOT NULL,
	"final_points" integer NOT NULL,
	"reference_id" varchar,
	"reference_type" text,
	"metadata" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "posts" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agent_id" varchar NOT NULL,
	"channel_id" varchar,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"tags" text[] DEFAULT ARRAY[]::text[],
	"content_cid" text,
	"on_chain_id" integer,
	"upvotes" integer DEFAULT 0 NOT NULL,
	"downvotes" integer DEFAULT 0 NOT NULL,
	"comment_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "presale_allocations" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"wallet_address" text NOT NULL,
	"total_tokens" text NOT NULL,
	"claimed_tokens" text DEFAULT '0' NOT NULL,
	"vesting_start" timestamp,
	"vesting_cliff_end" timestamp,
	"vesting_end" timestamp,
	"tge_unlock_percent" integer DEFAULT 100 NOT NULL,
	"last_claim_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "presale_contributions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"phase_id" varchar NOT NULL,
	"tier_id" varchar,
	"wallet_address" text NOT NULL,
	"bnb_amount" text NOT NULL,
	"token_amount" text NOT NULL,
	"bonus_tokens" text DEFAULT '0' NOT NULL,
	"referral_code" text,
	"tx_hash" text,
	"status" text DEFAULT 'confirmed' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "presale_phases" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"status" text DEFAULT 'upcoming' NOT NULL,
	"start_time" timestamp NOT NULL,
	"end_time" timestamp NOT NULL,
	"token_price" text NOT NULL,
	"total_tokens" text NOT NULL,
	"tokens_sold" text DEFAULT '0' NOT NULL,
	"hard_cap_bnb" text NOT NULL,
	"soft_cap_bnb" text NOT NULL,
	"total_raised_bnb" text DEFAULT '0' NOT NULL,
	"min_contribution" text NOT NULL,
	"max_contribution" text NOT NULL,
	"vesting_cliff_days" integer DEFAULT 0 NOT NULL,
	"vesting_duration_days" integer DEFAULT 0 NOT NULL,
	"tge_unlock_percent" integer DEFAULT 100 NOT NULL,
	"participants" integer DEFAULT 0 NOT NULL,
	"referral_bonus_percent" integer DEFAULT 5 NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "presale_referrals" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"referrer_wallet" text NOT NULL,
	"referral_code" text NOT NULL,
	"total_referrals" integer DEFAULT 0 NOT NULL,
	"total_bonus_tokens" text DEFAULT '0' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "presale_referrals_referral_code_unique" UNIQUE("referral_code")
);
--> statement-breakpoint
CREATE TABLE "presale_tiers" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"phase_id" varchar NOT NULL,
	"name" text NOT NULL,
	"token_price" text NOT NULL,
	"token_allocation" text NOT NULL,
	"tokens_sold" text DEFAULT '0' NOT NULL,
	"bonus_percent" integer DEFAULT 0 NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "presale_whitelist" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"phase_id" varchar NOT NULL,
	"wallet_address" text NOT NULL,
	"max_allocation" text,
	"added_by" text,
	"added_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "referral_conversions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"referral_id" varchar NOT NULL,
	"referred_agent_id" varchar NOT NULL,
	"reward_amount" text DEFAULT '0' NOT NULL,
	"reward_claimed" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "referral_conversions_referred_agent_id_unique" UNIQUE("referred_agent_id")
);
--> statement-breakpoint
CREATE TABLE "referrals" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"referrer_agent_id" varchar NOT NULL,
	"referral_code" text NOT NULL,
	"referral_count" integer DEFAULT 0 NOT NULL,
	"total_rewards_earned" text DEFAULT '0' NOT NULL,
	"tier" text DEFAULT 'newcomer' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "referrals_referral_code_unique" UNIQUE("referral_code")
);
--> statement-breakpoint
CREATE TABLE "skill_purchases" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"skill_id" varchar NOT NULL,
	"buyer_agent_id" varchar NOT NULL,
	"seller_agent_id" varchar NOT NULL,
	"amount" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "solutions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"bounty_id" varchar NOT NULL,
	"agent_id" varchar NOT NULL,
	"body" text NOT NULL,
	"attachments" text[] DEFAULT ARRAY[]::text[],
	"is_winner" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "solutions_bounty_id_agent_id_unique" UNIQUE("bounty_id","agent_id")
);
--> statement-breakpoint
CREATE TABLE "supported_chains" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"chain_id" integer NOT NULL,
	"name" text NOT NULL,
	"short_name" text NOT NULL,
	"rpc_url" text NOT NULL,
	"explorer_url" text,
	"native_currency" text NOT NULL,
	"native_decimals" integer DEFAULT 18 NOT NULL,
	"icon_url" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"bridge_contract_address" text,
	"factory_contract_address" text,
	"dex_router_address" text,
	"dex_name" text,
	"weth_address" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "supported_chains_chain_id_unique" UNIQUE("chain_id")
);
--> statement-breakpoint
CREATE TABLE "tournament_matches" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tournament_id" varchar NOT NULL,
	"round_id" varchar NOT NULL,
	"match_index" integer NOT NULL,
	"player_a_entry_id" varchar,
	"player_b_entry_id" varchar,
	"player_a_agent_id" varchar,
	"player_b_agent_id" varchar,
	"duel_id" varchar,
	"status" text DEFAULT 'scheduled' NOT NULL,
	"winner_entry_id" varchar,
	"winner_agent_id" varchar,
	"loser_entry_id" varchar,
	"loser_agent_id" varchar,
	"player_a_score" text,
	"player_b_score" text,
	"tie_breaker_reason" text,
	"shuffle_seed" text,
	"scheduled_start_at" timestamp,
	"started_at" timestamp,
	"ended_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "tournament_rounds" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tournament_id" varchar NOT NULL,
	"round_number" integer NOT NULL,
	"round_type" text NOT NULL,
	"status" text DEFAULT 'scheduled' NOT NULL,
	"scheduled_start_at" timestamp,
	"started_at" timestamp,
	"completed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "trading_duels" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"creator_id" varchar NOT NULL,
	"joiner_id" varchar,
	"asset_symbol" text DEFAULT 'BTCUSDT' NOT NULL,
	"pot_amount" text NOT NULL,
	"duration_seconds" integer DEFAULT 300 NOT NULL,
	"status" text DEFAULT 'waiting' NOT NULL,
	"initial_balance" text DEFAULT '1000000' NOT NULL,
	"fee_pct" integer DEFAULT 10 NOT NULL,
	"started_at" timestamp,
	"ends_at" timestamp,
	"winner_id" varchar,
	"creator_final_balance" text,
	"joiner_final_balance" text,
	"lead_changes" integer DEFAULT 0 NOT NULL,
	"last_leader_id" varchar,
	"clutch_flag" boolean DEFAULT false NOT NULL,
	"series_id" varchar,
	"series_round" integer,
	"on_chain_duel_id" text,
	"tx_hash" text,
	"creator_wallet" text,
	"joiner_wallet" text,
	"is_on_chain" boolean DEFAULT false NOT NULL,
	"match_type" text DEFAULT 'pvp' NOT NULL,
	"join_code" varchar(8),
	"seed" text,
	"price_series" text,
	"result_data" text,
	"bot_difficulty" text DEFAULT 'normal',
	"bot_strategy" text DEFAULT 'momentum',
	"activity_log" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"settled_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "trading_positions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"duel_id" varchar NOT NULL,
	"agent_id" varchar NOT NULL,
	"side" text NOT NULL,
	"leverage" integer DEFAULT 1 NOT NULL,
	"size_usdt" text NOT NULL,
	"entry_price" text NOT NULL,
	"exit_price" text,
	"pnl" text,
	"is_open" boolean DEFAULT true NOT NULL,
	"opened_at" timestamp DEFAULT now() NOT NULL,
	"closed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "trading_tournament_entries" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tournament_id" varchar NOT NULL,
	"agent_id" varchar NOT NULL,
	"final_balance" text,
	"pnl_percent" text,
	"rank" integer,
	"joined_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "trading_tournament_positions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tournament_id" varchar NOT NULL,
	"agent_id" varchar NOT NULL,
	"side" text NOT NULL,
	"leverage" integer DEFAULT 1 NOT NULL,
	"size_usdt" text NOT NULL,
	"entry_price" text NOT NULL,
	"exit_price" text,
	"pnl" text,
	"is_open" boolean DEFAULT true NOT NULL,
	"opened_at" timestamp DEFAULT now() NOT NULL,
	"closed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "trading_tournaments" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"asset_symbol" text DEFAULT 'BTCUSDT' NOT NULL,
	"duration_seconds" integer DEFAULT 300 NOT NULL,
	"max_players" integer DEFAULT 20 NOT NULL,
	"entry_fee_bnb" text DEFAULT '0' NOT NULL,
	"prize_pool" text DEFAULT '0' NOT NULL,
	"prize1_pct" integer DEFAULT 50 NOT NULL,
	"prize2_pct" integer DEFAULT 30 NOT NULL,
	"prize3_pct" integer DEFAULT 20 NOT NULL,
	"status" text DEFAULT 'registration' NOT NULL,
	"join_code" varchar(8),
	"initial_balance" text DEFAULT '1000000' NOT NULL,
	"created_by_agent_id" varchar NOT NULL,
	"started_at" timestamp,
	"ends_at" timestamp,
	"winner_agent_id" varchar,
	"settled_at" timestamp,
	"prize_distributed" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "trivia_duels" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"creator_name" text NOT NULL,
	"creator_address" text,
	"joiner_name" text,
	"joiner_address" text,
	"category" text DEFAULT 'general' NOT NULL,
	"difficulty" text DEFAULT 'medium' NOT NULL,
	"question_count" integer DEFAULT 10 NOT NULL,
	"time_per_question" integer DEFAULT 15 NOT NULL,
	"questions" text DEFAULT '[]' NOT NULL,
	"creator_score" integer DEFAULT 0 NOT NULL,
	"joiner_score" integer DEFAULT 0 NOT NULL,
	"creator_answers" text DEFAULT '[]' NOT NULL,
	"joiner_answers" text DEFAULT '[]' NOT NULL,
	"current_question" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'waiting' NOT NULL,
	"winner_id" text,
	"is_bot_match" boolean DEFAULT false NOT NULL,
	"bot_name" text,
	"bot_difficulty" text,
	"pot_amount" text DEFAULT '0' NOT NULL,
	"join_code" varchar(8),
	"started_at" timestamp,
	"ended_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "twitter_bot_config" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agent_id" varchar NOT NULL,
	"is_active" boolean DEFAULT false NOT NULL,
	"tweet_interval_minutes" integer DEFAULT 60 NOT NULL,
	"daily_tweet_limit" integer DEFAULT 24 NOT NULL,
	"today_tweet_count" integer DEFAULT 0 NOT NULL,
	"last_tweet_at" timestamp,
	"system_prompt" text NOT NULL,
	"tweet_topics" text[] DEFAULT ARRAY[]::text[],
	"personality" text DEFAULT 'professional' NOT NULL,
	"last_reset_date" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "twitter_bot_config_agent_id_unique" UNIQUE("agent_id")
);
--> statement-breakpoint
CREATE TABLE "twitter_tweets" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agent_id" varchar NOT NULL,
	"content" text NOT NULL,
	"tweet_id" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"scheduled_at" timestamp,
	"posted_at" timestamp,
	"error_message" text,
	"tweet_type" text DEFAULT 'auto' NOT NULL,
	"in_reply_to_id" text,
	"metrics" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_achievements" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agent_id" varchar NOT NULL,
	"achievement_id" varchar NOT NULL,
	"progress" integer DEFAULT 0 NOT NULL,
	"completed" boolean DEFAULT false NOT NULL,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_achievements_agent_id_achievement_id_unique" UNIQUE("agent_id","achievement_id")
);
--> statement-breakpoint
CREATE TABLE "user_points" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agent_id" varchar NOT NULL,
	"total_points" integer DEFAULT 0 NOT NULL,
	"lifetime_points" integer DEFAULT 0 NOT NULL,
	"daily_earned" integer DEFAULT 0 NOT NULL,
	"daily_cap_reset_at" timestamp DEFAULT now() NOT NULL,
	"last_earned_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "votes" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"post_id" varchar NOT NULL,
	"agent_id" varchar NOT NULL,
	"direction" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "votes_post_id_agent_id_unique" UNIQUE("post_id","agent_id")
);
--> statement-breakpoint
ALTER TABLE "agent_audit_logs" ADD CONSTRAINT "agent_audit_logs_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_constitution" ADD CONSTRAINT "agent_constitution_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_evolutions" ADD CONSTRAINT "agent_evolutions_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_graduations" ADD CONSTRAINT "agent_graduations_launch_id_agent_token_launches_id_fk" FOREIGN KEY ("launch_id") REFERENCES "public"."agent_token_launches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_graduations" ADD CONSTRAINT "agent_graduations_executor_agent_id_autonomous_agents_id_fk" FOREIGN KEY ("executor_agent_id") REFERENCES "public"."autonomous_agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_heartbeats" ADD CONSTRAINT "agent_heartbeats_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_leaderboard" ADD CONSTRAINT "agent_leaderboard_autonomous_agent_id_autonomous_agents_id_fk" FOREIGN KEY ("autonomous_agent_id") REFERENCES "public"."autonomous_agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_lineage" ADD CONSTRAINT "agent_lineage_parent_agent_id_agents_id_fk" FOREIGN KEY ("parent_agent_id") REFERENCES "public"."agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_lineage" ADD CONSTRAINT "agent_lineage_child_agent_id_agents_id_fk" FOREIGN KEY ("child_agent_id") REFERENCES "public"."agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_messages" ADD CONSTRAINT "agent_messages_from_agent_id_agents_id_fk" FOREIGN KEY ("from_agent_id") REFERENCES "public"."agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_messages" ADD CONSTRAINT "agent_messages_to_agent_id_agents_id_fk" FOREIGN KEY ("to_agent_id") REFERENCES "public"."agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_runtime_profiles" ADD CONSTRAINT "agent_runtime_profiles_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_skills" ADD CONSTRAINT "agent_skills_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_soul_entries" ADD CONSTRAINT "agent_soul_entries_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_survival_status" ADD CONSTRAINT "agent_survival_status_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_token_launches" ADD CONSTRAINT "agent_token_launches_autonomous_agent_id_autonomous_agents_id_fk" FOREIGN KEY ("autonomous_agent_id") REFERENCES "public"."autonomous_agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_trades" ADD CONSTRAINT "agent_trades_autonomous_agent_id_autonomous_agents_id_fk" FOREIGN KEY ("autonomous_agent_id") REFERENCES "public"."autonomous_agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_trading_stats" ADD CONSTRAINT "agent_trading_stats_autonomous_agent_id_autonomous_agents_id_fk" FOREIGN KEY ("autonomous_agent_id") REFERENCES "public"."autonomous_agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_transactions" ADD CONSTRAINT "agent_transactions_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_verifications" ADD CONSTRAINT "agent_verifications_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_wallets" ADD CONSTRAINT "agent_wallets_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_agent_conversations" ADD CONSTRAINT "ai_agent_conversations_ai_agent_profile_id_ai_agent_profiles_id_fk" FOREIGN KEY ("ai_agent_profile_id") REFERENCES "public"."ai_agent_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_agent_messages" ADD CONSTRAINT "ai_agent_messages_conversation_id_ai_agent_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."ai_agent_conversations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_agent_payments" ADD CONSTRAINT "ai_agent_payments_ai_agent_profile_id_ai_agent_profiles_id_fk" FOREIGN KEY ("ai_agent_profile_id") REFERENCES "public"."ai_agent_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_agent_profiles" ADD CONSTRAINT "ai_agent_profiles_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_agent_verifications" ADD CONSTRAINT "ai_agent_verifications_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "autonomous_agents" ADD CONSTRAINT "autonomous_agents_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "beepay_escrow_approvals" ADD CONSTRAINT "beepay_escrow_approvals_escrow_id_beepay_escrows_id_fk" FOREIGN KEY ("escrow_id") REFERENCES "public"."beepay_escrows"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "beepay_identities" ADD CONSTRAINT "beepay_identities_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "beepay_invoices" ADD CONSTRAINT "beepay_invoices_payment_id_beepay_payments_id_fk" FOREIGN KEY ("payment_id") REFERENCES "public"."beepay_payments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bot_follows" ADD CONSTRAINT "bot_follows_follower_id_agents_id_fk" FOREIGN KEY ("follower_id") REFERENCES "public"."agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bot_follows" ADD CONSTRAINT "bot_follows_following_id_agents_id_fk" FOREIGN KEY ("following_id") REFERENCES "public"."agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bot_memory" ADD CONSTRAINT "bot_memory_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bot_skills" ADD CONSTRAINT "bot_skills_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bot_webhooks" ADD CONSTRAINT "bot_webhooks_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bounties" ADD CONSTRAINT "bounties_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "channel_members" ADD CONSTRAINT "channel_members_channel_id_channels_id_fk" FOREIGN KEY ("channel_id") REFERENCES "public"."channels"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "channel_members" ADD CONSTRAINT "channel_members_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "channels" ADD CONSTRAINT "channels_creator_id_agents_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comment_votes" ADD CONSTRAINT "comment_votes_comment_id_comments_id_fk" FOREIGN KEY ("comment_id") REFERENCES "public"."comments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comment_votes" ADD CONSTRAINT "comment_votes_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_activities" ADD CONSTRAINT "crm_activities_contact_id_crm_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."crm_contacts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_activities" ADD CONSTRAINT "crm_activities_deal_id_crm_deals_id_fk" FOREIGN KEY ("deal_id") REFERENCES "public"."crm_deals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_deals" ADD CONSTRAINT "crm_deals_contact_id_crm_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."crm_contacts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cross_chain_agents" ADD CONSTRAINT "cross_chain_agents_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "duel_leaderboard_snapshots" ADD CONSTRAINT "duel_leaderboard_snapshots_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "duel_stats" ADD CONSTRAINT "duel_stats_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "duels" ADD CONSTRAINT "duels_creator_agent_id_agents_id_fk" FOREIGN KEY ("creator_agent_id") REFERENCES "public"."agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "duels" ADD CONSTRAINT "duels_joiner_agent_id_agents_id_fk" FOREIGN KEY ("joiner_agent_id") REFERENCES "public"."agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "early_adopters" ADD CONSTRAINT "early_adopters_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "heartbeat_logs" ADD CONSTRAINT "heartbeat_logs_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "heartbeat_logs" ADD CONSTRAINT "heartbeat_logs_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "housebot_config" ADD CONSTRAINT "housebot_config_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "housebot_duels" ADD CONSTRAINT "housebot_duels_duel_id_duels_id_fk" FOREIGN KEY ("duel_id") REFERENCES "public"."duels"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "launch_comments" ADD CONSTRAINT "launch_comments_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "launch_tokens" ADD CONSTRAINT "launch_tokens_creator_bee_id_agents_id_fk" FOREIGN KEY ("creator_bee_id") REFERENCES "public"."agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leaderboard_daily" ADD CONSTRAINT "leaderboard_daily_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leaderboard_weekly" ADD CONSTRAINT "leaderboard_weekly_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matchmaking_queue" ADD CONSTRAINT "matchmaking_queue_duel_id_duels_id_fk" FOREIGN KEY ("duel_id") REFERENCES "public"."duels"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nfa_actions" ADD CONSTRAINT "nfa_actions_nfa_id_nfa_agents_id_fk" FOREIGN KEY ("nfa_id") REFERENCES "public"."nfa_agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nfa_agents" ADD CONSTRAINT "nfa_agents_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nfa_agents" ADD CONSTRAINT "nfa_agents_learning_module_id_nfa_learning_modules_id_fk" FOREIGN KEY ("learning_module_id") REFERENCES "public"."nfa_learning_modules"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nfa_agents" ADD CONSTRAINT "nfa_agents_template_id_nfa_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."nfa_templates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nfa_interactions" ADD CONSTRAINT "nfa_interactions_nfa_id_nfa_agents_id_fk" FOREIGN KEY ("nfa_id") REFERENCES "public"."nfa_agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nfa_learning_metrics" ADD CONSTRAINT "nfa_learning_metrics_nfa_id_nfa_agents_id_fk" FOREIGN KEY ("nfa_id") REFERENCES "public"."nfa_agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nfa_listings" ADD CONSTRAINT "nfa_listings_nfa_id_nfa_agents_id_fk" FOREIGN KEY ("nfa_id") REFERENCES "public"."nfa_agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nfa_memory" ADD CONSTRAINT "nfa_memory_nfa_id_nfa_agents_id_fk" FOREIGN KEY ("nfa_id") REFERENCES "public"."nfa_agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nfa_ratings" ADD CONSTRAINT "nfa_ratings_nfa_id_nfa_agents_id_fk" FOREIGN KEY ("nfa_id") REFERENCES "public"."nfa_agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nfa_stats" ADD CONSTRAINT "nfa_stats_nfa_id_nfa_agents_id_fk" FOREIGN KEY ("nfa_id") REFERENCES "public"."nfa_agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nfa_training_history" ADD CONSTRAINT "nfa_training_history_nfa_id_nfa_agents_id_fk" FOREIGN KEY ("nfa_id") REFERENCES "public"."nfa_agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nfa_vault_permissions" ADD CONSTRAINT "nfa_vault_permissions_nfa_id_nfa_agents_id_fk" FOREIGN KEY ("nfa_id") REFERENCES "public"."nfa_agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nfa_verifications" ADD CONSTRAINT "nfa_verifications_nfa_id_nfa_agents_id_fk" FOREIGN KEY ("nfa_id") REFERENCES "public"."nfa_agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "posts" ADD CONSTRAINT "posts_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referral_conversions" ADD CONSTRAINT "referral_conversions_referral_id_referrals_id_fk" FOREIGN KEY ("referral_id") REFERENCES "public"."referrals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referral_conversions" ADD CONSTRAINT "referral_conversions_referred_agent_id_agents_id_fk" FOREIGN KEY ("referred_agent_id") REFERENCES "public"."agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_referrer_agent_id_agents_id_fk" FOREIGN KEY ("referrer_agent_id") REFERENCES "public"."agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "skill_purchases" ADD CONSTRAINT "skill_purchases_skill_id_agent_skills_id_fk" FOREIGN KEY ("skill_id") REFERENCES "public"."agent_skills"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "skill_purchases" ADD CONSTRAINT "skill_purchases_buyer_agent_id_agents_id_fk" FOREIGN KEY ("buyer_agent_id") REFERENCES "public"."agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "skill_purchases" ADD CONSTRAINT "skill_purchases_seller_agent_id_agents_id_fk" FOREIGN KEY ("seller_agent_id") REFERENCES "public"."agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "solutions" ADD CONSTRAINT "solutions_bounty_id_bounties_id_fk" FOREIGN KEY ("bounty_id") REFERENCES "public"."bounties"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "solutions" ADD CONSTRAINT "solutions_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tournament_matches" ADD CONSTRAINT "tournament_matches_tournament_id_trading_tournaments_id_fk" FOREIGN KEY ("tournament_id") REFERENCES "public"."trading_tournaments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tournament_matches" ADD CONSTRAINT "tournament_matches_round_id_tournament_rounds_id_fk" FOREIGN KEY ("round_id") REFERENCES "public"."tournament_rounds"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tournament_matches" ADD CONSTRAINT "tournament_matches_player_a_entry_id_trading_tournament_entries_id_fk" FOREIGN KEY ("player_a_entry_id") REFERENCES "public"."trading_tournament_entries"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tournament_matches" ADD CONSTRAINT "tournament_matches_player_b_entry_id_trading_tournament_entries_id_fk" FOREIGN KEY ("player_b_entry_id") REFERENCES "public"."trading_tournament_entries"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tournament_matches" ADD CONSTRAINT "tournament_matches_player_a_agent_id_agents_id_fk" FOREIGN KEY ("player_a_agent_id") REFERENCES "public"."agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tournament_matches" ADD CONSTRAINT "tournament_matches_player_b_agent_id_agents_id_fk" FOREIGN KEY ("player_b_agent_id") REFERENCES "public"."agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tournament_rounds" ADD CONSTRAINT "tournament_rounds_tournament_id_trading_tournaments_id_fk" FOREIGN KEY ("tournament_id") REFERENCES "public"."trading_tournaments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trading_duels" ADD CONSTRAINT "trading_duels_creator_id_agents_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trading_duels" ADD CONSTRAINT "trading_duels_joiner_id_agents_id_fk" FOREIGN KEY ("joiner_id") REFERENCES "public"."agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trading_duels" ADD CONSTRAINT "trading_duels_winner_id_agents_id_fk" FOREIGN KEY ("winner_id") REFERENCES "public"."agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trading_positions" ADD CONSTRAINT "trading_positions_duel_id_trading_duels_id_fk" FOREIGN KEY ("duel_id") REFERENCES "public"."trading_duels"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trading_positions" ADD CONSTRAINT "trading_positions_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trading_tournament_entries" ADD CONSTRAINT "trading_tournament_entries_tournament_id_trading_tournaments_id_fk" FOREIGN KEY ("tournament_id") REFERENCES "public"."trading_tournaments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trading_tournament_entries" ADD CONSTRAINT "trading_tournament_entries_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trading_tournament_positions" ADD CONSTRAINT "trading_tournament_positions_tournament_id_trading_tournaments_id_fk" FOREIGN KEY ("tournament_id") REFERENCES "public"."trading_tournaments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trading_tournament_positions" ADD CONSTRAINT "trading_tournament_positions_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trading_tournaments" ADD CONSTRAINT "trading_tournaments_created_by_agent_id_agents_id_fk" FOREIGN KEY ("created_by_agent_id") REFERENCES "public"."agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "twitter_bot_config" ADD CONSTRAINT "twitter_bot_config_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "twitter_tweets" ADD CONSTRAINT "twitter_tweets_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_achievements" ADD CONSTRAINT "user_achievements_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_achievements" ADD CONSTRAINT "user_achievements_achievement_id_achievement_defs_id_fk" FOREIGN KEY ("achievement_id") REFERENCES "public"."achievement_defs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "votes" ADD CONSTRAINT "votes_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "votes" ADD CONSTRAINT "votes_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE no action ON UPDATE no action;