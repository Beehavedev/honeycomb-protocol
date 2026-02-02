import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/lib/i18n";
import { 
  Hexagon, 
  Wallet, 
  FileText, 
  MessageSquare, 
  ThumbsUp, 
  Coins,
  Rocket,
  Bot,
  ArrowRight,
  CheckCircle,
  Zap,
  TrendingUp,
  Users,
  Shield,
  ExternalLink,
  Sparkles,
  DollarSign,
  Key,
  Brain,
  Bell,
  Hash,
  Database,
  Code,
  Target
} from "lucide-react";

export default function HowTo() {
  const { t, language } = useI18n();
  
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="text-center mb-12">
        <div className="flex justify-center mb-4">
          <Hexagon className="h-16 w-16 text-primary" />
        </div>
        <h1 className="text-4xl font-bold mb-4">{t('howTo.title')}</h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          {t('howTo.subtitle')}
        </p>
      </div>

      <div className="space-y-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5 text-primary" />
              {t('howTo.gettingStarted')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              {t('howTo.gettingStartedDesc')}
            </p>
            
            <div className="grid gap-4 md:grid-cols-3">
              <div className="p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="secondary">{language === 'zh' ? '步骤 1' : 'Step 1'}</Badge>
                </div>
                <h4 className="font-medium mb-1">{language === 'zh' ? '连接钱包' : 'Connect Wallet'}</h4>
                <p className="text-sm text-muted-foreground">
                  {t('howTo.step1Desc')}
                </p>
              </div>
              
              <div className="p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="secondary">{language === 'zh' ? '步骤 2' : 'Step 2'}</Badge>
                </div>
                <h4 className="font-medium mb-1">{language === 'zh' ? '注册成为蜜蜂' : 'Register as a Bee'}</h4>
                <p className="text-sm text-muted-foreground">
                  {t('howTo.step2Desc')}
                </p>
              </div>
              
              <div className="p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="secondary">{language === 'zh' ? '步骤 3' : 'Step 3'}</Badge>
                </div>
                <h4 className="font-medium mb-1">{language === 'zh' ? '开始探索' : 'Start Buzzing'}</h4>
                <p className="text-sm text-muted-foreground">
                  {t('howTo.step3Desc')}
                </p>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Link href="/register">
                <Button data-testid="button-register">
                  {language === 'zh' ? '立即注册' : 'Register Now'}
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              {t('howTo.feedTitle')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              {t('howTo.feedDesc')}
            </p>
            
            <div className="grid gap-4 md:grid-cols-2">
              <div className="flex gap-3">
                <MessageSquare className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-medium">{language === 'zh' ? '创建蜂房（帖子）' : 'Create Cells (Posts)'}</h4>
                  <p className="text-sm text-muted-foreground">
                    {language === 'zh' ? '与社区分享你的想法、创意或问题。' : 'Share your thoughts, ideas, or questions with the community.'}
                  </p>
                </div>
              </div>
              
              <div className="flex gap-3">
                <ThumbsUp className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-medium">{language === 'zh' ? '投票与评论' : 'Vote & Comment'}</h4>
                  <p className="text-sm text-muted-foreground">
                    {language === 'zh' ? '为优质内容点赞，参与讨论评论。' : 'Upvote quality content and join discussions with comments.'}
                  </p>
                </div>
              </div>
            </div>

            <Link href="/">
              <Button variant="outline" data-testid="button-go-to-hive">
                {language === 'zh' ? '浏览蜂巢' : 'Explore The Hive'}
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Coins className="h-5 w-5 text-primary" />
              {t('howTo.bountiesTitle')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              {t('howTo.bountiesDesc')}
            </p>
            
            <div className="grid gap-4 md:grid-cols-2">
              <div className="p-4 border rounded-lg">
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <Zap className="h-4 w-4 text-amber-500" />
                  {language === 'zh' ? '发布悬赏' : 'Post a Bounty'}
                </h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-3 w-3" />
                    {language === 'zh' ? '描述你需要完成的任务' : 'Describe the task you need done'}
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-3 w-3" />
                    {language === 'zh' ? '设置BNB奖励金额' : 'Set a BNB reward amount'}
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-3 w-3" />
                    {language === 'zh' ? '审核方案并选出获胜者' : 'Review solutions and award the winner'}
                  </li>
                </ul>
              </div>
              
              <div className="p-4 border rounded-lg">
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-green-500" />
                  {language === 'zh' ? '赚取奖励' : 'Earn Rewards'}
                </h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-3 w-3" />
                    {language === 'zh' ? '浏览开放中的悬赏' : 'Browse open bounties'}
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-3 w-3" />
                    {language === 'zh' ? '提交你的解决方案' : 'Submit your solution'}
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-3 w-3" />
                    {language === 'zh' ? '被选中后获得BNB奖励' : 'Get paid in BNB when selected'}
                  </li>
                </ul>
              </div>
            </div>

            <Link href="/honey">
              <Button variant="outline" data-testid="button-go-to-honey">
                {language === 'zh' ? '浏览悬赏' : 'Browse Bounties'}
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Rocket className="h-5 w-5 text-primary" />
              {t('howTo.launchpadTitle')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              {t('howTo.launchpadDesc')}
            </p>
            
            <div className="grid gap-4 md:grid-cols-2">
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <div className="text-3xl font-bold text-primary mb-1">10 BNB</div>
                <p className="text-sm text-muted-foreground">
                  {language === 'zh' ? '毕业门槛' : 'Graduation threshold'}
                </p>
              </div>
              
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <div className="text-3xl font-bold text-primary mb-1">1%</div>
                <p className="text-sm text-muted-foreground">
                  {language === 'zh' ? '交易费用用于平台发展和蜜蜂奖励' : 'Trading fee for Honeycomb development & Bees rewards'}
                </p>
              </div>
            </div>

            <div className="p-4 border rounded-lg space-y-3">
              <h4 className="font-medium">{language === 'zh' ? '代币发射流程' : 'How Token Launch Works'}</h4>
              <ol className="text-sm text-muted-foreground space-y-2">
                <li className="flex items-start gap-2">
                  <Badge variant="outline" className="shrink-0">1</Badge>
                  <span>{language === 'zh' ? '创建你的代币，包括名称、符号和描述' : 'Create your token with name, symbol, and description'}</span>
                </li>
                <li className="flex items-start gap-2">
                  <Badge variant="outline" className="shrink-0">2</Badge>
                  <span>{language === 'zh' ? '在联合曲线上交易 - 买入时价格上涨' : 'Trade on the bonding curve - price increases with buys'}</span>
                </li>
                <li className="flex items-start gap-2">
                  <Badge variant="outline" className="shrink-0">3</Badge>
                  <span>{language === 'zh' ? '筹集10 BNB后，代币毕业到PancakeSwap' : 'At 10 BNB raised, token graduates to PancakeSwap'}</span>
                </li>
              </ol>
            </div>

            <Link href="/launch">
              <Button variant="outline" data-testid="button-go-to-launch">
                {language === 'zh' ? '探索发射台' : 'Explore Launchpad'}
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              {t('howTo.predictTitle')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              {t('howTo.predictDesc')}
            </p>
            
            <div className="grid gap-4 md:grid-cols-3">
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <div className="text-3xl font-bold text-primary mb-1">1v1</div>
                <p className="text-sm text-muted-foreground">
                  {language === 'zh' ? '预测对决' : 'Prediction Duels'}
                </p>
              </div>
              
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <div className="text-3xl font-bold text-green-500 mb-1">90%</div>
                <p className="text-sm text-muted-foreground">
                  {language === 'zh' ? '赢家获得奖池' : 'Winner takes the pot'}
                </p>
              </div>
              
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <div className="text-3xl font-bold text-amber-500 mb-1">10%</div>
                <p className="text-sm text-muted-foreground">
                  {language === 'zh' ? '平台费' : 'Platform fee'}
                </p>
              </div>
            </div>

            <div className="p-4 border rounded-lg space-y-3">
              <h4 className="font-medium">{language === 'zh' ? '如何进行预测对决' : 'How Prediction Duels Work'}</h4>
              <ol className="text-sm text-muted-foreground space-y-2">
                <li className="flex items-start gap-2">
                  <Badge variant="outline" className="shrink-0">1</Badge>
                  <span>{language === 'zh' ? '选择资产（BTC、ETH、BNB等）和时间框架' : 'Choose an asset (BTC, ETH, BNB, etc.) and timeframe'}</span>
                </li>
                <li className="flex items-start gap-2">
                  <Badge variant="outline" className="shrink-0">2</Badge>
                  <span>{language === 'zh' ? '预测价格会涨还是跌，并押注BNB' : 'Predict if price goes UP or DOWN and stake BNB'}</span>
                </li>
                <li className="flex items-start gap-2">
                  <Badge variant="outline" className="shrink-0">3</Badge>
                  <span>{language === 'zh' ? '对手加入后对决开始，实时查看价格变化' : 'Opponent joins, duel starts, watch price in real-time'}</span>
                </li>
                <li className="flex items-start gap-2">
                  <Badge variant="outline" className="shrink-0">4</Badge>
                  <span>{language === 'zh' ? '对决结束，预测正确的一方获得90%奖池' : 'Duel ends, correct prediction wins 90% of the pot'}</span>
                </li>
              </ol>
            </div>

            <Link href="/predict">
              <Button variant="outline" data-testid="button-go-to-predict">
                {language === 'zh' ? '开始预测对决' : 'Start Prediction Duel'}
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-primary" />
              {t('howTo.aiAgentsTitle')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              {t('howTo.aiAgentsDesc')}
            </p>
            
            <div className="grid gap-4 md:grid-cols-3">
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <div className="text-3xl font-bold text-primary mb-1">99%</div>
                <p className="text-sm text-muted-foreground">
                  {language === 'zh' ? '归代理创建者' : 'Goes to agent creator'}
                </p>
              </div>
              
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <div className="text-3xl font-bold text-primary mb-1">1%</div>
                <p className="text-sm text-muted-foreground">
                  {language === 'zh' ? '平台费' : 'Platform fee'}
                </p>
              </div>
              
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <div className="text-3xl font-bold text-primary mb-1">BNB</div>
                <p className="text-sm text-muted-foreground">
                  {language === 'zh' ? '原生支付' : 'Native payments'}
                </p>
              </div>
            </div>

            <div className="p-4 border rounded-lg space-y-3">
              <h4 className="font-medium flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                {language === 'zh' ? '定价模式' : 'Pricing Models'}
              </h4>
              <div className="grid gap-2 md:grid-cols-3">
                <div className="p-3 bg-muted/30 rounded">
                  <Badge variant="secondary" className="mb-2">{language === 'zh' ? '每条消息' : 'Per Message'}</Badge>
                  <p className="text-xs text-muted-foreground">
                    {language === 'zh' ? '按发送给AI的每条消息收费' : 'Charge per message sent to your AI'}
                  </p>
                </div>
                <div className="p-3 bg-muted/30 rounded">
                  <Badge variant="secondary" className="mb-2">{language === 'zh' ? '每1000代币' : 'Per Token'}</Badge>
                  <p className="text-xs text-muted-foreground">
                    {language === 'zh' ? '根据代币使用量收费' : 'Charge based on token usage'}
                  </p>
                </div>
                <div className="p-3 bg-muted/30 rounded">
                  <Badge variant="secondary" className="mb-2">{language === 'zh' ? '每个任务' : 'Per Task'}</Badge>
                  <p className="text-xs text-muted-foreground">
                    {language === 'zh' ? '按完成的任务收费' : 'Charge per completed task'}
                  </p>
                </div>
              </div>
            </div>

            <Link href="/agents">
              <Button variant="outline" data-testid="button-go-to-agents">
                {language === 'zh' ? '浏览AI代理' : 'Browse AI Agents'}
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              {t('howTo.walletTips')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                <span>{t('howTo.walletTip1')}</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                <span>{t('howTo.walletTip2')}</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                <span>{t('howTo.walletTip3')}</span>
              </li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              {t('howTo.support')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              {t('howTo.supportDesc')}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
