const NUMBER_OF_KEYBOARD_SHORTCUTS = 10;

async function requestPermissions(event) {
  const checkbox = event.target;
  const permission = checkbox.dataset.permission;
  if (checkbox.checked) {
    const granted = await browser.permissions.request({
      permissions: [permission],
    });
    if (!granted) { 
      checkbox.checked = false; 
      return;
    }
  } else {
    await browser.permissions.remove({ permissions: [permission] });
  }
  
  if (permission === "bookmarks") {
    browser.runtime.sendMessage({ method: "resetBookmarksContext" });
  }
  
  if (permission === "proxy") {
    browser.runtime.sendMessage({ method: "resetProxySupport" });
  }

}

async function enableDisableSync() {
  const checkbox = document.querySelector("#syncCheck");
  await browser.storage.local.set({syncEnabled: !!checkbox.checked});
  browser.runtime.sendMessage({ method: "resetSync" });
}

async function enableDisableReplaceTab() {
  const checkbox = document.querySelector("#replaceTabCheck");
  await browser.storage.local.set({replaceTabEnabled: !!checkbox.checked});
}

async function setupOptions() {
  const hasBookmarksPermission = await browser.permissions.contains({permissions: ["bookmarks"]});
  const hasProxyPermission = await browser.permissions.contains({permissions: ["proxy"]});
  const { syncEnabled } = await browser.storage.local.get("syncEnabled");
  const { replaceTabEnabled } = await browser.storage.local.get("replaceTabEnabled");
  if (hasBookmarksPermission) {
    document.querySelector("#bookmarksPermission").checked = true;
  }
  if (hasProxyPermission) {
    document.querySelector("#proxyPermission").checked = true;
  }
  document.querySelector("#syncCheck").checked = !!syncEnabled;
  document.querySelector("#replaceTabCheck").checked = !!replaceTabEnabled;
  setupContainerShortcutSelects();
}

async function setupContainerShortcutSelects () {
  const keyboardShortcut = await browser.runtime.sendMessage({method: "getShortcuts"});
  const identities = await browser.contextualIdentities.query({});
  const fragment = document.createDocumentFragment();
  const noneOption = document.createElement("option");
  noneOption.value = "none";
  noneOption.id = "none";
  noneOption.textContent = "None";
  fragment.append(noneOption);

  for (const identity of identities) {
    const option = document.createElement("option");
    option.value = identity.cookieStoreId;
    option.id = identity.cookieStoreId;
    option.textContent = identity.name;
    fragment.append(option);
  }

  for (let i=0; i < NUMBER_OF_KEYBOARD_SHORTCUTS; i++) {
    const shortcutKey = "open_container_"+i;
    const shortcutSelect = document.getElementById(shortcutKey);
    shortcutSelect.appendChild(fragment.cloneNode(true));
    if (keyboardShortcut && keyboardShortcut[shortcutKey]) {
      const cookieStoreId = keyboardShortcut[shortcutKey];
      shortcutSelect.querySelector("#" + cookieStoreId).selected = true;
    }
  }
}

function storeShortcutChoice (event) {
  browser.runtime.sendMessage({
    method: "setShortcut",
    shortcut: event.target.id,
    cookieStoreId: event.target.value
  });
}

function resetOnboarding() {
  browser.storage.local.set({"onboarding-stage": 0});
}

document.addEventListener("DOMContentLoaded", setupOptions);
document
  .querySelectorAll(".permissionCheckbox").forEach(  checkbox =>{
    checkbox.addEventListener("change", requestPermissions);
  });
document.querySelector("#syncCheck").addEventListener( "change", enableDisableSync);
document.querySelector("#replaceTabCheck").addEventListener( "change", enableDisableReplaceTab);
document.querySelector("button").addEventListener("click", resetOnboarding);

for (let i=0; i < NUMBER_OF_KEYBOARD_SHORTCUTS; i++) {
  document.querySelector("#open_container_"+i)
    .addEventListener("change", storeShortcutChoice);
}