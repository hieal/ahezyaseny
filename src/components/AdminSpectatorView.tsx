import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import { supabase } from "../services/supabase";
import { X, Swords, MessageSquare } from "lucide-react";
import { Piece, PieceType, getPieceIcon } from "./StrategicRPS";

interface AdminSpectatorViewProps {
  gameId: string;
  player1Name: string;
  player2Name: string;
  onClose: () => void;
  onSendMessage: () => void;
}

export function AdminSpectatorView({
  gameId,
  player1Name,
  player2Name,
  onClose,
  onSendMessage,
}: AdminSpectatorViewProps) {
  const [pieces, setPieces] = useState<Piece[]>([]);
  const [turn, setTurn] = useState<string>("");
  const [winner, setWinner] = useState<string | null>(null);

  useEffect(() => {
    const gameChannel = supabase.channel(`strat_rps_${gameId}`);

    gameChannel
      .on("broadcast", { event: "state_update" }, ({ payload }) => {
        setPieces(payload.pieces);
        setTurn(payload.turn);
        if (payload.winner) {
          setWinner(payload.winner);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(gameChannel);
    };
  }, [gameId]);

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-4xl bg-slate-900 rounded-[2.5rem] shadow-2xl border border-white/10 overflow-hidden flex flex-col h-[90vh]">
        {/* Header */}
        <div className="p-4 border-b border-white/10 flex items-center justify-between bg-black/40">
          <div className="flex items-center gap-3 text-emerald-400 font-bold">
            <Swords size={24} />
            <span>Spectator Mode: {player1Name} vs {player2Name}</span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={onSendMessage}
              className="text-white/70 hover:text-white bg-white/10 px-4 py-2 rounded-full flex items-center gap-2 transition-colors"
            >
              <MessageSquare size={18} />
              שלח הודעה לשחקנים
            </button>
            <button
              onClick={onClose}
              className="text-white/50 hover:text-white bg-white/5 p-2 rounded-full transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Game Area */}
        <div className="flex-1 relative flex flex-col items-center justify-center overflow-hidden bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-800 via-slate-900 to-black">
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
              {Array.from({ length: 36 }).map((_, i) => (
                <div key={i} className="border border-indigo-500/20" />
              ))}
            </div>

            {/* Pieces */}
            {pieces.map((piece) => (
              <motion.div
                key={piece.id}
                initial={false}
                animate={{
                  x: `${piece.x * 100}%`,
                  y: `${piece.y * 100}%`,
                }}
                transition={{ type: "spring", stiffness: 300, damping: 25 }}
                className="absolute w-[16.66%] h-[16.66%] flex items-center justify-center pointer-events-none"
                style={{ transformStyle: "preserve-3d" }}
              >
                <div
                  className={`w-10 h-10 md:w-12 md:h-12 rounded-xl shadow-2xl flex items-center justify-center text-2xl border-2 relative ${
                    piece.owner === pieces[0]?.owner // Simplified owner check
                      ? "bg-gradient-to-br from-emerald-400 to-emerald-600 border-emerald-200"
                      : "bg-gradient-to-br from-rose-400 to-rose-600 border-rose-200"
                  }`}
                  style={{
                    transform:
                      "rotateZ(45deg) rotateX(-60deg) translateY(-20px)",
                  }}
                >
                  <span className="relative z-10 drop-shadow-md">
                    {getPieceIcon(piece.type)}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
