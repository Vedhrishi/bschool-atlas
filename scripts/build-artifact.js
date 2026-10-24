// Builds dist/mba-worth-it.html: a single self-contained page (no doctype/html/head/body tags)
// for hosting as a Claude Artifact. Inlines the stylesheet and every local script.
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');

const html = read('index.html');
const head = html.slice(html.indexOf('<head>') + 6, html.indexOf('</head>'));
let body = html.slice(html.indexOf('<body>') + 6, html.indexOf('</body>'));

const title = head.match(/<title>[\s\S]*?<\/title>/)[0];
const metas = (head.match(/<meta name="(claude:viewport-fit-sides|description)"[^>]*>/g) || []).join('\n');
const fonts = (head.match(/<link rel="(preconnect|stylesheet)" href="https:\/\/fonts[^>]*>/g) || []).join('\n');
const css = read('style.css');

body = body.replace(/<script src="([^"]+)"><\/script>/g, (_, src) => {
  const js = read(src);
  if (js.includes('</script')) throw new Error(src + ' contains </script');
  return '<script>\n' + js + '\n</script>';
});

const out = [title, metas, fonts, '<style>\n' + css + '\n</style>', body.trim()].join('\n');
fs.mkdirSync(path.join(root, 'dist'), { recursive: true });
fs.writeFileSync(path.join(root, 'dist', 'mba-worth-it.html'), out);
console.log('wrote dist/mba-worth-it.html', (out.length / 1024).toFixed(0) + ' KB');
