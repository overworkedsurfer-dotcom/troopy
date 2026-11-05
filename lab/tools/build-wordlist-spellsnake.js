#!/usr/bin/env node
// Builds the dictionary embedded in games/spellsnake.html.
//
// Source: SCOWL word lists (Kevin Atkinson) as packaged by the MIT-licensed npm package
// `wordlist-english`. We take SCOWL sizes 10 + 20 (all 3-8 letter words) plus size 35 (3-7 letters only,
// to keep the list "common"), English + American spellings, lowercase a-z only, must contain a vowel,
// minus a small blocklist of slurs / crude words.
//
// usage:
//   mkdir -p /tmp/wl && cd /tmp/wl && npm pack wordlist-english && tar xzf wordlist-english-*.tgz
//   node lab/tools/build-wordlist-spellsnake.js /tmp/wl/package        # rewrites the DICT block in the game
//   node lab/tools/build-wordlist-spellsnake.js /tmp/wl/package --dry  # just print stats
'use strict';
const fs = require('fs');
const path = require('path');

const pkgDir = process.argv[2] || (() => { try { return path.dirname(require.resolve('wordlist-english/package.json')); } catch (e) { return null; } })();
const DRY = process.argv.includes('--dry');
if (!pkgDir || !fs.existsSync(path.join(pkgDir, 'english-words-10.json'))) {
  console.error('usage: node lab/tools/build-wordlist-spellsnake.js <path to unpacked wordlist-english package>');
  process.exit(2);
}

// ROT13-encoded so this file does not spell the words out. Decoded at run time.
const BLOCK_ROT13 =
  'nany nahf nefr nefrf nefrubyr nff nffrf nffubyr nffubyrf onfgneq onfgneqf ovgpu ovgpurf ovgpul ' +
  'obyybpx obyybpxf obare obbo obbof obbol ohttre ohttref pyvg pbpx pbpxf pbba pbbaf penc penccl phz ' +
  'phag phagf qnza qnzarq qnzzvg qvpx qvpxf qvyqb qvyqbf qlxr qlxrf snt sntf snttbg snttbgf sneg snegf ' +
  'sngfb shpx shpxrq shpxre shpxref shpxvat shpxf tbbx tbbxf ubzb ubzbf ubaxl ubeal ubbxre ubbxref wnc ' +
  'wncf wrexbss wvmm xvxr xvxrf xvaxl yrfob yrfobf zvys arteb artebrf avttn avttre avttref alzcub ' +
  'betnfz betl crpxre cravf cravfrf crei creireg cvff cvffrq cvffrf cbbs cbbsf cbea cbeab cevpx cevpxf ' +
  'cebfgvghgr chor chorf chffl chffvrf dhrre dhrref encr encrq encrf encvfg ergneq ergneqf fpebghz ' +
  'frzra frk frkl funt fuvg fuvgf fuvggl fxnax fyhg fyhgf fzhg fcnfgvp fcvp fcvpf fcrez fchax gvg gvgf ' +
  'gvggl gbffre gheq gheqf gjng gjngf intvan jnax jnaxre jnaxref juber juberf jbc jbcf obbovrf pevccyr ' +
  'pevccyrq tlccrq tlc tlcfl tlcfvrf wrj wrjf anmv anmvf cnxv erqfxva fdhnj genaal genaavrf jrgonpx ' +
  'puvax puvaxf qnexvr enturnq gbjryurnq qntb qntbf xenhg xenhgf yvzrl lvq lvqf ulzra vaprfg zbyrfg ' +
  'zbyrfgre crqb crqbcuvyr fbqbzl fbqbzvgr fynt fyntf ovzob ovzobf uhffl uhffvrf uneybg ';;
const rot13 = s => s.replace(/[a-z]/g, c => String.fromCharCode((c.charCodeAt(0) - 97 + 13) % 26 + 97));
const BLOCK = new Set(BLOCK_ROT13.split(/\s+/).filter(Boolean).map(rot13));

const SIZES = [[10, 8], [20, 8], [35, 7]];   // [SCOWL size, max length allowed from that size]
const VARIANTS = ['english', 'american'];
const words = new Set();
for (const [size, maxLen] of SIZES) {
  for (const v of VARIANTS) {
    const list = JSON.parse(fs.readFileSync(path.join(pkgDir, v + '-words-' + size + '.json'), 'utf8'));
    for (const w of list) {
      if (!/^[a-z]+$/.test(w) || w.length < 3 || w.length > maxLen) continue;
      if (!/[aeiouy]/.test(w)) continue;          // drops "hmm", "nth", "tsk"...
      if (BLOCK.has(w)) continue;
      words.add(w);
    }
  }
}
// Compact form: one string per length, words concatenated without separators.
const byLen = {};
for (const w of [...words].sort()) (byLen[w.length] = byLen[w.length] || []).push(w);
const compact = {};
for (const L of Object.keys(byLen)) compact[L] = byLen[L].join('').toUpperCase();
const counts = Object.fromEntries(Object.entries(byLen).map(([L, a]) => [L, a.length]));
const js = 'const DICT_SRC = ' + JSON.stringify(compact) + ';';
console.log('words:', words.size, 'by length:', JSON.stringify(counts), 'bytes:', js.length);
if (DRY) process.exit(0);

const game = path.join(__dirname, '..', '..', 'games', 'spellsnake.html');
const html = fs.readFileSync(game, 'utf8');
const A = '/*DICT:BEGIN*/', B = '/*DICT:END*/';
const i = html.indexOf(A), j = html.indexOf(B);
if (i < 0 || j < i) { console.error('markers ' + A + ' ... ' + B + ' not found in ' + game); process.exit(1); }
fs.writeFileSync(game, html.slice(0, i + A.length) + '\n' + js + '\n' + html.slice(j));
console.log('wrote dictionary into', path.relative(process.cwd(), game));
