#!/usr/bin/env python3
import os, re, shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC_TPL = ROOT / 'templates'
APP_TPL = ROOT / 'site_metalcard' / 'templates'
OUT = ROOT / 'netlify_dist'

OUT.mkdir(parents=True, exist_ok=True)

def compile_html(src_path: Path, out_name: str):
    html = src_path.read_text(encoding='utf-8')
    # Remove Django load static
    html = re.sub(r"\{\%\s*load\s+static\s*\%\}\n?", "", html)
    # Replace Django urls with static paths
    url_map = {
        r"\{\%\s*url\s+'pages:index'\s*\%\}": "/index.html",
        r"\{\%\s*url\s+'pages:design'\s*\%\}": "/design.html",
        r"\{\%\s*url\s+'pages:gallery'\s*\%\}": "/gallery.html",
        r"\{\%\s*url\s+'pages:benefits'\s*\%\}": "/benefits.html",
    }
    for patt, repl in url_map.items():
        html = re.sub(patt, repl, html)
    # Replace static tags
    html = re.sub(r"\{\%\s*static\s+'([^']+)'\s*\%\}", r"/static/\1", html)
    # Write out
    (OUT / out_name).write_text(html, encoding='utf-8')

def copy_dir(src: Path, dst_rel: str):
    dst = OUT / dst_rel
    if dst.exists():
        shutil.rmtree(dst)
    if src.exists():
        shutil.copytree(src, dst)

def main():
    # Compile mobile pages to top-level html
    # Проверяем наличие файлов перед компиляцией
    templates_to_compile = [
        ('index_mobile.html', 'index.html'),
        ('gallery_mobile.html', 'gallery.html'),
        ('design_mobile.html', 'design.html'),
        ('benefits_mobile.html', 'benefits.html'),
    ]
    
    for src_name, out_name in templates_to_compile:
        src_path = SRC_TPL / src_name
        if src_path.exists():
            compile_html(src_path, out_name)
        else:
            print(f"Warning: Template {src_name} not found, skipping")

    # Copy assets
    copy_dir(ROOT / 'static', 'static')
    copy_dir(ROOT / 'reels', 'reels')
    copy_dir(ROOT / 'origs', 'origs')
    # Also app-level static (icons etc)
    copy_dir(ROOT / 'site_metalcard' / 'static', 'static')

    print(f"Built Netlify dist at {OUT}")

if __name__ == '__main__':
    main()

