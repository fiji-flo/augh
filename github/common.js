/* global get */
"use strict";
const REDACTED = "[redacted]";

function getUser() {
  return document.querySelector("li.header-nav-current-user strong");
}

function getPRAuthor() {
  const author = document.querySelector("a.author.pull-header-username");
  return author && author.textContent.trim();
}

async function isVisible(url) {
  const status = await get(url);
  return Object.values(status).some(([, i])  => i);
}


const observer = {
  listeners: new Map(),

  observe(mutations) {
    // Multiple events get coalesced when inserting nested nodes,
    // using a Set ensures we run the listener once per matched node.

    for (const [selector, listener] of observer.listeners) {
      const matched = new Set();

      for (const record of mutations) {
        for (const node of record.addedNodes) {
          if (node instanceof Element) {
            node.querySelectorAll(selector).forEach(m => matched.add(m));
          }
        }
      }
      matched.forEach(listener);
    }
  },

  on(selector, listener) {
    if (!this.observer) {
      this.observer = new MutationObserver(this.observe);
      this.observer.observe(document, {childList: true, subtree: true});
    }

    this.listeners.set(selector, listener);
    document.querySelectorAll(selector).forEach(listener);
  },
};

async function listing(svg) {
  const li = svg.closest("li");
  const href = li.querySelector(`a[href*="/pull/"`).getAttribute("href");

  let visible = await isVisible(href);
  if (visible == null) {
    const author = li.querySelector("span.opened-by > a");
    const user = document.querySelector("li.header-nav-current-user strong");

    visible = user.textContent === author.textContent;
  }

  li.classList.toggle("br-blind", !visible);
}

observer.on("li.js-notification svg.octicon-git-pull-request", listing);
observer.on("li.js-issue-row svg.octicon-git-pull-request", listing);

function submitReview() {
  const flag = document.getElementById("br-flag");
  const text = document.getElementById("pull_request_review_body");
  if (flag instanceof HTMLInputElement && text instanceof HTMLTextAreaElement && flag.checked) {
    text.value += `\n\n[![blind-review](https://github.com/blindreviews3.png)]` +
      `(https://github.com/zombie/blind-reviews "Review performed in blind mode")`;
  }
}

async function addFlag(textarea) {
  const button = textarea.closest("form").querySelector("button");
  button.insertAdjacentHTML("beforebegin", `
    <label style="float: left; margin: 1ex">
      <input id="br-flag" type="checkbox">
      Add blind review flag
    </label>
  `);
  if (!await isVisible(location.href)) {
    // @ts-ignore
    document.getElementById("br-flag").checked = true;
  }
  button.addEventListener("click", submitReview);
}

observer.on("#submit-review #pull_request_review_body", addFlag);

function augment(a) {
  if (a.classList.contains("br-author")) {
    return;
  }
  const author = getPRAuthor();
  const who = a.getAttribute("href") || a.getAttribute("alt") || a.textContent;

  if (author && who.endsWith(author)) {
    const redacted = document.createElement("span");
    redacted.classList.add("br-redacted");
    a.classList.add("br-author");

    if (a.tagName === "IMG" || a.querySelector("img")) {
      redacted.className = "br-avatar";
    }

    a.parentNode.insertBefore(redacted, a);
  }
}

function augmentTitle(a) {
  const author = getPRAuthor();
  const title = a.title;

  if (!(author && title)) {
    return;
  }

  if (title.includes(author)) {
    const redacted = a.cloneNode(true);
    redacted.title = redacted.title.replace(author, REDACTED);
    redacted.classList.add("br-title");
    a.classList.add("br-author");
    a.parentNode.insertBefore(redacted, a);
  }
}

observer.on("div.timeline-comment-header a.author", augment);
observer.on("div.discussion-item a.author", augment);
observer.on("div.avatar-parent-child > a", augment);
observer.on("div.commit-avatar > a", augment);
observer.on("div.commit .AvatarStack a.avatar", augment);

observer.on("h3.discussion-item-header > img.avatar", augment);

observer.on("div.participation-avatars > a.participant-avatar", augment);
observer.on("div.commit-meta a.commit-author", augment);
observer.on("div.commit-meta .AvatarStack a.avatar", augment);

observer.on("div.flash > div > a.text-emphasized", augment);
observer.on("div.gh-header-meta span.head-ref > span.user", augment);

observer.on("div.gh-header-meta span.head-ref", augmentTitle);

async function checkVisibility() {
  const redacted = document.body.classList.contains("br-blinded");

  const visible = await isVisible(location.href);

  if (redacted === visible) {
    const flag = document.getElementById("br-flag");
    if (flag instanceof HTMLInputElement && redacted && flag.checked) {
      flag.checked = false;
    }
  }
  if (visible) {
    document.body.classList.remove("br-blinded");
  } else {
    document.body.classList.add("br-blinded");
  }
  document.body.dispatchEvent(new Event("click", {bubbles: true}));

  return Promise.resolve(visible);

}

// Logic to determine if a pull request should be blinded by default.
function shouldBlindPR(author) {
  const user = getUser();

  // Ignore user's own pull requests.
  if (user.textContent === author) {
    return false;
  }

  const open = document.querySelector("div.gh-header div.State--green");

  // Merged and closed PRs are automatically revealed.
  if (!open) {
    return false;
  }

  const reviews = document.querySelectorAll("div.is-approved a.author");

  // Also, once the user has approved a PR, reveal it.
  for (const a of reviews) {
    if (user.textContent === a.textContent) {
      return false;
    }
  }

  // Blind everything else by default.
  return true;
}

async function prHeader(a) {
  if (shouldBlindPR(a.textContent.trim())) {
    checkVisibility();
  }

  augment(a);
}

observer.on("a.author:not(.br-author).pull-header-username", prHeader);
observer.on("div.container", checkVisibility);

function update() {
  browser.runtime.sendMessage({ sender: "content", action: "update", url: location.href }).catch(() => {});
}

window.onpopstate = update;
update();
