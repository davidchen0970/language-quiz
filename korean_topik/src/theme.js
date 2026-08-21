(() => {
  const storageKey = 'languageQuizTheme';
  const root = document.documentElement;

  const systemTheme = () => (
    window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  );

  const savedTheme = localStorage.getItem(storageKey);
  let theme = savedTheme === 'light' || savedTheme === 'dark'
    ? savedTheme
    : systemTheme();

  const applyTheme = (nextTheme) => {
    theme = nextTheme;
    root.dataset.theme = theme;

    const button = document.getElementById('theme-toggle');
    if (!button) return;

    const isDark = theme === 'dark';
    button.setAttribute('aria-pressed', String(isDark));
    button.setAttribute('aria-label', isDark ? '切換為亮色模式' : '切換為暗色模式');
    button.textContent = isDark ? '切換亮色' : '切換暗色';
  };

  const headerInner = document.querySelector('.header-inner');
  if (headerInner) {
    const button = document.createElement('button');
    button.id = 'theme-toggle';
    button.className = 'theme-toggle';
    button.type = 'button';
    button.addEventListener('click', () => {
      const nextTheme = theme === 'dark' ? 'light' : 'dark';
      localStorage.setItem(storageKey, nextTheme);
      applyTheme(nextTheme);
    });
    headerInner.appendChild(button);
  }

  applyTheme(theme);
})();
