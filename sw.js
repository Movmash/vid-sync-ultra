chrome.action.onClicked.addListener(function (b) {
  chrome.runtime.sendMessage({ type: "find_player" }, function (a) {
    !chrome.runtime.lastError && (null == a ? 0 : a.windowId)
      ? chrome.windows.update(a.windowId, { focused: !0 })
      : chrome.windows.create({
          type: "popup",
          url: "player.html",
          width: 1280,
          height: 720,
        });
  });
});
