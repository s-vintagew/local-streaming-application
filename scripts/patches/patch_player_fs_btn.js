const fs = require('fs');
const file = 'client/src/components/Player.jsx';
let content = fs.readFileSync(file, 'utf8');

const oldSettingsEnd = `                    {showQualityMenu && (
                      <div className="absolute bottom-full right-0 mb-4 bg-gray-900 rounded-lg py-2 min-w-[120px] shadow-2xl border border-gray-800">
                        {['original', 'transmux', '1080', '720', '480'].map(q => (
                          <button
                            key={q}
                            onClick={() => changeQuality(q)}
                            className={\`block w-full text-left px-4 py-2 hover:bg-gray-800 transition \${quality === q ? 'text-brand-red font-bold' : 'text-gray-200'}\`}
                          >
                            {q === 'original' ? 'Original (Seekable)' : q === 'transmux' ? 'Direct Play' : \`\${q}p\`}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>`;

const newSettingsEnd = `                    {showQualityMenu && (
                      <div className="absolute bottom-full right-0 mb-4 bg-gray-900 rounded-lg py-2 min-w-[120px] shadow-2xl border border-gray-800">
                        {['original', 'transmux', '1080', '720', '480'].map(q => (
                          <button
                            key={q}
                            onClick={() => changeQuality(q)}
                            className={\`block w-full text-left px-4 py-2 hover:bg-gray-800 transition \${quality === q ? 'text-brand-red font-bold' : 'text-gray-200'}\`}
                          >
                            {q === 'original' ? 'Original (Seekable)' : q === 'transmux' ? 'Direct Play' : \`\${q}p\`}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  <button onClick={toggleFullscreen} className="text-white hover:text-brand-red transition">
                    {isFullscreen ? <Minimize size={24} /> : <Maximize size={24} />}
                  </button>
                </div>`;

content = content.replace(oldSettingsEnd, newSettingsEnd);
fs.writeFileSync(file, content);
