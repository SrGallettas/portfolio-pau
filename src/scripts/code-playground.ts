type Language = 'html' | 'css' | 'js';
type Code = Record<Language, string>;

const example: Code = {
  html: `<main class="tarjeta">
  <span>MI EXPERIMENTO</span>
  <h1>Una idea en pantalla.</h1>
  <p>Cambia el código y mira qué pasa.</p>
  <button id="accion">Haz clic</button>
</main>`,
  css: `body {
  margin: 0;
  min-height: 100vh;
  display: grid;
  place-items: center;
  background: #eaf0e2;
  color: #22251f;
  font-family: system-ui, sans-serif;
}
.tarjeta {
  width: min(75%, 300px);
  padding: 30px;
  background: white;
  border-radius: 14px;
  box-shadow: 12px 12px 0 #d9f87a;
}
span { font-size: 10px; letter-spacing: .15em; }
h1 { font-size: 32px; line-height: 1.1; }
p { line-height: 1.5; }
button { padding: 11px 16px; border: 0; background: #294ae8; color: white; cursor: pointer; }
.activo { background: #dfe7ff; }`,
  js: `const button = document.querySelector('#accion');
button.addEventListener('click', () => {
  document.querySelector('h1').textContent = '¡Funciona!';
  button.textContent = 'Prueba otra cosa';
  document.body.classList.toggle('activo');
});`,
};

const storageKey = 'pau-code-playground-v1';
const preview = document.querySelector<HTMLIFrameElement>('#code-preview')!;
const status = document.querySelector<HTMLElement>('#code-status')!;
const fields = Object.fromEntries((['html', 'css', 'js'] as const).map(language =>
  [language, document.querySelector<HTMLTextAreaElement>(`#code-${language}`)!])) as Record<Language, HTMLTextAreaElement>;
const editors = Object.fromEntries((['html', 'css', 'js'] as const).map(language =>
  [language, document.querySelector<HTMLElement>(`[data-code-editor="${language}"]`)!])) as Record<Language, HTMLElement>;
let code: Code = { ...example };
let previous: Code | null = null;
let timer: ReturnType<typeof setTimeout> | undefined;
let hasError = false;

try {
  const saved = JSON.parse(localStorage.getItem(storageKey) || 'null');
  if (saved && (['html', 'css', 'js'] as const).every(language =>
    typeof saved[language] === 'string' && saved[language].length <= 100_000)) {
    code = { html: saved.html, css: saved.css, js: saved.js };
  }
} catch { /* Storage can be unavailable or contain invalid data. */ }

const escapeHtml = (source: string) => source.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
function tokens(source: string, pattern: RegExp, classify: (value: string) => string): string {
  let output = '', cursor = 0;
  for (const match of source.matchAll(pattern)) {
    output += escapeHtml(source.slice(cursor, match.index));
    output += `<span class="syntax-${classify(match[0])}">${escapeHtml(match[0])}</span>`;
    cursor = match.index + match[0].length;
  }
  return output + escapeHtml(source.slice(cursor));
}
function highlight(language: Language, source: string): string {
  if (language === 'html') {
    let output = '', cursor = 0;
    for (const match of source.matchAll(/<!--[\s\S]*?-->|<\/?[A-Za-z][^>]*>/g)) {
      output += escapeHtml(source.slice(cursor, match.index));
      const tag = match[0];
      if (tag.startsWith('<!--')) output += `<span class="syntax-comment">${escapeHtml(tag)}</span>`;
      else {
        const start = tag.match(/^(<\/?)([^\s/>]+)/)!;
        output += `<span class="syntax-punctuation">${escapeHtml(start[1])}</span><span class="syntax-tag">${escapeHtml(start[2])}</span>`;
        output += tokens(tag.slice(start[0].length), /[\w:-]+(?=\s*=)|"[^"]*"|'[^']*'|\/?\>/g,
          value => value.startsWith('"') || value.startsWith("'") ? 'string' : value.includes('>') ? 'punctuation' : 'attribute');
      }
      cursor = match.index + tag.length;
    }
    return output + escapeHtml(source.slice(cursor));
  }
  if (language === 'css') return tokens(source,
    /\/\*[\s\S]*?\*\/|"[^"]*"|'[^']*'|#[\da-fA-F]{3,8}\b|[\w-]+(?=\s*:)|[.#]?[A-Za-z][\w-]*(?=\s*\{)|\b\d+(?:px|rem|em|vh|vw|%)?\b/g,
    value => value.startsWith('/*') ? 'comment' : value.startsWith('"') || value.startsWith("'") ? 'string' : value.startsWith('#') || /^\d/.test(value) ? 'number' : 'property');
  return tokens(source,
    /\/\/[^\n]*|\/\*[\s\S]*?\*\/|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`|\b(?:const|let|var|function|return|if|else|new|true|false|null|async|await)\b|\b\d+\b/g,
    value => value.startsWith('//') || value.startsWith('/*') ? 'comment' : /^["'`]/.test(value) ? 'string' : /^\d/.test(value) ? 'number' : 'keyword');
}
function updateHighlight(language: Language) {
  editors[language].querySelector('code')!.innerHTML = highlight(language, fields[language].value) + '\n';
}
function syncFields() {
  (['html', 'css', 'js'] as const).forEach(language => {
    fields[language].value = code[language]; updateHighlight(language);
  });
}
function save() {
  try { localStorage.setItem(storageKey, JSON.stringify(code)); }
  catch { status.textContent = 'La vista funciona, pero no se pudo guardar.'; }
}
function documentForPreview(): string {
  // The iframe has an opaque origin, and this policy prevents network requests from user code.
  const policy = `default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data: blob:; font-src data:; media-src data: blob:; connect-src 'none'; form-action 'none'; base-uri 'none'`;
  const css = code.css.replace(/<\/style/gi, '<\\/style');
  const js = code.js.replace(/<\/script/gi, '<\\/script');
  const reportErrors = `window.addEventListener('error',e=>parent.postMessage({type:'pau-code-error',message:e.message},'*'));window.addEventListener('unhandledrejection',e=>parent.postMessage({type:'pau-code-error',message:String(e.reason)},'*'));`;
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="${policy}"><style>${css}</style><script>${reportErrors}<\/script></head><body>${code.html}<script>${js}<\/script></body></html>`;
}
function render() {
  hasError = false;
  status.textContent = 'Actualizando…';
  preview.srcdoc = documentForPreview();
}
function scheduleRender() {
  clearTimeout(timer);
  timer = setTimeout(render, 350);
}
preview.addEventListener('load', () => { if (!hasError) status.textContent = 'Vista actualizada'; });
window.addEventListener('message', event => {
  if (event.source !== preview.contentWindow || event.data?.type !== 'pau-code-error') return;
  hasError = true;
  status.textContent = `Error: ${String(event.data.message).slice(0, 90)}`;
});

(['html', 'css', 'js'] as const).forEach(language => {
  fields[language].addEventListener('input', () => {
    code[language] = fields[language].value;
    updateHighlight(language);
    previous = null;
    document.querySelector<HTMLButtonElement>('#code-reset')!.textContent = 'Restaurar ejemplo';
    save(); scheduleRender();
  });
  fields[language].addEventListener('keydown', event => {
    if (event.key === 'Tab') {
      event.preventDefault();
      const field = fields[language];
      const start = field.selectionStart;
      field.setRangeText('  ', start, field.selectionEnd, 'end');
      field.dispatchEvent(new Event('input', { bubbles: true }));
    }
    if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
      event.preventDefault(); clearTimeout(timer); render();
    }
  });
  fields[language].addEventListener('scroll', () => {
    const highlighted = editors[language].querySelector('pre')!;
    highlighted.scrollTop = fields[language].scrollTop;
    highlighted.scrollLeft = fields[language].scrollLeft;
  });
});

document.querySelectorAll<HTMLButtonElement>('[data-code-tab]').forEach(button => {
  button.addEventListener('click', () => {
    const language = button.dataset.codeTab as Language;
    document.querySelectorAll('[data-code-tab]').forEach(tab => tab.setAttribute('aria-pressed', String(tab === button)));
    (['html', 'css', 'js'] as const).forEach(name => { editors[name].hidden = name !== language; });
    fields[language].focus();
  });
});

document.querySelectorAll<HTMLButtonElement>('[data-playground-mode]').forEach(button => {
  button.addEventListener('click', () => {
    const showCode = button.dataset.playgroundMode === 'code';
    document.querySelector<HTMLElement>('#visual-playground')!.hidden = showCode;
    document.querySelector<HTMLElement>('#code-playground')!.hidden = !showCode;
    document.querySelectorAll('[data-playground-mode]').forEach(mode => mode.setAttribute('aria-pressed', String(mode === button)));
  });
});

document.querySelector<HTMLButtonElement>('#code-reset')!.addEventListener('click', event => {
  const button = event.currentTarget as HTMLButtonElement;
  if (previous) {
    code = previous; previous = null; button.textContent = 'Restaurar ejemplo';
  } else {
    previous = { ...code }; code = { ...example }; button.textContent = 'Deshacer restauración';
  }
  syncFields(); save(); render();
});

document.querySelector<HTMLButtonElement>('#code-download')!.addEventListener('click', () => {
  const source = `<!doctype html>\n<html lang="es">\n<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Mi experimento</title><style>${code.css.replace(/<\/style/gi, '<\\/style')}</style></head>\n<body>${code.html}<script>${code.js.replace(/<\/script/gi, '<\\/script')}<\/script></body>\n</html>`;
  const url = URL.createObjectURL(new Blob([source], { type: 'text/html;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url; link.download = 'mi-experimento.html'; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});

syncFields();
render();
if (new URLSearchParams(location.search).get('modo') === 'codigo') {
  document.querySelector<HTMLButtonElement>('[data-playground-mode="code"]')?.click();
  if (location.hash === '#laboratorio') requestAnimationFrame(() => document.querySelector('#laboratorio')?.scrollIntoView());
}
