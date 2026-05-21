# UI Redesign and Navigation Refactoring for Mobile-First Experience

This plan outlines the steps required to align the application layout and tools with a mobile-first philosophy, centering key landing elements, implementing a top navigation system to replace the sidebar, and simplifying all feature controls (excluding the Smart Editor) for a cleaner, high-impact user experience.

## Proposed Changes

### 1. Landing Page Redesign

#### [MODIFY] [HeroSection.tsx](file:///c:/Users/NEHITH/Documents/thumbai/thumbnail-genius/frontend/src/components/landing/HeroSection.tsx)
- Remove `ThreeDCards` component (the "spinning thing") from the landing page.
- Change layout from a two-column grid to a single-column layout centered on all screens.
- Center the intro headline, subheadline, trust indicators, badge, and CTA ("Get Started" / "Try for $2") buttons.
- Adjust layout padding and offsets.

---

### 2. Dashboard Default Routing & Navigation

#### [MODIFY] [App.tsx](file:///c:/Users/NEHITH/Documents/thumbai/thumbnail-genius/frontend/src/App.tsx)
- Change `/dashboard` index route to `SmartEditorPage` instead of `GeneratePage`.
- Set path for `GeneratePage` to `/dashboard/generate`.

#### [MODIFY] [DashboardTopBar.tsx](file:///c:/Users/NEHITH/Documents/thumbai/thumbnail-genius/frontend/src/components/DashboardTopBar.tsx)
- Update `routeTitles` mapping:
  - `"/dashboard"` -> `"Smart Edit"`
  - `"/dashboard/generate"` -> `"Generate"`
- Remove `SidebarTrigger`.
- Add Thumbly logo / branding (with pulsing Zap icon) to the left side of the top bar.
- Add Sun/Moon theme toggle switch button next to the profile menu.
- Integrate theme-toggle state logic using local storage.

#### [NEW] [DashboardSubNav.tsx](file:///c:/Users/NEHITH/Documents/thumbai/thumbnail-genius/frontend/src/components/DashboardSubNav.tsx)
- Create a horizontal, premium, scrollable sub-navigation bar directly under the top bar.
- Add all tools (Smart Edit, Generate, Shorts Cover, Recreate, Face Swap, Background Removal, Titles, Scorer, Trending Styles, Prompt Library, My Thumbnails, Brand Kit, A/B Tester, Referral, Settings) as tab buttons with their corresponding icons and labels.
- Style active tabs with a glowing gradient pill design and inactive tabs with clean hover states.
- Support smooth horizontal scrolling with hidden scrollbars for optimal mobile and desktop user experience.

#### [MODIFY] [DashboardLayout.tsx](file:///c:/Users/NEHITH/Documents/thumbai/thumbnail-genius/frontend/src/components/DashboardLayout.tsx)
- Remove `<DashboardSidebar />` and `<BottomNav />`.
- Remove `SidebarProvider` wrapper.
- Place `<DashboardSubNav />` below `<DashboardTopBar />`.
- Clean up container layouts and side paddings since the sidebar is removed.

---

### 3. Feature Controls Cleanup & Simplification

We will clean up the controls on other features to keep only high-impact fields, removing complex sliders, percentages, and lists of presets.

#### [MODIFY] [GeneratePage.tsx](file:///c:/Users/NEHITH/Documents/thumbai/thumbnail-genius/frontend/src/pages/GeneratePage.tsx)
- Keep only: Prompt (Textarea) and Text Overlay (Switch & Input).
- Remove: Niche templates, Style presets (image carousel), Format select, Quality choice (Fast/Pro), Model choice, Variations count, Batch Mode.
- Default model choice to `"auto"`, quality to `"pro"`, variation count to `1`, format to `"16:9"` in the backend payload.

#### [MODIFY] [ShortsPage.tsx](file:///c:/Users/NEHITH/Documents/thumbai/thumbnail-genius/frontend/src/pages/ShortsPage.tsx)
- Keep only: Prompt (Textarea), Text Overlay (Switch & Input), and Composition Guide (Switch).
- Remove: Shorts Style presets, Quality selection, Model choice, and Variations count.
- Default style to `"viral reaction"`, quality to `"pro"`, modelChoice to `"auto"`, variations count to `1` in payload.

#### [MODIFY] [RecreatePage.tsx](file:///c:/Users/NEHITH/Documents/thumbai/thumbnail-genius/frontend/src/pages/RecreatePage.tsx)
- Keep only: YouTube URL, What to change? (Textarea), Person reference image upload.
- Remove: Similarity slider, Language dropdown.
- Default similarity to `60` and language to `"original"` in the request payload.

#### [MODIFY] [FaceSwapPage.tsx](file:///c:/Users/NEHITH/Documents/thumbai/thumbnail-genius/frontend/src/pages/FaceSwapPage.tsx)
- Remove: Swap Strength selector (percentage buttons).
- Default swap strength to `90` in the face swap payload.

---

## Verification Plan

### Automated/Local Tests
- Run `npm run dev` to start the frontend server and verify no lint/typescript errors exist.

### Manual Verification
1. **Landing Page**: Check that the headline and CTA are fully centered and look clean, and that the 3D spinning card is completely gone.
2. **Dashboard Default Route**: Log in and verify that the page immediately opens the "Smart Editor" page.
3. **Top Navigation**: Scroll horizontally across tools on desktop and mobile. Click each tool and check that navigation works perfectly.
4. **Theme Toggle**: Click the theme toggle button in the top bar to verify switching between light and dark modes works.
5. **Simplified Features**:
   - Open Generate: Verify layout is extremely clean (only Prompt and Text Overlay are visible). Run a generation and verify it successfully creates a 16:9 thumbnail.
   - Open Shorts Cover: Verify it is clean. Run a generation and verify it successfully creates a 9:16 thumbnail.
   - Open Recreate: Paste a YouTube URL, write instructions, and verify it recreates successfully.
   - Open Face Swap: Perform a face swap and verify it proceeds with the default 90% strength setting.
