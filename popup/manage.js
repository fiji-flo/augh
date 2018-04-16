/* global set get */
"use strict";
const ORG = document.querySelector("#org");
const REPO = document.querySelector("#repo");
const PR = document.querySelector("#pr");

let url = "";

function display(box, [name, visible]) {
  const parent = box.parentElement;
  const disabled = !parent.classList.contains("disabled");
  if (visible === undefined) {
    disabled && parent.classList.add("disabled");
  } else {
    if (!disabled) {
      parent.classList.remove("disabled");
    }
    parent.querySelector("i").textContent = name;
    box.checked = !visible;
  }
}

async function init() {
  let url = await browser.tabs.executeScript({
    code: `(() => location.href)();`
  }).then(res => res[0] || "");
  update(url);

  addHandler(ORG, "org");
  addHandler(REPO, "repo");
  addHandler(PR, "pr");
}

async function update(_url) {
  url = _url;
  let {org, repo, pr} = await get(url);

  display(ORG, org);
  display(REPO, repo);
  display(PR, pr);
}

function store(url, level, visible) {
  return set(url, level, visible);
}

function addHandler(target, level) {
  target.addEventListener("change", () =>
    store(url, level, !target.checked).then(
      () => browser.tabs.executeScript({
        code: `checkVisibility();`
      }))
  );
}

browser.runtime.onMessage.addListener(msg => {
  if (msg.sender === "content") {
    switch (msg.action) {
    case "update":
      update(msg.url);
      break;
    }
  }
});

init();
