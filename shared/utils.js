/* exported set get */
"use strict";

function matchUrl(url) {
  const re = /^(?:https:\/\/github.com)\/([\w-]+)(?:\/([\w-]+)\/?(?:(?:pull\/(\d+))|(.+))?)?/;
  return url.match(re);
}

function parseUrl(url) {
  const match = matchUrl(url);

  return match && { org: match[1], repo: match[2], pr: match[3], tail: match[4] } || {} ;
}

async function set(url, level, visible) {
  const { org, repo, pr } = parseUrl(url);
  let entry = await browser.storage.sync.get(org);
  switch (level) {
  case "org":
    compose(entry, [org], visible);
    break;
  case "repo":
    compose(entry, [repo, org], visible);
    break;
  case "pr":
    compose(entry, [pr, repo, org], visible);
    break;
  }
  if (Object.entries(entry).length === 0) {
    return browser.storage.sync.remove(org);
  }
  return browser.storage.sync.set(entry);
}

async function get(url) {
  const { org, repo, pr } = parseUrl(url);
  let entry = await browser.storage.sync.get(org);
  let _org = org && (entry[org] || false);
  let _repo = repo && (_org && _org[repo] || false);
  let _pr = pr && (_repo && _repo[pr] || false);
  return {
    org: [org, _org &&(_org._visible || false)],
    repo: [repo, _repo && (_repo._visible || false)],
    pr: [pr, _pr && (_pr._visible || false)],
  };
}

function compose(entry={}, path, visible) {
  if (path.length === 0) {
    if (visible) {
      entry._visible = true;
    } else {
      delete entry._visible;
    }
    return entry;
  }
  let attr = path.pop();
  let update = compose(entry[attr], path, visible);
  if (Object.entries(update).length > 0) {
    entry[attr] = update;
  } else {
    delete entry[attr];
  }
  return entry;
}
