#!/bin/bash

echo "🖨️  Converting HTML to PDF using Safari..."
echo ""
echo "📄 Opening documents in Safari..."
echo "   → Press Cmd+P in each window"
echo "   → Select 'Save as PDF'"
echo "   → Save to the same folder"
echo ""

# Open English documents
for file in /Users/luisvelasquez/pga-platform/ip-filings/*.html; do
    filename=$(basename "$file" .html)
    echo "Opening: $filename"
    open -a Safari "$file"
    sleep 2
done

# Open German documents
for file in /Users/luisvelasquez/pga-platform/ip-filings-de/*.html; do
    filename=$(basename "$file" .html)
    echo "Opening: $filename"
    open -a Safari "$file"
    sleep 2
done

echo ""
echo "✅ All documents opened in Safari"
echo ""
echo "📝 For each window:"
echo "   1. Press Cmd+P (or File → Print)"
echo "   2. Click 'PDF' button → 'Save as PDF'"
echo "   3. Keep the same filename (it will save as .pdf)"
echo ""
