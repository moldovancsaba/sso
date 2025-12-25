#!/bin/bash

# Find all files that use getAdminUser
files=$(grep -l "getAdminUser" /Users/moldovancsaba/Projects/sso/pages/api/admin/**/*.js /Users/moldovancsaba/Projects/sso/pages/api/admin/*.js 2>/dev/null)

for file in $files; do
  echo "Processing: $file"
  
  # Replace import statement
  sed -i '' 's/import { getAdminUser }/import { requireUnifiedAdmin }/g' "$file"
  
  # Replace function call
  sed -i '' 's/const adminUser = await getAdminUser(req)/const adminUser = await requireUnifiedAdmin(req, res)/g' "$file"
  
  # Remove old auth check and return statement since requireUnifiedAdmin handles it
  # Pattern 1: if (!adminUser) { return res.status(401)... }
  sed -i '' '/if (!adminUser) {/{N;N;d;}' "$file"
  
  # Pattern 2: if (!adminUser) return
  sed -i '' '/if (!adminUser) return$/d' "$file"
done

echo "Conversion complete!"
