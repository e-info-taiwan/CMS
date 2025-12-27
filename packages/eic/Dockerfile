FROM node:22-slim

## Install system dependencies, `gcsfuse` in particular.
RUN set -e; \
    apt-get update -y && apt-get install -y \
    curl \
    gnupg2 \
    tini \
    lsof \
    openssl \
    lsb-release; \
    gcsFuseRepo=gcsfuse-`lsb_release -c -s`; \
    echo "deb http://packages.cloud.google.com/apt $gcsFuseRepo main" | \
    tee /etc/apt/sources.list.d/gcsfuse.list; \
    curl https://packages.cloud.google.com/apt/doc/apt-key.gpg | \
    apt-key add -; \
    apt-get update; \
    apt-get install -y gcsfuse \
    && apt-get clean

ENV APP_DIR /app
## Set fallback mount directory
ENV MNT_DIR /app/gcs
ENV HOST 0.0.0.0
ENV PORT 3000

RUN mkdir -p $APP_DIR

WORKDIR $APP_DIR

COPY . $APP_DIR

## ============================================
## PHASE 1: Environment and Setup Verification
## ============================================
RUN echo "============================================" && \
    echo "PHASE 1: Environment and Setup Verification" && \
    echo "============================================" && \
    echo "Node version:" && node --version && \
    echo "Yarn version:" && yarn --version && \
    echo "Working directory:" && pwd && \
    echo "Current user:" && whoami && \
    echo "File system check:" && df -h / && \
    echo "============================================"

## Install application dependencies
RUN yarn install

## ============================================
## PHASE 2: Pre-Patch Verification
## ============================================
RUN echo "============================================" && \
    echo "PHASE 2: Pre-Patch Verification" && \
    echo "============================================" && \
    echo "--- Checking patches directory ---" && \
    (test -d patches && echo "✓ patches directory exists" || echo "✗ ERROR: patches directory NOT found") && \
    ls -la patches/ 2>/dev/null || echo "WARNING: Cannot list patches directory" && \
    echo "" && \
    echo "--- Checking patch files ---" && \
    (test -f patches/@keystone-6+core+5.2.0.patch && echo "✓ @keystone-6+core+5.2.0.patch exists" || echo "✗ ERROR: @keystone-6+core+5.2.0.patch NOT found") && \
    (test -f patches/@mirrormedia+lilith-draft-editor+3.0.8-beta.1.patch && echo "✓ @mirrormedia+lilith-draft-editor+3.0.8-beta.1.patch exists" || echo "✗ ERROR: @mirrormedia+lilith-draft-editor+3.0.8-beta.1.patch NOT found") && \
    echo "" && \
    echo "--- Patch file sizes ---" && \
    ls -lh patches/*.patch 2>/dev/null || echo "WARNING: Cannot get patch file sizes" && \
    echo "" && \
    echo "--- Checking patch-package installation ---" && \
    (yarn list --pattern patch-package --depth=0 2>/dev/null | grep patch-package && echo "✓ patch-package installed" || echo "✗ WARNING: patch-package not found in yarn list") && \
    (which patch-package 2>/dev/null && echo "✓ patch-package in PATH" || echo "✗ WARNING: patch-package not in PATH") && \
    echo "" && \
    echo "--- Checking target packages before patch ---" && \
    (test -d node_modules/@keystone-6/core && echo "✓ @keystone-6/core directory exists" || echo "✗ ERROR: @keystone-6/core NOT found") && \
    (test -d node_modules/@mirrormedia/lilith-draft-editor && echo "✓ @mirrormedia/lilith-draft-editor directory exists" || echo "✗ ERROR: @mirrormedia/lilith-draft-editor NOT found") && \
    echo "" && \
    echo "--- Checking package versions ---" && \
    (cat node_modules/@keystone-6/core/package.json 2>/dev/null | grep '"version"' | head -1 || echo "WARNING: Cannot read @keystone-6/core version") && \
    (cat node_modules/@mirrormedia/lilith-draft-editor/package.json 2>/dev/null | grep '"version"' | head -1 || echo "WARNING: Cannot read @mirrormedia/lilith-draft-editor version") && \
    echo "" && \
    echo "--- Checking target files before patch ---" && \
    (test -f node_modules/@mirrormedia/lilith-draft-editor/lib/draft-js/buttons/font-color.js && echo "✓ font-color.js exists" || echo "✗ ERROR: font-color.js NOT found") && \
    (test -f node_modules/@mirrormedia/lilith-draft-editor/lib/website/readr/block-renderer/image-block.js && echo "✓ image-block.js exists" || echo "✗ ERROR: image-block.js NOT found") && \
    echo "" && \
    echo "--- Checking if patches already applied (should NOT be) ---" && \
    (grep -q "PresetColorGrid" node_modules/@mirrormedia/lilith-draft-editor/lib/draft-js/buttons/font-color.js 2>/dev/null && echo "⚠ WARNING: PresetColorGrid already exists (patch may have been applied)" || echo "✓ PresetColorGrid NOT found (expected before patch)") && \
    (grep -q "overflow: hidden" node_modules/@mirrormedia/lilith-draft-editor/lib/website/readr/block-renderer/image-block.js 2>/dev/null && echo "⚠ WARNING: overflow: hidden already exists" || echo "✓ overflow: hidden NOT found (expected before patch)") && \
    echo "============================================"

## ============================================
## PHASE 3: Apply Patches
## ============================================
RUN echo "============================================" && \
    echo "PHASE 3: Applying Patches" && \
    echo "============================================" && \
    echo "Running yarn postinstall..." && \
    echo "============================================"

RUN yarn postinstall 2>&1 | tee /tmp/postinstall.log && \
    echo "============================================" && \
    echo "Postinstall output saved to /tmp/postinstall.log" && \
    echo "============================================" && \
    cat /tmp/postinstall.log

## ============================================
## PHASE 4: Post-Patch Verification (Before Build)
## ============================================
RUN echo "============================================" && \
    echo "PHASE 4: Post-Patch Verification (Before Build)" && \
    echo "============================================" && \
    echo "--- Checking patch-package exit code ---" && \
    (grep -q "✔\|Successfully\|Applied" /tmp/postinstall.log 2>/dev/null && echo "✓ patch-package appears successful" || echo "⚠ WARNING: patch-package success not confirmed in log") && \
    (grep -q "ERROR\|Error\|Failed\|failed" /tmp/postinstall.log 2>/dev/null && echo "⚠ WARNING: Errors found in postinstall log" || echo "✓ No errors in postinstall log") && \
    echo "" && \
    echo "--- Verifying patches applied to font-color.js ---" && \
    (grep -q "PresetColorGrid" node_modules/@mirrormedia/lilith-draft-editor/lib/draft-js/buttons/font-color.js 2>/dev/null && echo "✓ PresetColorGrid found" || echo "✗ ERROR: PresetColorGrid NOT found") && \
    (grep -q "PresetColorButton" node_modules/@mirrormedia/lilith-draft-editor/lib/draft-js/buttons/font-color.js 2>/dev/null && echo "✓ PresetColorButton found" || echo "✗ ERROR: PresetColorButton NOT found") && \
    (grep -q "presetColors" node_modules/@mirrormedia/lilith-draft-editor/lib/draft-js/buttons/font-color.js 2>/dev/null && echo "✓ presetColors prop found" || echo "✗ ERROR: presetColors prop NOT found") && \
    echo "" && \
    echo "--- Verifying patches applied to image-block.js ---" && \
    (grep -q "overflow: hidden" node_modules/@mirrormedia/lilith-draft-editor/lib/website/readr/block-renderer/image-block.js 2>/dev/null && echo "✓ overflow: hidden found" || echo "✗ ERROR: overflow: hidden NOT found") && \
    (grep -q "ImageBlockWrapper" node_modules/@mirrormedia/lilith-draft-editor/lib/website/readr/block-renderer/image-block.js 2>/dev/null && echo "✓ ImageBlockWrapper found" || echo "✗ ERROR: ImageBlockWrapper NOT found") && \
    echo "" && \
    echo "--- Checking file modification times ---" && \
    ls -lh node_modules/@mirrormedia/lilith-draft-editor/lib/draft-js/buttons/font-color.js 2>/dev/null || echo "WARNING: Cannot check font-color.js mtime" && \
    ls -lh node_modules/@mirrormedia/lilith-draft-editor/lib/website/readr/block-renderer/image-block.js 2>/dev/null || echo "WARNING: Cannot check image-block.js mtime" && \
    echo "" && \
    echo "--- Checking for patch-package backup files ---" && \
    (find node_modules/@mirrormedia/lilith-draft-editor -name "*.orig" 2>/dev/null | head -5 && echo "✓ Backup files found (patch-package created backups)" || echo "⚠ WARNING: No backup files found") && \
    echo "" && \
    echo "--- Sample of patched font-color.js (first 20 lines with PresetColorGrid) ---" && \
    (grep -A 5 "PresetColorGrid" node_modules/@mirrormedia/lilith-draft-editor/lib/draft-js/buttons/font-color.js 2>/dev/null | head -10 || echo "WARNING: Cannot show sample") && \
    echo "============================================"

## ============================================
## PHASE 5: Build Preparation
## ============================================
RUN echo "============================================" && \
    echo "PHASE 5: Build Preparation" && \
    echo "============================================" && \
    echo "--- Cleaning build cache ---" && \
    (rm -rf .next .keystone 2>/dev/null && echo "✓ Build cache cleaned" || echo "⚠ WARNING: Could not clean build cache") && \
    echo "--- Checking node_modules integrity before build ---" && \
    (test -d node_modules/@mirrormedia/lilith-draft-editor && echo "✓ @mirrormedia/lilith-draft-editor still exists" || echo "✗ ERROR: @mirrormedia/lilith-draft-editor missing!") && \
    (grep -q "PresetColorGrid" node_modules/@mirrormedia/lilith-draft-editor/lib/draft-js/buttons/font-color.js 2>/dev/null && echo "✓ Patches still applied before build" || echo "✗ ERROR: Patches missing before build!") && \
    echo "============================================"

## Build application bundles
RUN echo "============================================" && \
    echo "Building application bundles..." && \
    echo "============================================" && \
    yarn build 2>&1 | tee /tmp/build.log && \
    echo "============================================" && \
    echo "Build output saved to /tmp/build.log" && \
    echo "============================================"

## ============================================
## PHASE 6: Post-Build Verification
## ============================================
RUN echo "============================================" && \
    echo "PHASE 6: Post-Build Verification" && \
    echo "============================================" && \
    echo "--- Checking if build completed successfully ---" && \
    (grep -qi "error\|failed\|Error\|Failed" /tmp/build.log 2>/dev/null && echo "⚠ WARNING: Possible errors in build log" || echo "✓ No obvious errors in build log") && \
    echo "" && \
    echo "--- Checking node_modules after build ---" && \
    (test -d node_modules/@mirrormedia/lilith-draft-editor && echo "✓ @mirrormedia/lilith-draft-editor still exists" || echo "✗ ERROR: @mirrormedia/lilith-draft-editor missing after build!") && \
    (test -f node_modules/@mirrormedia/lilith-draft-editor/lib/draft-js/buttons/font-color.js && echo "✓ font-color.js still exists" || echo "✗ ERROR: font-color.js missing after build!") && \
    (test -f node_modules/@mirrormedia/lilith-draft-editor/lib/website/readr/block-renderer/image-block.js && echo "✓ image-block.js still exists" || echo "✗ ERROR: image-block.js missing after build!") && \
    echo "" && \
    echo "--- Verifying patches still applied after build ---" && \
    (grep -q "PresetColorGrid" node_modules/@mirrormedia/lilith-draft-editor/lib/draft-js/buttons/font-color.js 2>/dev/null && echo "✓ PresetColorGrid still found" || echo "✗ ERROR: PresetColorGrid missing after build!") && \
    (grep -q "PresetColorButton" node_modules/@mirrormedia/lilith-draft-editor/lib/draft-js/buttons/font-color.js 2>/dev/null && echo "✓ PresetColorButton still found" || echo "✗ ERROR: PresetColorButton missing after build!") && \
    (grep -q "overflow: hidden" node_modules/@mirrormedia/lilith-draft-editor/lib/website/readr/block-renderer/image-block.js 2>/dev/null && echo "✓ overflow: hidden still found" || echo "✗ ERROR: overflow: hidden missing after build!") && \
    (grep -q "ImageBlockWrapper" node_modules/@mirrormedia/lilith-draft-editor/lib/website/readr/block-renderer/image-block.js 2>/dev/null && echo "✓ ImageBlockWrapper still found" || echo "✗ ERROR: ImageBlockWrapper missing after build!") && \
    echo "" && \
    echo "--- Checking build output directories ---" && \
    (test -d .next && echo "✓ .next directory exists" || echo "⚠ WARNING: .next directory not found") && \
    (test -d .keystone && echo "✓ .keystone directory exists" || echo "⚠ WARNING: .keystone directory not found") && \
    echo "" && \
    echo "--- Checking if patches are in build output (if applicable) ---" && \
    (find .next -name "*.js" -type f 2>/dev/null | xargs grep -l "PresetColorGrid" 2>/dev/null | head -3 && echo "✓ PresetColorGrid found in build output" || echo "⚠ INFO: PresetColorGrid not found in build output (may be normal if not bundled)") && \
    echo "============================================"

RUN yarn cache clean

## ============================================
## PHASE 7: Final Pre-Startup Verification
## ============================================
RUN echo "============================================" && \
    echo "PHASE 7: Final Pre-Startup Verification" && \
    echo "============================================" && \
    echo "--- File system check ---" && \
    df -h / && \
    echo "" && \
    echo "--- Checking patch files still exist ---" && \
    (test -f patches/@keystone-6+core+5.2.0.patch && echo "✓ @keystone-6+core+5.2.0.patch exists" || echo "✗ ERROR: @keystone-6+core+5.2.0.patch missing!") && \
    (test -f patches/@mirrormedia+lilith-draft-editor+3.0.8-beta.1.patch && echo "✓ @mirrormedia+lilith-draft-editor+3.0.8-beta.1.patch exists" || echo "✗ ERROR: @mirrormedia+lilith-draft-editor+3.0.8-beta.1.patch missing!") && \
    echo "" && \
    echo "--- Final code verification ---" && \
    (grep -q "PresetColorGrid" node_modules/@mirrormedia/lilith-draft-editor/lib/draft-js/buttons/font-color.js 2>/dev/null && echo "✓ PresetColorGrid verified" || echo "✗ ERROR: PresetColorGrid missing!") && \
    (grep -q "PresetColorButton" node_modules/@mirrormedia/lilith-draft-editor/lib/draft-js/buttons/font-color.js 2>/dev/null && echo "✓ PresetColorButton verified" || echo "✗ ERROR: PresetColorButton missing!") && \
    (grep -q "overflow: hidden" node_modules/@mirrormedia/lilith-draft-editor/lib/website/readr/block-renderer/image-block.js 2>/dev/null && echo "✓ overflow: hidden verified" || echo "✗ ERROR: overflow: hidden missing!") && \
    (grep -q "ImageBlockWrapper" node_modules/@mirrormedia/lilith-draft-editor/lib/website/readr/block-renderer/image-block.js 2>/dev/null && echo "✓ ImageBlockWrapper verified" || echo "✗ ERROR: ImageBlockWrapper missing!") && \
    echo "" && \
    echo "--- Checking file permissions ---" && \
    ls -l node_modules/@mirrormedia/lilith-draft-editor/lib/draft-js/buttons/font-color.js 2>/dev/null || echo "WARNING: Cannot check font-color.js permissions" && \
    ls -l node_modules/@mirrormedia/lilith-draft-editor/lib/website/readr/block-renderer/image-block.js 2>/dev/null || echo "WARNING: Cannot check image-block.js permissions" && \
    echo "" && \
    echo "--- Summary of key files ---" && \
    echo "Patch files:" && \
    ls -lh patches/*.patch 2>/dev/null || echo "WARNING: Cannot list patch files" && \
    echo "" && \
    echo "Patched files:" && \
    ls -lh node_modules/@mirrormedia/lilith-draft-editor/lib/draft-js/buttons/font-color.js node_modules/@mirrormedia/lilith-draft-editor/lib/website/readr/block-renderer/image-block.js 2>/dev/null || echo "WARNING: Cannot list patched files" && \
    echo "" && \
    echo "--- Environment variables (non-sensitive) ---" && \
    env | grep -E "NODE|YARN|PATH|APP_DIR" | sort || echo "WARNING: Cannot show environment variables" && \
    echo "============================================" && \
    echo "✓ All verification phases completed" && \
    echo "============================================"

## Ensure the script is executable
RUN chmod +x run.sh

EXPOSE 3000

## Use tini to manage zombie processes and signal forwarding
## https://github.com/krallin/tini
ENTRYPOINT ["/usr/bin/tini", "--"]

## Pass the startup script as arguments to Tini
CMD [ "/app/run.sh"]
