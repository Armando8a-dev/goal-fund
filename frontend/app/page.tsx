"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { parseEther, formatEther } from "viem";
import { useState, useEffect } from "react";
import { GOAL_FUND_ADDRESS, GOAL_FUND_ABI } from "./abi";

function ProgressBar({ raised, goal }: { raised: bigint; goal: bigint }) {
  const r = Number(formatEther(raised));
  const g = Number(formatEther(goal));
  const pct = Math.min((r / g) * 100, 100);
  return (
    <div className="space-y-1">
      <div className="w-full h-3 rounded-full bg-white/10">
        <div
          className="h-3 rounded-full bg-cyan-400 transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-xs text-white/50">{pct.toFixed(0)}% of goal</p>
    </div>
  );
}

function formatDeadline(deadline: bigint) {
  const ms = Number(deadline) * 1000;
  return new Date(ms).toLocaleString();
}

export default function Home() {
  const { address, isConnected } = useAccount();
  const [contributeAmount, setContributeAmount] = useState("0.001");
  const [txMsg, setTxMsg] = useState("");

  const { data: creator } = useReadContract({
    address: GOAL_FUND_ADDRESS, abi: GOAL_FUND_ABI, functionName: "creator",
  });
  const { data: goal } = useReadContract({
    address: GOAL_FUND_ADDRESS, abi: GOAL_FUND_ABI, functionName: "goal",
  });
  const { data: deadline } = useReadContract({
    address: GOAL_FUND_ADDRESS, abi: GOAL_FUND_ABI, functionName: "deadline",
  });
  const { data: totalRaised, refetch: refetchRaised } = useReadContract({
    address: GOAL_FUND_ADDRESS, abi: GOAL_FUND_ABI, functionName: "totalRaised",
  });
  const { data: withdrawn, refetch: refetchWithdrawn } = useReadContract({
    address: GOAL_FUND_ADDRESS, abi: GOAL_FUND_ABI, functionName: "withdrawn",
  });
  const { data: isActive, refetch: refetchActive } = useReadContract({
    address: GOAL_FUND_ADDRESS, abi: GOAL_FUND_ABI, functionName: "isActive",
  });
  const { data: isGoalReached, refetch: refetchGoalReached } = useReadContract({
    address: GOAL_FUND_ADDRESS, abi: GOAL_FUND_ABI, functionName: "isGoalReached",
  });
  const { data: myContribution, refetch: refetchMyContribution } = useReadContract({
    address: GOAL_FUND_ADDRESS, abi: GOAL_FUND_ABI, functionName: "contributions",
    args: address ? [address] : undefined, query: { enabled: !!address },
  });

  const { writeContract, data: txHash, isPending } = useWriteContract();
  const { isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  const isCreator = address && creator && address.toLowerCase() === (creator as string).toLowerCase();

  useEffect(() => {
    if (isSuccess) {
      refetchRaised();
      refetchWithdrawn();
      refetchActive();
      refetchGoalReached();
      refetchMyContribution();
      setTxMsg("Transaction confirmed!");
      setTimeout(() => setTxMsg(""), 4000);
    }
  }, [isSuccess, refetchRaised, refetchWithdrawn, refetchActive, refetchGoalReached, refetchMyContribution]);

  const handleContribute = () => {
    if (!contributeAmount || Number(contributeAmount) <= 0) return;
    writeContract({
      address: GOAL_FUND_ADDRESS, abi: GOAL_FUND_ABI,
      functionName: "contribute", value: parseEther(contributeAmount),
    });
  };

  const handleWithdraw = () => {
    writeContract({
      address: GOAL_FUND_ADDRESS, abi: GOAL_FUND_ABI, functionName: "withdraw",
    });
  };

  const handleRefund = () => {
    writeContract({
      address: GOAL_FUND_ADDRESS, abi: GOAL_FUND_ABI, functionName: "refund",
    });
  };

  const raisedEth = totalRaised ? formatEther(totalRaised) : "0";
  const goalEth = goal ? formatEther(goal) : "0";
  const ended = isActive === false;
  const canWithdraw = isCreator && ended && isGoalReached && !withdrawn;
  const canRefund = ended && isGoalReached === false && myContribution && myContribution > 0n;

  return (
    <main className="min-h-screen p-4 md:p-8 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-cyan-400">🎯 GoalFund</h1>
          <p className="text-sm text-white/50">Trustless crowdfunding · Sepolia</p>
        </div>
        <ConnectButton />
      </div>

      <div className="space-y-4">
        {/* Campaign stats */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-sm text-white/50 mb-1">Raised</p>
              <p className="text-4xl font-bold text-cyan-400">{Number(raisedEth).toFixed(4)}</p>
              <p className="text-xs text-white/40 mt-1">ETH of {Number(goalEth).toFixed(4)} ETH goal</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-white/50 mb-2">Status</p>
              <span
                className={`inline-flex items-center px-3 py-1 rounded-full border text-sm font-semibold ${
                  ended
                    ? isGoalReached
                      ? "text-green-400 bg-green-400/10 border-green-400/30"
                      : "text-red-400 bg-red-400/10 border-red-400/30"
                    : "text-cyan-400 bg-cyan-400/10 border-cyan-400/30"
                }`}
              >
                {ended ? (isGoalReached ? "✅ Goal reached" : "❌ Goal missed") : "🟢 Active"}
              </span>
            </div>
          </div>
          {totalRaised !== undefined && goal !== undefined && (
            <ProgressBar raised={totalRaised} goal={goal} />
          )}
          <div className="mt-4 pt-4 border-t border-white/10 grid grid-cols-2 gap-4 text-xs text-white/50">
            <div>
              <p className="text-white/80 font-medium">Deadline</p>
              <p>{deadline ? formatDeadline(deadline) : "—"}</p>
            </div>
            <div>
              <p className="text-white/80 font-medium">Creator</p>
              <p className="truncate">{creator ? `${(creator as string).slice(0, 6)}...${(creator as string).slice(-4)}` : "—"}</p>
            </div>
          </div>
        </div>

        {!isConnected ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-12 text-center">
            <p className="text-4xl mb-4">🎯</p>
            <p className="text-white/60">Connect your wallet to contribute or manage the campaign.</p>
          </div>
        ) : (
          <>
            {/* Contribute */}
            {!ended && (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
                <h2 className="font-semibold mb-4 text-cyan-400">💰 Contribute</h2>
                {myContribution !== undefined && myContribution > 0n && (
                  <p className="text-xs text-white/50 mb-4">
                    You&apos;ve contributed <span className="text-white">{formatEther(myContribution)} ETH</span> so far.
                  </p>
                )}
                <div className="flex gap-2">
                  <input
                    type="number" min="0" step="0.001" value={contributeAmount}
                    onChange={(e) => setContributeAmount(e.target.value)}
                    className="flex-1 bg-white/10 border border-white/20 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-cyan-400"
                    placeholder="ETH amount"
                  />
                  <button
                    onClick={handleContribute}
                    disabled={isPending || !contributeAmount}
                    className="bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 text-black font-semibold px-6 py-2 rounded-xl transition-colors"
                  >
                    {isPending ? "..." : "Contribute"}
                  </button>
                </div>
              </div>
            )}

            {/* Withdraw (creator only) */}
            {canWithdraw && (
              <div className="rounded-2xl border border-cyan-400/30 bg-cyan-400/5 p-6">
                <h2 className="font-semibold mb-2 text-cyan-400">⚡ Withdraw Funds (Creator)</h2>
                <p className="text-xs text-white/50 mb-4">
                  The goal was reached. You can withdraw the full {Number(raisedEth).toFixed(4)} ETH raised.
                </p>
                <button
                  onClick={handleWithdraw}
                  disabled={isPending}
                  className="bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 text-black font-semibold px-6 py-2 rounded-xl transition-colors"
                >
                  {isPending ? "..." : "Withdraw"}
                </button>
              </div>
            )}
            {isCreator && ended && isGoalReached && withdrawn && (
              <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-xs text-white/50 text-center">
                Funds already withdrawn.
              </div>
            )}

            {/* Refund (donors) */}
            {canRefund && (
              <div className="rounded-2xl border border-red-400/30 bg-red-400/5 p-6">
                <h2 className="font-semibold mb-2 text-red-400">↩️ Claim Refund</h2>
                <p className="text-xs text-white/50 mb-4">
                  The goal was not reached. You can reclaim your{" "}
                  {myContribution ? formatEther(myContribution) : "0"} ETH.
                </p>
                <button
                  onClick={handleRefund}
                  disabled={isPending}
                  className="bg-red-500 hover:bg-red-400 disabled:opacity-40 text-black font-semibold px-6 py-2 rounded-xl transition-colors"
                >
                  {isPending ? "..." : "Refund"}
                </button>
              </div>
            )}
          </>
        )}

        {/* Tx feedback */}
        {txMsg && (
          <div className="rounded-xl border border-green-400/30 bg-green-400/10 p-4 text-green-400 text-sm text-center">
            ✅ {txMsg}
          </div>
        )}

        {txHash && !isSuccess && (
          <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-xs text-white/50 text-center">
            Waiting for confirmation...{" "}
            <a href={`https://sepolia.etherscan.io/tx/${txHash}`} target="_blank" className="text-cyan-400 underline">
              View on Etherscan
            </a>
          </div>
        )}
      </div>

      <p className="text-center text-xs text-white/20 mt-8">
        Contract:{" "}
        <a href={`https://sepolia.etherscan.io/address/${GOAL_FUND_ADDRESS}`} target="_blank" className="underline hover:text-white/40">
          {GOAL_FUND_ADDRESS.slice(0, 6)}...{GOAL_FUND_ADDRESS.slice(-4)}
        </a>
      </p>
    </main>
  );
}
