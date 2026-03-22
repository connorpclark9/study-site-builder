/**
 * Flashcard app component for study-site-builder.
 * Fetches flashcards.json and renders an interactive flashcard study tool.
 * Mounts inside an element with id="flashcard-app".
 * Uses CSS variables from the active theme for all styling.
 */
(function () {
  'use strict';

  const FLASHCARDS_PATH = 'data/flashcards.json';
  const STORAGE_PREFIX = 'sb-flashcards-';
  const CONTAINER_ID = 'flashcard-app';

  // ---------------------------------------------------------------------------
  // Styles
  // ---------------------------------------------------------------------------

  const STYLES = `
    .sb-fc {
      max-width: 720px;
      margin: 0 auto;
      font-family: inherit;
    }

    /* Deck selector */
    .sb-fc-decks {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      margin-bottom: 1.5rem;
    }

    .sb-fc-deck-btn {
      padding: 0.5rem 1rem;
      border: 1px solid var(--border, #e0e0e0);
      border-radius: 8px;
      background: var(--bg-card, #ffffff);
      color: var(--text, #1a1a1a);
      font: inherit;
      font-size: 0.875rem;
      cursor: pointer;
      transition: background 0.15s, border-color 0.15s, color 0.15s;
    }

    .sb-fc-deck-btn:hover {
      border-color: var(--accent, #4f46e5);
    }

    .sb-fc-deck-btn.sb-selected {
      background: var(--accent, #4f46e5);
      color: #fff;
      border-color: var(--accent, #4f46e5);
    }

    /* Progress bar */
    .sb-fc-progress-wrap {
      margin-bottom: 1rem;
    }

    .sb-fc-progress-label {
      display: flex;
      justify-content: space-between;
      font-size: 0.8rem;
      color: var(--text, #1a1a1a);
      opacity: 0.7;
      margin-bottom: 0.35rem;
    }

    .sb-fc-progress-track {
      height: 6px;
      background: var(--border, #e0e0e0);
      border-radius: 3px;
      overflow: hidden;
    }

    .sb-fc-progress-fill {
      height: 100%;
      background: var(--accent, #4f46e5);
      border-radius: 3px;
      transition: width 0.3s ease;
      width: 0%;
    }

    /* Card */
    .sb-fc-card-area {
      perspective: 800px;
      margin-bottom: 1.25rem;
    }

    .sb-fc-card {
      position: relative;
      width: 100%;
      min-height: 260px;
      cursor: pointer;
      transform-style: preserve-3d;
      transition: transform 0.5s ease;
    }

    .sb-fc-card.sb-flipped {
      transform: rotateY(180deg);
    }

    .sb-fc-card-face {
      position: absolute;
      inset: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 2rem 1.5rem;
      backface-visibility: hidden;
      border: 1px solid var(--border, #e0e0e0);
      border-radius: 12px;
      background: var(--bg-card, #ffffff);
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
      text-align: center;
      overflow-y: auto;
    }

    .sb-fc-card-back {
      transform: rotateY(180deg);
    }

    .sb-fc-card-label {
      font-size: 0.7rem;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--accent, #4f46e5);
      margin-bottom: 0.75rem;
      font-weight: 600;
    }

    .sb-fc-card-text {
      font-size: 1.15rem;
      line-height: 1.5;
      color: var(--text, #1a1a1a);
    }

    .sb-fc-card-related {
      margin-top: 1rem;
      font-size: 0.8rem;
      color: var(--text, #1a1a1a);
      opacity: 0.6;
    }

    .sb-fc-hint {
      font-size: 0.75rem;
      color: var(--text, #1a1a1a);
      opacity: 0.45;
      margin-top: 0.75rem;
    }

    /* Controls */
    .sb-fc-controls {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.75rem;
      flex-wrap: wrap;
    }

    .sb-fc-btn {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      padding: 0.55rem 1.15rem;
      border: 1px solid var(--border, #e0e0e0);
      border-radius: 8px;
      background: var(--bg-card, #ffffff);
      color: var(--text, #1a1a1a);
      font: inherit;
      font-size: 0.875rem;
      cursor: pointer;
      transition: background 0.15s, border-color 0.15s;
    }

    .sb-fc-btn:hover:not(:disabled) {
      border-color: var(--accent, #4f46e5);
      background: var(--bg, #f5f5f5);
    }

    .sb-fc-btn:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }

    .sb-fc-counter {
      font-size: 0.9rem;
      color: var(--text, #1a1a1a);
      font-weight: 600;
      min-width: 100px;
      text-align: center;
    }

    /* Completion screen */
    .sb-fc-complete {
      text-align: center;
      padding: 3rem 1.5rem;
      border: 1px solid var(--border, #e0e0e0);
      border-radius: 12px;
      background: var(--bg-card, #ffffff);
    }

    .sb-fc-complete-icon {
      font-size: 3rem;
      margin-bottom: 1rem;
    }

    .sb-fc-complete h3 {
      margin: 0 0 0.5rem;
      color: var(--text, #1a1a1a);
    }

    .sb-fc-complete p {
      color: var(--text, #1a1a1a);
      opacity: 0.7;
      margin: 0 0 1.25rem;
    }

    /* Error */
    .sb-fc-error {
      padding: 1.5rem;
      background: #fef2f2;
      color: #991b1b;
      border-radius: 8px;
      text-align: center;
      font-size: 0.9rem;
    }

    /* Responsive */
    @media (max-width: 600px) {
      .sb-fc-card {
        min-height: 200px;
      }

      .sb-fc-card-text {
        font-size: 1rem;
      }

      .sb-fc-decks {
        gap: 0.35rem;
      }

      .sb-fc-deck-btn {
        padding: 0.4rem 0.75rem;
        font-size: 0.8rem;
      }
    }
  `;

  // ---------------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------------

  let state = {
    decks: [],
    currentDeckIndex: 0,
    currentCards: [],
    currentCardIndex: 0,
    isFlipped: false,
    reviewedCards: new Set(),
    isComplete: false,
  };

  let container = null;

  // ---------------------------------------------------------------------------
  // Session storage helpers
  // ---------------------------------------------------------------------------

  function getStorageKey(deckId) {
    return STORAGE_PREFIX + deckId;
  }

  function loadProgress(deckId) {
    try {
      const raw = sessionStorage.getItem(getStorageKey(deckId));
      return raw ? new Set(JSON.parse(raw)) : new Set();
    } catch {
      return new Set();
    }
  }

  function saveProgress(deckId, reviewed) {
    try {
      sessionStorage.setItem(getStorageKey(deckId), JSON.stringify([...reviewed]));
    } catch {
      // sessionStorage may be unavailable; fail silently
    }
  }

  // ---------------------------------------------------------------------------
  // Shuffle (Fisher-Yates)
  // ---------------------------------------------------------------------------

  function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  // ---------------------------------------------------------------------------
  // Rendering
  // ---------------------------------------------------------------------------

  function render() {
    if (!container) return;
    const deck = state.decks[state.currentDeckIndex];
    if (!deck) return;

    const totalCards = state.currentCards.length;
    const reviewedCount = state.reviewedCards.size;
    const progressPct = totalCards > 0 ? Math.round((reviewedCount / totalCards) * 100) : 0;

    let html = '';

    // Deck selector
    html += '<div class="sb-fc-decks" role="tablist" aria-label="Flashcard decks">';
    state.decks.forEach((d, i) => {
      const selected = i === state.currentDeckIndex ? ' sb-selected' : '';
      html += `<button class="sb-fc-deck-btn${selected}" role="tab" aria-selected="${i === state.currentDeckIndex}" data-deck-index="${i}">${escapeHtml(d.title)}</button>`;
    });
    html += '</div>';

    // Progress bar
    html += '<div class="sb-fc-progress-wrap">';
    html += '<div class="sb-fc-progress-label">';
    html += `<span>${reviewedCount} of ${totalCards} cards reviewed</span>`;
    html += `<span>${progressPct}%</span>`;
    html += '</div>';
    html += '<div class="sb-fc-progress-track">';
    html += `<div class="sb-fc-progress-fill" style="width:${progressPct}%"></div>`;
    html += '</div></div>';

    if (state.isComplete) {
      // Completion screen
      html += '<div class="sb-fc-complete">';
      html += '<div class="sb-fc-complete-icon" aria-hidden="true">&#10003;</div>';
      html += `<h3>Deck Complete!</h3>`;
      html += `<p>You reviewed all ${totalCards} cards in "${escapeHtml(deck.title)}".</p>`;
      html += '<button class="sb-fc-btn" data-action="restart">Study Again</button> ';
      html += '<button class="sb-fc-btn" data-action="shuffle-restart">Shuffle &amp; Restart</button>';
      html += '</div>';
    } else if (totalCards === 0) {
      html += '<div class="sb-fc-error">This deck has no cards.</div>';
    } else {
      // Card
      const card = state.currentCards[state.currentCardIndex];
      const flippedClass = state.isFlipped ? ' sb-flipped' : '';

      html += '<div class="sb-fc-card-area">';
      html += `<div class="sb-fc-card${flippedClass}" data-action="flip" role="button" tabindex="0" aria-label="Flashcard. Press space to flip.">`;

      // Front
      html += '<div class="sb-fc-card-face sb-fc-card-front">';
      html += '<div class="sb-fc-card-label">Term</div>';
      html += `<div class="sb-fc-card-text">${escapeHtml(card.term)}</div>`;
      html += '<div class="sb-fc-hint">Click or press Space to reveal</div>';
      html += '</div>';

      // Back
      html += '<div class="sb-fc-card-face sb-fc-card-back">';
      html += '<div class="sb-fc-card-label">Definition</div>';
      html += `<div class="sb-fc-card-text">${escapeHtml(card.definition)}</div>`;
      if (card.relatedTerms && card.relatedTerms.length > 0) {
        html += `<div class="sb-fc-card-related">Related: ${card.relatedTerms.map(escapeHtml).join(', ')}</div>`;
      }
      html += '</div>';

      html += '</div></div>';

      // Controls
      html += '<div class="sb-fc-controls">';
      html += `<button class="sb-fc-btn" data-action="prev" ${state.currentCardIndex === 0 ? 'disabled' : ''} aria-label="Previous card">&larr; Prev</button>`;
      html += `<span class="sb-fc-counter">Card ${state.currentCardIndex + 1} of ${totalCards}</span>`;
      html += `<button class="sb-fc-btn" data-action="next" ${state.currentCardIndex >= totalCards - 1 ? 'disabled' : ''} aria-label="Next card">Next &rarr;</button>`;
      html += `<button class="sb-fc-btn" data-action="shuffle" aria-label="Shuffle cards">Shuffle</button>`;
      html += '</div>';
    }

    container.innerHTML = html;
  }

  // ---------------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------------

  function selectDeck(index) {
    if (index < 0 || index >= state.decks.length) return;
    const deck = state.decks[index];
    state.currentDeckIndex = index;
    state.currentCards = [...deck.cards];
    state.currentCardIndex = 0;
    state.isFlipped = false;
    state.reviewedCards = loadProgress(deck.id);
    state.isComplete = false;
    render();
  }

  function flipCard() {
    if (state.isComplete || state.currentCards.length === 0) return;
    state.isFlipped = !state.isFlipped;

    // Mark as reviewed when flipped to back
    if (state.isFlipped) {
      const card = state.currentCards[state.currentCardIndex];
      state.reviewedCards.add(card.id);
      const deck = state.decks[state.currentDeckIndex];
      saveProgress(deck.id, state.reviewedCards);
    }

    render();
  }

  function nextCard() {
    if (state.currentCardIndex >= state.currentCards.length - 1) {
      // Check if deck is complete
      if (state.reviewedCards.size >= state.currentCards.length) {
        state.isComplete = true;
        render();
      }
      return;
    }
    state.currentCardIndex++;
    state.isFlipped = false;
    render();
  }

  function prevCard() {
    if (state.currentCardIndex <= 0) return;
    state.currentCardIndex--;
    state.isFlipped = false;
    render();
  }

  function shuffleCards() {
    state.currentCards = shuffle(state.currentCards);
    state.currentCardIndex = 0;
    state.isFlipped = false;
    render();
  }

  function restart() {
    const deck = state.decks[state.currentDeckIndex];
    state.currentCards = [...deck.cards];
    state.currentCardIndex = 0;
    state.isFlipped = false;
    state.reviewedCards = new Set();
    state.isComplete = false;
    saveProgress(deck.id, state.reviewedCards);
    render();
  }

  function shuffleRestart() {
    const deck = state.decks[state.currentDeckIndex];
    state.currentCards = shuffle(deck.cards);
    state.currentCardIndex = 0;
    state.isFlipped = false;
    state.reviewedCards = new Set();
    state.isComplete = false;
    saveProgress(deck.id, state.reviewedCards);
    render();
  }

  // ---------------------------------------------------------------------------
  // Event handling
  // ---------------------------------------------------------------------------

  function handleClick(e) {
    const actionEl = e.target.closest('[data-action]');
    const deckEl = e.target.closest('[data-deck-index]');

    if (deckEl) {
      selectDeck(parseInt(deckEl.dataset.deckIndex, 10));
      return;
    }

    if (!actionEl) return;

    switch (actionEl.dataset.action) {
      case 'flip':
        flipCard();
        break;
      case 'next':
        nextCard();
        break;
      case 'prev':
        prevCard();
        break;
      case 'shuffle':
        shuffleCards();
        break;
      case 'restart':
        restart();
        break;
      case 'shuffle-restart':
        shuffleRestart();
        break;
    }
  }

  function handleKeydown(e) {
    // Only respond when flashcard app or its children are focused, or when no
    // input/textarea/select is focused
    const active = document.activeElement;
    const isInput = active && /^(INPUT|TEXTAREA|SELECT)$/i.test(active.tagName);
    if (isInput) return;

    switch (e.key) {
      case 'ArrowRight':
        e.preventDefault();
        nextCard();
        break;
      case 'ArrowLeft':
        e.preventDefault();
        prevCard();
        break;
      case ' ':
        e.preventDefault();
        flipCard();
        break;
    }
  }

  // ---------------------------------------------------------------------------
  // Utilities
  // ---------------------------------------------------------------------------

  function escapeHtml(str) {
    if (typeof str !== 'string') return '';
    const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
    return str.replace(/[&<>"']/g, (c) => map[c]);
  }

  function injectStyles(css) {
    const style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);
  }

  // ---------------------------------------------------------------------------
  // Init
  // ---------------------------------------------------------------------------

  document.addEventListener('DOMContentLoaded', async () => {
    container = document.getElementById(CONTAINER_ID);
    if (!container) {
      console.warn(`[flashcards.js] No element with id="${CONTAINER_ID}" found. Flashcard app will not mount.`);
      return;
    }

    try {
      const response = await fetch(FLASHCARDS_PATH);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: Could not load ${FLASHCARDS_PATH}`);
      }

      const data = await response.json();

      if (!data.decks || !Array.isArray(data.decks) || data.decks.length === 0) {
        throw new Error('Invalid flashcards.json: "decks" must be a non-empty array');
      }

      state.decks = data.decks;
      injectStyles(STYLES);

      // Set up event listeners
      container.addEventListener('click', handleClick);
      document.addEventListener('keydown', handleKeydown);

      // Load first deck
      selectDeck(0);
    } catch (err) {
      console.error('[flashcards.js]', err.message);
      if (container) {
        container.innerHTML = `<div class="sb-fc-error">Flashcards failed to load: ${escapeHtml(err.message)}</div>`;
      }
    }
  });
})();
