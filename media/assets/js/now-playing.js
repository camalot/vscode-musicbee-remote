// @ts-check
/// <reference lib="dom" />
"use strict";

(function () {
  var vscode = acquireVsCodeApi();

  function fmt(ms) {
    var s = Math.max(0, Math.floor((Number(ms) || 0) / 1000));
    return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0");
  }

  function render(state) {
    var track  = (state.nowPlaying && state.nowPlaying.track)    || {};
    var pos    = (state.nowPlaying && state.nowPlaying.position) || {};
    var status = (state.nowPlaying && state.nowPlaying.status)  || {};

    vscode.setState(state);

    var coverEl = document.getElementById("cover");
    if (coverEl) {
      var noArtSrc = coverEl.getAttribute("data-no-art") || "";
      var artSrc = track.coverDataUrl || noArtSrc;
      coverEl.innerHTML = "<img src=\"" + artSrc + "\" alt=\"Album art\" />";
    }

    var titleEl = document.getElementById("title");
    if (titleEl) { titleEl.textContent = track.title || "Nothing playing"; }

    var artistEl = document.getElementById("artist");
    if (artistEl) { artistEl.textContent = track.artist || "\u2014"; }

    var albumEl = document.getElementById("album");
    if (albumEl) { albumEl.textContent = track.album || ""; }

    var total   = Number(pos.total)   || 0;
    var current = Number(pos.current) || 0;
    var pct = total > 0 ? Math.max(0, Math.min(100, (current / total) * 100)) : 0;

    var progressEl = document.getElementById("progress");
    if (progressEl) { progressEl.style.width = pct + "%"; }

    var posCurrentEl = document.getElementById("posCurrent");
    if (posCurrentEl) { posCurrentEl.textContent = fmt(current); }

    var posTotalEl = document.getElementById("posTotal");
    if (posTotalEl) { posTotalEl.textContent = fmt(total); }

    var isPlaying = /play/i.test((status && status.playState) || "");
    var playBtn = document.getElementById("btnPlayPause");
    if (playBtn) { playBtn.textContent = isPlaying ? "\u23F8" : "\u25B6"; }

    var isMuted = status.mute === true;
    var muteBtn = document.getElementById("btnMute");
    if (muteBtn) { muteBtn.textContent = isMuted ? "\uD83D\uDD07" : "\uD83D\uDD0A"; }
  }

  window.addEventListener("message", function (e) {
    if (e.data && e.data.type === "state") { render(e.data.state); }
  });

  document.body.addEventListener("click", function (e) {
    var btn = e.target instanceof Element ? e.target.closest("button") : null;
    if (!btn) { return; }
    var control = btn.getAttribute("data-control");
    if (control) { vscode.postMessage({ type: "control", action: control }); }
  });

  var saved = vscode.getState();
  if (saved) { render(saved); }
  vscode.postMessage({ type: "ready" });
}());
