const fs = require('fs');
const path = require('path');

function walk(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    if (isDirectory) {
      if (f !== 'node_modules' && f !== '.git') {
        walk(dirPath, callback);
      }
    } else {
      if (f.endsWith('.ts') || f.endsWith('.tsx')) {
        callback(dirPath);
      }
    }
  });
}

walk('./src', (filePath) => {
  let content = fs.readFileSync(filePath, 'utf8');
  let original = content;
  
  // Replace match.name with match.full_name
  content = content.replace(/\bmatch\.name\b/g, 'match.full_name');
  content = content.replace(/\bm\.name\b/g, 'm.full_name');
  content = content.replace(/\bc\.name\b/g, 'c.full_name');
  content = content.replace(/\bformData\.name\b/g, 'formData.full_name');
  content = content.replace(/\bmyMatch\.name\b/g, 'myMatch.full_name');
  content = content.replace(/\bmatchToDelete\.name\b/g, 'matchToDelete.full_name');
  content = content.replace(/\bpendingMatchToPublish\.name\b/g, 'pendingMatchToPublish.full_name');
  content = content.replace(/\bhistoryMatch\.name\b/g, 'historyMatch.full_name');
  content = content.replace(/\bnotesMatch\.name\b/g, 'notesMatch.full_name');
  content = content.replace(/\bselectedMatch\.name\b/g, 'selectedMatch.full_name');
  content = content.replace(/\bvalidationMatch\.name\b/g, 'validationMatch.full_name');
  content = content.replace(/\bduplicateData\.newMatch\.name\b/g, 'duplicateData.newMatch.full_name');
  content = content.replace(/\bcurrentMatch\.name\b/g, 'currentMatch.full_name');
  content = content.replace(/\bdailySuggestion\.name\b/g, 'dailySuggestion.full_name');
  content = content.replace(/\bwinner\.name\b/g, 'winner.full_name');
  content = content.replace(/\botherPlayer\?\.name\b/g, 'otherPlayer?.full_name');
  content = content.replace(/\bprev\[0\]\.name\b/g, 'prev[0].full_name');
  content = content.replace(/\bpayload\.name\b/g, 'payload.full_name');
  content = content.replace(/\bexistingMatch\.name\b/g, 'existingMatch.full_name');
  content = content.replace(/\bnewMatchData\.name\b/g, 'newMatchData.full_name');
  content = content.replace(/\bpm\.name\b/g, 'pm.full_name');
  content = content.replace(/\bmData\.name\b/g, 'mData.full_name');
  content = content.replace(/\bitem\.name\b/g, 'item.full_name');
  
  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Updated', filePath);
  }
});
