import os

css_file = 'frontend/src/index.css'
with open(css_file, 'r', encoding='utf-8') as f:
    content = f.read()

# Fix sidebar position
content = content.replace(
""".gv-sidebar {
  position: fixed !important;         /* ← THE FIX: was missing, sidebar scrolled with page */
  top: var(--header-height);
  left: 0;
  height: calc(100vh - var(--header-height));""",
""".gv-sidebar {
  position: sticky !important;
  top: var(--header-height);
  height: calc(100vh - var(--header-height));"""
)

# Remove margin-left from main content on desktop
content = content.replace(
"""/* Main content area must compensate for fixed sidebar */
.gv-main-content {
  margin-left: var(--sidebar-width) !important;
  min-height: calc(100vh - var(--header-height));
  transition: margin-left var(--transition-normal);
}""",
"""/* Main content area */
.gv-main-content {
  margin-left: 0 !important;
  min-height: calc(100vh - var(--header-height));
  transition: margin-left var(--transition-normal);
}"""
)

# Add position fixed for tablet
tablet_media = """@media (max-width: 992px) {
  .gv-sidebar {
    position: fixed !important;
    left: 0;"""

content = content.replace(
"""@media (max-width: 992px) {
  .gv-sidebar {""",
tablet_media
)

with open(css_file, 'w', encoding='utf-8') as f:
    f.write(content)

print("CSS fixed.")
