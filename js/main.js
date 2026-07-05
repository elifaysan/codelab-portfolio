// ═══════════════════════════════════════════
//  Elif Aysan — Immersive Digital Journey
//  Lenis · GSAP ScrollTrigger · Canvas AI
// ═══════════════════════════════════════════

document.getElementById("year").textContent = new Date().getFullYear();

const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const finePointer = window.matchMedia("(pointer: fine)").matches;

gsap.registerPlugin(ScrollTrigger);

// Canlı sitede farklı domain kullanıyorsan index.html içinde ayarla:
// <script>window.CONTACT_API_URL = "https://api.senindomain.com/api/contact";</script>
const CONTACT_API =
  window.CONTACT_API_URL ||
  (location.hostname === "localhost" || location.hostname === "127.0.0.1"
    ? `http://localhost:3001/api/contact`
    : "/api/contact");

// ── Lenis smooth scroll ──
let lenis;
if (!reduced && typeof Lenis !== "undefined") {
  lenis = new Lenis({
    duration: 1.4,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smoothWheel: true,
    syncTouch: true,
    touchMultiplier: 1.2,
  });

  lenis.on("scroll", ScrollTrigger.update);

  ScrollTrigger.scrollerProxy(document.documentElement, {
    scrollTop(value) {
      if (arguments.length) {
        lenis.scrollTo(value, { immediate: true });
      }
      return lenis.scroll;
    },
    getBoundingClientRect() {
      return {
        top: 0,
        left: 0,
        width: innerWidth,
        height: innerHeight,
      };
    },
  });

  ScrollTrigger.addEventListener("refresh", () => lenis.resize());

  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);
}

// Dokunmatik / trackpad kaydırmalarında ScrollTrigger senkronu
addEventListener(
  "scroll",
  () => {
    ScrollTrigger.update();
  },
  { passive: true },
);

// ── Nav ──
const nav = document.getElementById("nav");
const navToggle = document.getElementById("navToggle");
const navLinks = document.getElementById("navLinks");

navToggle?.addEventListener("click", () => navLinks.classList.toggle("open"));

navLinks?.querySelectorAll("a").forEach((a) => {
  a.addEventListener("click", (e) => {
    navLinks.classList.remove("open");
    const href = a.getAttribute("href");
    if (href?.startsWith("#") && lenis) {
      e.preventDefault();
      lenis.scrollTo(href);
    }
  });
});

let lastY = 0;
ScrollTrigger.create({
  start: 0,
  end: "max",
  onUpdate: (self) => {
    const y = self.scroll();
    if (y > 120 && y > lastY) nav.classList.add("hidden");
    else nav.classList.remove("hidden");
    lastY = y;
  },
});

// ── Journey progress + scene label ──
const jpFill = document.getElementById("jpFill");
const sceneLabel = document.getElementById("sceneLabel");
const scenes = document.querySelectorAll(".scene[data-scene]");

ScrollTrigger.create({
  start: 0,
  end: "max",
  onUpdate: (self) => {
    if (jpFill) jpFill.style.width = `${self.progress * 100}%`;
  },
});

function updateLabel(text) {
  if (!sceneLabel) return;
  sceneLabel.classList.remove("visible");
  setTimeout(() => {
    sceneLabel.textContent = text;
    sceneLabel.classList.add("visible");
  }, 150);
}

scenes.forEach((scene) => {
  ScrollTrigger.create({
    trigger: scene,
    start: "top 60%",
    end: "bottom 40%",
    onEnter: () => updateLabel(scene.dataset.scene),
    onEnterBack: () => updateLabel(scene.dataset.scene),
  });
});
updateLabel("Intro");

// ── Cursor glow ──
const glow = document.getElementById("cursorGlow");
if (glow && finePointer && !reduced) {
  let gx = innerWidth / 2;
  let gy = innerHeight / 2;
  let tx = gx;
  let ty = gy;
  addEventListener("mousemove", (e) => {
    tx = e.clientX;
    ty = e.clientY;
  }, { passive: true });
  const loop = () => {
    gx += (tx - gx) * 0.1;
    gy += (ty - gy) * 0.1;
    glow.style.transform = `translate(${gx}px, ${gy}px)`;
    requestAnimationFrame(loop);
  };
  loop();
} else if (glow) {
  glow.style.display = "none";
}

// ── Star dust (tıklama + imleç izi) ──
const sparkCanvas = document.getElementById("sparkCanvas");
if (sparkCanvas && !reduced) {
  const sctx = sparkCanvas.getContext("2d");
  let sparks = [];
  const sparkColors = ["#2563EB", "#7C3AED", "#06B6D4", "#F59E0B", "#E879F9", "#ffffff"];

  const resizeSpark = () => {
    const dpr = devicePixelRatio || 1;
    sparkCanvas.width = innerWidth * dpr;
    sparkCanvas.height = innerHeight * dpr;
    sctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  resizeSpark();
  addEventListener("resize", resizeSpark);

  const spawnBurst = (x, y, count = 30) => {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 5 + 1.5;
      sparks.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1,
        size: Math.random() * 2.8 + 0.6,
        color: sparkColors[Math.floor(Math.random() * sparkColors.length)],
      });
    }
  };

  let lastTrail = 0;
  addEventListener(
    "mousemove",
    (e) => {
      const now = performance.now();
      if (now - lastTrail < 35) return;
      lastTrail = now;
      sparks.push({
        x: e.clientX + (Math.random() - 0.5) * 8,
        y: e.clientY + (Math.random() - 0.5) * 8,
        vx: (Math.random() - 0.5) * 1.2,
        vy: (Math.random() - 0.5) * 1.2,
        life: 0.55,
        size: Math.random() * 1.4 + 0.4,
        color: sparkColors[Math.floor(Math.random() * sparkColors.length)],
      });
    },
    { passive: true }
  );

  addEventListener("click", (e) => spawnBurst(e.clientX, e.clientY), { passive: true });

  const drawSparkle = (x, y, r, color, alpha) => {
    sctx.save();
    sctx.globalAlpha = alpha;
    sctx.strokeStyle = color;
    sctx.lineWidth = 1.2;
    sctx.lineCap = "round";
    sctx.beginPath();
    sctx.moveTo(x - r * 2, y);
    sctx.lineTo(x + r * 2, y);
    sctx.moveTo(x, y - r * 2);
    sctx.lineTo(x, y + r * 2);
    sctx.stroke();
    sctx.beginPath();
    sctx.arc(x, y, r * 0.45, 0, Math.PI * 2);
    sctx.fillStyle = color;
    sctx.fill();
    sctx.restore();
  };

  const tickSparks = () => {
    sctx.clearRect(0, 0, innerWidth, innerHeight);
    sparks = sparks.filter((s) => s.life > 0);
    for (const s of sparks) {
      s.x += s.vx;
      s.y += s.vy;
      s.vy += 0.03;
      s.vx *= 0.98;
      s.life -= 0.022;
      if (s.life > 0.35) {
        drawSparkle(s.x, s.y, s.size, s.color, s.life);
      } else {
        sctx.globalAlpha = s.life;
        sctx.fillStyle = s.color;
        sctx.beginPath();
        sctx.arc(s.x, s.y, s.size * 0.7, 0, Math.PI * 2);
        sctx.fill();
      }
    }
    sctx.globalAlpha = 1;
    requestAnimationFrame(tickSparks);
  };
  tickSparks();
}

// ── Full-page code-glyph canvas ──
function initCodeCanvas() {
  const canvas = document.getElementById("codeCanvas");
  if (!canvas) return;
  if (reduced) { canvas.style.display = "none"; return; }

  const ctx = canvas.getContext("2d");
  const TOKENS = [
    "Hello World",
    'print("Merhaba")',
    "<html>",
    "</div>",
    "function()",
    "if (true)",
    "console.log",
    "password",
    "username",
    "Loading...",
    "404 Error",
    "RUN",
    "npm install",
    "git push",
    "import React",
    "while(true)",
    "return 0",
    "SELECT *",
    "API",
    "JSON",
    "01010101",
    "// yorum",
    "try { }",
    "AI = true",
    "Deploy ✓",
    "true / false",
    "for (i=0)",
    "<button>",
    "ERROR 500",
    "Update...",
    "WiFi OK",
    "public class",
    "System.out",
    "def main():",
    "HTML · CSS",
    "sudo",
    "BUILD",
    "git commit",
    "Download",
    "Connected",
    "<?php",
    "var x = 1",
    "else { }",
  ];
  const COLORS = [
    (a) => `rgba(67, 56, 202, ${a})`,
    (a) => `rgba(192, 38, 211, ${a})`,
    (a) => `rgba(245, 158, 11, ${a})`,
    (a) => `rgba(129, 140, 248, ${a * 0.85})`,
    (a) => `rgba(255, 255, 255, ${a * 0.55})`,
  ];

  let W, H, glyphs, animId = null;

  function spawnGlyph(randomY) {
    const text = TOKENS[Math.floor(Math.random() * TOKENS.length)];
    return {
      text,
      x: Math.random() * W,
      y: randomY ? Math.random() * H : H + 30,
      size: text.length > 14 ? 10 + Math.random() * 5 : 12 + Math.random() * 9,
      speed: 0.15 + Math.random() * 0.28,
      drift: (Math.random() - 0.5) * 0.3,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      alpha: 0.09 + Math.random() * 0.14,
    };
  }

  function initGlyphs() {
    const count = innerWidth > 768 ? 32 : 18;
    glyphs = Array.from({ length: count }, () => spawnGlyph(true));
  }

  function resize() {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    W = innerWidth;
    H = innerHeight;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    initGlyphs();
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    ctx.textBaseline = "middle";
    glyphs.forEach((g) => {
      g.y -= g.speed;
      g.x += g.drift;
      if (g.y < -24) Object.assign(g, spawnGlyph(false));
      ctx.font = `500 ${g.size}px "JetBrains Mono", monospace`;
      ctx.fillStyle = g.color(g.alpha);
      ctx.fillText(g.text, g.x, g.y);
    });
    animId = requestAnimationFrame(draw);
  }

  resize();
  draw();
  addEventListener("resize", () => {
    cancelAnimationFrame(animId);
    resize();
    draw();
  });
}
initCodeCanvas();

// ── Hero entrance ──
gsap.to(".scene-hero .scene-reveal", {
  opacity: 1,
  y: 0,
  filter: "blur(0px)",
  duration: 1.1,
  stagger: 0.12,
  ease: "power3.out",
  delay: 0.2,
});

// ── Scene reveals ──
document.querySelectorAll(".scene:not(.scene-hero) .scene-reveal").forEach((el) => {
  gsap.to(el, {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    duration: 1,
    ease: "power3.out",
    scrollTrigger: {
      trigger: el,
      start: "top 85%",
      toggleActions: "play none none reverse",
    },
  });
});

// ── Animated stat counter (hero "5+") ──
document.querySelectorAll(".fu-num[data-count]").forEach((el) => {
  const target = parseFloat(el.dataset.count);
  const suffix = el.dataset.suffix || "";
  if (reduced || Number.isNaN(target)) {
    el.textContent = `${target}${suffix}`;
    return;
  }
  const counter = { val: 0 };
  gsap.to(counter, {
    val: target,
    duration: 1.6,
    ease: "power2.out",
    delay: 0.9,
    onUpdate: () => { el.textContent = `${Math.round(counter.val)}${suffix}`; },
  });
});

// ── Magnetic buttons ──
if (finePointer && !reduced) {
  document.querySelectorAll("[data-magnetic]").forEach((btn) => {
    const strength = parseFloat(btn.dataset.magnetic) || 0.35;
    btn.addEventListener("mousemove", (e) => {
      const r = btn.getBoundingClientRect();
      const x = e.clientX - r.left - r.width / 2;
      const y = e.clientY - r.top - r.height / 2;
      gsap.to(btn, { x: x * strength, y: y * strength, duration: 0.5, ease: "power3.out" });
    });
    btn.addEventListener("mouseleave", () => {
      gsap.to(btn, { x: 0, y: 0, duration: 0.6, ease: "elastic.out(1, 0.4)" });
    });
  });
}

// ── 3D tilt on build cards ──
if (finePointer && !reduced) {
  document.querySelectorAll(".h-card").forEach((card) => {
    card.addEventListener("mousemove", (e) => {
      const r = card.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5;
      const py = (e.clientY - r.top) / r.height - 0.5;
      gsap.to(card, {
        rotateY: px * 10,
        rotateX: -py * 10,
        transformPerspective: 900,
        duration: 0.5,
        ease: "power2.out",
      });
    });
    card.addEventListener("mouseleave", () => {
      gsap.to(card, { rotateX: 0, rotateY: 0, duration: 0.7, ease: "power3.out" });
    });
  });
}

// ── Horizontal scroll (Scene 2) — native, tüm cihazlarda güvenilir ──
function enableNativeHorizontal() {
  const viewport = document.querySelector(".horizontal-viewport");
  if (!viewport) return;
  viewport.classList.add("horizontal-native");
  viewport.setAttribute("data-lenis-prevent", "");
}

function initHorizontalScroll() {
  const viewport = document.querySelector(".horizontal-viewport");
  const hTrack = document.getElementById("hTrack");
  const hBar = document.getElementById("hBar");
  if (!viewport || !hTrack) return null;

  enableNativeHorizontal();

  const hint = viewport.querySelector(".h-scroll-hint");
  if (hint) hint.textContent = "Yana kaydır →";

  const syncProgress = () => {
    const max = viewport.scrollWidth - viewport.clientWidth;
    if (hBar) {
      hBar.style.width = max > 0 ? `${(viewport.scrollLeft / max) * 100}%` : "0%";
    }
  };

  viewport.addEventListener("scroll", syncProgress, { passive: true });
  syncProgress();

  let dragging = false;
  let startX = 0;
  let startScroll = 0;

  const onMouseDown = (e) => {
    if (!finePointer || e.button !== 0) return;
    const target = e.target;
    if (target.closest("a, button, input, textarea, select")) return;
    dragging = true;
    startX = e.pageX;
    startScroll = viewport.scrollLeft;
    viewport.classList.add("is-dragging");
  };

  const onMouseMove = (e) => {
    if (!dragging) return;
    e.preventDefault();
    viewport.scrollLeft = startScroll - (e.pageX - startX);
    syncProgress();
  };

  const onMouseUp = () => {
    if (!dragging) return;
    dragging = false;
    viewport.classList.remove("is-dragging");
  };

  viewport.addEventListener("mousedown", onMouseDown);
  addEventListener("mousemove", onMouseMove);
  addEventListener("mouseup", onMouseUp);

  return {
    kill() {
      viewport.removeEventListener("scroll", syncProgress);
      viewport.removeEventListener("mousedown", onMouseDown);
      removeEventListener("mousemove", onMouseMove);
      removeEventListener("mouseup", onMouseUp);
    },
  };
}

function refreshHorizontalScroll() {
  horizontalScroll?.kill?.();
  horizontalScroll = initHorizontalScroll();
  ScrollTrigger.refresh();
}

let horizontalScroll = initHorizontalScroll();

window.addEventListener("load", () => {
  refreshHorizontalScroll();
  // Yavaş bağlantıda kart genişliği geç hesaplanırsa tekrar dene
  setTimeout(refreshHorizontalScroll, 400);
  setTimeout(refreshHorizontalScroll, 1500);
});

if (document.fonts?.ready) {
  document.fonts.ready.then(() => refreshHorizontalScroll());
}

// ── Process timeline ──
const processLine = document.getElementById("processLine");
if (processLine) {
  processLine.style.setProperty("--line-scale", "0");

  ScrollTrigger.create({
    trigger: processLine,
    start: "top 70%",
    end: "bottom 60%",
    scrub: 1,
    onUpdate: (self) => {
      processLine.style.setProperty("--line-scale", self.progress);
    },
  });

  processLine.querySelectorAll(".pl-step").forEach((step, i) => {
    gsap.from(step.querySelector(".pl-icon"), {
      scale: 0,
      rotation: -180,
      duration: 0.6,
      ease: "back.out(1.7)",
      scrollTrigger: {
        trigger: step,
        start: "top 80%",
        toggleActions: "play none none reverse",
      },
      delay: i * 0.05,
    });
  });
}

// ── AI Canvas ──
const canvas = document.getElementById("aiCanvas");
if (canvas && !reduced) {
  const ctx = canvas.getContext("2d");
  let W;
  let H;
  let nodes;
  let animId = null;
  const NODE_COUNT = innerWidth > 768 ? 55 : 30;
  const CONNECT_DIST = 160;

  function resize() {
    const dpr = devicePixelRatio;
    W = canvas.offsetWidth;
    H = canvas.offsetHeight;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    initNodes();
  }

  function initNodes() {
    nodes = Array.from({ length: NODE_COUNT }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
      r: Math.random() * 2.5 + 1,
    }));
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    for (let i = 0; i < nodes.length; i++) {
      const a = nodes[i];
      a.x += a.vx;
      a.y += a.vy;
      if (a.x < 0 || a.x > W) a.vx *= -1;
      if (a.y < 0 || a.y > H) a.vy *= -1;

      ctx.beginPath();
      ctx.arc(a.x, a.y, a.r, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(129, 140, 248, 0.75)"; // indigo-tinted node
      ctx.fill();

      for (let j = i + 1; j < nodes.length; j++) {
        const b = nodes[j];
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < CONNECT_DIST) {
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.strokeStyle = `rgba(192, 38, 211, ${0.28 * (1 - dist / CONNECT_DIST)})`; // fuchsia links
          ctx.lineWidth = 0.8;
          ctx.stroke();
        }
      }
    }
    animId = requestAnimationFrame(draw);
  }

  resize();
  draw();

  addEventListener("resize", () => {
    cancelAnimationFrame(animId);
    resize();
    draw();
  });

  ScrollTrigger.create({
    trigger: ".scene-ai",
    start: "top bottom",
    end: "bottom top",
    onLeave: () => { cancelAnimationFrame(animId); animId = null; },
    onEnterBack: () => { if (!animId) draw(); },
    onLeaveBack: () => { cancelAnimationFrame(animId); animId = null; },
  });
}

// ── CTA blob parallax ──
const contactScene = document.querySelector(".scene-contact");
if (contactScene && finePointer && !reduced) {
  const blobs = contactScene.querySelectorAll(".cta-blob");
  contactScene.addEventListener("mousemove", (e) => {
    const r = contactScene.getBoundingClientRect();
    const cx = (e.clientX - r.left) / r.width - 0.5;
    const cy = (e.clientY - r.top) / r.height - 0.5;
    blobs.forEach((b, i) => {
      const d = (i + 1) * 20;
      gsap.to(b, { x: cx * d, y: cy * d, duration: 1, ease: "power2.out" });
    });
  });
}

// ── Contact form ──
const form = document.getElementById("contactForm");
const note = document.getElementById("formNote");
const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

form?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const name = form.name;
  const email = form.email;
  const message = form.message;
  const submitBtn = form.querySelector(".btn-submit");
  [name, email, message].forEach((f) => f.classList.remove("invalid"));
  note.textContent = "";
  note.className = "form-note";

  let ok = true;
  if (!name.value.trim()) { name.classList.add("invalid"); ok = false; }
  if (!isEmail(email.value.trim())) { email.classList.add("invalid"); ok = false; }
  if (!message.value.trim()) { message.classList.add("invalid"); ok = false; }
  if (!ok) {
    note.textContent = "Lütfen tüm alanları doldurun.";
    note.className = "form-note err";
    return;
  }

  submitBtn.disabled = true;
  note.textContent = "Gönderiliyor...";
  note.className = "form-note";

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 35_000);

  try {
    const res = await fetch(CONTACT_API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        name: name.value.trim(),
        email: email.value.trim(),
        service: form.service.value,
        message: message.value.trim(),
        _gotcha: form._gotcha?.value ?? "",
      }),
      signal: controller.signal,
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      note.textContent =
        data.error ||
        "Gönderilemedi. Lütfen tekrar deneyin veya elifaysancode@outlook.com adresine yazın.";
      note.className = "form-note err";
      return;
    }

    note.textContent = "Mesajınız iletildi. En kısa sürede dönüş yapacağım.";
    note.className = "form-note ok";
    form.reset();
  } catch (err) {
    note.textContent =
      err.name === "AbortError"
        ? "İstek zaman aşımına uğradı. Lütfen tekrar deneyin veya elifaysancode@outlook.com adresine yazın."
        : "Gönderilemedi. Lütfen tekrar deneyin veya elifaysancode@outlook.com adresine yazın.";
    note.className = "form-note err";
  } finally {
    clearTimeout(timeoutId);
    submitBtn.disabled = false;
  }
});

let resizeTimer;
addEventListener("resize", () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    refreshHorizontalScroll();
  }, 300);
});