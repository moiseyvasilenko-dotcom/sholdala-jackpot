(() => {
  'use strict';

  const STORAGE_KEY = 'sholdala-jackpot-state-v1';
  const $ = selector => document.querySelector(selector);
  const $$ = selector => [...document.querySelectorAll(selector)];

  const state = {
    participants: [],
    task: 'Мыть посуду',
    sound: true,
    spinning: false,
    winner: null
  };

  const els = {
    setupView: $('#setupView'), gameView: $('#gameView'), grid: $('#participantGrid'),
    empty: $('#emptyState'), counter: $('#activeCounter'), cameraInput: $('#cameraInput'),
    galleryInput: $('#galleryInput'), cameraButton: $('#cameraButton'), galleryButton: $('#galleryButton'),
    taskInput: $('#taskInput'), taskChips: $('#taskChips'), startButton: $('#startButton'),
    setupHint: $('#setupHint'), gameTask: $('#gameTask'), spinButton: $('#spinButton'),
    status: $('#statusDisplay'), poolCount: $('#poolCount'), winnerPanel: $('#winnerPanel'),
    winnerImage: $('#winnerImage'), winnerName: $('#winnerName'), winnerTask: $('#winnerTask'),
    soundButton: $('#soundButton'), toast: $('#toast'), confetti: $('#confetti')
  };

  function loadState() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (saved?.participants) state.participants = saved.participants;
      if (saved?.task) state.task = saved.task;
      if (typeof saved?.sound === 'boolean') state.sound = saved.sound;
    } catch (_) { /* start clean if storage is unavailable */ }
  }

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        participants: state.participants,
        task: state.task,
        sound: state.sound
      }));
    } catch (_) {
      showToast('На устройстве закончилось место для фотографий');
    }
  }

  function uid() {
    return `${Date.now().toString(36)}-${crypto.getRandomValues(new Uint32Array(1))[0].toString(36)}`;
  }

  function activeParticipants(includeExcluded = false) {
    return state.participants.filter(person => person.active && (includeExcluded || !person.excluded));
  }

  function pluralPeople(number) {
    const mod10 = number % 10, mod100 = number % 100;
    if (mod10 === 1 && mod100 !== 11) return `${number} участник`;
    if ([2, 3, 4].includes(mod10) && ![12, 13, 14].includes(mod100)) return `${number} участника`;
    return `${number} участников`;
  }

  function renderParticipants() {
    els.grid.replaceChildren();
    els.empty.hidden = state.participants.length > 0;
    els.grid.hidden = state.participants.length === 0;

    state.participants.forEach(person => {
      const card = document.createElement('article');
      card.className = `participant-card${person.active ? '' : ' inactive'}`;
      card.dataset.id = person.id;

      const image = document.createElement('img');
      image.className = 'participant-photo';
      image.src = person.image;
      image.alt = person.name;

      const toggle = document.createElement('button');
      toggle.className = 'participant-toggle';
      toggle.type = 'button';
      toggle.textContent = person.active ? '✓' : '○';
      toggle.title = person.active ? 'Не участвует сегодня' : 'Добавить в игру';
      toggle.addEventListener('click', () => {
        person.active = !person.active;
        if (!person.active) person.excluded = false;
        saveState(); renderParticipants();
      });

      const actions = document.createElement('div');
      actions.className = 'participant-actions';
      const remove = document.createElement('button');
      remove.type = 'button'; remove.textContent = '×'; remove.title = 'Удалить';
      remove.addEventListener('click', () => {
        state.participants = state.participants.filter(item => item.id !== person.id);
        saveState(); renderParticipants();
      });
      actions.append(remove);

      const name = document.createElement('input');
      name.className = 'participant-name';
      name.value = person.name;
      name.maxLength = 30;
      name.setAttribute('aria-label', 'Имя участника');
      name.addEventListener('input', () => {
        person.name = name.value.trimStart();
        image.alt = person.name;
        saveState();
      });
      name.addEventListener('blur', () => {
        if (!person.name.trim()) person.name = 'Без имени';
        name.value = person.name;
        saveState();
      });

      card.append(image, toggle, actions, name);
      els.grid.append(card);
    });

    const count = activeParticipants(true).length;
    els.counter.textContent = `${count} выбрано`;
    els.startButton.disabled = count < 2;
    els.setupHint.textContent = count < 2
      ? 'Нужно выбрать минимум двух участников'
      : `${pluralPeople(count)} готовы испытать удачу`;
  }

  async function imageFileToSquare(file) {
    const dataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
    const image = await new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = dataUrl;
    });
    const size = 520;
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext('2d');
    const sourceSize = Math.min(image.naturalWidth, image.naturalHeight);
    const sx = (image.naturalWidth - sourceSize) / 2;
    const sy = (image.naturalHeight - sourceSize) / 2;
    ctx.drawImage(image, sx, sy, sourceSize, sourceSize, 0, 0, size, size);
    return canvas.toDataURL('image/jpeg', 0.8);
  }

  async function addFiles(files) {
    const images = [...files].filter(file => file.type.startsWith('image/'));
    if (!images.length) return;
    showToast(images.length > 1 ? `Обрабатываю ${images.length} фото…` : 'Обрабатываю фото…');
    let added = 0;
    for (const file of images) {
      try {
        const image = await imageFileToSquare(file);
        state.participants.push({
          id: uid(), name: `Участник ${state.participants.length + 1}`,
          image, active: true, excluded: false
        });
        added += 1;
      } catch (_) {
        showToast(`Не удалось прочитать ${file.name}`);
      }
    }
    saveState(); renderParticipants();
    if (added) {
      showToast(added === 1 ? 'Участник добавлен — подпиши имя' : `${added} участников добавлено`);
      requestAnimationFrame(() => els.grid.lastElementChild?.querySelector('input')?.focus());
    }
  }

  function createDemoParticipants() {
    const demo = [
      ['Карина', '#c75055'], ['Моисей', '#3f8d7c'], ['Актан', '#536db1'], ['Айбек', '#c18a2e']
    ];
    state.participants = demo.map(([name, color]) => ({
      id: uid(), name, active: true, excluded: false,
      image: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 520 520"><rect width="520" height="520" fill="${color}"/><circle cx="260" cy="205" r="105" fill="#f2c9a5"/><path d="M70 520c16-145 96-210 190-210s174 65 190 210" fill="#f6ead5"/><circle cx="220" cy="195" r="9" fill="#38251f"/><circle cx="300" cy="195" r="9" fill="#38251f"/><path d="M220 250q40 30 80 0" fill="none" stroke="#8b413e" stroke-width="9" stroke-linecap="round"/><text x="260" y="420" text-anchor="middle" font-family="Arial" font-size="72" font-weight="bold" fill="#4a2528">${name[0]}</text></svg>`)}`
    }));
    saveState();
    renderParticipants();
    showToast('Демо-команда готова — можно крутить');
  }

  function setTask(task) {
    state.task = task.trim().slice(0, 70) || 'Счастливое задание';
    els.taskInput.value = state.task;
    $$('#taskChips button').forEach(button => button.classList.toggle('selected', button.dataset.task === state.task));
    saveState();
  }

  function showGame() {
    if (activeParticipants(true).length < 2) return;
    state.participants.forEach(person => { if (person.active) person.excluded = false; });
    saveState();
    els.setupView.hidden = true;
    els.gameView.hidden = false;
    els.gameTask.textContent = state.task;
    els.winnerPanel.classList.remove('open');
    fillInitialReels();
    updateGameControls();
    window.scrollTo({ top: 0, behavior: 'instant' });
  }

  function showSetup() {
    if (state.spinning) return;
    els.gameView.hidden = true;
    els.setupView.hidden = false;
    els.winnerPanel.classList.remove('open');
    renderParticipants();
    window.scrollTo({ top: 0, behavior: 'instant' });
  }

  function secureIndex(length) {
    if (length <= 0) throw new Error('Empty pool');
    const range = 0x100000000;
    const limit = Math.floor(range / length) * length;
    const draw = new Uint32Array(1);
    do crypto.getRandomValues(draw); while (draw[0] >= limit);
    return draw[0] % length;
  }

  function securePick(items) { return items[secureIndex(items.length)]; }

  function makeSymbol(person, height) {
    const symbol = document.createElement('div');
    symbol.className = 'reel-symbol';
    symbol.style.height = `${height}px`;
    symbol.style.width = '100%';
    const image = document.createElement('img');
    image.src = person.image; image.alt = person.name; image.draggable = false;
    const label = document.createElement('span');
    label.textContent = person.name;
    symbol.append(image, label);
    return symbol;
  }

  function setReel(strip, people, finalPerson = null, symbolCount = 1) {
    const windowElement = strip.parentElement;
    const height = windowElement.clientHeight || 220;
    strip.replaceChildren();
    for (let i = 0; i < symbolCount; i += 1) {
      const person = (finalPerson && i === symbolCount - 1) ? finalPerson : securePick(people);
      strip.append(makeSymbol(person, height));
    }
    strip.style.transform = 'translateY(0)';
    return { height, count: symbolCount };
  }

  function fillInitialReels() {
    const people = activeParticipants();
    if (!people.length) return;
    [0, 1, 2].forEach(index => setReel($(`#reel${index}`), people, null, 1));
  }

  function animateReel(index, people, winner, duration) {
    return new Promise(resolve => {
      const strip = $(`#reel${index}`);
      const windowElement = strip.parentElement;
      const symbols = 20 + index * 4;
      const { height } = setReel(strip, people, winner, symbols);
      windowElement.classList.add('spinning');
      strip.style.transition = 'none';
      strip.style.transform = 'translateY(0)';
      void strip.offsetHeight;
      strip.style.transition = `transform ${duration}ms cubic-bezier(.12,.62,.12,1)`;
      strip.style.transform = `translateY(-${(symbols - 1) * height}px)`;
      const finish = () => {
        windowElement.classList.remove('spinning');
        strip.removeEventListener('transitionend', finish);
        resolve();
      };
      strip.addEventListener('transitionend', finish, { once: true });
      setTimeout(finish, duration + 150);
    });
  }

  let audioContext = null;
  function getAudio() {
    if (!state.sound) return null;
    audioContext ||= new (window.AudioContext || window.webkitAudioContext)();
    if (audioContext.state === 'suspended') audioContext.resume();
    return audioContext;
  }

  function tone(frequency, duration, volume = 0.035, type = 'square', delay = 0) {
    const ctx = getAudio();
    if (!ctx) return;
    const start = ctx.currentTime + delay;
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = type; oscillator.frequency.setValueAtTime(frequency, start);
    gain.gain.setValueAtTime(volume, start);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    oscillator.connect(gain).connect(ctx.destination);
    oscillator.start(start); oscillator.stop(start + duration);
  }

  function spinSound() {
    tone(72, 3.9, 0.025, 'sawtooth');
    for (let i = 0; i < 28; i += 1) tone(240 + (i % 3) * 25, 0.035, 0.018, 'square', i * .105);
    [2.65, 3.2, 3.75].forEach(delay => tone(125, .13, .06, 'square', delay));
  }

  function winSound() {
    [523, 659, 784, 1047].forEach((frequency, index) => tone(frequency, .42, .06, 'triangle', index * .12));
  }

  async function spin() {
    const people = activeParticipants();
    if (state.spinning) return;
    if (people.length < 2) {
      showToast('Верни участников или собери новый состав');
      return;
    }
    state.spinning = true;
    state.winner = securePick(people);
    els.spinButton.disabled = true;
    els.status.textContent = 'УДАЧА УЖЕ РЕШИЛА…';
    els.winnerPanel.classList.remove('open');
    spinSound();
    navigator.vibrate?.([35, 45, 35]);

    await Promise.all([
      animateReel(0, people, state.winner, 2700),
      animateReel(1, people, state.winner, 3250),
      animateReel(2, people, state.winner, 3800)
    ]);

    state.spinning = false;
    els.status.textContent = `ДЖЕКПОТ — ${state.winner.name.toUpperCase()}!`;
    winSound();
    navigator.vibrate?.([80, 60, 120, 60, 180]);
    showWinner();
  }

  function showWinner() {
    const winner = state.winner;
    if (!winner) return;
    els.winnerImage.src = winner.image;
    els.winnerImage.alt = winner.name;
    els.winnerName.textContent = winner.name;
    els.winnerTask.textContent = state.task;
    els.winnerPanel.classList.add('open');
    els.winnerPanel.setAttribute('aria-hidden', 'false');
    launchConfetti();
  }

  function closeWinner() {
    els.winnerPanel.classList.remove('open');
    els.winnerPanel.setAttribute('aria-hidden', 'true');
    updateGameControls();
  }

  function excludeWinner() {
    if (state.winner) state.winner.excluded = true;
    saveState(); closeWinner(); updateGameControls();
    showToast(`${state.winner.name} отдыхает следующий раунд`);
  }

  function resetRound() {
    state.participants.forEach(person => { person.excluded = false; });
    saveState(); updateGameControls(); fillInitialReels();
    showToast('Все снова участвуют');
  }

  function updateGameControls() {
    const count = activeParticipants().length;
    els.poolCount.textContent = pluralPeople(count);
    els.spinButton.disabled = state.spinning || count < 2;
    if (!state.spinning) els.status.textContent = count < 2 ? 'НУЖНО ВЕРНУТЬ УЧАСТНИКОВ' : 'ГОТОВЫ?';
  }

  function launchConfetti() {
    const canvas = els.confetti, ctx = canvas.getContext('2d');
    const ratio = Math.min(devicePixelRatio || 1, 2);
    canvas.width = innerWidth * ratio; canvas.height = innerHeight * ratio;
    ctx.scale(ratio, ratio);
    const colors = ['#ffd34e', '#e52b38', '#fff2b5', '#2ca978', '#4b9eed'];
    const pieces = Array.from({ length: 150 }, () => ({
      x: Math.random() * innerWidth, y: -20 - Math.random() * innerHeight * .45,
      vx: (Math.random() - .5) * 4, vy: 3 + Math.random() * 5,
      size: 5 + Math.random() * 8, color: colors[Math.floor(Math.random() * colors.length)],
      rotation: Math.random() * Math.PI, spin: (Math.random() - .5) * .22
    }));
    const start = performance.now();
    function frame(now) {
      ctx.clearRect(0, 0, innerWidth, innerHeight);
      pieces.forEach(piece => {
        piece.x += piece.vx; piece.y += piece.vy; piece.vy += .035; piece.rotation += piece.spin;
        ctx.save(); ctx.translate(piece.x, piece.y); ctx.rotate(piece.rotation); ctx.fillStyle = piece.color;
        ctx.fillRect(-piece.size / 2, -piece.size / 3, piece.size, piece.size * .65); ctx.restore();
      });
      if (now - start < 4300) requestAnimationFrame(frame); else ctx.clearRect(0, 0, innerWidth, innerHeight);
    }
    requestAnimationFrame(frame);
  }

  let toastTimer;
  function showToast(message) {
    els.toast.textContent = message;
    els.toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => els.toast.classList.remove('show'), 2400);
  }

  function buildBulbs() {
    const box = $('#topBulbs');
    const points = [];
    for (let x = 7; x <= 93; x += 7.2) points.push([x, 4], [x, 96]);
    for (let y = 16; y <= 84; y += 17) points.push([2, y], [98, y]);
    points.forEach(([x, y]) => {
      const bulb = document.createElement('i'); bulb.className = 'bulb';
      bulb.style.left = `calc(${x}% - 5px)`; bulb.style.top = `calc(${y}% - 5px)`;
      box.append(bulb);
    });
  }

  function bindEvents() {
    $('#demoButton').addEventListener('click', createDemoParticipants);
    els.cameraButton.addEventListener('click', () => els.cameraInput.click());
    els.galleryButton.addEventListener('click', () => els.galleryInput.click());
    els.cameraInput.addEventListener('change', async event => { await addFiles(event.target.files); event.target.value = ''; });
    els.galleryInput.addEventListener('change', async event => { await addFiles(event.target.files); event.target.value = ''; });
    els.taskChips.addEventListener('click', event => { if (event.target.dataset.task) setTask(event.target.dataset.task); });
    els.taskInput.addEventListener('input', () => setTask(els.taskInput.value));
    els.startButton.addEventListener('click', showGame);
    els.spinButton.addEventListener('click', spin);
    $('#backButton').addEventListener('click', showSetup);
    $('#homeButton').addEventListener('click', showSetup);
    $('#resetRoundButton').addEventListener('click', resetRound);
    $('#closeWinnerButton').addEventListener('click', closeWinner);
    $('#excludeWinnerButton').addEventListener('click', excludeWinner);
    $('#spinAgainButton').addEventListener('click', () => { closeWinner(); setTimeout(spin, 180); });
    els.soundButton.addEventListener('click', () => {
      state.sound = !state.sound; saveState();
      els.soundButton.textContent = state.sound ? '🔊' : '🔇';
      els.soundButton.setAttribute('aria-label', state.sound ? 'Выключить звук' : 'Включить звук');
      if (state.sound) tone(440, .1, .04, 'sine');
    });
    $('#fullscreenButton').addEventListener('click', async () => {
      try {
        if (!document.fullscreenElement) await document.documentElement.requestFullscreen();
        else await document.exitFullscreen();
      } catch (_) { showToast('Полный экран недоступен в этом браузере'); }
    });
  }

  loadState();
  buildBulbs();
  bindEvents();
  els.soundButton.textContent = state.sound ? '🔊' : '🔇';
  els.taskInput.value = state.task;
  $$('#taskChips button').forEach(button => button.classList.toggle('selected', button.dataset.task === state.task));
  renderParticipants();

  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  }
})();
