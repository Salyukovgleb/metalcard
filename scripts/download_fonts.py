#!/usr/bin/env python3
"""
Скрипт для скачивания шрифтов из Google Fonts в папку fonts.

Используемые шрифты (маппинг UI -> Google Fonts):
- Alex Brush -> Alex Brush
- Arabella -> Allura
- Bodoni -> Bodoni Moda (bold)
- Card -> IBM Plex Mono
- Candlescript -> Great Vibes
- Castileo -> Cinzel Decorative
- Lombardia -> Cormorant Upright
- Monotype Corsiva -> Dancing Script
- Porcelain -> Satisfy
- Postmaster -> Alegreya SC
- Racing Catalogue -> Racing Sans One
- Resphekt -> Marck Script
- Gilroy -> Inter (замена)

Скрипт:
1. Проверяет существующие файлы в папке fonts/
2. Скачивает недостающие шрифты из Google Fonts
3. Предоставляет инструкции для ручного скачивания при необходимости

Usage:
    python3 scripts/download_fonts.py
"""

from __future__ import annotations

import os
import sys
import json
import urllib.request
import urllib.parse
import re
import ssl
from pathlib import Path

# Создаем контекст SSL без проверки сертификата (для публичных шрифтов безопасно)
_ssl_context = ssl.create_default_context()
_ssl_context.check_hostname = False
_ssl_context.verify_mode = ssl.CERT_NONE

# Маппинг UI названий на Google Fonts названия
FONT_MAPPING = {
    'Alex Brush': {
        'google_font': 'Alex Brush',
        'slug': 'alexbrush',
        'weights': ['400'],
        'local_ttf': 'alexbrush-regular.ttf',
        'local_woff2': 'alexbrush-regular.woff2',
    },
    'Arabella': {
        'google_font': 'Allura',
        'slug': 'allura',
        'weights': ['400'],
        'local_ttf': 'arabella-medium.ttf',
        'local_woff2': 'arabella-medium.woff2',
    },
    'Bodoni': {
        'google_font': 'Bodoni Moda',
        'slug': 'bodonimoda',
        'weights': ['400', '700'],  # Download both regular and bold, but use regular by default
        'local_ttf': 'bodoni-regular.ttf',  # Default to regular to match preview CSS
        'local_woff2': 'bodoni-regular.woff2',
        'bold_ttf': 'bodoni-bold.ttf',  # Also download bold as backup
        'bold_woff2': 'bodoni-bold.woff2',
    },
    'Card': {
        'google_font': 'IBM Plex Mono',
        'slug': 'ibmplexmono',
        'weights': ['400'],
        'local_ttf': 'card-regular.ttf',
        'local_woff2': 'card-regular.woff2',
    },
    'Candlescript': {
        'google_font': 'Great Vibes',
        'slug': 'greatvibes',
        'weights': ['400'],
        'local_ttf': 'candlescript.ttf',
        'local_woff2': 'candlescript.woff2',
    },
    'Castileo': {
        'google_font': 'Cinzel Decorative',
        'slug': 'cinzeldecorative',
        'weights': ['400', '700'],
        'local_ttf': 'castileo.ttf',
        'local_woff2': 'castileo.woff2',
    },
    'Lombardia': {
        'google_font': 'Cormorant Upright',
        'slug': 'cormorantupright',
        'weights': ['400', '700'],
        'local_ttf': 'lombardia.ttf',
        'local_woff2': 'lombardia.woff2',
    },
    'Monotype Corsiva': {
        'google_font': 'Dancing Script',
        'slug': 'dancingscript',
        'weights': ['400', '700'],
        'local_ttf': 'monotype-corsiva.ttf',
        'local_woff2': 'monotype-corsiva.woff2',
    },
    'Porcelain': {
        'google_font': 'Satisfy',
        'slug': 'satisfy',
        'weights': ['400'],
        'local_ttf': 'porcelain.ttf',
        'local_woff2': 'porcelain.woff2',
    },
    'Postmaster': {
        'google_font': 'Alegreya SC',
        'slug': 'alegreyasc',
        'weights': ['400', '700'],
        'local_ttf': 'postmaster.ttf',
        'local_woff2': 'postmaster.woff2',
    },
    'Racing Catalogue': {
        'google_font': 'Racing Sans One',
        'slug': 'racingsansone',
        'weights': ['400'],
        'local_ttf': 'racing-catalogue.ttf',
        'local_woff2': 'racing-catalogue.woff2',
    },
    'Resphekt': {
        'google_font': 'Marck Script',
        'slug': 'marckscript',
        'weights': ['400'],
        'local_ttf': 'resphekt.ttf',
        'local_woff2': 'resphekt.woff2',
    },
    'Gilroy': {
        'google_font': 'Inter',
        'slug': 'inter',
        'weights': ['400'],
        'local_ttf': 'gilroy-400.ttf',
        'local_woff2': 'gilroy-400.woff2',
        'note': 'Используется Inter как замена для Gilroy',
    },
}

# Специальные шрифты, которые не из Google Fonts (уже есть в папке)
CUSTOM_FONTS = [
    'card-regular.ttf',  # Card font - кастомный
]


def download_file(url: str, destination: Path, description: str = "файл") -> bool:
    """Скачать файл по URL в указанное место."""
    try:
        print(f"    → Скачиваем {description}...")
        req = urllib.request.Request(url)
        req.add_header('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36')
        
        with urllib.request.urlopen(req, timeout=30, context=_ssl_context) as response:
            data = response.read()
            if len(data) < 1000:  # Слишком маленький файл - вероятно ошибка
                error_text = data.decode('utf-8', errors='ignore')[:200]
                print(f"    ✗ Получен слишком маленький файл (возможно ошибка): {error_text[:100]}...")
                return False
            
            destination.parent.mkdir(parents=True, exist_ok=True)
            destination.write_bytes(data)
            size_kb = len(data) / 1024
            print(f"    ✓ Скачан {description}: {size_kb:.1f} KB")
            return True
    except urllib.error.HTTPError as e:
        print(f"    ✗ HTTP ошибка {e.code}: {e.reason}")
        return False
    except Exception as e:
        print(f"    ✗ Ошибка скачивания: {e}")
        return False


def get_google_fonts_download_url(font_slug: str, weight: str = '400') -> dict[str, str]:
    """
    Получить URL для скачивания шрифта из Google Fonts.
    Использует известные паттерны URL Google Fonts.
    
    Возвращает словарь с URL для разных форматов.
    """
    # Базовый паттерн URL для Google Fonts
    # Пример: https://fonts.gstatic.com/s/alexbrush/v23/...
    base_url = f"https://fonts.gstatic.com/s/{font_slug}"
    
    # Для получения точных URL нужно парсить CSS или использовать API
    # Но мы можем попробовать прямые ссылки через известные паттерны
    
    # Альтернативный способ: использовать CSS API для получения реальных URL
    css_url = f"https://fonts.googleapis.com/css2?family={font_slug.replace('_', '+')}:wght@{weight}"
    
    return {
        'css': css_url,
        'weight': weight,
    }


def parse_google_fonts_css(css_content: str, font_slug: str, weight: str) -> list[dict]:
    """
    Парсить CSS от Google Fonts и извлечь URL файлов шрифтов.
    Возвращает список словарей с информацией о файлах.
    """
    files = []
    
    # Паттерн для поиска всех URL в src атрибутах (может быть несколько через запятую)
    # Формат: src: url(...) format('woff2'), url(...) format('woff');
    src_pattern = r'src:\s*([^;]+)'
    
    # Найти все @font-face блоки
    font_face_pattern = r'@font-face\s*\{([^}]+)\}'
    font_faces = re.findall(font_face_pattern, css_content, re.DOTALL)
    
    for font_face in font_faces:
        # Найти font-weight
        weight_match = re.search(r'font-weight:\s*(\d+)', font_face)
        if not weight_match or weight_match.group(1) != weight:
            continue
        
        # Найти src атрибут
        src_match = re.search(src_pattern, font_face)
        if not src_match:
            continue
        
        src_content = src_match.group(1)
        
        # Найти все URL в src (могут быть через запятую)
        # Паттерн: url(URL) format('формат')
        url_pattern = r"url\((['\"]?)([^'\")]+)\1\)(?:\s+format\(['\"]([^'\"]+)['\"]\))?"
        url_matches = re.findall(url_pattern, src_content)
        
        for url_match in url_matches:
            url = url_match[1].strip('\'"')
            format_hint = url_match[2] if url_match[2] else ''
            
            # Определить формат
            if '.woff2' in url or format_hint == 'woff2':
                format_type = 'woff2'
            elif '.woff' in url or format_hint == 'woff':
                format_type = 'woff'
            elif '.ttf' in url or 'truetype' in format_hint:
                format_type = 'ttf'
            else:
                # Пробуем определить по расширению
                if url.endswith('.woff2'):
                    format_type = 'woff2'
                elif url.endswith('.woff'):
                    format_type = 'woff'
                elif url.endswith('.ttf'):
                    format_type = 'ttf'
                else:
                    continue
            
            files.append({
                'url': url,
                'format': format_type,
                'weight': weight,
            })
    
    return files


def download_font_from_google(font_name: str, config: dict, fonts_dir: Path, download_ttf: bool = True) -> bool:
    """Скачать шрифт из Google Fonts."""
    google_font = config['google_font']
    slug = config['slug']
    weights = config['weights']
    local_ttf = config.get('local_ttf', '')
    local_woff2 = config.get('local_woff2', '')
    
    print(f"\n📦 {font_name}")
    if 'note' in config:
        print(f"   ({config['note']})")
    print(f"   Google Font: {google_font}")
    
    # Проверить существующие файлы
    ttf_exists = (fonts_dir / local_ttf).exists() if local_ttf else False
    woff2_exists = (fonts_dir / local_woff2).exists() if local_woff2 else False
    
    if ttf_exists and woff2_exists:
        print(f"   ✓ Все файлы уже существуют")
        return True
    
    # Получить CSS с URL файлов
    weight = weights[0]  # Используем первый вес
    css_url = f"https://fonts.googleapis.com/css2?family={google_font.replace(' ', '+')}:wght@{weight}"
    
    try:
        print(f"   → Получаем информацию о шрифте...")
        req = urllib.request.Request(css_url)
        req.add_header('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36')
        
        with urllib.request.urlopen(req, timeout=30, context=_ssl_context) as response:
            css_content = response.read().decode('utf-8')
            
            # Парсим CSS
            font_files = parse_google_fonts_css(css_content, slug, weight)
            
            if not font_files:
                print(f"   ⚠ Не удалось найти URL файлов в CSS")
                print(f"   → Попробуйте скачать вручную: https://fonts.google.com/specimen/{google_font.replace(' ', '+')}")
                # Отладка: сохранить CSS для анализа
                debug_css_file = fonts_dir / f"debug_{slug}_css.txt"
                debug_css_file.write_text(css_content[:5000], encoding='utf-8')
                print(f"   (Отладочный CSS сохранен в {debug_css_file.name})")
                return False
            
            print(f"   ✓ Найдено {len(font_files)} файлов в CSS")
            
            # Отладочный вывод
            for f in font_files:
                print(f"      - {f['format']}: {f['url'][:80]}...")
            
            success = False
            
            # Скачать TTF (приоритет, так как нужен для Node.js)
            ttf_files = [f for f in font_files if f['format'] == 'ttf']
            if ttf_files and not ttf_exists and local_ttf:
                ttf_url = ttf_files[0]['url']
                ttf_path = fonts_dir / local_ttf
                if download_file(ttf_url, ttf_path, f"TTF"):
                    success = True
            
            # Скачать WOFF2 (опционально)
            woff2_files = [f for f in font_files if f['format'] == 'woff2']
            if woff2_files and not woff2_exists and local_woff2:
                woff2_url = woff2_files[0]['url']
                woff2_path = fonts_dir / local_woff2
                if download_file(woff2_url, woff2_path, f"WOFF2"):
                    success = True
            elif not woff2_files and local_woff2:
                print(f"   ⚠ WOFF2 файл не найден в CSS (можно скачать отдельно)")
            
            if not success:
                print(f"   ⚠ Файлы уже существуют или не удалось скачать")
            
            return success
            
    except Exception as e:
        print(f"   ✗ Ошибка: {e}")
        print(f"   → Попробуйте скачать вручную: https://fonts.google.com/specimen/{google_font.replace(' ', '+')}")
        return False


def main():
    """Основная функция."""
    # Определить пути
    script_dir = Path(__file__).parent.parent
    fonts_dir = script_dir / 'site_metalcard' / 'legacy_svg' / 'fonts'
    
    print("=" * 70)
    print("Скачивание шрифтов из Google Fonts")
    print("=" * 70)
    print(f"Папка назначения: {fonts_dir}")
    print()
    
    # Проверить существование папки
    fonts_dir.mkdir(parents=True, exist_ok=True)
    
    # Проверить существующие файлы
    existing_files = set(f.name for f in fonts_dir.glob('*'))
    print(f"Найдено файлов в папке: {len(existing_files)}")
    
    # Скачать каждый шрифт
    success_count = 0
    skip_count = 0
    total_count = len(FONT_MAPPING)
    
    print(f"\nПроверяем и скачиваем {total_count} шрифтов...")
    
    for font_name, config in FONT_MAPPING.items():
        if download_font_from_google(font_name, config, fonts_dir):
            success_count += 1
        else:
            skip_count += 1
    
    print()
    print("=" * 70)
    print(f"Готово!")
    print(f"  Успешно: {success_count}")
    print(f"  Пропущено/ошибок: {skip_count}")
    print("=" * 70)
    
    if skip_count > 0:
        print("\n💡 Для шрифтов, которые не удалось скачать автоматически:")
        print("   1. Перейдите на https://fonts.google.com/")
        print("   2. Найдите нужный шрифт")
        print("   3. Нажмите 'Download family'")
        print("   4. Извлеките TTF файлы и переименуйте их согласно маппингу")
        print("   5. Сохраните в папку fonts/")
    
    return 0 if success_count > 0 else 1


if __name__ == "__main__":
    sys.exit(main())
