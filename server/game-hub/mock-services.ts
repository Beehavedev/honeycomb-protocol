import crypto from "crypto";

export type ActionType = "ACTION_LOCK_ESCROW" | "ACTION_START_MATCH" | "ACTION_FINISH_MATCH" | "ACTION_SETTLE";

export class BeePayService {
  private mockMode = true;
  private escrows = new Map<string, { matchId: string; amount: string; payer: string; locked: boolean; released: boolean }>();

  async lockEscrow(matchId: string, amount: string, payer: string): Promise<{ ok: boolean; lockId: string; txHash?: string }> {
    const lockId = `escrow_${crypto.randomUUID().slice(0, 8)}`;
    this.escrows.set(lockId, { matchId, amount, payer, locked: true, released: false });
    console.log(`[BeePay-Mock] Locked ${amount} wei for match ${matchId} from ${payer} -> ${lockId}`);
    return { ok: true, lockId };
  }

  async releaseEscrow(lockId: string, recipient: string, amount: string): Promise<{ ok: boolean; txHash: string }> {
    const escrow = this.escrows.get(lockId);
    if (escrow) {
      escrow.released = true;
    }
    const txHash = `0x${crypto.randomBytes(32).toString("hex")}`;
    console.log(`[BeePay-Mock] Released ${amount} to ${recipient} -> ${txHash}`);
    return { ok: true, txHash };
  }

  async refundEscrow(lockId: string): Promise<{ ok: boolean; txHash: string }> {
    const escrow = this.escrows.get(lockId);
    if (escrow) {
      escrow.released = true;
    }
    const txHash = `0x${crypto.randomBytes(32).toString("hex")}`;
    console.log(`[BeePay-Mock] Refunded escrow ${lockId} -> ${txHash}`);
    return { ok: true, txHash };
  }

  getEscrow(lockId: string) {
    return this.escrows.get(lockId);
  }
}

export class BAP578Service {
  async executeAction(actionType: ActionType, payload: any): Promise<{ ok: boolean; txHash: string; mockId: string }> {
    const mockId = `bap578_${crypto.randomUUID().slice(0, 8)}`;
    const txHash = `0x${crypto.randomBytes(32).toString("hex")}`;
    console.log(`[BAP-578-Mock] executeAction: ${actionType} -> ${mockId}`);
    return { ok: true, txHash, mockId };
  }
}

export const beepayService = new BeePayService();
export const bap578Service = new BAP578Service();
