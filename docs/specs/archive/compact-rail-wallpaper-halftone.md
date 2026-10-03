# Done — Compact rail hover and wallpaper Halftone

- Workflow status: Done. Historical snapshot status and verification notes below are retained.


- Goal: Make the collapsed project rail feel consistent with MonoCode's sliding menu highlight, and let Windows users apply the existing Halftone effect to their app wallpaper.
- User story: As a MonoCode user, I want the compact rail highlight to follow my pointer and focus, and I want to switch my wallpaper between its original image and Halftone without changing my chat background.
- Acceptance criteria:
  - In the collapsed project rail, moving between enabled shortcut buttons moves one shared background highlight. The project picker, workspace tabs, search, inbox, notes, automations, expand, and settings participate when present.
  - Moving across the visual gaps between consecutive shortcuts keeps the highlight alive. Continuity does not span the flexible empty space between the main shortcuts and Settings.
  - The same marker follows keyboard focus. Disabled actions do not light up. Pointer exit hides the marker. The selected workspace or open destination keeps its own visible selected background while another action is hovered.
  - Expanded rail and sidebar hover behavior stays as it is. Tooltips, badges, context menus, clicks, and keyboard actions still work.
  - Settings → Appearance → Wallpaper & menus offers a Windows-only “Halftone wallpaper” switch beside the wallpaper controls. It is visible but disabled until a wallpaper is selected. It starts off for existing users and persists across app restarts.
  - Turning the switch on applies the existing Halftone rendering to the selected wallpaper; turning it off restores the original image. This does not change the chat background effect or either opacity setting.
  - Changing wallpaper, changing theme, and restarting the app render the current choice. Removing the wallpaper clears the rendered image but keeps the switch preference for the next image.
  - If re-rendering the currently committed wallpaper fails after a theme or effect toggle, the original wallpaper remains visible and Settings reports that Halftone could not be applied. If a newly selected image's required Halftone render fails, keep the prior committed wallpaper and report the failed choice.
  - Rapid switch, image, or theme changes cannot let an older render overwrite the latest choice; generated object URLs are released when replaced or cleared.
  - A wallpaper choice is committed only after its managed copy, image read, and required render succeed. At commit, the displayed image, saved path, Settings state, active managed file, and live object URL all describe that same choice.
  - Opening or canceling a picker does not invalidate a pending successful choice. A failed newer choice leaves the previous successful choice intact; a successful newer choice or Remove prevents older work from restoring wallpaper or storage.
- States: compact rail idle, hovered, focused, selected, and disabled; wallpaper absent, picker canceled, managed copy/read/render pending or failed, original, Halftone processing, Halftone ready, and effect error with original-image fallback.
- Out of scope: adding the other chat effects to wallpaper, changing Windows Acrylic, changing wallpaper storage, modifying chat background effect settings, or redesigning either rail.
- Open questions: None blocking the spec. Manual visual checks remain necessary in the Tauri dev app.

## Manual test pointers

1. Collapse the project sidebar, then move the pointer slowly through all visible icons, including the project picker and Settings. Cross the gaps between neighboring icons and confirm the highlight stays visible and slides between them; confirm it disappears in the flexible space before Settings and when the pointer leaves the rail.
2. Select a workspace tab, then hover a different icon. Confirm the selected tab remains visibly selected; check badges and hover text remain legible.
3. Tab through the compact rail. Confirm focus is visible, the marker follows focus, disabled actions do not respond, and Enter/Space plus the Inbox context-menu shortcut still work.
4. Expand the rail and compare its hover behavior; collapse it again and check the popup project list and Inbox menu.
5. On Windows, choose a wallpaper. Turn Halftone on and off; compare with the original at several wallpaper opacities and in both light and dark themes.
6. Change the wallpaper while Halftone is on, then restart MonoCode. Confirm the chosen wallpaper and switch setting survive. Remove the wallpaper, choose another, and confirm the saved switch choice applies.
7. Switch Halftone rapidly and change theme while processing. The last choice must win. If a theme/toggle re-render fails, keep the committed wallpaper's original image visible with a clear Settings message. If a newly selected image fails persistence, read, or its required render, keep the prior successful wallpaper and report the failed selection.
