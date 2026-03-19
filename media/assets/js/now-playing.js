// @ts-check
/// <reference lib="dom" />
"use strict";

(function () {
  var vscode = acquireVsCodeApi();

  function setControlIconVariables() {
    var root = document.documentElement;
    var body = document.body;
    var playTrack = body.getAttribute("data-icon-play-track");
    var pauseTrack = body.getAttribute("data-icon-pause-track");
    var nextTrack = body.getAttribute("data-icon-next-track");
    var previousTrack = body.getAttribute("data-icon-previous-track");
    var repeat0 = body.getAttribute("data-icon-repeat-0");
    var repeat1 = body.getAttribute("data-icon-repeat-1");
    var repeat2 = body.getAttribute("data-icon-repeat-2");
    var shuffle0 = body.getAttribute("data-icon-shuffle-0");
    var shuffle1 = body.getAttribute("data-icon-shuffle-1");
    var shuffle2 = body.getAttribute("data-icon-shuffle-2");
    var playlist = body.getAttribute("data-icon-playlist");
    var volume0 = body.getAttribute("data-icon-volume-0");
    var volume1 = body.getAttribute("data-icon-volume-1");
    var volume2 = body.getAttribute("data-icon-volume-2");
    var volume3 = body.getAttribute("data-icon-volume-3");
    var volume4 = body.getAttribute("data-icon-volume-4");

    if (playTrack) {
      root.style.setProperty("--mbrvsc-icon-play-track", "url(\"" + playTrack + "\")");
    }
    if (pauseTrack) {
      root.style.setProperty("--mbrvsc-icon-pause-track", "url(\"" + pauseTrack + "\")");
    }
    if (nextTrack) {
      root.style.setProperty("--mbrvsc-icon-next-track", "url(\"" + nextTrack + "\")");
    }
    if (previousTrack) {
      root.style.setProperty("--mbrvsc-icon-previous-track", "url(\"" + previousTrack + "\")");
    }
    if (repeat0) {
      root.style.setProperty("--mbrvsc-icon-repeat-0", "url(\"" + repeat0 + "\")");
    }
    if (repeat1) {
      root.style.setProperty("--mbrvsc-icon-repeat-1", "url(\"" + repeat1 + "\")");
    }
    if (repeat2) {
      root.style.setProperty("--mbrvsc-icon-repeat-2", "url(\"" + repeat2 + "\")");
    }
    if (shuffle0) {
      root.style.setProperty("--mbrvsc-icon-shuffle-0", "url(\"" + shuffle0 + "\")");
    }
    if (shuffle1) {
      root.style.setProperty("--mbrvsc-icon-shuffle-1", "url(\"" + shuffle1 + "\")");
    }
    if (shuffle2) {
      root.style.setProperty("--mbrvsc-icon-shuffle-2", "url(\"" + shuffle2 + "\")");
    }
    if (playlist) {
      root.style.setProperty("--mbrvsc-icon-playlist", "url(\"" + playlist + "\")");
    }
    if (volume0) {
      root.style.setProperty("--mbrvsc-icon-volume-0", "url(\"" + volume0 + "\")");
    }
    if (volume1) {
      root.style.setProperty("--mbrvsc-icon-volume-1", "url(\"" + volume1 + "\")");
    }
    if (volume2) {
      root.style.setProperty("--mbrvsc-icon-volume-2", "url(\"" + volume2 + "\")");
    }
    if (volume3) {
      root.style.setProperty("--mbrvsc-icon-volume-3", "url(\"" + volume3 + "\")");
    }
    if (volume4) {
      root.style.setProperty("--mbrvsc-icon-volume-4", "url(\"" + volume4 + "\")");
    }
  }

  function normalizeRepeatState(value) {
    var normalized = String(value || "").trim().toLowerCase();
    if (!normalized || normalized === "0" || normalized === "off" || normalized === "false" || normalized === "none") {
      return "off";
    }

    if (
      normalized === "2"
      || normalized === "one"
      || normalized === "single"
      || normalized === "track"
      || normalized === "repeat1"
      || normalized === "repeat-1"
      || normalized.indexOf("track") >= 0
      || normalized.indexOf("single") >= 0
      || normalized.indexOf("repeat one") >= 0
    ) {
      return "one";
    }

    if (normalized === "1" || normalized === "on" || normalized === "true" || normalized === "all") {
      return "on";
    }

    if (normalized.indexOf("off") >= 0 || normalized.indexOf("none") >= 0 || normalized.indexOf("false") >= 0) {
      return "off";
    }

    return "on";
  }

  function normalizeShuffleState(value) {
    var normalized = String(value || "").trim().toLowerCase();
    if (!normalized || normalized === "0" || normalized === "off" || normalized === "false" || normalized === "none") {
      return "off";
    }

    if (normalized === "2" || normalized.indexOf("auto") >= 0 || normalized.indexOf("dj") >= 0) {
      return "autodj";
    }

    if (normalized === "1" || normalized === "on" || normalized === "true" || normalized.indexOf("shuffle") >= 0 || normalized.indexOf("random") >= 0) {
      return "on";
    }

    return "off";
  }

  function fmt(ms) {
    var s = Math.max(0, Math.floor((Number(ms) || 0) / 1000));
    return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0");
  }

  function normalizeRating(value) {
    if (typeof value === "string") {
      // Accept values like "3.5", "3/5", "75" (0-100 scale)
      var match = value.match(/(\d+(?:\.\d+)?)/);
      if (match) {
        value = Number(match[0]);
      }
    }

    if (typeof value !== "number" || Number.isNaN(value)) {
      return 0;
    }

    // If the rating is on a 0..100 scale, map to 0..5 using 0.5 steps.
    if (value > 5) {
      return Math.round(Math.min(100, value) / 10) / 2;
    }

    // Ensure we only use 0.5 steps for 0..5 scale.
    return Math.max(0, Math.min(5, Math.round(value * 2) / 2));
  }

  /**
   * @param {number} volume
   * @returns {number} volume level 0-4
   */
  function getVolumeLevel(volume) {
    if (volume === 0) {
      return 0;
    }
    if (volume <= 24) {
      return 1;
    }
    if (volume <= 49) {
      return 2;
    }
    if (volume <= 74) {
      return 3;
    }
    return 4;
  }

  /**
   * @param {number} volume
   * @param {boolean=} isMuted
   */
  function updateVolumeIcon(volume, isMuted) {
    var root = document.documentElement;
    var percent = Math.max(0, Math.min(100, Number.isNaN(volume) ? 0 : volume));
    var level = isMuted ? 0 : getVolumeLevel(percent);
    root.style.setProperty("--mbrvsc-icon-volume", "var(--mbrvsc-icon-volume-" + level + ")");
  }

  var committedRating = 0;
  var isVolumeDragging = false;
  var isVolumeSyncDeferred = false;
  var deferredVolumeState = null;
  var volumeSyncTimer = null;
  var miniRatingContainer = /** @type {HTMLElement | null} */ (document.getElementById("ratingMini"));
  var miniActionsGroup = /** @type {HTMLElement | null} */ (document.getElementById("miniActionsGroup"));

  // ── Now Playing list panel state ─────────────────────────────────────────
  var nowPlayingQueue = /** @type {Array<{title:string,artist:string,path:string,position:number,duration?:string}>} */ ([]);
  var nowPlayingCurrentPath = "";
  var nowPlayingPageSize = 25;
  var nowPlayingRenderedCount = 0;
  var nowPlayingObserver = /** @type {IntersectionObserver | null} */ (null);

  /**
   * Sanitize a string for use as text content (not innerHTML).
   * @param {string} str
   * @returns {string}
   */
  function sanitizeText(str) {
    return String(str || "");
  }

  /**
   * Render a batch of tracks into the list.
   * @param {boolean} append - if true, append; if false, replace all
   */
  function renderNowPlayingTracks(append) {
    var container = document.getElementById("nowPlayingListTracks");
    if (!container) {
      return;
    }

    if (!append) {
      container.innerHTML = "";
      nowPlayingRenderedCount = 0;
    }

    var start = nowPlayingRenderedCount;
    var end = Math.min(start + nowPlayingPageSize, nowPlayingQueue.length);

    for (var i = start; i < end; i++) {
      var track = nowPlayingQueue[i];
      var isPlaying = track.path && track.path === nowPlayingCurrentPath;

      var row = document.createElement("div");
      row.className = "nowplaying-list-track" + (isPlaying ? " playing" : "");
      row.setAttribute("role", "listitem");
      row.setAttribute("data-track-path", track.path || "");
      row.setAttribute("data-track-position", String(Number(track.position || 0)));
      row.setAttribute("data-track-index", String(i));
      row.tabIndex = 0;

      var icon = document.createElement("div");
      icon.className = "nowplaying-list-track-icon";
      icon.setAttribute("aria-hidden", "true");

      var content = document.createElement("div");
      content.className = "nowplaying-list-track-content";

      var titleEl = document.createElement("div");
      titleEl.className = "nowplaying-list-track-title";
      titleEl.textContent = sanitizeText(track.title || "Unknown");

      var metaEl = document.createElement("div");
      metaEl.className = "nowplaying-list-track-meta";

      var artistEl = document.createElement("span");
      artistEl.className = "nowplaying-list-track-artist";
      artistEl.textContent = sanitizeText(track.artist || "");

      var durationEl = document.createElement("span");
      durationEl.className = "nowplaying-list-track-duration";
      durationEl.textContent = sanitizeText(track.duration || "");

      metaEl.appendChild(artistEl);
      if (track.duration) {
        metaEl.appendChild(durationEl);
      }

      content.appendChild(titleEl);
      content.appendChild(metaEl);

      row.appendChild(icon);
      row.appendChild(content);
      container.appendChild(row);
    }

    nowPlayingRenderedCount = end;
  }

  /**
   * Update the "playing" highlight when the current track changes.
   */
  function updateNowPlayingListHighlight() {
    var container = document.getElementById("nowPlayingListTracks");
    if (!container) {
      return;
    }
    var rows = container.querySelectorAll(".nowplaying-list-track");
    rows.forEach(function (row) {
      var path = row.getAttribute("data-track-path") || "";
      var isPlaying = path && path === nowPlayingCurrentPath;
      row.classList.toggle("playing", !!isPlaying);
    });
  }

  function setupNowPlayingListObserver() {
    if (nowPlayingObserver) {
      nowPlayingObserver.disconnect();
      nowPlayingObserver = null;
    }

    var sentinel = document.getElementById("nowPlayingListSentinel");
    if (!sentinel) {
      return;
    }

    nowPlayingObserver = new IntersectionObserver(function (entries) {
      if (entries[0].isIntersecting && nowPlayingRenderedCount < nowPlayingQueue.length) {
        renderNowPlayingTracks(true);
      }
    }, { threshold: 0.1 });

    nowPlayingObserver.observe(sentinel);
  }

  function openNowPlayingPanel() {
    var panel = document.getElementById("nowPlayingListPanel");
    if (!panel) {
      return;
    }
    panel.classList.add("active");
    renderNowPlayingTracks(false);
    setupNowPlayingListObserver();
  }

  function closeNowPlayingPanel() {
    var panel = document.getElementById("nowPlayingListPanel");
    if (!panel) {
      return;
    }
    panel.classList.remove("active");
    if (nowPlayingObserver) {
      nowPlayingObserver.disconnect();
      nowPlayingObserver = null;
    }
  }

  function isNowPlayingPanelOpen() {
    var panel = document.getElementById("nowPlayingListPanel");
    return panel ? panel.classList.contains("active") : false;
  }

  // Double-click on a track row to play it
  document.addEventListener("dblclick", function (e) {
    var row = e.target instanceof Element ? e.target.closest(".nowplaying-list-track") : null;
    if (!row) {
      return;
    }
    var positionRaw = row.getAttribute("data-track-position");
    var position = Number(positionRaw);
    if (Number.isFinite(position)) {
      vscode.postMessage({ type: "playNowPlayingTrack", position: position });
    }
  });

  function applyServerVolumeState(volumeEl, volume, isMuted) {
    volumeEl.value = String(volume || 0);
    updateVolumeFill(volumeEl);
    updateVolumeIcon(Number(volume || 0), isMuted);
  }

  function flushDeferredVolumeState() {
    if (volumeSyncTimer) {
      clearTimeout(volumeSyncTimer);
      volumeSyncTimer = null;
    }

    isVolumeSyncDeferred = false;

    if (!deferredVolumeState) {
      return;
    }

    var volumeEl = /** @type {HTMLInputElement | null} */ (document.getElementById("volume"));
    if (!volumeEl) {
      deferredVolumeState = null;
      return;
    }

    applyServerVolumeState(volumeEl, deferredVolumeState.volume, deferredVolumeState.isMuted);
    deferredVolumeState = null;
  }

  function deferVolumeSync() {
    if (volumeSyncTimer) {
      clearTimeout(volumeSyncTimer);
    }

    isVolumeSyncDeferred = true;
    volumeSyncTimer = setTimeout(function () {
      flushDeferredVolumeState();
    }, 120);
  }

  function applyFillsForRating(rating) {
    var stars = document.querySelectorAll(".rating .star");
    stars.forEach(function (star) {
      var index = Number(star.getAttribute("data-index") || 0);
      var fillPercent = Math.max(0, Math.min(100, (rating - index) * 100));
      var fillEl = star.querySelector(".star-fill");
      if (fillEl) {
        fillEl.textContent = "\u2605";
        fillEl.style.width = fillPercent + "%";
      }
    });
  }

  /**
   * @param {Element} star
   * @param {number} clientX
   * @returns {number}
   */
  function getStarValueFromPointer(star, clientX) {
    var index = Number(star.getAttribute("data-index") || 0);
    var rect = star.getBoundingClientRect();
    var x = clientX - rect.left;
    var half = x < rect.width / 2;
    return index + (half ? 0.5 : 1);
  }

  /**
   * @param {boolean} expanded
   */
  function setMiniRatingExpanded(expanded) {
    if (!miniRatingContainer || !miniActionsGroup) {
      return;
    }

    miniRatingContainer.classList.toggle("is-expanded", expanded);
    miniActionsGroup.classList.toggle("rating-expanded", expanded);
  }

  /**
   * @param {HTMLElement | null} container
   * @param {{
   *   collapseOnMouseLeave?: boolean,
   *   collapseOnSelect?: boolean,
   *   expandOnHover?: boolean
   * }} options
   */
  function setupRatingInteractions(container, options) {
    if (!container) {
      return;
    }

    var stars = container.querySelectorAll(".star");
    stars.forEach(function (star) {
      star.addEventListener("mousemove", function (evt) {
        var preview = getStarValueFromPointer(star, evt.clientX);
        applyFillsForRating(preview);
      });

      star.addEventListener("click", function (evt) {
        var value = getStarValueFromPointer(star, evt.clientX);
        committedRating = value;
        applyFillsForRating(committedRating);
        vscode.postMessage({ type: "control", action: "rating", value: value });

        if (options.collapseOnSelect) {
          setMiniRatingExpanded(false);
        }
      });
    });

    container.addEventListener("mouseleave", function () {
      applyFillsForRating(committedRating);

      if (options.collapseOnMouseLeave) {
        setMiniRatingExpanded(false);
      }
    });

    if (options.expandOnHover) {
      container.addEventListener("mouseenter", function () {
        setMiniRatingExpanded(true);
      });
    }
  }

  function updateRatingDisplay(ratingRaw) {
    committedRating = normalizeRating(ratingRaw);
    applyFillsForRating(committedRating);

    var ratingTitle = committedRating > 0 ? String(committedRating) : "";
    var ratingEl = document.getElementById("rating");
    if (ratingEl) {
      ratingEl.setAttribute("title", ratingTitle);
    }

    var ratingMiniEl = document.getElementById("ratingMini");
    if (ratingMiniEl) {
      ratingMiniEl.setAttribute("title", ratingTitle);
    }
  }

  function setFavoriteSelected(isSelected) {
    var favoriteBtn = document.getElementById("btnFavorite");
    if (favoriteBtn) {
      favoriteBtn.classList.toggle("selected", isSelected);
      favoriteBtn.setAttribute("title", isSelected ? "unfavorite" : "favorite");
    }

    var favoriteMiniBtn = document.getElementById("btnFavoriteMini");
    if (favoriteMiniBtn) {
      favoriteMiniBtn.classList.toggle("selected", isSelected);
      favoriteMiniBtn.setAttribute("title", isSelected ? "unfavorite" : "favorite");
    }
  }

  /**
   * @param {HTMLInputElement} volumeEl
   */
  function updateVolumeFill(volumeEl) {
    var volume = Number(volumeEl.value);
    var percent = Math.max(0, Math.min(100, Number.isNaN(volume) ? 0 : volume));
    volumeEl.style.setProperty("--mbrvsc-volume-percent", percent + "%");
  }

  function render(state) {
    var track = (state.nowPlaying && state.nowPlaying.track) || {};
    var pos = (state.nowPlaying && state.nowPlaying.position) || {};
    var status = (state.nowPlaying && state.nowPlaying.status) || {};

    try {
      var stateCopy = JSON.parse(JSON.stringify(state));
      if (stateCopy && stateCopy.nowPlaying && stateCopy.nowPlaying.track) {
        delete stateCopy.nowPlaying.track.coverDataUrl;
      }
      vscode.setState(stateCopy);
    } catch (e) {
      // ignore
    }

    var coverEl = document.getElementById("cover");
    if (coverEl) {
      var noArtSrc = coverEl.getAttribute("data-no-art") || "";
      var artSrc = track.coverDataUrl || noArtSrc;
      var albumArtEl = document.getElementById("albumArt");
      if (albumArtEl) {
        albumArtEl.innerHTML = "<img src=\"" + artSrc + "\" alt=\"Album art\" />";
      }
    }

    var titleEl = document.getElementById("title");
    if (titleEl) {
      titleEl.textContent = track.title || "Nothing playing";
    }

    var artistEl = document.getElementById("artist");
    if (artistEl) {
      artistEl.textContent = track.artist || "\u2014";
    }

    var albumEl = document.getElementById("album");
    if (albumEl) {
      albumEl.textContent = track.album || "";
    }

    var total = Number(pos.total) || 0;
    var current = Number(pos.current) || 0;
    var pct = total > 0 ? Math.max(0, Math.min(100, (current / total) * 100)) : 0;

    var progressEl = document.getElementById("progress");
    if (progressEl) {
      progressEl.style.width = pct + "%";
    }

    var posCurrentEl = document.getElementById("posCurrent");
    if (posCurrentEl) {
      posCurrentEl.textContent = fmt(current);
    }

    var posTotalEl = document.getElementById("posTotal");
    if (posTotalEl) {
      posTotalEl.textContent = fmt(total);
    }

    var isPlaying = /play/i.test((status && status.playState) || "");
    var playBtn = document.getElementById("btnPlayPause");
    if (playBtn) {
      playBtn.setAttribute("data-state", isPlaying ? "playing" : "paused");
      playBtn.setAttribute("aria-label", isPlaying ? "Pause" : "Play");
    }

    var repeatBtn = document.getElementById("btnRepeat");
    if (repeatBtn) {
      var repeatState = normalizeRepeatState(status.repeat);
      repeatBtn.setAttribute("data-state", repeatState);
      repeatBtn.setAttribute("aria-label", repeatState === "one" ? "Repeat one" : (repeatState === "on" ? "Repeat on" : "Repeat off"));
      repeatBtn.setAttribute("title", repeatState === "one" ? "Repeat One" : (repeatState === "on" ? "Repeat On" : "Repeat Off"));
    }

    var shuffleBtn = document.getElementById("btnShuffle");
    if (shuffleBtn) {
      var shuffleState = normalizeShuffleState(status.shuffle);
      shuffleBtn.setAttribute("data-state", shuffleState);
      shuffleBtn.setAttribute("aria-label", shuffleState === "autodj" ? "Shuffle Auto DJ" : (shuffleState === "on" ? "Shuffle on" : "Shuffle off"));
      shuffleBtn.setAttribute("title", shuffleState === "autodj" ? "Auto DJ" : (shuffleState === "on" ? "Shuffle On" : "Shuffle Off"));
    }

    var isMuted = status.mute === true;
    document.body.classList.toggle("is-muted", isMuted);

    var volumeEl = /** @type {HTMLInputElement | null} */ (document.getElementById("volume"));
    if (volumeEl) {
      if (isVolumeDragging || isVolumeSyncDeferred) {
        deferredVolumeState = {
          volume: Number(status.volume || 0),
          isMuted: isMuted
        };
      } else {
        applyServerVolumeState(volumeEl, Number(status.volume || 0), isMuted);
      }
      volumeEl.setAttribute("title", String(Number(status.volume || 0)));
    }

    var muteBtn = document.getElementById("btnMute");
    if (muteBtn) {
      muteBtn.setAttribute("title", isMuted ? "Unmute" : "Mute");
    }

    var currentRating = (state.nowPlaying && state.nowPlaying.trackRating) || "0";
    updateRatingDisplay(currentRating);

    var lfmRating = (state.nowPlaying && state.nowPlaying.lfmRating) || "";
    setFavoriteSelected(lfmRating.toLowerCase() === "love");

    // Update now playing list data
    var newQueue = (state.nowPlaying && state.nowPlaying.queue) || [];
    var newPath = (state.nowPlaying && state.nowPlaying.track && state.nowPlaying.track.path) || "";
    var queueChanged = JSON.stringify(newQueue) !== JSON.stringify(nowPlayingQueue);
    var pathChanged = newPath !== nowPlayingCurrentPath;

    nowPlayingQueue = newQueue;
    nowPlayingCurrentPath = newPath;

    if (isNowPlayingPanelOpen()) {
      if (queueChanged) {
        renderNowPlayingTracks(false);
        setupNowPlayingListObserver();
      } else if (pathChanged) {
        updateNowPlayingListHighlight();
      }
    }
  }

  document.body.addEventListener("click", function (e) {
    var btn = e.target instanceof Element ? e.target.closest("button") : null;
    if (!btn) {
      return;
    }

    var control = btn.getAttribute("data-control");
    if (!control) {
      return;
    }

    if (control === "favorite") {
      var favoriteBtn = document.getElementById("btnFavorite");
      var isSelected = favoriteBtn ? favoriteBtn.classList.contains("selected") : false;
      setFavoriteSelected(!isSelected);
      vscode.postMessage({ type: "control", action: "favorite" });
      return;
    }

    if (control === "rating") {
      var star = e.target instanceof Element ? e.target.closest("span[data-star]") : null;
      if (!star) {
        return;
      }
      var value = Number(star.getAttribute("data-star") || 0);
      updateRatingDisplay(value);
      vscode.postMessage({ type: "control", action: "rating", value: value });
      return;
    }

    if (control === "playlist") {
      var nextState = btn.getAttribute("data-state") === "on" ? "off" : "on";
      btn.setAttribute("data-state", nextState);
      btn.setAttribute("aria-label", nextState === "on" ? "Playlist on" : "Playlist off");
      btn.setAttribute("title", nextState === "on" ? "Hide Playlist" : "Show Playlist");
      if (nextState === "on") {
        openNowPlayingPanel();
      } else {
        closeNowPlayingPanel();
      }
      return;
    }

    vscode.postMessage({ type: "control", action: control });
  });

  var volumeEl = /** @type {HTMLInputElement | null} */ (document.getElementById("volume"));
  if (volumeEl) {
    var activeVolumeEl = volumeEl;
    var endVolumeDrag = function () {
      isVolumeDragging = false;
      deferVolumeSync();
    };
    updateVolumeFill(activeVolumeEl);
    updateVolumeIcon(Number(activeVolumeEl.value), document.body.classList.contains("is-muted"));
    activeVolumeEl.setAttribute("title", String(Number(activeVolumeEl.value || 0)));
    activeVolumeEl.addEventListener("pointerdown", function () {
      isVolumeDragging = true;
      isVolumeSyncDeferred = false;
      deferredVolumeState = null;
      if (volumeSyncTimer) {
        clearTimeout(volumeSyncTimer);
        volumeSyncTimer = null;
      }
    });
    activeVolumeEl.addEventListener("pointerup", endVolumeDrag);
    activeVolumeEl.addEventListener("pointercancel", endVolumeDrag);
    activeVolumeEl.addEventListener("change", endVolumeDrag);
    activeVolumeEl.addEventListener("blur", endVolumeDrag);
    activeVolumeEl.addEventListener("input", function () {
      var value = Number(activeVolumeEl.value);
      updateVolumeFill(activeVolumeEl);
      updateVolumeIcon(value, document.body.classList.contains("is-muted"));
      activeVolumeEl.setAttribute("title", String(value));
      vscode.postMessage({ type: "control", action: "volume", value: value });
    });
  }

  var ratingContainer = document.getElementById("rating");
  setupRatingInteractions(ratingContainer, {
    collapseOnMouseLeave: false,
    collapseOnSelect: false,
    expandOnHover: false
  });

  setupRatingInteractions(miniRatingContainer, {
    collapseOnMouseLeave: true,
    collapseOnSelect: true,
    expandOnHover: true
  });

  var playlistBtn = document.getElementById("btnPlaylist");
  if (playlistBtn) {
    playlistBtn.setAttribute("title", "Show Playlist");
  }

  window.addEventListener("message", function (e) {
    if (e.data && e.data.type === "state") {
      render(e.data.state);
    }
  });

  setControlIconVariables();

  var saved = vscode.getState();
  if (saved) {
    render(saved);
  }
  vscode.postMessage({ type: "ready" });
}());
