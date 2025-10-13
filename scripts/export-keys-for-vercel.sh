#!/bin/bash
# Export RSA keys for Vercel environment variables

echo "📋 RSA Keys for Vercel Environment Variables"
echo "=============================================="
echo ""
echo "🔑 JWT_PRIVATE_KEY:"
echo "-------------------"
# Read private key and escape it for environment variable (replace newlines with \n)
awk 'NF {sub(/\r/, ""); printf "%s\\n",$0;}' keys/private.pem
echo ""
echo ""
echo "🔑 JWT_PUBLIC_KEY:"
echo "------------------"
# Read public key and escape it for environment variable (replace newlines with \n)
awk 'NF {sub(/\r/, ""); printf "%s\\n",$0;}' keys/public.pem
echo ""
echo ""
echo "📝 Instructions:"
echo "================"
echo "1. Go to https://vercel.com/moldovancsaba/sso/settings/environment-variables"
echo "2. Add JWT_PRIVATE_KEY with the value above (including -----BEGIN/END lines)"
echo "3. Add JWT_PUBLIC_KEY with the value above (including -----BEGIN/END lines)"
echo "4. Make sure to select 'Production' environment"
echo "5. Save and redeploy the application"
echo ""
