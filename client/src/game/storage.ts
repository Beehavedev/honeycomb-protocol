const BEST_SCORE_KEY = "honeyrunner_best_score";
const BEST_COINS_KEY = "honeyrunner_best_coins";
const TOTAL_COINS_KEY = "honeyrunner_total_coins";
const TOTAL_RUNS_KEY = "honeyrunner_total_runs";

export function getBestScore(): number {
  return parseInt(localStorage.getItem(BEST_SCORE_KEY) || "0", 10);
}

export function setBestScore(score: number): boolean {
  const current = getBestScore();
  if (score > current) {
    localStorage.setItem(BEST_SCORE_KEY, score.toString());
    return true;
  }
  return false;
}

export function getTotalCoins(): number {
  return parseInt(localStorage.getItem(TOTAL_COINS_KEY) || "0", 10);
}

export function addCoins(coins: number): void {
  const total = getTotalCoins() + coins;
  localStorage.setItem(TOTAL_COINS_KEY, total.toString());
}

export function getTotalRuns(): number {
  return parseInt(localStorage.getItem(TOTAL_RUNS_KEY) || "0", 10);
}

export function incrementRuns(): void {
  const total = getTotalRuns() + 1;
  localStorage.setItem(TOTAL_RUNS_KEY, total.toString());
}
