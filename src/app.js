let quiz = [],
    index = 0,
    answers = [];

const $ = id => document.getElementById(id);

const shuffle = a => {
    const b = [...a];
    for (let i = b.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [b[i], b[j]] = [b[j], b[i]];
    }
    return b;
};

const chapterKey = q => `${q.chapter} ${q.chapterName}`;

function updateCategories() {
    const c = $('chapter').value,
        p = $('category').value;

    const pool = c === 'all'
        ? questions
        : questions.filter(q => chapterKey(q) === c);

    const tags = [...new Set(pool.map(q => q.tag))].sort();

    $('category').innerHTML = '<option value="all">All Categories</option>';

    tags.forEach(t => {
        const o = document.createElement('option');
        o.value = o.textContent = t;
        $('category').appendChild(o);
    });

    $('category').value = tags.includes(p) ? p : 'all';
}

function makeQuiz() {
    const c = $('chapter').value,
        t = $('category').value;

    let pool = questions.filter(q =>
        (c === 'all' || chapterKey(q) === c) &&
        (t === 'all' || q.tag === t)
    );

    pool = shuffle(pool).map(q => {
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

function render() {
    if (!quiz.length) {
        $('tag').textContent = 'No Questions';
        $('question').textContent =
            'There are no questions matching the current criteria. Please choose another chapter or category.';
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

    $('tag').textContent = `${q.chapter} ${q.chapterName} | ${q.tag}`;
    $('question').textContent = q.sentence;
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
        l.textContent = 'ABCD'[i];

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
            `${picked === q.answer ? 'Correct!' : 'Incorrect.'} ${q.exp}`;
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

    localStorage.removeItem('englishQuizState');
}

function save() {
    if (quiz.length) {
        localStorage.setItem(
            'englishQuizState',
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
            localStorage.getItem('englishQuizState')
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

function init() {
    [...new Set(questions.map(chapterKey))]
        .sort((a, b) =>
            a.localeCompare(b, undefined, {
                numeric: true
            })
        )
        .forEach(c => {
            const o = document.createElement('option');
            o.value = o.textContent = c;
            $('chapter').appendChild(o);
        });

    $('chapter').onchange = () => {
        updateCategories();
        makeQuiz();
    };

    $('category').onchange = makeQuiz;
    $('size').onchange = makeQuiz;

    updateCategories();

    if (!restore()) makeQuiz();
}

if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', init, {
        once: true
    });
} else {
    init();
}