#!/usr/bin/env node
// Assemble REPORT.md = lab/report.template.md with generated tables (lab/reporttables.js) inserted.
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const tpl = fs.readFileSync(path.join(__dirname, 'report.template.md'), 'utf8');
const tables = execFileSync('node', [path.join(__dirname, 'reporttables.js')], { encoding: 'utf8' });
const parts = tables.split('\n### New bot tiers: the masher and the human model\n');
let out = tpl.replace('<!--TABLES-->', '## The numbers\n\n' + parts[0]);
out = out.replace('<!--TIERS-->', parts[1] ? parts[1].replace(/^\n/, '') : '');
const ember = path.join(__dirname, 'notes', 'emberdeep.md');
out = out.replace('<!--EMBER-->', fs.existsSync(ember) ? fs.readFileSync(ember, 'utf8').trim() : '_In progress._');
fs.writeFileSync(path.join(__dirname, '..', 'REPORT.md'), out);
console.log('wrote REPORT.md');
