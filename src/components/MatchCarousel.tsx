import React, { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Match } from '../types';
import MatchCard from './MatchCard';
import { motion, AnimatePresence } from 'motion/react';

interface MatchCarouselProps {
  matches: Match[];
  onMatchClick: (match: Match) => void;
  onDelete: (id: string) => void;
  onEdit: (id: string) => void;
  onChat: (match: Match) => void;
  onSuggest: (match: Match) => void;
  rows?: number;
  cols?: number;
  minimal?: boolean;
  displaySize?: 'small' | 'medium' | 'large';
  isViewer?: boolean;
}

export const MatchCarousel: React.FC<MatchCarouselProps> = ({ 
  matches, 
  onMatchClick,
  onDelete,
  onEdit,
  onChat,
  onSuggest,
  rows: initialRows = 1,
  cols: initialCols = 3,
  minimal = false,
  displaySize = 'medium',
  isViewer
}) => {
  const [currentPage, setCurrentPage] = useState(0);
  
  // Reset page when rows or cols change
  React.useEffect(() => {
    setCurrentPage(0);
  }, [initialRows, initialCols]);

  const itemsPerPage = initialRows * initialCols;
  const totalPages = Math.ceil(matches.length / itemsPerPage);

  const displayedMatches = matches.slice(currentPage * itemsPerPage, (currentPage + 1) * itemsPerPage);

  const next = () => setCurrentPage((prev) => Math.min(prev + 1, totalPages - 1));
  const prev = () => setCurrentPage((prev) => Math.max(prev - 1, 0));

  return (
    <div className="relative group/carousel w-full">
      <AnimatePresence mode="wait">
        <motion.div 
          key={currentPage}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
          className={`grid gap-6 ${displayedMatches.length === 1 ? 'place-content-center' : ''}`} 
          style={{ gridTemplateColumns: `repeat(${initialCols}, minmax(0, 1fr))` }}
        >
          {displayedMatches.map((match) => (
            <div key={match.id} onClick={() => onMatchClick(match)} className="cursor-pointer w-full">
              <MatchCard match={match} minimal={minimal} onNext={next} onPrev={prev} isViewer={isViewer} onDelete={onDelete} onEdit={onEdit} onChat={onChat} onSuggest={onSuggest} />
            </div>
          ))}
        </motion.div>
      </AnimatePresence>

      {/* Navigation Arrows */}
      {totalPages > 1 && (
        <>
          <button 
            onClick={prev} 
            disabled={currentPage === 0}
            className="absolute -right-4 top-1/2 -translate-y-1/2 z-10 p-4 bg-white/10 backdrop-blur-md border border-white/20 rounded-full text-slate-800 hover:bg-white/30 disabled:opacity-30 transition-all shadow-xl"
          >
            <ChevronRight size={32} />
          </button>
          <button 
            onClick={next} 
            disabled={currentPage >= totalPages - 1}
            className="absolute -left-4 top-1/2 -translate-y-1/2 z-10 p-4 bg-white/10 backdrop-blur-md border border-white/20 rounded-full text-slate-800 hover:bg-white/30 disabled:opacity-30 transition-all shadow-xl"
          >
            <ChevronLeft size={32} />
          </button>
        </>
      )}
      
      {totalPages > 1 && (
        <div className="mt-6 flex justify-center gap-2">
          {Array.from({ length: totalPages }).map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentPage(i)}
              className={`w-2.5 h-2.5 rounded-full transition-all ${currentPage === i ? 'bg-luxury-blue w-8' : 'bg-slate-200 hover:bg-slate-300'}`}
            />
          ))}
        </div>
      )}
    </div>
  );
};
