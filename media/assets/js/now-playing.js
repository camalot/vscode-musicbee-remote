// @ts-check
/// <reference lib="dom" />
"use strict";

(function () {
  var vscode = acquireVsCodeApi();

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

  var committedRating = 0;

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

  function updateRatingDisplay(ratingRaw) {
    committedRating = normalizeRating(ratingRaw);
    applyFillsForRating(committedRating);
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
      var albumArtEl = document.getElementById("albumArt");
      if (albumArtEl) {
        albumArtEl.innerHTML = "<img src=\"" + artSrc + "\" alt=\"Album art\" />";
      }
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

    var volumeEl = document.getElementById("volume");
    if (volumeEl) {
      volumeEl.value = String(status.volume || 0);
    }

    var currentRating = (state.nowPlaying && state.nowPlaying.trackRating) || "0";
    updateRatingDisplay(currentRating);

    var lfmRating = (state.nowPlaying && state.nowPlaying.lfmRating) || "";
    var favoriteBtn = document.getElementById("btnFavorite");
    if (favoriteBtn) {
      favoriteBtn.classList.toggle("selected", lfmRating.toLowerCase() === "love");
    }
  }

  document.body.addEventListener("click", function (e) {
    var btn = e.target instanceof Element ? e.target.closest("button") : null;
    if (!btn) { return; }

    var control = btn.getAttribute("data-control");
    if (!control) { return; }

    if (control === "favorite") {
      var favoriteBtn = document.getElementById("btnFavorite");
      var isSelected = favoriteBtn ? favoriteBtn.classList.contains("selected") : false;
      if (favoriteBtn) {
        favoriteBtn.classList.toggle("selected", !isSelected);
      }
      vscode.postMessage({ type: "control", action: "favorite" });
      return;
    }

    if (control === "rating") {
      var star = e.target instanceof Element ? e.target.closest("span[data-star]") : null;
      if (!star) { return; }
      var value = Number(star.getAttribute("data-star") || 0);
      updateRatingDisplay(value);
      vscode.postMessage({ type: "control", action: "rating", value: value });
      return;
    }

    vscode.postMessage({ type: "control", action: control });
  });

  var volumeEl = document.getElementById("volume");
  if (volumeEl) {
    volumeEl.addEventListener("input", function () {
      var value = Number(volumeEl.value);
      vscode.postMessage({ type: "control", action: "volume", value: value });
    });
  }

  var ratingStars = document.querySelectorAll(".rating .star");
  ratingStars.forEach(function (star) {
    star.addEventListener("mousemove", function (evt) {
      var index = Number(star.getAttribute("data-index") || 0);
      var rect = star.getBoundingClientRect();
      var x = evt.clientX - rect.left;
      var half = x < rect.width / 2;
      var preview = index + (half ? 0.5 : 1);
      applyFillsForRating(preview);
    });

    star.addEventListener("click", function (evt) {
      var index = Number(star.getAttribute("data-index") || 0);
      var rect = star.getBoundingClientRect();
      var x = evt.clientX - rect.left;
      var half = x < rect.width / 2;
      var value = index + (half ? 0.5 : 1);
      committedRating = value;
      applyFillsForRating(committedRating);
      vscode.postMessage({ type: "control", action: "rating", value: value });
    });
  });

  var ratingContainer = document.getElementById("rating");
  if (ratingContainer) {
    ratingContainer.addEventListener("mouseleave", function () {
      applyFillsForRating(committedRating);
    });
  }

  window.addEventListener("message", function (e) {
    if (e.data && e.data.type === "state") {
      render(e.data.state);
    }
  });

  var saved = vscode.getState();
  if (saved) { render(saved); }
  vscode.postMessage({ type: "ready" });
}());
