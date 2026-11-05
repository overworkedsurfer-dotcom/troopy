#!/usr/bin/env node
// Assemble REPORT.md = lab/report.template.md with generated tables (lab/reporttables.js) inserted.
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const tpl = fs.readFileSync(path.join(__dirname, 'report.template.md'), 'utf8');
const tables = execFileSync('node', [path.join(__dirname, 'reporttables.js')], { encoding: 'utf8' });
fs.writeFileSync(path.join(__dirname, '..', 'REPORT.md'), tpl.replace('<!--TABLES-->', '## The numbers\n\n' + tables));
console.log('wrote REPORT.md');
