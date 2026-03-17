import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { supabase } from "../services/supabase";
import { Trophy, X, ShieldQuestion, Swords, MessageSquare } from "lucide-react";
import { toast } from "react-hot-toast";

import { dataService } from "../services/dataService";

export type PieceType = "rock" | "paper" | "scissors" | "flag";

export interface Piece {
  id: string;
  owner: string;
  type: PieceType;
  x: number;
  y: number;
  revealed: boolean;
}

interface StrategicRPSProps {
  gameId: string;
  myId: string;
  myName: string;
  opponentId: string;
  opponentName: string;
  onClose: () => void;
}

const STARTING_PIECES: PieceType[] = [
  "flag",
  "rock",
  "rock",
  "paper",
  "paper",
  "scissors",
  "scissors",
];

function generateInitialPieces(owner: string, isBottom: boolean): Piece[] {
  const pieces: Piece[] = [];
  const availableSlots = [];
  const startRow = isBottom ? 4 : 0;
  for (let y = startRow; y <= startRow + 1; y++) {
    for (let x = 0; x < 6; x++) {
      availableSlots.push({ x, y });
    }
  }

  // Shuffle slots
  availableSlots.sort(() => Math.random() - 0.5);

  STARTING_PIECES.forEach((type, index) => {
    const slot = availableSlots[index];
    pieces.push({
      id: `${owner}-${index}`,
      owner,
      type,
      x: slot.x,
      y: slot.y,
      revealed: false,
    });
  });

  return pieces;
}

const getBattleResult = (a: PieceType, b: PieceType) => {
  if (a === b) return "tie";
  if (a === "rock" && b === "scissors") return "win";
  if (a === "paper" && b === "rock") return "win";
  if (a === "scissors" && b === "paper") return "win";
  return "lose";
};

export const getPieceIcon = (type: PieceType) => {
  switch (type) {
    case "rock":
      return "✊";
    case "paper":
      return "✋";
    case "scissors":
      return "✌️";
    case "flag":
      return "🚩";
  }
};

export function StrategicRPS({
  gameId,
  myId,
  myName,
  opponentId,
  opponentName,
  onClose,
}: StrategicRPSProps) {
  const [pieces, setPieces] = useState<Piece[]>([]);
  const [turn, setTurn] = useState<string>("");
  const [adminMessage, setAdminMessage] = useState<{message: string} | null>(null);
  const [gameState, setGameState] = useState<"setup" | "playing" | "finished">(
    "setup",
  );
  const [winner, setWinner] = useState<string | null>(null);
  const [selectedPiece, setSelectedPiece] = useState<Piece | null>(null);
  const [battleEffect, setBattleEffect] = useState<{
    x: number;
    y: number;
    result: string;
  } | null>(null);
  const [channel, setChannel] = useState<any>(null);

  const [myReadyPieces, setMyReadyPieces] = useState<Piece[]>([]);
  const [oppReadyPieces, setOppReadyPieces] = useState<Piece[]>([]);
  const startTimeRef = React.useRef<number>(Date.now());

  useEffect(() => {
    if (winner && myId < opponentId) { // Only one player logs the game
      const duration = Math.floor((Date.now() - startTimeRef.current) / 1000);
      dataService.logGame({
        player1_id: myId,
        player1_name: myName,
        player2_id: opponentId,
        player2_name: opponentName,
        game_type: 'Strategic RPS',
        winner_id: winner,
        duration_seconds: duration
      });

      const globalChannel = supabase.channel('global_game_events');
      globalChannel.subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          globalChannel.send({
            type: 'broadcast',
            event: 'game_end',
            payload: { gameId }
          });
          supabase.removeChannel(globalChannel);
        }
      });
    }
  }, [winner, myId, myName, opponentId, opponentName, gameId]);

  // Initialize my pieces
  useEffect(() => {
    const isBottom = myId < opponentId;
    const initial = generateInitialPieces(myId, isBottom);
    setMyReadyPieces(initial);
  }, [myId, opponentId]);

  // Setup Channel
  useEffect(() => {
    const gameChannel = supabase.channel(`strat_rps_${gameId}`);

    gameChannel
      .on("broadcast", { event: "ready" }, ({ payload }) => {
        if (payload.userId === opponentId) {
          setOppReadyPieces(payload.pieces);
        }
      })
      .on("broadcast", { event: "ready_ack" }, ({ payload }) => {
        if (payload.userId === opponentId) {
          setOppReadyPieces(payload.pieces);
        }
      })
      .on("broadcast", { event: "state_update" }, ({ payload }) => {
        setPieces(payload.pieces);
        setTurn(payload.turn);
        if (payload.winner) {
          setWinner(payload.winner);
          setGameState("finished");
        }
        if (payload.battle) {
          setBattleEffect(payload.battle);
          setTimeout(() => setBattleEffect(null), 2000);
        }
      })
      .on("broadcast", { event: "admin_message" }, ({ payload }) => {
        if (payload.gameId === gameId) {
          setAdminMessage({ message: payload.message });
          setTimeout(() => setAdminMessage(null), 5000);
        }
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED" && myReadyPieces.length > 0) {
          gameChannel.send({
            type: "broadcast",
            event: "ready",
            payload: { userId: myId, pieces: myReadyPieces },
          });
        }
      });

    setChannel(gameChannel);
    return () => {
      supabase.removeChannel(gameChannel);
    };
  }, [gameId, myId, opponentId, myReadyPieces]);

  // Send ready when my pieces are generated
  useEffect(() => {
    if (channel && myReadyPieces.length > 0) {
      channel.send({
        type: "broadcast",
        event: "ready",
        payload: { userId: myId, pieces: myReadyPieces },
      });
    }
  }, [channel, myReadyPieces, myId]);

  // Ack when receiving opp pieces
  useEffect(() => {
    if (channel && oppReadyPieces.length > 0 && myReadyPieces.length > 0) {
      channel.send({
        type: "broadcast",
        event: "ready_ack",
        payload: { userId: myId, pieces: myReadyPieces },
      });
    }
  }, [oppReadyPieces, channel, myReadyPieces, myId]);

  // Start game when both ready
  useEffect(() => {
    if (
      gameState === "setup" &&
      myReadyPieces.length > 0 &&
      oppReadyPieces.length > 0
    ) {
      setPieces([...myReadyPieces, ...oppReadyPieces]);
      setTurn(myId < opponentId ? myId : opponentId);
      setGameState("playing");
      
      if (myId < opponentId) {
        const globalChannel = supabase.channel('global_game_events');
        globalChannel.subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            globalChannel.send({
              type: 'broadcast',
              event: 'game_start',
              payload: {
                gameId,
                player1Name: myName,
                player2Name: opponentName,
                gameType: 'Strategic RPS'
              }
            });
            supabase.removeChannel(globalChannel);
          }
        });
      }
    }
  }, [myReadyPieces, oppReadyPieces, gameState, myId, opponentId, gameId, myName, opponentName]);

  const isValidMove = (piece: Piece, targetX: number, targetY: number) => {
    if (piece.type === "flag") return false; // Flags can't move

    const dx = Math.abs(piece.x - targetX);
    const dy = Math.abs(piece.y - targetY);

    // 1 step orthogonally
    if ((dx === 1 && dy === 0) || (dx === 0 && dy === 1)) {
      // Check if target is occupied by my own piece
      const targetPiece = pieces.find(
        (p) => p.x === targetX && p.y === targetY,
      );
      if (targetPiece && targetPiece.owner === myId) {
        return false;
      }
      return true;
    }
    return false;
  };

  const executeMove = (
    attacker: Piece,
    targetX: number,
    targetY: number,
    defender?: Piece,
  ) => {
    let newPieces = [...pieces];
    let battleResult: any = null;
    let currentWinner = winner;

    // Remove attacker from old position
    newPieces = newPieces.filter((p) => p.id !== attacker.id);

    let updatedAttacker = { ...attacker, x: targetX, y: targetY };

    if (defender) {
      updatedAttacker.revealed = true;

      // Reveal defender
      newPieces = newPieces.map((p) =>
        p.id === defender.id ? { ...p, revealed: true } : p,
      );
      const updatedDefender = newPieces.find((p) => p.id === defender.id)!;

      if (updatedDefender.type === "flag") {
        currentWinner = myId;
        newPieces = newPieces.filter((p) => p.id !== defender.id);
        newPieces.push(updatedAttacker);
        battleResult = { x: targetX, y: targetY, result: "flag_captured" };
      } else {
        const result = getBattleResult(
          updatedAttacker.type,
          updatedDefender.type,
        );
        if (result === "win") {
          newPieces = newPieces.filter((p) => p.id !== defender.id);
          newPieces.push(updatedAttacker);
          battleResult = { x: targetX, y: targetY, result: "win" };
        } else if (result === "lose") {
          battleResult = { x: targetX, y: targetY, result: "lose" };
        } else {
          newPieces = newPieces.filter((p) => p.id !== defender.id);
          battleResult = { x: targetX, y: targetY, result: "tie" };
        }
      }
    } else {
      newPieces.push(updatedAttacker);
    }

    const nextTurn = opponentId;

    setPieces(newPieces);
    setTurn(nextTurn);
    setSelectedPiece(null);
    if (currentWinner) {
      setWinner(currentWinner);
      setGameState("finished");
    }
    if (battleResult) {
      setBattleEffect(battleResult);
      setTimeout(() => setBattleEffect(null), 2000);
    }

    channel?.send({
      type: "broadcast",
      event: "state_update",
      payload: {
        pieces: newPieces,
        turn: nextTurn,
        winner: currentWinner,
        battle: battleResult,
      },
    });
  };

  const handleSquareClick = (x: number, y: number) => {
    if (gameState !== "playing" || turn !== myId) return;

    const clickedPiece = pieces.find((p) => p.x === x && p.y === y);

    if (selectedPiece) {
      if (isValidMove(selectedPiece, x, y)) {
        executeMove(selectedPiece, x, y, clickedPiece);
      } else if (clickedPiece?.owner === myId) {
        if (clickedPiece.type !== "flag") {
          setSelectedPiece(clickedPiece);
        }
      } else {
        setSelectedPiece(null);
      }
    } else {
      if (clickedPiece?.owner === myId && clickedPiece.type !== "flag") {
        setSelectedPiece(clickedPiece);
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-4xl bg-slate-900 rounded-[2.5rem] shadow-2xl border border-white/10 overflow-hidden flex flex-col h-[90vh]">
        {/* Header */}
        <div className="p-4 border-b border-white/10 flex items-center justify-between bg-black/40">
          <div className="flex items-center gap-3 text-emerald-400 font-bold">
            <Swords size={24} />
            <span>Strategic RPS Battle</span>
          </div>
          <button
            onClick={onClose}
            className="text-white/50 hover:text-white bg-white/5 p-2 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Game Area */}
        {/* Admin Message Popup */}
      <AnimatePresence>
        {adminMessage && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed top-20 left-1/2 -translate-x-1/2 z-[100] bg-emerald-500 text-white p-6 rounded-3xl shadow-2xl border-4 border-white flex items-center gap-4 max-w-sm"
          >
            <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
              <MessageSquare size={24} />
            </div>
            <div>
              <div className="font-bold">הודעה מהמנהל הראשי:</div>
              <div className="text-sm">{adminMessage.message}</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex-1 relative flex flex-col items-center justify-center overflow-hidden bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-800 via-slate-900 to-black">
          {/* Status */}
          <div className="absolute top-8 left-0 right-0 flex justify-center z-20">
            <AnimatePresence mode="wait">
              {gameState === "setup" && (
                <motion.div
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="bg-white/10 backdrop-blur-md px-6 py-2 rounded-full text-white font-bold border border-white/20"
                >
                  Waiting for {opponentName} to connect...
                </motion.div>
              )}
              {gameState === "playing" && (
                <motion.div
                  key={turn}
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className={`px-6 py-2 rounded-full font-black shadow-lg border ${
                    turn === myId
                      ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/50"
                      : "bg-rose-500/20 text-rose-400 border-rose-500/50"
                  }`}
                >
                  {turn === myId ? "Your Turn!" : `${opponentName}'s Turn`}
                </motion.div>
              )}
              {gameState === "finished" && winner && (
                <motion.div
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className={`px-8 py-3 rounded-full font-black text-2xl shadow-2xl border-2 ${
                    winner === myId
                      ? "bg-emerald-500 text-white border-emerald-300"
                      : "bg-rose-500 text-white border-rose-300"
                  }`}
                >
                  {winner === myId ? "Victory! 🎉" : "Defeat! 😢"}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Board */}
          <div
            className="relative w-[320px] h-[320px] md:w-[450px] md:h-[450px] mt-12"
            style={{
              transform: "rotateX(60deg) rotateZ(-45deg)",
              transformStyle: "preserve-3d",
            }}
          >
            {/* Grid */}
            <div className="grid grid-cols-6 grid-rows-6 w-full h-full border-2 border-indigo-500/30 bg-indigo-900/20 backdrop-blur-sm shadow-[0_0_50px_rgba(99,102,241,0.2)]">
              {Array.from({ length: 36 }).map((_, i) => {
                const x = i % 6;
                const y = Math.floor(i / 6);
                const isSelected =
                  selectedPiece?.x === x && selectedPiece?.y === y;
                const isValid =
                  selectedPiece && isValidMove(selectedPiece, x, y);

                return (
                  <div
                    key={i}
                    onClick={() => handleSquareClick(x, y)}
                    className={`border border-indigo-500/20 relative transition-all duration-300 ${
                      isSelected
                        ? "bg-amber-500/40 shadow-[inset_0_0_20px_rgba(245,158,11,0.5)]"
                        : isValid
                          ? "bg-emerald-500/30 cursor-pointer hover:bg-emerald-500/50 shadow-[inset_0_0_15px_rgba(16,185,129,0.4)]"
                          : "hover:bg-white/5"
                    }`}
                  />
                );
              })}
            </div>

            {/* Pieces */}
            {pieces.map((piece) => {
              const isMine = piece.owner === myId;
              const isRevealed = piece.revealed || isMine;

              return (
                <motion.div
                  key={piece.id}
                  initial={false}
                  animate={{
                    x: `${piece.x * 100}%`,
                    y: `${piece.y * 100}%`,
                    z: isMine && selectedPiece?.id === piece.id ? 20 : 0,
                  }}
                  transition={{ type: "spring", stiffness: 300, damping: 25 }}
                  className="absolute w-[16.66%] h-[16.66%] flex items-center justify-center pointer-events-none"
                  style={{ transformStyle: "preserve-3d" }}
                >
                  <div
                    className={`w-10 h-10 md:w-12 md:h-12 rounded-xl shadow-2xl flex items-center justify-center text-2xl border-2 relative ${
                      isMine
                        ? "bg-gradient-to-br from-emerald-400 to-emerald-600 border-emerald-200"
                        : "bg-gradient-to-br from-rose-400 to-rose-600 border-rose-200"
                    } ${isMine && selectedPiece?.id === piece.id ? "ring-4 ring-amber-400 ring-offset-2 ring-offset-transparent" : ""}`}
                    style={{
                      transform:
                        "rotateZ(45deg) rotateX(-60deg) translateY(-20px)",
                    }}
                  >
                    {/* Shadow under piece */}
                    <div
                      className="absolute -bottom-4 w-8 h-4 bg-black/40 blur-md rounded-full"
                      style={{ transform: "rotateX(60deg)" }}
                    />

                    <span className="relative z-10 drop-shadow-md">
                      {isRevealed ? (
                        getPieceIcon(piece.type)
                      ) : (
                        <ShieldQuestion size={20} className="text-white/90" />
                      )}
                    </span>
                  </div>
                </motion.div>
              );
            })}

            {/* Battle Effect */}
            {battleEffect && (
              <div
                className="absolute w-[16.66%] h-[16.66%] flex items-center justify-center pointer-events-none z-50"
                style={{
                  left: `${battleEffect.x * 16.66}%`,
                  top: `${battleEffect.y * 16.66}%`,
                }}
              >
                <motion.div
                  initial={{ scale: 0, opacity: 1 }}
                  animate={{ scale: 2.5, opacity: 0 }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                  className="text-5xl filter drop-shadow-[0_0_20px_rgba(255,255,255,0.8)]"
                  style={{
                    transform:
                      "rotateZ(45deg) rotateX(-60deg) translateZ(50px)",
                  }}
                >
                  💥
                </motion.div>
              </div>
            )}
          </div>

          {/* Legend / Instructions */}
          <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-6 text-white/60 text-sm bg-black/40 backdrop-blur-md py-3 px-8 rounded-full w-max mx-auto border border-white/10">
            <div className="flex items-center gap-2">
              <span className="text-xl">✊</span> Beats Scissors
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xl">✋</span> Beats Rock
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xl">✌️</span> Beats Paper
            </div>
            <div className="flex items-center gap-2 ml-4 pl-4 border-l border-white/20">
              <span className="text-xl">🚩</span> Capture to Win
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
