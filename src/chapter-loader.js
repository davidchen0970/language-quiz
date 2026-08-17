(async function loadAllChapters() {
  const status = document.getElementById('loader-status');

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.onload = resolve;
      script.onerror = () => reject(new Error(`Unable to load: ${src}`));
      document.head.appendChild(script);
    });
  }

  try {
    await loadScript('src/data/questions.js');

    // Live Server、GitHub Pages 和一般靜態伺服器皆使用 manifest。
    const response = await fetch('src/data/chapters/manifest.json', {
      cache: 'no-store'
    });

    if (!response.ok) {
      throw new Error(`Unable to read chapter manifest: HTTP ${response.status}`);
    }

    const files = await response.json();
    const chapterFiles = files.filter(file =>
      typeof file === 'string' && file.toLowerCase().endsWith('.js')
    );

    for (const file of chapterFiles) {
      await loadScript(`src/data/chapters/${file}`);
    }

    await loadScript('src/app.js');
    if (status) status.remove();
  } catch (error) {
    console.error(error);
    if (status) {
      status.textContent = 'Question data failed to load. Run python3 tools/generate_manifest.py after changing chapter files.';
      status.style.color = '#be123c';
    }
  }
})();
