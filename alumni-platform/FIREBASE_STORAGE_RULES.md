# Firebase Storage Rules — IMPORTANT for File Upload

## Problem
PDF and image uploads show "Uploading... 0%" but never progress because Firebase Storage rules block authenticated users.

## Solution

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Click **Storage** in left sidebar
4. Click **Rules** tab
5. Replace the rules with:

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // Allow authenticated users to upload/read chat files
    match /chat-files/{chatRoomId}/{fileName} {
      allow read: if request.auth != null;
      allow write: if request.auth != null 
                   && request.resource.size <= 10 * 1024 * 1024  // Max 10MB
                   && (request.resource.contentType.matches('image/.*') 
                       || request.resource.contentType == 'application/pdf');
    }
    
    // Deny all other access
    match /{allPaths=**} {
      allow read, write: if false;
    }
  }
}
```

6. Click **Publish**

## What This Does
- ✅ Allows authenticated users to upload images & PDFs to `chat-files/` folder
- ✅ Enforces 10MB file size limit
- ✅ Only allows image/* and application/pdf types
- ✅ Allows authenticated users to read uploaded files
- ❌ Blocks all other access

## Test
After publishing rules:
1. Go to chat page
2. Click 📎 paperclip button
3. Select a PDF or image
4. Should now upload successfully with progress bar

---

**Note:** If upload still fails, open browser DevTools Console (F12) → Console tab to see detailed error messages.
