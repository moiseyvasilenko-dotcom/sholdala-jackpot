const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');

test('the game screen does not disclose managed jackpot timing', () => {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  assert.doesNotMatch(html, /odds-note|Джекпот с 3-й|не позже 10-й/i);
});

test('the three reels stop with clearly increasing dramatic gaps', () => {
  const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
  assert.match(app, /const REEL_DURATIONS = Object\.freeze\(\[2700, 4000, 5400\]\)/);
  assert.match(app, /REEL_DURATIONS\.map\(\(duration, index\) =>/);
});
