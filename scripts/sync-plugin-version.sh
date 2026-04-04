#!/bin/bash
# Called by semantic-release to keep .claude-plugin/plugin.json in sync
VERSION=$1
node -e "
const fs = require('fs');
const path = '.claude-plugin/plugin.json';
const pkg = JSON.parse(fs.readFileSync(path, 'utf8'));
pkg.version = process.argv[1];
fs.writeFileSync(path, JSON.stringify(pkg, null, 2) + '\n');
" "$VERSION"
