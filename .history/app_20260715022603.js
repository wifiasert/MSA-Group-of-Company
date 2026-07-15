const services = [
  ["Website Development", "Fast, elegant websites, marketing pages, and product experiences that feel premium at every screen size.", "$499+"],
  ["Brand Identity", "Visual systems, logos, motion, launch kits, and campaign design that feel polished and deliberate.", "$300+"],
  ["Music Production", "Recording, mixing, mastering, release support, and creative direction for serious artists.", "$120+"],
  ["Software Development", "Custom tools, dashboards, integrations, and digital operations built for ambitious teams.", "$900+"],
  ["Digital Marketing", "Campaign strategy, ads, content, SEO, social growth, and audience systems that convert.", "$350+"],
  ["Technology Solutions", "Setup, cloud support, operations, analytics, and secure infrastructure for modern businesses.", "$200+"],
];
const software = [
  { name: "MSA Studio Suite", category: "Music Software", price: 69, badge: "New" },
  { name: "MSA Phone Toolkit", category: "Device Software", price: 39, badge: "Popular" },
  { name: "Creative Launch Pack", category: "Creator Tools", price: 29, badge: "Starter" },
];
const pages = [
  { title: "Home", body: "Welcome to the MSA Group of Company platform", url: "/" },
  { title: "About", body: "Learn about the company and its mission", url: "/about/" },
  { title: "Music", body: "Record label, distribution and artist services", url: "/music/" },
  { title: "Software", body: "Software products and launches", url: "/software/" },
  { title: "Support", body: "Knowledge base, tickets and solutions", url: "/support/" },
  { title: "Contact", body: "Book a consultation or contact the studio", url: "/contact/" },
  { title: "Admin", body: "Private administration and operations", url: "/admin/" },
];
const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

function resolveSitePath(targetPath) {
  const currentPath = window.location.pathname.replace(/index\.html$/, "").replace(/\/+$/, "/") || "/";
  const currentSegments = currentPath.replace(/^\/+/, "").split("/").filter(Boolean);
  const normalizedTarget = targetPath.startsWith("/") ? targetPath.slice(1) : targetPath;
  const targetSegments = normalizedTarget.replace(/^\/+/, "").replace(/\/+$/, "").split("/").filter(Boolean);

  if (!normalizedTarget || !targetSegments.length) return "./";

  let common = 0;
  while (common < Math.min(currentSegments.length, targetSegments.length) && currentSegments[common] === targetSegments[common]) {
    common += 1;
  }

  const up = currentSegments.length - common;
  const down = targetSegments.slice(common).join("/");
  const relative = `${"../".repeat(up)}${down}${down ? "/" : ""}`;
  return relative || "./";
}

function toast(message) {
  const box = $("#toast");
  if (!box) return;
  box.textContent = message;
  box.classList.add("show");
  setTimeout(() => box.classList.remove("show"), 2400);
}

function renderServices() {
  const target = $("#serviceGrid");
  if (!target) return;
  target.innerHTML = services.map(([name, description, price]) => `
    <article class="glass-card">
      <span class="chip">Premium</span>
      <h3>${name}</h3>
      <p>${description}</p>
      <p><strong>Starting at:</strong> ${price}</p>
      <a class="inline-link" href="${resolveSitePath("/contact/")}">Request a proposal</a>
    </article>
  `).join("");
}

function renderSoftware() {
  const target = $("#softwareGrid");
  if (!target) return;
  target.innerHTML = software.map((item) => `
    <article class="glass-card">
      <span class="chip">${item.badge}</span>
      <h3>${item.name}</h3>
      <p>${item.category}</p>
      <p><strong>Starting at:</strong> $${item.price}</p>
      <a class="secondary-button" href="${resolveSitePath("/software/store/")}">View product</a>
    </article>
  `).join("");
}

function animateCounters() {
  $$("[data-count]").forEach((item) => {
    const target = Number(item.dataset.count);
    let current = 0;
    const step = Math.max(1, Math.ceil(target / 65));
    const timer = setInterval(() => {
      current = Math.min(target, current + step);
      item.textContent = `${current}+`;
      if (current >= target) clearInterval(timer);
    }, 24);
  });
}

function setupReveal() {
  const items = $$(".reveal");
  if (!items.length) return;
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) entry.target.classList.add("visible");
    });
  }, { threshold: .18 });
  items.forEach((item) => observer.observe(item));
}

function setupForms() {
  $$("[data-form]").forEach((form) => {
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      toast("Submitted successfully. The team will follow up shortly.");
      form.reset();
    });
  });
}

function setupSearch() {
  const input = $("#siteSearch");
  const results = $("#searchResults");
  if (!input || !results) return;
  input.addEventListener("input", (event) => {
    const term = event.target.value.toLowerCase();
    const matches = pages.filter((page) => `${page.title} ${page.body}`.toLowerCase().includes(term)).slice(0, 8);
    results.innerHTML = term ? matches.map((page) => `<a href="${resolveSitePath(page.url)}" data-close><strong>${page.title}</strong><p>${page.body}</p></a>`).join("") : "";
  });
}

function init() {
  renderServices();
  renderSoftware();
  animateCounters();
  setupReveal();
  setupForms();
  setupSearch();

  const loader = $("#loader");
  if (loader) {
    // Enhanced loader: keep overlay until window load, then fade
    const loader = $("#loader");
    const hideLoader = () => loader && loader.classList.add("hidden");
    if (document.readyState === "complete") {
      setTimeout(hideLoader, 120);
    } else {
      window.addEventListener("load", () => setTimeout(hideLoader, 180));
    }

    // Inject reliable SVG icons to replace broken character glyphs
    const svgMenu = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 6h18M3 12h18M3 18h18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    const svgSearch = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="11" cy="11" r="6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M21 21l-4.35-4.35" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    const svgTheme = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    const svgClose = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';

    $$(".nav-toggle").forEach((btn) => { btn.innerHTML = svgMenu; });
    $("#searchOpen")?.innerHTML = svgSearch;
    $("#themeToggle")?.innerHTML = svgTheme;
    $$(".close-modal").forEach((btn) => { btn.innerHTML = svgClose; });
      document.body.classList.add("loaded");
    }, 650);
  } else {
    document.body.classList.add("loaded");
  }

  if (localStorage.getItem("msa-theme") === "light") document.body.classList.add("light");
  if (localStorage.getItem("msa-cookies") === "accepted") {
    const banner = $("#cookieBanner");
    if (banner) banner.classList.add("hidden");
  }

  const navToggle = $(".nav-toggle");
  const navLinks = $("#navLinks");
  navToggle?.addEventListener("click", (event) => {
    const open = navLinks.classList.toggle("open");
    event.currentTarget.setAttribute("aria-expanded", String(open));
  });
  $$(".nav-links a").forEach((link) => {
    link.addEventListener("click", () => {
      if (window.innerWidth <= 760) {
        navLinks.classList.remove("open");
        navToggle?.setAttribute("aria-expanded", "false");
      }
    });
  });
  window.addEventListener("resize", () => {
    if (window.innerWidth > 760) {
      navLinks?.classList.remove("open");
      navToggle?.setAttribute("aria-expanded", "false");
    }
  });

  $("#themeToggle")?.addEventListener("click", () => {
    document.body.classList.toggle("light");
    localStorage.setItem("msa-theme", document.body.classList.contains("light") ? "light" : "dark");
  });

  $("#searchOpen")?.addEventListener("click", () => $("#searchModal")?.showModal());
  $$("[data-close], .close-modal").forEach((button) => button.addEventListener("click", () => button.closest("dialog")?.close()));
  $$("[data-open]").forEach((button) => button.addEventListener("click", () => $(`#${button.dataset.open}`)?.showModal()));

  $("#chatToggle")?.addEventListener("click", () => $("#chatbot").classList.toggle("open"));
  $("#chatForm")?.addEventListener("submit", (event) => {
    event.preventDefault();
    const input = $("#chatInput");
    const log = $("#chatLog");
    if (!input?.value.trim() || !log) return;
    log.insertAdjacentHTML("beforeend", `<p><strong>You:</strong> ${input.value}</p><p><strong>MSA AI:</strong> I can help with music submissions, software, pricing, support, and dashboards.</p>`);
    input.value = "";
  });

  $("#cookieAccept")?.addEventListener("click", () => {
    localStorage.setItem("msa-cookies", "accepted");
    $("#cookieBanner")?.classList.add("hidden");
  });

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.getRegistrations().then((regs) => {
      regs.forEach((r) => r.unregister());
    }).finally(() => {
      navigator.serviceWorker.register(resolveSitePath("/sw.js")).catch(() => {});
    });
  }
}

document.addEventListener("DOMContentLoaded", init);
