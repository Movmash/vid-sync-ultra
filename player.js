var extensionMode;

let fileList = [];
void 0 === document.exitFullscreen &&
  (document.exitFullscreen = document.webkitExitFullscreen);
function getFullscreenElement() {
  return void 0 === document.fullscreenElement
    ? document.webkitFullscreenElement
    : document.fullscreenElement;
}
void 0 === globalContainer.requestFullscreen &&
  (globalContainer.requestFullscreen = globalContainer.webkitRequestFullscreen);
const info = document.getElementById("info"),
  errorInfo = document.getElementById("error-info"),
  ltInfo = document.getElementById("lt-info"),
  rtInfo = document.getElementById("rt-info"),
  controlsPanel = document.getElementById("controls"),
  progress = document.getElementById("progress"),
  volume = document.getElementById("volume"),
  [leftTime, rightTime] = document.querySelectorAll("#progress-controls .time"),
  [openFileBtn, volumeBtn] = document.querySelectorAll("#buttons-left .btn"),
  [previousBtn, rewindBtn, playBtn, forwardBtn, nextBtn] =
    document.querySelectorAll("#buttons-center .btn"),
  [settingsBtn, fullscreenBtn] = document.querySelectorAll(
    "#buttons-right .btn"
  );
let remainingTimeMode = !1;
const seekStepInput = document.getElementById("seekStep"),
  seekLongStepInput = document.getElementById("seekLongStep"),
  volumeStepInput = document.getElementById("volumeStep"),
  speedStepInput = document.getElementById("speedStep"),
  screenshotFormatInput = document.getElementById("screenshotFormat");
var settings = {
  seekStep: 5,
  seekLongStep: 30,
  volumeStep: 10,
  speedStep: 0.25,
  timeFormatHour12: !0,
  timeFormatSecond: !1,
  screenshotFormat: "jpg",
};
class Utils {
  static delay(a, b) {
    let c = 0;
    return function (...d) {
      clearTimeout(c);
      c = setTimeout(a.bind(this, ...d), b);
    };
  }
  static showInfo(a) {
    info.textContent = a;
    info.classList.remove("d-none");
    Utils.delayHideInfo();
  }
  static hideInfo() {
    info.classList.add("d-none");
  }
  static showError(a) {
    errorInfo.textContent = a;
    errorInfo.classList.remove("d-none");
    Utils.delayHideError();
  }
  static hideError() {
    errorInfo.classList.add("d-none");
  }
  static formatTime(a) {
    var b = Math.round(a);
    a = Math.floor(b / 60);
    b %= 60;
    return `${10 > a ? "0" + a : a}:${10 > b ? "0" + b : b}`;
  }
  static screenshot() {
    if (!(2 > video.readyState)) {
      Utils.canvas || (Utils.canvas = document.createElement("canvas"));
      Utils.file || (Utils.file = document.createElement("a"));
      var a = Utils.canvas,
        b = Utils.file;
      a.width = video.videoWidth;
      a.height = video.videoHeight;
      a.getContext("2d").drawImage(video, 0, 0, a.width, a.height);
      settings && "png" == settings.screenshotFormat
        ? ((b.download = `screenshot-${video.currentTime.toFixed(3)}.png`),
          (b.href = a.toDataURL("image/png")))
        : ((b.download = `screenshot-${video.currentTime.toFixed(3)}.jpg`),
          (b.href = a.toDataURL("image/jpeg", 0.98)));
      b.click();
    }
  }
}
Utils.delayHideInfo = Utils.delay(Utils.hideInfo, 1500);
Utils.delayHideError = Utils.delay(Utils.hideError, 1500);
class Clock {
  static init() {
    let a = {
      hourCycle: settings.timeFormatHour12 ? "h12" : "h23",
      hour: "2-digit",
      minute: "2-digit",
    };
    settings.timeFormatSecond && (a.second = "2-digit");
    Clock.ClockFormat = new Intl.DateTimeFormat("en-GB", a);
  }
  static toggleClockTime() {
    rtInfo.classList.contains("d-none")
      ? (Clock.updateClockTime(),
        rtInfo.classList.remove("d-none"),
        (Clock.clockTimer = setInterval(Clock.updateClockTime, 1e3)))
      : (rtInfo.classList.add("d-none"), clearInterval(Clock.clockTimer));
  }
  static updateClockTime() {
    rtInfo.textContent = Clock.ClockFormat.format(new Date());
  }
}
class Player {
  static init() {}
  static async loadFile(a) {
    document.title = a.name;
    Player.objectURL && URL.revokeObjectURL(Player.objectURL);
    Player.objectURL = URL.createObjectURL(a);
    video.src = Player.objectURL;
    if (void 0 === a.canPlay)
      try {
        await video.play(), (a.canPlay = !0);
      } catch (b) {
        (a.canPlay = !1),
          Player.stop(),
          "NotSupportedError" == b.name
            ? Utils.showError(Messages.cannotSupportFormat)
            : "NotAllowedError" == b.name
            ? (alert(Messages.notAllowedError), (a.canPlay = void 0))
            : Utils.showError(Messages.error);
      }
    else !0 === a.canPlay && Player.play();
    Controls.onVideoChange();
  }
  static stop() {
    video.removeAttribute("src");
    video.load();
  }
  static async play() {
    if (video.src)
      try {
        await video.play();
      } catch (a) {
        Utils.showError(Messages.error);
      }
  }
  static playNext() {
    let a = FileManager.getNextFile(!0);
    a && SyncVideo.onplaynext();
    return a ? (Player.loadFile(a), !0) : !1;
  }
  static playPrevious() {
    let a = FileManager.getNextFile(!1);
    a && SyncVideo.onplayprevious()
    return a ? (Player.loadFile(a), !0) : !1;
  }
  static selectVideo(a) {
    if (a === FileManager.playIndex) return;
    let f = FileManager.getFileByIndex(a);
    document.title = f.name;
    Player.objectURL && URL.revokeObjectURL(Player.objectURL);
    Player.objectURL = URL.createObjectURL(f);
    video.src = Player.objectURL; 
    Controls.onVideoChange();
  }
  static selectVideoAndPlay(a) {
    if(0 <= a && a < fileList.length) {
      this.selectVideo(a);
    }else {
      this.selectVideo(0);
    }
    Player.play(); 
  }
  static togglePlay() {
    video.paused || video.ended ? Player.play() : video.pause();
  }
  static toggleMute() {
    video.muted = !video.muted;
    Utils.showInfo(video.muted ? Messages.muted : Messages.unmuted);
  }
  static seek(a, b) {
    !video.src ||
      !Number.isFinite(video.duration) ||
      (1 > b && !video.paused) ||
      ((video.currentTime = a
        ? Math.min(video.currentTime + b, video.duration)
        : Math.max(video.currentTime - b, 0)),
      1 <= b &&
        ((a = `${Utils.formatTime(video.currentTime)} / ${Utils.formatTime(
          video.duration
        )}`),
        Utils.showInfo(a)));
    SyncVideo.onseeked()
  }
  static volume(a, b) {
    let c = Math.round(100 * video.volume);
    c = a ? Math.min(c + b, 100) : Math.max(c - b, 0);
    video.volume = c / 100;
    Utils.showInfo(Messages.volumeIs + c);
  }
  static speed(a, b) {
    a = a
      ? parseFloat((video.playbackRate + b).toFixed(2))
      : parseFloat((video.playbackRate - b).toFixed(2));
    0.25 <= a && 5 >= a && (video.playbackRate = a);
    Utils.showInfo(Messages.speedIs + video.playbackRate);
  }
  static resetSpeed() {
    video.playbackRate = 1;
    Utils.showInfo(Messages.speedIs + "1");
  }
  static toggleVideoTime() {
    video.src &&
      Number.isFinite(video.duration) &&
      (ltInfo.classList.contains("d-none")
        ? (Player.updateVideoTime(),
          ltInfo.classList.remove("d-none"),
          (Player.timeTimer = setInterval(Player.updateVideoTime, 1e3)))
        : (ltInfo.classList.add("d-none"), clearInterval(Player.timeTimer)));
  }
  static updateVideoTime() {
    let a = `${Utils.formatTime(video.currentTime)} / ${Utils.formatTime(
      video.duration
    )}  [-${Utils.formatTime(video.duration - video.currentTime)}]`;
    ltInfo.textContent = a;
  }
}
var mouseMoveTimer = 0,
  clickDblclickTimer = 0;
class Controls {
  static init() {
    document.body.addEventListener("keydown", Controls.keyboardListener);
    "onfullscreenchange" in Document.prototype
      ? document.addEventListener(
          "fullscreenchange",
          Controls.onFullscreenChange
        )
      : document.addEventListener(
          "webkitfullscreenchange",
          Controls.onFullscreenChange
        );
    Controls.progressDragging = !1;
    video.addEventListener("loadedmetadata", Controls.onLoadedmetadata);
    video.addEventListener("timeupdate", Controls.updateTime);
    video.addEventListener("volumechange", Controls.onVolumeChange);
    video.addEventListener("ended", Controls.onVideoEnd);
    video.addEventListener("pause", Controls.onPause);
    video.addEventListener("play", Controls.onPlay);
    progress.addEventListener("change", Controls.onProgressChange);
    progress.addEventListener("input", Controls.onProgressInput);
    rightTime.addEventListener("click", Controls.changeTimeMode);
    controlsPanel.addEventListener("click", (a) => a.stopPropagation());
    playerPanel.addEventListener("click", Controls.onPlayerClick);
    openFileBtn.addEventListener("click", FileManager.openFiles);
    volumeBtn.addEventListener("click", (a) => Player.toggleMute());
    volume.addEventListener("input", Controls.onVolumeInput);
    volume.addEventListener("change", (a) => volume.blur());
    previousBtn.addEventListener("click", Player.playPrevious);
    rewindBtn.addEventListener("click", (a) =>
      Player.seek(!1, settings.seekStep)
    );
    playBtn.addEventListener("click", Player.togglePlay);
    forwardBtn.addEventListener("click", (a) =>
      Player.seek(!0, settings.seekStep)
    );
    nextBtn.addEventListener("click", Player.playNext);
    fullscreenBtn.addEventListener("click", WindowManager.toggleFullscreen);
    "mediaSession" in navigator &&
      (navigator.mediaSession.setActionHandler(
        "previoustrack",
        Player.playPrevious
      ),
      navigator.mediaSession.setActionHandler("nexttrack", Player.playNext),
      navigator.mediaSession.setActionHandler("seekbackward", () =>
        Player.seek(!1, settings.seekStep)
      ),
      navigator.mediaSession.setActionHandler("seekforward", () =>
        Player.seek(!0, settings.seekStep)
      ));
    document.body.addEventListener("contextmenu", (a) => a.preventDefault());
    Controls.hidden = !0;
    document
      .getElementById("settings")
      .addEventListener("mousemove", Controls.onMouseMove);
    controlsPanel.addEventListener("mousemove", Controls.onMouseMove);
    playerPanel.addEventListener("mousemove", Controls.onMouseMove);
  }
  static changeTimeMode() {
    remainingTimeMode = !remainingTimeMode;
    Controls.updateTime();
    Settings.saveRemainingTimeMode(remainingTimeMode);
  }
  static updateTime() {
    Controls.hidden ||
      0 === video.readyState ||
      (Controls.progressDragging
        ? ((leftTime.textContent = Utils.formatTime(progress.value)),
          remainingTimeMode &&
            (rightTime.textContent =
              "-" + Utils.formatTime(video.duration - progress.value)))
        : ((progress.value = video.currentTime),
          (leftTime.textContent = Utils.formatTime(video.currentTime)),
          (rightTime.textContent = remainingTimeMode
            ? "-" + Utils.formatTime(video.duration - video.currentTime)
            : Utils.formatTime(video.duration))));
  }
  static onLoadedmetadata() {
    getFullscreenElement() || WindowManager.scaleSize(1);
    progress.max = video.duration;
    Controls.updateTime();
  }
  static onPause() {
    playBtn.src = "img/play_arrow.svg";
    SyncVideo.onpause();
  }
  static onPlay() {
    playBtn.src = "img/pause.svg";
    SyncVideo.onplay();
  }
  static onFullscreenChange() {
    getFullscreenElement()
      ? (fullscreenBtn.src = "img/fullscreen_exit.svg")
      : (fullscreenBtn.src = "img/fullscreen.svg");
  }
  static onVideoChange() {
    const [a, b] = FileManager.hasPreviousNext();
    a
      ? previousBtn.classList.remove("disabled")
      : previousBtn.classList.add("disabled");
    b
      ? nextBtn.classList.remove("disabled")
      : nextBtn.classList.add("disabled");
  }
  static onProgressChange() {
    Controls.progressDragging = !1;
    video.currentTime = progress.value;
    progress.blur();
    SyncVideo.onseeked()
  }
  static onProgressInput() {
    Controls.progressDragging = !0;
    Controls.updateTime();
  }
  static onVolumeInput() {
    video.volume = volume.valueAsNumber;
  }
  static onVolumeChange() {
    const a = video.volume;
    volume.value = a;
    volumeBtn.src = video.muted
      ? "img/volume_off.svg"
      : 0.5 < a
      ? "img/volume_up.svg"
      : 0 < a
      ? "img/volume_down.svg"
      : "img/volume_mute.svg";
  }
  static onVideoEnd() {
    Player.playNext() || WindowManager.exitFullscreen();
  }
  static onPlayerClick(a) {
    0 < clickDblclickTimer
      ? (clearTimeout(clickDblclickTimer),
        (clickDblclickTimer = 0),
        WindowManager.toggleFullscreen())
      : (clickDblclickTimer = setTimeout(function () {
          clickDblclickTimer = 0;
          Player.togglePlay();
        }, 400));
  }
  static onMouseMove(a) {
    a.stopPropagation();
    Controls.hidden && Controls.show();
    clearTimeout(mouseMoveTimer);
    a = a.currentTarget.id;
    let b = 1500;
    "player" == a
      ? (b = 1500)
      : "controls" == a
      ? (b = 4500)
      : "settings" == a && (b = 2e4);
    mouseMoveTimer = setTimeout(Controls.hide, b);
  }
  static show() {
    Controls.hidden = !1;
    Controls.updateTime();
    controlsPanel.classList.remove("d-none");
    playerPanel.classList.remove("hide-cursor");
    slideButton.classList.remove("d-none");
  }
  static hide() {
    Controls.hidden = !0;
    controlsPanel.classList.add("d-none");
    playerPanel.classList.add("hide-cursor");
    slideButton.classList.add("d-none");
  }
  static async keyboardListener(a) {
    var b = a.target.tagName;
    if ("INPUT" !== b && "SELECT" !== b) {
      b = a.keyCode;
      var c = a.code;
      79 === b && (a.ctrlKey || a.metaKey)
        ? (a.preventDefault(), FileManager.openFiles())
        : 37 === b && (a.ctrlKey || a.metaKey)
        ? (a.preventDefault(), Player.playPrevious())
        : 39 === b && (a.ctrlKey || a.metaKey)
        ? (a.preventDefault(), Player.playNext())
        : 83 !== b || (!a.ctrlKey && !a.metaKey) || a.shiftKey
        ? a.ctrlKey ||
          a.altKey ||
          a.metaKey ||
          (70 === b
            ? (a.preventDefault(), WindowManager.toggleFullscreen())
            : 87 === b
            ? (a.preventDefault(), WindowManager.toggleMaxSize())
            : 84 === b
            ? a.preventDefault()
            : 75 === b || 32 === b
            ? (a.preventDefault(), Player.togglePlay())
            : 74 === b || 37 === b
            ? (a.preventDefault(),
              a.shiftKey
                ? Player.seek(!1, settings.seekLongStep)
                : Player.seek(!1, settings.seekStep))
            : 76 === b || 39 === b
            ? (a.preventDefault(),
              a.shiftKey
                ? Player.seek(!0, settings.seekLongStep)
                : Player.seek(!0, settings.seekStep))
            : 38 === b
            ? (a.preventDefault(), Player.volume(!0, settings.volumeStep))
            : 40 === b
            ? (a.preventDefault(), Player.volume(!1, settings.volumeStep))
            : "Equal" === c
            ? (a.preventDefault(),
              a.shiftKey
                ? WindowManager.scale(!0)
                : Player.speed(!0, settings.speedStep))
            : "Minus" === c
            ? (a.preventDefault(),
              a.shiftKey
                ? WindowManager.scale(!1)
                : Player.speed(!1, settings.speedStep))
            : "Digit0" === c
            ? (a.preventDefault(),
              a.shiftKey ? WindowManager.scaleSize(1) : Player.resetSpeed())
            : 67 === b
            ? a.preventDefault()
            : 78 === b
            ? (a.preventDefault(), Player.playNext())
            : 77 === b
            ? (a.preventDefault(), Player.toggleMute())
            : 80 === b
            ? (a.preventDefault(),
              a.shiftKey ? WindowManager.togglePip() : Player.playPrevious())
            : 188 === b
            ? (a.preventDefault(), Player.seek(!1, 0.042))
            : 190 === b
            ? (a.preventDefault(), Player.seek(!0, 0.042))
            : 83 === b && a.shiftKey
            ? (a.preventDefault(), Utils.screenshot())
            : 71 === b
            ? (a.preventDefault(), Player.toggleVideoTime())
            : 72 === b
            ? (a.preventDefault(), Clock.toggleClockTime())
            : 66 === b && a.preventDefault())
        : a.preventDefault();
    }
  }
}
var lastDragTime = 0,
  dragTimer = 0;
class FileManager {
  static init() {
    FileManager.playIndex = 0;
    FileManager.inputFile = document.getElementById("file");
    FileManager.inputFile.addEventListener("change", FileManager.onSelectFile);
    document.body.addEventListener("dragover", FileManager.onDropOver);
    document.body.addEventListener("drop", FileManager.onDrop);
  }
  static getNextFile(a) {
    a = a ? FileManager.playIndex + 1 : FileManager.playIndex - 1;
    return 0 <= a && a < fileList.length
      ? ((FileManager.playIndex = a), fileList[a])
      : null;
  }
  static hasPreviousNext() {
    return [
      0 < FileManager.playIndex,
      FileManager.playIndex < fileList.length - 1,
    ];
  }
  static openFiles() {
    FileManager.inputFile.click();
  }
  static updateFileList(a) {
    if (0 < a.length) {
      fileList = Array.from(a);
      const b = new Intl.Collator();
      fileList.sort((c, d) => b.compare(c.name, d.name));
      FileManager.playIndex = 0;
      Player.loadFile(fileList[0]);
      RoomManager.updateRoomFile(fileList)
    }
  }
  static onSelectFile(a) {
    FileManager.updateFileList(this.files);
    this.value = null;
  }
  static toggleDropzone(a) {
    let b = document.body.firstElementChild,
      c = b.nextElementSibling;
    a
      ? (b.classList.add("d-none"), c.classList.remove("d-none"))
      : (b.classList.remove("d-none"), c.classList.add("d-none"));
  }
  static dragEnd() {
    clearInterval(dragTimer);
    dragTimer = 0;
    FileManager.toggleDropzone(!1);
  }
  static onDropOver(a) {
    a.preventDefault();
    a.dataTransfer.dropEffect = "move";
    lastDragTime = performance.now();
    0 == dragTimer &&
      (FileManager.toggleDropzone(!0),
      (dragTimer = setInterval(function () {
        200 < performance.now() - lastDragTime && FileManager.dragEnd();
      }, 200)));
  }
  static onDrop(a) {
    a.preventDefault();
    FileManager.dragEnd();
    FileManager.updateFileList(a.dataTransfer.files);
  }
  static getFileByIndex(a) {
    return ((FileManager.playIndex = a), fileList[a])
  }
}
class WindowManager {
  static init() {
    WindowManager.saveWindowState();
  }
  static saveWindowState() {
    WindowManager.state = {
      x: window.screenX,
      y: window.screenY,
      width: window.outerWidth,
      height: window.outerHeight,
    };
  }
  static restoreState() {
    let a = WindowManager.state;
    a && (window.resizeTo(a.width, a.height), window.moveTo(a.x, a.y));
  }
  static getBrowserHeadHeight() {
    if (void 0 !== WindowManager.browserHeadHeight)
      return WindowManager.browserHeadHeight;
    let a = window.outerHeight - window.innerHeight;
    return 0 < a ? (WindowManager.browserHeadHeight = a) : 28;
  }
  static scaleSize(a) {
    if (popupWindow && 0 < video.videoWidth && 0 < video.videoHeight) {
      var b = WindowManager.getBrowserHeadHeight();
      const c = video.videoWidth / video.videoHeight;
      let d = Math.min(window.screen.availWidth, video.videoWidth * a);
      a = Math.min(window.screen.availHeight, video.videoHeight * a + b);
      let e = Math.floor((a - b) * c);
      e <= d ? (d = e) : ((b = Math.floor(d / c) + b), b <= a && (a = b));
      window.resizeTo(d, a);
      window.moveTo(
        (screen.availWidth - d) / 2 + screen.availLeft,
        (screen.availHeight - a) / 2 + screen.availTop
      );
      WindowManager.saveWindowState();
    }
  }
  static scale(a) {
    popupWindow &&
      0 < video.videoWidth &&
      0 < video.videoHeight &&
      (a
        ? (a = (window.innerWidth + video.videoWidth / 4) / video.videoWidth)
        : ((a = (window.innerWidth - video.videoWidth / 4) / video.videoWidth),
          (a = Math.max(a, 0.25))),
      WindowManager.scaleSize(a));
  }
  static isMaxSize() {
    return (
      window.outerWidth == window.screen.availWidth &&
      window.outerHeight == window.screen.availHeight
    );
  }
  static toggleMaxSize() {
    popupWindow &&
      (WindowManager.isMaxSize()
        ? WindowManager.restoreState()
        : window.resizeTo(window.screen.availWidth, window.screen.availHeight));
  }
  static async togglePip() {
    document.pictureInPictureEnabled &&
      !video.disablePictureInPicture &&
      0 !== video.readyState &&
      (getFullscreenElement() && (await document.exitFullscreen()),
      document.pictureInPictureElement
        ? document.exitPictureInPicture()
        : video.requestPictureInPicture());
  }
  static async toggleFullscreen() {
    document.pictureInPictureElement && (await document.exitPictureInPicture());
    getFullscreenElement()
      ? document.exitFullscreen()
      : globalContainer.requestFullscreen();
  }
  static exitFullscreen() {
    getFullscreenElement() && document.exitFullscreen();
  }
}
class Settings {
  static async init() {
    seekStepInput.addEventListener(
      "change",
      Utils.delay(Settings.saveSeekStep, 500)
    );
    seekLongStepInput.addEventListener(
      "change",
      Utils.delay(Settings.saveSeekLongStep, 500)
    );
    volumeStepInput.addEventListener(
      "change",
      Utils.delay(Settings.saveVolumeStep, 500)
    );
    speedStepInput.addEventListener("change", Settings.saveSpeedStep);
    screenshotFormatInput.addEventListener(
      "change",
      Settings.saveScreenshotFormat
    );
    if (extensionMode)
      return (
        chrome.storage.local.get({ remainingTimeMode: !1 }, function (f) {
          remainingTimeMode = f.remainingTimeMode;
        }),
        new Promise(function (f, h) {
          chrome.storage.sync.get(settings, function (g) {
            settings = g;
            Settings.initInputValues();
            f();
          });
        })
      );
    remainingTimeMode = "true" === localStorage.getItem("remainingTimeMode");
    let a = localStorage.getItem("seekStep"),
      b = localStorage.getItem("seekLongStep"),
      c = localStorage.getItem("volumeStep"),
      d = localStorage.getItem("speedStep"),
      e = localStorage.getItem("screenshotFormat");
    a && (settings.seekStep = parseInt(a, 10));
    b && (settings.seekLongStep = parseInt(b, 10));
    c && (settings.volumeStep = parseInt(c, 10));
    d && (settings.speedStep = parseFloat(d));
    e && (settings.screenshotFormat = e);
    Settings.initInputValues();
  }
  static initInputValues() {
    seekStepInput.value = settings.seekStep;
    seekLongStepInput.value = settings.seekLongStep;
    volumeStepInput.value = settings.volumeStep;
    speedStepInput.value = settings.speedStep;
    screenshotFormatInput.value = settings.screenshotFormat;
  }
  static save(a, b) {
    settings[a] = b;
    if (extensionMode) {
      let c = {};
      c[a] = b;
      chrome.storage.sync.set(c);
    } else
      try {
        localStorage.setItem(a, b);
      } catch (c) {
        console.log("localStorage error:", c);
      }
  }
  static saveSeekStep(a) {
    1 <= seekStepInput.valueAsNumber &&
      Settings.save("seekStep", seekStepInput.valueAsNumber);
  }
  static saveSeekLongStep(a) {
    1 <= seekLongStepInput.valueAsNumber &&
      Settings.save("seekLongStep", seekLongStepInput.valueAsNumber);
  }
  static saveVolumeStep(a) {
    a = volumeStepInput.valueAsNumber;
    1 <= a && 50 >= a && Settings.save("volumeStep", a);
  }
  static saveSpeedStep(a) {
    a = parseFloat(speedStepInput.value);
    0 < a && 1 >= a && Settings.save("speedStep", a);
  }
  static saveScreenshotFormat(a) {
    Settings.save("screenshotFormat", screenshotFormatInput.value);
  }
  static saveRemainingTimeMode(a) {
    if (extensionMode) chrome.storage.local.set({ remainingTimeMode: a });
    else
      try {
        localStorage.setItem("remainingTimeMode", a);
      } catch (b) {
        console.log("localStorage error:", b);
      }
  }
}
class I18N {
  static init() {
    let a = document.querySelectorAll("[data-i18n]");
    for (const b of a) b.textContent = Messages[b.dataset.i18n];
  }
}
I18N.en = {
  title: "Video Player",
  seekStep: "Short Jump",
  seekLongStep: "Long Jump",
  volumeStep: "Volume Jump",
  speedStep: "Speed Jump",
  screenshotFormat: "Screenshot",
  shortcuts: "Shortcuts",
  dropzone: "Drop Video Files Here",
  muted: "Muted",
  unmuted: "Unmuted",
  speedIs: "Speed: ",
  volumeIs: "Volume: ",
  error: "Something wrong",
  cannotSupportFormat: "Can't support this video format",
  notAllowedError:
    'The browser does not allow autoplay.\nYou need to change your borwser settings:\nSafari: Preferences \u2192 Websites \u2192 Auto-Play.\nFirefox: Preferences \u2192 Search for "Autoplay".\nChrome: Preferences \u2192 Site settings \u2192 Sound.\n',
};
I18N["zh-CN"] = {
  title: "\u89c6\u9891\u64ad\u653e\u5668",
  seekStep: "\u77ed\u5feb\u8fdb",
  seekLongStep: "\u957f\u5feb\u8fdb",
  volumeStep: "\u97f3\u91cf+/-",
  speedStep: "\u500d\u901f+/-",
  screenshotFormat: "\u622a\u56fe\u683c\u5f0f",
  shortcuts: "\u5feb\u6377\u952e\u8bf4\u660e",
  dropzone: "\u62d6\u62fd\u89c6\u9891\u6587\u4ef6\u5230\u8fd9\u91cc",
  muted: "\u5df2\u9759\u97f3",
  unmuted: "\u5df2\u53d6\u6d88\u9759\u97f3",
  speedIs: "\u500d\u901f: ",
  volumeIs: "\u97f3\u91cf: ",
  error: "\u51fa\u9519\u4e86",
  cannotSupportFormat: "\u4e0d\u652f\u6301\u6b64\u89c6\u9891\u683c\u5f0f",
  notAllowedError:
    '\u6d4f\u89c8\u5668\u4e0d\u5141\u8bb8\u81ea\u52a8\u64ad\u653e\u3002\n\u60a8\u9700\u8981\u8c03\u6574\u6d4f\u89c8\u5668\u7684\u8bbe\u7f6e\uff1a\nSafari: \u8bbe\u7f6e \u2192 \u7f51\u7ad9 \u2192 \u81ea\u52a8\u64ad\u653e\u3002\nFirefox: \u8bbe\u7f6e \u2192 \u641c\u7d22 "\u81ea\u52a8\u64ad\u653e"\u3002\nChrome: \u8bbe\u7f6e \u2192 \u7f51\u7ad9\u8bbe\u7f6e \u2192 \u58f0\u97f3\u3002\n',
};
var Messages = "zh-CN" == navigator.language ? I18N["zh-CN"] : I18N.en;
async function init() {
  I18N.init();
  await Settings.init();
  Clock.init();
  Player.init();
  Controls.init();
  FileManager.init();
  WindowManager.init();
  RoomManager.init();
  OriginManager.init();
  UIManager.init()
  CaptionManager.init();
}
init();
