(function createQuizLoader() {
    const status = document.getElementById('loader-status');
    const dataPath = 'src/data/chapters/';
    const loadedScripts = new Set();
    const loadedChapterFiles = new Set();

    let questionsReady = false;
    let manifestPromise = null;

    function setStatus(message, isError = false) {
        if (!status) return;
        status.textContent = message;
        status.style.color = isError ? '#be123c' : '#64748b';
    }

    function loadScript(src) {
        if (loadedScripts.has(src)) return Promise.resolve();

        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = src;
            script.onload = () => {
                loadedScripts.add(src);
                resolve();
            };
            script.onerror = () => reject(new Error(`Unable to load: ${src}`));
            document.head.appendChild(script);
        });
    }

    async function ensureQuestionContainer() {
        if (questionsReady) return;
        await loadScript('src/data/questions.js');
        questionsReady = true;
    }

    async function getManifest() {
        if (!manifestPromise) {
            manifestPromise = fetch(`${dataPath}manifest.json`, {
                cache: 'no-store'
            })
                .then(response => {
                    if (response.status === 404) return [];
                    if (!response.ok) {
                        throw new Error(`Unable to read chapter manifest: HTTP ${response.status}`);
                    }
                    return response.json();
                })
                .then(files => files.filter(file =>
                    typeof file === 'string' && file.toLowerCase().endsWith('.js')
                ));
        }

        return manifestPromise;
    }

    function normalizeLoadedQuestions(startIndex, file) {
        const loaded = questions.splice(startIndex);
        const normalized = [];

        loaded.forEach((item, groupIndex) => {
            if (!Array.isArray(item.questions)) {
                normalized.push({ ...item, __sourceFile: item.__sourceFile || file });
                return;
            }

            const { questions: childQuestions, ...shared } = item;
            const groupId = `${file}:${groupIndex}`;

            childQuestions.forEach(child => {
                normalized.push({
                    ...shared,
                    ...child,
                    __passageGroup: groupId,
                    __sourceFile: child.__sourceFile || shared.__sourceFile || file
                });
            });
        });

        questions.push(...normalized);
    }

    async function loadChapterFile(file) {
        if (loadedChapterFiles.has(file)) return;

        await ensureQuestionContainer();

        const before = questions.length;
        await loadScript(`${dataPath}${file}`);
        normalizeLoadedQuestions(before, file);
        loadedChapterFiles.add(file);
    }

    window.quizLoader = {
        async init() {
            setStatus('Loading chapter list...');
            await ensureQuestionContainer();
            return getManifest();
        },

        async loadChapter(file) {
            setStatus('Loading chapter...');
            await loadChapterFile(file);
        },

        async loadAll() {
            setStatus('Loading all chapters...');

            const files = await getManifest();
            for (const file of files) {
                await loadChapterFile(file);
            }
        },

        finish() {
            if (status) status.remove();
        },

        fail(error) {
            console.error(error);
            setStatus(
                'Question data failed to load. Run python3 tools/generate_manifest.py after changing chapter files.',
                true
            );
        }
    };

    loadScript('src/app.js').catch(error => window.quizLoader.fail(error));
})();
