// Eskari — site interactions. No dependencies.
(() => {
  "use strict";

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  /* ---------- Mobile menu ---------- */
  const toggle = $("#navToggle");
  const links = $("#navLinks");
  const setMenu = (open) => {
    links.classList.toggle("open", open);
    document.body.classList.toggle("menu-open", open);
    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    // The links sit before the toggle in the DOM, so send focus into the menu when it opens.
    if (open) { const first = links.querySelector("a"); if (first) first.focus({ preventScroll: true }); }
  };
  toggle.addEventListener("click", () => setMenu(toggle.getAttribute("aria-expanded") !== "true"));
  links.addEventListener("click", (e) => { if (e.target.closest("a")) setMenu(false); });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && toggle.getAttribute("aria-expanded") === "true") { setMenu(false); toggle.focus(); }
  });
  window.matchMedia("(min-width: 900px)").addEventListener("change", (e) => { if (e.matches) setMenu(false); });

  /* ---------- Active section in nav ---------- */
  const navAnchors = $$("a", links);
  const sections = navAnchors.map((a) => $(a.getAttribute("href"))).filter(Boolean);
  if ("IntersectionObserver" in window && sections.length) {
    const spy = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        const link = navAnchors.find((a) => a.getAttribute("href") === "#" + entry.target.id);
        if (link) link.classList.toggle("is-active", entry.isIntersecting);
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    sections.forEach((s) => spy.observe(s));
  }

  /* ---------- Reveal on scroll ---------- */
  if (!reduceMotion && "IntersectionObserver" in window) {
    const targets = $$(".head, .statement-text, .fig, .how, .console, .feat, .vis, .trio, .dev, .pairs, .cards, .faq-list, .cta .wrap");
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) { entry.target.classList.add("in"); io.unobserve(entry.target); }
      });
    }, { threshold: 0.08, rootMargin: "0px 0px -6% 0px" });
    targets.forEach((el) => {
      // Anything already on screen at load stays put.
      if (el.getBoundingClientRect().top < window.innerHeight) return;
      el.classList.add("reveal");
      io.observe(el);
    });
  }

  /* ---------- Settlement demo ---------- */
  const how = $("#demo");
  if (how) {
    const stepBtns = $$(".step", how);
    const segBtns = $$(".seg-btn", how);
    const checks = $$(".checks li", how);
    const logLines = $$(".log li", how);
    const payState = $("#payState");
    const assetState = $("#assetState");
    const outcome = $("#demoOutcome");
    const replay = $("#demoReplay");
    const STEP_MS = 2100;

    const copy = {
      pay: {
        settle: [["Held", "by buyer"], ["Locked", "in escrow"], ["Locked", "in escrow"], ["Released", "to seller"]],
        unwind: [["Held", "by buyer"], ["Locked", "in escrow"], ["Locked", "in escrow"], ["Returned", "to buyer"]],
      },
      asset: {
        settle: [["Held", "by seller"], ["Locked", "in escrow"], ["Locked", "in escrow"], ["Released", "to buyer"]],
        unwind: [["Held", "by seller"], ["Locked", "in escrow"], ["Locked", "in escrow"], ["Returned", "to seller"]],
      },
      outcome: {
        settle: [
          "Terms signed. Nothing has moved yet.",
          "Both legs are locked. Neither agent can pull out alone.",
          "Conditions met. Ready to release.",
          "Settled. Both legs moved in one transaction.",
        ],
        unwind: [
          "Terms signed. Nothing has moved yet.",
          "Both legs are locked. Neither agent can pull out alone.",
          "A condition failed. Nothing will be released.",
          "Unwound. Both legs went back in one transaction.",
        ],
      },
    };

    let step = 3;
    let path = "settle";
    let timer = null;

    const render = () => {
      how.dataset.step = String(step);
      how.dataset.path = path;
      const laneText = (el, [main, rest]) => {
        el.textContent = main;
        const tail = document.createElement("i");
        tail.textContent = " " + rest;
        el.appendChild(tail);
      };
      laneText(payState, copy.pay[path][step]);
      laneText(assetState, copy.asset[path][step]);
      outcome.textContent = copy.outcome[path][step];

      checks.forEach((li) => {
        const reached = step >= Number(li.dataset.at);
        const fails = li.classList.contains("ck-var") && path === "unwind";
        li.classList.toggle("is-done", reached && !fails);
        li.classList.toggle("is-fail", reached && fails);
      });
      logLines.forEach((li) => {
        // Lines for the other outcome are removed; lines not reached yet keep their space,
        // so the panel never changes height while it plays.
        li.hidden = Boolean(li.dataset.on) && li.dataset.on !== path;
        li.classList.toggle("is-off", step < Number(li.dataset.at));
      });
      stepBtns.forEach((btn) => {
        const n = Number(btn.dataset.step);
        btn.classList.toggle("is-on", n === step);
        btn.classList.toggle("is-done", n < step);
        if (n === step) btn.setAttribute("aria-current", "step"); else btn.removeAttribute("aria-current");
      });
      segBtns.forEach((btn) => {
        const on = btn.dataset.path === path;
        btn.classList.toggle("is-on", on);
        btn.setAttribute("aria-pressed", String(on));
      });
    };

    const stop = () => { if (timer) { clearTimeout(timer); timer = null; } };
    const tick = () => {
      timer = setTimeout(() => {
        if (step >= 3) { timer = null; return; }
        step += 1;
        render();
        tick();
      }, STEP_MS);
    };
    const play = () => {
      stop();
      if (reduceMotion) { step = 3; render(); return; }
      step = 0;
      render();
      tick();
    };

    stepBtns.forEach((btn) => btn.addEventListener("click", () => { stop(); step = Number(btn.dataset.step); render(); }));
    segBtns.forEach((btn) => btn.addEventListener("click", () => { path = btn.dataset.path; play(); }));
    replay.addEventListener("click", play);

    render();

    // Play once, the first time the demo is properly in view.
    if (!reduceMotion && "IntersectionObserver" in window) {
      const once = new IntersectionObserver((entries) => {
        if (entries.some((e) => e.isIntersecting)) { once.disconnect(); play(); }
      }, { threshold: 0.45 });
      once.observe($(".demo", how));
    }
    document.addEventListener("visibilitychange", () => { if (document.hidden) stop(); });
  }

  /* ---------- Privacy: who sees what ---------- */
  const vis = $("#vis");
  if (vis) {
    const who = $$(".who", vis);
    const deal = $(".view-deal", vis);
    const empty = $(".view-empty", vis);
    const name = $("#viewName");
    const count = $("#viewCount");
    const role = $("#viewRole");
    const views = {
      buyer:   { name: "procure-01",     sees: true,  role: "Stakeholder · can act" },
      seller:  { name: "broker-07",      sees: true,  role: "Stakeholder · can act" },
      auditor: { name: "audit-desk",     sees: true,  role: "Observer · read-only" },
      other:   { name: "rival-buyer-12", sees: false },
      node:    { name: "validator-eu-4", sees: false },
    };
    const show = (key) => {
      const v = views[key];
      if (!v) return;
      vis.dataset.view = key;
      who.forEach((btn) => {
        const on = btn.dataset.view === key;
        btn.classList.toggle("is-on", on);
        btn.setAttribute("aria-pressed", String(on));
      });
      name.textContent = v.name;
      count.textContent = v.sees ? "1 contract" : "0 contracts";
      if (v.sees) role.textContent = v.role;
      deal.hidden = !v.sees;
      empty.hidden = v.sees;
    };
    who.forEach((btn) => btn.addEventListener("click", () => show(btn.dataset.view)));
  }

  /* ---------- Request access ---------- */
  const form = $("#accessForm");
  if (form) {
    const input = $("#accessEmail");
    const err = $("#accessErr");
    const thanks = $("#accessThanks");
    input.addEventListener("input", () => { err.hidden = true; input.removeAttribute("aria-invalid"); });
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const value = input.value.trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        err.hidden = false;
        input.setAttribute("aria-invalid", "true");
        input.setAttribute("aria-describedby", "accessErr");
        input.focus();
        return;
      }
      // TODO: wire to form backend
      form.hidden = true;
      thanks.hidden = false;
      thanks.focus({ preventScroll: true });
    });
  }
})();
