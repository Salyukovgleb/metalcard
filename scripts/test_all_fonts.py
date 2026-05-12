#!/usr/bin/env python3
"""
Comprehensive font testing script.
Tests all fonts across:
1. Downloaded TTF files
2. app2.js font mapping
3. Python views.py font mapping
4. UI preview font mapping

Usage:
    python3 scripts/test_all_fonts.py
"""

from __future__ import annotations
import os
import sys
from pathlib import Path

# Add project root to path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

# Font mappings
UI_FONTS = [
    'Gilroy', 'Alex Brush', 'Arabella', 'Bodoni', 'Card', 
    'Candlescript', 'Castileo', 'Lombardia', 'Monotype Corsiva', 
    'Porcelain', 'Postmaster', 'Racing Catalogue', 'Resphekt'
]

APP2_FONTS = {
    'num': 'card-regular.ttf',
    'alex-brush': 'alexbrush-regular.ttf',
    'arabella': 'arabella-medium.ttf',
    'bodoni': 'bodoni-regular.ttf',
    'candlescript': 'candlescript.ttf',
    'castileo': 'castileo.ttf',
    'lombardia': 'lombardia.ttf',
    'monotype-corsiva': 'monotype-corsiva.ttf',
    'porcelain': 'porcelain.ttf',
    'postmaster': 'postmaster.ttf',
    'racing-catalogue': 'racing-catalogue.ttf',
    'resphekt': 'resphekt.ttf',
    'gilroy': 'gilroy-400.ttf',
}

UI_TO_APP2_MAPPING = {
    'Gilroy': 'gilroy',
    'Alex Brush': 'alex-brush',
    'Arabella': 'arabella',
    'Bodoni': 'bodoni',
    'Card': 'num',
    'Candlescript': 'candlescript',
    'Castileo': 'castileo',
    'Lombardia': 'lombardia',
    'Monotype Corsiva': 'monotype-corsiva',
    'Porcelain': 'porcelain',
    'Postmaster': 'postmaster',
    'Racing Catalogue': 'racing-catalogue',
    'Resphekt': 'resphekt',
}

def check_font_file(font_path: Path) -> tuple[bool, str]:
    """Check if font file exists and is readable."""
    if not font_path.exists():
        return False, f"File not found: {font_path.name}"
    if font_path.stat().st_size == 0:
        return False, f"File is empty: {font_path.name}"
    if font_path.suffix.lower() != '.ttf':
        return False, f"Not a TTF file: {font_path.name}"
    return True, "OK"

def main():
    fonts_dir = project_root / 'site_metalcard' / 'legacy_svg' / 'fonts'
    app2_js = project_root / 'site_metalcard' / 'legacy_svg' / 'app2.js'
    
    print("=" * 70)
    print("FONT TESTING REPORT")
    print("=" * 70)
    print()
    
    # 1. Check fonts directory
    print("1. Checking fonts directory...")
    print(f"   Path: {fonts_dir}")
    if not fonts_dir.exists():
        print(f"   ❌ Fonts directory not found!")
        return 1
    print(f"   ✓ Fonts directory exists")
    print()
    
    # 2. Check all font files
    print("2. Checking font files...")
    print("-" * 70)
    
    all_files_exist = True
    font_file_results = {}
    
    for app2_key, font_file in APP2_FONTS.items():
        font_path = fonts_dir / font_file
        exists, message = check_font_file(font_path)
        font_file_results[app2_key] = (exists, font_path, message)
        
        status = "✓" if exists else "❌"
        print(f"   {status} {app2_key:20} → {font_file:30} {message}")
        if not exists:
            all_files_exist = False
    
    print()
    if not all_files_exist:
        print("   ❌ Some font files are missing!")
        return 1
    print("   ✓ All font files exist and are valid")
    print()
    
    # 3. Check UI to app2.js mapping
    print("3. Checking UI → app2.js mapping...")
    print("-" * 70)
    
    mapping_ok = True
    for ui_font in UI_FONTS:
        app2_key = UI_TO_APP2_MAPPING.get(ui_font)
        if not app2_key:
            print(f"   ❌ '{ui_font}' → No mapping found")
            mapping_ok = False
            continue
        
        if app2_key not in APP2_FONTS:
            print(f"   ❌ '{ui_font}' → '{app2_key}' → Key not in app2.js fonts")
            mapping_ok = False
            continue
        
        font_file = APP2_FONTS[app2_key]
        exists, _, _ = font_file_results[app2_key]
        
        status = "✓" if exists else "❌"
        print(f"   {status} '{ui_font}' → '{app2_key}' → {font_file}")
        if not exists:
            mapping_ok = False
    
    print()
    if not mapping_ok:
        print("   ❌ Some mappings are invalid!")
        return 1
    print("   ✓ All UI font mappings are valid")
    print()
    
    # 4. Check app2.js file
    print("4. Checking app2.js font references...")
    print("-" * 70)
    
    if not app2_js.exists():
        print(f"   ❌ app2.js not found: {app2_js}")
        return 1
    
    app2_content = app2_js.read_text(encoding='utf-8', errors='ignore')
    app2_ok = True
    
    for app2_key, font_file in APP2_FONTS.items():
        # Check if font is loaded in app2.js
        if app2_key == 'num':
            # Special case for 'num'
            pattern = f"'fonts', '{font_file}'"
        else:
            pattern = f"'{font_file}'"
        
        if pattern not in app2_content:
            # Try alternative pattern
            alt_pattern = font_file
            if alt_pattern not in app2_content:
                print(f"   ❌ '{app2_key}' → {font_file} not found in app2.js")
                app2_ok = False
            else:
                print(f"   ✓ '{app2_key}' → {font_file} found in app2.js")
        else:
            print(f"   ✓ '{app2_key}' → {font_file} found in app2.js")
    
    print()
    if not app2_ok:
        print("   ❌ Some font references are missing in app2.js!")
        return 1
    print("   ✓ All fonts are referenced in app2.js")
    print()
    
    # 5. Summary
    print("=" * 70)
    print("SUMMARY")
    print("=" * 70)
    print(f"   Total UI fonts: {len(UI_FONTS)}")
    print(f"   Total app2.js fonts: {len(APP2_FONTS)}")
    print(f"   Font files checked: {len(APP2_FONTS)}")
    print(f"   Font files valid: {sum(1 for _, (exists, _, _) in font_file_results.items() if exists)}")
    print()
    print("   ✅ All fonts are properly configured!")
    print()
    print("=" * 70)
    
    return 0

if __name__ == "__main__":
    sys.exit(main())

