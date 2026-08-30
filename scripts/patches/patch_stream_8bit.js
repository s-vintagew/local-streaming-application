const fs = require('fs');
const file = 'server/routes/stream.js';
let content = fs.readFileSync(file, 'utf8');

const oldTranscode = `command.outputOptions(['-preset ultrafast', '-g 30'])
           .videoFilter(\`scale=-2:\${resValue}\`)
           .videoCodec('libx264')
           .audioCodec('aac')
           .audioChannels(2)
           .audioFrequency(44100)
           .audioBitrate('128k');`;

const newTranscode = `command.outputOptions(['-preset ultrafast', '-g 30', '-pix_fmt yuv420p'])
           .videoFilter(\`scale=-2:\${resValue}\`)
           .videoCodec('libx264')
           .audioCodec('aac')
           .audioChannels(2)
           .audioFrequency(44100)
           .audioBitrate('128k');`;

content = content.replace(oldTranscode, newTranscode);
fs.writeFileSync(file, content);
