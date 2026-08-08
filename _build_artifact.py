import re, base64, os

BASE = r"C:\Users\Vitor Ivens\Desktop\Dungeons World RPG\APP - Kael\kael-app"
OUT = r"C:\Users\Vitor Ivens\Desktop\Dungeons World RPG\APP - Kael\kael-app-remoto.html"

def read(path):
    with open(os.path.join(BASE, path), "r", encoding="utf-8") as f:
        return f.read()

def data_uri(path, mime):
    with open(os.path.join(BASE, path), "rb") as f:
        b = base64.b64encode(f.read()).decode("ascii")
    return f"data:{mime};base64,{b}"

html = read("index.html")
css = read("styles.css")
js = read("app.js")

IMAGES = {
    "assets/kael-portrait.webp": data_uri("assets/kael-portrait.webp", "image/webp"),
    "assets/bg-winterfell.jpg": data_uri("assets/bg-winterfell.jpg", "image/jpeg"),
    "assets/weapon-presa-de-lofurin.webp": data_uri("assets/weapon-presa-de-lofurin.webp", "image/webp"),
    "assets/shield-lobo-branco.webp": data_uri("assets/shield-lobo-branco.webp", "image/webp"),
    "assets/armor-escamas.webp": data_uri("assets/armor-escamas.webp", "image/webp"),
}

# --- extract <body>...</body> ---
body_match = re.search(r"<body>(.*)</body>", html, re.S)
body = body_match.group(1)

# drop the external script tag; we'll inline app.js instead
body = body.replace('<script src="app.js"></script>', "")

# swap image src attributes for data URIs
for src, uri in IMAGES.items():
    body = body.replace(f'src="{src}"', f'src="{uri}"')

# --- app.js: remove the Service Worker registration block (no sw.js hosted on artifacts) ---
js = re.sub(
    r"/\* =+ Service worker =+ \*/\s*if \(\"serviceWorker\" in navigator\) \{.*?\n\s*\}\n",
    "",
    js,
    flags=re.S,
)
# point every DEFAULT_ASSETS entry at its inlined data URI (render() re-applies
# these on load/reset, so the HTML-level src swap above isn't enough on its own)
js = js.replace('portrait: "assets/kael-portrait.webp",', f'portrait: "{IMAGES["assets/kael-portrait.webp"]}",')
js = js.replace('weaponImg: "assets/weapon-presa-de-lofurin.webp",', f'weaponImg: "{IMAGES["assets/weapon-presa-de-lofurin.webp"]}",')
js = js.replace('shieldImg: "assets/shield-lobo-branco.webp",', f'shieldImg: "{IMAGES["assets/shield-lobo-branco.webp"]}",')
js = js.replace('armorImg: "assets/armor-escamas.webp",', f'armorImg: "{IMAGES["assets/armor-escamas.webp"]}",')
js = js.replace('background: "assets/bg-winterfell.jpg",', f'background: "{IMAGES["assets/bg-winterfell.jpg"]}",')

fragment = f"""<meta charset="utf-8" />
<title>Kael Frostborn — Ficha do Guerreiro</title>
<style>
{css}
</style>
{body}
<script>
{js}
</script>
"""

with open(OUT, "w", encoding="utf-8") as f:
    f.write(fragment)

print("wrote", OUT, len(fragment) / 1024 / 1024, "MB")
