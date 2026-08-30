const fs = require('fs');
const file = 'client/src/components/Player.jsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace('onPlaying={() => setIsBuffering(false)}', 'onPlaying={() => setIsBuffering(false)}\n        onCanPlay={() => setIsBuffering(false)}');

fs.writeFileSync(file, content);
