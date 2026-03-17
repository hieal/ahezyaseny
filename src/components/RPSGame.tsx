import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../services/supabase';
import { Trophy, X, MessageCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';

import { dataService } from '../services/dataService';

interface RPSGameProps {
  gameId: string;
  myId: string;
  myName: string;
  opponentId: string;
  opponentName: string;
  onClose: () => void;
}

type Choice = 'rock' | 'paper' | 'scissors' | null;
type GameState = 'waiting' | 'countdown' | 'playing' | 'reveal' | 'finished';

export function RPSGame({ gameId, myId, myName, opponentId, opponentName, onClose }: RPSGameProps) {
  const [gameState, setGameState] = useState<GameState>('waiting');
  const [countdown, setCountdown] = useState(3);
  const [myChoice, setMyChoice] = useState<Choice>(null);
  const [opponentChoice, setOpponentChoice] = useState<Choice>(null);
  const [result, setResult] = useState<'win' | 'lose' | 'draw' | null>(null);
  const [channel, setChannel] = useState<any>(null);
  const startTimeRef = React.useRef<number>(Date.now());

  useEffect(() => {
    if (gameState === 'finished' && myId < opponentId) {
      const duration = Math.floor((Date.now() - startTimeRef.current) / 1000);
      let winnerId = null;
      if (result === 'win') winnerId = myId;
      else if (result === 'lose') winnerId = opponentId;
      
      dataService.logGame({
        player1_id: myId,
        player1_name: myName,
        player2_id: opponentId,
        player2_name: opponentName,
        game_type: 'RPS',
        winner_id: winnerId,
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
  }, [gameState, result, myId, myName, opponentId, opponentName, gameId]);

  useEffect(() => {
    const gameChannel = supabase.channel(`game_${gameId}`);

    gameChannel
      .on('broadcast', { event: 'choice' }, ({ payload }) => {
        if (payload.userId === opponentId) {
          setOpponentChoice(payload.choice);
        }
      })
      .on('broadcast', { event: 'ready' }, ({ payload }) => {
        if (payload.userId === opponentId) {
          setGameState('countdown');
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
                    gameType: 'RPS'
                  }
                });
                supabase.removeChannel(globalChannel);
              }
            });
          }
        }
      })
      .on('broadcast', { event: 'wink' }, ({ payload }) => {
        if (payload.userId === opponentId) {
          toast(`${opponentName} sent you a wink! 😉`, { icon: '😉' });
        }
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          gameChannel.send({
            type: 'broadcast',
            event: 'ready',
            payload: { userId: myId }
          });
        }
      });

    setChannel(gameChannel);

    return () => {
      supabase.removeChannel(gameChannel);
    };
  }, [gameId, myId, opponentId, opponentName]);

  useEffect(() => {
    if (gameState === 'countdown') {
      if (countdown > 0) {
        const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
        return () => clearTimeout(timer);
      } else {
        setGameState('playing');
        setCountdown(5); // 5 seconds to choose
      }
    } else if (gameState === 'playing') {
      if (countdown > 0) {
        const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
        return () => clearTimeout(timer);
      } else {
        // Time's up
        if (!myChoice) {
          handleChoice('rock'); // Default choice if timeout
        }
      }
    }
  }, [gameState, countdown, myChoice]);

  useEffect(() => {
    if (myChoice && opponentChoice && gameState === 'playing') {
      setGameState('reveal');
      setTimeout(() => {
        determineWinner(myChoice, opponentChoice);
        setGameState('finished');
      }, 2000);
    }
  }, [myChoice, opponentChoice, gameState]);

  const handleChoice = (choice: Choice) => {
    if (gameState !== 'playing' || myChoice) return;
    setMyChoice(choice);
    channel?.send({
      type: 'broadcast',
      event: 'choice',
      payload: { userId: myId, choice }
    });
  };

  const determineWinner = (mine: Choice, theirs: Choice) => {
    if (mine === theirs) setResult('draw');
    else if (
      (mine === 'rock' && theirs === 'scissors') ||
      (mine === 'paper' && theirs === 'rock') ||
      (mine === 'scissors' && theirs === 'paper')
    ) {
      setResult('win');
    } else {
      setResult('lose');
    }
  };

  const sendWink = () => {
    channel?.send({
      type: 'broadcast',
      event: 'wink',
      payload: { userId: myId }
    });
    toast.success('Wink sent!');
  };

  const getIcon = (choice: Choice) => {
    switch (choice) {
      case 'rock': return '✊';
      case 'paper': return '✋';
      case 'scissors': return '✌️';
      default: return '❓';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gradient-to-br from-indigo-900 to-purple-900 w-full max-w-2xl rounded-[2.5rem] shadow-2xl border border-white/10 overflow-hidden relative flex flex-col h-[80vh] max-h-[600px]">
        
        {/* Header */}
        <div className="p-4 border-b border-white/10 flex items-center justify-between bg-black/20">
          <div className="flex items-center gap-2 text-amber-400 font-bold">
            <Trophy size={20} />
            <span>Rock Paper Scissors Live</span>
          </div>
          <button onClick={onClose} className="text-white/50 hover:text-white bg-white/5 p-2 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Game Area */}
        <div className="flex-1 flex flex-col relative">
          
          {/* Status Banner */}
          <div className="absolute top-4 left-0 right-0 flex justify-center z-10">
            <AnimatePresence mode="wait">
              {gameState === 'waiting' && (
                <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="bg-white/10 backdrop-blur-md px-6 py-2 rounded-full text-white font-bold border border-white/20">
                  Waiting for {opponentName}...
                </motion.div>
              )}
              {gameState === 'countdown' && (
                <motion.div key={countdown} initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 1.5, opacity: 0 }} className="text-6xl font-black text-amber-400 drop-shadow-lg">
                  {countdown}
                </motion.div>
              )}
              {gameState === 'playing' && (
                <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="bg-amber-500 text-amber-950 px-6 py-2 rounded-full font-black shadow-lg">
                  Choose! ({countdown}s)
                </motion.div>
              )}
              {gameState === 'finished' && result && (
                <motion.div initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className={`px-8 py-3 rounded-full font-black text-2xl shadow-2xl border-2 ${
                  result === 'win' ? 'bg-emerald-500 text-white border-emerald-300' :
                  result === 'lose' ? 'bg-rose-500 text-white border-rose-300' :
                  'bg-slate-500 text-white border-slate-300'
                }`}>
                  {result === 'win' ? 'You Won! 🎉' : result === 'lose' ? 'You Lost! 😢' : 'Draw! 🤝'}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Split Screen */}
          <div className="flex-1 flex">
            {/* My Side */}
            <div className="flex-1 border-r border-white/10 flex flex-col items-center justify-center relative bg-gradient-to-b from-transparent to-indigo-900/50">
              <div className="absolute top-4 left-4 text-white/50 font-bold uppercase tracking-wider text-sm">You</div>
              
              <AnimatePresence mode="wait">
                {(gameState === 'countdown' || gameState === 'playing' || gameState === 'waiting') ? (
                  <motion.div
                    key="shaking"
                    animate={gameState === 'countdown' ? { y: [0, -20, 0] } : {}}
                    transition={{ repeat: Infinity, duration: 0.5 }}
                    className="text-8xl filter drop-shadow-2xl"
                  >
                    ✊
                  </motion.div>
                ) : (
                  <motion.div
                    key="reveal"
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    className="text-9xl filter drop-shadow-2xl"
                  >
                    {getIcon(myChoice)}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Opponent Side */}
            <div className="flex-1 flex flex-col items-center justify-center relative bg-gradient-to-b from-transparent to-purple-900/50">
              <div className="absolute top-4 right-4 text-white/50 font-bold uppercase tracking-wider text-sm">{opponentName}</div>
              
              <AnimatePresence mode="wait">
                {(gameState === 'countdown' || gameState === 'playing' || gameState === 'waiting') ? (
                  <motion.div
                    key="shaking-opp"
                    animate={gameState === 'countdown' ? { y: [0, -20, 0] } : {}}
                    transition={{ repeat: Infinity, duration: 0.5, delay: 0.1 }}
                    className="text-8xl filter drop-shadow-2xl transform scale-x-[-1]"
                  >
                    ✊
                  </motion.div>
                ) : (
                  <motion.div
                    key="reveal-opp"
                    initial={{ scale: 0, rotate: 180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    className="text-9xl filter drop-shadow-2xl transform scale-x-[-1]"
                  >
                    {getIcon(opponentChoice)}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Controls */}
          <div className="h-32 bg-black/30 backdrop-blur-md border-t border-white/10 flex items-center justify-center gap-4 p-4">
            {gameState === 'playing' && !myChoice && (
              <>
                <button onClick={() => handleChoice('rock')} className="w-20 h-20 bg-white/10 hover:bg-white/20 rounded-2xl border border-white/20 text-4xl flex items-center justify-center transition-all hover:scale-110 active:scale-95">✊</button>
                <button onClick={() => handleChoice('paper')} className="w-20 h-20 bg-white/10 hover:bg-white/20 rounded-2xl border border-white/20 text-4xl flex items-center justify-center transition-all hover:scale-110 active:scale-95">✋</button>
                <button onClick={() => handleChoice('scissors')} className="w-20 h-20 bg-white/10 hover:bg-white/20 rounded-2xl border border-white/20 text-4xl flex items-center justify-center transition-all hover:scale-110 active:scale-95">✌️</button>
              </>
            )}
            
            {gameState === 'finished' && (
              <div className="flex gap-4">
                <button onClick={sendWink} className="bg-amber-500 hover:bg-amber-600 text-amber-950 px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-all hover:scale-105">
                  <MessageCircle size={20} />
                  Send a Wink 😉
                </button>
                <button onClick={onClose} className="bg-white/10 hover:bg-white/20 text-white px-6 py-3 rounded-xl font-bold transition-all hover:scale-105">
                  Close Game
                </button>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}