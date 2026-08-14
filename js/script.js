/* ============================================================
   For Piu — an auto-advancing story. Every chapter after the gate
   plays itself through; she only ever has to act at three points:
   open the letter, blow out the candle, and scratch each card.
   ============================================================ */

(() => {
  const root = document.documentElement;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = id => document.getElementById(id);

  // runs fn on the next paint frame, same as requestAnimationFrame — but
  // with a short setTimeout safety net, so a throttled/backgrounded tab
  // (some mobile browsers pause rAF) can never leave her stuck looking at
  // a "hidden" button or panel that was only ever waiting on a frame that
  // never came
  function revealNextFrame(fn){
    let done = false;
    const run = () => { if (done) return; done = true; fn(); };
    requestAnimationFrame(() => requestAnimationFrame(run));
    setTimeout(run, 120);
  }

  // tries a real photo under a few common extensions, in order, before
  // giving up — so she can drop in a .jpg, .png, whatever she has, without
  // ever having to touch the code
  const PHOTO_EXTS = ['.jpg', '.jpeg', '.png', '.webp'];
  function resolvePhoto(basePath, onFound, onNone){
    let i = 0;
    (function tryNext(){
      if (i >= PHOTO_EXTS.length){ if (onNone) onNone(); return; }
      const src = basePath + PHOTO_EXTS[i++];
      const test = new Image();
      test.onload = () => onFound(src);
      test.onerror = tryNext;
      test.src = src;
    })();
  }

  /* ================= Theme ================= */
  // one fixed theme by design — dark, cinematic, no toggle to fuss with
  root.setAttribute('data-theme', 'dark');

  /* ================= Audio ================= */
  // No visible toggle by design — the ambient track just plays quietly
  // once she's interacted with the page (the gate click), and stays out
  // of her way. If assets/audio/song.mp3 doesn't exist, this is a no-op.
  const bgm = $('bgm');
  const bdaySong = $('bdaySong');
  const blastSound = $('blastSound');
  let musicAvailable = true, musicPlaying = false, blastAvailable = true;

  bgm.addEventListener('error', () => { musicAvailable = false; });
  blastSound.addEventListener('error', () => { blastAvailable = false; });
  // fires on every confetti-cannon moment (gate open, cake blow, the big
  // reveals) — cheap to call often since it's just a short pop/whoosh
  function playBlast(){
    if (!blastAvailable) return;
    try {
      blastSound.currentTime = 0;
      blastSound.volume = 0.55;
      blastSound.play().catch(() => {});
    } catch(e){}
  }
  function tryPlayMusic(){
    if (!musicAvailable) return;
    bgm.volume = 0.3;
    bgm.play().then(() => { musicPlaying = true; }).catch(()=>{});
  }

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
    playBlast();
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

  (function spawnCelStars(){
    const el = $('celStars');
    if (!el || reduced) return;
    for (let i=0;i<36;i++){
      const s = document.createElement('span');
      s.className = 'cel-star';
      s.style.left = (Math.random()*100)+'%';
      s.style.top = (Math.random()*100)+'%';
      s.style.animationDelay = (Math.random()*4)+'s';
      s.style.animationDuration = (2.2+Math.random()*3)+'s';
      el.appendChild(s);
    }
  })();

  // A little locket sits closed, showing "22". After a moment it opens —
  // like a keepsake pendant — and "23" is waiting, glowing, inside.
  function runAgeSequence(){
    const badge = $('ageBadge');
    const caption = $('ageCaption'), btn = $('celContinue'), bouquet = $('celBouquet');

    if (reduced){
      badge.classList.add('opening','landed');
      caption.classList.add('show');
      bouquet.hidden = false;
      bouquet.classList.add('show');
      btn.classList.add('show');
      return;
    }
    setTimeout(() => { badge.classList.add('opening'); }, 2200); // let her read the 22 first
    setTimeout(() => {
      badge.classList.add('landed');
      const r = badge.getBoundingClientRect();
      burst(r.left + r.width/2, r.top + r.height/2, 70);
      for (let i=0;i<14;i++) setTimeout(() => spawnBalloon(true), i*90);
    }, 3400); // right as the doors finish swinging open
    setTimeout(() => caption.classList.add('show'), 4100);
    setTimeout(() => {
      bouquet.hidden = false;
      revealNextFrame(() => bouquet.classList.add('show'));
    }, 4700);
    setTimeout(() => btn.classList.add('show'), 5400);
  }

  /* ================= 0 · Prelude — a dark, cinematic opening ================= */
  const prelude = $('prelude');
  (function spawnStars(){
    const el = $('preludeStars');
    if (!el || reduced) return;
    for (let i=0;i<48;i++){
      const s = document.createElement('span');
      s.className = 'prelude-star';
      s.style.left = (Math.random()*100)+'%';
      s.style.top = (Math.random()*100)+'%';
      s.style.animationDelay = (Math.random()*4)+'s';
      s.style.animationDuration = (2.2+Math.random()*3)+'s';
      el.appendChild(s);
    }
  })();

  // a few hearts and petals drifting slowly upward — quiet, romantic,
  // never competing with the words
  (function spawnPreludeHearts(){
    const el = $('preludeHearts');
    if (!el || reduced) return;
    const marks = ['♥','❀'];
    for (let i=0;i<10;i++){
      const s = document.createElement('span');
      s.className = 'prelude-heart';
      s.textContent = marks[Math.floor(Math.random()*marks.length)];
      s.style.left = (Math.random()*100)+'%';
      s.style.fontSize = (10+Math.random()*10)+'px';
      s.style.setProperty('--ph-x', (Math.random()*70-35)+'px');
      s.style.setProperty('--ph-r', (Math.random()*40-20)+'deg');
      s.style.animationDuration = (9+Math.random()*8)+'s';
      s.style.animationDelay = (Math.random()*6)+'s';
      el.appendChild(s);
    }
  })();

  function runPrelude(){
    const lines = Array.from(prelude.querySelectorAll('.prelude-line'));
    const flourish = $('preludeFlourish');
    const btn = $('preludeBegin');
    if (reduced){
      lines.forEach(l => l.classList.add('show'));
      flourish.classList.add('show');
      btn.hidden = false;
      btn.classList.add('show');
      return;
    }
    let delay = 700;
    lines.forEach((l, i) => {
      setTimeout(() => l.classList.add('show'), delay);
      // the little heart flourish blooms in just before the final line
      if (i === lines.length - 2) setTimeout(() => flourish.classList.add('show'), delay + 900);
      delay += (i === lines.length - 1) ? 1500 : 2000;
    });
    setTimeout(() => {
      btn.hidden = false;
      revealNextFrame(() => btn.classList.add('show'));
    }, delay + 300);
  }
  runPrelude();

  $('preludeBegin').addEventListener('click', () => {
    tryPlayMusic(); // the true first user gesture — best shot at audio autoplay
    prelude.classList.add('fading');
    setTimeout(() => {
      prelude.hidden = true;
      gate.hidden = false;
    }, 900);
  });

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

  /* ================= 4 · Her journey — a cinematic story, one scene at a
     time: the date on black, then the video plays itself, then the words
     that go with it. No skipping, no tapping to watch — she just receives
     it, chapter by chapter, all the way to today. ================= */
  const JOURNEY_CHAPTERS = [
    { year:'14th September, 2003', title:'The Beginning',
      cap:"The day the world quietly rearranged itself around one small, remarkable heartbeat — and got immeasurably better without asking anyone's permission.",
      video:'assets/video/journey1.mp4', poster:'assets/images/journey1' },
    { year:'2008', title:'Small, and Completely in Charge',
      cap:"Tiny hands, enormous opinions, and a smile that already knew exactly what it was doing",
      video:'assets/video/journey2.mp4', poster:'assets/images/journey2' },
    { year:'2014', title:'School Days',
      cap:'Somewhere between these lessons and this laughter, you were quietly becoming the kindest person.',
      video:'assets/video/journey3.mp4', poster:'assets/images/journey3' },
    { year:'2020', title:'Corona Pandemic | The World Went Quiet',
      cap:"Everything paused that year. But, You didn't.",
      video:'assets/video/journey4.mp4', poster:'assets/images/journey4' },
    { year:'2021', title:'Golden College Days',
      cap:'Late nights, louder laughter, a thousand small adventures.',
      video:'assets/video/journey5.mp4', poster:'assets/images/journey5' },
    { year:'25th January, 2026', title:'The Day You Walked In',
      cap:"An ordinary Sunday, and then — quite without warning — my whole life quietly rearranged itself around you.",
      video:'assets/video/journey6.mp4', poster:'assets/images/journey6' }
  ];

  function runJourneySlide(onNext){
    const slide = $('journeySlide');
    const cinema = $('jsCinema');
    const dots = Array.from(slide.querySelectorAll('.js-dot'));
    let idx = -1, timers = [], done = false, currentVideo = null;

    function clear(){ timers.forEach(clearTimeout); timers = []; }
    function showDot(i){
      dots.forEach((d, di) => {
        d.classList.toggle('active', di === i);
        d.classList.toggle('done', di < i);
      });
    }
    function stopCurrentVideo(){
      if (currentVideo){ try { currentVideo.pause(); } catch(e){} currentVideo = null; }
    }
    function finish(){
      if (done) return;
      done = true;
      clear();
      stopCurrentVideo();
      slide.classList.add('fading');
      timers.push(setTimeout(() => {
        slide.hidden = true;
        slide.classList.remove('fading');
        onNext();
      }, 700));
    }

    // swaps the scene on stage with a short cross-fade; afterMount runs
    // once the new scene is actually in the DOM
    function renderScene(html, afterMount){
      const old = cinema.querySelector('.js-scene');
      const mount = () => { cinema.innerHTML = html; if (afterMount) afterMount(); };
      if (old && !reduced){ old.classList.add('leaving'); timers.push(setTimeout(mount, 380)); }
      else mount();
    }

    function showDateScene(ch, onNext){
      renderScene(`
        <div class="js-scene js-date-scene">
          <div class="js-date-sparkle" aria-hidden="true">
            <span></span><span></span><span></span><span></span><span></span><span></span>
          </div>
          <p class="js-date-eyebrow">a memory from</p>
          <p class="js-date-year">${ch.year}</p>
          <span class="js-date-rule"></span>
        </div>`,
        () => {
          const scene = cinema.querySelector('.js-date-scene');
          scene.querySelectorAll('.js-date-sparkle span').forEach((s, i) => {
            s.style.left = (10 + Math.random()*80) + '%';
            s.style.top = (10 + Math.random()*80) + '%';
            s.style.animationDelay = (i*0.35) + 's';
          });
          timers.push(setTimeout(() => scene.classList.add('lit'), 100));
          timers.push(setTimeout(() => scene.querySelector('.js-date-eyebrow').classList.add('show'), 150));
          timers.push(setTimeout(() => scene.querySelector('.js-date-year').classList.add('show'), 500));
          timers.push(setTimeout(() => scene.querySelector('.js-date-rule').classList.add('show'), 1500));
          timers.push(setTimeout(onNext, 2700));
        });
    }

    function showVideoScene(ch, onNext){
      renderScene(`
        <div class="js-scene js-video-scene">
          <div class="js-video-frame" id="jsVideoFrame">
            <span class="js-video-frame-glow" aria-hidden="true"></span>
            <span class="js-video-corner tl" aria-hidden="true"></span><span class="js-video-corner tr" aria-hidden="true"></span>
            <span class="js-video-corner bl" aria-hidden="true"></span><span class="js-video-corner br" aria-hidden="true"></span>
            <span class="js-video-year">${ch.year}</span>
            <video class="js-video-el" id="jsVideoEl" playsinline>
              <source src="${ch.video}" type="video/mp4">
            </video>
            <button class="js-play-btn" id="jsPlayBtn" aria-label="Watch this memory">
              <span class="js-play-ring" aria-hidden="true"></span><span class="js-play-ring r2" aria-hidden="true"></span>
              <svg class="js-play-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>
            </button>
            <p class="js-play-hint" id="jsPlayHint">tap to watch</p>
          </div>
        </div>`,
        () => {
          const frame = $('jsVideoFrame'), video = $('jsVideoEl');
          const playBtn = $('jsPlayBtn'), hint = $('jsPlayHint');
          const source = video.querySelector('source');
          currentVideo = video;
          let advanced = false;
          const wasBgmPlaying = musicPlaying;

          // whichever real photo she dropped in (.jpg, .png, whatever)
          // becomes the still frame shown before she taps play
          if (ch.poster) resolvePhoto(ch.poster, src => { video.poster = src; });

          function advance(){
            if (advanced) return;
            advanced = true;
            try { video.pause(); } catch(e){}
            if (wasBgmPlaying) bgm.play().catch(() => {});
            currentVideo = null;
            timers.push(setTimeout(onNext, 500));
          }

          video.addEventListener('ended', () => timers.push(setTimeout(advance, 700)));
          video.addEventListener('playing', () => frame.classList.add('playing'));
          // no real clip at that path yet — fall back to a working sample
          // rather than leave her staring at a broken player
          source.addEventListener('error', () => {
            source.src = 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4';
            video.load();
          }, { once:true });

          timers.push(setTimeout(() => frame.classList.add('show'), 60));

          // she's asked, never auto-started — a tap begins it
          function startWatching(){
            if (advanced) return;
            if (wasBgmPlaying) bgm.pause();
            playBtn.classList.add('hide');
            hint.classList.add('hide');
            video.play().catch(() => {});
          }
          playBtn.addEventListener('click', startWatching);

          // if she wanders off without ever tapping play, don't strand
          // the story here forever
          timers.push(setTimeout(() => { if (video.paused) advance(); }, 45000));
        });
    }

    function showCaptionScene(ch, onNext){
      renderScene(`
        <div class="js-scene js-cap-scene">
          <span class="js-cap-year" id="jsCapYear">${ch.year}</span>
          <h3 class="js-cap-title" id="jsCapTitle">${ch.title}</h3>
          <span class="js-cap-rule" id="jsCapRule"></span>
          <p class="js-cap-text" id="jsCapText">${ch.cap}</p>
          <button class="cel-btn js-continue-btn" id="jsCapContinue" hidden><span>watch a little of it</span><span class="cel-btn-arrow">→</span></button>
        </div>`,
        () => {
          const year = $('jsCapYear'), title = $('jsCapTitle'), rule = $('jsCapRule'), text = $('jsCapText'), btn = $('jsCapContinue');
          let advanced = false;
          function advance(){ if (advanced) return; advanced = true; onNext(); }
          timers.push(setTimeout(() => year.classList.add('show'), 100));
          timers.push(setTimeout(() => title.classList.add('show'), 500));
          timers.push(setTimeout(() => rule.classList.add('show'), 1000));
          timers.push(setTimeout(() => text.classList.add('show'), 1350));
          timers.push(setTimeout(() => {
            btn.hidden = false;
            revealNextFrame(() => btn.classList.add('show'));
          }, 2400));
          btn.addEventListener('click', advance);
          timers.push(setTimeout(advance, 7500));
        });
    }

    function runChapter(ch){
      if (reduced){
        renderScene(`
          <div class="js-scene js-cap-scene">
            <span class="js-cap-year show">${ch.year}</span>
            <h3 class="js-cap-title show">${ch.title}</h3>
            <p class="js-cap-text show">${ch.cap}</p>
          </div>`);
        timers.push(setTimeout(next, 1400));
        return;
      }
      showDateScene(ch, () => showCaptionScene(ch, () => showVideoScene(ch, next)));
    }

    function next(){
      idx++;
      if (idx >= JOURNEY_CHAPTERS.length){ finish(); return; }
      showDot(idx);
      runChapter(JOURNEY_CHAPTERS[idx]);
    }

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
  const wishDustEl = $('wishDust');
  const breathFill = $('breathRingFill');
  const wishStarEl = $('wishStar');
  const RING_C = 2 * Math.PI * 62;
  let blown = false, wishOnDone = null, wishDustTimer = null;
  let canBlow = false, holding = false, holdStart = 0, holdRaf = null;
  const HOLD_MS = 1250;

  // little motes of gold drifting up from the candles while they're lit
  function startWishDust(){
    if (reduced || wishDustTimer) return;
    function spawn(){
      const m = document.createElement('span');
      m.className = 'wd-mote';
      const ox = (Math.random() * 70 - 35);
      m.style.setProperty('--wd-ox', ox + 'px');
      m.style.setProperty('--wd-x', (ox * 0.6 + (Math.random()*30-15)) + 'px');
      const dur = 2.8 + Math.random() * 1.4;
      m.style.animationDuration = dur + 's';
      wishDustEl.appendChild(m);
      setTimeout(() => m.remove(), dur * 1000 + 100);
    }
    for (let i=0;i<3;i++) setTimeout(spawn, i*260);
    wishDustTimer = setInterval(spawn, 420);
  }
  function stopWishDust(){
    if (wishDustTimer){ clearInterval(wishDustTimer); wishDustTimer = null; }
  }

  // no on-screen instructions here — just the voice. the cake builds
  // itself tier by tier, gets iced, the candles arrive, and a hand with
  // a lit lighter comes in to catch each flame in turn — before the
  // eyes-closed/wish/blow beats play out
  function startWishSequence(onDone){
    wishOnDone = onDone;
    cakeSub.textContent = '';
    startBirthdaySong();

    setTimeout(() => { cakeStage.classList.add('tier1-in'); }, 300);
    setTimeout(() => { cakeStage.classList.add('tier2-in'); }, 1150);
    setTimeout(() => { cakeStage.classList.add('tier3-in'); }, 2000);
    setTimeout(() => { cakeStage.classList.add('icing-on'); }, 2850);
    setTimeout(() => {
      cakeStage.classList.add('candles-in');
      cakeSub.textContent = 'lighting your candles…';
    }, 4000);
    setTimeout(() => { cakeStage.classList.add('hand-in'); }, 4700);
    setTimeout(() => { cakeStage.classList.add('candle1-flame'); }, 5700);
    setTimeout(() => { cakeStage.classList.add('candle2-flame'); }, 6500);
    setTimeout(() => { cakeStage.classList.add('lit'); startWishDust(); }, 7700);
    setTimeout(() => { cakeSub.textContent = 'twenty-three, and every one of them worth celebrating'; }, 7900);

    setTimeout(() => { speak('Close your eyes, and make a wish.'); }, 8500);
    setTimeout(() => { speak('Now open your eyes.'); }, 13800);
    setTimeout(() => {
      speak('Now, press and hold to blow out the candles.');
      canBlow = true;
      cakeBtn.disabled = false;
      cakeHint.textContent = 'press & hold to blow them out';
    }, 16600);
  }

  // a single spark launches from the candles and arcs up across the sky —
  // the wish, sent off, instead of the cake just vanishing
  function launchWishStar(){
    if (reduced) return;
    const r = cakeBtn.getBoundingClientRect();
    const sx = r.left + r.width*0.6, sy = r.top + r.height*0.16;
    const ex = innerWidth*0.5 + (Math.random()*180-90), ey = innerHeight*0.08;
    const mx = (sx+ex)/2 + (Math.random()*140-70), my = Math.min(sy,ey) - 150;
    const dur = 1650, t0 = performance.now();
    wishStarEl.style.opacity = '1';
    function frame(now){
      const t = Math.min(1, (now-t0)/dur), it = 1-t;
      const x = it*it*sx + 2*it*t*mx + t*t*ex;
      const y = it*it*sy + 2*it*t*my + t*t*ey;
      wishStarEl.style.transform = `translate(${x}px, ${y}px) scale(${1-t*0.5})`;
      wishStarEl.style.opacity = String(Math.min(1, (1-t)*1.6));
      if (Math.random() < 0.55){
        const trail = document.createElement('span');
        trail.className = 'wish-star-trail';
        trail.style.transform = `translate(${x}px, ${y}px)`;
        document.body.appendChild(trail);
        setTimeout(() => trail.remove(), 720);
      }
      if (t < 1) requestAnimationFrame(frame);
      else wishStarEl.style.opacity = '0';
    }
    requestAnimationFrame(frame);
  }

  function setBreath(p){ breathFill.style.strokeDashoffset = (RING_C * (1-p)).toFixed(1); }

  function doBlow(){
    if (blown) return;
    blown = true;
    canBlow = false;
    cakeBtn.disabled = true;
    cakeStage.classList.remove('holding','blow-2','blow-3');
    cakeStage.classList.add('blown');
    cakeHint.textContent = '';
    stopWishDust();
    setBreath(0);

    const r = cakeBtn.getBoundingClientRect();
    burst(r.left + r.width/2, r.top + r.height*0.18, 110);
    cannons();
    setTimeout(cannons, 550);
    setTimeout(() => burst(innerWidth/2, innerHeight*0.4, 80), 300);
    for (let i=0;i<22;i++) setTimeout(() => spawnBalloon(true), i*90);

    setTimeout(() => cakeStage.classList.add('bloom'), 500);
    setTimeout(launchWishStar, 900);

    setTimeout(() => {
      cakeBlessing.hidden = false;
      cakeSub.textContent = 'your wish is already on its way';
      speak('May all your wishes come true.');
      burst(innerWidth/2, innerHeight*0.45, 60);
    }, 3400);

    setTimeout(stopBirthdaySong, 9000);

    setTimeout(() => {
      const slide = $('cakeSlide');
      slide.classList.add('fading');
      setTimeout(() => {
        slide.hidden = true;
        slide.classList.remove('fading');
        if (wishOnDone) wishOnDone();
      }, 800);
    }, 7200);
  }

  // she has to press and hold — the flames sway harder, the ring fills,
  // and only once she's really held it does the wish get sent off
  function loopHold(){
    if (!holding) return;
    const t = Math.min(1, (performance.now()-holdStart)/HOLD_MS);
    setBreath(t);
    cakeStage.classList.toggle('blow-2', t > 0.35);
    cakeStage.classList.toggle('blow-3', t > 0.7);
    if (t >= 1){ holding = false; doBlow(); return; }
    holdRaf = requestAnimationFrame(loopHold);
  }
  function startHold(e){
    if (!canBlow || blown) return;
    e.preventDefault();
    if (reduced){ doBlow(); return; }
    holding = true; holdStart = performance.now();
    cakeStage.classList.add('holding');
    cakeHint.textContent = 'keep holding… blow it all out';
    loopHold();
  }
  function cancelHold(){
    if (!holding) return;
    holding = false;
    if (holdRaf) cancelAnimationFrame(holdRaf);
    cakeStage.classList.remove('holding','blow-2','blow-3');
    setBreath(0);
    if (!blown) cakeHint.textContent = 'press & hold to blow them out';
  }
  cakeBtn.addEventListener('pointerdown', startHold);
  cakeBtn.addEventListener('pointerup', cancelHold);
  cakeBtn.addEventListener('pointerleave', cancelHold);
  cakeBtn.addEventListener('pointercancel', cancelHold);

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
  // same rule as everywhere else: drop in a base-named file in whatever
  // format you have, and it's picked up automatically — the extension
  // chain is wired up in JS (see wireGalleryImg) rather than inline, so
  // there's no HTML-attribute quoting to fight with
  function galleryImg(name, seed, caption){
    const base = 'assets/images/' + name;
    return `<figure>
      <img src="${base}${PHOTO_EXTS[0]}" data-base="${base}" data-ei="0" data-fallback="${IMG_FALLBACK(seed)}" alt="${caption}">
      <figcaption>${caption}</figcaption>
    </figure>`;
  }
  function wireGalleryImg(img){
    img.addEventListener('error', function onErr(){
      const i = (+img.dataset.ei) + 1;
      if (i < PHOTO_EXTS.length){
        img.dataset.ei = i;
        img.src = img.dataset.base + PHOTO_EXTS[i];
      } else {
        img.removeEventListener('error', onErr);
        img.src = img.dataset.fallback;
      }
    });
  }
  const cardContent = {
    1: { icon:'💌', title:'How We Met', html:`
      <div class="modal-text">
        <p>It's strange, isn't it? Nine months ago you were still a stranger — and now I can't get through a day without telling you something small, just because I want you to know it.</p>
        <p>I still remember exactly how it felt when we first started talking. Something in my life quietly clicked into place, and it hasn't stopped feeling that way since.</p>
      </div>` },
    2: { icon:'💕', title:'What I Love About You', html:`
      <ul class="love-list">
        <li>The way your laugh shows up before even finish the joke.</li>
        <li>How fiercely you care about the people you love.</li>
        <li>Your honesty, even when it would be easier to say nothing.</li>
        <li>The way ordinary days feel like an occasion when you're around.</li>
        <li>The positive mindset that you bring with. </li>
      </ul>
      ` },
    3: { icon:'📸', title:'Our Favourite Memories', html:`
      <div class="memory-gallery">
        ${galleryImg('memory1','piu-memory-1','Our first date')}
        ${galleryImg('memory2','piu-memory-2','That trip we still talk about')}
        ${galleryImg('memory3','piu-memory-3','Just us, being silly')}
      </div>
      ` },
    4: { icon:'🤍', title:'A Promise For Us', html:`
      <div class="modal-text">
        <p>I promise to keep choosing you — not just on the easy days, but on the ordinary Tuesdays too.</p>
        <p>On <strong>25th November</strong>, we will make it official in front of everyone who loves us. On <strong>28th January 2027</strong>, I get to call you my wife.</p>
        <p>This is only the first birthday of yours I get to celebrate. I plan on being there for every single one that follows.</p>
      </div>` },
    5: { icon:'⏳', title:'Our Journey Ahead', compact:true, html:`
      <div class="cd-stack">
        ${countdownCard('💍','Our Engagement','25 November 2026','2026-11-25T00:00:00','closer every second')}
        ${countdownCard('💒','Our Wedding','28 January 2027','2027-01-28T00:00:00','the day you become my wife')}
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
    modalBody.querySelectorAll('.memory-gallery img').forEach(wireGalleryImg);
  }
  function closeModal(){
    overlay.classList.remove('open');
    const v = modalBody.querySelector('video');
    if (v) v.pause();
    const key = currentModalKey;
    currentModalKey = null;
    // closing a secret's modal moves on to the next one
    if (SECRETS.some(s => s.key === key)){
      setTimeout(nextSecret, 400);
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

  // Every card grid in this site reveals the instant its full-screen slide
  // becomes visible — there's no actual scrolling-into-view left to detect,
  // so a plain double-rAF fade-in is simpler and more reliable than routing
  // through IntersectionObserver (which was flaky for cards inserted via
  // innerHTML the same tick their container is unhidden).
  function revealCards(cards){
    cards.forEach((card, i) => { card.style.transitionDelay = (i * 90) + 'ms'; });
    revealNextFrame(() => cards.forEach(card => card.classList.add('in-view')));
  }

  // She never has to tap a card to flip it — each one shows its front
  // face just long enough to read the label, then turns itself over and
  // is ready to scratch. Staggered per card so a whole grid doesn't flip
  // in lockstep.
  function autoFlipCards(cards, onFinish, baseDelay = 1000, stagger = 260){
    cards.forEach((card, i) => {
      setTimeout(() => flipCard(card, onFinish), baseDelay + i * stagger);
    });
  }

  /* ================= 6 · Five little secrets — one at a time, so there
     is never anything to scroll to before or after scratching it ================= */
  const cardsSlide = $('cardsSlide');
  const secretsStage = $('secretsStage'), secretsEyebrow = $('secretsEyebrow');
  const secretsDots = Array.from(cardsSlide.querySelectorAll('.secrets-dots .js-dot'));
  const SECRETS = [
    { key:'1', icon:'💌', label:'How We Met' },
    { key:'2', icon:'💕', label:'What I Love<br>About You' },
    { key:'3', icon:'📸', label:'Our Favourite<br>Memories' },
    { key:'4', icon:'🤍', label:'A Promise<br>For Us' },
    { key:'5', icon:'⏳', label:'Our Journey<br>Ahead' }
  ];
  let secretIdx = -1, cardsStarted = false;

  (function spawnSecretsStars(){
    const el = $('secretsStars');
    if (!el || reduced) return;
    for (let i=0;i<30;i++){
      const s = document.createElement('span');
      s.className = 'prelude-star';
      s.style.left = (Math.random()*100)+'%';
      s.style.top = (Math.random()*100)+'%';
      s.style.animationDelay = (Math.random()*4)+'s';
      s.style.animationDuration = (2.2+Math.random()*3)+'s';
      el.appendChild(s);
    }
  })();

  function secretCardHTML(s){
    const plain = s.label.replace(/<br>/g, ' ');
    return `
      <div class="scard" data-card="${s.key}" tabindex="0" role="button" aria-label="${plain} — tap to reveal">
        <div class="scard-inner">
          <div class="scard-face scard-front">
            <span class="scard-orn" aria-hidden="true">✦</span>
            <span class="scard-icon">${s.icon}</span>
            <span class="scard-label">${s.label}</span>
            <span class="scard-tap">opening…</span>
          </div>
          <div class="scard-face scard-back">
            <div class="scard-prize"><span class="scard-prize-icon">${s.icon}</span><span class="scard-prize-title">${plain}</span></div>
            <div class="scratch-shine" aria-hidden="true"></div>
            <canvas class="scratch"></canvas>
          </div>
        </div>
      </div>`;
  }

  function showSecretDot(i){
    secretsDots.forEach((d, di) => {
      d.classList.toggle('active', di === i);
      d.classList.toggle('done', di < i);
    });
  }

  function onSecretFound(card){
    if (card.dataset.found) return;
    card.dataset.found = '1';
    card.classList.add('done');
    setTimeout(() => openModal(card.dataset.card), 550);
  }

  function nextSecret(){
    secretIdx++;
    if (secretIdx >= SECRETS.length){ goFinalTransition(); return; }
    const s = SECRETS[secretIdx];
    secretsEyebrow.textContent = `secret ${secretIdx+1} of ${SECRETS.length}`;
    showSecretDot(secretIdx);
    secretsStage.innerHTML = secretCardHTML(s);
    const card = secretsStage.querySelector('.scard');
    revealCards([card]);
    wireScratchCard(card, onSecretFound);
    autoFlipCards([card], onSecretFound, 1000);
  }

  function goCardsSlide(){
    cardsSlide.hidden = false;
    if (cardsStarted) return;
    cardsStarted = true;
    nextSecret();
  }

  function goFinalTransition(){
    cardsSlide.hidden = true; // done with it — don't leave it stacked underneath
    showTransition(
      ['Now comes one more.',
       'the one I saved for last.',
       ''],
      'watch till the end',
      goFinalSlide
    );
  }

  /* ================= 7 · For You — a full-screen video that plays and
     closes itself; nothing to tap shut, nothing to scroll to ================= */
  const finalSlide = $('finalSlide');
  const finalStage = $('finalStage');
  const finalCardEl = finalSlide.querySelector('.scard');
  const finalSub = $('finalSub');
  let finalStarted = false;

  (function spawnFinalStars(){
    const el = $('finalStars');
    if (!el || reduced) return;
    for (let i=0;i<30;i++){
      const s = document.createElement('span');
      s.className = 'prelude-star';
      s.style.left = (Math.random()*100)+'%';
      s.style.top = (Math.random()*100)+'%';
      s.style.animationDelay = (Math.random()*4)+'s';
      s.style.animationDuration = (2.2+Math.random()*3)+'s';
      el.appendChild(s);
    }
  })();

  function showFinalVideo(){
    finalStage.innerHTML = `
      <div class="js-scene js-video-scene">
        <div class="js-video-frame" id="finalVideoFrame">
          <span class="js-video-frame-glow" aria-hidden="true"></span>
          <span class="js-video-corner tl" aria-hidden="true"></span><span class="js-video-corner tr" aria-hidden="true"></span>
          <span class="js-video-corner bl" aria-hidden="true"></span><span class="js-video-corner br" aria-hidden="true"></span>
          <video class="js-video-el" id="finalVideoEl" playsinline controls>
            <source src="assets/video/birthday-wish.mp4" type="video/mp4">
          </video>
          <button class="js-unmute" id="finalUnmute" hidden aria-label="Turn sound on">🔇</button>
        </div>
        <div class="final-video-caption">
          <p class="js-cap-text" id="finalVideoText">I love you, Piu. Happy Birthday. 🎂</p>
        </div>
      </div>`;

    const frame = $('finalVideoFrame'), video = $('finalVideoEl'), unmuteBtn = $('finalUnmute');
    const caption = $('finalVideoText');
    const source = video.querySelector('source');
    let advanced = false;
    const wasBgmPlaying = musicPlaying;
    if (wasBgmPlaying) bgm.pause();

    // the video ending IS the cue to move on — no button to close it
    function advance(){
      if (advanced) return;
      advanced = true;
      try { video.pause(); } catch(e){}
      caption.classList.add('show');
      setTimeout(() => {
        if (wasBgmPlaying) bgm.play().catch(() => {});
        finalSlide.classList.add('fading');
        setTimeout(() => {
          finalSlide.hidden = true;
          finalSlide.classList.remove('fading');
          goBoxSequence();
        }, 800);
      }, 2600);
    }

    video.addEventListener('ended', () => setTimeout(advance, 500));
    video.addEventListener('playing', () => frame.classList.add('playing'));
    // no real clip at that path yet — fall back to a working sample
    // rather than leave her staring at a broken player
    source.addEventListener('error', () => {
      source.src = 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4';
      video.load();
    }, { once:true });

    setTimeout(() => frame.classList.add('show'), 60);

    // try with sound; if the browser blocks that, fall back to muted
    // autoplay with a one-tap way to turn the sound on
    video.play().catch(() => {
      video.muted = true;
      unmuteBtn.hidden = false;
      video.play().catch(() => {});
    });
    unmuteBtn.addEventListener('click', () => { video.muted = false; unmuteBtn.hidden = true; });

    setTimeout(advance, 30000); // safety net if a clip never fires 'ended'
  }

  // she just scratched it — let the reveal breathe for a few seconds
  // before the video takes over the whole screen
  function onFinalFound(card){
    finalSub.textContent = 'just a moment…';
    finalSub.classList.add('breathe');
    setTimeout(showFinalVideo, 7000);
  }
  wireScratchCard(finalCardEl, onFinalFound);

  function goFinalSlide(){
    finalSlide.hidden = false;
    if (finalStarted) return;
    finalStarted = true;
    finalCardEl.classList.add('ready');
    revealCards([finalCardEl]);
    autoFlipCards([finalCardEl], onFinalFound, 1500);
  }

  /* ================= 8 · One more thing (a real box, a real gift) ================= */
  const boxSlide = $('boxSlide');
  const boxStage = $('boxStage');

  (function spawnBoxStars(){
    const el = $('boxStars');
    if (!el || reduced) return;
    for (let i=0;i<30;i++){
      const s = document.createElement('span');
      s.className = 'prelude-star';
      s.style.left = (Math.random()*100)+'%';
      s.style.top = (Math.random()*100)+'%';
      s.style.animationDelay = (Math.random()*4)+'s';
      s.style.animationDuration = (2.2+Math.random()*3)+'s';
      el.appendChild(s);
    }
  })();

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
      goBoxBlast
    );
  }

  let boxSparkleTimer = null;
  function startBoxSparkles(container){
    if (reduced || boxSparkleTimer) return;
    function spawn(){
      const s = document.createElement('span');
      s.className = 'chest-spark';
      const ox = Math.random()*70 - 35;
      s.style.setProperty('--cs-ox', ox+'px');
      s.style.setProperty('--cs-x', (ox*0.6 + (Math.random()*30-15))+'px');
      const dur = 2.2 + Math.random()*1.2;
      s.style.animationDuration = dur+'s';
      container.appendChild(s);
      setTimeout(() => s.remove(), dur*1000+100);
    }
    for (let i=0;i<4;i++) setTimeout(spawn, i*220);
    boxSparkleTimer = setInterval(spawn, 380);
  }

  // a little treasure chest that bursts open on its own — no scratching —
  // and asks her to go open the real box waiting for her
  function goBoxBlast(){
    boxSlide.hidden = false;
    renderBoxStep(`
      <div class="chest-stage" id="chestStage">
        <span class="chest-glow" aria-hidden="true"></span>
        <div class="chest-burst" id="chestBurst" aria-hidden="true">
          <span class="ray" style="transform:rotate(0deg)"></span>
          <span class="ray" style="transform:rotate(45deg)"></span>
          <span class="ray" style="transform:rotate(90deg)"></span>
          <span class="ray" style="transform:rotate(135deg)"></span>
          <span class="ray" style="transform:rotate(180deg)"></span>
          <span class="ray" style="transform:rotate(225deg)"></span>
          <span class="ray" style="transform:rotate(270deg)"></span>
          <span class="ray" style="transform:rotate(315deg)"></span>
        </div>
        <div class="chest-sparkles" id="chestSparkles" aria-hidden="true"></div>
        <div class="chest" id="chest">
          <div class="chest-lid"><span class="chest-lid-band"></span></div>
          <div class="chest-body">
            <span class="chest-band cb1"></span><span class="chest-band cb2"></span>
            <span class="chest-lock"><span class="chest-lock-gem">♥</span></span>
          </div>
          <span class="chest-shine" aria-hidden="true"></span>
        </div>
        <div class="chest-reveal" id="chestReveal" hidden>
          <div class="chest-note">
            <span class="chest-note-quote" aria-hidden="true">❝</span>
            <p class="chest-note-text">Not here, love — it's inside the little box I gave you. Go on, open it.<span class="chest-note-heart"> 🤍</span></p>
          </div>
          <button class="cel-btn chest-continue" id="chestContinue" hidden>
            <span>I'm on my way</span><span class="cel-btn-arrow">→</span>
          </button>
        </div>
      </div>`,
      () => {
        const stage = $('chestStage'), reveal = $('chestReveal'), continueBtn = $('chestContinue');

        stage.classList.add('shaking');
        setTimeout(() => {
          stage.classList.remove('shaking');
          stage.classList.add('opened');
          cannons();
          setTimeout(() => burst(innerWidth/2, innerHeight*0.32, 90), 200);
          startBoxSparkles($('chestSparkles'));
        }, 900);

        setTimeout(() => {
          reveal.hidden = false;
          revealNextFrame(() => reveal.classList.add('show'));
        }, 1900);

        setTimeout(() => {
          continueBtn.hidden = false;
          revealNextFrame(() => continueBtn.classList.add('show'));
        }, 3300);

        continueBtn.addEventListener('click', () => {
          if (boxSparkleTimer){ clearInterval(boxSparkleTimer); boxSparkleTimer = null; }
          goOpenedQuestion();
        });
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

  // an unclickable "No" — it dodges the moment she gets close, so "Yes"
  // is the only real answer (funny, not frustrating: it never blocks her)
  const NO_TAUNTS = ['No','Nope!','Nice try 😄','Not a chance','Never!','Catch me first','Nuh-uh','Try again'];
  function makeDodgeButton(btn, zone){
    let ti = 0;
    function place(){
      const zr = zone.getBoundingClientRect(), br = btn.getBoundingClientRect();
      const maxX = Math.max(0, zr.width - br.width), maxY = Math.max(0, zr.height - br.height);
      btn.style.left = (Math.random()*maxX).toFixed(0) + 'px';
      btn.style.top = (Math.random()*maxY).toFixed(0) + 'px';
      btn.textContent = NO_TAUNTS[ti % NO_TAUNTS.length];
      ti++;
    }
    place();
    btn.addEventListener('pointerenter', place);
    btn.addEventListener('pointerdown', e => { e.preventDefault(); place(); });
    zone.addEventListener('pointermove', e => {
      const br = btn.getBoundingClientRect();
      const dx = e.clientX - (br.left+br.width/2), dy = e.clientY - (br.top+br.height/2);
      if (Math.hypot(dx,dy) < 75) place();
    });
    addEventListener('resize', place);
  }

  function goLikeQuestion(){
    renderBoxStep(`
      <h2 class="box-title">Do you like it?</h2>
      <p class="box-sub">be honest…</p>
      <div class="box-btn-row">
        <button class="box-btn" id="likeYes">Yes</button>
      </div>
      <div class="dodge-zone" id="dodgeZone">
        <button class="box-btn no-btn" id="noBtn">No</button>
      </div>`,
      () => {
        $('likeYes').addEventListener('click', () => {
          burst(innerWidth/2, innerHeight*0.5, 55);
          cannons();
          goConfirmRound(0);
        });
        makeDodgeButton($('noBtn'), $('dodgeZone'));
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
      const endingSlide = $('endingSlide');
      endingSlide.hidden = false;
      startEndingPetals();
      burst(innerWidth/2, innerHeight*0.3, 60);

      // let her sit with the bouquet a while, then quietly close the book
      setTimeout(() => {
        endingSlide.classList.add('fading');
        setTimeout(() => {
          endingSlide.hidden = true;
          endingSlide.classList.remove('fading');
          goMemories(goEpilogue);
        }, 1000);
      }, reduced ? 3000 : 11000);
    }, 800);
  }

  // a little look back — the same photos from her journey, flashing past
  // on their own, one last time, before the very last screen
  (function spawnMemoriesStars(){
    const el = $('memoriesStars');
    if (!el || reduced) return;
    for (let i=0;i<30;i++){
      const s = document.createElement('span');
      s.className = 'prelude-star';
      s.style.left = (Math.random()*100)+'%';
      s.style.top = (Math.random()*100)+'%';
      s.style.animationDelay = (Math.random()*4)+'s';
      s.style.animationDuration = (2.2+Math.random()*3)+'s';
      el.appendChild(s);
    }
  })();

  function goMemories(onNext){
    const slide = $('memoriesSlide');
    const imgs = [$('memoriesImgA'), $('memoriesImgB')];
    const dots = Array.from(slide.querySelectorAll('.memories-dots .js-dot'));
    const nextBtn = $('memoriesNextBtn');
    const prevBtn = $('memoriesPrevBtn');
    const continueBtn = $('memoriesContinueBtn');
    // its own dedicated set of photos — separate from the journey video
    // posters and the scratch-card gallery, so this flashback can be a
    // totally different selection of pictures
    const sources = [1,2,3,4,5,6].map(n => 'assets/images/frames' + n);
    const fallbacks = [1,2,3,4,5,6].map(n => 'https://picsum.photos/seed/piu-frame-' + n + '/700/860');
    slide.hidden = false;
    slide.classList.remove('at-end');
    continueBtn.classList.remove('show');
    let idx = -1, active = 0, advanceTimer = null, ended = false;

    function showDot(i){
      dots.forEach((d, di) => {
        d.classList.toggle('active', di === i);
        d.classList.toggle('done', di < i);
      });
    }
    function preload(base, fallback, cb){
      resolvePhoto(base, cb, () => cb(fallback));
    }
    function clearAuto(){
      if (advanceTimer){ clearTimeout(advanceTimer); advanceTimer = null; }
    }
    // she reaches the last photo and the montage waits here — nothing
    // sweeps her onward until she chooses to continue
    function finish(){
      ended = true;
      slide.classList.add('at-end');
      revealNextFrame(() => continueBtn.classList.add('show'));
    }
    // shows photo i and, once it's loaded, quietly resumes the auto-flash
    // from there — used by the auto-timer as well as both arrows
    function render(i){
      idx = i;
      showDot(idx);
      prevBtn.classList.toggle('disabled', idx <= 0);
      const showImg = imgs[active], hideImg = imgs[1 - active];
      preload(sources[idx], fallbacks[idx], src => {
        showImg.src = src;
        showImg.classList.add('show');
        hideImg.classList.remove('show');
        active = 1 - active;
        clearAuto();
        advanceTimer = setTimeout(next, reduced ? 700 : 1800);
      });
    }
    function next(){
      if (idx + 1 >= sources.length){ clearAuto(); setTimeout(finish, reduced ? 200 : 500); return; }
      render(idx + 1);
    }
    function prev(){
      if (idx <= 0) return;
      if (ended){ ended = false; slide.classList.remove('at-end'); continueBtn.classList.remove('show'); }
      render(idx - 1);
    }
    nextBtn.onclick = next;
    prevBtn.onclick = prev;
    continueBtn.onclick = () => {
      slide.classList.add('fading');
      setTimeout(() => {
        slide.hidden = true;
        slide.classList.remove('fading');
        onNext();
      }, 800);
    };
    render(0);
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

  /* ================= 10 · Epilogue — one last quiet note, then black ================= */
  (function spawnEpilogueStars(){
    const el = $('epilogueStars');
    if (!el || reduced) return;
    for (let i=0;i<40;i++){
      const s = document.createElement('span');
      s.className = 'epilogue-star';
      s.style.left = (Math.random()*100)+'%';
      s.style.top = (Math.random()*100)+'%';
      s.style.animationDelay = (Math.random()*4)+'s';
      s.style.animationDuration = (2.4+Math.random()*3)+'s';
      el.appendChild(s);
    }
  })();

  // a last, unhurried note fades in on black, holds, ends on "The End." —
  // then everything fades away, stars included, leaving pure black.
  // nothing more to tap or read: that stillness is the actual ending.
  function goEpilogue(){
    const slide = $('epilogueSlide'), wishes = $('epilogueWishes'),
          endmark = $('epilogueEndmark'), stars = $('epilogueStars');
    slide.hidden = false;
    const lines = Array.from(wishes.querySelectorAll('.epilogue-line'));

    // beat 2 — "The End." arrives alone, only once the wishes have
    // completely cleared away, then that too fades, stars included,
    // into a screen with nothing left on it at all
    function showEndmark(){
      endmark.hidden = false;
      revealNextFrame(() => endmark.classList.add('show'));
      setTimeout(() => {
        endmark.classList.remove('show');
        endmark.classList.add('fade-out');
        stars.classList.add('fade-out');
      }, reduced ? 2600 : 4600);
    }

    if (reduced){
      lines.forEach(l => l.classList.add('show'));
      setTimeout(() => {
        wishes.classList.add('fade-out');
        setTimeout(showEndmark, 700);
      }, 3000);
      return;
    }

    // beat 1 — the wishes, then a full fade before anything else appears
    let delay = 1000;
    lines.forEach((l, i) => {
      setTimeout(() => l.classList.add('show'), delay);
      delay += (i === lines.length - 1) ? 2600 : 1900;
    });
    delay += 3600; // hold on the last line before it clears
    setTimeout(() => wishes.classList.add('fade-out'), delay);
    delay += 2600; // wait for the wishes to be fully gone
    setTimeout(showEndmark, delay);
  }
})();
