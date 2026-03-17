import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { dataService } from '../services/dataService';
import { supabase } from '../services/supabase';
import { GameScore, PortalSettings } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Gamepad2, Trophy, Star, ChevronLeft, 
  RotateCcw, Play, CheckCircle2, AlertCircle,
  Brain, Zap, Heart, Users, Clock, Send
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useNavigate, useLocation } from 'react-router-dom';
import { Match } from '../types';

import ConnectionMaze from './ConnectionMaze';
import { StrategicRPS } from '../components/StrategicRPS';

type GameType = 'menu' | 'memory' | 'this_or_that' | 'maze' | 'strategic_rps';

export default function GamesPortal() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [matches, setMatches] = useState<Match[]>([]);
  const [activeGame, setActiveGame] = useState<GameType>('menu');
  const [leaderboard, setLeaderboard] = useState<GameScore[]>([]);
  const [settings, setSettings] = useState<PortalSettings | null>(null);
  const [candidateImages, setCandidateImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [onlineStats, setOnlineStats] = useState({ males: 0, females: 0 });
  
  useEffect(() => {
    if (!user) return;
    const channel = supabase.channel('online-players');
    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        let males = 0;
        let females = 0;
        Object.values(state).forEach((presence: any) => {
          presence.forEach((p: any) => {
            if (p.gender === 'male') males++;
            if (p.gender === 'female') females++;
          });
        });
        setOnlineStats({ males, females });
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ user_id: user.id, gender: user.gender });
        }
      });
    return () => {
      channel.unsubscribe();
    };
  }, [user]);

  const [rpsLobbyStep, setRpsLobbyStep] = useState<'intro' | 'searching'>('intro');
  const [isSearching, setIsSearching] = useState(false);
  const [activeRpsMatch, setActiveRpsMatch] = useState<{
    id: string;
    opponentId: string;
    opponentName: string;
  } | null>(null);

  useEffect(() => {
    if (location.state?.initialGame) {
      setActiveGame(location.state.initialGame);
    }
  }, [location.state]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [scores, portalSettings, matches, stats] = await Promise.all([
          dataService.getLeaderboard(),
          dataService.getPortalSettings(),
          dataService.getMatches(),
          dataService.getOnlineStats()
        ]);
        setLeaderboard(scores);
        setSettings(portalSettings);
        setMatches(matches);
        setOnlineStats(stats);
        
        // Extract candidate images
        const images = matches
          .map(m => m.image_url)
          .filter((url): url is string => !!url)
          .slice(0, 8); // Take top 8 for a 4x4 grid
        
        setCandidateImages(images.length >= 4 ? images : JSON.parse(portalSettings?.memory_game_images || '[]'));
      } catch (err) {
        console.error('Error fetching games data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('matchmaking_updates_portal')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'game_sessions'
        },
        (payload) => {
          const session = payload.new;
          if (session.player2_id === user.id && session.game_type === 'Strategic RPS') {
            setActiveRpsMatch({
              id: session.id,
              opponentId: session.player1_id,
              opponentName: session.player1_name
            });
            setIsSearching(false);
            toast.success(`נמצא יריב: ${session.player1_name}!`);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const handleFindPlayer = async () => {
    if (!user) return;
    setIsSearching(true);
    
    // Safety Timeout: 10 seconds
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('TIMEOUT')), 10000)
    );

    try {
      // 1. Look for someone already searching
      const query = supabase
        .from('profiles')
        .select('id, full_name, gender')
        .eq('status', 'searching_for_opponent')
        .neq('id', user.id);

      // Admin bypass: Admins can match with anyone.
      // Non-admins must match with opposite gender.
      if (user.role !== 'admin') {
        query.eq('gender', user.gender === 'male' ? 'female' : 'male');
      }

      const { data: opponents, error: searchError } = await Promise.race([
        query.limit(1),
        timeoutPromise
      ]) as any;

      if (searchError) throw searchError;

      if (opponents && opponents.length > 0) {
        const opponent = opponents[0];
        // 2. Create session
        const { data: session, error: sessionError } = await supabase
          .from('game_sessions')
          .insert({
            game_type: 'Strategic RPS',
            player1_id: opponent.id,
            player1_name: opponent.full_name || 'שחקן',
            player2_id: user.id,
            player2_name: user.full_name || 'שחקן',
          })
          .select()
          .single();

        if (sessionError) throw sessionError;

        // 3. Update both statuses
        await Promise.all([
          supabase.from('profiles').update({ status: 'playing' }).eq('id', user.id),
          supabase.from('profiles').update({ status: 'playing' }).eq('id', opponent.id)
        ]);

        setActiveRpsMatch({
          id: session.id,
          opponentId: opponent.id,
          opponentName: opponent.full_name || 'שחקן'
        });
        setIsSearching(false);
        toast.success(`נמצא יריב: ${opponent.full_name}!`);
      } else {
        // 4. No opponent found, set status to searching
        const { error } = await supabase
          .from('profiles')
          .update({ status: 'searching_for_opponent' })
          .eq('id', user.id);
        
        if (error) throw error;
        toast.success("מחפש שחקן... המתן ליריב");
      }
    } catch (err: any) {
      console.error("Error starting matchmaking:", err);
      if (err.message === 'TIMEOUT') {
        toast.error("לא נמצא יריב בזמן המוקצב. האם תרצה לשחק נגד בוט?");
        // Here you would implement the bot match logic
      } else {
        toast.error("שגיאה בחיפוש שחקן");
      }
      setIsSearching(false);
    }
  };

  const saveScore = async (score: number, type: 'memory' | 'this_or_that' | 'strategic_rps', durationSeconds: number = 0) => {
    if (!user) return;
    try {
      await dataService.saveGameScore({
        candidate_id: user.id,
        candidate_name: user.full_name,
        game_type: type,
        score
      });
      
      await dataService.logGame({
        player1_id: user.id,
        player1_name: user.full_name,
        player2_id: 'system',
        player2_name: 'System',
        game_type: type === 'memory' ? 'Memory' : 'This or That',
        winner_id: user.id,
        duration_seconds: durationSeconds
      });

      const globalChannel = supabase.channel('global_game_events');
      globalChannel.subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          globalChannel.send({
            type: 'broadcast',
            event: 'game_end',
            payload: { gameId: `${type}_${user.id}` }
          });
          supabase.removeChannel(globalChannel);
        }
      });

      toast.success(`כל הכבוד! צברת ${score} נקודות`);
      // Refresh leaderboard
      const scores = await dataService.getLeaderboard();
      setLeaderboard(scores);
    } catch (err) {
      console.error('Error saving score:', err);
    }
  };

  const handleStartGame = (game: 'memory' | 'this_or_that') => {
    setActiveGame(game);
    if (user) {
      const globalChannel = supabase.channel('global_game_events');
      globalChannel.subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          globalChannel.send({
            type: 'broadcast',
            event: 'game_start',
            payload: {
              gameId: `${game}_${user.id}`,
              player1Name: user.full_name,
              player2Name: 'System',
              gameType: game === 'memory' ? 'Memory' : 'This or That'
            }
          });
          supabase.removeChannel(globalChannel);
        }
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 px-4 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => activeGame === 'menu' ? navigate('/portal') : setActiveGame('menu')}
              className="p-2 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <ChevronLeft size={24} />
            </button>
            <h1 className="font-black text-slate-900 text-xl">
              {activeGame === 'menu' ? 'אזור המשחקים' : 
               activeGame === 'memory' ? 'משחק הזיכרון' : 
               activeGame === 'strategic_rps' ? 'מרוץ ללב' : 'זה או זה'}
            </h1>
          </div>
          <div className="flex items-center gap-2 bg-emerald-50 px-3 py-1.5 rounded-xl">
            <Star className="text-emerald-500" size={16} fill="currentColor" />
            <span className="font-black text-emerald-600 text-sm">
              {leaderboard.find(s => s.candidate_id === user?.id)?.score || 0}
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4">
        {activeGame === 'menu' && (
          <div className="space-y-8">
            {/* Game Selection */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <button 
                onClick={() => setActiveGame('strategic_rps')}
                className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 text-right space-y-4 hover:shadow-xl hover:shadow-slate-200 transition-all group relative overflow-hidden"
              >
                <div className="absolute top-4 left-4 bg-pink-500 text-white text-[10px] font-black px-2 py-1 rounded-full animate-bounce z-10">
                  חדש!
                </div>
                <div className="w-16 h-16 rounded-2xl bg-pink-50 text-pink-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Heart size={32} />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-slate-900">מרוץ ללב (אסטרטגיה)</h3>
                  <p className="text-slate-500 font-medium">דו-קרב אסטרטגי של אבן נייר ומספריים. מצא את הלב של היריב!</p>
                </div>
                <div className="flex items-center gap-2 text-pink-600 font-bold">
                  <span>שחק עכשיו</span>
                  <ChevronLeft size={18} />
                </div>
              </button>

              <button 
                onClick={() => handleStartGame('memory')}
                className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 text-right space-y-4 hover:shadow-xl hover:shadow-slate-200 transition-all group"
              >
                <div className="w-16 h-16 rounded-2xl bg-purple-50 text-purple-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Brain size={32} />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-slate-900">משחק הזיכרון</h3>
                  <p className="text-slate-500 font-medium">מצא את כל הזוגות בזמן הקצר ביותר וצבור נקודות.</p>
                </div>
                <div className="flex items-center gap-2 text-purple-600 font-bold">
                  <span>שחק עכשיו</span>
                  <ChevronLeft size={18} />
                </div>
              </button>

              <button 
                onClick={() => handleStartGame('this_or_that')}
                className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 text-right space-y-4 hover:shadow-xl hover:shadow-slate-200 transition-all group"
              >
                <div className="w-16 h-16 rounded-2xl bg-orange-50 text-orange-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Zap size={32} />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-slate-900">זה או זה?</h3>
                  <p className="text-slate-500 font-medium">ענה על שאלות והשווה את התשובות שלך לאחרים.</p>
                </div>
                <div className="flex items-center gap-2 text-orange-600 font-bold">
                  <span>שחק עכשיו</span>
                  <ChevronLeft size={18} />
                </div>
              </button>

              <button 
                onClick={() => setActiveGame('maze')}
                className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 text-right space-y-4 hover:shadow-xl hover:shadow-slate-200 transition-all group"
              >
                <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Gamepad2 size={32} />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-slate-900">מבוך שיתוף פעולה</h3>
                  <p className="text-slate-500 font-medium">עבדו יחד כדי לצאת מהמבוך ולצבור נקודות.</p>
                </div>
                <div className="flex items-center gap-2 text-blue-600 font-bold">
                  <span>שחק עכשיו</span>
                  <ChevronLeft size={18} />
                </div>
              </button>
            </div>

            {/* Leaderboard */}
            <section className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-yellow-50 text-yellow-500 flex items-center justify-center">
                  <Trophy size={28} />
                </div>
                <h2 className="text-2xl font-black text-slate-900">טבלת המובילים</h2>
              </div>

              <div className="space-y-4">
                {leaderboard.map((score, index) => (
                  <div 
                    key={score.id} 
                    className={`flex items-center justify-between p-4 rounded-2xl transition-all ${
                      score.candidate_id === user?.id ? 'bg-emerald-50 border border-emerald-100' : 'bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-lg ${
                        index === 0 ? 'bg-yellow-100 text-yellow-600' :
                        index === 1 ? 'bg-slate-200 text-slate-600' :
                        index === 2 ? 'bg-orange-100 text-orange-600' :
                        'bg-white text-slate-400'
                      }`}>
                        {index + 1}
                      </div>
                      <div>
                        <span className="font-bold text-slate-900 block">{score.candidate_name}</span>
                        <span className="text-xs text-slate-400 font-medium">
                          {score.game_type === 'memory' ? 'משחק הזיכרון' : 'זה או זה'}
                        </span>
                      </div>
                    </div>
                    <div className="text-left">
                      <span className="font-black text-emerald-600 text-xl">{score.score}</span>
                      <span className="text-xs text-emerald-400 font-bold mr-1">נק׳</span>
                    </div>
                  </div>
                ))}
                {leaderboard.length === 0 && (
                  <div className="text-center py-12 space-y-3">
                    <Gamepad2 size={48} className="mx-auto text-slate-200" />
                    <p className="text-slate-400 font-bold">עדיין אין ניקוד. היה הראשון לשחק!</p>
                  </div>
                )}
              </div>
            </section>
          </div>
        )}

        {activeGame === 'strategic_rps' && !activeRpsMatch && (
          <div className="max-w-2xl mx-auto py-12">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white p-12 rounded-[3rem] shadow-xl border border-slate-100 text-center space-y-8"
            >
              <div className="w-24 h-24 bg-pink-50 text-pink-500 rounded-3xl flex items-center justify-center mx-auto shadow-inner">
                <Heart size={48} fill="currentColor" />
              </div>
              
              <div className="space-y-4">
                <h2 className="text-4xl font-black text-slate-900">מרוץ ללב</h2>
                <p className="text-xl text-slate-500 font-medium leading-relaxed">
                  ברוכים הבאים למשחק האסטרטגיה הגדול! 
                  במשחק זה תצטרכו להשתמש בחוכמה ובטקטיקה כדי למצוא את הלב של היריב תוך הגנה על הלב שלכם.
                </p>
              </div>

              {rpsLobbyStep === 'intro' ? (
                <button
                  onClick={() => setRpsLobbyStep('searching')}
                  className="w-full py-6 bg-emerald-500 text-white rounded-[2rem] text-2xl font-black hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-100 flex items-center justify-center gap-3"
                >
                  <Play size={28} fill="currentColor" />
                  התחל משחק
                </button>
              ) : (
                <div className="space-y-6">
                  <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                    <div className="flex items-center justify-center gap-2 text-slate-600 font-bold mb-2">
                      <Users size={20} />
                      <span>שחקנים מחוברים מהמין השני:</span>
                    </div>
                    <div className="text-4xl font-black text-emerald-600">
                      {user?.gender === 'male' ? onlineStats.females : onlineStats.males}
                    </div>
                  </div>

                  <button
                    onClick={handleFindPlayer}
                    disabled={isSearching}
                    className="w-full py-6 bg-pink-500 text-white rounded-[2rem] text-2xl font-black hover:bg-pink-600 transition-all shadow-lg shadow-pink-100 flex items-center justify-center gap-3 disabled:opacity-50"
                  >
                    {isSearching ? (
                      <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Users size={28} />
                    )}
                    {isSearching ? 'מחפש שחקן...' : 'חפש שחקן'}
                  </button>
                  
                  <button
                    onClick={() => toast('פונקציה זו תתווסף בקרוב', { icon: 'ℹ️' })}
                    className="w-full py-4 bg-blue-500 text-white rounded-[2rem] text-xl font-bold hover:bg-blue-600 transition-all shadow-lg flex items-center justify-center gap-2"
                  >
                    <Send size={20} />
                    הזמן שותף ספציפי
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}

        {activeGame === 'strategic_rps' && activeRpsMatch && user && (
          <div className="fixed inset-0 z-[100] bg-white">
            <StrategicRPS
              gameId={activeRpsMatch.id}
              myId={user.id}
              myName={user.full_name}
              opponentId={activeRpsMatch.opponentId}
              opponentName={activeRpsMatch.opponentName}
              onClose={() => {
                setActiveRpsMatch(null);
                setActiveGame('menu');
                setRpsLobbyStep('intro');
              }}
            />
          </div>
        )}
        {activeGame === 'memory' && (
          <MemoryGame 
            images={candidateImages} 
            onComplete={(score, duration) => {
              saveScore(score, 'memory', duration);
              setActiveGame('menu');
            }}
          />
        )}

        {activeGame === 'this_or_that' && (
          <ThisOrThatGame 
            onComplete={(score, duration) => {
              saveScore(score, 'this_or_that', duration);
              setActiveGame('menu');
            }}
          />
        )}

        {activeGame === 'maze' && (
          <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
            <ConnectionMaze />
          </div>
        )}
      </main>
    </div>
  );
}

// --- Memory Game Component ---
function MemoryGame({ images, onComplete }: { images: string[], onComplete: (score: number, duration: number) => void }) {
  const [cards, setCards] = useState<{ id: number, url: string, flipped: boolean, matched: boolean }[]>([]);
  const [flipped, setFlipped] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [startTime] = useState(Date.now());

  useEffect(() => {
    const gameCards = [...images, ...images]
      .sort(() => Math.random() - 0.5)
      .map((url, index) => ({ id: index, url, flipped: false, matched: false }));
    setCards(gameCards);
  }, [images]);

  const handleFlip = (id: number) => {
    if (flipped.length === 2 || cards[id].flipped || cards[id].matched) return;

    const newCards = [...cards];
    newCards[id].flipped = true;
    setCards(newCards);

    const newFlipped = [...flipped, id];
    setFlipped(newFlipped);

    if (newFlipped.length === 2) {
      setMoves(m => m + 1);
      const [first, second] = newFlipped;
      if (cards[first].url === cards[second].url) {
        newCards[first].matched = true;
        newCards[second].matched = true;
        setCards(newCards);
        setFlipped([]);
        
        if (newCards.every(c => c.matched)) {
          const duration = Math.floor((Date.now() - startTime) / 1000);
          const score = Math.max(10, 100 - moves - Math.floor(duration / 2));
          setTimeout(() => onComplete(score, duration), 1000);
        }
      } else {
        setTimeout(() => {
          newCards[first].flipped = false;
          newCards[second].flipped = false;
          setCards(newCards);
          setFlipped([]);
        }, 1000);
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
        <div className="flex items-center gap-2 text-slate-500 font-bold">
          <RotateCcw size={18} />
          מהלכים: {moves}
        </div>
        <div className="flex items-center gap-2 text-emerald-500 font-bold">
          <Clock size={18} />
          זמן: {Math.floor((Date.now() - startTime) / 1000)} ש׳
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3">
        {cards.map(card => (
          <button
            key={card.id}
            onClick={() => handleFlip(card.id)}
            className={`aspect-square rounded-2xl transition-all duration-500 preserve-3d relative ${
              card.flipped || card.matched ? 'rotate-y-180' : ''
            }`}
          >
            <div className="absolute inset-0 bg-white border-2 border-slate-100 rounded-2xl flex items-center justify-center backface-hidden">
              <Heart className="text-slate-200" size={32} />
            </div>
            <div className="absolute inset-0 bg-emerald-500 rounded-2xl overflow-hidden rotate-y-180 backface-hidden">
              <img src={card.url} className="w-full h-full object-cover" alt="card" referrerPolicy="no-referrer" />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

// --- This Or That Game Component ---
function ThisOrThatGame({ onComplete }: { onComplete: (score: number, duration: number) => void }) {
  const questions = [
    { id: 1, left: 'ים', right: 'בריכה' },
    { id: 2, left: 'קיץ', right: 'חורף' },
    { id: 3, left: 'כלב', right: 'חתול' },
    { id: 4, left: 'פיצה', right: 'המבורגר' },
    { id: 5, left: 'סרט', right: 'ספר' }
  ];

  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<string[]>([]);
  const [startTime] = useState(Date.now());

  const handleAnswer = (choice: string) => {
    const newAnswers = [...answers, choice];
    setAnswers(newAnswers);
    if (current < questions.length - 1) {
      setCurrent(c => c + 1);
    } else {
      const duration = Math.floor((Date.now() - startTime) / 1000);
      onComplete(50, duration); // Fixed score for completion
    }
  };

  return (
    <div className="space-y-8 py-12">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-black text-slate-900">מה אתה מעדיף?</h2>
        <p className="text-slate-500 font-medium">שאלה {current + 1} מתוך {questions.length}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 bg-white rounded-full shadow-lg border border-slate-100 flex items-center justify-center z-10 font-black text-slate-400">
          או
        </div>

        <button
          onClick={() => handleAnswer(questions[current].left)}
          className="bg-white p-12 rounded-[3rem] shadow-sm border border-slate-100 text-3xl font-black text-slate-800 hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-600 transition-all"
        >
          {questions[current].left}
        </button>

        <button
          onClick={() => handleAnswer(questions[current].right)}
          className="bg-white p-12 rounded-[3rem] shadow-sm border border-slate-100 text-3xl font-black text-slate-800 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-600 transition-all"
        >
          {questions[current].right}
        </button>
      </div>

      <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
        <motion.div 
          className="bg-emerald-500 h-full"
          initial={{ width: 0 }}
          animate={{ width: `${((current + 1) / questions.length) * 100}%` }}
        />
      </div>
    </div>
  );
}
