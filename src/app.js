let quiz = [],
    index = 0,
    answers = [],
    chapterFiles = [],
    activeLoad = Promise.resolve();

const $ = id => document.getElementById(id);

const shuffle = a => {
    const b = [...a];
    for (let i = b.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [b[i], b[j]] = [b[j], b[i]];
    }
    return b;
};

const chapterKey = q => `${q.chapter || ''} ${q.chapterName || ''}`.trim();
const tagText = q => q.tag || q.category || 'General';
const questionText = q => q.sentence || q.question || '';
const explanationText = q => q.exp || q.explanation || '';
const passageText = q => q.passage || q.article || q.reading || '';
const passageTitle = q => q.passageTitle || q.articleTitle || '';
const fileLabel = file => file.replace(/\.js$/i, '').replace(/[-_]+/g, ' ');
const storageKey = 'genericQuizState';

function selectedChapter() {
    return $('chapter').value;
}

function currentQuestions() {
    const c = selectedChapter(),
        t = $('category').value;

    return questions.filter(q =>
        (c === 'all' || q.__sourceFile === c || chapterKey(q) === c) &&
        (t === 'all' || tagText(q) === t)
    );
}

function updateCategories() {
    const p = $('category').value;
    const tags = [...new Set(currentQuestions().map(tagText))].sort();

    $('category').innerHTML = '<option value="all">All Categories</option>';

    tags.forEach(t => {
        const o = document.createElement('option');
        o.value = o.textContent = t;
        $('category').appendChild(o);
    });

    $('category').value = tags.includes(p) ? p : 'all';
}

async function ensureSelectedData() {
    const c = selectedChapter();

    if (c === 'all') {
        await window.quizLoader.loadAll();
        return;
    }

    if (chapterFiles.includes(c)) {
        await window.quizLoader.loadChapter(c);
    }
}

function buildQuiz() {
    const grouped = new Map();

    currentQuestions().forEach((q, position) => {
        const key = q.__passageGroup || `single:${position}`;
        if (!grouped.has(key)) grouped.set(key, []);
        grouped.get(key).push(q);
    });

    let pool = shuffle([...grouped.values()]).flat().map(q => {
        const m = shuffle(
            q.options.map((text, i) => ({
                text,
                ok: i === q.answer
            }))
        );

        return {
            ...q,
            options: m.map(x => x.text),
            answer: m.findIndex(x => x.ok)
        };
    });

    const n = $('size').value;

    quiz = n === 'all'
        ? pool
        : pool.slice(0, Math.min(+n, pool.length));

    answers = Array(quiz.length).fill(null);
    index = 0;

    $('result').classList.add('hidden');
    $('quiz').classList.remove('hidden');

    render();
}

function makeQuiz() {
    activeLoad = activeLoad
        .then(async () => {
            await ensureSelectedData();
            updateCategories();
            buildQuiz();
            window.quizLoader.finish();
        })
        .catch(error => window.quizLoader.fail(error));

    return activeLoad;
}

function ensurePassagePanel() {
    let panel = $('passage');

    if (panel) return panel;

    panel = document.createElement('article');
    panel.id = 'passage';
    panel.className = 'passage hidden';
    panel.setAttribute('aria-label', 'Reading passage');

    const question = $('question');
    question.parentNode.insertBefore(panel, question);
    return panel;
}

function renderPassage(q) {
    const panel = ensurePassagePanel();
    const text = passageText(q);

    panel.replaceChildren();
    panel.classList.toggle('hidden', !text);

    if (!text) return;

    const title = passageTitle(q);
    if (title) {
        const heading = document.createElement('h3');
        heading.className = 'passage-title';
        heading.textContent = title;
        panel.appendChild(heading);
    }

    text.split(/\n{2,}/).forEach(paragraphText => {
        const paragraph = document.createElement('p');
        paragraph.textContent = paragraphText.trim();
        if (paragraph.textContent) panel.appendChild(paragraph);
    });
}

function render() {
    if (!quiz.length) {
        $('tag').textContent = 'No Questions';
        $('question').textContent =
            'There are no questions matching the current criteria. Please choose another chapter or category.';
        renderPassage({});
        $('options').innerHTML = '';
        $('counter').textContent = '0 Questions';
        $('bar').style.width = '0%';
        $('score').textContent = 'Score: 0 / 0';
        $('next').disabled = true;
        return;
    }

    $('next').disabled = false;

    const q = quiz[index],
        picked = answers[index];

    $('tag').textContent = `${chapterKey(q)} | ${tagText(q)}`;
    renderPassage(q);
    $('question').textContent = questionText(q);
    $('counter').textContent = `Question ${index + 1} / ${quiz.length}`;
    $('bar').style.width = `${((index + 1) / quiz.length) * 100}%`;

    const score = answers.reduce(
        (n, a, i) => n + (a === quiz[i].answer),
        0
    );

    $('score').textContent = `Score: ${score} / ${quiz.length}`;
    $('options').innerHTML = '';

    q.options.forEach((text, i) => {
        const b = document.createElement('button');
        b.className = 'option';
        b.disabled = picked !== null;

        if (picked !== null) {
            if (i === q.answer) b.classList.add('correct');
            else if (i === picked) b.classList.add('wrong');
        }

        const l = document.createElement('span');
        l.className = 'letter';
        l.textContent = 'ABCD'[i] || String(i + 1);

        const s = document.createElement('span');
        s.textContent = text;

        b.append(l, s);
        b.onclick = () => choose(i);

        $('options').appendChild(b);
    });

    $('explanation').className = 'explanation hidden';

    if (picked !== null) {
        $('explanation').className =
            `explanation ${picked === q.answer ? 'good' : 'bad'}`;

        $('explanation').textContent =
            `${picked === q.answer ? 'Correct.' : 'Incorrect.'} ${explanationText(q)}`;
    }

    $('prev').disabled = index === 0;
    $('next').textContent =
        index === quiz.length - 1
            ? 'View Results'
            : 'Next Question';

    save();
}

function choose(i) {
    if (answers[index] !== null) return;
    answers[index] = i;
    render();
}

function move(s) {
    if (s < 0 && index > 0) {
        index--;
        render();
    } else if (s > 0 && index < quiz.length - 1) {
        index++;
        render();
    } else if (s > 0) {
        showResult();
    }
}

function showResult() {
    const score = answers.reduce(
        (n, a, i) => n + (a === quiz[i].answer),
        0
    );

    $('quiz').classList.add('hidden');
    $('result').classList.remove('hidden');

    $('final').textContent = `${score} / ${quiz.length}`;
    $('summary').textContent =
        `Accuracy ${Math.round(score / quiz.length * 100)}%, Unanswered ${answers.filter(a => a === null).length} questions.`;

    localStorage.removeItem(storageKey);
}

function save() {
    if (quiz.length) {
        localStorage.setItem(
            storageKey,
            JSON.stringify({
                quiz,
                index,
                answers
            })
        );
    }
}

function restore() {
    try {
        const s = JSON.parse(
            localStorage.getItem(storageKey)
        );

        if (s?.quiz?.length) {
            quiz = s.quiz;
            index = s.index || 0;
            answers = s.answers;
            render();
            return true;
        }
    } catch {}

    return false;
}

function populateChapterSelect() {
    chapterFiles.forEach(file => {
        const o = document.createElement('option');
        o.value = file;
        o.textContent = fileLabel(file);
        $('chapter').appendChild(o);
    });

    if (chapterFiles.length && selectedChapter() === 'all') {
        $('chapter').value = chapterFiles[0];
    }
}

async function init() {
    chapterFiles = await window.quizLoader.init();
    populateChapterSelect();

    $('chapter').onchange = makeQuiz;
    $('category').onchange = makeQuiz;
    $('size').onchange = makeQuiz;

    if (!restore()) await makeQuiz();
}

if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', () => {
        init().catch(error => window.quizLoader.fail(error));
    }, {
        once: true
    });
} else {
    init();
}
