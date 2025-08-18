// statham/scripts/page-logic.js
// Extracted from index.html

// Инициализация цитаты: использует quoteId из URL или выбирает случайную
window._stathamQuotes = null;

async function initQuote() {
    try {
    const baseRel = window.STATHAM_BASE_REL || '';
    const response = await fetch(baseRel + 'data.json');
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        const quotes = data.quotes || [];
        // cache for later
        window._stathamQuotes = { quotes, author: data.author };

        // Попробуем прочитать quoteId из query
        const params = new URLSearchParams(window.location.search);
        const qidParam = params.get('quoteId');
        let selectedQuote = null;

        if (qidParam) {
            const id = parseInt(qidParam, 10);
            if (!Number.isNaN(id)) {
                selectedQuote = quotes.find(q => Number(q.id) === id) || null;
            }
        }

        // Если цитата не найдена по id, выбираем случайную
        if (!selectedQuote) {
            if (quotes.length === 0) throw new Error('No quotes available');
            if (window.INIT_QUOTE_ID) {
                selectedQuote = quotes.find(q => Number(q.id) === Number(window.INIT_QUOTE_ID)) || quotes[0];
            } else {
                selectedQuote = quotes[Math.floor(Math.random() * quotes.length)];
            }
        }

        // Если включен режим пермалинков и мы не на странице нужной цитаты — перенаправляем
        if (window.STATHAM_PERMALINK_MODE && selectedQuote && selectedQuote.id != null) {
            const baseRoot = resolveBaseRoot();
            const target = baseRoot + 'quotes/' + selectedQuote.id + '/';
            try {
                const current = window.location.href.replace(/index\.html$/i, '');
                if (current !== target) {
                    window.location.replace(target);
                    return; // Остановить дальнейший рендер, страница сменится
                }
            } catch (e) {
                window.location.href = target;
                return;
            }
        }

        // В режиме пермалинков не добавляем quoteId в URL
        if (!window.STATHAM_PERMALINK_MODE) {
            try {
                const newUrl = new URL(window.location.href);
                newUrl.pathname = newUrl.pathname.replace(/index\.html$/i, '');
                newUrl.searchParams.set('quoteId', selectedQuote.id);
                if (!newUrl.pathname.endsWith('/')) newUrl.pathname += '/';
                history.replaceState(null, '', newUrl.toString());
            } catch (e) {}
        }

        displayQuote(selectedQuote, data.author);
    } catch (error) {
        console.error('Не удалось загрузить цитаты:', error);
        document.getElementById('quote-display').textContent = 'Не удалось загрузить цитату. Попробуйте обновить страницу.';
    }
}

function resolveBaseRoot() {
    if (window.STATHAM_BASE_ROOT) return window.STATHAM_BASE_ROOT;
    try {
        const origin = window.location.origin || '';
        const m = (window.location.pathname || '').match(/^(.*\/statham)\//);
        const basePath = m ? m[1] + '/' : '/statham/';
        return origin + basePath;
    } catch (e) {
        return '/statham/';
    }
}

function loadRandomQuote() {
    const cache = window._stathamQuotes;
    if (!cache || !Array.isArray(cache.quotes) || cache.quotes.length === 0) return;
    const quotes = cache.quotes;
    let idx = Math.floor(Math.random() * quotes.length);
    if (quotes.length > 1 && window.currentQuoteId) {
        let attempts = 0;
        while (quotes[idx].id === window.currentQuoteId && attempts < 6) {
            idx = Math.floor(Math.random() * quotes.length);
            attempts++;
        }
    }
    const q = quotes[idx];
    // В режиме пермалинков перенаправляем на /statham/quotes/{id}/
    if (window.STATHAM_PERMALINK_MODE) {
        const baseRoot = resolveBaseRoot();
        window.location.href = baseRoot + 'quotes/' + q.id + '/';
        return;
    }
    // Иначе поведение по-старому: обновляем в истории и рендерим
    try {
        const newUrl = new URL(window.location.href);
        newUrl.pathname = newUrl.pathname.replace(/index\.html$/i, '');
        newUrl.searchParams.set('quoteId', q.id);
        if (!newUrl.pathname.endsWith('/')) newUrl.pathname += '/';
        history.pushState({ quoteId: q.id }, '', newUrl.toString());
    } catch (e) {}
    displayQuote(q, cache.author);
}

function displayQuote(quoteObj, author) {
    const text = quoteObj && quoteObj.text ? quoteObj.text : '';
    document.getElementById('quote-display').textContent = `"${text}"`;
    document.getElementById('author-display').textContent = `— ${author || ''}`;
    window.currentQuote = text;
    window.currentAuthor = author;
    window.currentQuoteId = quoteObj && (quoteObj.id || quoteObj.ID || quoteObj.Id) ? quoteObj.id : null;
    const descText = `"${text}" — ${author || ''}`;
    const ogDesc = document.querySelector('meta[property="og:description"]');
    const twDesc = document.querySelector('meta[name="twitter:description"]');
    if (ogDesc) ogDesc.setAttribute('content', descText);
    if (twDesc) twDesc.setAttribute('content', descText);
    const origin = window.location.origin;
    if (origin && origin.startsWith('http')) {
        const ogUrl = document.querySelector('meta[property="og:url"]');
        const ogImg = document.querySelector('meta[property="og:image"]');
        const twImg = document.querySelector('meta[name="twitter:image"]');
        if (ogUrl) ogUrl.setAttribute('content', window.location.href);
        const base = window.location.origin + window.location.pathname.replace(/[^/]*$/, '');
        const absImg = (base.endsWith('/') ? base : base + '/') + 'og.jpg';
        if (ogImg) ogImg.setAttribute('content', absImg);
        if (twImg) twImg.setAttribute('content', absImg);
    }
}

window.onload = initQuote;
document.addEventListener('DOMContentLoaded', function () {
    const btn = document.getElementById('new-quote-btn');
    if (btn) btn.addEventListener('click', loadRandomQuote);
    // Feature-detect Web Share on mobile: show Share, hide Copy; on desktop keep Copy
    try {
        const shareBtn = document.getElementById('share-btn');
        const copyBtn = document.getElementById('copy-link-btn');
        const ua = navigator.userAgent || '';
        const isMobile = /Mobile|Android|iPhone|iPad|iPod|Mobi/.test(ua);
        const canShare = typeof navigator.share === 'function';
        if (shareBtn) {
            if (canShare && isMobile) {
                shareBtn.style.display = '';
                shareBtn.addEventListener('click', shareQuote);
                if (copyBtn) copyBtn.style.display = 'none';
            } else {
                shareBtn.style.display = 'none';
                if (copyBtn) copyBtn.style.display = '';
            }
        }
    } catch (e) { /* no-op */ }
});

(function preventTouchZoom() {
    window.addEventListener('gesturestart', function (e) {
        e.preventDefault();
    }, { passive: false });
    let lastTouch = 0;
    window.addEventListener('touchend', function (e) {
        const now = Date.now();
        if (now - lastTouch <= 300) {
            e.preventDefault();
        }
        lastTouch = now;
    }, { passive: false });
})();

function getShareText() {
    const q = window.currentQuote || (document.getElementById('quote-display').textContent || '').replace(/^"|"$/g, '');
    const a = window.currentAuthor || (document.getElementById('author-display').textContent || '').replace(/^—\s*/, '');
    return `"${q}" — ${a}`;
}

async function shareQuote() {
    const text = getShareText();
    let url;
    if (window.STATHAM_PERMALINK_MODE && window.currentQuoteId) {
        url = resolveBaseRoot() + 'quotes/' + window.currentQuoteId + '/';
    } else {
        try {
            const u = new URL(window.location.href);
            if (window.currentQuoteId) u.searchParams.set('quoteId', window.currentQuoteId);
            url = u.toString();
        } catch (e) {
            url = window.location.href.split('?')[0] + (window.currentQuoteId ? `?quoteId=${window.currentQuoteId}` : '');
        }
    }
    try {
        const ua = navigator.userAgent || '';
        const isMobile = /Mobile|Android|iPhone|iPad|iPod|Mobi/.test(ua);
        if (navigator.share && isMobile) {
            await navigator.share({
                title: 'Цитата Джейсона Стэтхэма',
                text: text,
                url: url
            });
        } else {
            const textWithUrl = `${text}\n\n${url}`;
            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(textWithUrl);
                showCopyToast('Цитата и ссылка скопированы в буфер обмена');
            } else {
                const ta = document.createElement('textarea');
                ta.value = textWithUrl;
                document.body.appendChild(ta);
                ta.select();
                document.execCommand('copy');
                document.body.removeChild(ta);
                showCopyToast('Цитата и ссылка скопированы в буфер обмена');
            }
        }
    } catch (e) {
        console.error('Не удалось поделиться:', e);
        try {
            const textWithUrl = `${text}\n\n${url}`;
            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(textWithUrl);
                showCopyToast('Цитата и ссылка скопированы в буфер обмена');
            }
        } catch (e2) {
            showCopyToast('Ошибка при попытке поделиться');
        }
    }
}

async function copyLinkOnly() {
    let url;
    if (window.STATHAM_PERMALINK_MODE && window.currentQuoteId) {
        url = resolveBaseRoot() + 'quotes/' + window.currentQuoteId + '/';
    } else {
        try {
            const u = new URL(window.location.href);
            if (window.currentQuoteId) u.searchParams.set('quoteId', window.currentQuoteId);
            url = u.toString();
        } catch (e) {
            url = window.location.href.split('?')[0] + (window.currentQuoteId ? `?quoteId=${window.currentQuoteId}` : '');
        }
    }
    try {
        if (navigator.clipboard && window.isSecureContext) {
            await navigator.clipboard.writeText(url);
            showCopyToast('Ссылка скопирована в буфер обмена');
        } else {
            const ta = document.createElement('textarea');
            ta.value = url;
            document.body.appendChild(ta);
            ta.select();
            document.execCommand('copy');
            document.body.removeChild(ta);
            showCopyToast('Ссылка скопирована в буфер обмена');
        }
    } catch (e) {
        console.error('Не удалось скопировать ссылку:', e);
        showCopyToast('Ошибка при копировании ссылки');
    }
}

function showCopyToast(msg, duration = 2200) {
    let t = document.getElementById('copy-toast');
    if (!t) return;
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(t._timeout);
    t._timeout = setTimeout(() => t.classList.remove('show'), duration);
}

const copyLinkBtn = document.getElementById('copy-link-btn');
if (copyLinkBtn) {
    copyLinkBtn.addEventListener('click', copyLinkOnly);
}
