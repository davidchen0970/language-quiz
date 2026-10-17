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

const SPEECH =
    'speechSynthesis' in window &&
    'SpeechSynthesisUtterance' in window;

const qLang = q => (q && (q.lang || q.language || q.voiceLang)) || '';

function speechLang(text) {
    if (!text) return 'en-US';
    if (/[\u3040-\u30ff]/.test(text)) return 'ja-JP';
    if (/[\uac00-\ud7af]/.test(text)) return 'ko-KR';

    const cjk = (text.match(/[\u3400-\u4dbf\u4e00-\u9fff]/g) || []).length;
    const latin = (text.match(/[A-Za-z]/g) || []).length;
    if (cjk > 0 && cjk >= latin) return 'zh-TW';
    return 'en-US';
}

let voicesPromise = null;
function loadVoices() {
    if (voicesPromise) return voicesPromise;
    voicesPromise = new Promise(resolve => {
        const synth = window.speechSynthesis;
        if (!synth) return resolve([]);

        const ready = synth.getVoices();
        if (ready.length) return resolve(ready);

        let done = false;
        const finish = () => {
            if (done) return;
            done = true;
            synth.removeEventListener('voiceschanged', onChanged);
            resolve(synth.getVoices());
        };
        const onChanged = () => {
            if (synth.getVoices().length) finish();
        };
        synth.addEventListener('voiceschanged', onChanged);
        setTimeout(finish, 2000);
    });
    return voicesPromise;
}

function pickVoice(voices, lang) {
    if (!voices || !voices.length) return null;
    const want = lang.toLowerCase().replace('_', '-');
    const want2 = want.slice(0, 2);

    return voices.find(v => (v.lang || '').toLowerCase().replace('_', '-') === want)
        || voices.find(v => (v.lang || '').toLowerCase().replace('_', '-').startsWith(want2))
        || null;
}

let speakToken = 0;

async function speak(text, lang) {
    if (!SPEECH || !text) return;

    const synth = window.speechSynthesis;
    const myToken = ++speakToken;

    synth.cancel();

    const finalLang = lang || speechLang(text);
    const code = (finalLang || 'en').slice(0, 2).toLowerCase();
    const blankWord = { en: 'blank', ko: '빈칸', zh: '空格', ja: '空欄' }[code] || 'blank';
    const spokenText = text.replace(/_+/g, blankWord);

    const voices = await loadVoices();

    if (myToken !== speakToken) return;

    const u = new SpeechSynthesisUtterance(spokenText);
    u.lang = finalLang;
    u.rate = 0.95;

    const v = pickVoice(voices, finalLang);
    if (v) u.voice = v;

    await new Promise(r => setTimeout(r, 60));
    if (myToken !== speakToken) return;

    synth.speak(u);
}


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

    if (SPEECH) {
        const readBtn = document.createElement('button');
        readBtn.type = 'button';
        readBtn.className = 'speak-passage';
        readBtn.textContent = '🔊 朗讀全文';
        readBtn.onclick = () => speak(text, qLang(q) || speechLang(text));
        panel.appendChild(readBtn);
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
    if (SPEECH) {
        const qSpeak = $('speak-question');
        if (qSpeak) {
            qSpeak.onclick = () =>
                speak(questionText(q), qLang(q) || speechLang(questionText(q)));
        }
    }
    $('counter').textContent = `Question ${index + 1} / ${quiz.length}`;
    $('bar').style.width = `${((index + 1) / quiz.length) * 100}%`;

    const score = answers.reduce(
        (n, a, i) => n + (a === quiz[i].answer),
        0
    );

    $('score').textContent = `Score: ${score} / ${quiz.length}`;
    $('options').innerHTML = '';

    q.options.forEach((text, i) => {
        const row = document.createElement('div');
        row.className = 'option-row';

        const b = document.createElement('button');
        b.className = 'option';
        b.type = 'button';
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

        row.appendChild(b);

        if (SPEECH) {
            const speakOpt = document.createElement('button');
            speakOpt.type = 'button';
            speakOpt.className = 'speak-btn';
            speakOpt.textContent = '🔊';
            speakOpt.setAttribute('aria-label', `朗讀選項 ${l.textContent}`);
            speakOpt.onclick = e => {
                e.stopPropagation();
                speak(text, qLang(q) || speechLang(text));
            };
            row.appendChild(speakOpt);
        }

        $('options').appendChild(row);
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

    // 提早把語音清單熱起來，第一次按朗讀就不用等
    if (SPEECH) loadVoices();

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
    init().catch(error => window.quizLoader.fail(error));
}
