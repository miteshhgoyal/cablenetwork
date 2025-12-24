const path = require('path');
const babel = require('@babel/core');

function summarizeEntry(e) {
  if (!e) return e;
  if (typeof e === 'string') return e;
  if (Array.isArray(e)) return summarizeEntry(e[0]);
  if (e && typeof e === 'object') {
    if (e.file && e.file.request) return e.file.request;
    if (e.file && e.file.resolved) return e.file.resolved;
    if (e.value && e.value && e.value.file && e.value.file.request) return e.value.file.request;
    if (e.name) return e.name;
    return Object.keys(e).slice(0,5).reduce((acc,k)=>{acc[k]=typeof e[k];return acc},{})
  }
  return String(e);
}

try {
  const filename = path.join(process.cwd(), 'app', '_layout.js');
  const cfg = babel.loadPartialConfig({ filename });
  if (!cfg) {
    console.error('No babel config resolved');
    process.exit(1);
  }
  const opts = cfg.options || {};
  const presets = (opts.presets || []).map(summarizeEntry);
  const plugins = (opts.plugins || []).map(summarizeEntry);
  console.log('Resolved Babel config:');
  console.log(JSON.stringify({ presets, plugins }, null, 2));
} catch (err) {
  console.error('Error while loading Babel config:', err && err.message);
  console.error(err && err.stack);
  process.exit(2);
}
