import React from 'react';
import { MatchSuggestions } from '../components/MatchSuggestions';

export default function DailySuggestionsPage() {
  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-black text-slate-900 mb-8">הצעות יומיות חכמות</h1>
      <MatchSuggestions />
    </div>
  );
}
