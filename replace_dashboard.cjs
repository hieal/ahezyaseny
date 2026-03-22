const fs = require('fs');
const path = './src/pages/Dashboard.tsx';
let content = fs.readFileSync(path, 'utf8');
content = content.replace(/\{u\.full_name \|\| u\.name\}/g, '{u.full_name}');
fs.writeFileSync(path, content, 'utf8');
console.log('Done');
