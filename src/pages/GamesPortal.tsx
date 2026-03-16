import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { dataService } from '../services/dataService';
import { GameScore, PortalSettings } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Gamepad2, Trophy, Star, ChevronLeft, 
  RotateCcw, Play, CheckCircle2, AlertCircle,
  Brain, Zap, Heart, Users, Clock
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

import ConnectionMaze from './ConnectionMaze';

type GameType = 'menu' | 'memory' | 'this_or_that' | 'maze';

export default function GamesPortal() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeGame, setActiveGame] = useState<GameType>('menu');
  const [leaderboard, setLeaderboard] = useState<GameScore[]>([]);
  const [settings, setSettings] = useState<PortalSettings | null>(null);
  const [candidateImages, setCandidateImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [scores, portalSettings, matches] = await Promise.all([
          dataService.getLeaderboard(),
          dataService.getPortalSettings(),
          dataService.getMatches()
        ]);
        setLeaderboard(scores);
        setSettings(portalSettings);
        
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

  const saveScore = async (score: number, type: 'memory' | 'this_or_that') => {
    if (!user) return;
    try {
      await dataService.saveGameScore({
        candidate_id: user.id,
        candidate_name: user.full_name,
        game_type: type,
        score
      });
      toast.success(`כל הכבוד! צברת ${score} נקודות`);
      // Refresh leaderboard
      const scores = await dataService.getLeaderboard();
      setLeaderboard(scores);
    } catch (err) {
      console.error('Error saving score:', err);
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
               activeGame === 'memory' ? 'משחק הזיכרון' : 'זה או זה'}
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
                onClick={() => setActiveGame('memory')}
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
                onClick={() => setActiveGame('this_or_that')}
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

        {activeGame === 'memory' && (
          <MemoryGame 
            images={candidateImages} 
            onComplete={(score) => {
              saveScore(score, 'memory');
              setActiveGame('menu');
            }}
          />
        )}

        {activeGame === 'this_or_that' && (
          <ThisOrThatGame 
            onComplete={(score) => {
              saveScore(score, 'this_or_that');
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
function MemoryGame({ images, onComplete }: { images: string[], onComplete: (score: number) => void }) {
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
          setTimeout(() => onComplete(score), 1000);
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
function ThisOrThatGame({ onComplete }: { onComplete: (score: number) => void }) {
  const questions = [
    { id: 1, left: 'ים', right: 'בריכה' },
    { id: 2, left: 'קיץ', right: 'חורף' },
    { id: 3, left: 'כלב', right: 'חתול' },
    { id: 4, left: 'פיצה', right: 'המבורגר' },
    { id: 5, left: 'סרט', right: 'ספר' }
  ];

  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<string[]>([]);

  const handleAnswer = (choice: string) => {
    const newAnswers = [...answers, choice];
    setAnswers(newAnswers);
    if (current < questions.length - 1) {
      setCurrent(c => c + 1);
    } else {
      onComplete(50); // Fixed score for completion
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
