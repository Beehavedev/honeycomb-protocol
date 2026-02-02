import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type Language = 'en' | 'zh';

interface I18nContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const translations: Record<Language, Record<string, string>> = {
  en: {
    // Navigation
    'nav.home': 'Home',
    'nav.feed': 'Feed',
    'nav.bounties': 'Bounties',
    'nav.launchpad': 'Launchpad',
    'nav.predict': 'Predict',
    'nav.agents': 'AI Agents',
    'nav.profile': 'Profile',
    'nav.settings': 'Settings',
    'nav.createAgent': 'Create Agent',
    'nav.registerBee': 'Register Bee',
    
    // Common
    'common.loading': 'Loading...',
    'common.error': 'Error',
    'common.success': 'Success',
    'common.cancel': 'Cancel',
    'common.save': 'Save',
    'common.delete': 'Delete',
    'common.edit': 'Edit',
    'common.submit': 'Submit',
    'common.create': 'Create',
    'common.search': 'Search',
    'common.connect': 'Connect Wallet',
    'common.disconnect': 'Disconnect',
    'common.signIn': 'Sign In',
    'common.signOut': 'Sign Out',
    'common.back': 'Back',
    'common.next': 'Next',
    'common.yes': 'Yes',
    'common.no': 'No',
    'common.all': 'All',
    'common.view': 'View',
    'common.close': 'Close',
    'common.you': 'You',
    
    // Auth
    'auth.connectWallet': 'Connect Wallet',
    'auth.signInWithWallet': 'Sign In with Wallet',
    'auth.notRegistered': 'Not registered yet?',
    'auth.registerBelow': 'Register below:',
    'auth.registerAsBee': 'Register as a Bee',
    'auth.signingIn': 'Signing in...',
    
    // Feed
    'feed.title': 'Feed',
    'feed.createPost': 'Create Post',
    'feed.newPost': 'New Post',
    'feed.noPostsYet': 'No posts yet',
    'feed.beTheFirst': 'Be the first to create a post!',
    'feed.postTitle': 'Title',
    'feed.postBody': 'Body',
    'feed.postTags': 'Tags',
    'feed.publishing': 'Publishing...',
    'feed.publish': 'Publish',
    'feed.comments': 'Comments',
    'feed.addComment': 'Add a comment...',
    'feed.reply': 'Reply',
    
    // Bounties
    'bounties.title': 'Bounty Marketplace',
    'bounties.description': 'Post tasks with BNB rewards or submit solutions to earn',
    'bounties.createBounty': 'Create Bounty',
    'bounties.newBounty': 'New Bounty',
    'bounties.open': 'Open',
    'bounties.inProgress': 'In Progress',
    'bounties.completed': 'Completed',
    'bounties.expired': 'Expired',
    'bounties.reward': 'Reward',
    'bounties.deadline': 'Deadline',
    'bounties.submitSolution': 'Submit Solution',
    'bounties.solutions': 'Solutions',
    'bounties.acceptSolution': 'Accept Solution',
    'bounties.loadError': 'Failed to load bounties. Please try again.',
    'bounties.noBounties': 'No bounties yet',
    'bounties.beFirst': 'Be the first to create a bounty for the hive!',
    'bounties.noBountiesStatus': 'No bounties to show.',
    'bounties.cancelled': 'Cancelled',
    
    // Launchpad
    'launchpad.title': 'Token Launchpad',
    'launchpad.description': 'Create and trade tokens with bonding curve pricing',
    'launchpad.createToken': 'Create Token',
    'launchpad.tokenName': 'Token Name',
    'launchpad.tokenSymbol': 'Symbol',
    'launchpad.initialBuy': 'Initial Buy (BNB)',
    'launchpad.trade': 'Trade',
    'launchpad.buy': 'Buy',
    'launchpad.sell': 'Sell',
    'launchpad.price': 'Price',
    'launchpad.marketCap': 'Market Cap',
    'launchpad.volume': 'Volume',
    'launchpad.holders': 'Holders',
    'launchpad.graduated': 'Graduated',
    'launchpad.trending': 'Trending',
    'launchpad.loadError': 'Failed to load tokens. Please try again.',
    'launchpad.noTokens': 'No tokens yet',
    'launchpad.beFirst': 'Be the first to launch a token on the Honeycomb launchpad!',
    'launchpad.connectToLaunch': 'Connect your wallet and register as a Bee to launch tokens',
    'launchpad.progressToGraduation': 'Progress to graduation',
    'launchpad.trades': 'trades',
    
    // Predict
    'predict.title': 'Predict',
    'predict.description': '1v1 price prediction duels. Winner takes 90% of the pot.',
    'predict.createDuel': 'Create Prediction Duel',
    'predict.newDuel': 'New Duel',
    'predict.hideDuel': 'Hide Form',
    'predict.openDuels': 'Open',
    'predict.liveDuels': 'Live',
    'predict.settledDuels': 'Settled',
    'predict.noDuels': 'No duels yet',
    'predict.createFirst': 'Create First Duel',
    'predict.asset': 'Asset',
    'predict.duration': 'Duration',
    'predict.stake': 'Stake (BNB)',
    'predict.direction': 'Direction',
    'predict.up': 'UP',
    'predict.down': 'DOWN',
    'predict.join': 'Join Duel',
    'predict.waiting': 'Waiting for opponent...',
    'predict.creatorWinning': 'Creator Winning',
    'predict.opponentWinning': 'Opponent Winning',
    'predict.youWon': 'You Won',
    'predict.youLost': 'You Lost',
    'predict.startPrice': 'Start Price',
    'predict.endPrice': 'End Price',
    'predict.winner': 'Winner',
    'predict.payout': 'Payout',
    'predict.onChainTx': 'On-chain transaction',
    'predict.databaseMode': 'Database mode',
    'predict.binance': 'Binance',
    'predict.liveUpdates': 'Live • 3s',
    'predict.draw': 'Draw - Stakes refunded to both players',
    'predict.confirmInWallet': 'Confirm in Wallet...',
    
    // AI Agents
    'agents.title': 'AI Agent Marketplace',
    'agents.description': 'Chat with AI agents powered by custom personalities',
    'agents.browseAgents': 'Browse Agents',
    'agents.createAgent': 'Create AI Agent',
    'agents.agentName': 'Agent Name',
    'agents.personality': 'Personality',
    'agents.systemPrompt': 'System Prompt',
    'agents.pricingModel': 'Pricing Model',
    'agents.perMessage': 'Per Message',
    'agents.perToken': 'Per 1K Tokens',
    'agents.perTask': 'Per Task',
    'agents.price': 'Price (BNB)',
    'agents.chat': 'Chat',
    'agents.sendMessage': 'Send Message',
    'agents.typeMessage': 'Type your message...',
    'agents.activeAgents': 'Active Agents',
    'agents.totalInteractions': 'Total Interactions',
    'agents.creatorRevenue': 'Creator Revenue Share',
    'agents.noAgents': 'No AI Agents Yet',
    'agents.noAgentsDescription': 'Be the first to create a paid AI agent and start earning from your custom AI assistant.',
    'agents.connectToCreate': 'Connect your wallet and sign in to create an AI agent',
    'agents.defaultBio': 'AI-powered assistant',
    'agents.earned': 'earned',
    
    // Profile
    'profile.title': 'Profile',
    'profile.editProfile': 'Edit Profile',
    'profile.name': 'Name',
    'profile.bio': 'Bio',
    'profile.avatar': 'Avatar',
    'profile.posts': 'Posts',
    'profile.bounties': 'Bounties',
    'profile.reputation': 'Reputation',
    
    // Register
    'register.title': 'Register as a Bee',
    'register.description': 'Join the Honeycomb community',
    'register.beeName': 'Bee Name',
    'register.beeBio': 'Bio',
    'register.register': 'Register',
    'register.registering': 'Registering...',
    
    // Wallet
    'wallet.balance': 'Balance',
    'wallet.network': 'Network',
    'wallet.address': 'Address',
    'wallet.wrongNetwork': 'Wrong Network',
    'wallet.switchToBsc': 'Switch to BSC',
    
    // Errors
    'error.notFound': 'Not Found',
    'error.somethingWrong': 'Something went wrong',
    'error.tryAgain': 'Try Again',
    'error.unauthorized': 'Please sign in to continue',
    'error.transactionFailed': 'Transaction failed',
    'error.transactionRejected': 'Transaction rejected by user',
    
    // Time
    'time.seconds': 'seconds',
    'time.minutes': 'minutes',
    'time.hours': 'hours',
    'time.days': 'days',
    'time.ago': 'ago',
    'time.left': 'left',
    
    // Home
    'home.title': 'The Hive',
    'home.description': 'Discover what the Bees are buzzing about on BNB Chain',
    'home.new': 'New',
    'home.top': 'Top',
    'home.noPosts': 'No posts yet. Be the first to create a Cell!',
    'home.firstPost': 'Create your first Cell',
    'home.errorLoading': 'Failed to load feed',
    'home.signInToVote': 'Please sign in to vote',
    
    // How To
    'howTo.title': 'How To Use Honeycomb',
    'howTo.subtitle': 'Your complete guide to the decentralized social platform',
    'howTo.gettingStarted': 'Getting Started',
    'howTo.gettingStartedDesc': 'Connect your wallet and register as a Bee to join the Honeycomb community',
    'howTo.step1Title': '1. Connect Your Wallet',
    'howTo.step1Desc': 'Click "Connect Wallet" in the top right corner and connect your MetaMask or other Web3 wallet to BNB Smart Chain.',
    'howTo.step2Title': '2. Register as a Bee',
    'howTo.step2Desc': 'Once connected, register your identity on Honeycomb. Choose a unique name and bio for your Bee profile.',
    'howTo.step3Title': '3. Start Exploring',
    'howTo.step3Desc': 'Browse the Feed, post Cells, participate in Bounties, trade tokens on the Launchpad, or battle in Predict duels!',
    'howTo.feedTitle': 'Using the Feed',
    'howTo.feedDesc': 'The Feed is where Bees share content. Create posts called "Cells", upvote/downvote, and comment on discussions.',
    'howTo.bountiesTitle': 'Bounty Marketplace',
    'howTo.bountiesDesc': 'Post tasks with BNB rewards or complete bounties to earn. All rewards are held in smart contract escrow for security.',
    'howTo.launchpadTitle': 'Token Launchpad',
    'howTo.launchpadDesc': 'Create your own token instantly with bonding curve pricing. Trade tokens with BNB - no liquidity required to start.',
    'howTo.predictTitle': 'Predict Duels',
    'howTo.predictDesc': '1v1 price prediction battles. Choose an asset, predict UP or DOWN, stake BNB, and winner takes 90% of the pot.',
    'howTo.aiAgentsTitle': 'AI Agents',
    'howTo.aiAgentsDesc': 'Chat with AI-powered agents or create your own monetized AI agent to earn BNB from conversations.',
    'howTo.walletTips': 'Wallet Tips',
    'howTo.walletTip1': 'Ensure you are on BNB Smart Chain (Chain ID: 56)',
    'howTo.walletTip2': 'Have some BNB for gas fees',
    'howTo.walletTip3': 'Never share your private keys',
    'howTo.support': 'Need Help?',
    'howTo.supportDesc': 'Join our community or reach out on social media for assistance.',
    
    // Duel Card
    'duel.creator': 'Creator',
    'duel.opponent': 'Opponent',
    'duel.vs': 'VS',
    'duel.waitingOpponent': 'Waiting for Opponent',
    'duel.currentPrice': 'Current Price',
    'duel.priceChange': 'Price Change',
    'duel.timeRemaining': 'Time Remaining',
    'duel.ended': 'Ended',
    'duel.startingIn': 'Starting in',
    'duel.liveNow': 'LIVE NOW',
    'duel.joinNow': 'Join Now',
    'duel.viewDetails': 'View Details',
    'duel.pot': 'Pot',
    'duel.fee': 'Platform Fee: 10%',
    'duel.loadingPrice': 'Loading Binance price feed...',
    'duel.startPriceLocked': 'Start price will be locked when opponent joins',
    'duel.settled': 'Settled',
    'duel.cancelled': 'Cancelled',
    
    // Create Duel Form
    'createDuel.title': 'Create New Duel',
    'createDuel.selectAsset': 'Select Asset',
    'createDuel.selectDuration': 'Select Duration',
    'createDuel.enterStake': 'Enter Stake Amount',
    'createDuel.yourPrediction': 'Your Prediction',
    'createDuel.creating': 'Creating...',
    'createDuel.requiresBsc': 'Requires BSC Mainnet',
    'createDuel.requiresAgent': 'Requires on-chain agent registration',
    
    // Bot/Agent
    'bot.verified': 'Verified',
    'bot.bot': 'Bot',
    'bot.followers': 'Followers',
    'bot.following': 'Following',
    'bot.interactions': 'Interactions',
    'bot.earnings': 'Earnings',
  },
  zh: {
    // Navigation
    'nav.home': '首页',
    'nav.feed': '动态',
    'nav.bounties': '悬赏',
    'nav.launchpad': '发射台',
    'nav.predict': '预测',
    'nav.agents': 'AI代理',
    'nav.profile': '个人资料',
    'nav.settings': '设置',
    'nav.createAgent': '创建代理',
    'nav.registerBee': '注册蜜蜂',
    
    // Common
    'common.loading': '加载中...',
    'common.error': '错误',
    'common.success': '成功',
    'common.cancel': '取消',
    'common.save': '保存',
    'common.delete': '删除',
    'common.edit': '编辑',
    'common.submit': '提交',
    'common.create': '创建',
    'common.search': '搜索',
    'common.connect': '连接钱包',
    'common.disconnect': '断开连接',
    'common.signIn': '登录',
    'common.signOut': '退出登录',
    'common.back': '返回',
    'common.next': '下一步',
    'common.yes': '是',
    'common.no': '否',
    'common.all': '全部',
    'common.view': '查看',
    'common.close': '关闭',
    'common.you': '你',
    
    // Auth
    'auth.connectWallet': '连接钱包',
    'auth.signInWithWallet': '使用钱包登录',
    'auth.notRegistered': '还没有注册？',
    'auth.registerBelow': '在下方注册：',
    'auth.registerAsBee': '注册成为蜜蜂',
    'auth.signingIn': '登录中...',
    
    // Feed
    'feed.title': '动态',
    'feed.createPost': '发布帖子',
    'feed.newPost': '新帖子',
    'feed.noPostsYet': '暂无帖子',
    'feed.beTheFirst': '成为第一个发帖的人！',
    'feed.postTitle': '标题',
    'feed.postBody': '内容',
    'feed.postTags': '标签',
    'feed.publishing': '发布中...',
    'feed.publish': '发布',
    'feed.comments': '评论',
    'feed.addComment': '添加评论...',
    'feed.reply': '回复',
    
    // Bounties
    'bounties.title': '悬赏市场',
    'bounties.description': '发布带BNB奖励的任务或提交解决方案赚取收益',
    'bounties.createBounty': '创建悬赏',
    'bounties.newBounty': '新悬赏',
    'bounties.open': '开放中',
    'bounties.inProgress': '进行中',
    'bounties.completed': '已完成',
    'bounties.expired': '已过期',
    'bounties.reward': '奖励',
    'bounties.deadline': '截止日期',
    'bounties.submitSolution': '提交解决方案',
    'bounties.solutions': '解决方案',
    'bounties.acceptSolution': '接受方案',
    'bounties.loadError': '加载悬赏失败，请重试。',
    'bounties.noBounties': '暂无悬赏',
    'bounties.beFirst': '成为第一个为蜂巢创建悬赏的人！',
    'bounties.noBountiesStatus': '暂无悬赏可显示。',
    'bounties.cancelled': '已取消',
    
    // Launchpad
    'launchpad.title': '代币发射台',
    'launchpad.description': '使用联合曲线定价创建和交易代币',
    'launchpad.createToken': '创建代币',
    'launchpad.tokenName': '代币名称',
    'launchpad.tokenSymbol': '代币符号',
    'launchpad.initialBuy': '初始购买 (BNB)',
    'launchpad.trade': '交易',
    'launchpad.buy': '买入',
    'launchpad.sell': '卖出',
    'launchpad.price': '价格',
    'launchpad.marketCap': '市值',
    'launchpad.volume': '交易量',
    'launchpad.holders': '持有人',
    'launchpad.graduated': '已毕业',
    'launchpad.trending': '热门',
    'launchpad.loadError': '加载代币失败，请重试。',
    'launchpad.noTokens': '暂无代币',
    'launchpad.beFirst': '成为第一个在蜂巢发射台上发行代币的人！',
    'launchpad.connectToLaunch': '连接钱包并注册成为蜜蜂以发行代币',
    'launchpad.progressToGraduation': '毕业进度',
    'launchpad.trades': '笔交易',
    
    // Predict
    'predict.title': '预测',
    'predict.description': '1对1价格预测对决。赢家获得90%的奖池。',
    'predict.createDuel': '创建预测对决',
    'predict.newDuel': '新对决',
    'predict.hideDuel': '隐藏表单',
    'predict.openDuels': '开放中',
    'predict.liveDuels': '进行中',
    'predict.settledDuels': '已结算',
    'predict.noDuels': '暂无对决',
    'predict.createFirst': '创建第一个对决',
    'predict.asset': '资产',
    'predict.duration': '持续时间',
    'predict.stake': '押注 (BNB)',
    'predict.direction': '方向',
    'predict.up': '看涨',
    'predict.down': '看跌',
    'predict.join': '加入对决',
    'predict.waiting': '等待对手中...',
    'predict.creatorWinning': '创建者领先',
    'predict.opponentWinning': '对手领先',
    'predict.youWon': '你赢了',
    'predict.youLost': '你输了',
    'predict.startPrice': '起始价格',
    'predict.endPrice': '结束价格',
    'predict.winner': '获胜者',
    'predict.payout': '奖金',
    'predict.onChainTx': '链上交易',
    'predict.databaseMode': '数据库模式',
    'predict.binance': '币安',
    'predict.liveUpdates': '实时 • 3秒',
    'predict.draw': '平局 - 押注退还给双方玩家',
    'predict.confirmInWallet': '在钱包中确认...',
    
    // AI Agents
    'agents.title': 'AI代理市场',
    'agents.description': '与拥有自定义个性的AI代理聊天',
    'agents.browseAgents': '浏览代理',
    'agents.createAgent': '创建AI代理',
    'agents.agentName': '代理名称',
    'agents.personality': '个性',
    'agents.systemPrompt': '系统提示',
    'agents.pricingModel': '定价模式',
    'agents.perMessage': '每条消息',
    'agents.perToken': '每1000代币',
    'agents.perTask': '每个任务',
    'agents.price': '价格 (BNB)',
    'agents.chat': '聊天',
    'agents.sendMessage': '发送消息',
    'agents.typeMessage': '输入你的消息...',
    'agents.activeAgents': '活跃代理',
    'agents.totalInteractions': '总交互次数',
    'agents.creatorRevenue': '创作者收入分成',
    'agents.noAgents': '暂无AI代理',
    'agents.noAgentsDescription': '成为第一个创建付费AI代理并开始从您的自定义AI助手中赚取收益。',
    'agents.connectToCreate': '连接钱包并登录以创建AI代理',
    'agents.defaultBio': 'AI驱动的助手',
    'agents.earned': '已赚取',
    
    // Profile
    'profile.title': '个人资料',
    'profile.editProfile': '编辑资料',
    'profile.name': '名称',
    'profile.bio': '简介',
    'profile.avatar': '头像',
    'profile.posts': '帖子',
    'profile.bounties': '悬赏',
    'profile.reputation': '声誉',
    
    // Register
    'register.title': '注册成为蜜蜂',
    'register.description': '加入蜂巢社区',
    'register.beeName': '蜜蜂名称',
    'register.beeBio': '简介',
    'register.register': '注册',
    'register.registering': '注册中...',
    
    // Wallet
    'wallet.balance': '余额',
    'wallet.network': '网络',
    'wallet.address': '地址',
    'wallet.wrongNetwork': '网络错误',
    'wallet.switchToBsc': '切换到BSC',
    
    // Errors
    'error.notFound': '未找到',
    'error.somethingWrong': '出错了',
    'error.tryAgain': '重试',
    'error.unauthorized': '请登录后继续',
    'error.transactionFailed': '交易失败',
    'error.transactionRejected': '用户拒绝了交易',
    
    // Time
    'time.seconds': '秒',
    'time.minutes': '分钟',
    'time.hours': '小时',
    'time.days': '天',
    'time.ago': '前',
    'time.left': '剩余',
    
    // Home
    'home.title': '蜂巢',
    'home.description': '发现蜜蜂们在BNB链上的热门话题',
    'home.new': '最新',
    'home.top': '热门',
    'home.noPosts': '暂无帖子。成为第一个创建蜂房的人！',
    'home.firstPost': '创建你的第一个蜂房',
    'home.errorLoading': '加载动态失败',
    'home.signInToVote': '请登录后投票',
    
    // How To
    'howTo.title': '如何使用蜂巢',
    'howTo.subtitle': '去中心化社交平台完整指南',
    'howTo.gettingStarted': '开始使用',
    'howTo.gettingStartedDesc': '连接你的钱包并注册成为蜜蜂，加入蜂巢社区',
    'howTo.step1Title': '1. 连接你的钱包',
    'howTo.step1Desc': '点击右上角的"连接钱包"按钮，将你的MetaMask或其他Web3钱包连接到BNB智能链。',
    'howTo.step2Title': '2. 注册成为蜜蜂',
    'howTo.step2Desc': '连接后，在蜂巢上注册你的身份。为你的蜜蜂档案选择一个独特的名称和简介。',
    'howTo.step3Title': '3. 开始探索',
    'howTo.step3Desc': '浏览动态、发布蜂房、参与悬赏、在发射台交易代币，或在预测对决中战斗！',
    'howTo.feedTitle': '使用动态',
    'howTo.feedDesc': '动态是蜜蜂们分享内容的地方。创建称为"蜂房"的帖子，点赞/点踩，并参与讨论评论。',
    'howTo.bountiesTitle': '悬赏市场',
    'howTo.bountiesDesc': '发布带有BNB奖励的任务或完成悬赏来赚取收益。所有奖励都由智能合约托管以确保安全。',
    'howTo.launchpadTitle': '代币发射台',
    'howTo.launchpadDesc': '使用联合曲线定价即时创建你自己的代币。用BNB交易代币 - 无需初始流动性。',
    'howTo.predictTitle': '预测对决',
    'howTo.predictDesc': '1对1价格预测对战。选择资产，预测涨或跌，押注BNB，赢家获得90%的奖池。',
    'howTo.aiAgentsTitle': 'AI代理',
    'howTo.aiAgentsDesc': '与AI驱动的代理聊天，或创建你自己的付费AI代理从对话中赚取BNB。',
    'howTo.walletTips': '钱包提示',
    'howTo.walletTip1': '确保你在BNB智能链上（链ID：56）',
    'howTo.walletTip2': '准备一些BNB用于支付Gas费',
    'howTo.walletTip3': '永远不要分享你的私钥',
    'howTo.support': '需要帮助？',
    'howTo.supportDesc': '加入我们的社区或通过社交媒体寻求帮助。',
    
    // Duel Card
    'duel.creator': '创建者',
    'duel.opponent': '对手',
    'duel.vs': '对战',
    'duel.waitingOpponent': '等待对手',
    'duel.currentPrice': '当前价格',
    'duel.priceChange': '价格变化',
    'duel.timeRemaining': '剩余时间',
    'duel.ended': '已结束',
    'duel.startingIn': '开始于',
    'duel.liveNow': '正在进行',
    'duel.joinNow': '立即加入',
    'duel.viewDetails': '查看详情',
    'duel.pot': '奖池',
    'duel.fee': '平台费：10%',
    'duel.loadingPrice': '正在加载币安价格数据...',
    'duel.startPriceLocked': '对手加入后将锁定起始价格',
    'duel.settled': '已结算',
    'duel.cancelled': '已取消',
    
    // Create Duel Form
    'createDuel.title': '创建新对决',
    'createDuel.selectAsset': '选择资产',
    'createDuel.selectDuration': '选择持续时间',
    'createDuel.enterStake': '输入押注金额',
    'createDuel.yourPrediction': '你的预测',
    'createDuel.creating': '创建中...',
    'createDuel.requiresBsc': '需要BSC主网',
    'createDuel.requiresAgent': '需要链上代理注册',
    
    // Bot/Agent
    'bot.verified': '已认证',
    'bot.bot': '机器人',
    'bot.followers': '粉丝',
    'bot.following': '关注',
    'bot.interactions': '互动',
    'bot.earnings': '收益',
  },
};

const I18nContext = createContext<I18nContextType | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('honeycomb-language');
      if (saved === 'en' || saved === 'zh') return saved;
      const browserLang = navigator.language.toLowerCase();
      if (browserLang.startsWith('zh')) return 'zh';
    }
    return 'en';
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('honeycomb-language', lang);
  };

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const t = (key: string): string => {
    return translations[language][key] || translations['en'][key] || key;
  };

  return (
    <I18nContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
}

export function LanguageSwitcher() {
  const { language, setLanguage } = useI18n();
  
  return (
    <button
      onClick={() => setLanguage(language === 'en' ? 'zh' : 'en')}
      className="flex items-center gap-1 px-2 py-1 text-sm rounded-md hover-elevate"
      data-testid="button-language-switch"
    >
      {language === 'en' ? '中文' : 'EN'}
    </button>
  );
}
