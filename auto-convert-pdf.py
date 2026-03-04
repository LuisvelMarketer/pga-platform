#!/usr/bin/env python3
"""
Automatic HTML to PDF converter using WeasyPrint
"""
import os
from pathlib import Path
from weasyprint import HTML

def convert_html_to_pdf(html_file):
    """Convert HTML file to PDF"""
    pdf_file = html_file.replace('.html', '.pdf')
    print(f"  ✓ Converting {Path(html_file).name}...")
    HTML(html_file).write_pdf(pdf_file)
    return pdf_file

def main():
    print("🔄 Converting all HTML documents to PDF...\n")
    
    base_dir = Path("/Users/luisvelasquez/pga-platform")
    
    # Convert English documents
    print("📄 English documents:")
    en_dir = base_dir / "ip-filings"
    for html_file in en_dir.glob("*.html"):
        if html_file.name != "README.html":
            convert_html_to_pdf(str(html_file))
    
    print("\n📄 German documents:")
    # Convert German documents
    de_dir = base_dir / "ip-filings-de"
    for html_file in de_dir.glob("*.html"):
        if html_file.name != "README.html":
            convert_html_to_pdf(str(html_file))
    
    print("\n✅ All PDFs created successfully!\n")
    print("📁 Location:")
    print(f"   English: {en_dir}")
    print(f"   German:  {de_dir}")

if __name__ == "__main__":
    main()
