from pathlib import Path
import streamlit as st
import streamlit.components.v1 as components

st.set_page_config(page_title="Todo App", layout="wide")

base_dir = Path(__file__).parent
html_path = base_dir / "index.html"
css_path = base_dir / "styles.css"
js_path = base_dir / "script.js"

if not html_path.exists():
    st.error("index.html not found.")
    st.stop()

html = html_path.read_text(encoding="utf-8")
css = css_path.read_text(encoding="utf-8") if css_path.exists() else ""
js = js_path.read_text(encoding="utf-8") if js_path.exists() else ""

# Inline CSS/JS for Streamlit component rendering
html = html.replace("<link rel=\"stylesheet\" href=\"styles.css\" />", f"<style>{css}</style>")
html = html.replace("<script src=\"script.js\"></script>", f"<script>{js}</script>")

components.html(html, height=900, scrolling=True)
