/* ============================================
   Exam Checker: Card Style
   Fetches exam JSON, renders card-based questions,
   and grades answers on reveal.
   ============================================ */

(function () {
  'use strict';

  var container = document.getElementById('exam-container');
  if (!container) return;

  var examPath = container.getAttribute('data-exam');
  if (!examPath) {
    var scriptTag = document.querySelector('script[data-exam]');
    if (scriptTag) examPath = scriptTag.getAttribute('data-exam');
  }
  if (!examPath) {
    container.innerHTML = '<p style="color:var(--incorrect)">Error: No exam data path provided.</p>';
    return;
  }

  var btnCheck = document.getElementById('btn-check-answers');
  var scoreSummary = document.getElementById('score-summary');
  var examData = null;
  var answered = {};
  var checked = false;

  // ── Fetch and render ──

  fetch(examPath)
    .then(function (res) {
      if (!res.ok) throw new Error('Failed to load exam data (' + res.status + ')');
      return res.json();
    })
    .then(function (data) {
      examData = data;
      renderExam(data);
    })
    .catch(function (err) {
      container.innerHTML = '<p style="color:var(--incorrect)">Error loading exam: ' + escapeHtml(err.message) + '</p>';
    });

  // ── Render exam ──

  function renderExam(data) {
    var questions = data.questions || data;
    var totalCount = questions.length;

    var countEl = document.getElementById('exam-question-count');
    if (countEl) countEl.textContent = totalCount + ' question' + (totalCount !== 1 ? 's' : '');

    var progressEl = document.getElementById('exam-progress');
    if (progressEl) progressEl.textContent = '0 of ' + totalCount + ' answered';

    var html = '';
    for (var i = 0; i < questions.length; i++) {
      html += renderQuestion(questions[i], i + 1);
    }
    container.innerHTML = html;

    bindOptionClicks();
    bindTextareaInputs();

    if (btnCheck) {
      btnCheck.disabled = false;
      btnCheck.addEventListener('click', checkAnswers);
    }
  }

  // ── Render a single question ──

  function renderQuestion(q, num) {
    var diffClass = q.difficulty ? 'badge-' + q.difficulty : '';
    var typeLabel = formatType(q.type);

    var s = '<div class="question-card" data-qid="' + q.id + '" data-type="' + q.type + '">';
    s += '<div class="question-card-header">';
    s += '<span class="question-number">' + num + '</span>';
    s += '<p class="question-text">' + escapeHtml(q.question) + '</p>';
    s += '</div>';

    s += '<div class="question-badges">';
    if (q.difficulty) s += '<span class="badge ' + diffClass + '">' + q.difficulty + '</span>';
    s += '<span class="badge badge-type">' + typeLabel + '</span>';
    s += '</div>';

    if (q.type === 'multiple-choice') {
      s += renderMCOptions(q);
    } else if (q.type === 'multiple-multiple-choice') {
      s += renderMMCOptions(q);
    } else if (q.type === 'short-answer') {
      s += '<textarea class="short-answer-area" data-qid="' + q.id + '" placeholder="Type your answer..."></textarea>';
    } else if (q.type === 'long-answer') {
      s += '<textarea class="long-answer-area" data-qid="' + q.id + '" placeholder="Type your detailed answer..."></textarea>';
    }

    s += '</div>';
    return s;
  }

  function renderMCOptions(q) {
    var s = '<ul class="options-list">';
    for (var i = 0; i < q.options.length; i++) {
      var opt = q.options[i];
      var letter = String.fromCharCode(65 + i);
      s += '<li class="option-card" data-qid="' + q.id + '" data-oid="' + opt.id + '" role="button" tabindex="0">';
      s += '<span class="option-letter">' + letter + '</span>';
      s += '<span class="option-text">' + escapeHtml(opt.text) + '</span>';
      s += '</li>';
    }
    s += '</ul>';
    return s;
  }

  function renderMMCOptions(q) {
    var s = '<ul class="options-list">';
    for (var i = 0; i < q.options.length; i++) {
      var opt = q.options[i];
      var letter = String.fromCharCode(65 + i);
      s += '<li class="option-card" data-qid="' + q.id + '" data-oid="' + opt.id + '" data-multi="true" role="button" tabindex="0">';
      s += '<span class="option-letter">' + letter + '</span>';
      s += '<span class="option-text">' + escapeHtml(opt.text) + '</span>';
      s += '</li>';
    }
    s += '</ul>';
    return s;
  }

  // ── Click / keyboard bindings ──

  function bindOptionClicks() {
    var cards = container.querySelectorAll('.option-card');
    for (var i = 0; i < cards.length; i++) {
      cards[i].addEventListener('click', handleOptionClick);
      cards[i].addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleOptionClick.call(this, e);
        }
      });
    }
  }

  function handleOptionClick() {
    if (checked) return;
    var qid = this.getAttribute('data-qid');
    var oid = this.getAttribute('data-oid');
    var isMulti = this.getAttribute('data-multi') === 'true';

    if (isMulti) {
      // Toggle selection for MMC
      this.classList.toggle('selected');
      if (!answered[qid]) answered[qid] = {};
      answered[qid][oid] = this.classList.contains('selected');
    } else {
      // Single selection for MC
      var siblings = container.querySelectorAll('.option-card[data-qid="' + qid + '"]');
      for (var j = 0; j < siblings.length; j++) {
        siblings[j].classList.remove('selected');
      }
      this.classList.add('selected');
      answered[qid] = oid;
    }

    updateProgress();
  }

  function bindTextareaInputs() {
    var areas = container.querySelectorAll('textarea');
    for (var i = 0; i < areas.length; i++) {
      areas[i].addEventListener('input', function () {
        var qid = this.getAttribute('data-qid');
        answered[qid] = this.value.trim();
        updateProgress();
      });
    }
  }

  function updateProgress() {
    var questions = examData.questions || examData;
    var count = 0;
    for (var i = 0; i < questions.length; i++) {
      var qid = questions[i].id;
      var a = answered[qid];
      if (a !== undefined && a !== '' && a !== null) {
        if (typeof a === 'object') {
          // MMC: at least one selected
          var hasSelection = false;
          for (var k in a) {
            if (a[k]) { hasSelection = true; break; }
          }
          if (hasSelection) count++;
        } else {
          count++;
        }
      }
    }
    var progressEl = document.getElementById('exam-progress');
    if (progressEl) progressEl.textContent = count + ' of ' + questions.length + ' answered';
  }

  // ── Check answers ──

  function checkAnswers() {
    if (checked) return;
    checked = true;

    var questions = examData.questions || examData;
    var autoGradable = 0;
    var correctCount = 0;
    var firstIncorrectEl = null;

    for (var i = 0; i < questions.length; i++) {
      var q = questions[i];
      var cardEl = container.querySelector('.question-card[data-qid="' + q.id + '"]');
      if (!cardEl) continue;

      if (q.type === 'multiple-choice') {
        autoGradable++;
        var isCorrect = gradeMC(q, cardEl);
        if (isCorrect) correctCount++;
        else if (!firstIncorrectEl) firstIncorrectEl = cardEl;
      } else if (q.type === 'multiple-multiple-choice') {
        autoGradable++;
        var isCorrect2 = gradeMMC(q, cardEl);
        if (isCorrect2) correctCount++;
        else if (!firstIncorrectEl) firstIncorrectEl = cardEl;
      } else if (q.type === 'short-answer') {
        autoGradable++;
        var isCorrect3 = gradeShortAnswer(q, cardEl);
        if (isCorrect3) correctCount++;
        else if (!firstIncorrectEl) firstIncorrectEl = cardEl;
      } else if (q.type === 'long-answer') {
        gradeLongAnswer(q, cardEl);
      }
    }

    // Disable all interactive elements
    var allOptions = container.querySelectorAll('.option-card');
    for (var j = 0; j < allOptions.length; j++) {
      allOptions[j].classList.add('disabled');
    }
    var allTextareas = container.querySelectorAll('textarea');
    for (var k = 0; k < allTextareas.length; k++) {
      allTextareas[k].disabled = true;
    }

    btnCheck.disabled = true;
    btnCheck.textContent = 'Answers Revealed';

    // Score summary
    showScoreSummary(correctCount, autoGradable);

    // Scroll to first incorrect
    if (firstIncorrectEl) {
      setTimeout(function () {
        firstIncorrectEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 400);
    }
  }

  // ── Grading functions ──

  function gradeMC(q, cardEl) {
    var selected = answered[q.id];
    var options = cardEl.querySelectorAll('.option-card');
    var correct = false;

    for (var i = 0; i < options.length; i++) {
      var oid = options[i].getAttribute('data-oid');
      if (oid === q.correctAnswer) {
        options[i].classList.add('correct');
        if (selected === oid) correct = true;
      } else if (selected === oid) {
        options[i].classList.add('incorrect');
      }
    }

    if (q.explanation) {
      cardEl.insertAdjacentHTML('beforeend', renderExplanation(q.explanation));
    }
    if (q.sourceLecture) {
      cardEl.insertAdjacentHTML('beforeend', renderSourceLecture(q.sourceLecture));
    }

    return correct;
  }

  function gradeMMC(q, cardEl) {
    var selections = answered[q.id] || {};
    var correctSet = {};
    for (var c = 0; c < q.correctAnswers.length; c++) {
      correctSet[q.correctAnswers[c]] = true;
    }

    var options = cardEl.querySelectorAll('.option-card');
    var allCorrect = true;

    for (var i = 0; i < options.length; i++) {
      var oid = options[i].getAttribute('data-oid');
      var isCorrectAnswer = correctSet[oid] === true;
      var wasSelected = selections[oid] === true;

      if (isCorrectAnswer && wasSelected) {
        options[i].classList.add('correct');
      } else if (isCorrectAnswer && !wasSelected) {
        options[i].classList.add('missed');
        allCorrect = false;
      } else if (!isCorrectAnswer && wasSelected) {
        options[i].classList.add('incorrect');
        allCorrect = false;
      }
    }

    if (q.explanation) {
      cardEl.insertAdjacentHTML('beforeend', renderExplanation(q.explanation));
    }
    if (q.sourceLecture) {
      cardEl.insertAdjacentHTML('beforeend', renderSourceLecture(q.sourceLecture));
    }

    return allCorrect;
  }

  function gradeShortAnswer(q, cardEl) {
    var userAnswer = (answered[q.id] || '').toLowerCase().trim();
    var correct = userAnswer === q.correctAnswer.toLowerCase().trim();

    // Check keywords
    var keywords = q.acceptableKeywords || [];
    var matchedKeywords = [];
    for (var i = 0; i < keywords.length; i++) {
      if (userAnswer.indexOf(keywords[i].toLowerCase()) !== -1) {
        matchedKeywords.push(keywords[i]);
        if (!correct) correct = true;
      }
    }

    var revealHtml = '<div class="answer-reveal">';
    revealHtml += '<span class="answer-reveal-label">Model Answer</span>';
    revealHtml += '<p class="answer-reveal-text">' + escapeHtml(q.correctAnswer) + '</p>';

    if (keywords.length > 0) {
      revealHtml += '<span class="answer-reveal-label" style="margin-top:0.75rem">Acceptable Keywords</span>';
      revealHtml += '<p class="answer-reveal-text">';
      for (var k = 0; k < keywords.length; k++) {
        var cls = matchedKeywords.indexOf(keywords[k]) !== -1 ? ' keyword-match' : '';
        revealHtml += '<span class="' + cls + '">' + escapeHtml(keywords[k]) + '</span>';
        if (k < keywords.length - 1) revealHtml += ', ';
      }
      revealHtml += '</p>';
    }
    revealHtml += '</div>';

    cardEl.insertAdjacentHTML('beforeend', revealHtml);

    if (q.sourceLecture) {
      cardEl.insertAdjacentHTML('beforeend', renderSourceLecture(q.sourceLecture));
    }

    return correct;
  }

  function gradeLongAnswer(q, cardEl) {
    var revealHtml = '<div class="answer-reveal">';
    revealHtml += '<span class="answer-reveal-label">Sample Answer</span>';
    revealHtml += '<p class="answer-reveal-text">' + escapeHtml(q.sampleAnswer) + '</p>';

    if (q.gradingCriteria && q.gradingCriteria.length > 0) {
      revealHtml += '<span class="answer-reveal-label" style="margin-top:0.75rem">Grading Criteria</span>';
      revealHtml += '<ul class="grading-criteria">';
      for (var i = 0; i < q.gradingCriteria.length; i++) {
        revealHtml += '<li>' + escapeHtml(q.gradingCriteria[i]) + '</li>';
      }
      revealHtml += '</ul>';
    }
    revealHtml += '</div>';

    cardEl.insertAdjacentHTML('beforeend', revealHtml);

    if (q.sourceLecture) {
      cardEl.insertAdjacentHTML('beforeend', renderSourceLecture(q.sourceLecture));
    }
  }

  // ── Score summary ──

  function showScoreSummary(correct, total) {
    if (!scoreSummary) return;
    var pct = total > 0 ? Math.round((correct / total) * 100) : 0;

    scoreSummary.hidden = false;
    scoreSummary.innerHTML =
      '<div class="score-value">' + correct + ' / ' + total + '</div>' +
      '<span class="score-label">' + pct + '% on auto-graded questions</span>' +
      '<div class="score-bar"><div class="score-bar-fill" style="width:' + pct + '%"></div></div>';
  }

  // ── Helpers ──

  function renderExplanation(text) {
    return '<div class="answer-reveal">' +
      '<span class="answer-reveal-label">Explanation</span>' +
      '<p class="answer-reveal-text">' + escapeHtml(text) + '</p>' +
      '</div>';
  }

  function renderSourceLecture(lecture) {
    return '<span class="source-lecture">Source: ' + escapeHtml(lecture) + '</span>';
  }

  function formatType(type) {
    var map = {
      'multiple-choice': 'Multiple Choice',
      'multiple-multiple-choice': 'Select All That Apply',
      'short-answer': 'Short Answer',
      'long-answer': 'Long Answer'
    };
    return map[type] || type;
  }

  function escapeHtml(str) {
    var div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
  }

})();
