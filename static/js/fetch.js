// Initialize with first few items
export function initializeContent() {
  for (let i = 0; i < contentItems.length; i++) {
    const item = contentItems[i % contentItems.length];
    scrollContainer.appendChild(createVideoItem(item, i));
  }
}


// Load more content when nearing the end
export function loadMoreContent() {
  const lastItemIndex = parseInt(scrollContainer.lastChild.dataset.index);

  for (let i = 1; i <= 2; i++) {
    const newIndex = lastItemIndex + i;
    const item = contentItems[newIndex % contentItems.length];
    scrollContainer.appendChild(createVideoItem(item, newIndex));
  }
}

// Handle scroll events
export function handleScroll() {
  if (isScrolling) return;

  isScrolling = true;
  clearTimeout(scrollTimeout);

  // Calculate which item is currently in view
  const scrollTop = scrollContainer.scrollTop;
  const windowHeight = window.innerHeight;
  currentIndex = Math.round(scrollTop / windowHeight);

  // Snap to the nearest item
  scrollContainer.scrollTo({
    top: currentIndex * windowHeight,
    behavior: "smooth",
  });

  // Load more content if we're near the end
  const totalItems = scrollContainer.children.length;
  if (currentIndex >= totalItems - 2) {
    loadMoreContent();
  }

  scrollTimeout = setTimeout(() => {
    isScrolling = false;
  }, 100);
}
