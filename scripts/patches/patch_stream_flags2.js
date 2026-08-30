const fs = require('fs');
const file = 'server/routes/stream.js';
let content = fs.readFileSync(file, 'utf8');

content = content.replace("'-movflags frag_keyframe+empty_moov+default_base_moof',", "'-movflags frag_keyframe+empty_moov+default_base_moof+omit_tfhd_offset',");

fs.writeFileSync(file, content);
