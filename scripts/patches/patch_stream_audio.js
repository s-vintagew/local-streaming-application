const fs = require('fs');
const file = 'server/routes/stream.js';
let content = fs.readFileSync(file, 'utf8');

const oldTransmux = `command.videoCodec('copy').audioCodec('aac').audioChannels(2);`;
const newTransmux = `command.videoCodec('copy').audioCodec('aac').audioChannels(2).audioFrequency(44100).audioBitrate('128k');`;

const oldTranscode = `           .audioCodec('aac')
           .audioChannels(2);`;
const newTranscode = `           .audioCodec('aac')
           .audioChannels(2)
           .audioFrequency(44100)
           .audioBitrate('128k');`;

content = content.replace(oldTransmux, newTransmux).replace(oldTranscode, newTranscode);
fs.writeFileSync(file, content);
