#!/usr/bin/env node
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const require = createRequire(new URL('../backstage-portal/package.json', import.meta.url));
const express = require('express');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const app = express();
const dist = path.join(root, 'backstage-portal/packages/app/dist');
app.use(express.static(dist));
app.get('*', (_request, response) => response.sendFile(path.join(dist, 'index.html')));
app.listen(Number(process.env.PORT || 3000), '127.0.0.1', () => console.log('Design review: http://localhost:3000 (local only). Access code: demo1234'));
