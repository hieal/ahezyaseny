const fs = require('fs');
const path = './src/pages/CandidateDashboard.tsx';
let content = fs.readFileSync(path, 'utf8');
content = content.replace(/myMatch\?\.name/g, 'myMatch?.full_name');
content = content.replace(/log\.match\?\.name/g, 'log.match?.full_name');
fs.writeFileSync(path, content, 'utf8');
console.log('Done');
