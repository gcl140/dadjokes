// Song search modal (#songs-modal / #add-song-form, see
// content/templates/partial/add_song.html) - shared by the create-joke
// form and the profile edit-post modal, both of which include that
// partial. Kicks off the server-side yt-dlp search/download as a
// background job (see content/views.py _run_song_search) and reports back
// via toast + the notifications websocket, same pattern as everywhere
// else async work happens in this app.
function openSongsModal(prefillQuery) {
  var modal = document.getElementById('songs-modal');
  if (!modal) return;

  modal.classList.remove('hidden');

  if (prefillQuery) {
    var input = document.getElementById('songs-input');
    if (input) {
      input.value = prefillQuery;
      input.focus();
    }
  }
}
window.openSongsModal = openSongsModal;

(function () {
  var form = document.getElementById('add-song-form');
  if (!form) return;

  var input = document.getElementById('songs-input');
  var modal = document.getElementById('songs-modal');

  function toast(text, isError) {
    if (!window.Toastify) return;
    Toastify({
      text: text,
      duration: isError ? 5000 : 4500,
      gravity: 'top',
      position: 'right',
      close: true,
      style: isError ? { background: '#dc2626', color: '#fef2f2' } : { background: '#000000', color: '#ffffff' },
    }).showToast();
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();

    var query = input.value.trim();
    if (!query) return;

    // Snapshot the form data before clearing the input below - FormData
    // reads live from the DOM at construction time, so building it after
    // the clear would submit an empty query.
    var formData = new FormData(form);

    // Close the modal immediately instead of leaving the user staring at
    // it while the search runs server-side - the real outcome (found /
    // not found) arrives separately as a toast + notification via the
    // websocket once it finishes. The top-right spinner (bg-jobs.js)
    // covers the "still working" gap in between.
    modal.classList.add('hidden');
    input.value = '';
    toast('Searching for “' + query + '”… you’ll get a notification when it’s done.');
    if (window.__ydBgJob) window.__ydBgJob.start('Searching for “' + query + '”…');

    fetch(form.action, {
      method: 'POST',
      body: formData,
    })
      .then(function (res) {
        if (!res.ok) return res.json().then(function (data) { throw new Error(data.error || 'Search failed.'); });
      })
      .catch(function (err) {
        if (window.__ydBgJob) window.__ydBgJob.clear();
        toast(err.message, true);
      });
  });
})();
