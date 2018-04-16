async function getAll() {
  const entry = await browser.storage.sync.get();
  document.body.appendChild(list(entry));
}

function list(item) {
  const ul = document.createElement("ul");
  for (const [k, v] of Object.entries(item)) {
    if (k === "_visible") {
      continue;
    }
    const li = document.createElement("li");
    li.textContent = k;
    if (v instanceof Object) {
      li.appendChild(list(v));
    }
    ul.appendChild(li);
  }
  return ul;
}

async function init() {
  getAll();
}

init();
