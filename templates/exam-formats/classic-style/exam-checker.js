/* ============================================
   Exam Checker: Classic Style
   Fetches exam JSON, renders traditional form-based
   questions with radio/checkbox inputs, and grades
   answers on reveal.
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

    bindInputChanges();

    if (btnCheck) {
      btnCheck.disabled = false;
      btnCheck.addEventListener('click', checkAnswers);
    }
  }

  // ── Render a single question ──

  function renderQuestion(q, num) {
    var diffClass = q.difficulty ? 'badge-' + q.difficulty : '';
    var typeLabel = formatType(q.type);

    var s = '<div class="question-block" data-qid="' + q.id + '" data-type="' + q.type + '">';
    s += '<div class="question-header">';
    s += '<span class="question-number">' + num + '.</span>';
    s += '<p class="question-text">' + escapeHtml(q.question) + '</p>';
    s += '</div>';

    s += '<div class="question-badges">';
    if (q.difficulty) s += '<span class="badge ' + diffClass + '">' + q.difficulty + '</span>';
    s += '<span class="badge badge-type">' + typeLabel + '</span>';
    s += '</div>';

    if (q.type === 'multiple-choice') {
      s += renderRadioOptions(q);
    } else if (q.type === 'multiple-multiple-choice') {
      s += renderCheckboxOptions(q);
    } else if (q.type === 'short-answer') {
      s += '<textarea class="short-answer-area" data-qid="' + q.id + '" placeholder="Type your answer..."></textarea>';
    } else if (q.type === 'long-answer') {
      s += '<textarea class="long-answer-area" data-qid="' + q.id + '" placeholder="Type your detailed answer..."></textarea>';
    }

    s += '</div>';
    return s;
  }

  function renderRadioOptions(q) {
    var s = '<ul class="options-list">';
    for (var i = 0; i < q.options.length; i++) {
      var opt = q.options[i];
      var inputId = 'q-' + q.id + '-opt-' + opt.id;
      s += '<li class="option-item">';
      s += '<label class="option-label" for="' + inputId + '" data-oid="' + opt.id + '">';
      s += '<input type="radio" class="option-radio" id="' + inputId + '" name="q-' + q.id + '" value="' + opt.id + '">';
      s += '<span>' + escapeHtml(opt.text) + '</span>';
      s += '</label>';
      s += '</li>';
    }
    s += '</ul>';
    return s;
  }

  function renderCheckboxOptions(q) {
    var s = '<ul class="options-list">';
    for (var i = 0; i < q.options.length; i++) {
      var opt = q.options[i];
      var inputId = 'q-' + q.id + '-opt-' + opt.id;
      s += '<li class="option-item">';
      s += '<label class="option-label" for="' + inputId + '" data-oid="' + opt.id + '">';
      s += '<input type="checkbox" class="option-checkbox" id="' + inputId + '" name="q-' + q.id + '" value="' + opt.id + '">';
      s += '<span>' + escapeHtml(opt.text) + '</span>';
      s += '</label>';
      s += '</li>';
    }
    s += '</ul>';
    return s;
  }

  // ── Input change tracking ──

  function bindInputChanges() {
    var inputs = container.querySelectorAll('input[type="radio"], input[type="checkbox"]');
    for (var i = 0; i < inputs.length; i++) {
      inputs[i].addEventListener('change', updateProgress);
    }
    var areas = container.querySelectorAll('textarea');
    for (var j = 0; j < areas.length; j++) {
      areas[j].addEventListener('input', updateProgress);
    }
  }

  function updateProgress() {
    var questions = examData.questions || examData;
    var count = 0;

    for (var i = 0; i < questions.length; i++) {
      var q = questions[i];
      if (q.type === 'multiple-choice') {
        var selected = container.querySelector('input[name="q-' + q.id + '"]:checked');
        if (selected) count++;
      } else if (q.type === 'multiple-multiple-choice') {
        var checked_items = container.querySelectorAll('input[name="q-' + q.id + '"]:checked');
        if (checked_items.length > 0) count++;
      } else {
        var area = container.querySelector('textarea[data-qid="' + q.id + '"]');
        if (area && area.value.trim() !== '') count++;
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
      var blockEl = container.querySelector('.question-block[data-qid="' + q.id + '"]');
      if (!blockEl) continue;

      if (q.type === 'multiple-choice') {
        autoGradable++;
        var isCorrect = gradeMC(q, blockEl);
        if (isCorrect) correctCount++;
        else if (!firstIncorrectEl) firstIncorrectEl = blockEl;
      } else if (q.type === 'multiple-multiple-choice') {
        autoGradable++;
        var isCorrect2 = gradeMMC(q, blockEl);
        if (isCorrect2) correctCount++;
        else if (!firstIncorrectEl) firstIncorrectEl = blockEl;
      } else if (q.type === 'short-answer') {
        autoGradable++;
        var isCorrect3 = gradeShortAnswer(q, blockEl);
        if (isCorrect3) correctCount++;
        else if (!firstIncorrectEl) firstIncorrectEl = blockEl;
      } else if (q.type === 'long-answer') {
        gradeLongAnswer(q, blockEl);
      }
    }

    // Disable all inputs
    var allInputs = container.querySelectorAll('input[type="radio"], input[type="checkbox"]');
    for (var j = 0; j < allInputs.length; j++) {
      allInputs[j].disabled = true;
      allInputs[j].closest('.option-label').classList.add('disabled');
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

  function gradeMC(q, blockEl) {
    var selectedInput = blockEl.querySelector('input[name="q-' + q.id + '"]:checked');
    var selectedValue = selectedInput ? selectedInput.value : null;
    var correct = false;

    var labels = blockEl.querySelectorAll('.option-label');
    for (var i = 0; i < labels.length; i++) {
      var oid = labels[i].getAttribute('data-oid');
      if (oid === q.correctAnswer) {
        labels[i].classList.add('correct');
        if (selectedValue === oid) correct = true;
      } else if (selectedValue === oid) {
        labels[i].classList.add('incorrect');
      }
    }

    if (q.explanation) {
      blockEl.insertAdjacentHTML('beforeend', renderExplanation(q.explanation));
    }
    if (q.sourceLecture) {
      blockEl.insertAdjacentHTML('beforeend', renderSourceLecture(q.sourceLecture));
    }

    return correct;
  }

  function gradeMMC(q, blockEl) {
    var checkedInputs = blockEl.querySelectorAll('input[name="q-' + q.id + '"]:checked');
    var selectedSet = {};
    for (var s = 0; s < checkedInputs.length; s++) {
      selectedSet[checkedInputs[s].value] = true;
    }

    var correctSet = {};
    for (var c = 0; c < q.correctAnswers.length; c++) {
      correctSet[q.correctAnswers[c]] = true;
    }

    var labels = blockEl.querySelectorAll('.option-label');
    var allCorrect = true;

    for (var i = 0; i < labels.length; i++) {
      var oid = labels[i].getAttribute('data-oid');
      var isCorrectAnswer = correctSet[oid] === true;
      var wasSelected = selectedSet[oid] === true;

      if (isCorrectAnswer && wasSelected) {
        labels[i].classList.add('correct');
      } else if (isCorrectAnswer && !wasSelected) {
        labels[i].classList.add('missed');
        allCorrect = false;
      } else if (!isCorrectAnswer && wasSelected) {
        labels[i].classList.add('incorrect');
        allCorrect = false;
      }
    }

    if (q.explanation) {
      blockEl.insertAdjacentHTML('beforeend', renderExplanation(q.explanation));
    }
    if (q.sourceLecture) {
      blockEl.insertAdjacentHTML('beforeend', renderSourceLecture(q.sourceLecture));
    }

    return allCorrect;
  }

  function gradeShortAnswer(q, blockEl) {
    var area = blockEl.querySelector('textarea[data-qid="' + q.id + '"]');
    var userAnswer = area ? area.value.toLowerCase().trim() : '';
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
      revealHtml += '<span class="answer-reveal-label" style="margin-top:0.6rem">Acceptable Keywords</span>';
      revealHtml += '<p class="answer-reveal-text">';
      for (var k = 0; k < keywords.length; k++) {
        var cls = matchedKeywords.indexOf(keywords[k]) !== -1 ? ' keyword-match' : '';
        revealHtml += '<span class="' + cls + '">' + escapeHtml(keywords[k]) + '</span>';
        if (k < keywords.length - 1) revealHtml += ', ';
      }
      revealHtml += '</p>';
    }
    revealHtml += '</div>';

    blockEl.insertAdjacentHTML('beforeend', revealHtml);

    if (q.sourceLecture) {
      blockEl.insertAdjacentHTML('beforeend', renderSourceLecture(q.sourceLecture));
    }

    return correct;
  }

  function gradeLongAnswer(q, blockEl) {
    var revealHtml = '<div class="answer-reveal">';
    revealHtml += '<span class="answer-reveal-label">Sample Answer</span>';
    revealHtml += '<p class="answer-reveal-text">' + escapeHtml(q.sampleAnswer) + '</p>';

    if (q.gradingCriteria && q.gradingCriteria.length > 0) {
      revealHtml += '<span class="answer-reveal-label" style="margin-top:0.6rem">Grading Criteria</span>';
      revealHtml += '<ul class="grading-criteria">';
      for (var i = 0; i < q.gradingCriteria.length; i++) {
        revealHtml += '<li>' + escapeHtml(q.gradingCriteria[i]) + '</li>';
      }
      revealHtml += '</ul>';
    }
    revealHtml += '</div>';

    blockEl.insertAdjacentHTML('beforeend', revealHtml);

    if (q.sourceLecture) {
      blockEl.insertAdjacentHTML('beforeend', renderSourceLecture(q.sourceLecture));
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
