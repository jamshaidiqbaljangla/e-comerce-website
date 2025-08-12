// Fix admin-products.html categories issue
const fs = require('fs');

const filePath = '/Users/jamshaid/Desktop/Untitled Folder/website/admin-products.html';
let content = fs.readFileSync(filePath, 'utf8');

// Fix the categories.forEach issue at the second occurrence (around line 1774)
const oldPattern = /categories\.forEach\(category => \{/g;
const newPattern = `// Ensure categories is an array
                if (!Array.isArray(categories)) {
                    console.error('Categories is not an array:', categories);
                    categoryList.innerHTML = '<p>Error loading categories. Please refresh the page.</p>';
                    return;
                }

                categories.forEach(category => {`;

// Find all matches and replace only the second one
const matches = [...content.matchAll(oldPattern)];
if (matches.length >= 2) {
    const secondMatch = matches[1];
    const beforeMatch = content.substring(0, secondMatch.index);
    const afterMatch = content.substring(secondMatch.index + secondMatch[0].length);
    
    content = beforeMatch + newPattern + afterMatch;
    
    fs.writeFileSync(filePath, content);
    console.log('✅ Fixed categories.forEach issue');
} else {
    console.log('❌ Could not find second occurrence of categories.forEach');
}
