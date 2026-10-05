/*
  Insights topic filter. "All" shows the featured (latest) post and lists the rest;
  a topic hides the featured block and lists every matching post.
*/
(function () {
  'use strict';
  var root = document.querySelector('[data-insights]');
  if (!root) return;
  var tabs = root.querySelectorAll('[role="tab"]');
  var rows = root.querySelectorAll('.post-row');
  var featured = root.querySelector('[data-featured]');
  var empty = root.querySelector('[data-empty]');

  function select(topic) {
    var all = topic === 'All', shown = 0;
    Array.prototype.forEach.call(tabs, function (tab) {
      tab.setAttribute('aria-selected', tab.getAttribute('data-topic') === topic ? 'true' : 'false');
    });
    if (featured) featured.hidden = !all;
    Array.prototype.forEach.call(rows, function (row) {
      var show = all ? !row.hasAttribute('data-latest') : row.getAttribute('data-topic') === topic;
      row.hidden = !show;
      if (show) shown++;
    });
    empty.hidden = shown > 0;
  }

  Array.prototype.forEach.call(tabs, function (tab) {
    tab.addEventListener('click', function () { select(tab.getAttribute('data-topic')); });
  });
})();
