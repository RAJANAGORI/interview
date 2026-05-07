function renderComment(text) {
  // Vulnerable: inserts untrusted HTML directly.
  document.getElementById("comments").innerHTML += `<li>${text}</li>`;
}

