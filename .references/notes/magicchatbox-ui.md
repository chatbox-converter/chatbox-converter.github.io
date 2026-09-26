# MagicChatbox UI specification (extracted from WPF source)

Source root: `.references/magicchatbox/vrcosc-magicchatbox/` (all `file:line` citations below are relative to it).
Screenshots correlated: `.references/screenshots/magicchatbox/tab_{integrations_main,status,chatting,options,options_expanded}.png`.

Resource loading order matters: `App.xaml:14-15` merges `UI/Theme.xaml` (tokens + most control styles) and `UI/Resources/SharedConverters.xaml`, then defines its own styles (buttons, Switch, ScrollBar, effects). Pages reference both.

---

## 1. Design tokens

### 1.1 Fonts (`UI/Theme.xaml:26-27`)

| Key | Family | File | Weights | Used for |
|---|---|---|---|---|
| `FontPrimary` | **Albert Sans** (variable, wght 100..900) | `Fonts/Albert.ttf` | any | Default UI font (`MainWindow.xaml:21`, every page `FontFamily="{DynamicResource FontPrimary}"`), labels, help text, chips, inputs, counters, preview text |
| `FontSecondary` | **Comfortaa** (variable, wght 300..700; ExtraBold/Black clamp to 700) | `Fonts/Comfortaa.ttf` | 300-700 | Top-bar tabs, wordmark "MagicChatbox", integration tile titles + descriptions, checkbox labels, option group headers, status-row text, installed version number, AFK timer digits |

Comment at `UI/Theme.xaml:10-24` confirms both are OpenType variable fonts; `TileTitleStyle` deliberately uses SemiBold(600) not Bold because Comfortaa 700 "blooms" at 20px (`UI/Theme.xaml:760-772`).

### 1.2 Type scale (`UI/Theme.xaml:34-43`)

| Key | px | Typical use |
|---|---|---|
| `FontSizeDisplay` | 27 | (rare) |
| `FontSizeTitle` | 20 | Tile titles (`TileTitleStyle`), Pulsoid promo |
| `FontSizeHeading` | 18 | Top-bar tabs, option group headers, section (expand/collapse) headers, "DESKTOP" indicator |
| `FontSizeSubheading` | 16 | Option subsection headers (H2 inside cards), chat message text, status row text |
| `FontSizeBody` | 15 | Field labels, inputs, chat composer, wordmark |
| `FontSizeCompact` | 14 | Preview text, "Running", segmented choices, chat feedback strip |
| `FontSizeSecondary` | 13 | Tile descriptions, checkbox labels, side-panel buttons, AFK digits |
| `FontSizeCaption` | 12 | Help text, comboboxes, side-panel labels, chat row buttons |
| `FontSizeMicro` | 11 | Chips/badges, side-panel eyebrow labels, counter pill, hidden-tile chips, Reset button |
| `FontSizeFine` | 10 | "VRC OSC" eyebrow, HIDE pill, warning-strip glyphs |

### 1.3 Colours – Theme.xaml brushes (`UI/Theme.xaml:51-299`)

| Key | Hex | Notes / where used |
|---|---|---|
| `TextLabelBrush` | `#FFB3A3C4` | Field labels (`OptionFieldLabelStyle`), chat feedback, status bottom bar text; contrast note at 45-50 |
| `TextPrimaryBrush` / `TextBodyBrush` | `#FFB9B5C1` | Default text, ComboBox/TextBox foreground, listbox text |
| `TextMutedBrush` | `#FFA29BB5` | Help text (italic), Reset button, placeholders |
| `TextAccentBrush` | `#BDAEE2` | |
| `TextDarkBrush` | `#FF240E54` | Dark text on light fills |
| `SurfacePrimaryBrush` | `#FF2D1265` | **Title bar background** (`MainWindow.xaml:133`) |
| `SurfaceDarkBrush` | `#FF240E54` | Window background/border (`MainWindow.xaml:20,44`), ListBox bg, SegmentPreview bg |
| `SurfaceCardBrush` | `#FF3B3054` | **Main content background** (`MainWindow.xaml:50`; every page `Background`) |
| `SurfaceGradientStartColor/Brush` | `#FF3A3053` | Options section background gradient start (every `*Section.xaml` ~line 18-21, `StartPoint 1,1 → EndPoint 0,0`) |
| `SurfaceGradientEndColor/Brush` | `#FF40365B` | Options section gradient end |
| `InputBackgroundBrush` | `#FF7B7195` | |
| `ControlBorderBrush` | `#FF2D1265` | |
| `ButtonTextBrush` | `#9B90D1` | |
| `BorderMutedBrush` | `#FF7D7397` | Stroke only (never text) |
| `AccentTealBrush` | `#FF31B7B4` | "Learn more" links (`MediaLinkSection.xaml:49`), Reset hover border, TikTok follower count |
| `AccentDeepPurpleBrush` | `#FF302573` | Selected ListBoxItem |
| `AccentLightPurpleBrush` | `#FFC3A9FF` | Segmented-choice checked fill, focused ListBox border, selected status row border, autocomplete ghost |
| `TextSecondaryBrush` | `#FFA498C7` | Side-panel checkbox labels ("Auto start in VR" etc.) |
| `TextSubtleBrush` | `#FFA39BB6` | |
| `SurfaceVariantBrush` | `#FF493F65` | **Status/Chatting toolbar strips** (`StatusPage.xaml:219,1037`, `ChattingPage.xaml:223,730`), nested option card bg |
| `StatusSuccessBrush` | `#FF4CAF50` | |
| `StatusWarningBrush` | `#FFFFC107` | Warning text in options |
| `StatusErrorBrush` | `#FFE53935` | |
| `StatusErrorDarkBrush` | `#FF6B0000` | Cancel-edit / delete-seekbar buttons |
| `StatusWarningBackgroundBrush` | `#33FFC107` | Warning banners |
| `StatusInfoBackgroundBrush` | `#2AA98CFF` | Info banners |
| `StatusSuccessBackgroundBrush` | `#2A4CAF50` | |
| `GradientDeepPurpleColor` | `#FF251153` | Spotify beta-banner gradient; also text-shadow colour |
| `GradientNavyBlueColor` | `#FF10178C` | |
| `GradientTransparentDarkColor` | `#00240E54` | |
| `AccentSlateBlueColor` | `#FF483D8B` | |
| `TextChatAccentBrush` | `#FF94CCBF` | IntelliChat panel text |
| `ButtonHighlightBrush` | `#FFAEA7ED` | Wordmark glow colour |
| `SurfaceButtonDarkBrush` | `#FF3A1F73` | Status-row activate button bg, media session rows, Voicemod panel, AFK composer output box |
| `TextAccentBlueBrush` | `#FF9AA1FF` | |
| `TextLabelLightBrush` | `#FFA296D4` | |
| `TextSuccessLightBrush` | `#FF9DDAA8` | **Active status row text** (green), IntelliChat status |
| `TextDarkMutedBrush` | `#FFA199C3` | Placeholder "Create here a new status" / "Send a chat message" |
| `SurfaceMidPurpleBrush` | `#FF41375C` | |
| `SurfaceDarkPurpleBrush` | `#FF3B2075` | "Send to VRChat" block bg in title bar |
| `SurfaceMidGradientBrush/Color` | `#FF403670` | IntelliChat panel gradient end |
| `AccentLightBlueBrush/Color` | `#FFB0E6FC` | Status edit text glow |
| `SurfaceButtonPanelBrush` | `#FF483472` | Status-row edit pencil bg |
| `TextSectionHeaderBrush` | `#FFBDAEE2` | **Section header text** ("Chatting options"), H2 subsection headers |
| `TextMutedGrayBrush` | `#FF9AA3B5` | |
| `TextSoftPurpleBrush` | `#FFB5ABC9` | |
| `TextLightPurpleBrush` | `#FFD4CEE2` | Top-bar tab text (idle), SegmentPreview line text |
| `AccentBlueGradientColor` | `#FF63A8F9` | |
| `TextDimLabelBrush` | `#FFA29BB8` | |
| `TextHighlightCyanBrush` | `#FF7ED6FF` | |
| `TextDangerRedBrush` | `#FFFF6B6B` | |
| `SurfaceCardDarkBrush` | `#FF3A2F54` | Checkbox box bg, combobox item hover |
| `BorderAccentPurpleBrush` | `#FF7169B7` | Status row hover border |
| `TextSubtlePurpleBrush` | `#FFA197D4` | "VRC OSC" eyebrow |
| `StatusErrorDarkerBrush` | `#FF8A0000` | |
| `AccentPulsoidColor` | `#FF05B4A8` | |
| `AccentDiscordBrush/Color` | `#FF5865F2` | |
| `AccentSpotifyBrush/Color` | `#FF1DB954` | Spotify widget icons |

Tile / deck / chat tokens (`UI/Theme.xaml:1634-1696, 1778-1842, 2209-2225`):

| Key | Value | Use |
|---|---|---|
| `TileDescriptionBrush` | `#FFBCB1DD` | Tile description text |
| `TileIconFrameBrush` | `#26A98CFF` | 50×50 icon frame fill |
| `TileIconFrameBorderBrush` | `#33C3A9FF` | Icon frame 1px border |
| `TilePanelBorderBrush` | `#FF3A1F73` | Expanded panel outline |
| `TileSurfaceBrush` | linear 0,0→1,1: `#FF4A3E85` @0, `#FF3A2E6B` @0.55, `#FF2C2252` @1 | **Integration tile background** |
| `DeckSurfaceBrush` | `#FF2C2148` | HIDE / CUSTOMIZE pill bg, side-panel cards, VR ONLY chip |
| `DeckSurfaceHoverBrush` | `#FF3A2D5A` | |
| `DeckSurfacePressedBrush` | `#FF221A3C` | |
| `DeckEdgeBrush` | `#FF4A3C72` | Chip/card/composer 1px border |
| `DeckEdgeHoverBrush` | `#FFA97BFF` | Hover border |
| `DeckTextBrush` | `#FFC6B9E8` | Chip text, "P R E V I E W" |
| `DeckTextMutedBrush` | `#FF9689B8` | HIDE text, VR ONLY text, side-panel eyebrow labels, LIVE idle |
| `DeckTextOnBrush` | `#FF17102E` | Text on lit route chip |
| `RouteOnBrush` | `#FFB9A6EE` | **DESKTOP/VR chip ON fill** |
| `RouteOnEdgeBrush` | `#FFD3C4FF` | Route chip ON border |
| `FeatureOnFillBrush` | `#3DB96BFF` | Feature chip ON fill (LIVE, RICH, TRANSIENT, OSC, CYCLE, AFK NOW, Auto complete) |
| `FeatureOnEdgeBrush` | `#FFB96BFF` | Feature chip ON border; live chat-row bar; "Visible for Ns" text |
| `FeatureOnTextBrush` | `#FFEFE4FF` | Feature chip ON text |
| `ChatCardBrush` | `#FF332951` | Chat history card |
| `ChatCardHoverBrush` | `#FF3C3160` | |
| `ChatCardLiveBrush` | `#FF3A2C63` | Card of message currently in chatbox |
| `ChatTextBrush` | `#FFE2DCF2` | Chat message text / composer text |
| `ChatEditTextBrush` | `#FF9FE4FF` | Live-edit text |

App.xaml tokens (`App.xaml:246-279, 344-378, 1392-1435`):

| Key | Value | Use |
|---|---|---|
| `Button.Static.Background/Border` (& `3`) | `#240E54` | Standard button (`Status_Button_style`) |
| `Button.MouseOver.Background/Border` (& `2`) | `#191551` | Button hover; also `Sort_Button_style` idle bg |
| `Button.Pressed.Background/Border` (& `2`) | `#13103d` | Button pressed |
| `Button.Disabled.Background3/Border3` | `#FF2F2F2F` | |
| `Button.Disabled.Foreground3` | `#FF838383` | |
| `Button.Static.Background2/Border2` | `#FFDDDDDD` / `#FF707070` | Minimize button base (transparent in use) |
| `SwitchTrackOffBrush` | `#FF584B8C` | Toggle track off |
| `SwitchEdgeOffBrush` | `#FF7A6BB5` | Toggle border off |
| `SwitchThumbOffBrush` | `#FFE3DCF5` | Thumb off |
| `SwitchThumbOnBrush` | `#FFFDFBFF` | Thumb on |
| `SwitchEdgeOnBrush` | `#FFCBB0FF` | Border on |
| `AccentRampBrush` | linear 0,1→1,0: `#FF3FE0D2` @0, `#FF6E9BFF` @0.35, `#FFB96BFF` @0.65, `#FFFF6FC7` @1 | **Toggle ON track**, LYRICS holo chip, Pulsoid -15% badge, tile live rail |
| `AccentRampVerticalBrush` | 0,1→0,0: `#FF3FE0D2`, `#FF6E9BFF` @0.5, `#FFB96BFF` | Scrollbar thumb while dragging, hidden-strip rail |
| `ScrollThumbBrush` | `#8FC0B2F0` | |
| `ScrollThumbHoverBrush` | `#E0D6CCFF` | |
| `ScrollTrackHoverBrush` | `#1AFFFFFF` | |

### 1.4 Shadow / glow effects

| Key / place | Spec |
|---|---|
| `TextBlockShadowEffect` (`App.xaml:18-25`) | DropShadow blur 10, depth 0, opacity 1, colour `#251153` — applied to tile title + description |
| `ImageShadowEffect` (`App.xaml:27-34`) | blur 25, opacity 0.4, depth 0, `#251153` |
| Wordmark glow (`MainWindow.xaml:183-188`) | blur 16, opacity 0.6, depth 0, `#FFAEA7ED` |
| Switch ON glow (`App.xaml:1518-1524`) | blur 12, opacity 0.55, depth 0, `#8FD6FF` |
| Tab hover glow (`UI/Theme.xaml:1062-1075`) | Border `#7FCBB9FF`, radius 12, margin 8,4, Gaussian blur radius 26, scales 0.75→1 |
| Option group header accent glow (`UI/Controls/OptionGroupHeader.xaml:38-43`) | blur 10, opacity 0.75, `#FFAEA7ED` |
| ComboBox popup (`UI/Theme.xaml:390-395`) | blur 12, opacity 0.5, depth 3, Black |
| GlowyToggleButton checked (`App.xaml:893-898`) | blur 9, `#B4A4DB` |
| Status edit text (`StatusPage.xaml:731-738`) | blur 18, opacity 0.9, `#FFB0E6FC` |
| `Status_Button_style_Shadow` (`App.xaml:1330-1336`) | blur 11, `#D596FF`, opacity animates 0→1 in 0.3s when `ButtonProperties.ShadowTrigger` (TTS speaking) |

### 1.5 Corner radii & spacing (recurring)

| Element | Radius | Padding/margins |
|---|---|---|
| Integration tile | 5 (`IntegrationsPage.xaml:510`) | margin `5,0,5,5` (first tile `5`), inner grid margin 3, border 1px `#FF150C33` |
| Tile icon frame | 10 | 50×50, margin `6,4,6,4`, image margin 4 |
| Deck chips (DESKTOP/VR/feature/HIDE/CUSTOMIZE) | 6 | height 22; DESKTOP w58, VR w34, VR ONLY w96, feature padding 9,0 minW 36; HIDE/CUSTOMIZE padding 11,0,10,0 |
| Toggle switch | 11 (track), 8 (knob) | 42×22 track, 16×16 knob |
| Standard button (`Status_Button_style`) | 3 | padding 1 |
| ComboBox / TextBox | 5 | padding 6,4, minHeight 28 |
| Flat combobox (side panel, status row) | 0 | toggle height 35, border 2,0 |
| Checkbox box | 4 (18×18); compact 3 (14×14) | label margin-left 8 |
| Option card (`OptionCardStyle`) | 5,0,0,5 | padding 8, margin 0,0,0,5, left border 2px `#7B5BBB`, bg SurfaceCard |
| Nested option card | 4 | margin 20,4,0,6, bg SurfaceVariant |
| Side-panel cards | 10 | padding 11,9 |
| Chat composer | 10 | height 42 |
| Chat message card | 8 | margin 8,0,8,6 |
| Chat row button / toggle | 6 | height 26, padding 10,0 |
| Status row card | 5 | margin 5, row height 35 |
| Reset button | 7,0,7,0 | padding 8,2 |
| SegmentPreview | 8 | padding 10,7 |
| Preview panel | 10 | height 157, padding 11,10 |
| Counter pill (14/144) | 5 | height 18, padding 7,0 |
| Popups (group dropdown, lyrics) | 10 | bg gradient `#FF221D38→#FF1A1630`, border gradient `#FF4A3580→#FF2D2050` |

### 1.6 Control styles

**Toggle switch** `Switch` (`App.xaml:1437-1584`): CheckBox template. Track 42×22 r11, off bg `#FF584B8C` border 1px `#FF7A6BB5`; knob 16×16 r8 `#FFE3DCF5` at x=3, translates +20px when on (0.16s CubicEase). On: track = `AccentRampBrush`, border `#FFCBB0FF`, knob `#FFFDFBFF`, glow `#8FD6FF` blur 12. Hover border `#FFB9A6EE`; pressed knob opacity .85; focus ring 1px `#FF8FD6FF` r13 margin -2; disabled opacity .4. Content label (if any) margin-left 8.

**Checkbox** (`UI/Theme.xaml:526-591`): Comfortaa 13, fg `#FFB9B5C1`, margin-bottom 6, padding 0,1. Box 18×18 r4 bg `#FF3A2F54` border `#FF6555A0`; checked bg `#FF7C5CBF` border `#FF9B7DE8`, white 2px round-cap check path `M1,4.5 L3.5,7 L9,1.5` (10×8). Hover border `#FF6B5CA0`. `SettingsCheckbox` = same. `CompactCheckBox` (`:613-684`): label leading, box trailing 14×14 r3, font 11 (used for "Auto update").

**Buttons**
- Primary/standard `Status_Button_style` (`App.xaml:699-750`): bg `#240E54`, fg `#FFD2CDDC`, r3, hover `#191551`, pressed `#13103d`, disabled `#FF2F2F2F`/`#FF838383`. Used for Create/Send/Reorder integrations/Toggle voice/Connect buttons.
- `Status_Button_style_Small` (`:379-452`): 60×20 variant, collapsed unless row action matches.
- `Sort_Button_style` (`:453-502`): idle bg `#191551`, pressed `#1B0D3C`, padding 5,3 (column headers).
- `SectionResetButtonStyle` (`:503-554`): "Reset" — fg TextMuted, 11px SemiBold, padding 8,2, opacity .55, border 1px `#557D7397`, radius 7,0,7,0, bg gradient `#22240E54→#333B3054`; hover border AccentTeal, fg TextSectionHeader, opacity 1.
- `LINK_Button_style` (`:555-599`): bg `#240F53`, fg `#655689`, hover `#2D1072`, pressed `#371491`, r3 (status page gear/next icon).
- `Status_Toggle_style` (`:600-646`): like standard; checked bg `#228908` (green).
- `UpdatedGreenButtonStyle` (`:647-698`): bg `#343541`, hover `#2D2F36`/border `#1E7E34`, pressed `#1C7430`.
- `SubtractButtonStyle` (`:751-799`): minimize; hover `#FF3E1E82`, pressed `#BF6341AD`, square.
- `CloseButtonStyle` (`:800-859`): transparent, r4, hover `#443A3053`/border `#664A3580`, pressed `#66302573`.
- Danger: `DisconnectPulsoid` (`:1968`, r5, hover `#A32222`, pressed `#BD4444`), `CancelEditbutton` (`:2013`, r5, bg StatusErrorDark `#FF6B0000`, hover `#7F0000`, pressed `#8C0000`).
- Status-row: `Activatebutton` (`:1815`, r3,0,0,3 → 5,0,0,5, hover `#564BA0`, pressed `#5D559B`), `Favbutton` (`:1871`, r0,5,5,0, same hover), `Deletebutton` (`:1922`, r0,4,4,0, hover `#56477F`, pressed `#625191`), `Editbutton` toggle (`:2064`, r5,0,0,5, checked `#240F53`).
- `CircleButton` (`:35-65`): bg `#3D217A`, r30, hover `#2C1265`, pressed `#230E53` (update-check icon, delete-rule ✕).
- `GlowyToggleButton` (`:860-914`): bg `#3A3644`, fg `#82829B`, r4, 12px; checked bg `#9E82DD`, fg `#312844`, glow `#B4A4DB`; hover `#322E3A`, hover+checked `#A78FE0` ("Auto 💛 cycle", 📌 pin, "Only mention low ones").
- `GlowyToggleButtonMediaLink` (`:1052-1104`): bg `#240F53`, fg `#D0D0D0`, r4; checked bg `#26A3FE`, fg `#240F53`, glow `#B9CAF7` blur 5; hover `#14092D`, hover+checked `#41AEFC` (VIDEO/ARTIST/TITLE, CPU/GPU/VRAM/RAM, FPS…).
- `GlowyButtonMediaLinkWithText` (`:1158`): bg `#26A3FE`, fg `#240F53`, 13px, hover `#41AEFC`. `GlowyButtonSoundpadWithText` (`:1195`): bg `#AF00FA`, fg `#230E53`, height 35.
- Deck: `TileDoorButton` "CUSTOMIZE ›" (`UI/Theme.xaml:2617-2650`) bg DeckSurface fg DeckText; `TileHideButton` "HIDE" (`:2656-2691`) fg DeckTextMuted → DeckText on hover; `CustomizePillButton` "Customize ›"/"Tune ›" r10 bg `#FF2C2148` padding 10,3,8,3 11px (`:2428-2458`); `HideTilePillButton` (`:2465`).
- `TopBarLinkButton` (`:2076-2107`): 25×25 r6 transparent, hover `#24FFFFFF`, pressed `#33000000`.
- `ChatRowButton`/`ChatRowToggle`/`LiveTypingChip`/`ChatComposerIconButton`: see §5.
- `SegmentedChoiceStyle` radio (`:2297-2351`): container bg SurfaceDark border `#5B4A86` r5 padding 2; segment r3 padding 12,5 14px Medium fg TextMuted; hover `#3A2F5C`; checked bg AccentLightPurple fg `#FF241243` SemiBold.

**TextBox** (`UI/Theme.xaml:319-365`): bg `#FF2C2148`, fg `#FFB9B5C1`, border 1px `#FF4A3580`, r5, padding 6,4, minH 28, caret `#FF9B90D1`, selection `#552FD1C5`; hover border `#FF6B5CA0`; focus border `#FF7C5CBF`, bg `#FF352A52`, fg White; disabled opacity .5. PasswordBox identical (`:372-419`). `LightInputTextBox` (`:421-462`, status "Create" input): bg `#FF3D3460`, fg `#FFDBD7E8`, border `#FF5A4A90`; hover `#FF7C5CBF`; focus border `#FF9B7FDF` bg `#FF473B72`. `InlineTransparentTextBox` (`:502-522`): no chrome (chat composer, status inline edit). `WeatherOverrideInput` (`App.xaml:1795`): h24 bg `#6E6489` fg `#FF240E54` no border.

**ComboBox** (`UI/Theme.xaml:305-412`): bg `#FF2C2148`, border `#FF4A3580`, r5, padding 6,4, 12px, minH 28, content margin 8,4,28,4; arrow path `M0 0 L4 4 L8 0 Z` fill `#FF9B90D1` in 24px column; hover border `#FF6B5CA0` arrow `#FFBDAEE2`; open border `#FF7C5CBF`. Popup: bg `#FF221D38` border `#FF4A3580` r5 shadow, item padding 8,5 r4, highlight `#FF3A2F54`, selected `#FF4A3580` + White text (`:504-538`). `FlatComboBoxStyle` (`:414-495`): r0, border 2,0 (left/right rails only), toggle height 35, padding 4,2, open bg `#FF352A52` — used in side panel and status rows (screenshot shows vertical purple rails).

**Slider** (`UI/Theme.xaml:854-926`): track 4px r2 bg `#FF160F2D`, filled part `#FF7C5CBF`, thumb ellipse 14×14 fill `#FF9B90D1` stroke `#FF4A3580`; hover fill `#FFBDAEE2`; drag fill `#FF7C5CBF`; disabled `#FF4A3F63`. minHeight 20. Call sites use width 134.5, height 12.

**ScrollBar** (`App.xaml:1585-1709`): 8px wide, transparent track, thumb hairline (padding 2,6 → visible ~4px, hover 1,6) r3 `#8FC0B2F0`; hover track `#1AFFFFFF` thumb `#E0D6CCFF`; dragging = AccentRampVertical. No arrow buttons.

**ListBox** (`UI/Theme.xaml:541-611`): bg SurfaceDark, border `#FF4A3580`, r6; item padding 10,7 r5, hover SurfaceCard + White, selected AccentDeepPurple + AccentLightPurple text.

**Tab header** `TopBarTabStyle` (`UI/Theme.xaml:1035-1332`): Button, Comfortaa 18, fg `#FFD4CEE2`, transparent. Layers: `ActiveWash` vertical gradient `#00AEA7ED→#42AEA7ED` (brightest at bottom); `HoverGlow` blurred `#7FCBB9FF`; `HoverUnderline` 2px `#FFCFC6FF` r1 scaled to 0.62 width, opacity .9; `ActiveUnderline` 3px r2 horizontal gradient `#006E63C8 → #FFDCD5FF @0.5 → #006E63C8` (fades both ends). Hover: fg White, label lifts -2px & scales 1.05 (90-140ms in, 170ms out). Active (`ButtonProperties.IsActive`): fg White, SemiBold, wash fades in 0.22s, underline scales 0→1 in 0.3s BackEase. Press: label scale .95.

**Misc styles**: `OptionSubsectionHeaderStyle` (16 SemiBold Albert Sans, TextSectionHeader, margin 2,8,0,5); `OptionFieldLabelStyle` (15 Medium, TextLabel, margin 0,0,0,3); `OptionHelpTextStyle` (12 Italic, TextMuted, margin 2,3,0,6); `NumericReadoutStyle` (Medium); `TileStatusPill` (11px `#C6B9E8`, padding 7,2, maxW 260, ellipsis); `ExpandCollapseToggleButtonStyle` (`App.xaml:66-147`): 30px high, 16×16 Plus_ico.png / Min_ico.png at margin-left 10, title 18 SemiBold TextSectionHeader margin 8,0,10,0; hover bg `#FF4A4063`, pressed `#FF2A2043`.

---

## 2. Window shell (`MainWindow.xaml`)

Window 1150×775 (min 1080×500), title "MagicChatbox by BoiHanny", bg SurfaceDark, custom chrome caption height 55 (`:12-35`). Root grid: rows 55 / *, columns * / **225** (side panel) (`:53-61`). Content bg SurfaceCard. A 1px `#33000000` line under the title bar (`:445-450`). Startup overlay gradient `#FF2D1265→#FF1A0E3E` with 48px icon, "MagicChatbox" 18px, 280×5 progress bar bg `#FF3A2F54` fg `#FF7C5CBF` (`:1262-1339`).

### 2.1 Title bar (`:133-444`), bg SurfacePrimary `#FF2D1265`
Columns: 150 (logo) / 143 / 123 / 123 / 122 (tabs) / *.
- Logo (margin-left 16, vertically centred): eyebrow **"VRC OSC"** Albert Sans 10 Medium `#FFA197D4`; wordmark **"MagicChatbox"** Comfortaa 15 Bold, fill vertical gradient White→`#FFCFC6FF`, glow `#FFAEA7ED` blur 16 (`:154-191`).
- Tabs: **Integrations / Status / Chatting / Options** (`TopBarTabStyle`, each in a grid margin 3,0), bound `SelectedMenuIndex` 0-3 via `ChangeMenuCommand` (`:195-242`).
- Link icons right-aligned with margin-right 233 (`:253-311`): GitHub (`Img/Icons/GitHub.png` 17px) and Discord (`Discord.png` 19px) on row 0, wiki/info (`Info_ico.png` 17px) under Discord (row 1, margin-top -4). Style `TopBarLinkButton` 25×25. Tooltips "MagicChatbox on GitHub", "Join the MagicChatbox Discord", "Open the MagicChatbox wiki - …".
- Far right block (`:313-442`) columns 130 / 45 / 50:
  - "Send to VRChat" block (col 0, width 130, margin-right 5, bg `#FF3B2075`): label Albert Sans 12 `#FFB3B0B9` margin-top 5, then `Switch` toggle bound `MasterSwitch`, opacity .9.
  - Minimize (45×22, `subtract_ico.png`) and Close (45×22, `Close_ico.png`) at top.
  - Under them (margin -5,22,0,0), bg gradient `#FF431F91 → SurfacePrimary`: stacked "Running" (14 SemiBold, gradient `#FF411E8C→#FFA28FCE`, width 53), "VR" (14 Bold, gradient `#FF3A1A7E→#FFCA577C`, shown when `IsVRRunning`) or **"DESKTOP"** (18 Bold, gradient `#FF38197C→#FF54B955`, shown when not VR).

### 2.2 Right side panel (`:451-1245`), width 225, bg `#FF42385D`, 1px left line `#1A00008B`
Rows: 30 (header) / auto (preview) / * (controls) / auto (footer).
- Header row: centred "P R E V I E W" Albert Sans 11 DeckText (`:662-670`); right-aligned counter pill (h18 r5, padding 7,0, margin-right 10) text `OscDisplay.OscMsgCountUI` (format `"{len}/144"`, `Services/LiveTypingService.cs:191`) 11px; bg `#26FFFFFF` fg DeckTextMuted, Tight → bg `#3FFFC46B` fg `#FFFFD79A`, Full → bg `#59FF6F8A` fg `#FFFFC2CD` (`:676-717`).
- Preview box (`:1193-1233`): height 157, margin 8,0,9,0, padding 11,10, r10, border DeckEdge, bg vertical gradient `#FF302548→#FF261D3B`. Text `OscDisplay.OscToSent` Albert Sans 14, line-height 19, fg `#FFE7E2F5`, centred, wraps, top-aligned; else "Nothing to send yet" 12px DeckTextMuted centred.
- Controls stack (width 214, `:718-1186`):
  1. **STATUS SET** card (r10, bg `#FF2C2148`, border DeckEdge, padding 11,9, visible when `IntgrStatus`): eyebrow "STATUS SET" 11 DeckTextMuted; `FlatComboBoxStyle` combobox of `StatusSets.Sets` (first item "Every set", `ViewModels/StatusSetSwitcherViewModel.cs:108`); row: summary text 11px (`StatusSets.Summary`, e.g. "Nothing marked to cycle in here", `Classes/Modules/Status/StatusSetSummary.cs:10`; amber `#FFFFD79A` when empty) + **CYCLE** `FeatureChip` minW 52 bound `AppSettingsInstance.CycleStatus`.
  2. **AWAY FROM KEYBOARD** card (visible when `Modules.Afk.Settings.EnableAfkDetection`; bg `#FF2C2148`, AFK → bg `#FF352755` border `#FF6FD9A6`): header eyebrow + pill "HERE" (bg `#26FFFFFF`; AFK → "AWAY", bg `#446FD9A6`, fg `#FFCFF6E4`); `FlatComboBoxStyle` of `AfkStyles.Styles` (built-ins: Classic, Plain, Small caps, Back soon, Dozing off, Touching grass, At the gym, Raiding the fridge, Coffee run, In the shower, The cat won, One minute — `Classes/Modules/Afk/AfkStyle.cs:60-159`); preview line 11px shown on hover; row "Away in"/"Away for" 12px + timer Comfortaa 13 `#FFE7E2F5` (`RemainingTimeUntilAFK`; AFK → `#FF9BEFC9`, `TimeCurrentlyAFK`) or "Paused while in VR"; **AFK NOW** `FeatureChip` minW 66 bound `Modules.Afk.Settings.OverrideAfk`.
  3. **Reorder integrations** button (`Status_Button_style`, h27, right-aligned, `Edit_ico.png` 16px + text 13px) → opens `UI/Dialogs/ReorderIntegrations.xaml` (520×520, list with Up/Down/Default/Save/Cancel).
  4. **Toggle voice (V)** button (h27, padding 10,0, `Status_Button_style_Shadow`, text `TtsAudio.ToggleVoiceText` = "Toggle voice (V)" or "Toggle voice", `ViewModels/State/TtsAudioDisplayState.cs:91`).
  5. Right-aligned label+checkbox rows (label Albert Sans 12 TextSecondary, checkbox margin-left 4, `SettingsCheckbox`): "Auto start in VR" → `AppSettingsInstance.StartWithSteamVr`; "Close to tray" → `CloseToTray`; on Chatting tab only: "Live edit chats" → `ChatSettings.RealTimeChatEdit` (only if `ChatLiveEdit`), "Text to speech" → `TtsSettingsInstance.TtsTikTokEnabled`; when TTS on (Chatting tab): "Voice" + combobox w135 (`TikTokTTSVoices`), "TTS volume" + slider w134.5 0..1 (`TtsVolume`).
- Footer (`:468-657`, margin 10,0,10,10):
  - Banner: "✦ MagicChatbox V2 is on the way" — r7, padding 10,6, bg `#2E1B0F3A`, border `#FF473A6B`; ✦ 11px `#FFC0A6FF`, text Albert Sans 11 `#FFA99BD2`.
  - **INSTALLED** card: r8, padding 13,11, border `#FF564B79`, bg gradient `#FF3F3559→#FF322A46`. "INSTALLED" 11px `#FF8B80AE`; version number Comfortaa 17 `#FFEDE7FF` (`UpdateState.AppVersion.VersionNumber`, e.g. 0.9.226); `CircleButton` with `Load_ico.png` 12px ("Check for updates"); `CompactCheckBox` "Auto update" fg `#FF9186B5`; 1px divider `#FF4C4170`; status box r6 bg `#FF2B2440` border+text colour `UpdateState.VersionTxtColor`, text `VersionTxt` 12px centred — "You are up-to-date" in `#FF92CC90` (`Services/VersionService.cs:314`), "Update now" `#FF8AFF04`, "Checking for updates..." `#FBB644`, "Can't check updates" `#F36734`, "Try new pre-release" `#2FD9FF`; optional status text 11px `#FF9186B5`; link "View changes on GitHub" 11px underline `#FF6FBEFF`.

---

## 3. Integrations page (`UI/Pages/IntegrationsPage.xaml`)

Background SurfaceCard. Row 0: warning strip (`:290-341`, margin 12,4,19,2). Row 1: ListBox of tiles (transparent, item padding 3,0).

### 3.1 Hint banners
- Mode warning (`:291-314`): pill r5 bg `#26FFFFFF` padding 8,3, "👁" 10px + text 11px DeckText bound `ModeVisibilityWarning`. Text built in `Classes/Modules/IntegrationModeVisibility.cs:212-215`: `"Enabled but not shown in {Desktop|VR} mode: {names}."` plus `" Turn on their {mode} switch to see them."` when at least one can be enabled. Shown when any master-on integration has its current-mode route chip off (`HasModeVisibilityWarning`). Can be suppressed by AppOptions "Warn me when something is on but not shown…".
- Trim warning (`:316-340`): bg `#3FFFC46B`, "✂" + text `#FFFFD79A` 11px, e.g. "No room in the 144 characters for Discord and Weather." (`HasTrimmedWarning`).
- Hidden-tiles strip (first list item, `:378-504`): r6 border `#3A2F63`, bg gradient `#4A2E1F5C→#242B1B4A`, 2px iridescent left rail, summary toggle (`HiddenStripToggle`), chips per hidden tile (`HiddenTileChipButton`, dot filled `#7BE495` if running), "Show all", "Hide the N that are off".

### 3.2 Tile anatomy (every tile, e.g. `:506-609`)
Border margin 5,0,5,5, bg `TileSurfaceBrush`, r5, border 1px `#FF150C33`; grid margin 3, columns 62 / * / Auto / Auto; tile opacity bound `IntegrationDisplay.<X>Opacity` (dimmed when off).
1. **Live rail**: 3px left strip r5,0,0,5, `#1AFFFFFF`; when key in `IntegrationDisplay.LiveOutputKeys` → vertical gradient `#3FE0D2→#B96BFF`.
2. **Icon frame**: 50×50 r10 bg `#26A98CFF` border `#33C3A9FF`, image margin 4 (Voicemod margin 8).
3. **Text column**: title `TileTitleStyle` (Comfortaa 20 SemiBold White, shadow) with optional status pill beside it (`TileStatusPill` 11px `#C6B9E8`); description `TileDescriptionStyle` (Comfortaa 13 `#FFBCB1DD`, margin-top 3).
4. **Control deck** (`TileControlDeck`, minW 246, right-aligned, margin 0,6,2,0): row 1 `DeckOutputRow` (right-aligned, margin-bottom 4): feature chips… then **DESKTOP** (`RouteChipDesktop` w58) and **VR** (`RouteChipVr` w34, margin-left 4) or static **VR ONLY** (w96); row 2 `DeckChromeRow`: **HIDE** (`TileHideButton`) then **CUSTOMIZE ›** (`TileDoorButton`, `ActivateSettingCommand` param `Settings_<X>` — opens Options tab and expands that section).
5. **Master switch**: `Switch` checkbox margin 5,0,5,0.

Chip states: RouteChip off = transparent + 1px DeckEdge, hover `#1FFFFFFF`+`#FFA97BFF`, on = `#FFB9A6EE` fill / `#FFD3C4FF` edge / `#FF17102E` text. FeatureChip on = `#3DB96BFF` / `#FFB96BFF` / `#FFEFE4FF`. LYRICS uses `FeatureChipLyrics` holographic (on fill = AccentRamp, border gradient `#5FE6D8→#A97BFF→#FF8AD2`, sheen sweep 0.7s, text `#FF1B1030`).

### 3.3 Tile list (default display order `ViewModels/State/IntegrationDisplayState.cs:16-18`: Status, Window, Twitch, TikTokLive, Discord, Spotify, VrcRadar, HeartRate, Component, VrPerformance, TrackerBattery, Network, Weather, Time, Soundpad, Voicemod, MediaLink; user re-orderable)

| # | Key | Title | Description | Icon | Badges (binding) | Master toggle | Status pill / extra |
|---|---|---|---|---|---|---|---|
| 1 | Status | Personal status | Say whatever you want. Save a pile of messages, cycle them, and drop to AFK when you wander off. | PersonalMsg_ico.png | DESKTOP `IntgrStatus_DESKTOP`, VR `IntgrStatus_VR` | `IntgrStatus` | – (`:506-609`) |
| 2 | Window | Window activity | VR or desktop, and what you're buried in. Mark any app private and it stays your business. | WindowActivity_ico.png | FORCE VR `IntgrScanForce` (disabled when VR chip on), DESKTOP `IntgrWindowActivity_DESKTOP`, VR `IntgrWindowActivity_VR` | `IntgrScanWindowActivity` | (`:610-722`) |
| 3 | Twitch | Twitch | Live status, viewers and category, plus shoutouts and announcements you can fire off without leaving VR. | Twitch_ico.png | DESKTOP `IntgrTwitch_DESKTOP`, VR `IntgrTwitch_VR` | `IntgrTwitch` | pill `Modules.Twitch.StatusMessage` (`#8FE1B6` when connected) + LastSyncDisplay, only when master on & shown in current mode (`:1950-2099`) |
| 4 | TikTokLive | TikTok | (when on) Follower counts on their own, or go LIVE for follows and gifts landing in real time. Run either, or both. | TikTok_ico.png | LIVE `Modules.TikTokLive.Settings.EnableLiveConnector`, DESKTOP `IntgrTikTokLive_DESKTOP`, VR `IntgrTikTokLive_VR` | `IntgrTikTokLive` | pill `ProfileStatusText` fallback "Set a TikTok profile username."; when on also "Followers: N" (teal), "LIVE: …", "Preview: …" (`:2100-2245`) |
| 5 | Discord | Discord | Who's talking in your voice channel, and your VRChat world on your Discord profile if you want it. | Discord_ico.png | RICH `Modules.Discord.Settings.EnableRichPresence`, DESKTOP `IntgrDiscord_DESKTOP`, VR `IntgrDiscord_VR` | `IntgrDiscord` | pill `CurrentChannelName` fallback "Not connected" (`:2246-2383`) |
| 6 | Spotify | Spotify | The full Spotify picture: liked, explicit, shuffle, queue and device, arranged however you like with your own template. | spotify_ico.png | LYRICS `LyricsFromSpotify` (holo), TRANSIENT `SpotifySettings.ShowOnlyOnChange`, DESKTOP `IntgrSpotify_DESKTOP`, VR `IntgrSpotify_VR` | `IntgrSpotify` | pill `SpotifyDisplay.StatusText` (e.g. "Not connected"), opacity .8; when on: widget panel + lyrics ribbon (`:2923-3227`) |
| 7 | VrcRadar | VRChat Radar | Reads VRChat's own log: where you are, who came and went, and every photo you took. | VRCRadar_ico.png | DESKTOP `IntgrVrcRadar_DESKTOP`, VR `IntgrVrcRadar_VR` | `IntgrVrcRadar` | pill `CurrentWorldName` fallback "Not in a world" (`:2384-2516`) |
| 8 | HeartRate | Pulsoid Heart Rate | Your pulse, live in the chatbox and on your avatar over OSC. Needs a Pulsoid BRO plan. | HeartRate_ico.png | OSC `IntgrHeartRate_OSC`, DESKTOP `IntgrHeartRate_DESKTOP`, VR `IntgrHeartRate_VR` | `IntgrHeartRate` | "-15% always" gradient badge (h20 r5, AccentRamp bg, "-15%" 16 Bold `#12002E`, "always" 11 Bold `#2A1650`, sheen anim); Comfortaa 12 "No device connected" LightSeaGreen / "Something went wrong, check settings" PaleVioletRed / last update `#ABA4B8` (`:723-991`) |
| 9 | Component | Component ˢᵗᵃᵗˢ | Load, temps, wattage and clocks for your CPU, GPU, RAM and VRAM. Settle the specs question for good. | ComponentStats_ico.png | DESKTOP `IntgrComponentStats_DESKTOP`, VR `IntgrComponentStats_VR` | `IntgrComponentStats` | Comfortaa 12 `#ABA4B8` status; expanded panel when running (`:1401-1626`) |
| 10 | VrPerformance | VR performance | Frames, reprojection and headroom from SteamVR. Stays quiet until something actually goes wrong. | vr-performance.png | VR ONLY (static) | `IntgrVrPerformance` | expanded panel when on (`:1171-1400`) |
| 11 | TrackerBattery | VR gear battery | Headset, controllers and trackers. Catch the one that's about to die before it takes your legs with it. | VR_bat_ico.png | VR ONLY (static) | `IntgrTrackerBattery` | expanded "Active devices" panel when on (`:992-1170`) |
| 12 | Network | Network ˢᵗᵃᵗˢ | Live up and down speeds, session peaks and totals. Proof it's the world lagging, not you. | NetworkStats_ico.png | DESKTOP `IntgrNetworkStatistics_DESKTOP`, VR `IntgrNetworkStatistics_VR` | `IntgrNetworkStatistics` | (`:1627-1730`) |
| 13 | Weather | Weather | Conditions where you actually are: temperature, feels-like, wind and humidity, tucked in beside your clock. | Weather_ico.png | DESKTOP `IntgrWeather_DESKTOP`, VR `IntgrWeather_VR` | `WeatherSettings.ShowWeatherInTime` | Comfortaa 12 `#D4D0E1` `WeatherLastSyncDisplay` ("Last sync: Never") (`:1836-1949`) |
| 14 | Time | Time | Your local time and zone. Ends the "wait, what time is it for you?" question forever. | SystemTime_ico.png | DESKTOP `IntgrCurrentTime_DESKTOP`, VR `IntgrCurrentTime_VR` | `IntgrScanWindowTime` | (`:1731-1835`) |
| 15 | Soundpad | Soundpad | Shows the clip you just played, so the room knows exactly who did that. Quiet when nothing's playing. | Soundpad.png | DESKTOP `IntgrSoundpad_DESKTOP`, VR `IntgrSoundpad_VR` | `IntgrSoundpad` | door reads **PERMISSION ›** (param `Settings_Privacy_Soundpad`); transport panel above tile (⏮ Previous / ⏭ Next / 🔄 Random / ▶ Paused / ⏸ playing / ⏹️ Stop, `GlowyButtonSoundpadWithText`) (`:2517-2753`) |
| 16 | Voicemod | Voicemod | Every voice and sound in Voicemod, driven from here. Pin the ones you use and they stay one click away. | Voicemod.png | VOICE `Voicemod.Settings.VoiceControlEnabled`, SOUNDS `SoundboardControlEnabled`, MIC `MicControlEnabled`, DESKTOP `IntgrVoicemod_DESKTOP`, VR `IntgrVoicemod_VR` | `IntgrVoicemod` | Comfortaa 12 `#ABA4B8` `Voicemod.Display.StatusText`; `VoicemodControlPanel` below when on (`:2755-2921`) |
| 17 | MediaLink | MediaLink | Whatever's playing on your PC: Spotify, YouTube, a browser tab. No account, no setup, just music. | MediaLink_ico.png | LYRICS `LyricsFromMediaLink` (holo), TRANSIENT `MediaLinkSettings.ShowOnlyOnChange`, DESKTOP `IntgrMediaLink_DESKTOP`, VR `IntgrMediaLink_VR` | `IntgrScanMediaLink` | media-session rows + lyrics ribbon (`:3229-3631`) |

All HIDE buttons: tooltip "Hide this tile from the list. The integration stays switched on." Route chip tooltips: "Show this integration while you're on desktop." / "…in VR." VR ONLY tooltip: "This integration only appears while you're in VR. It has no desktop mode."

### 3.4 Inline expansions (what appears under a tile)
- **VR gear battery** (`:999-1064`): sub-card bg `#230E52` r0,0,5,5 margin 10,-15,10,5 containing TileSurface inner card: "Active devices" (Comfortaa 13 TextSectionHeader) + `TrackerBatteryDeviceSummary` pill + last scan; wrap of device chips (bg `#2A000000` r4: icon, name, "N%").
- **VR performance** (`:1178-1297`): "Live" + `VrPerformanceCombined` (14px); status pill; wrap of `GlowyToggleButtonMediaLink` checkboxes h23: FPS `ShowFps`, Target Hz `ShowTargetHz`, Reprojection `ShowReprojection`, Dropped `ShowDroppedFrames`, Motion smoothing `ShowMotionSmoothing`, GPU ms `ShowAppGpuMs`, Compositor ms `ShowCompositorGpuMs`, Budget `ShowHeadroom`, CPU ms `ShowCpuTiming`, Emojis `UseEmojisForVrPerf`; "Show" + combobox w175 `DisplayMode` (Always / Only when frames drop / Compact, expand on trouble).
- **Component stats** (`:1407-1496`, when running): checkboxes CPU `IsCPUEnabled`, GPU `IsGPUEnabled`, VRAM `IsVRAMEnabled`, RAM `IsRAMEnabled` (opacity by availability); error text Comfortaa 12 `#9B7FD9`; optional access-fix button.
- **Spotify widget** (`:3048-3220`, when on): bg gradient `#221740→#1C1232` r0,0,6,6 padding 14,12: title Comfortaa 16 White, artist 13 TextLabel, album 12 (.7); liked/shuffle/repeat icons 16px Spotify green; progress bar h6 + `ProgressDisplay` (if `ShowWidgetProgress`); controls (if `ShowWidgetControls`, `Status_Button_style` 32×26 / 70×26): ⏮, Play/Pause, ⏭, ♥, 🔀, 🔁, ↗, ⟳; "Vol" + slider w105 (if `ShowWidgetVolume`). Then **Lyrics ribbon** (`LyricsRibbonTemplate` `:65-275`, when `LyricsDisplay.ShowOnSpotifyCard`): r6 border `#3A2A66` bg `#221740→#1A0F30`, "♪" 18px, current line Comfortaa 14 White, status 11px muted, Sync −/+ 100ms stepper (26×26 buttons, `LyricsOffsetRowTemplate`), "Timing ▾" flyout toggle (`LyricsFlyoutToggle` r10) opening popup with "Instrumental breaks" Gap/Hold steppers and "Sync offset" −1 s / Reset / +1 s, and "Tune ›" pill.
- **MediaLink sessions** (`:3350-3622`): one row per media session (bg `#FF3A1F73` r5, margin 5,5,5,0, 3px gradient left accent when active): radio with app name `FriendlyAppName` (fg `#DBD9DE`), toggles VIDEO `IsVideo`/ARTIST `ShowArtist`/TITLE `ShowTitle` (`GlowyToggleButtonMediaLink` h25), ▶/⏸ 25×25, 170px `MediaPlayerProgress` (h6, bg `#230E52`, fill gradient `#FF26A3FE→#FFA326FE`) or blurred bar + "LIVE" 17 Bold `#26FFFE`, ⏮ ⏭, right: "AUTOSWITCH ON PLAY" `AutoSwitch`, save icon toggle `KeepSaved`. Lyrics ribbon when `ShowOnMediaLinkCard`.
- **Voicemod** (`:2899-2919`): panel r6 bg SurfaceButtonDark border TilePanelBorder → `UI/Controls/Voicemod/VoicemodControlPanel.xaml`.
- **Soundpad** transport bar (`:2523-2641`): h35 bg SurfaceButtonDark with purple gradient edge (`#FF3A1F73→#651A72`, border →`#B61BC1`).

---

## 4. Status page (`UI/Pages/StatusPage.xaml`)

Rows: 35 toolbar / * list / 40 message bar / auto composer (`:211-217`). Background SurfaceCard.

**Toolbar** (`:219-712`, bg SurfaceVariant, bottom 1px `#80A39BB6`), normal mode:
- Left (margin-left 8): sort ComboBox w115 items "Recently used", "My 💛 cycles", **"Creation date"** (default), "Edit date" (`SortCombo_SelectionChanged`); direction button 25×25 `Status_Button_style` content `SortDirectionSymbol` ("↓" descending / "↑", `ViewModels/StatusPageViewModel.cs:59-64`).
- Centre: "Group:" 11px `#66FFFFFF`; group dropdown toggle (`StatusDropdownToggleStyle`: r5, bg `#240E54`, 12px, h25, checked border `#FF7C5CBF`) showing `SelectedGroupDisplayName` (e.g. "All groups") + "▾" 15px; popup (minW 260, r10) with "☰ All groups ✓", separator `#3F2970`, group rows (name, delete/rename/📤 20×20, "CYCLE" mini toggle 44×22 `StatusPopupMiniToggleStyle` checked `#9E82DD`), new-group textbox w135 + "+" button; then 📤 (export current group) and 📥 (import) 25×25 buttons.
- Right (margin-right 8): "⊞  Select" button h25 (`EnterSelectionModeCommand`); "Auto 💛 cycle" `GlowyToggleButton` 90×25 → `AppSettings.CycleStatus`; "📌" 30×25 GlowyToggle → `CycleOverrideCurrentGroup` (enabled when CycleStatus); gear/next button (`LINK_Button_style`, `Next_ico.png` 18px, opacity .6) → `ActivateSettingCommand Settings_Status`.
- Selection mode (`:564-705`): "✕  Cancel", "Deselect", "{n} selected" 13px `#AAA3B7`, "Select All", "🗑 Delete", "⧉ Clone", "📤 Share (n)", "Move to… ▾" popup (bg `#1E1B33`, "Move selected items to:" 10px, "📁 name" rows).

**Status row** (`:829-1031`, ListBox margin 5, `FilteredView`): card margin 5, r5, h35, bg horizontal gradient `#FF4A4070→#FF2C2448`, border 1px `#FF150C33` (hover `#FF7169B7`; selected bg `#FF5C5296→#FF3A3162` border AccentLightPurple). Columns 35 / Auto / * / Auto / Auto / Auto:
1. Activate: 35×35 `Activatebutton` bg SurfaceButtonDark with `ActivateStatus_ico.png` 22px (`ActivateStatusCommand`); when `IsActive` replaced by border `#B170C5` 2/1.5px r4,0,0,4 with `ActivatedStatus_ico.png` (green play icon in screenshot). Selection mode: checkbox instead.
2. Delete: 30×35 `Deletebutton` bg `#3F2970`, `Delete_ico.png` 20px.
3. Text: Comfortaa 16 SemiBold, margin 10,0,6,0, LightGray / `#FF9DDAA8` when active (`msg`); editing → inline textbox `editMsg` Medium with cyan glow + 20×20 cancel ✕ button (bg `#FF6B0000`).
4. Edit pencil: 25×35 toggle `StatusItemEditToggleStyle` bg `#24134E` r4,0,0,4 (hover `#321B68`, checked `#9E82DD`), `Edit_ico.png` 15px → `IsEditing`.
5. Group: `FlatComboBoxStyle` w90 12px of `GroupList` (display `Name`, default "Default") → `GroupId`.
6. Favourite: 35×35 `Favbutton` transparent, `Unfavorite_ico.png` if `UseInCycle` else `Favorite_ico.png` (22px heart).

**Message bar** (`:1034-1051`): bg SurfaceVariant, top 1px `#80A39BB6`, text `ChatStatus.StatusTopBarTxt` 16px TextLabel margin-left 16 (e.g. "You're soaring past the 140 char limit by N. Reign in that message!").

**Composer** (`:1053-1115`, margin 10,10): `LightInputTextBox` minH 40, 15px, padding 4,0,58,0 → `ChatStatus.NewStatusItemTxt`; placeholder "Create here a new status" 15px TextDarkMuted; counter `StatusBoxCount` ("{n}/140", `ViewModels/StatusPageViewModel.cs:486`) 12px right-aligned, colour `StatusBoxColor`; **Create** button w75 margin-left 8 `Status_Button_style`.

---

## 5. Chatting page (`UI/Pages/ChattingPage.xaml`)

Rows: Auto over-limit warning / 35 status strip / * history / auto AI tool strip / 60 composer (`:21-29`).
- Over-limit warning (`:31-57`): margin 12,4,12,2 r6 border `#66FF6B6B` bg `#FF6B6B`@16%, text 13px `#FFFFC9C9` (`ChatTopBarTxt`).
- Status strip (`:221-283`): bg SurfaceVariant, bottom 1px `#33000000`, margin 12,0: left `ChatFeedbackTxt` 14px TextLabel (or IntelliChat label in `#FF9DDAA8`); right "Visible for {n}s" 13px `#FFB96BFF` (`ScanPauseCountDown`), **Stop** (52×26) and **Clear history** (h26) `ChatRowButton` (bg `#14FFFFFF`, border DeckEdge, r6, 12px DeckText; hover `#2BFFFFFF`/`#FFA97BFF`).
- History (`:289-400`): ScrollViewer margin-left 7, items bottom-aligned; card `ChatMessageCard` (r8, bg `#FF332951`, border DeckEdge; running → bg `#FF3A2C63` border `#FFB96BFF` + 4px left bar r7,0,0,7); message text Albert Sans 16 `#FFE2DCF2` padding 12; live-edit textbox fg `#FF9FE4FF`; row actions (opacity .55→1 on hover): Cancel, `LiveEditButtonTxt` toggle, Resend, copy icon (`Copy_ico.png` 15px).
- IntelliChat response panel (`:401-653`): r5 border `#4090EE90` bg `#3E5750→#FF403670`, "IntelliChat" 18px `#FF94CCBF`, "Tokens:", "Model:", "Today tokens:", "Characters: n/144", "Powered by OpenAI", OpenAI.png 30px @.5, buttons Sent(accept icon+"Sent") / reject / accept. Error panel MediumVioletRed variant.
- AI tool strip (`:728-872`): bg SurfaceVariant top 1px `#33000000`, margin 12,7, hidden if `ChatSettings.HideOpenAITools` or requesting. `ChatRowButton` h30 margin-right 6, 18px icon + text: **Spelling & grammar** (SpellingCheck.png, `SpellCheckCommand`), **Magic Improve** (RebuildChat.png, `BeautifyCommand`), **Translate** (Translate_ico.png), **Shorten** (Cut_ico.png), **Convo starter** (Wand_ico.png), **Speech to text** (SpeechToText.png, `StartRecordingCommand`; swaps to "Stop listening" while recording), then `ChatRowToggle` **Auto complete** → `ChatSettings.ChatAutocompleteEnabled`.
- Composer (`:63-216`, margin 12,0): `ChatComposerShell` h42 r10 bg `#FF3A3060` border DeckEdge (hover `#FF7C5CBF`; focus bg `#FF443A70` border `#FF9B7FDF`). Inside: **LIVE** chip (`LiveTypingChip` 52×26 r6, 6px dot, text 11px; on = FeatureOn fill/edge, dot pulses 1→.25 every .75s) → `ChatSettings.ChatLiveTyping`; transparent textbox 15px `#FFE2DCF2` maxLength 141 (`Core/Constants.cs:109`) → `NewChattingTxt`, placeholder "Send a chat message" TextDarkMuted, autocomplete ghost AccentLightPurple @.45 + "TAB" hint 10px; counter `ChatBoxCount` ("{n}/{limit}" e.g. 0/140) 12px colour `ChatBoxColor`; paste icon (`PasteChat_ico.png` 17) and clear icon (`Remove_icon.png`) `ChatComposerIconButton` 30×26. **Send** button 84×42 margin-left 8 `Status_Button_style`.

---

## 6. Options page (`UI/Pages/OptionsPage.xaml` + `UI/Pages/Options/*.xaml`)

Page = ScrollViewer (padding 0,0,0,12) → StackPanel (`OptionsPage.xaml:37-41`). Footer text 11px centred: "By using MagicChatbox, you agree to the [Privacy & Security Policy] and [Software License]." (`:275-304`).

**Group header** `OptionGroupHeader` (`UI/Controls/OptionGroupHeader.xaml`): grid margin 6,26,18,6; 3×19 accent bar r2 (gradient `#FFE6E1FF→#FF8B7EE8`, glow `#FFAEA7ED` blur 10); title Comfortaa 18 SemiBold White margin 11,0,14,0; 1px hairline fading right (`#59AEA7ED → #1FAEA7ED @.55 → #00AEA7ED`).

**Section wrapper** `OptionSectionWithResetStyle` (`App.xaml:1726-1755`): each section is a `ContentControl` with `Tag` (chatting, status, media-link, spotify, lyrics, twitch, tiktok-live, discord, vrc-radar, time, weather, pulsoid, component-stats, network-statistics, window-activity, vr-performance, tracker-battery, voicemod, openai, tts, app-options, privacy, egg-dev); a **Reset** button (`SectionResetButtonStyle`) is overlaid top-right (grid h30 margin 0,5,8,0) calling `ResetSectionCommand` with the Tag — semantics: "Reset this section's settings to their defaults" (tooltip). Sections other than Chatting/Status/MediaLink are lazy placeholders ("Loading…") until loaded (`OptionsPage.xaml:73-270`).

**Section anatomy** (identical in every `*Section.xaml`, e.g. `ChattingOptionsSection.xaml:12-38`): Grid margin 0,5,0,0 with bg gradient SurfaceGradientStart→End (StartPoint 1,1 → 0,0); header row = `ExpandCollapseToggleButtonStyle` toggle (h30, ⊕/⊖ 16px icon, title 18 SemiBold) bound to `AppSettings.Settings_<X>`; optional "Learn more" link beside it (12px AccentTeal underline: MediaLink `:39-52`, Pulsoid `:49`, TTS `:46`; OpenAI has "Terms of use" & "My usage" `:40,53`); body Grid margin 34,10,0,0 visible when expanded, containing `OptionCardStyle` cards each starting with an `OptionSubsectionHeaderStyle` H2.

Group → section order (`OptionsPage.xaml:42-270`):
- **Your message**: Chatting options, Status options
- **Music**: MediaLink options (Learn more), Spotify options, Lyrics (MediaLink & Spotify)
- **Streaming and chat**: Twitch options, TikTok options, Discord voice options, VRChat radar options
- **On screen**: Time options, Weather options
- **Your PC and body**: Pulsoid heart rate options (Learn more), Component stats options, Network statistics options, Window activity options
- **VR**: VR performance options, Tracker battery manager
- **AI and voice**: Voicemod, OpenAI options, Text to speech options
- **App and privacy**: App options, Privacy & permissions, EGG options (only when `Egg_Dev`)

Legend for tables: type — cb=checkbox, sl=slider(min/max/step), tb=textbox, pw=password, cmb=combobox, btn=button, tgl=toggle, prev=SegmentPreview, help=italic help text, lbl=field label. "gate" = visible only when that property is true (NOT = false).

### 6.1 Chatting options (`ChattingOptionsSection.xaml`, toggle `Settings_Chatting`)
| line | card / control | label / text | binding |
|---|---|---|---|
| 42 | H2 | How your message goes out | |
| 45 | prev | caption "A message you send will look like this" | `ChatPreview` |
| 47 | cb | Put an icon in front of my messages | `ChatSettings.PrefixChat` |
| 55 | cb (gate PrefixChat & EnableEmojiShuffle) | Use my own icons here too, instead of 💬 | `AppSettings.EnableEmojiShuffleInChats` |
| 64-85 | lbl+help+tb w40+"seconds" | How long your message stays up / After this many seconds VRChat clears your message and your integrations get the chatbox back. | `AppSettings.ScanPauseTimeout` |
| 92 | H2 | Live typing | |
| 93 | cb | Show my words in VRChat while I am still typing them | `ChatSettings.ChatLiveTyping` |
| 96 | help | People around you read the line as it appears instead of waiting for you to finish. Pressing Enter still sends it as a normal message. There is a LIVE button on the chat page that switches this on and off without coming here. | |
| 101 | cb (gate ChatLiveTyping) | Count it as sent when I stop typing or click away | `ChatSettings.ChatLiveTypingAutoFinalize` |
| 104 | help | Your words are already on screen, so this is what adds the message to your history, plays the send sound once, and starts the countdown. Without it the line stays up until you press Enter. | |
| 109-136 | lbl+help+sl 2000/20000/500 + value + "ms of not typing" (gate AutoFinalize) | Count it as finished after / Give yourself room to think. If this is shorter than your pauses, the box clears mid-sentence and the rest arrives as a second message. | `ChatSettings.ChatLiveTypingFinalizeMs` |
| 140-167 | lbl+help+sl 1000/3000/100 + value + "ms" | Update the chatbox at most every / VRChat throws away chatbox messages that arrive too quickly. Lower is snappier and closer to that limit; raise it if your words stop appearing. | `ChatSettings.ChatLiveTypingRateMs` |
| 175 | H2 | Finishing your sentences | |
| 176 | cb | Suggest the rest of what I am typing | `ChatSettings.ChatAutocompleteEnabled` |
| 179 | help | The suggestion appears greyed out ahead of your cursor and is only accepted when you press Tab. Suggesting from what you have typed before never sends anything to OpenAI. | |
| 188-204 | lbl w165 + cmb w215 (gate Enabled & UsesOpenAI) | Where suggestions come from — items: "Words you have typed before", "OpenAI guesses the next words" (`ChatAutocompleteMode`) | `ChatSettings.ChatAutocompleteMode` |
| 207-223 | lbl + cmb w215 | Which OpenAI model — items `AvailableChatModels` (gpt-5.2, gpt-5.1, gpt-5, gpt-5-mini, gpt-5-nano, gpt-4.1, gpt-4.1-mini, gpt-4.1-nano, gpt-4o, gpt-4o-mini, o1, o1-mini, o3, o3-mini …) | `IntelliChatSettings.PerformTextCompletionModel` |
| 226-241 | lbl + tb w45 + "letters" | Start suggesting after | `ChatSettings.ChatAutocompleteMinCharacters` |
| 244-259 | lbl + tb w45 + "words" | Longest suggestion | `ChatSettings.ChatAutocompleteMaxWords` |
| 262-277 | lbl + tb w60 + "thousandths of a second" (gate UsesOpenAI) | Wait after I stop typing | `ChatSettings.ChatAutocompleteDelayMs` |
| 285 | H2 | Sound | |
| 286 | cb | Play the VRChat notification sound when I send a message | `ChatSettings.ChatFX` |
| 289 | help | Everyone near you hears it, not just you. | |
| 292 | cb (gate ChatFX) | Play it again when I resend the same message | `ChatSettings.ChatSendAgainFX` |
| 304 | H2 | Sending | |
| 306 | cb | Pause for a moment before sending | `ChatSettings.ChatAddSmallDelay` |
| 309 | help | VRChat sometimes drops a message that arrives the instant you press Enter. A short pause stops that happening. | |
| 314-340 | lbl + sl 0.1/2/0.1 + value + "seconds" (gate AddSmallDelay) | How long to pause | `ChatSettings.ChatAddSmallDelayTIME` |
| 344 | cb | Keep my message on screen instead of letting it time out | `ChatSettings.KeepUpdatingChat` |
| 350 | help | MagicChatbox sends the message again every few seconds so it never disappears. It stays until you clear it. | |
| 355-381 | lbl + sl 2/10/0.1 + value + "seconds" (gate KeepUpdatingChat) | Send it again every | `ChatSettings.ChattingUpdateRate` |
| 385 | cb (gate KeepUpdatingChat) | Let me change a message after it has been sent | `ChatSettings.ChatLiveEdit` |
| 393 | cb (gate ChatLiveEdit & KeepUpdatingChat) | Show every edit as I type it, letter by letter | `ChatSettings.RealTimeChatEdit` |

### 6.2 Status options (`StatusSection.xaml`, `Settings_Status`)
| line | control | text | binding |
|---|---|---|---|
| 44 | H2 | The icon in front of your status | |
| 47 | prev | "Your status will look like this" | `StatusPreview` |
| 49 | cb | Put an icon in front of my status | `AppSettings.PrefixIconStatus` |
| 56 | cb | Use my own icons, a different one each time | `AppSettings.EnableEmojiShuffle` |
| 64 | help (gate EnableEmojiShuffle) | Every icon in this list gets a turn before any of them comes round again. Separate them with a space or a comma. This same list can be used in front of the messages you type - there is a switch for that in Chatting options. | |
| 67 | tb minW50 maxW630 | (emoji list) | `Emojis.EmojiListString` |
| 76 | help | Or add one at a time here. | |
| 80-116 | tb h30 + btn "Add to the list" (Add.png) | | local `EmojiNew` / `AddEmojiButton_Click` |
| 124 | H2 | Showing more than one status | |
| 125 | cb | Take turns showing every status marked 💛 | `AppSettings.CycleStatus` |
| 128 | help | Without this, only the one status you picked is shown. | |
| 133 | cb (gate CycleStatus) | Pick them in a random order rather than top to bottom | `AppSettings.IsRandomCycling` |
| 141-160 | lbl + tb + "seconds" | Move to the next one every | `AppSettings.SwitchStatusInterval` |
| 168 | H2 | When you go quiet | |
| 170 | help | Stop moving for long enough and MagicChatbox swaps your status for an away message, so nobody has to guess whether you are there. | |
| 174 | cb | Show an away message when I stop moving | `Afk.Settings.EnableAfkDetection` |
| 181 | cb | Do this while I am in VR too | `Afk.Settings.ActivateInVR` |
| 186-212 | lbl + tb + "seconds" + help `Afk.FriendlyTimeoutTime` | Count me as away after | `Afk.Settings.AfkTimeout` |
| 215 | cb | Write the h, m and s small, like 12ᵐ | `Afk.Settings.UseSmallLettersForDuration` |
| 225 | H2 | Ways of saying you are away | |
| 230 | help | Build as many as you like and switch between them from the side panel. Type \n where you want a new line. | |
| 235-279 | cmb w190 (Flat, `AfkStyles.Styles`) + btns "Duplicate", "Delete", "Save to a file", "Load from a file" | | `AfkStyles.SelectedStyle`, `AddStyleCommand`, `DeleteStyleCommand`, `ExportStylesCommand`, `ImportStylesCommand` |
| 282 | help (warning colour) | `AfkStyles.EditHint` | |
| 309-384 | grid: lbl "Call it" + tb; cb "Starts with" + tb; cb "With the time" + tb; lbl "Without the time" + tb (readonly unless `CanEditSelected`) | | `SelectedStyle.Name`, `.ShowPrefix`/`.Prefix`, `.ShowTime`/`.MessageWithTime`, `.MessageWithoutTime` |
| 388 | prev | "What people will see" | `AfkStyles.PreviewLine` |
| 396-402 | lbl + help | Make fancy text / Type normally, pick a look, then drop it into one of the boxes above. Letters with no fancy version are left as they are. | |
| 405-424 | tb w220 + cmb w130 (Plain, ˢᵘᵖᵉʳˢᶜʳⁱᵖᵗ, ꜱᴍᴀʟʟ ᴄᴀᴩꜱ, 𝗯𝗼𝗹𝗱, 𝘪𝘵𝘢𝘭𝘪𝘤, 𝚖𝚘𝚗𝚘, ｗｉｄｅ) | | `AfkStyles.ComposerInput`, `ComposerStyle` |
| 429-446 | output box (bg SurfaceButtonDark r6): Comfortaa 15 `ComposerOutput` + help `ComposerCost` | | |
| 449-474 | btns "Use it with the time", "Use it without the time", "Use it at the start" | | `ApplyComposerToCommand` WithTime/WithoutTime/Prefix |
| 477-499 | (gate `AppState.BussyBoysMode`) H2 "Bussy Boys"; cb "Show my status and my away message at the same time" `TimeSettings.BussyBoysMultiMODE`; cb "Count up from a date of my choosing ↴" `BussyBoysDateEnable`; DatePicker w250 `BussyBoysDate` | | |

### 6.3 MediaLink options (`MediaLinkSection.xaml`, `Settings_MediaLink`, "Learn more")
| line | control | text | binding |
|---|---|---|---|
| 62-64 | H2 + help | The basics / Media link follows whatever Windows is playing - a browser tab, a local player, anything with media keys - and puts it in your chatbox. | |
| 66 | cb | Show a music icon in front | `AppSettings.PrefixIconMusic` |
| 69 | cb (gate PrefixIconMusic) | Swap it for a pause icon while the music is paused | `MediaLinkSettings.PauseIconMusic` |
| 80-81 | H2 + help | Show it briefly, then hide it / Announce each new song for a few seconds and then give the room back to your other integrations, instead of showing the song the whole time it plays. | |
| 82 | cb | Only show the song when it changes | `MediaLinkSettings.ShowOnlyOnChange` |
| 89-104 | lbl + tb w40 + "seconds" (gate ShowOnlyOnChange) | Hide it again after | `MediaLinkSettings.TransientDuration` |
| 111-112 | H2 + help | Icons and wording / The line reads: icon, then these words, then the song, then the separator, then the artist. Leave an icon blank to hide it. | |
| 113 | cb | Show a stop icon when the music has stopped | `MediaLinkSettings.ShowStopIcon` |
| 118-153 | tb w40 "Playing", tb w40 "Paused", tb w40 "Stopped" (gate ShowStopIcon), tb w70 "Between song and artist" | | `IconPlay`, `IconPause`, `IconStop`, `Separator` |
| 155 | help | Type \n anywhere in a separator or in the words below to break the line there. | |
| 157-182 | lbl w140 + tb w140 ×2 | Words while playing / Words while paused | `TextPlaying`, `TextPaused` |
| 184 | cb | SHOW IT ALL IN CAPITALS | `MediaLinkSettings.UpperCase` |
| 192-194 | H2 + help | Which player to follow / You can pick a player by hand on the Integrations page. These decide when MagicChatbox picks for you. | |
| 196 | cb | Follow whichever player starts playing | `MediaLinkSettings.AutoSwitch` |
| 202 | help | This also has to be switched on for Media link on the Integrations page before it does anything. | |
| 203 | cb | Start following a player the moment it opens | `MediaLinkSettings.AutoSwitchSpawn` |
| 211-229 | lbl + tb + "seconds after it closes" | Forget a player | `MediaLinkSettings.SessionTimeout` |
| 236-238 | H2 + help | Long song names / The chatbox line is 144 characters, and a line that goes over is dropped rather than clipped - so one song with a long list of artists can take the whole thing off screen. | |
| 240 | cb | Shorten instead of dropping the song | `MediaLinkSettings.ShortenToFit` |
| 244 | help | Trims the guest credits first, then the extra artists - "Ariana Grande, Doja Cat, Megan Thee Stallion" becomes "Ariana Grande +2" - and only shortens the title itself as a last resort. This is tried before the progress bar is made smaller, so the bar survives the spare names. | |
| 246 | cb | Tidy up video titles | `MediaLinkSettings.TidyTitles` |
| 250 | help | Browsers report a video's full title, so YouTube arrives as "Rick Astley - Never Gonna Give You Up (Official Music Video)" with the channel name repeated. This drops the upload noise and the duplicated artist, leaving "Never Gonna Give You Up". Live, Remix, Acoustic and the like are always kept. | |
| 256-258 | H2 + lbl | How far through the song / What to show | |
| 260 | cmb w230 | items: "Just the times, in small raised digits", "A progress bar", "Nothing" (`MediaLinkTimeSeekbar`) | `MediaLinkSettings.TimeSeekStyle` |
| 275 | cb (gate NumbersAndSeekBar, hidden when None) | Use a shorter progress bar when the line runs out of room | `MediaLinkSettings.AutoDowngradeSeekbar` |
| 282-294 | lbl + cmb (display `StyleName`) | Which progress bar | `MediaLink.SelectedMediaLinkSeekbarStyle` |
| 296-359 | btns "Make my own" (Add.png), delete ✕ (CancelEditbutton, hidden for SystemDefault), 📥 "Load progress bars someone shared with you", 📤 "Save the ones you made to a file you can share" | | `AddSeekbarStyleCommand`, `DeleteSeekbarStyleCommand`, `ImportSeekbarStylesCommand`, `ExportSeekbarStylesCommand` |
| 365 | prev | caption `SeekbarPreviewCaption` | `SeekbarPreview` |
| 367-481 | nested card (disabled for system defaults): lbl "The characters it is drawn with"; "Played" tb w30 (18px), "Where you are" tb, "Still to go" tb; "Mark before" tb w30, "Mark after" tb w30; "How many characters wide" tb; cbs "Show the times as well as the bar", "Put the marks around the bar only, not around the times as well", "Write the times in small raised digits", "Put a space between the times and the bar", "Put a space next to the marks", "Put the bar on the line above the song name" | | `SelectedMediaLinkSeekbarStyle.FilledCharacter/MiddleCharacter/NonFilledCharacter/TimePrefix/TimeSuffix/ProgressBarLength/DisplayTime/TimePreSuffixOnTheInside/ShowTimeInSuperscript/SpaceAgainObjects/SpaceBetweenPreSuffixAndTime/ProgressBarOnTop` |

### 6.4 Spotify options (`SpotifySection.xaml`, `Settings_Spotify`)
| line | control | text | binding |
|---|---|---|---|
| 40-73 | beta banner (border `#735A41`, warning text 13px) | 🧪 Still being tested: talking to Spotify directly is new in this version. Please report anything that goes wrong on [GitHub] or in our [Discord server]. | |
| 78-129 | btns h30: "Connect Spotify" (spotify_ico) / "Disconnect Spotify" / "Check Spotify now" | | `ConnectSpotify_Click`, `DisconnectSpotifyCommand`, `RefreshSpotifyCommand` (gates `Display.IsConnected`) |
| 131 | help | `StatusText` | |
| 135-161 | warning box (bg `#33FFC107`): "★ The play, pause and skip buttons need Spotify Premium." + help "They also need Spotify to be open somewhere - your phone, the desktop app or the web player. If nothing happens when you press them, start Spotify there first." + `Display.ErrorText` | | |
| 167-171 | H2 + help | Setting up the connection / MagicChatbox never sees your Spotify password. Pressing Connect Spotify opens your browser, you say yes there, and Spotify hands back a key that only lets this app read what you are playing. | |
| 173-192 | lbl w118 "Return address" + tb w276 readonly + btn "Copy" w70 | | `RedirectUri`, `CopyRedirectUriCommand` |
| 194 | help | This is where Spotify sends you back to after you say yes. Copy it into the "Redirect URI" box of your app on the Spotify Developer Dashboard, or the connection will be refused. | |
| 198 | cb | Connect again by itself when MagicChatbox starts | `Settings.AutoConnectOnStartup` |
| 206-210 | H2 + help | When Spotify and Media link are both on / Media link follows anything Windows plays, and that includes Spotify - so with both switched on the same song can end up in the chatbox twice. This decides what happens then. | |
| 211 | cmb w270 | "Ask me the first time it happens", "Show Spotify only", "Show both, even if that repeats the song" | `Settings.MediaLinkCoexistence` |
| 228-236 | H2 + help ×2 | What the line says / Write the line however you like. Anything in curly brackets is swapped for the real thing as the song plays; everything else is printed as you typed it. Pick a ready-made one on the right if you would rather not. / You can use: {play_icon}, {title}, {artist}, {album}, {device}, {volume}, {progress}, {seekbar}, {elapsed}, {duration}, {remaining}, {percent}, {liked_icon}, {explicit_icon}, {shuffle_icon}, {repeat_icon}, {queue}, {separator} | |
| 237 | btn w140 h25 | Copy that list | `CopyTemplateTokensCommand` |
| 246-272 | tb w420 + cmb w130 (`TemplatePresets`, display Name) | | `Settings.OutputTemplate`, `SelectedPresetName` |
| 274-284 | lbl + tb w420 | And when Party mode is on | `Settings.PartyTemplate` |
| 288 | prev | "With nothing playing, this is what would go out" | `OutputPreview` |
| 294-298 | H2 + help | Icons, and what to say instead / The little pieces the curly brackets above are swapped for. Leave an icon blank to hide it. | |
| 300-323 | tb w46 ×5 "Playing","Paused","Explicit","Liked","Not liked"; tb w80 "Between pieces" | | `IconPlaying`, `IconPaused`, `IconExplicit`, `IconLiked`, `IconUnliked`, `Separator` |
| 326-341 | tb w190 "Say this when not connected", tb w190 "...when nothing is playing", tb w150 "...when paused", tb w120 "...when hiding what you play" | | `DisconnectedText`, `EmptyText`, `PausedText`, `PrivacyHiddenText` |
| 348-352 | H2 + help | What to show, and what to keep to yourself / These are two separate switches for each piece of the song, and a piece only appears when both of them are on. The first row is what MagicChatbox is allowed to say at all; the second is what this particular line includes. | |
| 354-365 | lbl "Allowed to leave your PC" + cbs Song name, Artist, Album, Which speaker or phone, Volume, Playing or paused | | `AllowTrackTitleInOutput`, `AllowArtistInOutput`, `AllowAlbumInOutput`, `AllowDeviceInOutput`, `AllowVolumeInOutput`, `AllowPlaybackStateInOutput` |
| 366 | cb | Hide it all for now, and say the words above instead | `Settings.PrivacyMode` |
| 370-385 | lbl "Included in the line" + cbs Song name, Artist, Album, How far through, Which speaker or phone, Volume, Explicit mark, Whether you liked it, Shuffle mark, Repeat mark | | `ShowTitle`, `ShowArtist`, `ShowAlbum`, `ShowProgress`, `ShowDevice`, `ShowVolume`, `ShowExplicit`, `ShowLiked`, `ShowShuffle`, `ShowRepeat` |
| 386 | cb | Use the Party mode line instead, for when you are the one picking the music | `Settings.PartyModeEnabled` |
| 391-407 | lbl "How to show it" + cmb w230 ("Nothing", "Just the times, as plain text", "Just the times, in small raised digits", "A progress bar") + cb "Use a shorter progress bar when the line runs out of room" | | `Settings.ProgressDisplayMode`, `Settings.AutoDowngradeProgress` |
| 413-422 | lbl "Which progress bar" + cmb w280 (gate `IsSeekbarMode`) | | `SelectedSeekbarStyle` |
| 424 | help | Spotify shares its progress bars with Media link. Make your own, or load someone else's, in the Media link section just above. | |
| 433-457 | H2 "Show it briefly, then hide it" + help "…Media link has its own copy of this in its own section." + cb "Only show the song when it changes" + "Hide it again after" tb w40 "seconds" | | `Settings.ShowOnlyOnChange`, `Settings.TransientDuration` |
| 464-468 | H2 + help | The Spotify panel in MagicChatbox / This is about the panel inside this app, not about your chatbox. | |
| 470-473 | cbs | Show how far through / Show which speaker or phone / Show the play and skip buttons / Show the volume slider | `ShowWidgetProgress`, `ShowWidgetDevice`, `ShowWidgetControls`, `ShowWidgetVolume` |
| 476-511 | lbl "How often to ask Spotify what is playing" + help "Smaller numbers keep the line more up to date and use more of your connection. Spotify starts refusing if you ask far too often." + "While something is playing, every" tb w50 "seconds" "otherwise, every" tb w50 "seconds" | | `PollingIntervalSeconds`, `IdlePollingIntervalSeconds` |

### 6.5 Lyrics (MediaLink & Spotify) (`LyricsSection.xaml`, `Settings_Lyrics`)
| line | control | text | binding |
|---|---|---|---|
| 44-48 | H2 + help | Which players to follow / Lyrics ride along with the music you are already showing, and each player has its own switch. The same two switches sit on the Spotify and Media link cards on the Integrations page. | |
| 51-67 | tgl h22 `GlowyToggleButtonLyrics` "Spotify", "Media link" | | `LyricsFromSpotify`, `LyricsFromMediaLink` |
| 70-88 | lbl "Show the words while I am on" + DESKTOP / VR route chips | | `IntegrationSettings.IntgrLyrics_DESKTOP`, `IntgrLyrics_VR` |
| 91 | help | `HostSummary` | |
| 100-116 | H2 "Now playing"; help `Display.NowPlaying`; prev `Display.CurrentLine`; help `Display.StatusText`; help "Position from {0}" `Display.PositionSource` | | |
| 122-126 | H2 + help | Timing / Community timings vary between tracks. Nudge until the words land with the music. | |
| 129-173 | btns 52×26: "−500", "−100", "Reset" (w60, tip "Back to the +100 ms the app ships with."), "+100", "+500" + help `OffsetSummary` | | `NudgeOffsetCommand` ±500/±100, `ResetOffsetCommand` |
| 179 | help | The first number is when a break starts: once the singing stops for longer than that, the song counts as being in an instrumental break. The second is how long the last line you heard stays up before the ♪ marker replaces it. | |
| 186 | `LyricsTimingRowTemplate` steppers "Gap" −/value s/+ and "Hold" −/value s/+ (26×26 buttons) | | `NudgeGapThresholdCommand`, `Settings.GapThresholdSeconds`, `NudgeLineHoldCommand`, `Settings.LineHoldSeconds` |
| 188 | help (warning) | `TimingWarning` | |
| 199-203 | H2 + help | How it looks / Long lines scroll across the space that is left. These two show the same words with plenty of room and with almost none. | |
| 205-206 | prev ×2 | "With plenty of room" / "With almost none" | `RoomyPreview`, `TightPreview` |
| 208-220 | cbs | Show a ♪ before the lyric / Raise (backing vocals) to ᵇᵃᶜᵏⁱⁿᵍ ᵛᵒᶜᵃˡˢ / Show a marker during intros and instrumental breaks | `Settings.ShowNoteIcon`, `SuperscriptAsides`, `ShowGapMarker` |
| 226-243 | lbl w210 "Which marker" + cmb w260 (gate ShowGapMarker): "Single note ♪", "Bouncing notes ♪ ♫ ♬", "Trailing dots ♪ · · ·", "Vinyl ◐ ◓ ◑ ◒", "Pulse · • ●", "Bouncing ball ·●··" | | `Settings.InstrumentalMarker` |
| 247-260 | lbl w210 + tb w60 + "characters" | Skip lines shorter than | `Settings.MinimumCharacters` |
| 267-271 | H2 + help | Finding the right lyrics / A song can be in the database several times over - the original, the remixes, the live take - all sharing a name and often a length. These decide how sure the match has to be before the words go on screen. | |
| 274-290 | lbl w210 + cmb w260: "Relaxed - more songs, more wrong guesses", "Balanced - the usual choice", "Strict - only confident matches" | How sure the match must be | `Settings.MatchStrictness` |
| 293-301 | cb "Search again without the version in the title" + help ""Song (Some Remix)" is searched for again as "Song", because a database often files a version under the plain name. Anything found that way has to match the running time closely, so this widens what can be found without loosening what counts as a match." | | `Settings.BroadenSearchWhenNoMatch` |
| 307-324 | H2 "Sharing space with the song title" + help "The chatbox holds 144 characters for every integration together. Hiding the title while a lyric shows roughly doubles the room the words get." + cmb w280: "Show both", "Hide the song title while a lyric shows" | | `Settings.Coexistence` |
| 330-353 | H2 "Where lyrics come from" + help "Your own .lrc files are used first when a folder is set. Anything not found there is looked up on LRCLIB, a free community lyrics database. Lyrics are contributed by its users and MagicChatBox does not own them." + cb "Use my own .lrc files first" + tb w300 + btn "Browse" w80 | | `Settings.UseLocalFiles`, `Settings.LocalLyricsFolder`, `BrowseLocalFolderCommand` |

### 6.6 Twitch options (`TwitchSection.xaml`, `Settings_Twitch`)
| line | control | text | binding |
|---|---|---|---|
| 48 | btn | ⚙ Setup Twitch Integration | `SetupTwitch_click` |
| 61-62 | lbl + tb w200 | Channel name | `Modules.Twitch.Settings.ChannelName` |
| 71-114 | lbl "Client ID" + Editbutton pencil (admin.png) + masked readonly tb / editable tb | | `ClientIdEditing`, `ClientId` |
| 133-174 | lbl "Access token" + same pattern | | `AccessTokenEditing`, `AccessToken` |
| 193 | help | Twitch has to let MagicChatbox read your channel. Press '⚙ Setup Twitch Integration' above and it fills both boxes in for you. | |
| 197-220 | lbl "Ask Twitch for new numbers every (seconds)" + tb w40 + btn "Sync" + `LastSyncDisplay` 13px | | `UpdateIntervalSeconds`, `TwitchSyncCommand` |
| 228 | text 13px | `Modules.Twitch.StatusMessage` | |
| 235-239 | H2 + help | What goes in the chatbox / The two boxes below show the finished line, built from stand-in numbers so you can see the effect of every switch before you ever go live. | |
| 249-254 | prev ×2 | "While you are live" / "After the stream ends — empty means Twitch shows nothing" | `LivePreview`, `OfflinePreview` |
| 260 | cb | Small raised labels — ᵛⁱᵉʷᵉʳˢ instead of viewers | `UseSmallText` |
| 266-274 | cb + (lbl "Word to use" + tb w120) | Say that you are live | `ShowLiveIndicator`, `LivePrefix` |
| 284-292 | cb + (lbl "Word before the game" + tb w120) | Show what you are playing | `ShowGameName`, `GamePrefix` |
| 302-327 | cb "Show how many people are watching"; cb "Put a word in front of that number"; lbl "Word before the viewer count" + tb w120; cb "Shorten big viewer numbers — 1234 becomes 1.23K" | | `ShowViewerCount`, `ShowViewerLabel`, `ViewerLabel`, `ViewerCountCompact` |
| 334-359 | cb "Show your follower total"; cb "Put a word in front of that number"; lbl "Word before the follower count" + tb; cb "Shorten big follower numbers — 8420 becomes 8.42K" | | `ShowFollowerCount`, `ShowFollowerLabel`, `FollowerLabel`, `FollowerCountCompact` |
| 366 | text 13px warning | `FollowerScopeWarning` | |
| 373-381 | cb + lbl "Word before the title" + tb w120 | Show your stream title | `ShowStreamTitle`, `StreamTitlePrefix` |
| 391-399 | cb + lbl "Word before the channel name" + tb w120 | Show your channel name | `ShowChannelName`, `ChannelPrefix` |
| 409-424 | lbl "What sits between each part" + tb w120 (gate NOT TemplateHasValue) / help "Your own layout below decides the spacing, so this box is not used while it has anything in it." | | `Separator` |
| 429-447 | lbl "Write your own layout (optional)" + tb w480 + help "Leave this empty and the switches above build the line for you. To arrange it yourself, type any of these where you want that piece to appear — the preview updates as you type." + token list help ({live} the live word · {game} · {gameWithLabel} · {viewers} · {viewerCount} · {viewerLabel} · {followers} · {followerCount} · {followerLabel} · {title} · {titleWithLabel} · {channel} · {channelWithLabel} · {status} · \n starts a new line) | | `Template` |
| 452-465 | lbl "Show this when the stream is over" + tb w240 + help "Leave it empty to drop Twitch out of the chatbox entirely once you stop streaming." | | `OfflineMessage` |
| 469-473 | H2 + help | Post to your Twitch chat / These two send a message to your own Twitch chat. They do not go in the VRChat chatbox. | |
| 492-562 | H2 "Announcements"; help "A highlighted message in your Twitch chat. Twitch only allows it if you gave MagicChatbox permission to send announcements during setup."; cb "Let me send announcements"; lbl "Message" + tb + btn "Send"; lbl "Colour" + cmb w160 (Primary (Twitch purple), Blue, Green, Orange, Purple); status 13px | | `AnnouncementsEnabled`, `AnnouncementMessage`, `SendAnnouncementCommand`, `AnnouncementColor`, `AnnouncementStatusMessage` |
| 586-676 | H2 "Shoutouts"; help "Twitch's built-in way of pointing your viewers at another streamer. …permission to send shoutouts during setup."; cb "Let me send shoutouts"; lbl "Channel to shout out" + tb + btn "Send"; cb "Post a highlighted message about them too"; lbl "What that message says" + tb; help "Type {user} where their name should go and {url} where their link should go."; lbl "Colour" + cmb w160; status | | `ShoutoutsEnabled`, `ShoutoutTarget`, `SendShoutoutCommand`, `ShoutoutAlsoAnnounce`, `ShoutoutAnnouncementTemplate`, `ShoutoutAnnouncementColor`, `ShoutoutStatusMessage` |

### 6.7 TikTok options (`TikTokLiveSection.xaml`, `Settings_TikTokLive`, VM prefix `TikTokSettings.`)
| line | control | text | binding |
|---|---|---|---|
| 54-55 | prev + help | "What TikTok puts in your chatbox" / Built from stand-in numbers, so it works before you go live. It follows every switch below as you change them. | `CombinedSamplePreview` |
| 62-63 | H2 + help | Your follower count / This reads the follower number off your public TikTok page. TikTok can slow it down or change the page, so the last good number is kept if a check fails. | |
| 69 | cb | Show my follower count in the chatbox | `ShowProfileSummary` |
| 75-95 | lbl "Your TikTok name" + tb w220 + btn "Check now"; lbl "Check again every (minutes)" + tb w70 | | `ProfileUserName`, `RefreshProfileCommand`, `ProfileRefreshMinutes` |
| 105 | help | Type @name, just the name, or paste the address of your TikTok page. Leave it blank and the name of whoever is hosting the live room is used instead. | |
| 122-148 | status texts "Followers: {0}", `ProfileStatusText`, "Live right now", `ProfilePreview` | | |
| 159-175 | lbl "How that line reads" + tb w520 + help tokens ({profile} · {display_name} · {followers} · {follower_count} · {updated}) + prev "The follower line on its own" | | `ProfileTemplate`, `ProfileSamplePreview` |
| 177-218 | H2 "When your follower count goes up"; help "MagicChatbox compares each check with the one before it. TikTok does not say who the new follower was, so the message can only report how many you gained."; cb "Say something when I gain followers"; help tokens ({change} · {followers} · {follower_count} · {profile} · {display_name} · {change_count} · {updated}); tb w520; "Keep it on screen for" tb w60 "seconds."; "Last one shown: {0}" | | `ShowProfileFollowerChangeEvents`, `ProfileFollowerChangeTemplate`, `ProfileFollowerChangeDurationSeconds` |
| 230-272 | H2 "Showing your follower count and your live room together"; help; cb "Show both on one line"; lbl "Which one comes first" + cmb w190 ("Profile, then LIVE", "LIVE, then profile"); lbl "What goes between them" + tb w110; help "Type \n to start a new line instead. …"; "In the chatbox right now: {0}" | | `CombineProfileAndLive`, `OutputOrder`, `CombinedOutputSeparator` |
| 283-289 | H2 "Your live room" + help "Separate from the follower count above. Turn this on only when you want MagicChatbox to join your live room and watch for viewers, likes, comments and gifts." + cb "Connect to my live room" | | `EnableLiveConnector` |
| 301-307 | warning text "Still being tested. This uses a way into live rooms that TikTok does not officially offer, so it can stop working without warning. No TikTok password is asked for or stored — only your public name is used." + cb "I understand this may break at any time" | | `ExperimentalEnabled` |
| 320-340 | status: `StatusText`, "Host: {0}", "Viewers: {0}", "Likes: {0}", "Last thing that happened: {0}" | | |
| 350-359 | btn "Connect" / "Disconnect" | | `StartCommand`, `StopCommand` |
| 374-409 | lbl "Name of the live room host" tb w220; "Give up after (seconds)" tb w70; "Try again after (seconds)" tb w70; help "Leave the host name blank and your own TikTok name from above is used."; cb "Connect to the live room as soon as MagicChatbox starts" | | `HostUserName`, `ConnectionTimeoutSeconds`, `ReconnectDelaySeconds`, `AutoConnectOnStartup` |
| 413-451 | H2 "What the live room puts in the chatbox"; cmb w200 ("LIVE summary only", "LIVE events, then summary", "LIVE events only"); help; cb "Shorten big viewer and follower numbers — 12300 becomes 12.3ᵏ"; cb "Shorten the like count — 15600 becomes 15.6ᵏ"; lbl "How the live room line reads" + tb w520 + tokens ({live} · {host} · {viewers} · {viewer_count} · {likes} · {like_count} · {room}); prev "The live room line on its own" | | `DisplayMode`, `CompactViewerCount`, `CompactLikeCount`, `SummaryTemplate`, `LiveSamplePreview` |
| 458-567 | H2 "Messages that pop up for a few seconds"; help; lbl "How long each one stays (seconds)" tb w70; cb "Say when someone follows you" + tb w420; cb "Show comments from the live room" + tb + prev "A comment as it would appear"; cb "Say when someone sends a gift" + tb; cb "Say when the likes come in fast" + tb + "Only when someone sends at least" tb w60 "likes at once."; cb "Say when the viewer count hits a round number" + tb + "Every this many viewers" tb w70 + "Keep it on screen for (seconds)" tb w70 | | `EventDurationSeconds`, `ShowFollowEvents`/`FollowTemplate`, `ShowCommentEvents`/`CommentTemplate`/`CommentSamplePreview`, `ShowGiftEvents`/`GiftTemplate`, `ShowLikeEvents`/`LikeTemplate`/`LikeBurstThreshold`, `ShowViewerMilestones`/`ViewerMilestoneTemplate`/`ViewerCountMilestoneStep`/`ViewerMilestoneDurationSeconds` |

### 6.8 Discord voice options (`DiscordSection.xaml`, `Settings_Discord`, prefix `Modules.Discord.Settings.`)
| line | control | text | binding |
|---|---|---|---|
| 62-118 | feature explainer cards: "What each feature does"; "🎮  Rich Presence" — "Puts what you are doing in VRChat under your name in Discord, for your friends to see. The RICH toggle on the integrations page turns it on." "✔  No setup required"; "🎙  Who is talking" — "Puts the names of whoever is speaking in your Discord call into your VRChat chatbox. The DESKTOP and VR toggles turn it on." "⚠  Needs Discord's permission, and Discord does not always grant it" | | |
| 138-201 | btn "Connect with Discord" (Discord.png) / "Connected with Discord" (yes.png) + disconnect ✕ (DisconnectPulsoid style) | | `ConnectDiscordCommand`, `DisconnectDiscordCommand`, gate `HasSavedToken` |
| 213 | help | `StatusText` | |
| 221-345 | H2 "🎙  Setting up who-is-talking (you only do this once)"; help; "Step 1 — Choose a Discord Application ID" …; "Step 2 — Add the Redirect URI" … "⚠  The URI must match exactly — copy it using the button below."; "Step 3 — Connect" … | | |
| 356-426 | "Application ID" tb (readonly/edit) + tgl "Edit" (`Status_Toggle_style`) + btn "Open Developer Portal"; "Redirect URI" tb w260 readonly + btn "Copy" + btn "Check port" + `RedirectPortStatus` | | `VoiceClientId`, `VoiceClientIdEditing`, `OpenDiscordDeveloperPortalCommand`, `RedirectUri`, `CopyRedirectUriCommand`, `CheckRedirectPortCommand` |
| 438-441 | cb + help | Connect to Discord as soon as MagicChatbox starts / Only works once you have connected once by hand, above. | `AutoConnectOnStartup` |
| 450-510 | H2 "🌐 What your Discord profile says you are doing"; help; cb "Show this on my Discord profile"; lbl "Start from a ready-made one" + cmb (`RpPresetNames`); "First line" tb; "Second line" tb; token help ({world} · {count} · {type} · {region} · {status} · {mode} · {time} · {media} · {unique} · {peak} · {worlds} · {heart_rate} · {cpu} · {window} · {weather} · {network} · {viewers} · {vr_battery}; each line holds 128 characters); cb "Show how long I have been in this world"; cb "Give friends a Join button when the world is open to everyone"; help "A join link is only ever made for public worlds. …"; "💡 This stops on its own whenever the master switch is off." | | `EnableRichPresence`, `SelectedRpPresetName`, `RichPresenceDetails`, `RichPresenceState`, `RichPresenceShowElapsed`, `RichPresenceShowJoinButton` |
| 522-561 | H2 "What goes in your VRChat chatbox"; tb w340 + cmb w130 (`PresetNames`); token help ({channel} · {count} · {speaking} · {speaking_count} · {mute_emoji} · {mute_state} · {voice_state} · \n); prev "While you are in a call" / "When you are not in a call — empty means Discord shows nothing"; btns "Copy the list", "Copy the preview" | | `Template`, `SelectedPresetName`, `OutputPreview`, `NotInVcPreview` |
| 574-586 | lbl + sl 1/10/1 + value | How many names to list at once | `MaxSpeakingUsersToShow` |
| 596-621 | lbl + help "People pause between words. Waiting a moment stops names blinking in and out every time somebody takes a breath." + sl 200/2000/100 + value "ms" | Wait this long before dropping a name | `SpeakerDebounceMs` |
| 631-635 | cbs | Leave my own name out of the list / Show only how many are talking, never their names | `HideSelfFromSpeakers`, `ShowUserCountOnly` |
| 643-659 | lbl "Say this when the call is quiet" tb w200; lbl "Say this when you are not in a call" + help "Leave it empty to drop Discord out of the chatbox entirely whenever you are not in a call." + tb w200 | | `EmptySpeakingText`, `NotInVcText` |
| 672-705 | cb "Show a small icon when my mic or sound is off" + help "Only appears where your layout has {mute_emoji} in it." + "Mic off:" tb w45 "Sound off:" tb w45 | | `ShowMuteDeafenEmoji`, `MuteEmoji`, `DeafenEmoji` |
| 717-737 | H2 "Let your avatar react"; help; cb "Tell my avatar when my mic or sound is off" + help "/avatar/parameters/DiscordMuted (true or false) /avatar/parameters/DiscordDeafened (true or false)"; cb "Tell my avatar about the call I am in" + help "/avatar/parameters/DiscordInVC … DiscordVCCount … DiscordSpeaking" | | `SendMuteDeafenOsc`, `SendVoiceStateOsc` |

### 6.9 VRChat radar options (`VrcRadarSection.xaml`, `Settings_VrcRadar`, prefix `RadarSettings.`)
| line | control | text | binding |
|---|---|---|---|
| 64-102 | live card: 🌎 `CurrentWorldName` ("Not in a world"), 👥 `PlayerCount`, `InstanceType`, `Region`; btn "▶ Start" / "⏹ Stop" | | `StartRadarCommand`, `StopRadarCommand` |
| 115-129 | H2 "What the radar puts in the chatbox" + cmb w280 ("Always show where I am", "Only speak up when something happens", "Show where I am, and interrupt for events", "Only speak up when people come and go", "Just the world name and how many people") + help "The first three all show where you are and briefly hand the line over whenever something happens. The fourth shows nothing until something happens. The last one ignores the layout you write further down and shows a short fixed line instead." | | `DisplayMode` |
| 134-136 | H2 "What to say about the room"; cbs "Say whether the room is public, private or a group", "Say which part of the world the room is hosted in" | | `ShowInstanceType`, `ShowRegion` |
| 138-142 | H2 "What to say when something happens"; cbs "Say when someone walks in", "Say when someone leaves", "Say when I take a photo", "Show how far a world has loaded" | | `AnnounceJoins`, `AnnounceLeaves`, `AnnounceScreenshots`, `ShowWorldDownload` |
| 144-197 | H2 "Knowing when you have stopped playing"; cb "Also check whether VRChat is still open"; help "…It needs the Window activity permission."; "VRChat is: open/not open"; "Call it a night after nothing happens for:" sl 5/90/5 "{0} min"; help "Once nothing at all has happened for this long, MagicChatbox decides your session is over and starts the counters again next time." | | `UseWindowDetection`, `SessionTimeoutMinutes` |
| 203-247 | H2 "Running into the same people again"; cbs "Notice people who turn up in more than one room with me", "Keep a list of them here while I play"; help "Nothing is sent anywhere — the list is only in this window and it is thrown away when you close MagicChatbox. It is off unless you turn it on."; "Only count it if it happens within (minutes):" tb w50; "Only list people I have met at least:" sl 1/10/1 "{0}×" | | `DetectSeenAgain`, `ShowEncounterTable`, `SeenAgainWindowMinutes`, `MinEncounterCount` |
| 307-416 | H2 "How your session is going": stat tiles (18px numbers) Worlds / People met / Busiest room / Joins / Leaves; cb "Put these numbers in the chatbox each time I change world"; "Keep it on screen for:" sl 5/120/5 "s" | | `WorldsVisited`, `UniquePlayersCount`, `PeakPlayerCountThisSession`, `TotalJoinEvents`, `TotalLeaveEvents`, `ShowSessionStatsInChatbox`, `SessionStatsDuration` |
| 426-449 | H2 "Pop-ups on your desktop"; cbs "Tell me when someone turns up in my next world too", "Tell me when VRChat hides an avatar for being too heavy"; "Keep it on screen for:" sl 3/20/1 "s" | | `ShowSeenAgainNotification`, `WarnOnAvatarBlocked`, `AvatarBlockedDuration` |
| 459-611 | H2 "How each line reads" + token help ({world} · {count} · {peak} · {peak_session} · {type} · {region} · {owner} · {master} · {session_time} · {app_session} · {offline} · {worlds} · {players} · {user} · {size} and {speed} · \n); rows "Where I am:" tb + cmb w100 presets; "Someone walks in:", "Someone leaves:", "I take a photo:", "A world is loading:", "I run into someone again:", "How my session went:", "An avatar was hidden:" tbs | | `TemplateWorld`/`SelectedWorldPresetName`, `TemplateJoin`, `TemplateLeave`, `TemplateScreenshot`, `TemplateDownload`, `TemplateSeenAgain`, `TemplateSessionStats`, `TemplateAvatarBlocked` |
| 625-636 | prev ×4: "Where I am — as it would look in a room of 14", "Someone walking in", "How my session went", "In your chatbox right now"; "Icon shown when I own the room:" tb w60 | | `WorldSamplePreview`, `JoinSamplePreview`, `SessionStatsSamplePreview`, `Modules.VrcRadar.CurrentOutputPreview`, `MasterIcon` |
| 643-658 | H2 "Let your avatar react" + help; cb "Set off a camera flash when I take a photo"; "Name the avatar listens for:" tb w250 | | `SendCameraFlashOsc`, `OscCameraFlashParam` |
| 667-679 | H2 "Going easy on your PC"; "How much of the old log to read at startup (MB):" tb w60 "(1–200)" | | `MaxBackfillSizeMb` |

### 6.10 Time options (`TimeOptionsSection.xaml`, `Settings_Time`, prefix `TimeSettings.`)
| line | control | text | binding |
|---|---|---|---|
| 49 | prev | "What goes in your chatbox" | `OutputPreview` |
| 55 | cb | Put a small "my time" label in front of the clock | `PrefixTime` |
| 61 | cb | Use the 24-hour clock (18:30 instead of 06:30 PM) | `Time24H` |
| 65-69 | cb + help | Write the time the way Windows does on this PC / Off means the same wording everywhere, whatever region this PC is set to. | `UseSystemCulture` |
| 70-74 | cb + help | Follow daylight saving time / Switches with the daylight saving period of the time zone in use. Turn off to stay on standard time all year. | `UseDaylightSavingTime` |
| 75-94 | cb + cmb w183 (`TimezoneFriendlyNames`, UTC/GMT/EST/CST/MST/PST/AKST/HST/CET/EET/IST…) + help "The chatbox shows this zone's clock, not this PC's." | Show a different time zone instead of mine | `TimeShowTimeZone`, `SelectedTimeZone` |

### 6.11 Weather options (`WeatherSection.xaml`, `Settings_Weather`, prefix `WeatherSettings.`)
| line | control | text | binding |
|---|---|---|---|
| 60 | prev | "What goes in your chatbox (sample weather)" | `OutputPreview` |
| 67-87 | lbl "Check the weather every (minutes)" tb w40 + btn "Check now" + last sync | | `WeatherUpdateIntervalMinutes`, `WeatherSyncCommand` |
| 95-107 | lbl "Which place to report" + cmb w220 ("Custom city", "Custom coordinates", "IP-based (requires consent)") | | `WeatherLocationMode` |
| 112-118 | cb "Work out my place from my internet connection (uses ipapi.co)" (gate IPBased); help "You have not allowed this, so the fallback city below is used instead." | | `WeatherAllowIPLocation` |
| 125-191 | lbl "City" / "City to fall back on" + pencil edit + masked/editable tb + help "Default: London" | | `WeatherLocationEditing`, `WeatherLocationCity` |
| 197-218 | lbl "Coordinates (latitude, longitude)" tb w80 ×2 + help "Example: 51.5074, -0.1278" | | `WeatherLocationLatitude`, `WeatherLocationLongitude` |
| 223-235 | lbl "One line or two" + cmb w200 ("Single line", "Two lines") | | `WeatherLayoutMode` |
| 240-291 | (gate TemplateIsEmpty) lbl "Which comes first" cmb w200 ("Time first", "Weather first"); "What goes between the clock and the weather" tb w120 + help "This box and 'Which comes first' shape your Discord status. In the chatbox the clock and the weather are separate pieces that the app joins itself, so neither one moves the preview."; "What goes between each weather value" tb w120 + help "Sits between the temperature, the sky, feels-like, wind and humidity." | | `WeatherOrder`, `WeatherSeparator`, `WeatherStatsSeparator` |
| 296-312 | H2 "Write your own line" + help "Type anything you like and drop these in where you want the values: {time}, {weather}, {temp}, {unit}, {tempWithUnit}, {condition}, {humidity}, {wind}, {feels}. Leave it empty to use the boxes above instead." + tb w360 + help "Your line is in charge now, so the separator boxes above are ignored." + "Tip: type \n where you want the rest to start on a new line." | | `WeatherTemplate` |
| 316-322 | H2 "What to include"; cb "Say what the sky is doing (Overcast, Showers)"; cb "Use my own icons and wording for each kind of weather" | | `ShowWeatherCondition`, `WeatherCustomOverridesEnabled` |
| 327-411 | lbl "Your wording" + help "Leave a box empty to keep the standard wording." + per-condition rows (`DisplayLabel`, "Icon" tb, "Words" tb, `WeatherOverrideInput` style) + help "Left box replaces the icon, right box replaces the words." | | `CustomIcon`, `CustomText` |
| 416-421 | cbs | Show a weather icon / Show one decimal place (21.4 instead of 21) | `ShowWeatherEmoji`, `WeatherUseDecimal` |
| 426-471 | lbl "Temperature in" cmb w200 ("Use global unit", "Celsius (C)", "Fahrenheit (F)", "Kelvin (K)", "Rankine (R)", "Réaumur (Ré)"); "And also show, in brackets" cmb w200 ("Nothing, just the one scale", "Celsius (°C)", …); "Wind speed in" cmb w220 ("Use global (based on temperature unit)", "Kilometers per hour (km/h)", "Miles per hour (mph)") | | `WeatherUnitOverride`, `WeatherCompanionScale`, `WeatherWindUnitOverride` |
| 475-485 | cbs | Show humidity / Show wind speed / Show what it feels like | `ShowWeatherHumidity`, `ShowWeatherWind`, `ShowWeatherFeelsLike` |
| 490-499 | H2 "When the weather cannot be fetched" + cmb w200 ("Hide on error", "Keep last value", "Show N/A") | | `WeatherFallbackMode` |

### 6.12 Pulsoid heart rate options (`PulsoidSection.xaml`, `Settings_HeartRate`, "Learn more"; prefix `Modules.Pulsoid.Settings.`)
| line | control | text | binding |
|---|---|---|---|
| 170-256 | promo card: "15% OFF" / "every month on your" / "BRO PLAN" (20px), "Discount applies to new subscriptions only (cancel possible)", info btn, apply btn | | `PulsoidDiscountLearnMoreCommand`, `PulsoidPricingCommand` |
| 277-346 | btn "Connect with Pulsoid" (Pulsoid.png) / "Connected with Pulsoid" (yes.png) + disconnect ✕ | | `ConnectPulsoidCommand`, `DisconnectPulsoidCommand`, gate `Pulsoid.AuthConnected` |
| 354-391 | status: "No device connected", `PulsoidAccessErrorTxt`, `Pulsoid.AuthStatusText`; lbl "Trouble signing in? Paste a token instead" (manual token dialog) | | |
| 407-409 | H2 "What goes in the chatbox" + help "An example beat of 88, with example stats. Yours will differ, but the wording and the length will look like this." + prev | | `PreviewLine` |
| 416-440 | help "Puts a little heart in front of the number, like ❤️ 88." cb "Show a heart in front of the heart rate"; help "Uses a different heart each time the number updates — ❤️ then 💖 then 💗, and so on." cb "Change the heart every beat" | | `MagicHeartIconPrefix`, `MagicHeartRateIcons` |
| 450-550 | H2 "Stats over a longer period"; help "As well as your heart rate right now, you can show what it has been doing over the last day, week or month."; cb "Show these longer-term stats"; help "How far back to look." cmb w100 (24h, 7d, 30d); help "Pick what to show from that period. Each one you add costs room on the line — watch the counter in the preview above."; cbs "Show calories", "Show average heart rate", "Show maximum heart rate", "Show minimum heart rate", "Show how long was recorded", "Say which period it covers — 'duration over 24h'", "Hide the live number and show only these stats", "Put the rising/falling arrow after the stats instead of in front" | | `PulsoidStatsEnabled`, `SelectedStatisticsTimeRange`, `ShowCalories`, `ShowAverageHeartRate`, `ShowMaximumHeartRate`, `ShowMinimumHeartRate`, `ShowDuration`, `ShowStatsTimeRange`, `HideCurrentHeartRate`, `TrendIndicatorBehindStats` |
| 568-631 | H2 "Sending your heart rate to your avatar"; help "Sends the number to VRChat itself, so an avatar built for it can react — a beating heart, a blush, a gauge. This is separate from the chatbox line above."; cb "Send my heart rate to my avatar"; cb "Also send the extras: rising/falling, and the highest, lowest and average"; cb "Send those extras the old way as well, for older avatars"; cb "Even out the number sent to the avatar"; "Average the last" tb "readings together." + help "A chest band sends far more readings per minute than a watch does, so it can be averaged over more of them." | | `IntegrationSettings.IntgrHeartRate_OSC`, `SentMCBHeartrateInfo`, `SentMCBHeartrateInfoLegacy`, `SmoothOSCHeartRate`, `SmoothOSCHeartRateTimeSpan` |
| 651-718 | help "Adds a word next to the number when your heart rate is unusually low or high. The thresholds and the words are yours to set."; cb "Show a word for how hard you are working"; "Below" tb w35 "show" tb; "Above" tb w35 "show" tb | | `ShowTemperatureText`, `LowTemperatureThreshold`, `LowHeartRateText`, `HighTemperatureThreshold`, `HighHeartRateText` |
| 734-815 | help "Adds an arrow when your heart rate is climbing or dropping quickly. Nothing is shown while it is steady."; cb "Show an arrow when it is rising or falling"; "Which arrows to use" cmb w100 (`PulsoidTrendSymbols`, display CombinedTrendSymbol); "Look at the last" tb "readings to decide whether it is rising or falling."; "How big a change counts" sl 0/1 with end labels "Small change"/"Big change" | | `ShowHeartRateTrendIndicator`, `SelectedPulsoidTrendSymbol`, `HeartRateTrendIndicatorSampleRate`, `HeartRateTrendIndicatorSensitivity` |
| 829-859 | help "Averages the last few readings so the number in the chatbox does not jump around." cb "Even out the number in the chatbox"; "Average the last" tb "readings together." | | `SmoothHeartRate`, `SmoothHeartRateTimeSpan` |
| 871-940 | help "Keeps the number from running away during a scare or a hard workout. …"; cb "Cap very high readings"; "Stop counting normally above" tb "BPM"; "Squeeze the rest into a further" tb "BPM"; help "So a reading well above the cap still moves the number a little, instead of sticking flat at the cap." | | `ThrottleHR`, `ThrottleHRMax`, `ThrottleMaxAdditional` |
| 954-985 | help "Adds or subtracts a fixed amount from every reading. …put a minus in front to subtract."; cb "Correct a sensor that reads high or low"; "Change every reading by" tb "BPM" | | `ApplyHeartRateAdjustment`, `HeartRateAdjustment` |
| 998-1028 | help "If the readings stop coming in — the band slipped, the battery died — the heart rate disappears from the chatbox instead of freezing on the last number."; cb "Hide the heart rate when the sensor stops"; "If nothing changes for" tb "seconds, treat the sensor as gone." | | `EnableHeartRateOfflineCheck`, `UnchangedHeartRateTimeoutInSec` |
| 1039-1044 | help "Puts ᵇᵖᵐ after the number, so it reads 88 ᵇᵖᵐ instead of just 88." cb "Show 'bpm' after the number" | | `ShowBPMSuffix` |
| 1054-1059 | help "Older avatars expect the heart rate under a second, older set of names. …" cb "Stop sending the old avatar values" | | `DisableLegacySupport` |
| 1069-1106 | help "Puts a few words in front of the number so it does not appear on its own." cb "Put a label in front of the heart rate"; help "Whatever you type here goes in front. Keep it short — it costs the same room as anything else on the line."; "Label" tb; cb "Put the label on its own line" | | `HeartRateTitle`, `CurrentHeartRateTitle`, `SeparateTitleWithEnter` |

### 6.13 Component stats options (`ComponentStatsSection.xaml`, `Settings_ComponentStats`)
| line | control | text | binding |
|---|---|---|---|
| 57-59 | H2 "What goes in the chatbox" + help "Example readings — yours will differ… If the line runs past 144 characters the app shortens it for you, dropping the longest parts first." + prev | | `PreviewLine` |
| 65-86 | H2 "Everything at once"; help "Replaces the words next to the temperature and power readings with icons. …"; cb "Use icons instead of words — ♨️ 64°C instead of ᵗᵉᵐᵖ 64°C"; lbl "What goes between the readings" tb w60 | | `StatsManager.Settings.UseEmojisForTempAndPower`, `StatsSeparator` |
| 98-107 | help "On a laptop or a machine with two graphics chips, untick this to say which one to read."; cb "Pick the graphics card automatically"; cmb w186 (`StatsManager.GPUList`, gate NOT AutoSelectGPU) | | `AutoSelectGPU`, `SelectedGPU` |
| 123-195 | H2 "Temperature"; help "Tick every scale you want to see. Tick two or more and the reading swaps between them on a timer…"; cbs "Celsius — 64.0°C", "Fahrenheit — 147.2°F", "Kelvin — 337.2K", "Rankine — 606.9°R", "Réaumur — 51.2°Ré"; "Swap to the next scale every" tb w42 "seconds" (gate TemperatureRotates); help "A second scale in brackets after every temperature…"; cmb w220 (Nothing, just the one scale / Celsius (°C) / Fahrenheit (°F) / Kelvin (K) / Rankine (°R) / Réaumur (°Ré)) | | `TemperatureCelsius`, `TemperatureFahrenheit`, `TemperatureKelvin`, `TemperatureRankine`, `TemperatureReaumur`, `TemperatureDisplaySwitchInterval`, `TemperatureCompanionScale` |
| 204-236 | H2 "Processor — {CPUHardwareName}"; cbs "Small raised label — ᶜᵖᵘ instead of CPU:", "Round to whole numbers — 23﹪ instead of 23.4﹪", "Use the chip's own name instead of 'CPU'", "…or a shorter name you choose"; "Call it" tb | | `ComponentStats.CPU_SmallName`, `CPU_NumberTrailingZeros`, `CPU_EnableHardwareTitle`, `CPU_PrefixHardwareTitle`, `CPUCustomHardwareName` |
| 253-364 | H2 "Graphics card — {GPUHardwareName}"; same 4 cbs (ᵍᵖᵘ, 61﹪) + "Call it"; help "Extra readings from the card. Each one adds a few characters to the line."; cbs "Show how hot the card is", "Show the hottest spot on the chip", "Show how much power the card is drawing", "Show how hard the fan is working", "Show the chip's clock speed", "Show the memory clock speed", "Show how hot the card's memory is", "Show how busy the card's memory is"; help "Reads the card's own sensors…"; cb "Read the card's own sensors"; help "Counts only what games and VR are drawing…"; cb "Measure the load from 3D rendering only" | | `GPU_SmallName`, `GPU_NumberTrailingZeros`, `GPU_EnableHardwareTitle`, `GPU_PrefixHardwareTitle`, `GPUCustomHardwareName`, `ComponentStatGPUTempVisible`, `ComponentStatGPUHotSpotVisible`, `ComponentStatGPUWattageVisible`, `StatsManager.Settings.ShowGpuFanSpeed`, `ShowGpuCoreClock`, `ShowGpuMemoryClock`, `ShowGpuMemoryTemperature`, `ShowGpuMemoryLoad`, `EnableVendorGpuSensors`, `GPU3DHook` |
| 374-427 | H2 "Graphics memory — {VRAMHardwareName}"; cbs "Small raised label — ᵛʳᵃᵐ instead of VRAM:", "Round to whole numbers — 6ᵍᵇ instead of 5.7ᵍᵇ", "Show how much there is in total — 5.7/16.0 instead of 5.7", "Use the card's own name instead of 'VRAM'", "…or a shorter name you choose" + "Call it" tb; help; cb "Measure from 3D rendering only" | | `VRAM_SmallName`, `VRAM_NumberTrailingZeros`, `VRAM_ShowMaxValue`, `VRAM_EnableHardwareTitle`, `VRAM_PrefixHardwareTitle`, `VRAMCustomHardwareName`, `GPU3DVRAMHook` |
| 437-478 | H2 "Memory — {RAMHardwareName}"; cbs "Small raised label — ʳᵃᵐ instead of RAM:", "Round to whole numbers — 18ᵍᵇ instead of 18.3ᵍᵇ", "Show how much there is in total — 18.3/32.0 instead of 18.3", "Show which generation it is — ⁽ᴰᴰᴿ⁵⁾", "Use the memory's own name instead of 'RAM'", "…or a shorter name you choose" + "Call it" tb | | `RAM_SmallName`, `RAM_NumberTrailingZeros`, `RAM_ShowMaxValue`, `RAM_ShowDDRVersion`, `RAM_EnableHardwareTitle`, `RAM_PrefixHardwareTitle`, `RAMCustomHardwareName` |

### 6.14 Network statistics options (`NetworkStatisticsSection.xaml`, `Settings_NetworkStatistics`, prefix `NetworkStatsModule.Settings.`)
| line | control | text | binding |
|---|---|---|---|
| 51-53 | H2 "What goes in the chatbox" + help "Example numbers — yours will differ, but the wording and the length will look like this." + prev | | `PreviewLine` |
| 59-66 | H2 "Right now"; cbs "Show how fast you are downloading", "Show how fast you are uploading" | | `ShowCurrentDown`, `ShowCurrentUp` |
| 77-96 | H2 "Best and total since the app started"; cbs "Show your fastest download so far", "Show your fastest upload so far", "Show how much you have downloaded in total", "Show how much you have uploaded in total" | | `ShowMaxDown`, `ShowMaxUp`, `ShowTotalDown`, `ShowTotalUp` |
| 107-118 | H2 "How busy your connection is"; cb "Show how much of your connection is in use, as a percentage"; help "The percentage needs something to be a percentage of…"; cb "Compare against the adapter's rated speed instead" | | `ShowNetworkUtilization`, `UseInterfaceMaxSpeed` |
| 129-133 | help "Shrinks the words next to the numbers so the numbers stand out. Watch the preview above." cb "Small raised labels — ᵈᵒʷⁿ instead of Down" | | `StyledCharacters` |

### 6.15 Window activity options (`WindowActivitySection.xaml`, `Settings_WindowActivity`, prefix `WindowActivitySettings.`)
| line | control | text | binding |
|---|---|---|---|
| 59 | error text 15px (gate ErrorInWindowActivity) | `WindowActivity.ErrorInWindowActivityMsg` | |
| 69-75 | cbs | Look up friendlier app names / Show the window title as well as the app name | `ApplicationHookV2`, `TitleScan` |
| 82-127 | (gate TitleScan) cbs "Turn the title on by itself for apps you have not used before", "Show titles while you are in VR too", "Shorten long titles" + "Cut titles after this many characters" tb w40, "Name the app, not just 'On desktop'", "Show a per-app rewrite box in the list below", "Rewrite every window title with one rule" + "Rewrite rule" tb w300 | | `AutoShowTitleOnNewApp`, `TitleOnAppVR`, `LimitTitleOnApp`, `MaxShowTitleCount`, `ShowFocusedApp`, `ShowRegexColumn`, `UseGlobalRegex`, `GlobalRegex` |
| 150-227 | cb "Hide or cut parts of window titles"; help "Rules here apply to every app. To set one for a single app, use the 'What to hide' box in the list below."; help "Type words or phrases separated by commas. Hide drops the whole title when it matches; Only show keeps it only when it matches; Cut out removes just the matching words and keeps the rest."; rule rows: cb, cmb w180 ("Hide the whole title", "Only show titles that match", "Cut out the matching words"), tb pattern, ✕ CircleButton; btn "＋ Add a rule" | | `EnableTitleFilters`, rule `IsEnabled`/`Mode`/`Pattern`, `RemoveTitleFilterCommand`, `AddTitleFilterCommand` |
| 238 | cb | Show nothing at all for apps marked private | `HideOutputWhenPrivateApp` |
| 245-283 | lbl "What the line says on desktop" + 3 tbs + help "The boxes above are, in order: the opening words, the word joining them to the app, and what to say instead of the app name when it is marked private." + prev "On desktop, with an app called Firefox:" | | `DesktopTitle`, `DesktopFocusTitle`, `PrivateName`, `DesktopPreviewLine` |
| 285-328 | cb "Name the app while you are in VR"; lbl "What the line says in VR" + 3 tbs + help "Same three boxes, for when you are in VR. …" + prev "In VR, with an app called Firefox:" | | `IntegrationSettings.IntgrScanForce`, `VrTitle`, `VrFocusTitle`, `PrivateNameVR`, `VrPreviewLine` |
| 333-366 | lbl "Forget apps you have used" + btns "Smart", "Keep only the ones I changed", "Reset" + `DeletedAppslabel` | | `SmartCleanupCommand`, `CleanupKeepSettingsCommand`, `ResetWindowActivityCommand` |
| 375-408 | lbl "Find an app" tb w190; cb "Important only"; lbl "Used at least" tb w45; `FilteredAppsSummary` | | `WindowActivity.AppFilterText`, `ShowImportantAppsOnly`, `MinimumFocusCount` |
| 440-529 | table header `Sort_Button_style` buttons: App, Focused, Friendly name, Show title, Private, Call it instead, What to hide (gate EnableTitleFilters), Rewrite… (gate ShowRegexColumn) | | `SortBy*Command` |
| 593-685 | rows: ProcessName, FocusCount, UsedNewMethod (16px); cb ShowTitle; cb IsPrivateApp; cb ApplyCustomAppName + tb w173 CustomAppName; cmb w110 ("Show as-is", "Hide title", "Only matches", "Cut out") + tb w80 ContentFilter; cb UseCustomRegex + tb CustomRegex | | per-app item |

### 6.16 VR performance options (`VrPerformanceSection.xaml`, `Settings_VrPerformance`, prefix `Settings.`)
| line | control | text | binding |
|---|---|---|---|
| 51-55 | H2 "What goes in your chatbox" + prev "While everything is running smoothly" / "While your headset is struggling" | | `HealthyPreview`, `DegradedPreview` |
| 61-104 | H2 "What to show"; cbs "Frame rate", "Headset refresh rate", "Frames faked to keep up %", "Dropped frames", "Motion smoothing", "Time the game takes to draw a frame", "Time SteamVR takes on top", "How full each frame is %", "Time your PC takes to prepare a frame"; help ""How full each frame is" counts up, not down…"; help "The chatbox holds 144 characters and every integration shares them. Turning all of these on costs roughly 55-70 of them…" | | `ShowFps`, `ShowTargetHz`, `ShowReprojection`, `ShowDroppedFrames`, `ShowMotionSmoothing`, `ShowAppGpuMs`, `ShowCompositorGpuMs`, `ShowHeadroom`, `ShowCpuTiming` |
| 110-125 | H2 "When to show it"; cmb w220 ("Always", "Only when frames drop", "Compact, expand on trouble"); help "'Only when frames drop' costs no characters while everything is running smoothly…" | | `DisplayMode` |
| 131-177 | H2 "What counts as struggling"; lbl+tb w60 ×4: "Frames faked to keep up, at or above (%)", "Dropped frames per minute", "Frame rate below (% of the headset's)", "Seconds running smoothly before it clears"; help "The last one stops the warning flickering on and off when a value sits right on the line." | | `DegradedReprojectionPercent`, `DegradedDroppedPerMinute`, `DegradedFpsPercentOfTarget`, `DegradedHysteresisSeconds` |
| 183-204 | H2 "How it is written"; cbs "Use icons instead of words", "Small raised labels - ᶠᵖˢ instead of FPS", "Round the numbers off (no decimals)"; lbl "What goes between the values" tb w60 | | `UseEmojisForVrPerf`, `UseSuperscriptUnits`, `RemoveNumberTrailing`, `StatsSeparator` |
| 213-215 | H2 "Status" + `StatusText` 12px | | |

### 6.17 Tracker battery manager (`TrackerBatterySection.xaml`, `Settings_TrackerBattery`, prefix `Modules.TrackerBattery.Settings.`)
| line | control | text | binding |
|---|---|---|---|
| 60-95 | H2 "Battery levels of your VR gear" + device summary + last scan; btns "Look for devices", "Start the wording over", "Forget my devices" | | `TrackerBatteryScanCommand`, `ResetTrackerBatteryTemplateCommand`, `ResetTrackerDevicesCommand` |
| 112-125 | H2 "What the chatbox line says" + help "Build the line your battery levels go out on." + prev "What goes in your chatbox (sample devices)" + tokens "{icon} {name} {batt} {status} {low} {kind} {serial} {model}" | | `SamplePreview` |
| 148-167 | `TrackerLabelText` (12px `#C9C1DE`) "Start of the line" tb w90; "Repeated once for every device" tb; "End of the line" tb w90 | | `Prefix`, `Template`, `Suffix` |
| 174-197 | cbs "Include my controllers", "Include my headset", "Include my trackers", "Include devices that are switched off"; lbl "What goes between two devices" tb w45 | | `ShowControllers`, `ShowHeadset`, `ShowTrackers`, `ShowDisconnected`, `Separator` |
| 211-232 | H2 "Running low"; tgl `GlowyToggleButton` "Only mention low ones"; help "A device counts as low at or below this level."; "{0}%" readout + sl 1/100 | | `GlobalEmergency`, `LowThreshold` |
| 304-426 | per-device cards (`TrackerPanelCard` r12 / `TrackerSubCard` r10): "Icon" tb, "Call it" tb, "Normally called {OriginalModelName}", battery % (`TrackerBatteryValueText` 18 Bold `#2FD1C5`; charging `#FFD06A`; low `#FF6B6B`), "⚡ Charging", "Switched off"; cbs "Include this one", "Only when it is low", "Its own low point" + tb w40 "%" | | `CustomIcon`, `CustomName`, `IsHidden`, `ShowOnlyOnLowBattery`, `UseCustomLowThreshold`, `CustomLowThreshold` |
| 448-504 | H2 "Order, limits and your own wording"; lbl "List the devices by" cmb ("As detected", "Name (A-Z)", "Battery low to high", "Battery high to low", "Type, then name"); cb "Take turns when they will not all fit"; "Swap over every" tb "seconds"; "Most devices to name at once" tb w60; "Longest one device may be, in characters (0 = no limit)" tb w60 | | `SortMode`, `RotateOverflow`, `RotationIntervalSeconds`, `MaxEntries`, `MaxEntryLength` |
| 511-536 | H2 "Your own words"; lbl+tb: "Word for a device that is on" w110, "Word for a device that is off" w110, "Battery reading when it is off" w110, "Warning next to a low battery" w90 | | `OnlineText`, `OfflineText`, `OfflineBatteryText`, `LowTag` |

### 6.18 Voicemod (`VoicemodSection.xaml`, `Settings_Voicemod`, prefix `Settings.`)
| line | control | text | binding |
|---|---|---|---|
| 61-85 | H2 "Connection"; `Display.StatusText`; help `ConnectionDetails`; help "Turn Voicemod on or off from its tile on the Integrations page."; btns "Reconnect", "Refresh" (`VoicemodOptionButton`) | | `ReconnectCommand`, `RefreshCommand` |
| 102 | warning text | `Display.ErrorText` | |
| 112-146 | H2 "Client key"; help "Save the client key Voicemod gave you for this Windows user. It is stored with Windows encryption; a saved key takes priority over a build-injected key."; pw; btns "Save key", "Clear local"; help `LocalClientKeyStatus` | | `SaveLocalClientKey_Click`, `ClearLocalClientKeyCommand` |
| 166-188 | help "Allow local Voicemod control in Privacy & permissions before connecting." + btn "Open privacy" (gate NeedsPermission); help "No Voicemod client key is available. Save one above or inject VoicemodClientKey when you build." (gate MissingClientKey) | | `OpenPrivacyCommand` |
| 196-224 | H2 "Features"; help "Switch off the parts you never use…"; cbs "Voice changer — pick voices, tune parameters, hear myself, background effects", "Soundboard — browse boards, play and stop sounds, soundboard monitoring", "Mic — mute the Voicemod microphone and hold-to-bleep"; warning "Every feature is off, so MagicChatbox stays connected but shows no controls…" | | `VoiceControlEnabled`, `SoundboardControlEnabled`, `MicControlEnabled` |
| 238-290 | (gate SoundboardControlEnabled) H2 "Soundboard layout"; help; lbl "Sounds per page" sl 8/96/8 + value; cbs "Compact sounds — smaller tiles, more of them on screen", "Show the soundboard picker strip", "Show each sound's thumbnail"; helps | | `SoundsPerPage`, `CompactSoundBlobs`, `ShowSoundboardStrip`, `ShowSoundThumbnails` |
| 300-366 | H2 "Chatbox output"; help "When you start a sound from MagicChatbox, show its name in the VRChat chatbox using the same format as Soundpad."; cb "Announce soundboard effects in chat"; lbl "Show for" sl 2/15/1 "{0} sec"; lbl "Show in" + DESKTOP/VR route chips; cb "Show the voice you are using in chat"; help "Stays in the chatbox while a voice is active…"; help "Preview: 🎶 'Sound name'   ·   🎙️ 'Voice name'" | | `AnnounceSoundboardToChat`, `SoundAnnouncementDurationSeconds`, `IntegrationSettings.IntgrVoicemod_DESKTOP/_VR`, `AnnounceVoiceToChat` |

### 6.19 OpenAI options (`OpenAISection.xaml`, `Settings_OpenAI`; header links "Terms of use", "My usage")
| line | control | text | binding |
|---|---|---|---|
| 77-154 | btn "Connect with OpenAI" (OpenAI.png) / "Connected with OpenAI" + disconnect ✕; error text | | `ConnectWithOpenAI_Click`, `DisconnectOpenAICommand`, `OpenAI.AccessErrorTxt` |
| 168 | cb | Check messages with OpenAI's free content filter before they are used | `Modules.IntelliChat.Settings.IntelliChatPerformModeration` |
| 180-233 | H2 "Rewrite what you typed"; help "The wand button in the chat box rewrites your message in the style you pick here. Your text is sent to OpenAI to do it."; lbl "Style" cmb w200 (`SupportedWritingStyles`, display StyleName) + `StyleDescription`; lbl "Model" cmb w200 | | `SelectedWritingStyle`, `PerformBeautifySentenceModel` |
| 244-296 | H2 "Translate what you typed"; help; cb "Work out the language on its own (costs less)"; lbl "Translate into" cmb w200 (`SupportedLanguages`); lbl "Model" cmb | | `AutolanguageSelection`, `SelectedTranslateLanguage`, `PerformLanguageTranslationModel` |
| 306-453 | H2 "Talk instead of typing"; help "Records from your microphone and drops what you said into the chat box as text."; lbl "Microphone" cmb (`AvailableDevices`); lbl "Model" cmb (whisper-1, gpt-4o-mini-transcribe, gpt-4o-transcribe, gpt-4o-transcribe-diarize, gpt-transcribe); lbl "Speak whichever language you like - the model works it out…"; lbl "Only the Whisper model can translate"; cb "Translate what I say into another language" + "Into" cmb; "Stop listening after" tb "milliseconds of quiet"; cb "Send it as soon as I stop talking"; lbl "How loud you have to be before it starts listening" sl 0/1/0.01 + value | | `Modules.Whisper.Settings.SelectedDeviceIndex`, `SpeechToTextModel`, `TranslateToCustomLanguage`, `SelectedSpeechToTextLanguage`, `SilenceAutoTurnOffDuration`, `SendAftersilence`, `NoiseGateThreshold` |
| 469-554 | H2 "Which model does what"; help "Every helper can use a different model. Smaller ones answer faster and cost less; larger ones write better."; lbl+cmb w200 ×4: "Suggest something to say", "Make it fit the chatbox", "Fix spelling and grammar", "Finish my sentence" | | `GenerateConversationStarterModel`, `PerformShortenTextModel`, `PerformSpellingCheckModel`, `PerformTextCompletionModel` |
| 566 | cb | Hide the AI buttons above the chat box | `ChatSettings.HideOpenAITools` |

### 6.20 Text to speech options (`TtsOptionsSection.xaml`, `Settings_TTS`, "Learn more")
| line | control | text | binding |
|---|---|---|---|
| 72 | warning 13px | Heads up: the voices come from a TikTok service that is not always up. When it is down, nothing is spoken. | |
| 82-95 | H2 "When it speaks"; help "Text to speech reads your chat messages out loud on this PC. It does not change what the chatbox shows."; cb "Cut off the current message when a new one arrives" + help "Leave it off and messages wait their turn, read out one after another."; cb "Speak it again when you resend a message" + help "Applies to messages you send again from your chat history."; cb "Switch your VRChat microphone on while it speaks" + help "Unmutes you in VRChat for as long as the audio lasts, then mutes you again. Others only hear the speech if your microphone picks it up." | | `TtsSettings.TtsCutOff`, `TtsOnResendChat`, `AutoUnmuteTTS` |
| 101-126 | H2 "Voice and speakers"; help "Which voice reads the message, and which speakers or headset it comes out of. Pick a virtual audio cable here if you want the speech to reach your microphone."; lbl "Voice" cmb w186 (display DisplayName); lbl "Play through" cmb w186 (display FriendlyName) | | `TtsAudio.SelectedTikTokTTSVoice`, `TtsAudio.SelectedPlaybackOutputDevice` |

### 6.21 App options (`AppOptionsSection.xaml`, `Settings_AppOptions`)
| line | control | text | binding |
|---|---|---|---|
| 52-63 | H2 "Appearance and performance"; cb "Reduced visuals" + help "Turns off the shadows, the fades and the page transitions. Measured here it takes the window from around 19% of the graphics card down to under 3%."; cb "Turn it on by itself while VR is running" + help "VR is when the graphics card is busiest and when you are least likely to be looking at this window." | | `AppSettings.ReducedVisuals`, `ReducedVisualsInVr` |
| 73-99 | H2 "Window and tray"; cbs "Start hidden in the tray", "Keep running when you close the window", "Hide to the tray when you minimise", "Show tray notifications while you are in another window", "Remind me that MagicChatbox is still running", "Open the tray menu with Alt+X", "Warn me when something is on but not shown in the mode I am in"; help "Closing the window normally exits MagicChatbox…"; cb "Keep the window in front of other windows" | | `StartInBackground`, `CloseToTray`, `MinimizeToTrayOnMinimize`, `EnableTrayNotifications`, `ShowTrayRunningReminder`, `OpenTrayWithAltX`, `ShowHiddenIntegrationWarning`, `Topmost` |
| 108-286 | H2 "Where the text is sent"; help "VRChat listens on this PC at 127.0.0.1, port 9000. Only change these if VRChat runs on another computer, or if something else on this PC has taken the port."; "Address" tb w100 + btn "Default"; "Port" tb w100 + btn "Default"; cb "Let MagicChatbox mute and unmute your VRChat microphone"; cb "Send the same text somewhere else as well" + help "For a second copy of VRChat, another PC on your network, or a tool that reads OSC." + Address/Port tbs + cb "Mute and unmute the microphone here too"; cb "And to a third place" + Address/Port + cb | | `OscSettings.OscIP`, `OscPortOut`, `ResetOscIpCommand`, `ResetOscPortCommand`, `UnmuteMainOutput`, `SecOSC`, `SecOSCIP`, `SecOSCPort`, `UnmuteSecOutput`, `ThirdOSC`, `ThirdOSCIP`, `ThirdOSCPort`, `UnmuteThirdOutput` |
| 304-402 | H2 "Every chatbox line"; lbl "How often the chatbox updates" sl (`OscTickIntervalMinSeconds`..`Max`, step 0.1) + value "seconds"; help "A shorter wait keeps the clock and your heart rate current…"; cb "Put each integration on its own line" + help "Turn this off to run them together on one line, joined by the text below."; lbl "Text between integrations" tb w140 (default " ┆ ", `Classes/Modules/AppSettings.cs:29`); "Text before every line" tb w220; "Text after every line" tb w220; help "Tip: use \n for a new line."; prev "A line with two integrations on it" | | `AppSettings.ScanningInterval`, `SeperateWithENTERS`, `OscMessageSeparator`, `OscMessagePrefix`, `OscMessageSuffix`, `LinePreview` |
| 409-420 | H2 "SteamVR"; cb "Start MagicChatbox when SteamVR starts" + help "MagicChatbox adds itself to SteamVR's startup apps…"; cb "Close it again when SteamVR closes" (enabled when StartWithSteamVr) + help "Leave this off to keep MagicChatbox running at the desk after you take the headset off." | | `StartWithSteamVr`, `QuitWithSteamVr` |
| 427-432 | H2 "Other"; cb "Treat the Oculus software as "in VR" (experimental)" + help; cb "Mute and unmute VRChat with the V key" | | `CountOculusSystemAsVR`, `TtsSettings.ToggleVoiceWithV` |
| 444-505 | H2 "Updates"; cb "Look for a newer version at startup (recommended)" + help "Otherwise it only looks when you press the button on the version card."; lbl "Stable releases" segmented Ignore / Tell me / Install for me; lbl "Test versions" same; helps "Each row decides what happens to updates from that channel…" / ""Install for me" downloads in the background and swaps the files the next time you start MagicChatbox…" | | `CheckUpdateOnStartup`, `StableUpdateMode`, `PreReleaseUpdateMode` |
| 518-557 | btns "Go back to {version}" (gate RollBackUpdateAvailable), "Install from a ZIP file", "Reset Status", "Open config folder", "Open log folder" | | `RollbackCommand`, `UpdateByZipCommand`, `ResetFavoritesCommand`, `OpenConfigFolderCommand`, `OpenLogFolderCommand` |

### 6.22 Privacy & permissions (`PrivacySection.xaml`, `Settings_Privacy`)
Help at `:55`: "Every row below is something on your PC that MagicChatbox can read. Nothing is read, and nothing leaves this computer, until you allow it here." H2 `:59` "What MagicChatbox may look at". Then 11 identical rows (label 15px Medium with emoji, help, state text 11px via `EnumDescriptionConverter`, btns "Manage" and "Revoke" → `ManageHookCommand`/`RevokeHookCommand` with `PrivacyHook.<X>`):

| line | label | help | state binding |
|---|---|---|---|
| 71 | 🖥️  Hardware Monitor | Reads how busy your processor, memory and graphics card are. Say no and Component stats has nothing to show. | `HardwareMonitorState` |
| 116 | 📋  Window Activity | Reads the name of the program you are using and the title of its window. | `WindowActivityState` |
| 161 | 🎵  Media Session | Reads what is playing from whatever media player Windows knows about, and whether it is paused. | `MediaSessionState` |
| 206 | 💤  AFK Sensor | Checks how long ago you last touched the mouse or keyboard, so it can tell you are away. It never records what you type. | `AfkSensorState` |
| 251 | 🌐  Internet Access | Lets MagicChatbox reach the internet for Twitch, heart rate, weather, OpenAI and text to speech. | `InternetAccessState` |
| 296 | 🎮  VR Tracker Battery | Asks SteamVR how much battery is left in your headset, controllers and trackers. | `VrTrackerBatteryState` |
| 341 | 📶  Network Statistics | Reads how much your network adapters have sent and received, for the up and down speeds. | `NetworkStatsState` |
| 388 | 🔊  Soundpad Bridge | Talks to the Soundpad program on this PC to see what it is playing. | `SoundpadBridgeState` |
| 433 | 🎙️  Voicemod Control | Connects to Voicemod on this PC to read and control voices, sounds, mute, monitoring, and bleep. | `VoicemodControlState` |
| 478 | 📡  VRChat Log Reader | Reads VRChat's own log file to know the world you are in, who comes and goes, and how long you have been on. | `VrcLogReaderState` |
| 523 | 🎯  VR Performance | Asks SteamVR for your frame rate and dropped frames. Needs SteamVR to be running. | `VrPerformanceState` |

### 6.23 EGG options (`EggDevSection.xaml`, visible only when `AppState.Egg_Dev`; toggle `AppSettings.SettingsDev`, style `ExpandCollapseToggleButtonStyleDEV`)
| 52 | cb "ItsByMe MODE" | `AppSettings.BlankEgg` |

---

## 7. SegmentPreview control & the PREVIEW panel

**`UI/Controls/SegmentPreview.xaml`** (used ~25× across options): StackPanel margin-top 8; optional caption 12px TextMuted margin 2,0,0,4 (hidden when empty); box r8 padding 10,7 bg SurfaceDark `#FF240E54` border 1px DeckEdge `#FF4A3C72`; left: line text Albert Sans 15 `#FFD4CEE2`, wraps (never clips), margin-right 8; right: cost chip r5 padding 7,2, text 11px TextSectionHeader `#FFBDAEE2`, format `"{len}/144"` (`SegmentPreview.xaml.cs:83`, `OscBuildContext.MaxOscLength` = `Constants.OscMaxMessageLength` = 144, `Core/Constants.cs:7`). Chip background by fill level (`SegmentPreview.xaml.cs:10-14`): Room `#26FFFFFF` (white 15%), Tight `#6B5422` (amber), Full `#7A2E3E` (red). Screenshot `tab_options_expanded.png`: "anyone up for a world hop?" with "26/144" chip.

**Side-panel PREVIEW** (`MainWindow.xaml:662-717, 1193-1233`): header "P R E V I E W" (letter-spaced, 11px DeckText) with the same-shaped counter pill (h18, r5) bound to `OscDisplay.OscMsgCountUI` (Room/Tight/Full colours listed in §2.2). Body: 157px-high card, r10, vertical gradient `#FF302548→#FF261D3B`, border DeckEdge, text `OscDisplay.OscToSent` in Albert Sans 14 / line-height 19 / `#FFE7E2F5`, **centre-aligned, top-anchored, wrapping**. The line is exactly what VRChat receives: integrations joined by `"\n"` when `SeperateWithENTERS` (default true) else by `OscMessageSeparator` (default `" ┆ "`), optional prefix/suffix (`Core/Osc/OscOutputBuilder.cs:219-224`, `AppSettings.cs:28-31`); truncated to 144 with "…" (`OscOutputBuilder.cs:16, 240-250`). The status segment is prefixed with the icon "💬" by default (`Services/EmojiService.cs:59`) when `PrefixIconStatus` is on. In the screenshots the preview reads "💬 Enjoy 💜" (14/144) followed by a second line containing a small square glyph: that is a character on its own line (joined with `\n`) that Albert Sans cannot render in WPF, drawn as a tofu box — a web rebuild should render emoji normally and will not show the box. Empty state text: "Nothing to send yet" (12px, DeckTextMuted, centred).

---

## Quick palette summary for CSS variables
```
--bg-window:#240E54  --bg-titlebar:#2D1265  --bg-content:#3B3054  --bg-sidepanel:#42385D
--bg-toolbar:#493F65 --bg-card:#2C2148 --bg-input:#2C2148 --border-input:#4A3580 --border-card:#4A3C72
--tile-grad: linear-gradient(135deg,#4A3E85 0%,#3A2E6B 55%,#2C2252 100%)  --tile-border:#150C33
--accent-ramp: linear-gradient(to top right,#3FE0D2 0%,#6E9BFF 35%,#B96BFF 65%,#FF6FC7 100%)
--route-on:#B9A6EE --route-on-edge:#D3C4FF --feature-on:rgba(185,107,255,.24) --feature-on-edge:#B96BFF
--text:#B9B5C1 --text-label:#B3A3C4 --text-muted:#A29BB5 --text-heading:#BDAEE2 --text-light:#D4CEE2 --text-deck:#C6B9E8 --text-deck-muted:#9689B8
--btn:#240E54 --btn-hover:#191551 --btn-pressed:#13103D --btn-text:#D2CDDC
--check-on:#7C5CBF --check-on-edge:#9B7DE8 --check-off:#3A2F54 --check-off-edge:#6555A0
--switch-off:#584B8C --switch-off-edge:#7A6BB5 --switch-thumb:#E3DCF5
--success:#9DDAA8 --warning:#FFC107 --danger:#FF6B6B --teal:#31B7B4
font-primary: "Albert Sans"; font-secondary: "Comfortaa";
```
