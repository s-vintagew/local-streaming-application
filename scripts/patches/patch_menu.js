const fs = require('fs');
const file = 'client/src/components/Player.jsx';
let content = fs.readFileSync(file, 'utf8');

const oldMenu = `['original', '1080', '720', '480'].map(q => (`;
const newMenu = `['original', 'transmux', '1080', '720', '480'].map(q => (`;

const oldLabel = `{q === 'original' ? 'Original (Seekable)' : \`\${q}p\`}`;
const newLabel = `{q === 'original' ? 'Original (Seekable)' : q === 'transmux' ? 'Direct Play' : \`\${q}p\`}`;

content = content.replace(oldMenu, newMenu).replace(oldLabel, newLabel);
fs.writeFileSync(file, content);
