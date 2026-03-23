# Project Safeguard Protocol

To ensure the stability and consistency of the application, all future developments must adhere to the following protocols:

## 1. Single Source of Truth
All user profile data must be fetched directly from the database (`profiles` table in Supabase). Do not rely on cached data from CSV imports or local state after the initial load.

## 2. Gender-Aware UI (Gender UI Rule)
All role-based text displayed in the UI (specifically in the Admin Management table) must be processed through the `getRoleTextByGender` function located in `src/utils/gender.ts`. This ensures consistent gendered language across the application.

## 3. Storage Priority
When displaying user images (avatars, profile pictures), the application must prioritize fetching the image URL from the Supabase Storage bucket using the `userId`. Only fallback to other sources if the storage fetch fails or is unavailable.

## 4. Gender Configuration
All gender-specific text mapping (roles, modal buttons) is centralized in `src/utils/gender.ts`. Any changes to gendered terminology must be made in this file, not hardcoded in components.
