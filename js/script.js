/* ============================================================
   For Piu — an auto-advancing story. Every chapter after the gate
   plays itself through; she only ever has to act at three points:
   open the letter, blow out the candle, and scratch each card.
   ============================================================ */

(() => {
  const root = document.documentElement;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = id => document.getElementById(id);

  /* ================= Theme ================= */
  const themeToggle = $('themeToggle');
  const sunIcon = themeToggle.querySelector('.icon-sun');
  const moonIcon = themeToggle.querySelector('.icon-moon');
  function applyTheme(theme){
    root.setAttribute('data-theme', theme);
    localStorage.setItem('piu-theme', theme);
    sunIcon.hidden = theme === 'dark';
    moonIcon.hidden = theme !== 'dark';
  }
  applyTheme(localStorage.getItem('piu-theme') ||
    (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'));
  themeToggle.addEventListener('click', () =>
    applyTheme(root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark'));

  /* ================= Audio ================= */
  const bgm = $('bgm');
  const bdaySong = $('bdaySong');
  const musicToggle = $('musicToggle');
  const musicOnIcon = musicToggle.querySelector('.icon-music-on');
  const musicOffIcon = musicToggle.querySelector('.icon-music-off');
  let musicAvailable = true, musicPlaying = false;

  bgm.addEventListener('error', () => {
    musicAvailable = false;
    musicToggle.title = 'Add assets/audio/song.mp3 to enable music';
    musicToggle.style.opacity = '.4';
  });
  function setMusicIcon(p){ musicOnIcon.hidden = !p; musicOffIcon.hidden = p; }
  function tryPlayMusic(){
    if (!musicAvailable) return;
    bgm.volume = 0.3;
    bgm.play().then(() => { musicPlaying = true; setMusicIcon(true); }).catch(()=>{});
  }
  musicToggle.addEventListener('click', () => {
    if (!musicAvailable) return;
    if (musicPlaying){ bgm.pause(); musicPlaying = false; }
    else { bgm.volume = 0.3; bgm.play().catch(()=>{}); musicPlaying = true; }
    setMusicIcon(musicPlaying);
  });

  const SONG_VOL = 0.85, SONG_DUCK = 0.28;
  let songWasBgm = false, songOn = false;
  function startBirthdaySong(){
    if (songOn) return;
    songOn = true;
    songWasBgm = musicPlaying;
    if (songWasBgm) bgm.pause();
    bdaySong.loop = true;
    bdaySong.volume = SONG_VOL;
    try { bdaySong.currentTime = 0; } catch(e){}
    const p = bdaySong.play();
    if (p && p.catch) p.catch(() => {});
  }
  function stopBirthdaySong(){
    if (!songOn) return;
    songOn = false;
    bdaySong.loop = false;
    bdaySong.pause();
    try { bdaySong.currentTime = 0; } catch(e){}
    if (songWasBgm) bgm.play().catch(()=>{});
  }
  function speak(text){
    try {
      if (!('speechSynthesis' in window)) return;
      const u = new SpeechSynthesisUtterance(text);
      u.rate = 0.88; u.pitch = 1.05;
      u.onstart = () => { if (songOn) bdaySong.volume = SONG_DUCK; };
      u.onend   = () => { if (songOn) bdaySong.volume = SONG_VOL; };
      u.onerror = () => { if (songOn) bdaySong.volume = SONG_VOL; };
      window.speechSynthesis.speak(u);
    } catch(e){}
  }

  /* ================= Living background: parallax + cursor glow ================= */
  if (!reduced){
    const aurora = document.querySelector('.aurora');
    let ticking = false;
    function updateParallax(){
      const y = window.scrollY || window.pageYOffset;
      aurora.style.setProperty('--parallaxY', Math.min(60, y * 0.08).toFixed(1) + 'px');
      ticking = false;
    }
    window.addEventListener('scroll', () => {
      if (!ticking){ ticking = true; requestAnimationFrame(updateParallax); }
    }, { passive:true });
  }
  const cursorGlow = $('cursorGlow');
  if (!reduced && window.matchMedia('(pointer:fine)').matches){
    let gx = innerWidth/2, gy = innerHeight/2, tx = gx, ty = gy;
    window.addEventListener('mousemove', e => {
      tx = e.clientX; ty = e.clientY;
      cursorGlow.classList.add('active');
    });
    document.addEventListener('mouseleave', () => cursorGlow.classList.remove('active'));
    (function trail(){
      gx += (tx - gx) * 0.12;
      gy += (ty - gy) * 0.12;
      cursorGlow.style.transform = `translate(${gx}px, ${gy}px) translate(-50%,-50%)`;
      requestAnimationFrame(trail);
    })();
  }

  /* ================= Balloons ================= */
  const balloonsEl = $('balloons');
  const balloonColors = ['#FF6E9C','#F0CE86','#A98BE0','#D14D7A','#F3B8C7','#7B5EA7'];
  let balloonTimer = null;
  function spawnBalloon(fast){
    const b = document.createElement('span');
    b.className = 'balloon';
    const color = balloonColors[Math.floor(Math.random()*balloonColors.length)];
    const scale = 0.65 + Math.random()*0.85;
    b.style.background = `radial-gradient(circle at 34% 28%, ${color}, ${color} 42%, rgba(0,0,0,.25))`;
    b.style.color = color;
    b.style.left = Math.random()*100 + 'vw';
    b.style.width = (46*scale).toFixed(1)+'px';
    b.style.height = (58*scale).toFixed(1)+'px';
    b.style.setProperty('--sway', (Math.random()*90-45)+'px');
    b.style.setProperty('--spin', (Math.random()*24-12)+'deg');
    const dur = fast ? (5+Math.random()*4) : (13+Math.random()*10);
    b.style.animationDuration = dur+'s';
    balloonsEl.appendChild(b);
    setTimeout(() => b.remove(), dur*1000+200);
  }
  function startBalloons(ms){
    if (balloonTimer) clearInterval(balloonTimer);
    balloonTimer = setInterval(() => spawnBalloon(false), ms);
  }

  /* ================= Floating dust ================= */
  const floatersEl = $('floaters');
  const marks = ['♥','✦','❀'];
  function spawnFloater(){
    const isDust = Math.random() > 0.35;
    const s = document.createElement('span');
    s.className = 'floater ' + (isDust ? 'dust' : 'mark');
    const size = isDust ? 3+Math.random()*5 : 10+Math.random()*10;
    s.style.left = Math.random()*100+'vw';
    if (isDust){ s.style.width = size+'px'; s.style.height = size+'px'; }
    else { s.textContent = marks[Math.floor(Math.random()*marks.length)]; s.style.fontSize = size+'px'; }
    s.style.setProperty('--peak-op', isDust ? '.6' : '.32');
    s.style.setProperty('--drift-x', (Math.random()*100-50)+'px');
    const dur = 14+Math.random()*12;
    s.style.animationDuration = dur+'s';
    floatersEl.appendChild(s);
    setTimeout(() => s.remove(), dur*1000);
  }
  if (!reduced){
    setInterval(spawnFloater, 700);
    for (let i=0;i<10;i++) setTimeout(spawnFloater, i*260);
  }

  /* ================= Letter splitting (celebration title) ================= */
  function splitLetters(el, baseDelay = 0, step = 55){
    const text = el.dataset.text || '';
    el.innerHTML = '';
    const words = text.split(' ');
    let i = 0;
    words.forEach((word, wi) => {
      const wordEl = document.createElement('span');
      wordEl.className = 'word';
      [...word].forEach(chr => {
        const span = document.createElement('span');
        span.className = 'ch';
        span.textContent = chr;
        span.style.animationDelay = (baseDelay + i*step)+'ms';
        i++;
        wordEl.appendChild(span);
      });
      el.appendChild(wordEl);
      if (wi < words.length-1){
        const sp = document.createElement('span');
        sp.className = 'space';
        el.appendChild(sp);
        i++;
      }
    });
  }
  splitLetters($('celTitle'), 350, 55);

  /* ================= Confetti (defined early — everything else calls it) ================= */
  const canvas = $('confettiCanvas');
  const ctx = canvas.getContext('2d');
  let particles = [], rafId = null;
  function resizeCanvas(){ canvas.width = innerWidth; canvas.height = innerHeight; }
  addEventListener('resize', resizeCanvas);
  resizeCanvas();
  const palette = ['#FF6E9C','#F0CE86','#A98BE0','#D14D7A','#FFD98E','#F3B8C7','#FFFFFF'];
  const SHAPES = ['rect','star','heart','ribbon'];
  function makeParticle(x,y,angle,speed){
    return {
      x, y,
      vx: Math.cos(angle)*speed, vy: Math.sin(angle)*speed,
      size: 4+Math.random()*7,
      color: palette[Math.floor(Math.random()*palette.length)],
      shape: SHAPES[Math.floor(Math.random()*SHAPES.length)],
      life: 0, maxLife: 110+Math.random()*70,
      spin: Math.random()*360, vspin: (Math.random()-0.5)*14,
      wob: Math.random()*Math.PI*2
    };
  }
  function burst(x,y,count){
    if (reduced) return;
    for (let i=0;i<count;i++){
      particles.push(makeParticle(x, y, Math.random()*Math.PI*2, 2+Math.random()*9));
    }
    if (!rafId) animate();
  }
  function cannons(){
    if (reduced) return;
    const h = canvas.height;
    for (let i=0;i<70;i++){
      particles.push(makeParticle(0, h, -Math.PI/3 + (Math.random()-0.5)*0.6, 12+Math.random()*12));
      particles.push(makeParticle(canvas.width, h, -Math.PI*2/3 + (Math.random()-0.5)*0.6, 12+Math.random()*12));
    }
    if (!rafId) animate();
  }
  function drawStar(size){
    ctx.beginPath(); ctx.moveTo(0,-size);
    ctx.lineTo(size*0.28,-size*0.28); ctx.lineTo(size,0);
    ctx.lineTo(size*0.28,size*0.28);  ctx.lineTo(0,size);
    ctx.lineTo(-size*0.28,size*0.28); ctx.lineTo(-size,0);
    ctx.lineTo(-size*0.28,-size*0.28); ctx.closePath(); ctx.fill();
  }
  function drawHeart(size){
    const s = size/8;
    ctx.beginPath(); ctx.moveTo(0,3*s);
    ctx.bezierCurveTo(-6*s,-2*s,-3*s,-7*s,0,-3*s);
    ctx.bezierCurveTo(3*s,-7*s,6*s,-2*s,0,3*s);
    ctx.closePath(); ctx.fill();
  }
  function animate(){
    ctx.clearRect(0,0,canvas.width,canvas.height);
    particles = particles.filter(p => p.life < p.maxLife && p.y < canvas.height+60);
    particles.forEach(p => {
      p.vy += 0.22; p.vx *= 0.992; p.wob += 0.1;
      p.x += p.vx + Math.sin(p.wob)*0.6;
      p.y += p.vy; p.spin += p.vspin; p.life++;
      ctx.globalAlpha = Math.max(0, Math.min(1, (1-p.life/p.maxLife)*1.4));
      ctx.fillStyle = p.color;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.spin*Math.PI/180);
      if (p.shape === 'rect')        ctx.fillRect(-p.size/2,-p.size/2,p.size,p.size*0.55);
      else if (p.shape === 'ribbon') ctx.fillRect(-p.size/6,-p.size,p.size/3,p.size*2);
      else if (p.shape === 'star')   drawStar(p.size*0.75);
      else                            drawHeart(p.size*1.5);
      ctx.restore();
      ctx.globalAlpha = 1;
    });
    if (particles.length){ rafId = requestAnimationFrame(animate); }
    else { ctx.clearRect(0,0,canvas.width,canvas.height); rafId = null; }
  }

  /* ================= 2 · Celebration: 22 spins into 23 ================= */
  function countTo(el, to, duration, done){
    if (reduced){ el.textContent = to; if (done) done(); return; }
    const start = performance.now();
    (function frame(now){
      const t = Math.min(1, (now-start)/duration);
      el.textContent = Math.round((1 - Math.pow(1-t,3)) * to);
      if (t < 1) requestAnimationFrame(frame);
      else { el.textContent = to; if (done) done(); }
    })(performance.now());
  }

  function runAgeSequence(){
    const badge = $('ageBadge');
    const caption = $('ageCaption'), btn = $('celContinue');

    if (reduced){
      badge.classList.add('rolled','landed');
      caption.classList.add('show');
      btn.classList.add('show');
      return;
    }
    setTimeout(() => { badge.classList.add('rolling', 'rolled'); }, 2000);
    setTimeout(() => {
      badge.classList.remove('rolling');
      badge.classList.add('landed');
      const r = badge.getBoundingClientRect();
      burst(r.left + r.width/2, r.top + r.height/2, 70);
      for (let i=0;i<14;i++) setTimeout(() => spawnBalloon(true), i*90);
    }, 4050);
    setTimeout(() => caption.classList.add('show'), 4700);
    setTimeout(() => btn.classList.add('show'), 5150);
  }

  /* ================= The chain: gate → celebrate → transitions → chapters ================= */
  const gate = $('gate'), celebrate = $('celebrate'), mainSlides = [
    $('journeySlide'), $('cakeSlide'), $('cardsSlide'), $('finalSlide')
  ];

  $('openGate').addEventListener('click', () => {
    gate.classList.add('closing');
    tryPlayMusic();
    setTimeout(() => {
      gate.hidden = true;
      celebrate.hidden = false;
      cannons();
      setTimeout(() => burst(innerWidth/2, innerHeight*0.35, 90), 260);
      setTimeout(cannons, 900);
      for (let i=0;i<26;i++) setTimeout(() => spawnBalloon(true), i*90);
      startBalloons(1400);
      runAgeSequence();
      armCelebrationAdvance();
    }, 650);
  });

  // clicking the button = skip; otherwise it moves on by itself once
  // she's had time to read the 23 and the caption
  let celAdvance = null;
  function armCelebrationAdvance(){
    celAdvance = () => {
      if (!celAdvance) return;
      celAdvance = null;
      celebrate.classList.add('fading');
      burst(innerWidth/2, innerHeight*0.5, 50);
      setTimeout(() => {
        celebrate.hidden = true;
        celebrate.classList.remove('fading');
        startBalloons(5200);
        goGrowingUp();
      }, 620);
    };
    setTimeout(() => { if (celAdvance) celAdvance(); }, 10500);
  }
  $('celContinue').addEventListener('click', () => { if (celAdvance) celAdvance(); });

  $('todayDate').textContent = new Date().toLocaleDateString('en-US',
    { year:'numeric', month:'long', day:'numeric' });

  /* ================= 3 · Generic transition screen (reused between chapters) ================= */
  const transitionEl = $('transition');
  const tLines = Array.from(transitionEl.querySelectorAll('.int-line'));
  const tRule = transitionEl.querySelector('.int-rule');
  const tHint = transitionEl.querySelector('.int-hint');
  const tSkip = $('transSkip');
  let transTimers = [], transAdvance = null;

  function clearTransTimers(){ transTimers.forEach(clearTimeout); transTimers = []; }

  function showTransition(lines, hintText, onNext){
    clearTransTimers();
    transitionEl.classList.remove('fading');
    tLines.forEach((el, i) => {
      const txt = lines[i] || '';
      el.textContent = txt;
      el.style.display = txt ? '' : 'none';
      el.classList.remove('show');
    });
    tRule.classList.remove('show');
    tHint.textContent = hintText || '';
    tHint.classList.remove('show');
    transitionEl.hidden = false;

    transAdvance = () => {
      if (!transAdvance) return;
      transAdvance = null;
      clearTransTimers();
      transitionEl.classList.add('fading');
      transTimers.push(setTimeout(() => {
        transitionEl.hidden = true;
        transitionEl.classList.remove('fading');
        onNext();
      }, 820));
    };

    if (reduced){
      tLines.forEach(l => { if (l.style.display !== 'none') l.classList.add('show'); });
      tRule.classList.add('show'); tHint.classList.add('show');
      transTimers.push(setTimeout(() => transAdvance(), 2200));
      return;
    }

    // tuned so it never takes longer than ~5-6s no matter how many lines
    // a chapter has — a long silent wait reads as "broken", not romantic
    let delay = 450;
    const visible = tLines.filter(l => l.style.display !== 'none');
    visible.forEach((l, i) => {
      transTimers.push(setTimeout(() => l.classList.add('show'), delay));
      delay += (i === 0 ? 1300 : 1150);
    });
    transTimers.push(setTimeout(() => tRule.classList.add('show'), delay));
    delay += 450;
    transTimers.push(setTimeout(() => tHint.classList.add('show'), delay));
    delay += 1300;
    transTimers.push(setTimeout(() => transAdvance(), delay));
  }
  tSkip.addEventListener('click', () => { if (transAdvance) transAdvance(); });
  transitionEl.addEventListener('click', e => {
    if (e.target.closest('.int-skip')) return;
    if (transAdvance) transAdvance();
  });

  function goGrowingUp(){
    showTransition(
      ['Growing up is not easy.',
       "Somehow you've made it look effortless —",
       'twenty-three years of quietly becoming\nsomeone entirely extraordinary.'],
      'let me show you',
      goJourney
    );
  }

  /* ================= 4 · Her journey — auto-playing zig-zag slideshow ================= */
  function runJourneySlide(onNext){
    const slide = $('journeySlide');
    const chapters = Array.from(slide.querySelectorAll('.js-chapter'));
    const dots = Array.from(slide.querySelectorAll('.js-dot'));
    const skip = $('jsSkip');
    let idx = -1, timers = [], done = false;

    function clear(){ timers.forEach(clearTimeout); timers = []; }
    function showChapter(i){
      chapters.forEach((c, ci) => c.classList.toggle('active', ci === i));
      dots.forEach((d, di) => d.classList.toggle('active', di === i));
    }
    function finish(){
      if (done) return;
      done = true;
      clear();
      slide.classList.add('fading');
      timers.push(setTimeout(() => {
        slide.hidden = true;
        slide.classList.remove('fading');
        onNext();
      }, 700));
    }
    function next(){
      idx++;
      if (idx >= chapters.length){ finish(); return; }
      showChapter(idx);
      timers.push(setTimeout(next, idx === 0 ? 3800 : 3500));
    }

    skip.onclick = finish;
    if (reduced){ showChapter(chapters.length - 1); timers.push(setTimeout(finish, 1500)); return; }
    next();
  }
  function goJourney(){
    $('journeySlide').hidden = false;
    runJourneySlide(goCutCake);
  }

  function goCutCake(){
    showTransition(
      ['Now, it’s time to cut the cake.',
       'twenty-three candles, one very important wish.',
       ''],
      'make it count',
      goCakeSlide
    );
  }

  /* ================= 5 · Make a wish ================= */
  const cakeStage = $('cakeStage'), cakeBtn = $('cakeBtn');
  const cakeHint = $('cakeHint'), cakeSub = $('cakeSub');
  const cakeBlessing = $('cakeBlessing');
  const wishPopup = $('wishPopup'), wishPopupText = $('wishPopupText');
  let blown = false, wishOnDone = null;

  function showPopup(text){
    wishPopupText.textContent = text;
    wishPopup.hidden = false;
    wishPopup.classList.remove('out');
  }
  function hidePopup(){
    wishPopup.classList.add('out');
    setTimeout(() => { wishPopup.hidden = true; wishPopup.classList.remove('out'); }, 380);
  }

  // candles light -> close your eyes (5s) -> now open -> blow -> disappear -> onDone
  function startWishSequence(onDone){
    wishOnDone = onDone;
    cakeSub.textContent = 'lighting your candles…';
    startBirthdaySong();

    setTimeout(() => cakeStage.classList.add('lit'), 500);
    setTimeout(() => { cakeSub.textContent = 'twenty-three, and every one of them worth celebrating'; }, 1600);

    setTimeout(() => { showPopup('Close your eyes, and make a wish…'); speak('Close your eyes, and make a wish.'); }, 2200);
    setTimeout(hidePopup, 7200);                       // exactly 5s with eyes closed

    setTimeout(() => { showPopup('Now open your eyes…'); speak('Now open your eyes.'); }, 7500);
    setTimeout(hidePopup, 9800);

    setTimeout(() => {
      showPopup('Blow out the candles 🎂');
      speak('Now blow out the candles.');
      cakeBtn.disabled = false;
      cakeHint.textContent = 'tap the cake to blow them out';
    }, 10300);
    setTimeout(hidePopup, 13300);
  }

  cakeBtn.addEventListener('click', () => {
    if (blown || cakeBtn.disabled) return;
    blown = true;
    cakeBtn.disabled = true;
    cakeStage.classList.add('blown');
    cakeHint.textContent = '';
    hidePopup();

    const r = cakeBtn.getBoundingClientRect();
    burst(r.left + r.width/2, r.top + r.height*0.18, 110);
    cannons();
    setTimeout(cannons, 550);
    setTimeout(() => burst(innerWidth/2, innerHeight*0.4, 80), 300);
    for (let i=0;i<22;i++) setTimeout(() => spawnBalloon(true), i*90);

    setTimeout(() => cakeStage.classList.add('candles-gone'), 5000);
    setTimeout(() => {
      cakeStage.classList.add('cake-gone');
      const cr = cakeBtn.getBoundingClientRect();
      burst(cr.left + cr.width/2, cr.top + cr.height*0.3, 38);
    }, 5400);

    setTimeout(() => {
      cakeBlessing.hidden = false;
      cakeSub.textContent = 'your wish is already on its way';
      speak('May all your wishes come true.');
      burst(innerWidth/2, innerHeight*0.45, 60);
    }, 6700);

    setTimeout(stopBirthdaySong, 12000);

    setTimeout(() => {
      const slide = $('cakeSlide');
      slide.classList.add('fading');
      setTimeout(() => {
        slide.hidden = true;
        slide.classList.remove('fading');
        if (wishOnDone) wishOnDone();
      }, 800);
    }, 10300);
  });

  function goCakeSlide(){
    $('cakeSlide').hidden = false;
    startWishSequence(goSurprisingPart);
  }

  function goSurprisingPart(){
    showTransition(
      ['Now, the surprising part.',
       'five little secrets, waiting to be scratched into the open.',
       ''],
      'scratch each one to open it',
      goCardsSlide
    );
  }

  /* ================= Countdown (used inside "Our Journey Ahead" card) ================= */
  const JOURNEY_START = new Date('2026-08-06T00:00:00').getTime();
  function countdownCard(icon, title, dateLabel, targetISO, caption){
    return `
      <div class="cd-card" data-target="${targetISO}">
        <div class="cd-head">
          <span class="cd-icon">${icon}</span>
          <div>
            <div class="cd-title">${title}</div>
            <div class="cd-date">${dateLabel}</div>
          </div>
        </div>
        <div class="cd-units">
          <div class="cd-unit"><span class="cd-num" data-u="d">0</span><span class="cd-lbl">Days</span></div>
          <div class="cd-unit"><span class="cd-num" data-u="h">0</span><span class="cd-lbl">Hours</span></div>
          <div class="cd-unit"><span class="cd-num" data-u="m">0</span><span class="cd-lbl">Mins</span></div>
          <div class="cd-unit"><span class="cd-num" data-u="s">0</span><span class="cd-lbl">Secs</span></div>
        </div>
        <div class="cd-track"><div class="cd-fill"></div></div>
        <div class="cd-caption">${caption}</div>
      </div>`;
  }
  function startCountdownCard(card){
    const target = new Date(card.dataset.target).getTime();
    const n = u => card.querySelector(`[data-u="${u}"]`);
    const nums = { d:n('d'), h:n('h'), m:n('m'), s:n('s') };
    const fill = card.querySelector('.cd-fill');
    function set(el, val){
      const str = String(val);
      if (el.textContent !== str){
        el.textContent = str;
        el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump');
      }
    }
    function render(){
      const now = Date.now();
      const diff = Math.max(0, target - now);
      set(nums.d, Math.floor(diff/86400000));
      set(nums.h, Math.floor((diff%86400000)/3600000));
      set(nums.m, Math.floor((diff%3600000)/60000));
      set(nums.s, Math.floor((diff%60000)/1000));
      const p = Math.min(100, Math.max(0, ((now-JOURNEY_START)/(target-JOURNEY_START))*100));
      fill.style.width = p.toFixed(2)+'%';
    }
    render();
    const t = setInterval(() => {
      if (!document.body.contains(card)){ clearInterval(t); return; }
      render();
    }, 1000);
  }

  /* ================= Card content (shown in the modal once scratched) ================= */
  const IMG_FALLBACK = seed => `https://picsum.photos/seed/${seed}/500/650`;
  function galleryImg(name, seed, caption){
    return `<figure>
      <img src="assets/images/${name}" alt="${caption}"
           onerror="this.onerror=null;this.src='${IMG_FALLBACK(seed)}';">
      <figcaption>${caption}</figcaption>
    </figure>`;
  }
  const cardContent = {
    1: { icon:'💌', title:'How We Met', html:`
      <div class="modal-text">
        <p>It's strange, isn't it? Six months ago you were still a stranger — and now I can't get through a day without telling you something small, just because I want you to know it.</p>
        <p>I still remember exactly how it felt when we first started talking. Something in my life quietly clicked into place, and it hasn't stopped feeling that way since.</p>
        <p><em>(Replace this with the real story of how you two met — in your own words, it'll mean the world to her.)</em></p>
      </div>` },
    2: { icon:'💕', title:'What I Love About You', html:`
      <ul class="love-list">
        <li>The way your laugh shows up before you even finish the joke.</li>
        <li>How fiercely you care about the people you love — including me, especially me.</li>
        <li>Your honesty, even when it would be easier to say nothing.</li>
        <li>The way ordinary days feel like an occasion when you're around.</li>
        <li>How strong you are, quietly, without ever needing anyone to notice.</li>
        <li>Every single thing about the way you say my name.</li>
      </ul>
      <p class="modal-text" style="margin-top:16px;"><em>(Edit freely — six is just a start, Piu deserves the whole page.)</em></p>` },
    3: { icon:'📸', title:'Our Favourite Memories', html:`
      <div class="memory-gallery">
        ${galleryImg('memory1.jpg','piu-memory-1','Our first date')}
        ${galleryImg('memory2.jpg','piu-memory-2','That trip we still talk about')}
        ${galleryImg('memory3.jpg','piu-memory-3','Just us, being silly')}
      </div>
      <p class="modal-text"><em>Drop your real photos into <strong>assets/images/</strong> as memory1.jpg, memory2.jpg, memory3.jpg — they replace these automatically.</em></p>` },
    4: { icon:'🤍', title:'A Promise For Us', html:`
      <div class="modal-text">
        <p>I promise to keep choosing you — not just on the easy days, but on the ordinary Tuesdays too.</p>
        <p>On <strong>25th November</strong>, we make it official in front of everyone who loves us. On <strong>28th January 2027</strong>, I get to call you my wife. But honestly, Piu — I've already decided you're mine to love, for every year after that.</p>
        <p>This is only the first birthday of yours I get to celebrate. I plan on being there for every single one that follows.</p>
      </div>` },
    5: { icon:'⏳', title:'Our Journey Ahead', compact:true, html:`
      <div class="cd-stack">
        ${countdownCard('💍','Our Engagement','25 November 2026','2026-11-25T00:00:00','closer every second')}
        ${countdownCard('💒','Our Wedding','28 January 2027','2027-01-28T00:00:00','the day you become my wife')}
      </div>` },
    final: { icon:'🎁', title:'Final Surprise', html:`
      <h3 class="final-heading">Happy 23rd Birthday, Piu</h3>
      <div class="video-wrap">
        <video controls playsinline id="finalVideo">
          <source src="assets/video/birthday-wish.mp4" type="video/mp4">
        </video>
      </div>
      <p class="video-note" id="videoNote">a little birthday wish, made for you</p>
      <div class="modal-text">
        <p>Every one of those five little surprises was true the day I wrote it, and it'll still be true on our fiftieth birthday together. Here's to this year, to us, and to every "first" we haven't had yet.</p>
        <p style="text-align:center;"><strong>I love you, Piu. Happy Birthday. 🎂</strong></p>
      </div>` }
  };

  /* ================= Modal ================= */
  const overlay = $('modalOverlay');
  const modalEl = overlay.querySelector('.modal');
  const modalBody = $('modalBody');
  let currentModalKey = null;

  function openModal(key){
    const data = cardContent[key];
    if (!data) return;
    currentModalKey = key;
    modalEl.classList.toggle('compact', !!data.compact);
    modalBody.innerHTML = `
      <span class="modal-icon">${data.icon}</span>
      <h2 class="modal-title">${data.title}</h2>
      ${data.html}`;
    overlay.classList.add('open');
    modalBody.querySelectorAll('.cd-card').forEach(startCountdownCard);

    const video = modalBody.querySelector('#finalVideo');
    if (video){
      video.addEventListener('error', () => {
        video.querySelector('source').src =
          'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4';
        video.load();
        const note = modalBody.querySelector('#videoNote');
        if (note) note.textContent = 'sample clip — add assets/video/birthday-wish.mp4 with your own cartoon wish';
      }, { once:true });
    }
    if (key === 'final'){
      cannons();
      setTimeout(() => burst(innerWidth/2, innerHeight*0.35, 80), 250);
      for (let i=0;i<18;i++) setTimeout(() => spawnBalloon(true), i*100);
    }
  }
  function closeModal(){
    overlay.classList.remove('open');
    const v = modalBody.querySelector('video');
    if (v) v.pause();
    // closing the final surprise is the cue that she's ready for the
    // real-world part of the gift
    if (currentModalKey === 'final'){
      currentModalKey = null;
      setTimeout(goBoxSequence, 500);
    } else {
      currentModalKey = null;
    }
  }
  $('modalClose').addEventListener('click', closeModal);
  overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

  /* ================= 6 · Scratch mechanics (shared by both slides) ================= */
  function initScratch(card, onFinish){
    if (card.dataset.scratchReady) return;
    card.dataset.scratchReady = '1';

    const canvasEl = card.querySelector('.scratch');
    const box = canvasEl.getBoundingClientRect();
    const w = Math.round(box.width), h = Math.round(box.height);
    if (!w || !h){ delete card.dataset.scratchReady; return; }

    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvasEl.width = w*dpr; canvasEl.height = h*dpr;
    const sctx = canvasEl.getContext('2d', { willReadFrequently:true });
    sctx.scale(dpr, dpr);

    const g = sctx.createLinearGradient(0, 0, w, h);
    g.addColorStop(0,   '#4A2E52');
    g.addColorStop(0.28,'#7C4A6E');
    g.addColorStop(0.5, '#C08BB0');
    g.addColorStop(0.72,'#7C4A6E');
    g.addColorStop(1,   '#3E2545');
    sctx.fillStyle = g; sctx.fillRect(0, 0, w, h);

    for (let i=0;i<160;i++){
      sctx.globalAlpha = Math.random()*0.16;
      sctx.fillStyle = Math.random() > 0.5 ? '#FFFFFF' : '#2A1030';
      const r = Math.random()*2.4;
      sctx.beginPath(); sctx.arc(Math.random()*w, Math.random()*h, r, 0, Math.PI*2); sctx.fill();
    }
    sctx.globalAlpha = 1;

    sctx.fillStyle = 'rgba(255,235,205,.86)';
    sctx.font = '300 11px Jost, sans-serif';
    sctx.textAlign = 'center';
    sctx.fillText('SCRATCH  HERE', w/2, h/2 - 4);
    sctx.font = '300 20px Jost, sans-serif';
    sctx.fillText('✦', w/2, h/2 + 24);

    sctx.globalCompositeOperation = 'destination-out';

    let drawing = false, moves = 0, cleared = false;
    const pos = e => {
      const r = canvasEl.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    };
    const scratchAt = (x, y) => { sctx.beginPath(); sctx.arc(x, y, 21, 0, Math.PI*2); sctx.fill(); };

    function checkProgress(){
      const data = sctx.getImageData(0, 0, canvasEl.width, canvasEl.height).data;
      let clear = 0, total = 0;
      for (let i = 3; i < data.length; i += 4*40){
        total++;
        if (data[i] < 26) clear++;
      }
      if (total && clear/total >= 0.42) finish();
    }
    function finish(){
      if (cleared) return;
      cleared = true;
      card.classList.add('scratched');
      const r = card.getBoundingClientRect();
      burst(r.left + r.width/2, r.top + r.height/2, 40);
      onFinish(card);
    }

    canvasEl.addEventListener('pointerdown', e => {
      if (cleared) return;
      drawing = true;
      try { canvasEl.setPointerCapture(e.pointerId); } catch(err){}
      const p = pos(e); scratchAt(p.x, p.y);
      e.preventDefault();
    });
    canvasEl.addEventListener('pointermove', e => {
      if (!drawing || cleared) return;
      const p = pos(e); scratchAt(p.x, p.y);
      if (++moves % 9 === 0) checkProgress();
      e.preventDefault();
    });
    const end = () => { if (!drawing) return; drawing = false; if (!cleared) checkProgress(); };
    canvasEl.addEventListener('pointerup', end);
    canvasEl.addEventListener('pointercancel', end);
    canvasEl.addEventListener('pointerleave', end);
  }

  function flipCard(card, onFinish){
    if (card.classList.contains('flipped')) return;
    card.classList.add('flipped');
    setTimeout(() => initScratch(card, onFinish), 900);
  }

  function wireScratchCard(card, onFinish){
    card.addEventListener('click', e => {
      if (e.target.closest('.scratch')) return;
      flipCard(card, onFinish);
    });
    card.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' '){ e.preventDefault(); flipCard(card, onFinish); }
    });
  }

  function revealCards(cards){
    const io = new IntersectionObserver(entries => {
      entries.forEach(en => {
        if (!en.isIntersecting) return;
        const card = en.target;
        card.style.transitionDelay = (Array.from(cards).indexOf(card) * 90) + 'ms';
        card.classList.add('in-view');
        io.unobserve(card);
      });
    }, { threshold:0.1 });
    cards.forEach(c => io.observe(c));
  }

  /* ================= 6 · Five little secrets ================= */
  const cardsSlide = $('cardsSlide');
  const scratchCards = Array.from(cardsSlide.querySelectorAll('.scard'));
  const progressCount = $('progressCount'), progressFill = $('progressFill');
  let foundCount = 0, cardsStarted = false;

  function onSecretFound(card){
    if (card.dataset.found) return;
    card.dataset.found = '1';
    card.classList.add('done');
    const badge = document.createElement('span');
    badge.className = 'badge'; badge.textContent = '✓ found';
    card.appendChild(badge);

    foundCount++;
    progressCount.textContent = foundCount;
    progressFill.style.width = (foundCount/scratchCards.length*100)+'%';

    setTimeout(() => openModal(card.dataset.card), 550);

    if (foundCount >= scratchCards.length){
      setTimeout(goFinalTransition, 1400);
    }
  }
  scratchCards.forEach(c => wireScratchCard(c, onSecretFound));

  function goCardsSlide(){
    if (cardsStarted) { cardsSlide.hidden = false; return; }
    cardsStarted = true;
    cardsSlide.hidden = false;
    revealCards(scratchCards);
  }

  function goFinalTransition(){
    cardsSlide.hidden = true; // done with it — don't leave it stacked underneath
    showTransition(
      ['Now comes the final surprise.',
       'the one I saved for last.',
       ''],
      'scratch to reveal',
      goFinalSlide
    );
  }

  /* ================= 7 · Final surprise ================= */
  const finalSlide = $('finalSlide');
  const finalCardEl = finalSlide.querySelector('.scard');
  let finalStarted = false;

  function onFinalFound(card){
    openModal('final');
  }
  wireScratchCard(finalCardEl, onFinalFound);

  function goFinalSlide(){
    finalSlide.hidden = false;
    if (finalStarted) return;
    finalStarted = true;
    finalCardEl.classList.add('ready');
    revealCards([finalCardEl]);
  }

  /* ================= 8 · One more thing (a real box, a real gift) ================= */
  const boxSlide = $('boxSlide');
  const boxStage = $('boxStage');

  const NUDGES = [
    "Take your time, love — I'll be right here. 🤍",
    "Go on, it's waiting for you.",
    "I promise it's worth the walk. 😊",
    'Still here, still waiting. No rush at all.'
  ];
  let nudgeIdx = 0;

  const CONFIRM_ROUNDS = [
    { prompt: 'You sure?',                    label: "Yes, I'm sure" },
    { prompt: 'Pakka na?',                     label: 'Pakka! 💯' },
    { prompt: 'Dil se bolo…',                  label: 'Dil se ❤️' },
    { prompt: 'Promise? No take-backs.',       label: 'I promise, forever.' }
  ];

  // swaps the visible step with a small out/in transition; mounting can
  // be deferred ~380ms for that transition, so any listener wiring MUST
  // happen inside afterMount, never right after calling this function
  function renderBoxStep(html, afterMount){
    const old = boxStage.querySelector('.box-step');
    const mount = () => {
      boxStage.innerHTML = `<div class="box-step">${html}</div>`;
      if (afterMount) afterMount();
    };
    if (old && !reduced){
      old.classList.add('leaving');
      setTimeout(mount, 380);
    } else {
      mount();
    }
  }

  function goBoxSequence(){
    finalSlide.hidden = true; // done with it — don't leave it stacked underneath
    showTransition(
      ['Wait… this isn’t the end.',
       "There's one more thing waiting for you — smaller than the rest, but it means the most."],
      'keep going',
      goBoxScratch
    );
  }

  function goBoxScratch(){
    boxSlide.hidden = false;
    renderBoxStep(`
      <div class="card-grid final-grid">
        <div class="scard scard-grand scard-box" id="boxScard" tabindex="0" role="button" aria-label="One more thing — tap to reveal">
          <div class="scard-inner">
            <div class="scard-face scard-front">
              <span class="scard-orn" aria-hidden="true">✦</span>
              <span class="scard-icon">💜</span>
              <span class="scard-label">One more thing</span>
              <span class="scard-tap">tap to turn</span>
            </div>
            <div class="scard-face scard-back">
              <div class="scard-prize">
                <span class="scard-prize-icon">🎁</span>
                <span class="scard-prize-title">Not here, love.</span>
                <p class="scard-prize-note">It's inside the little box I gave you. Go on — open it.</p>
              </div>
              <div class="scratch-shine" aria-hidden="true"></div>
              <canvas class="scratch"></canvas>
            </div>
          </div>
        </div>
      </div>`,
      () => {
        const boxScard = $('boxScard');
        revealCards([boxScard]); // .scard starts at opacity:0 until this runs — this was the bug
        wireScratchCard(boxScard, () => setTimeout(goOpenedQuestion, 1600));
      }
    );
  }

  function goOpenedQuestion(nudge){
    renderBoxStep(`
      ${nudge ? `<p class="box-sub">${nudge}</p>` : ''}
      <h2 class="box-title">Have you opened it?</h2>
      <div class="box-btn-row">
        <button class="box-btn" id="openedYes">Yes</button>
        <button class="box-btn ghost" id="openedNo">Not yet</button>
      </div>`,
      () => {
        $('openedYes').addEventListener('click', () => {
          burst(innerWidth/2, innerHeight*0.5, 40);
          goLikeQuestion();
        });
        $('openedNo').addEventListener('click', () => {
          const msg = NUDGES[nudgeIdx % NUDGES.length];
          nudgeIdx++;
          goOpenedQuestion(msg);
        });
      }
    );
  }

  function goLikeQuestion(){
    renderBoxStep(`
      <h2 class="box-title">Do you like it?</h2>
      <p class="box-sub">be honest… actually, don't. just say yes. 😄</p>
      <div class="box-btn-row">
        <button class="box-btn like-btn">Yes</button>
        <button class="box-btn like-btn">Yesss! 😍</button>
        <button class="box-btn like-btn">YESSSSS!! 🥹</button>
      </div>`,
      () => {
        boxStage.querySelectorAll('.like-btn').forEach(b => {
          b.addEventListener('click', () => {
            burst(innerWidth/2, innerHeight*0.5, 55);
            cannons();
            goConfirmRound(0);
          });
        });
      }
    );
  }

  function goConfirmRound(i){
    if (i >= CONFIRM_ROUNDS.length){ goEnding(); return; }
    const r = CONFIRM_ROUNDS[i];
    renderBoxStep(`
      <h2 class="box-title">${r.prompt}</h2>
      <div class="box-btn-row">
        <button class="box-btn" id="confirmBtn">${r.label}</button>
      </div>`,
      () => {
        $('confirmBtn').addEventListener('click', () => {
          if (i === CONFIRM_ROUNDS.length - 1){ burst(innerWidth/2, innerHeight*0.5, 70); cannons(); }
          goConfirmRound(i + 1);
        });
      }
    );
  }

  /* ================= 9 · The ending ================= */
  function goEnding(){
    boxSlide.classList.add('fading');
    setTimeout(() => {
      boxSlide.hidden = true;
      boxSlide.classList.remove('fading');
      $('endingSlide').hidden = false;
      startEndingPetals();
      burst(innerWidth/2, innerHeight*0.3, 60);
    }, 800);
  }

  function startEndingPetals(){
    if (reduced) return;
    const el = $('endingPetals');
    function spawn(){
      const s = document.createElement('span');
      s.className = 'ending-petal';
      s.textContent = Math.random() > 0.5 ? '❀' : '✦';
      s.style.left = Math.random()*100 + 'vw';
      s.style.fontSize = (10 + Math.random()*10) + 'px';
      s.style.setProperty('--drift-x', (Math.random()*90-45) + 'px');
      const dur = 10 + Math.random()*8;
      s.style.animationDuration = dur + 's';
      el.appendChild(s);
      setTimeout(() => s.remove(), dur*1000);
    }
    for (let i=0;i<8;i++) setTimeout(spawn, i*300);
    setInterval(spawn, 900);
  }
})();
