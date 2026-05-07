function escapeHtml(text) {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function renderComment(text) {
  // Fixed: output encoding before insertion.
  document.getElementById("comments").innerHTML += `<li>${escapeHtml(text)}</li>`;
}

