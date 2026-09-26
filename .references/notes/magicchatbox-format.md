# MagicChatbox persisted-configuration format

Reference for writing a TypeScript parser/serializer for MagicChatbox (BoiHanny/vrcosc-magicchatbox, app version 0.9.226, .NET 10 / WPF, Newtonsoft.Json). All paths below are relative to `.references/magicchatbox/` and cite `file:line`. Source root of the app project is `vrcosc-magicchatbox/`, abbreviated **`app/`** in citations.

---

## 1. Storage model: where and how files are written

### 1.1 Data directory

| Item | Value | Source |
|---|---|---|
| Data path | `%APPDATA%\Vrcosc-MagicChatbox\` | `app/Services/EnvironmentService.cs:8-12` |
| Custom profile (`-profile N` style start) | `%APPDATA%\Vrcosc-MagicChatbox-profile-{N}\` | `app/Services/EnvironmentService.cs:22-27` |
| Log path | `%LOCALAPPDATA%\Vrcosc-MagicChatbox\logs\` | `app/Services/EnvironmentService.cs:14-16` |

Two modules bypass `IEnvironmentService` and hard-code `%APPDATA%\Vrcosc-MagicChatbox` (so they ignore custom profiles): `WhisperModuleSettings.json` (`app/Classes/Modules/WhisperModule.cs:159-161, 247-249`) and `vrcosc_session.json` (`app/Classes/Modules/VrcLogModule.cs:157-159`).

### 1.2 Complete inventory of persisted files

All files are JSON (Newtonsoft.Json). Legacy `.xml` files from older versions actually contained JSON and are renamed/migrated on startup (see §1.6).

| File | Shape | Writer / mechanism | Source |
|---|---|---|---|
| `AppSettings.json` | `VersionedSettings` object | `JsonSettingsProvider<AppSettings>` | `app/Classes/Modules/AppSettings.cs` |
| `OscSettings.json` | `VersionedSettings` | provider | `app/Classes/Modules/OscSettings.cs` |
| `IntegrationSettings.json` | `VersionedSettings` | provider | `app/Classes/Modules/IntegrationSettings.cs` |
| `ChatSettings.json` | `VersionedSettings` | provider | `app/Classes/Modules/ChatSettings.cs` |
| `TimeSettings.json` | `VersionedSettings` | provider | `app/Classes/Modules/TimeSettings.cs` |
| `TtsSettings.json` | `VersionedSettings` | provider | `app/Classes/Modules/TtsSettings.cs` |
| `OpenAISettings.json` | `VersionedSettings` | provider | `app/Classes/Modules/OpenAISettings.cs` |
| `WindowActivitySettings.json` | `VersionedSettings` | provider | `app/Classes/Modules/WindowActivitySettings.cs` |
| `ComponentStatsSettings.json` | `VersionedSettings`, `[CurrentSchema(2)]` | provider | `app/Classes/Modules/ComponentStatsSettings.cs` |
| `NetworkStatsSettings.json` | `VersionedSettings` | provider | `app/Classes/Modules/NetworkStatsSettings.cs` |
| `MediaLinkSettings.json` | `VersionedSettings` | provider | `app/Classes/Modules/MediaLinkSettings.cs` |
| `SpotifySettings.json` | `VersionedSettings` | provider | `app/Classes/Modules/SpotifySettings.cs` |
| `PulsoidModuleSettings.json` | `VersionedSettings` | provider | `app/Classes/Modules/PulsoidModuleSettings.cs` |
| `WeatherSettings.json` | `VersionedSettings` | provider | `app/Classes/Modules/WeatherSettings.cs` |
| `TwitchSettings.json` | `VersionedSettings` | provider | `app/Classes/Modules/TwitchSettings.cs` |
| `TikTokLiveSettings.json` | `VersionedSettings`, `[CurrentSchema(3)]` | provider | `app/Classes/Modules/TikTokLiveSettings.cs` |
| `DiscordSettings.json` | `VersionedSettings` | provider | `app/Classes/Modules/DiscordSettings.cs` |
| `VrcLogSettings.json` | `VersionedSettings` | provider | `app/Classes/Modules/VrcLogSettings.cs` |
| `TrackerBatterySettings.json` | `VersionedSettings` | provider | `app/Classes/Modules/TrackerBatterySettings.cs` |
| `VrPerformanceSettings.json` | `VersionedSettings` | provider | `app/Classes/Modules/Vr/VrPerformanceSettings.cs` |
| `LyricsSettings.json` | `VersionedSettings` | provider | `app/Classes/Modules/Lyrics/LyricsSettings.cs` |
| `VoicemodSettings.json` | `VersionedSettings` | provider | `app/Classes/Modules/Voicemod/VoicemodSettings.cs` |
| `PrivacySettings.json` | `VersionedSettings` | provider | `app/Core/Privacy/PrivacySettings.cs` |
| `IntelliChatModuleSettings.json` | `VersionedSettings` type, but **not** written by the provider; the module writes it as `IntelliChatSettings.json` | `IntelliChatModule.SaveSettings` | `app/Classes/Modules/IntelliChatModule.cs:31, 656, 988-995` |
| `IntelliChatSettings.json` | `IntelliChatModuleSettings` (indented) | module, `AtomicFileWriter` | `app/Classes/Modules/IntelliChatModule.cs:988-995` |
| `AfkModuleSettings.json` | `AfkModuleSettings` (plain `ObservableObject`, no `_schemaVersion`) | module, `AtomicFileWriter`, indented | `app/Classes/Modules/AfkModule.cs:50, 131-164, 219-223` |
| `WhisperModuleSettings.json` | `WhisperModuleSettings` | module, `AtomicFileWriter`, indented | `app/Classes/Modules/WhisperModule.cs:30, 247-258` |
| `StatusList.json` | `{Version, Groups[], Items[]}` bundle | `StatusListService` (tmp+move) | `app/Services/StatusListService.cs:46, 99-110` |
| `LastMessages.json` | `ChatItem[]` (indented) | `ChatHistoryService`, `AtomicFileWriter` | `app/Services/ChatHistoryService.cs:96-104` |
| `AppHistory.json` | `ProcessInfo[]` (compact) | `AppHistoryService`, `AtomicFileWriter` | `app/Services/AppHistoryService.cs:77-84` |
| `LastMediaLinkSessions.json` | `MediaSessionSettings[]` (compact) | `MediaLinkPersistenceService` | `app/Services/MediaLinkPersistenceService.cs:212-233` |
| `MediaLinkStyles.json` | `{CustomStyles[], SelectedStyleId}` (compact) | `MediaLinkPersistenceService` | `app/Services/MediaLinkPersistenceService.cs:29, 466-490, 524-528` |
| `ComponentStatsV1.json` | `ComponentStatsItem[]` (compact) | `ComponentStatsModule`, `AtomicFileWriter` | `app/Classes/Modules/ComponentStatsModule.cs:1163, 1246-1258` |
| `HotkeyConfiguration.json` | `{ [name]: {Key, Modifiers} }` (indented) | `HotkeyManagement`, `AtomicFileWriter` | `app/Classes/DataAndSecurity/HotkeyManagement.cs:47, 289-305` |
| `vrcosc_session.json` | `PersistedSession` (System.Text.Json!) | `VrcLogModule` (tmp+move) | `app/Classes/Modules/VrcLogModule.cs:157-159, 1341-1350, 1417-1422` |
| `settings.xml`, `settings.xml.bak` | legacy XML (pre-JSON) | read once by migration, never written | `app/Core/Configuration/SettingsMigrationService.cs:34, 285-300` |
| `*.corrupt-yyyyMMddHHmmss` | quarantined unparsable file | provider | `app/Core/Configuration/JsonSettingsProvider.cs:270-285` |
| `*.bak-yyyyMMddHHmmss` | renamed legacy `.xml` | migration | `app/Core/Configuration/SettingsMigrationService.cs:637-678` |

### 1.3 `JsonSettingsProvider<T>` (the generic writer)

`app/Core/Configuration/JsonSettingsProvider.cs`

- File name is literally `{typeof(T).Name}.json` in `DataPath` (line 65).
- Serialization: `JsonConvert.SerializeObject(_settings, Formatting.Indented)` with **default** Newtonsoft settings (line 230): PascalCase property names as declared, enums as **integers**, `DateTime` as ISO-8601 (`"2025-03-22T10:11:12.1234567+02:00"` for Local kind), `double.NaN` serialized as the literal string `"NaN"`, `null` values emitted, collections as arrays.
- Deserialization (line 105) uses `ObjectCreationHandling.Replace` (line 18-21) so collections in the file **replace** the in-code defaults instead of appending to them.
- Written atomically via `AtomicFileWriter.WriteAllText`: write `path + ".tmp"`, then `File.Move(tmp, path, overwrite: true)` with 3 retries (`app/Core/Configuration/AtomicFileWriter.cs:32-75`).
- Auto-save: any `PropertyChanged` on a non-`[JsonIgnore]` property arms a 2 s debounce, capped at 30 s of continuous dirtiness (lines 32-33, 313-340). `FlushPendingSave()` / `Dispose()` write immediately. Shutdown flushes every provider in `StatePersistenceCoordinator.PersistAllState` (`app/Services/StatePersistenceCoordinator.cs:97-144`).
- Corrupt file (JsonException) is moved to `{file}.corrupt-{UTC yyyyMMddHHmmss}` and defaults are used (lines 114-118, 270-285). A file that is empty, whitespace, all `\0`, or the literal `null` yields defaults without quarantine (lines 103-108).
- Every save calls `StampVersion()` (line 352-357): `_appVersion = AppVersion.Current` (assembly version string e.g. `"0.9.226.0"`), `_schemaVersion = [CurrentSchema] or 1`.
- Properties excluded from the file: anything with `[JsonIgnore]` (Newtonsoft attribute). Legacy-only setters (`[JsonProperty("X")]` with `get => null` + `NullValueHandling.Ignore`) are never written.

### 1.4 `VersionedSettings` base and version attributes

`app/Core/Configuration/VersionedSettings.cs:6-16` — every provider-managed settings object carries three metadata keys, always first in the file:

```json
{
  "_schemaVersion": 1,
  "_appVersion": "0.9.226.0",
  "_migratedAt": "2025-05-01T12:00:00Z"
}
```

| Key | C# | Notes |
|---|---|---|
| `_schemaVersion` | `int SchemaVersion = 1` | class-level `[CurrentSchema(n)]` overrides; only `ComponentStatsSettings` (2) and `TikTokLiveSettings` (3) declare one |
| `_appVersion` | `string AppVersion = ""` | assembly version; compared segment-wise numerically (`app/Core/Configuration/AppVersion.cs:23-42`) |
| `_migratedAt` | `DateTime? MigratedAt` | set once by the XML→JSON migration (`SettingsMigrationService.cs:159-163`); `null` if never migrated; provider preserves it on module reset |

Attributes (`app/Core/Configuration/SettingsAttributes.cs`):

- `[CurrentSchema(int)]` (class): value stamped into `_schemaVersion`.
- `[ResetModuleAfterSchema(int)]` (class): on load, if file `_schemaVersion < n`, whole object is replaced with defaults (`JsonSettingsProvider.cs:171-182`). **No class currently uses it** (grep confirms only the definition).
- `[ResetAfterVersion("x.y.z")]` (property): if file `_appVersion` is older than `x.y.z`, that property is reset to its default (`JsonSettingsProvider.cs:184-212`). **No property currently uses it.**

So, for a TS implementation: the only schema-specific behaviours are the two below.

### 1.5 Per-version migration steps

**ComponentStatsSettings** (`app/Classes/Modules/ComponentStatsSettings.cs:12-15, 110-125`), `_schemaVersion` 1 → 2 ("TemperatureScaleSchema"):
- Runs in `[OnDeserialized]` and in `ILegacySettingsMigration.AdoptLegacySettings()`.
- If `_schemaVersion < 2`: `TemperatureCelsius = IsTemperatureSwitchEnabled || !IsFahrenheit`; `TemperatureFahrenheit = IsTemperatureSwitchEnabled || IsFahrenheit`; Kelvin/Rankine/Reaumur = false; `_schemaVersion = 2`.
- Legacy keys `IsFahrenheit` (default false) and `IsTemperatureSwitchEnabled` (default true) are still serialized (lines 64-66).

**TikTokLiveSettings** `[CurrentSchema(3)]` (`app/Classes/Modules/TikTokLiveSettings.cs:27`): no code inspects the version; it is stamp-only.

**StatusList.json** `Version` 1 → 2 (`app/Services/StatusListService.cs:20, 176-225`): a v1 file is a bare JSON **array** of `StatusItem`; on load it is wrapped into a bundle with a freshly generated "Default" group and every item's `GroupId` set to it, then re-saved.

**MediaLinkStyles.json** legacy form: a bare array of `MediaLinkStyle`; current form is `{CustomStyles, SelectedStyleId}` (`app/Services/MediaLinkPersistenceService.cs:509-522`).

**AfkModuleSettings.json**: legacy key `"Styles"` (array of AfkStyle, `NullValueHandling.Ignore`) is read into `LegacyStyles`, merged into `CustomStyles`, then nulled so it is not written again (`app/Classes/Modules/AfkModule.cs:86-88, 108-129`). Legacy flat fields `AfkPrefix/ShowPrefixIcon/AfkMessageForTimeStamp/AfkMessageWithoutTimeStamp/ShowAFKTime` are still written and, if they differ from the "classic" preset, are turned into a custom style with `Id = "yours"` (`app/Classes/Modules/Afk/AfkStyleSeed.cs:18-77`).

**AppSettings legacy keys** (`app/Classes/Modules/AppSettings.cs:43-52, 63-72`): `"JoinedAlphaChannel": true` → `PreReleaseUpdateMode = Notify`; `"OpenTrayWithAltQ": b` → `OpenTrayWithAltX = b`. Both are read-only (never emitted).

**DiscordSettings legacy key** `"VoiceClientId"` (plaintext) → routed into the encrypted pair; never emitted (`app/Classes/Modules/DiscordSettings.cs:74-84`).

### 1.6 XML → JSON migration (`SettingsMigrationService`)

`app/Core/Configuration/SettingsMigrationService.cs`, run once at startup (`app/App.xaml.cs:181-182`).

1. If `settings.xml` exists, its `<Settings><Category><Key>value</Key></Category></Settings>` tree is mapped per module by the tables at lines 304-635 (XML category/key → JSON property name). Only properties still at their default get the XML value (`IsDefaultValue`, lines 205-229). Conversion rules lines 242-283 (bool/int/long/uint/byte/double/float/DateTime/enum-by-name; `ObservableCollection<TrackerDevice>` parsed from embedded JSON).
2. A migrated file gets `_migratedAt = UtcNow`; a file with `_migratedAt` already set is skipped (line 94-95).
3. `settings.xml` is copied to `settings.xml.bak` (lines 285-300).
4. `StatusList.xml`, `LastMessages.xml`, `AppHistory.xml`, `LastMediaLinkSessions.xml` are copied to `.json` and the `.xml` renamed to `.xml.bak-<timestamp>` (lines 637-666).

Notable renames in the map (useful if you ever meet a `settings.xml`): `OpenAI/OpenAIAccessTokenEncrypted → AccessTokenEncrypted`; `WindowActivity/WindowActivity* → *`; `Time/ShowWeather*` → `WeatherSettings.*`; `Twitch/Twitch* → *`; `Discord/Discord* → *`; `MediaLink/MediaLink_* → *`, `MediaLink/DisableMediaLink → Disabled`, `MediaSession_Timeout → SessionTimeout`; `NetworkStatistics/NetworkStats_* → *`; `TrackerBattery/TrackerBattery_* → *`, `TrackerBattery/TrackerDevices → SavedDevices`; `TTS/TTS* → Tts*`.

---

## 2. Settings files — complete key reference

Conventions for the tables: **JSON name** is exactly the C# property name (CommunityToolkit `[ObservableProperty] private bool _fooBar` → property `FooBar`; a field named `fooBar` without underscore also → `FooBar`). Enums serialize as their **integer** value (index shown in §2.25). `JsonIgnore` rows are listed only when relevant and marked *(not persisted)*.

### 2.1 `OscSettings.json` — App options → OSC (`app/Classes/Modules/OscSettings.cs:8-18`)

| JSON name | Type | Default | Notes |
|---|---|---|---|
| `OscIP` | string | `"127.0.0.1"` | main VRChat OSC host |
| `OscPortOut` | int | `9000` | |
| `SecOSC` | bool | `false` | second output enabled |
| `SecOSCIP` | string | `"127.0.0.1"` | |
| `SecOSCPort` | int | `9002` | |
| `ThirdOSC` | bool | `false` | |
| `ThirdOSCIP` | string | `"127.0.0.1"` | |
| `ThirdOSCPort` | int | `9003` | |
| `UnmuteMainOutput` | bool | `true` | |
| `UnmuteSecOutput` | bool | `false` | |
| `UnmuteThirdOutput` | bool | `false` | |

### 2.2 `AppSettings.json` — App options / Status cycling / window state (`app/Classes/Modules/AppSettings.cs`)

| JSON name | Type | Default | Range / notes | Line |
|---|---|---|---|---|
| `ScanningInterval` | double (seconds) | `1.0` | clamped 0.7–10.0, rounded to 1 decimal (OSC tick / send interval) | 18, 159-185 |
| `ScanPauseTimeout` | int (s) | `15` | pause after manual chat | 19 |
| `PrefixIconStatus` | bool | `true` | emoji before status | 21 |
| `PrefixIconMusic` | bool | `true` | play/pause icon before MediaLink | 22 |
| `PrefixIconSoundpad` | bool | `true` | 🎶 before Soundpad | 23 |
| `EmojiCollection` | string[] | `[]` | status emoji pool; default icon `"💬"` when empty (`EmojiService.cs:59`) | 24 |
| `EnableEmojiShuffleInChats` | bool | `false` | | 25 |
| `EnableEmojiShuffle` | bool | `false` | | 26 |
| `OscMessagePrefix` | string | `""` | `\n` literal expanded to newline | 28 |
| `OscMessageSeparator` | string | `" ┆ "` (U+2506) | used only when `SeperateWithENTERS=false`; blank → default | 29 |
| `OscMessageSuffix` | string | `""` | | 30 |
| `SeperateWithENTERS` | bool | `true` | (sic) newline between segments | 31 |
| `StartWithSteamVr` | bool | `false` | | 33 |
| `QuitWithSteamVr` | bool | `false` | | 34 |
| `SteamVrManifestPath` | string | `""` | | 35 |
| `CountOculusSystemAsVR` | bool | `true` | | 37 |
| `Topmost` | bool | `false` | | 38 |
| `StableUpdateMode` | enum `UpdateChannelMode` | `2` (Auto) | | 39 |
| `PreReleaseUpdateMode` | enum `UpdateChannelMode` | `0` (Off) | | 40 |
| `CheckUpdateOnStartup` | bool | `true` | | 41 |
| `JoinedAlphaChannel` | bool? | — | **read-only legacy**; true → PreReleaseUpdateMode=Notify | 43-52 |
| `StartInBackground` | bool | `false` | | 54 |
| `MinimizeToTray` | bool | `false` | setting true forces `CloseToTray` & `MinimizeToTrayOnMinimize` true | 55, 187-194 |
| `CloseToTray` | bool | `false` | | 56 |
| `MinimizeToTrayOnMinimize` | bool | `false` | | 57 |
| `EnableTrayNotifications` | bool | `true` | | 58 |
| `ShowTrayRunningReminder` | bool | `true` | | 59 |
| `OpenTrayWithAltX` | bool | `true` | | 60 |
| `ShowHiddenIntegrationWarning` | bool | `true` | | 61 |
| `OpenTrayWithAltQ` | bool? | — | read-only legacy alias of OpenTrayWithAltX | 63-72 |
| `SwitchStatusInterval` | int (s) | `5` | status cycle period | 74 |
| `EggPrefixIconStatus` | string | `"🥚"` | | 75 |
| `IsRandomCycling` | bool | `false` | weighted random vs round-robin | 76 |
| `CycleStatus` | bool | `false` | master cycle toggle | 77 |
| `CycleOverrideCurrentGroup` | bool | `false` | | 78 |
| `CycleOverrideGroupId` | string | `""` | GUID of StatusGroup | 79 |
| `LastSelectedGroupId` | string | `""` | | 80 |
| `BlankEgg` | bool | `false` | dev: appends `\u0003\u001f` to chatbox text | 81 |
| `StatusRoundCorners` | bool | `true` | UI | 83 |
| `CurrentMenuItem` | int | `0` | UI | 85 |
| `PageScrollOffsets` | `Dictionary<string,double>` | `{}` | UI | 87 |
| `OptionsSectionHeights` | `Dictionary<string,double>` | `{}` | UI | 93 |
| `Settings_Status` … `Settings_Privacy` | bool ×22 | `false` | Options tab expanders: `Settings_Status, Settings_OpenAI, Settings_HeartRate, Settings_Time, Settings_Weather, Settings_Twitch, Settings_TikTokLive, Settings_Discord, Settings_Spotify, Settings_ComponentStats, Settings_NetworkStatistics, Settings_Chatting, Settings_TTS, Settings_MediaLink, Settings_AppOptions, Settings_WindowActivity, Settings_VrcRadar, Settings_TrackerBattery, Settings_VrPerformance, Settings_Lyrics, Settings_Voicemod, Settings_Privacy` | 105-127 |
| `WindowLeft/Top/Width/Height` | double | `NaN` | serialized as string `"NaN"` | 129-132 |
| `WindowMaximized` | bool | `false` | | 133 |
| `SettingsDev` | bool | `false` | | 135 |
| `AvatarSyncExecute` | bool | `true` | | 136 |
| `AppOpacity` | double | `0.98` | | 138 |
| `AppIsEnabled` | bool | `true` | | 139 |
| `ReducedVisuals` | bool | `false` | | 142 |
| `ReducedVisualsInVr` | bool | `true` | | 145 |
| `ProfileNumber`, `UseCustomProfile` | int, bool | — | *(not persisted, JsonIgnore)* | 147-155 |
| `AcceptedTosVersion` | string | `""` | current TOS `"2025.03.22"` (`Constants.cs:80`) | 157 |

### 2.3 `IntegrationSettings.json` — Integrations page toggles (`app/Classes/Modules/IntegrationSettings.cs`)

Master toggles (line 11-33):

| JSON name | Default | Integration |
|---|---|---|
| `IntgrStatus` | `true` | Personal status |
| `IntgrScanWindowActivity` | `false` | Window activity |
| `IntgrScanSpotify_OLD` | `false` | legacy, unused |
| `IntgrScanWindowTime` | `true` | Time |
| `ApplicationHookV2` | `true` | window hook method |
| `IntgrHeartRate` | `false` | Pulsoid |
| `IntgrNetworkStatistics` | `false` | |
| `IntgrScanMediaLink` | `true` | MediaLink (Windows media session) |
| `IntgrComponentStats` | `false` | |
| `IntgrSoundpad` | `false` | |
| `IntgrVoicemod` | `false` | |
| `IntgrTwitch` | `false` | |
| `IntgrTikTokLive` | `false` | |
| `IntgrDiscord` | `false` | |
| `IntgrSpotify` | `false` | |
| `IntgrVrcRadar` | `false` | |
| `IntgrTrackerBattery` | `false` | |
| `IntgrVrPerformance` | `false` | |
| `IntgrLyrics` | `false` | |
| `IntgrLyrics_Spotify` | `false` | lyrics source |
| `IntgrLyrics_MediaLink` | `false` | lyrics source |

Per-mode VR/Desktop gates (line 32-82); each provider is shown only if `Intgr<X> && (isVR ? <X>_VR : <X>_DESKTOP)`:

| Pair | `_VR` default | `_DESKTOP` default |
|---|---|---|
| `IntgrLyrics_VR/_DESKTOP` | true | true |
| `IntgrComponentStats_VR/_DESKTOP` | true | false |
| `IntgrNetworkStatistics_VR/_DESKTOP` | false | true |
| `IntgrStatus_VR/_DESKTOP` | true | true |
| `IntgrMediaLink_VR/_DESKTOP` | true | true |
| `IntgrWindowActivity_VR/_DESKTOP` | false | true |
| `IntgrHeartRate_VR/_DESKTOP` (+ `IntgrHeartRate_OSC` false) | true | false |
| `IntgrCurrentTime_VR/_DESKTOP` | true | false |
| `IntgrWeather_VR/_DESKTOP` | true | false |
| `IntgrSpotifyStatus_VR/_DESKTOP` (legacy) | true | true |
| `IntgrSoundpad_VR/_DESKTOP` | false | true |
| `IntgrVoicemod_VR/_DESKTOP` | true | true |
| `IntgrTwitch_VR/_DESKTOP` | true | true |
| `IntgrTikTokLive_VR/_DESKTOP` | true | true |
| `IntgrDiscord_VR/_DESKTOP` | true | true |
| `IntgrSpotify_VR/_DESKTOP` | true | true |
| `IntgrVrcRadar_VR/_DESKTOP` | true | true |

TrackerBattery and VrPerformance have no mode pair: they are VR-only (`TrackerBatteryOscProvider.cs:27-28`, `VrPerformanceOscProvider.cs:25-26`).

Ordering/tiles (line 84-97):

| JSON name | Type | Default |
|---|---|---|
| `SavedSortOrder` | string[] | `["Status","Window","Twitch","TikTokLive","Discord","Spotify","VrcRadar","HeartRate","Component","VrPerformance","TrackerBattery","Network","Weather","Time","Soundpad","Voicemod","MediaLink","Lyrics"]` (`app/ViewModels/State/IntegrationDisplayState.cs:14-19`). Unknown keys are dropped and missing keys appended on load (lines 70-90). |
| `HiddenTiles` | string[] | `[]` |
| `TileHideHintShown` | bool | `false` |
| `HiddenStripCollapsed` | bool | `false` |
| `IntgrScanForce` | bool | *(JsonIgnore, not persisted)* |

### 2.4 `ChatSettings.json` — Chatting options (`app/Classes/Modules/ChatSettings.cs:17-40, 45-101`)

| JSON name | Type | Default | Range |
|---|---|---|---|
| `ChatAddSmallDelay` | bool | `true` | |
| `ChatAddSmallDelayTIME` | double (s) | `1.4` | 0.1–10 |
| `ChatLiveEdit` | bool | `true` | forced false when KeepUpdatingChat=false |
| `ChatSendAgainFX` | bool | `true` | |
| `ChattingUpdateRate` | double (s) | `3` | 1–10 |
| `ChatFX` | bool | `true` | OSC "notification sound" flag |
| `KeepUpdatingChat` | bool | `true` | |
| `RealTimeChatEdit` | bool | `true` | |
| `PrefixChat` | bool | `false` | |
| `HideOpenAITools` | bool | `false` | |
| `ChatAutocompleteEnabled` | bool | `false` | |
| `ChatAutocompleteMode` | enum `ChatAutocompleteMode` | `0` LocalHistory | 0 LocalHistory, 1 OpenAI |
| `ChatAutocompleteMinCharacters` | int | `4` | 2–32 |
| `ChatAutocompleteMaxWords` | int | `2` | 1–8 |
| `ChatAutocompleteDelayMs` | int | `900` | 250–5000 |
| `ChatAutocompleteShowHint` | bool | `true` | |
| `ChatLiveTyping` | bool | `false` | |
| `ChatLiveTypingRateMs` | int | `1200` | 1000–3000 |
| `ChatLiveTypingAutoFinalize` | bool | `true` | |
| `ChatLiveTypingFinalizeMs` | int | `6000` | 2000–20000 |

### 2.5 `TimeSettings.json` — Time options (`app/Classes/Modules/TimeSettings.cs:34-42`)

| JSON name | Type | Default | Notes |
|---|---|---|---|
| `Time24H` | bool | `false` | |
| `PrefixTime` | bool | `false` | prepends superscript label "My time" (`TimeSegmentFormatter.cs:7-17`) |
| `TimeShowTimeZone` | bool | `false` | |
| `SelectedTimeZone` | enum `Timezone` | `0` UTC | |
| `UseDaylightSavingTime` | bool | `true` | |
| `UseSystemCulture` | bool | `false` | |
| `BussyBoysDate` | DateTime | `DateTime.Now` at creation | ISO string with local offset; easter egg |
| `BussyBoysDateEnable` | bool | `false` | |
| `BussyBoysMultiMODE` | bool | `false` | |

Note: the XML map also lists `AutoSetDaylight` (`SettingsMigrationService.cs:369`) but no such property exists on the class any more; it is silently skipped.

### 2.6 `TtsSettings.json` — TTS options (`app/Classes/Modules/TtsSettings.cs:8-15`)

| JSON name | Type | Default |
|---|---|---|
| `TtsTikTokEnabled` | bool | `false` |
| `TtsCutOff` | bool | `true` |
| `AutoUnmuteTTS` | bool | `true` |
| `ToggleVoiceWithV` | bool | `true` |
| `TtsVolume` | float | `0.2` |
| `RecentTikTokTTSVoice` | string | `""` |
| `RecentPlayBackOutput` | string | `""` |
| `TtsOnResendChat` | bool | `false` |

### 2.7 `OpenAISettings.json` — OpenAI (`app/Classes/Modules/OpenAISettings.cs`)

| JSON name | Type | Default | Notes |
|---|---|---|---|
| `AccessTokenEncrypted` | string | `""` | DPAPI base64 (§6). Plaintext twin `AccessToken` is JsonIgnore |
| `OrganizationIDEncrypted` | string | `""` | DPAPI base64 |

`DefaultApiStream` (line 9) is a static constant, not persisted.

### 2.8 `WindowActivitySettings.json` — Window activity (`app/Classes/Modules/WindowActivitySettings.cs`)

| JSON name | Type | Default |
|---|---|---|
| `AutoShowTitleOnNewApp` | bool | `false` |
| `TitleScan` | bool | `true` |
| `MaxShowTitleCount` | int | `35` |
| `LimitTitleOnApp` | bool | `true` |
| `TitleOnAppVR` | bool | `false` |
| `PrivateName` | string | `"🔒 App"` |
| `PrivateNameVR` | string | `"🔒 App"` |
| `HideOutputWhenPrivateApp` | bool | `false` |
| `VrTitle` | string | `"In VR"` |
| `VrFocusTitle` | string | `"ᶠᵒᶜᵘˢˢⁱⁿᵍ ⁱⁿ"` |
| `DesktopTitle` | string | `"On desktop"` |
| `DesktopFocusTitle` | string | `"ⁱⁿ"` |
| `ShowFocusedApp` | bool | `true` |
| `ApplicationHookV2` | bool | `true` |
| `ShowRegexColumn` | bool | `false` |
| `UseGlobalRegex` | bool | `true` |
| `GlobalRegex` | string | `"^(.+?)(?:\s*[-–—]\s*[^-–—]+\s*[-–—]\s*(.+)|\s*[-–—]\s*[^-–—]+)?$ => $1 $2"` (pattern ` => ` replacement) |
| `EnableTitleFilters` | bool | `false` |
| `TitleFilters` | `TitleFilterRule[]` | `[]` — items `{ "Pattern": "", "Mode": 0, "IsEnabled": true }`, `Mode`: 0 Exclude, 1 Include, 2 Remove (`app/Classes/Modules/TitleFilterRule.cs`) |

The per-application list lives in `AppHistory.json` (§4.3).

### 2.9 `ComponentStatsSettings.json` — Component stats (`app/Classes/Modules/ComponentStatsSettings.cs`), `_schemaVersion` = 2

| JSON name | Type | Default | Notes |
|---|---|---|---|
| `SelectedGPU` | string | `""` | |
| `AutoSelectGPU` | bool | `true` | |
| `UseEmojisForTempAndPower` | bool | `false` | 🌡/⚡ instead of labels |
| `GPU3DHook` | bool | `false` | |
| `GPU3DVRAMHook` | bool | `false` | |
| `EnableVendorGpuSensors` | bool | `true` | |
| `ShowGpuFanSpeed` | bool | `false` | |
| `ShowGpuCoreClock` | bool | `false` | |
| `ShowGpuMemoryClock` | bool | `false` | |
| `ShowGpuMemoryTemperature` | bool | `false` | |
| `ShowGpuMemoryLoad` | bool | `false` | |
| `StatsSeparator` | string | `" ¦ "` (U+00A6) | between CPU/GPU/RAM/VRAM |
| `TemperatureCelsius` | bool | `true` | |
| `TemperatureFahrenheit` | bool | `true` | |
| `TemperatureKelvin` | bool | `false` | |
| `TemperatureRankine` | bool | `false` | |
| `TemperatureReaumur` | bool | `false` | |
| `TemperatureCompanionScale` | enum `TemperatureCompanion` | `0` None | |
| `TemperatureDisplaySwitchInterval` | int (s) | `5` | rotates between enabled scales |
| `IsFahrenheit` | bool | `false` | legacy (schema 1) |
| `IsTemperatureSwitchEnabled` | bool | `true` | legacy (schema 1) |

Per-component items are in `ComponentStatsV1.json` (§4.1).

### 2.10 `NetworkStatsSettings.json` (`app/Classes/Modules/NetworkStatsSettings.cs:8-16`)

| JSON name | Default |
|---|---|
| `ShowCurrentDown` | `true` |
| `ShowCurrentUp` | `false` |
| `ShowMaxDown` | `false` |
| `ShowMaxUp` | `false` |
| `ShowTotalDown` | `false` |
| `ShowTotalUp` | `false` |
| `ShowNetworkUtilization` | `true` |
| `UseInterfaceMaxSpeed` | `false` |
| `StyledCharacters` | `true` |

### 2.11 `MediaLinkSettings.json` — Media link (`app/Classes/Modules/MediaLinkSettings.cs`)

| JSON name | Type | Default | Notes |
|---|---|---|---|
| `ShowOnlyOnChange` | bool | `false` | transient display |
| `IconPlay` | string | `""` | |
| `IconPause` | string | `"⏸"` | |
| `IconStop` | string | `"⏹️"` | |
| `ShowStopIcon` | bool | `true` | |
| `Separator` | string | `" ᵇʸ "` | title/artist joiner |
| `TextPlaying` | string | `"Listening to"` | |
| `TextPaused` | string | `"Paused"` | |
| `UpperCase` | bool | `false` | |
| `PauseIconMusic` | bool | `true` | |
| `TimeSeekStyle` | enum `MediaLinkTimeSeekbar` | `0` SmallNumbers | 0 SmallNumbers, 1 NumbersAndSeekBar, 2 None |
| `AutoDowngradeSeekbar` | bool | `true` | |
| `ShortenToFit` | bool | `true` | |
| `TidyTitles` | bool | `true` | |
| `AutoSwitch` | bool | `true` | |
| `AutoSwitchSpawn` | bool | `true` | |
| `SessionTimeout` | int | `3` | |
| `Disabled` | bool | `false` | |
| `TransientDuration` | double (s) | `25.0` | ≥0 |

### 2.12 `SpotifySettings.json` — Spotify (`app/Classes/Modules/SpotifySettings.cs:60-147`)

| JSON name | Type | Default | Notes |
|---|---|---|---|
| `ClientId` | string | `""` | **plaintext** (user's own Spotify app id) |
| `AccessTokenEncrypted` | string | `""` | DPAPI |
| `RefreshTokenEncrypted` | string | `""` | DPAPI |
| `TokenExpiresAtUtcTicks` | long | `0` | .NET ticks (100 ns since 0001-01-01 UTC) |
| `AutoConnectOnStartup` | bool | `true` | |
| `PollingIntervalSeconds` | int | `5` | |
| `IdlePollingIntervalSeconds` | int | `30` | |
| `PauseOutputMode` | enum `SpotifyPauseOutputMode` | `1` PauseText | 0 Hide, 1 PauseText, 2 LastTrack |
| `MediaLinkCoexistence` | enum | `0` Ask | 0 Ask, 1 PreferSpotify, 2 AllowBoth |
| `WidgetMode` | enum | `1` Detailed | 0 Compact, 1 Detailed |
| `ShowWidgetProgress/Device/Controls/Volume` | bool | `true` | UI widget |
| `AllowTrackTitleInOutput`, `AllowArtistInOutput`, `AllowAlbumInOutput`, `AllowDeviceInOutput`, `AllowVolumeInOutput`, `AllowPlaybackStateInOutput` | bool | `true` | privacy gates |
| `PrivacyChoicesCompleted` | bool | `false` | |
| `PrivacyMode` | bool | `false` | |
| `ShowTitle` | bool | `true` | |
| `ShowArtist` | bool | `true` | |
| `ShowAlbum` | bool | `false` | |
| `ShowDevice` | bool | `false` | |
| `ShowVolume` | bool | `true` | |
| `ShowProgress` | bool | `false` | |
| `ProgressDisplayMode` | enum `SpotifyProgressDisplayMode` | `2` SmallNumbers | 0 None, 1 Text, 2 SmallNumbers, 3 Seekbar |
| `AutoDowngradeProgress` | bool | `true` | |
| `ProgressBarLength` | int | `8` | |
| `ProgressShowTime` | bool | `true` | |
| `ProgressShowTimeInSuperscript` | bool | `true` | |
| `ProgressBarOnTop` | bool | `false` | |
| `ProgressSpaceAroundObjects` | bool | `true` | |
| `ProgressSpaceBetweenPreSuffixAndTime` | bool | `false` | |
| `ProgressTimePreSuffixOnTheInside` | bool | `true` | |
| `ProgressFilledCharacter` | string | `"▒"` | |
| `ProgressMiddleCharacter` | string | `"▓"` | |
| `ProgressNonFilledCharacter` | string | `"░"` | |
| `ProgressTimePrefix` / `ProgressTimeSuffix` | string | `""` | |
| `SelectedSeekbarStyleId` | int | `1` | refers to MediaLinkStyles IDs |
| `ShowExplicit`, `ShowLiked`, `ShowShuffle`, `ShowRepeat`, `PartyModeEnabled` | bool | `true` | |
| `ShowOnlyOnChange` | bool | `false` | |
| `TransientDuration` | double | `25.0` | ≥0 |
| `OutputTemplate` | string | `"{play_icon} {artist} - {title} {liked_icon} {explicit_icon}"` | |
| `PartyTemplate` | string | `"{play_icon} DJ: {title} - {artist} {queue}"` | |
| `DisconnectedText` | string | `"Spotify: connect account"` | |
| `EmptyText` | string | `"Spotify: nothing playing"` | |
| `PausedText` | string | `"Spotify paused"` | |
| `PrivacyHiddenText` | string | `"Hidden"` | |
| `IconPlaying` | string | `"▶"` | |
| `IconPaused` | string | `"⏸"` | |
| `IconExplicit` | string | `"🅴"` | |
| `IconLiked` | string | `"♥"` | |
| `IconUnliked` | string | `"♡"` | |
| `IconShuffleOn` | string | `"🔀"` | |
| `IconShuffleOff` | string | `""` | |
| `IconRepeatOff` | string | `""` | |
| `IconRepeatContext` | string | `"🔁"` | |
| `IconRepeatTrack` | string | `"🔂"` | |
| `Separator` | string | `" - "` | |

Template placeholders (case-insensitive; `\n` literal → newline; `SpotifyModule.cs:1035-1053`): `{play_icon} {artist} {title} {album} {device} {volume} {queue} {seekbar} {progress} {remaining} {elapsed} {duration} {percent} {liked_icon} {explicit_icon} {shuffle_icon} {repeat_icon}`. When over budget, tokens are dropped in this order: queue, volume, device, album, seekbar, progress, remaining, elapsed, duration, percent, liked_icon, explicit_icon, shuffle_icon, repeat_icon, artist (lines 1018-1034).

### 2.13 `PulsoidModuleSettings.json` — Heart rate (`app/Classes/Modules/PulsoidModuleSettings.cs`)

| JSON name | Type | Default | Notes |
|---|---|---|---|
| `ApplyHeartRateAdjustment` | bool | `false` | |
| `ThrottleHR` | bool | `false` | |
| `ThrottleMaxAdditional` | int | `10` | |
| `ThrottleHRMax` | int | `105` | 40–199 |
| `CurrentHeartRateTitle` | string | `"Heart Rate"` | |
| `DisableLegacySupport` | bool | `false` | |
| `EnableHeartRateOfflineCheck` | bool | `true` | |
| `HeartIcons` | string[] | `["❤️","💖","💗","💙","💚","💛","💜"]` | ObjectCreationHandling.Replace |
| `HeartRateAdjustment` | int | `-5` | |
| `HeartRateScanInterval` | int (s) | `1` | |
| `HeartRateTitle` | bool | `false` | show title prefix |
| `HeartRateTrendIndicatorSampleRate` | int | `4` | |
| `HeartRateTrendIndicatorSensitivity` | double | `0.65` | |
| `HideCurrentHeartRate` | bool | `false` | |
| `HighHeartRateText` | string | `"hot"` | |
| `HighTemperatureThreshold` | int | `100` | |
| `LowHeartRateText` | string | `"sleepy"` | |
| `LowTemperatureThreshold` | int | `60` | |
| `MagicHeartIconPrefix` | bool | `true` | |
| `MagicHeartRateIcons` | bool | `true` | |
| `PulsoidStatsEnabled` | bool | `true` | |
| `PulsoidTrendSymbols` | `PulsoidTrendSymbolSet[]` | `[]` | items `{ "DownwardTrendSymbol": "↓", "UpwardTrendSymbol": "↑", "CombinedTrendSymbol": "↑ - ↓" }` (CombinedTrendSymbol is a get-only computed property; Newtonsoft writes it and ignores it on read) |
| `SelectedPulsoidTrendSymbol` | object | `{"↓","↑"}` | same shape |
| `SelectedStatisticsTimeRange` | enum `StatisticsTimeRange` | `0` `_24h` | 0 _24h, 1 _7d, 2 _30d |
| `SentMCBHeartrateInfo` | bool | `false` | |
| `SentMCBHeartrateInfoLegacy` | bool | `false` | |
| `SeparateTitleWithEnter` | bool | `false` | title joiner `"\v"` vs `": "` |
| `ShowAverageHeartRate` | bool | `true` | |
| `ShowBPMSuffix` | bool | `false` | superscript "bpm" |
| `ShowCalories` | bool | `false` | |
| `ShowDuration` | bool | `false` | |
| `ShowHeartRateTrendIndicator` | bool | `true` | |
| `ShowMaximumHeartRate` | bool | `true` | |
| `ShowMinimumHeartRate` | bool | `true` | |
| `ShowStatsTimeRange` | bool | `false` | |
| `ShowTemperatureText` | bool | `true` | |
| `SmoothHeartRate` | bool | `true` | |
| `SmoothHeartRateTimeSpan` | int | `4` | |
| `SmoothOSCHeartRate` | bool | `true` | |
| `SmoothOSCHeartRateTimeSpan` | int | `4` | |
| `StatisticsTimeRanges` | int[] (enum) | `[]` | |
| `TrendIndicatorBehindStats` | bool | `true` | |
| `UnchangedHeartRateTimeoutInSec` | int | `30` | |
| `AccessTokenOAuthEncrypted` | string | `""` | DPAPI; plaintext `AccessTokenOAuth` is JsonIgnore |
| `CurrentHeartIconIndex`, `HeartRateIcon`, `HeartRateTrendIndicator`, `TokenEncryptionFailed`, `StoredTokenUnreadable` | — | — | *(not persisted)* |

### 2.14 `WeatherSettings.json` — Weather (`app/Classes/Modules/WeatherSettings.cs:69-151`)

| JSON name | Type | Default | Notes |
|---|---|---|---|
| `ShowWeatherInTime` | bool | `true` | acts as the weather master enable (`WeatherOscProvider.cs:27-29`) |
| `ShowWeatherCondition` | bool | `false` | |
| `ShowWeatherEmoji` | bool | `false` | |
| `WeatherUseDecimal` | bool | `false` | |
| `ShowWeatherHumidity` | bool | `false` | |
| `ShowWeatherWind` | bool | `false` | |
| `ShowWeatherFeelsLike` | bool | `false` | |
| `WeatherSeparator` | string | `" \| "` | |
| `WeatherStatsSeparator` | string | `" "` | |
| `WeatherConditionOverrides` | string | `""` | encoded list: entries split on `\n` or `;`, each `code=value` or `code:value`, value optionally `icon|text` (`WeatherService.cs:851-899`). e.g. `"0=☀️\|Clear;61=🌧️\|Rain"` |
| `WeatherCustomOverridesEnabled` | bool | `false` | |
| `WeatherLayoutMode` | enum `WeatherLayoutMode` | `0` SingleLine | 0 SingleLine, 1 TwoLines |
| `WeatherOrder` | enum `WeatherOrder` | `0` TimeFirst | 0 TimeFirst, 1 WeatherFirst |
| `WeatherUnitOverride` | enum `WeatherUnitOverride` | `0` UseGlobal | 0 UseGlobal,1 Celsius,2 Fahrenheit,3 Kelvin,4 Rankine,5 Reaumur |
| `WeatherCompanionScale` | enum `TemperatureCompanion` | `0` None | |
| `WeatherWindUnitOverride` | enum | `0` UseGlobal | 0 UseGlobal, 1 KilometersPerHour, 2 MilesPerHour |
| `WeatherFallbackMode` | enum | `0` Hide | 0 Hide, 1 KeepLast, 2 ShowNA |
| `WeatherLocationMode` | enum | `0` CustomCity | 0 CustomCity, 1 CustomCoordinates, 2 IPBased |
| `WeatherAllowIPLocation` | bool | `false` | |
| `WeatherLocationEditing` | bool | `false` | UI state, but persisted |
| `WeatherLocationLatitude` / `Longitude` | double | `0` | |
| `WeatherUpdateIntervalMinutes` | int | `10` | `<1` → 10 |
| `WeatherTemplate` | string | `""` | capped at 144 chars; tokens `{temp} {unit} {condition} {emoji} {feels} {humidity} {wind} {time} {weather} {lat} {lon}` |
| `WeatherLocationCityEncrypted` | string | `""` | **DPAPI-encrypted city name**; plaintext default `"London"` (JsonIgnore) |

### 2.15 `TwitchSettings.json` — Twitch (`app/Classes/Modules/TwitchSettings.cs`)

| JSON name | Type | Default | Notes |
|---|---|---|---|
| `ChannelName` | string | `""` | |
| `ClientIdEditing`, `AccessTokenEditing` | bool | `false` | UI, persisted |
| `ShowViewerCount` | bool | `true` | |
| `ShowGameName` | bool | `true` | |
| `ShowLiveIndicator` | bool | `true` | |
| `LivePrefix` | string | `"LIVE"` | |
| `OfflineMessage` | string | `""` | |
| `ShowStreamTitle` | bool | `false` | |
| `StreamTitlePrefix` | string | `"title"` | |
| `ShowChannelName` | bool | `false` | |
| `ChannelPrefix` | string | `"channel"` | |
| `GamePrefix` | string | `"playing"` | |
| `ShowViewerLabel` | bool | `true` | |
| `ViewerLabel` | string | `"viewers"` | |
| `ViewerCountCompact` | bool | `false` | |
| `ShowFollowerCount` | bool | `false` | |
| `ShowFollowerLabel` | bool | `true` | |
| `FollowerLabel` | string | `"followers"` | |
| `FollowerCountCompact` | bool | `false` | |
| `UseSmallText` | bool | `true` | superscript labels |
| `Separator` | string | `" \| "` | |
| `Template` | string | `""` | empty → built-in layout; tokens `{live} {channel} {game} {title} {viewers} {followers} {user} {url} {status}` |
| `TemplateHasValue` | bool | computed | written (get-only), ignored on read |
| `UpdateIntervalSeconds` | int | `60` | 15–3600 |
| `AnnouncementsEnabled` | bool | `false` | |
| `AnnouncementMessage` | string | `""` | |
| `AnnouncementColor` | enum `TwitchAnnouncementColor` | `0` Primary | 0 Primary,1 Blue,2 Green,3 Orange,4 Purple |
| `ShoutoutsEnabled` | bool | `false` | |
| `ShoutoutTarget` | string | `""` | |
| `ShoutoutAlsoAnnounce` | bool | `true` | |
| `ShoutoutAnnouncementTemplate` | string | `"Go follow {user} at twitch.tv/{user}"` | |
| `ShoutoutAnnouncementColor` | enum | `4` Purple | |
| `ClientIdEncrypted` | string | `""` | DPAPI |
| `AccessTokenEncrypted` | string | `""` | DPAPI |

### 2.16 `TikTokLiveSettings.json` (`app/Classes/Modules/TikTokLiveSettings.cs`), `_schemaVersion` = 3

| JSON name | Type | Default | Range |
|---|---|---|---|
| `ProfileUserName` | string | `""` | |
| `ShowProfileSummary` | bool | `true` | |
| `ProfileTemplate` | string | `"TikTok @{profile} \| {followers} followers"` | |
| `ProfileRefreshMinutes` | int | `30` | 15–720 |
| `ShowProfileFollowerChangeEvents` | bool | `true` | |
| `ProfileFollowerChangeTemplate` | string | `"TikTok +{change} followers \| {followers} total"` | |
| `ProfileFollowerChangeDurationSeconds` | int | `8` | 2–30 |
| `HostUserName` | string | `""` | |
| `EnableLiveConnector` | bool | `false` | |
| `ExperimentalEnabled` | bool | `false` | |
| `AutoConnectOnStartup` | bool | `true` | |
| `DisplayMode` | enum `TikTokLiveDisplayMode` | `1` EventOverlay | 0 SummaryOnly, 1 EventOverlay, 2 TransientOnly |
| `CombineProfileAndLive` | bool | `true` | |
| `OutputOrder` | enum `TikTokOutputOrder` | `0` ProfileThenLive | 0 ProfileThenLive, 1 LiveThenProfile |
| `CombinedOutputSeparator` | string | `" \| "` | |
| `CompactViewerCount` | bool | `true` | |
| `CompactLikeCount` | bool | `true` | |
| `SummaryTemplate` | string | `"LIVE @{host} \| {viewers} viewers \| {likes} likes"` | |
| `ShowFollowEvents` | bool | `true` | |
| `ShowCommentEvents` | bool | `false` | |
| `ShowGiftEvents` | bool | `true` | |
| `ShowLikeEvents` | bool | `false` | |
| `ShowViewerMilestones` | bool | `false` | |
| `FollowTemplate` | string | `"➕ {user} followed"` | |
| `CommentTemplate` | string | `"💬 {user}: {message}"` | |
| `GiftTemplate` | string | `"🎁 {user} sent {gift} x{count}"` | |
| `LikeTemplate` | string | `"❤️ {user} +{count} likes"` | |
| `ViewerMilestoneTemplate` | string | `"👀 {viewers} viewers"` | |
| `EventDurationSeconds` | int | `6` | 2–30 |
| `ViewerMilestoneDurationSeconds` | int | `4` | 2–30 |
| `LikeBurstThreshold` | int | `25` | 5–5000 |
| `ViewerCountMilestoneStep` | int | `100` | 10–10000 |
| `ReconnectDelaySeconds` | int | `6` | 3–60 |
| `ConnectionTimeoutSeconds` | int | `15` | 5–60 |

### 2.17 `DiscordSettings.json` — Discord (`app/Classes/Modules/DiscordSettings.cs`)

| JSON name | Type | Default | Notes |
|---|---|---|---|
| `Template` | string | `"🔊 {channel} ({count}) \| 🎙️ {speaking}"` | tokens `{channel} {count} {speaking} {speaking_count} {mute_emoji} {mute_state} {voice_state}`; presets lines 158-169 |
| `EmptySpeakingText` | string | `"Quiet..."` | |
| `NotInVcText` | string | `""` | |
| `MaxSpeakingUsersToShow` | int | `2` | |
| `ShowMuteDeafenEmoji` | bool | `true` | |
| `MuteEmoji` | string | `"ᵐᵘᵗᵉᵈ"` | |
| `DeafenEmoji` | string | `"ᵈᵉᵃᶠᵉⁿ"` | |
| `AutoConnectOnStartup` | bool | `false` | |
| `HideSelfFromSpeakers` | bool | `false` | |
| `ShowUserCountOnly` | bool | `false` | |
| `SpeakerDebounceMs` | int | `500` | |
| `SendMuteDeafenOsc` | bool | `false` | |
| `SendVoiceStateOsc` | bool | `false` | |
| `EnableRichPresence` | bool | `false` | |
| `RichPresenceDetails` | string | `"In {world}"` | |
| `RichPresenceState` | string | `"{count} players • {type}"` | |
| `RichPresenceShowJoinButton` | bool | `false` | |
| `RichPresenceLargeText` | string | `"VRChat"` | |
| `RichPresenceLargeImageKey` | string | `"vrchat_logo"` | |
| `RichPresenceSmallImageKey` | string | `"magicchatbox"` | |
| `RichPresenceSmallText` | string | `"MagicChatbox"` | |
| `RichPresenceShowElapsed` | bool | `true` | |
| `RichPresenceShowVrDesktopMode` | bool | `true` | |
| `RichPresenceJoinButtonLabel` | string | `"Join World"` | |
| `VoiceClientIdEncrypted` | string | `""` | DPAPI; plaintext default = built-in client id `"1495716413980278814"` (`Constants.cs:41`) |
| `VoiceClientId` | string | — | **read-only legacy** plaintext key |
| `TokenExpiresAtUtcTicks` | long | `0` | .NET ticks |
| `HasRpcScope` | bool | `true` | |
| `AccessTokenEncrypted`, `RefreshTokenEncrypted` | string | `""` | DPAPI |
| `VoiceClientIdEditing` | — | — | *(not persisted)* |

### 2.18 `VrcLogSettings.json` — VRC radar (`app/Classes/Modules/VrcLogSettings.cs:27-67`)

| JSON name | Type | Default |
|---|---|---|
| `DisplayMode` | enum `RadarDisplayMode` | `2` EventOverlay (0 AlwaysShow, 1 TransientOnly, 2 EventOverlay, 3 JoinLeaveOnly, 4 CompactInfo) |
| `AnnounceJoins` / `AnnounceLeaves` / `AnnounceScreenshots` | bool | `true` |
| `ShowInstanceType` / `ShowRegion` / `ShowWorldDownload` | bool | `true` |
| `DetectSeenAgain` | bool | `false` |
| `SeenAgainWindowMinutes` | int | `5` |
| `ShowSessionStatsInChatbox` | bool | `false` |
| `ShowSeenAgainNotification` | bool | `true` |
| `WarnOnAvatarBlocked` | bool | `true` |
| `UseWindowDetection` | bool | `true` |
| `SessionTimeoutMinutes` | int | `15` |
| `ShowEncounterTable` | bool | `false` |
| `MinEncounterCount` | int | `2` |
| `TemplateWorld` | string | `"{master}🌎 {world} \| 👥 {count} \| {type} {region}"` |
| `TemplateJoin` | string | `"👋 {user} joined!"` |
| `TemplateLeave` | string | `"🏃 {user} left"` |
| `TemplateScreenshot` | string | `"📸 *Click!* Just took a picture!"` |
| `TemplateDownload` | string | `"⏳ Loading world... {size}MB @ {speed}MB/s"` |
| `TemplateSeenAgain` | string | `"👀 {user} is here again!"` |
| `TemplateSessionStats` | string | `"📊 {worlds} worlds \| {players} players met \| Peak: {peak_session}"` |
| `TemplateAvatarBlocked` | string | `"⚠️ Avatar blocked by performance shield"` |
| `MasterIcon` | string | `"👑 "` |
| `JoinLeaveDuration` | int (s) | `4` |
| `ScreenshotDuration` | int | `4` |
| `DownloadDuration` | int | `8` |
| `SeenAgainDuration` | int | `5` |
| `SessionStatsDuration` | int | `15` |
| `AvatarBlockedDuration` | int | `6` |
| `SendCameraFlashOsc` | bool | `false` |
| `OscCameraFlashParam` | string | `"/avatar/parameters/CameraFlash"` |
| `MaxBackfillSizeMb` | int | `10` |

World template tokens: `{master} {world} {count} {peak} {type} {region} {owner} {session_time} {app_session} {worlds} {players} {peak_session}`.

### 2.19 `TrackerBatterySettings.json` (`app/Classes/Modules/TrackerBatterySettings.cs`)

| JSON name | Type | Default | Range |
|---|---|---|---|
| `Template` | string | `"{icon} {name} {batt}%"` | tokens `{icon} {name} {batt} {kind} {model} {serial} {low} {status} {connected} {total} {message}` |
| `Prefix` / `Suffix` | string | `""` | |
| `Separator` | string | `" \| "` | |
| `GlobalEmergency` | bool | `false` | |
| `ShowControllers` | bool | `true` | |
| `ShowHeadset` | bool | `true` | |
| `ShowTrackers` | bool | `false` | |
| `ShowDisconnected` | bool | `false` | |
| `OfflineBatteryText` | string | `"N/A"` | |
| `OnlineText` | string | `"Online"` | |
| `OfflineText` | string | `"Offline"` | |
| `LowTag` | string | `"LOW"` | |
| `CompactWhitespace` | bool | `true` | |
| `UseSmallText` | bool | `false` | |
| `SortMode` | enum `TrackerBatterySortMode` | `0` None | 0 None,1 Name,2 BatteryLowToHigh,3 BatteryHighToLow,4 TypeThenName |
| `RotateOverflow` | bool | `false` | |
| `LowThreshold` | int | `20` | 1–100 |
| `MaxEntries` | int | `2` | ≥0 |
| `RotationIntervalSeconds` | int | `5` | ≥1 |
| `MaxEntryLength` | int | `0` | ≥0 |
| `SavedDevices` | `TrackerDevice[]` | `[]` | see §4.5 |

### 2.20 `VrPerformanceSettings.json` (`app/Classes/Modules/Vr/VrPerformanceSettings.cs`)

| JSON name | Type | Default |
|---|---|---|
| `ShowFps` | bool | `true` |
| `ShowTargetHz` | bool | `false` |
| `ShowReprojection` | bool | `true` |
| `ShowDroppedFrames`, `ShowMotionSmoothing`, `ShowAppGpuMs`, `ShowCompositorGpuMs`, `ShowHeadroom`, `ShowCpuTiming` | bool | `false` |
| `UseEmojisForVrPerf` | bool | `true` |
| `UseSuperscriptUnits` | bool | `true` |
| `StatsSeparator` | string | `" ¦ "` |
| `RemoveNumberTrailing` | bool | `false` |
| `DisplayMode` | enum `VrPerformanceDisplayMode` | `0` Always (1 OnlyWhenDegraded, 2 CompactThenExpand) |
| `DegradedReprojectionPercent` | double | `10` |
| `DegradedDroppedPerMinute` | double | `5` |
| `DegradedFpsPercentOfTarget` | double | `90` |
| `DegradedHysteresisSeconds` | int | `5` |

### 2.21 `LyricsSettings.json` (`app/Classes/Modules/Lyrics/LyricsSettings.cs`)

| JSON name | Type | Default |
|---|---|---|
| `OffsetMs` | int | `0` |
| `ShowNoteIcon` | bool | `true` |
| `ShowGapMarker` | bool | `true` |
| `MinimumCharacters` | int | `24` |
| `Coexistence` | enum `LyricsMediaCoexistence` | `1` PreferLyrics (0 SideBySide) |
| `GapThresholdSeconds` | int | `8` |
| `LineHoldSeconds` | int | `6` |
| `UseLocalFiles` | bool | `true` |
| `LocalLyricsFolder` | string | `""` |
| `InstrumentalMarker` | enum `LyricsInstrumentalMarker` | `3` TrailingDots (values: 0 Note, 1 BouncingNotes, 3 TrailingDots, 6 Vinyl, 8 Pulse, 9 BouncingBall — **non-contiguous**) |
| `SuperscriptAsides` | bool | `true` |
| `MatchStrictness` | enum `LyricsMatchStrictness` | `1` Balanced (0 Relaxed, 1 Balanced, 2 Strict; `Lyrics/LyricsMatchOptions.cs:5-14`) |
| `BroadenSearchWhenNoMatch` | bool | `true` |

### 2.22 `VoicemodSettings.json` (`app/Classes/Modules/Voicemod/VoicemodSettings.cs`)

| JSON name | Type | Default | Range |
|---|---|---|---|
| `VoiceControlEnabled` | bool | `false` | |
| `SoundboardControlEnabled` | bool | `true` | |
| `MicControlEnabled` | bool | `false` | |
| `AnnounceSoundboardToChat` | bool | `true` | |
| `SoundAnnouncementDurationSeconds` | int | `8` | 2–15 |
| `AnnounceVoiceToChat` | bool | `false` | |
| `SoundSort` | enum `VoicemodSoundSort` | `0` Recent (1 Name) | |
| `SoundsPerPage` | int | `24` | 8–96 |
| `CompactSoundBlobs` | bool | `false` | |
| `ShowSoundThumbnails` | bool | `true` | |
| `ShowSoundboardStrip` | bool | `true` | |
| `FavoriteSoundIds` | string[] | `[]` | |
| `RecentSoundIds` | string[] | `[]` | max 40 |
| `LocalClientKeyEncrypted` | string | `""` | DPAPI |
| `AnyFeatureEnabled`, `LiveSwitchesEnabled` | bool | computed | get-only, written but ignored on read |

### 2.23 `PrivacySettings.json` (`app/Core/Privacy/PrivacySettings.cs`)

Eleven consent triples, each `{X}Consent` (enum `ConsentState`: 0 Unknown, 1 Approved, 2 Denied), `{X}ConsentVersion` (int, 0), `{X}DecidedAt` (DateTime?, null), for X ∈ `HardwareMonitor, WindowActivity, MediaSession, AfkSensor, InternetAccess, VrTrackerBattery, NetworkStats, SoundpadBridge, VrcLogReader, VrPerformance, VoicemodControl`.

### 2.24 Non-provider settings files

**`AfkModuleSettings.json`** (`app/Classes/Modules/AfkModule.cs:52-91`) — no `_schemaVersion`:

| JSON name | Type | Default |
|---|---|---|
| `AfkTimeout` | int (s) | `120` |
| `EnableAfkDetection` | bool | `true` |
| `UseSmallLettersForDuration` | bool | `true` |
| `ShowPrefixIcon` | bool | `true` |
| `AfkPrefix` | string | `"💤"` |
| `ActivateInVR` | bool | `false` |
| `ShowAFKTime` | bool | `true` |
| `AfkMessageForTimeStamp` | string | `"ᶜᵘʳʳᵉⁿᵗˡʸ AFK ᶠᵒʳ "` |
| `AfkMessageWithoutTimeStamp` | string | `"ᶜᵘʳʳᵉⁿᵗˡʸ AFK"` |
| `OverrideAfk` | bool | `false` |
| `CustomStyles` | `AfkStyle[]` | `[]` |
| `Styles` | `AfkStyle[]` | legacy read-only (omitted when null) |
| `ActiveStyleId` | string | `""` → resolved to `"builtin-classic"` |

`AfkStyle` (`app/Classes/Modules/Afk/AfkStyle.cs:9-19`): `{ "Id": "<guid>", "Name": "New style", "ShowPrefix": true, "Prefix": "💤", "ShowTime": true, "MessageWithTime": "ᶜᵘʳʳᵉⁿᵗˡʸ AFK ᶠᵒʳ ", "MessageWithoutTime": "ᶜᵘʳʳᵉⁿᵗˡʸ AFK", "IsBuiltIn": false }`. Built-in ids: `builtin-classic, builtin-plain, builtin-smallcaps, builtin-backsoon, builtin-dozing, builtin-grass, builtin-gym, builtin-food, builtin-coffee, builtin-shower, builtin-cat, builtin-oneminute, builtin-onemore, builtin-deceased, builtin-phone, builtin-staring` (`AfkStyle.cs:49-194`); built-ins are never written to disk.

**`IntelliChatSettings.json`** (`app/Classes/Modules/IntelliChatModuleSettings.cs`) — carries `_schemaVersion/_appVersion/_migratedAt` (inherits VersionedSettings) but is written by the module: `AutolanguageSelection` (true), `GenerateConversationStarterModel` (enum `IntelliGPTModel`, 4 = gpt5_nano), `IntelliChatError` (false), `IntelliChatErrorTxt` (""), `IntelliChatPerformModeration` (true), `IntelliChatPerformModerationTimeout` (7), `IntelliChatTimeout` (10), `IntelliChatTxt`, `IntelliChatUILabel`, `IntelliChatUILabelTxt`, `IntelliChatWaitingToAccept`, `PerformBeautifySentenceModel`/`PerformLanguageTranslationModel`/`PerformShortenTextModel`/`PerformSpellingCheckModel`/`PerformTextCompletionModel` (4), `PerformModerationCheckModel` (18 = Moderation_Latest), `SelectedSupportedLanguages[]`, `SelectedTranslateLanguage`, `SelectedWritingStyle`, `SupportedLanguages[]` (`{ID, IsBuiltIn, IsFavorite, Language}`), `SupportedWritingStyles[]` (`{ID, IsBuiltIn, IsFavorite, StyleDescription, StyleName, Temperature}`), `TokenUsageData` (`{DailyUsages:[{Date, ModelUsages:[{CompletionTokens, ModelName, PromptTokens, TotalTokens}], TotalDailyRequests, TotalDailyTokens}], LastRequestModelName, LastRequestTotalTokens, TotalDailyRequests, TotalDailyTokens}`). `IntelliGPTModel` values 0..19 listed in `app/Classes/Modules/IntelliChatTypes.cs:42-103`.

**`WhisperModuleSettings.json`** (`app/Classes/Modules/WhisperModule.cs:28-66`): `AvailableDevices[]` (`{DeviceIndex, DeviceName}`), `SpeechToTextModel` (enum IntelliGPTModel), `IsNoiseGateOpen`, `IsRecording`, `NoiseGateThreshold` (0.12), `SendAftersilence` (true), `SelectedDeviceIndex` (-1), `SelectedSpeechToTextLanguage` (`{Language, Code}`), `SilenceAutoTurnOffDuration` (3000), `SpeechToTextLanguages[]`, `TranslateToCustomLanguage` (false).

**`HotkeyConfiguration.json`** (`app/Classes/DataAndSecurity/HotkeyManagement.cs:53-55, 289-305`):
```json
{
  "ToggleVoiceGlobal": { "Key": "V", "Modifiers": "Alt" },
  "OpenTrayMenuGlobal": { "Key": "X", "Modifiers": "Alt" }
}
```
`Key`/`Modifiers` are WPF `System.Windows.Input.Key` / `ModifierKeys` enum **names** (strings), parsed with `Enum.TryParse`.

**`vrcosc_session.json`** (`app/Classes/Modules/VrcLogModule.cs:1341-1350`; System.Text.Json, so PascalCase, ISO `DateTimeOffset`): `{ InstanceKey, WorldName, WorldJoinedAt, AppStartedAt, LastActiveAt, TotalOfflineSeconds, LogFileName }`. Runtime state, not user config.

### 2.25 Enum value tables

All enums serialize as integers (no `StringEnumConverter` anywhere in the codebase).

| Enum | Values (index: name) | Source |
|---|---|---|
| `Timezone` | 0 UTC, 1 GMT, 2 EST, 3 CST, 4 MST, 5 PST, 6 AKST, 7 HST, 8 CET, 9 EET, 10 IST, 11 CSTChina, 12 JST, 13 KST, 14 MSK, 15 AEST, 16 NZST, 17 BRT, 18 SAST | `app/ViewModels/InternalEnums.cs:16-37` |
| `WeatherLayoutMode` | 0 SingleLine, 1 TwoLines | :39-45 |
| `WeatherOrder` | 0 TimeFirst, 1 WeatherFirst | :47-53 |
| `WeatherUnitOverride` | 0 UseGlobal, 1 Celsius, 2 Fahrenheit, 3 Kelvin, 4 Rankine, 5 Reaumur | :55-69 |
| `WeatherFallbackMode` | 0 Hide, 1 KeepLast, 2 ShowNA | :71-79 |
| `WeatherWindUnitOverride` | 0 UseGlobal, 1 KilometersPerHour, 2 MilesPerHour | :81-89 |
| `WeatherLocationMode` | 0 CustomCity, 1 CustomCoordinates, 2 IPBased | :91-99 |
| `StatsComponentType` | 0 GPU, 1 CPU, 2 RAM, 3 VRAM, 4 FPS, 5 Unknown | :101-109 |
| `TrackerBatterySortMode` | 0 None, 1 Name, 2 BatteryLowToHigh, 3 BatteryHighToLow, 4 TypeThenName | :120-132 |
| `TwitchAnnouncementColor` | 0 Primary, 1 Blue, 2 Green, 3 Orange, 4 Purple | :134-146 |
| `MediaLinkTimeSeekbar` | 0 SmallNumbers, 1 NumbersAndSeekBar, 2 None | :148-156 |
| `StatusSortField` (UI only) | 0 LastUsed, 1 MyCycles, 2 CreationDate, 3 LastEdited | `app/ViewModels/StatusSortField.cs` |
| `ChatAutocompleteMode` | 0 LocalHistory, 1 OpenAI | `ChatSettings.cs:104-111` |
| `UpdateChannelMode` | 0 Off, 1 Notify, 2 Auto | `app/Core/Updates/UpdateChannels.cs:9-14` |
| `ConsentState` | 0 Unknown, 1 Approved, 2 Denied | `app/Core/Privacy/ConsentState.cs` |
| `TemperatureScale` | 0 Celsius, 1 Fahrenheit, 2 Kelvin, 3 Rankine, 4 Reaumur | `app/Core/Units/TemperatureScale.cs:5-21` |
| `TemperatureCompanion` | 0 None, 1 Celsius, 2 Fahrenheit, 3 Kelvin, 4 Rankine, 5 Reaumur | :23-42 |
| `SpotifyPauseOutputMode` | 0 Hide, 1 PauseText, 2 LastTrack | `SpotifySettings.cs:10-15` |
| `SpotifyMediaLinkCoexistence` | 0 Ask, 1 PreferSpotify, 2 AllowBoth | :17-25 |
| `SpotifyWidgetMode` | 0 Compact, 1 Detailed | :27-31 |
| `SpotifyProgressDisplayMode` | 0 None, 1 Text, 2 SmallNumbers, 3 Seekbar | :33-43 |
| `TikTokLiveDisplayMode` | 0 SummaryOnly, 1 EventOverlay, 2 TransientOnly | `TikTokLiveSettings.cs:8-16` |
| `TikTokOutputOrder` | 0 ProfileThenLive, 1 LiveThenProfile | :18-25 |
| `RadarDisplayMode` | 0 AlwaysShow, 1 TransientOnly, 2 EventOverlay, 3 JoinLeaveOnly, 4 CompactInfo | `VrcLogSettings.cs:7-23` |
| `VrPerformanceDisplayMode` | 0 Always, 1 OnlyWhenDegraded, 2 CompactThenExpand | `VrPerformanceSettings.cs:7-17` |
| `LyricsMediaCoexistence` | 0 SideBySide, 1 PreferLyrics | `LyricsSettings.cs:10-17` |
| `LyricsInstrumentalMarker` | 0 Note, 1 BouncingNotes, 3 TrailingDots, 6 Vinyl, 8 Pulse, 9 BouncingBall | `Lyrics/InstrumentalMarker.cs:8-26` |
| `LyricsMatchStrictness` | 0 Relaxed, 1 Balanced, 2 Strict | `Lyrics/LyricsMatchOptions.cs:5-14` |
| `VoicemodSoundSort` | 0 Recent, 1 Name | `VoicemodSettings.cs:12-19` |
| `FilterMode` | 0 Exclude, 1 Include, 2 Remove | `TitleFilterRule.cs:18-28` |
| `StatisticsTimeRange` | 0 _24h, 1 _7d, 2 _30d | `PulsoidTypes.cs:6-13` |
| `IntelliGPTModel` | 0 gpt5_2 … 19 gpt_transcribe (4 = gpt5_nano, 18 = Moderation_Latest) | `IntelliChatTypes.cs:42-103` |

---

## 3. `StatusList.json` — status items, groups, cycling

Source: `app/Services/StatusListService.cs`, models `app/ViewModels/Models/StatusItem.cs`, `app/ViewModels/Models/StatusGroup.cs`.

Written (not via `AtomicFileWriter`, but same tmp+move pattern) with `Formatting.Indented`, debounced 2 s (`StatusListService.cs:22, 74-80, 99-110`).

```json
{
  "Version": 2,
  "Groups": [
    {
      "GroupId": "3b1c2f4e-8a7d-4c1e-9f0a-1234567890ab",
      "Name": "Default",
      "IsActiveForCycle": true,
      "CreationDate": "2025-05-01T14:03:22.1234567+02:00"
    },
    {
      "GroupId": "9d8e7f6a-5b4c-4d3e-8f2a-0987654321ba",
      "Name": "Gaming",
      "IsActiveForCycle": false,
      "CreationDate": "2025-06-10T20:15:00+02:00"
    }
  ],
  "Items": [
    {
      "GroupId": "3b1c2f4e-8a7d-4c1e-9f0a-1234567890ab",
      "IsSelected": false,
      "UseInCycle": true,
      "CreationDate": "2025-05-01T14:03:22.1234567+02:00",
      "editMsg": "",
      "IsActive": true,
      "IsEditing": false,
      "IsFavorite": true,
      "LastEdited": "2025-05-01T14:03:22.1234567+02:00",
      "LastUsed": "2025-06-11T09:00:00+02:00",
      "msg": "Enjoy 💖",
      "MSGID": 48213377
    },
    {
      "GroupId": "3b1c2f4e-8a7d-4c1e-9f0a-1234567890ab",
      "IsSelected": false,
      "UseInCycle": false,
      "CreationDate": "2025-05-01T14:03:22.1234567+02:00",
      "editMsg": "",
      "IsActive": false,
      "IsEditing": false,
      "IsFavorite": false,
      "LastEdited": "0001-01-01T00:00:00",
      "LastUsed": "0001-01-01T00:00:00",
      "msg": "Below you can create your own status",
      "MSGID": 91237
    }
  ]
}
```

Field semantics:

| Model | Key | Type | Notes |
|---|---|---|---|
| bundle | `Version` | int | `2` (`CurrentSchemaVersion`, line 20) |
| bundle | `Groups`, `Items` | arrays | either may be null → treated as empty |
| StatusGroup | `GroupId` | string GUID | `Guid.NewGuid().ToString()` (lower-case, hyphenated) |
| StatusGroup | `Name` | string | `"Default"` is special: cannot be deleted; created if missing (`EnsureDefaultGroup`, lines 227-239, with `CreationDate = DateTime.MinValue` → `"0001-01-01T00:00:00"`) |
| StatusGroup | `IsActiveForCycle` | bool | group participates in cycling |
| StatusGroup | `CreationDate` | DateTime | |
| StatusGroup | `IsRenaming`, `RenameBuffer`, `IsPopupSelected`, `IsDefault` | — | JsonIgnore |
| StatusItem | `msg` | string | **lower-case key**. The status text |
| StatusItem | `MSGID` | int | random in [10, 99999999) (`Constants.cs:112-113`) |
| StatusItem | `GroupId` | string? | null/unknown → reassigned to Default group on load (lines 241-247) |
| StatusItem | `IsActive` | bool | the one currently sent to OSC (exactly one expected) |
| StatusItem | `IsFavorite` | bool | |
| StatusItem | `UseInCycle` | bool | included in cycling |
| StatusItem | `CreationDate`, `LastEdited`, `LastUsed` | DateTime | default `0001-01-01T00:00:00` |
| StatusItem | `editMsg`, `IsEditing`, `IsSelected` | | UI state; **persisted** (no JsonIgnore) — safe to emit `""`/`false` |

Easter eggs: an item whose `msg` equals `boihanny` / `sr4 series` enables dev egg, `bussyboys` enables BussyBoys mode (lines 262-270).

Cycling settings live in `AppSettings.json`: `CycleStatus`, `SwitchStatusInterval`, `IsRandomCycling`, `CycleOverrideCurrentGroup`, `CycleOverrideGroupId`, `LastSelectedGroupId` (algorithm in `app/Core/Osc/Providers/StatusOscProvider.cs:100-208`: candidates are `UseInCycle` items whose group `IsActiveForCycle` (or the override group); round-robin, or weighted random by seconds-since-`LastUsed`).

Defaults when no file exists (lines 272-292): one "Default" group and three items: `"Enjoy 💖"` (active), `"Below you can create your own status"`, `"Activate it by clicking the power icon"`.

Legacy v1: the whole file is a JSON array of StatusItem (no `Version`, no `Groups`).

---

## 4. Other list-shaped files

### 4.1 `ComponentStatsV1.json` — `ComponentStatsItem[]`

`app/ViewModels/Models/ComponentStatsItem.cs:5-34`; written compact (no indentation) `ComponentStatsModule.cs:1246-1258`. Order in file is `SupportedComponentTypes` = CPU, GPU, RAM, VRAM (`ComponentStatsModule.cs:46-49`); FPS entries are dropped on load (line 1187).

| Key | Type | Default | Notes |
|---|---|---|---|
| `StartedOn` | DateTime | now | |
| `LastUpdated` | DateTime | min | |
| `SystemMainName` | string | `"CPU"` etc. (enum name) | |
| `SystemMailSmallName` | string | `"ᶜᵖᵘ"`, `"ᵍᵖᵘ"`, `"ʳᵃᵐ"`, `"ᵛʳᵃᵐ"` | (sic "Mail"); `StatsComponentType.cs:7-26` |
| `HardwareFriendlyName`, `HardwareFriendlyNameSmall` | string? | null | |
| `ShowPrefixHardwareTitle` | bool | false | |
| `ReplaceWithHardwareName` | bool | false | |
| `CustomHardwarenameValue`, `CustomHardwarenameValueSmall` | string? | null | |
| `ComponentType` | enum int | 1 CPU / 0 GPU / 2 RAM / 3 VRAM | |
| `Unit` | string | `"﹪"` (U+FE6A) for CPU/GPU, `"ᵍᵇ"` for RAM/VRAM | |
| `ShowTemperature`, `ShowHotSpotTemperature` | bool | false | CPU forced false |
| `cantShowTemperature`, `cantShowHotSpotTemperature`, `cantShowWattage` | bool | false | runtime flags, persisted |
| `ShowWattage` | bool | GPU default **true**, others false | |
| `ShowUnit` | bool | true | |
| `ComponentValue`, `ComponentValueMax` | string | `""` | live values, persisted |
| `Available` | bool | true | |
| `RemoveNumberTrailing` | bool | true for CPU/GPU, **false** for RAM/VRAM | |
| `ShowMaxValue` | bool | true for RAM/VRAM, false for CPU/GPU | |
| `IsEnabled` | bool | true (defaults) / false for items auto-added later | |
| `ShowSmallName` | bool | true | |
| `ShowDDRVersion` | bool | true | |
| `DDRVersion` | string? | null | |

Example item:
```json
{"StartedOn":"2025-05-01T14:03:22.5+02:00","LastUpdated":"0001-01-01T00:00:00","SystemMainName":"GPU","SystemMailSmallName":"ᵍᵖᵘ","HardwareFriendlyName":null,"HardwareFriendlyNameSmall":null,"ShowPrefixHardwareTitle":false,"ReplaceWithHardwareName":false,"CustomHardwarenameValue":null,"CustomHardwarenameValueSmall":null,"ComponentType":0,"Unit":"﹪","ShowTemperature":false,"ShowHotSpotTemperature":false,"cantShowTemperature":false,"cantShowHotSpotTemperature":false,"cantShowWattage":false,"ShowWattage":true,"ShowUnit":true,"ComponentValue":"","ComponentValueMax":"","Available":true,"RemoveNumberTrailing":true,"ShowMaxValue":false,"IsEnabled":true,"ShowSmallName":true,"ShowDDRVersion":true,"DDRVersion":null}
```
The class has only a parameterised constructor; Newtonsoft matches constructor args `name, smallName, type, value, valueMax, showMaxValue, unit, isenabled` to JSON keys case-insensitively (`SystemMainName`≠`name`, so missing args get defaults, then property setters apply). A TS serializer should always emit every key.

### 4.2 Weather condition overrides

Not a separate file: the encoded string `WeatherSettings.WeatherConditionOverrides` (§2.14). `WeatherConditionOverrideItem` (`app/ViewModels/Models/WeatherConditionOverrideItem.cs`) is a UI view model (`Code`, `DefaultIcon`, `DefaultText`, `CustomIcon`, `CustomText`) round-tripped into that string by the section view model.

### 4.3 `AppHistory.json` — `ProcessInfo[]` (window-activity app list)

`app/ViewModels/Models/ProcessInfo.cs`; compact JSON (`AppHistoryService.cs:77`).

| Key | Type | Notes |
|---|---|---|
| `ApplyCustomAppName` | bool | |
| `CustomAppName` | string | |
| `FocusCount` | int | |
| `IsPrivateApp` | bool | shows `PrivateName` instead |
| `LastTitle` | string? | |
| `ProcessName` | string | key |
| `ShowTitle` | bool | |
| `UsedNewMethod` | bool | |
| `UseCustomRegex` | bool | |
| `CustomRegex` | string | same `pattern => replacement` syntax as GlobalRegex |
| `ContentFilter` | string | |
| `ContentFilterMode` | int | 0 = off |
| `ContentFilterEnabled`, `HasContentFilter` | bool | get-only computed; written, ignored on read |

### 4.4 `LastMessages.json` — `ChatItem[]` (chat history)

`app/ViewModels/Models/ChatItem.cs`; indented (`ChatHistoryService.cs:96`). All public properties are persisted: `CancelLiveEdit`, `CanLiveEdit` (forced false on load), `CanLiveEditRun`, `CreationDate`, `ID` (int), `IsRunning`, `LiveEditButtonTxt` (`"Edit"`), `MainMsg`, `Msg`, `MsgReplace`, `Opacity` (string?), `Opacity_backup` (string?). Newtonsoft also emits `CopyToClipboardCommand` (a generated `RelayCommand` public property) — ignore it on read; it is harmless to omit when writing.

### 4.5 `TrackerBatterySettings.SavedDevices` — `TrackerDevice[]`

`app/ViewModels/Models/TrackerDevice.cs`. Persisted keys: `SerialNumber` (identity), `OriginalModelName`, `DeviceKind`, `CustomName`, `CustomIcon`, `IsHidden`, `ShowOnlyOnLowBattery`, `UseCustomLowThreshold`, `CustomLowThreshold` (1–100, default 20). JsonIgnore: `DeviceIndex`, `IsConnected`, `IsCharging`, `BatteryLevel`, `BatteryPercentage`, `DisplayName`, `IsLowBattery`.

### 4.6 `LastMediaLinkSessions.json` — `MediaSessionSettings[]`

`app/ViewModels/Models/MediaSessionInfo.cs:469-485`: `{ "AutoSwitch": bool, "IsVideo": bool, "KeepSaved": bool, "SessionId": string?, "ShowArtist": bool, "ShowTitle": bool }`.

### 4.7 `MediaLinkStyles.json` — custom seek-bar styles

`app/Services/MediaLinkPersistenceService.cs:466-490, 524-528`; `MediaLinkStyle` in `app/Classes/Modules/MediaLinkModule.cs:881-1040`.

```json
{"CustomStyles":[{"DisplayTime":true,"FilledCharacter":"▒","ID":100,"MiddleCharacter":"▓","NonFilledCharacter":"░","ProgressBarLength":8,"ProgressBarOnTop":false,"ShowTimeInSuperscript":true,"SpaceAgainObjects":true,"SpaceBetweenPreSuffixAndTime":false,"StyleName":"","SystemDefault":false,"TimePrefix":"","TimePreSuffixOnTheInside":true,"TimeSuffix":""}],"SelectedStyleId":100}
```
Built-in styles have IDs 1–8 (`SystemDefault=true`) and are never written (lines 531-646); custom IDs start at 100. Legacy form: bare array.

---

## 5. Built-in import / export features

There is **no whole-config export/backup**. The only user-facing import/export surfaces are:

| Feature | Produces / consumes | Source |
|---|---|---|
| Status page → export group / export selected / import | JSON bundle `{Version:2, Groups:[{GroupId,Name,IsActiveForCycle,CreationDate}], Items:[{MSGID,msg,GroupId,IsFavorite,UseInCycle,CreationDate,LastEdited,LastUsed}]}` (UI-state keys stripped). Import assigns new GroupIds, new random MSGIDs, renames `"Default"` → `"Default (Imported)"`, appends ` (2)` on name clash, sets `IsActive=false`. | `app/Services/StatusListService.cs:316-439`; UI `app/ViewModels/StatusPageViewModel.cs:545-620` |
| MediaLink → export / import progress-bar styles | `{CustomStyles:[MediaLinkStyle], SelectedStyleId}` (indented); import also accepts a bare array | `app/Services/MediaLinkPersistenceService.cs:323-390, 509-522` |
| AFK styles → export / import | `{ "Styles": [AfkStyle...], "SelectedStyleId": "<id or null>" }` (indented, default file name `AfkStyles.json`) | `app/ViewModels/AfkStyleViewModel.cs:218-300` |
| Updater "backup" | The auto-updater keeps a copy of the **program directory** with a `backup_manifest.json` (`{manifestVersion, fileCount, totalBytes, appVersion, createdUtc}`) for rollback; `-clearbackup` CLI flag deletes it. Not related to settings. | `app/Core/Updates/BackupManifest.cs`, `app/App.xaml.cs:269-271` |

No zip archives are produced anywhere for settings (`grep -i zip` only hits the updater UI element `UpdateByZipFile`).

---

## 6. Encryption of secrets

`app/Classes/DataAndSecurity/EncryptionMethods.cs` (and the identical DI wrapper `app/Services/DpapiEncryptionService.cs`):

- Algorithm: **Windows DPAPI** `ProtectedData.Protect(bytes, optionalEntropy: null, DataProtectionScope.CurrentUser)` (line 46-47); plaintext is UTF-8; the result is stored as **standard base64** (line 48).
- Decrypt: `Convert.FromBase64String` → `ProtectedData.Unprotect(..., CurrentUser)` → UTF-8 (lines 16-19). Failures (CryptographicException / FormatException) return `null` → the settings class stores empty plaintext and, for Pulsoid, flags `StoredTokenUnreadable` (`PulsoidModuleSettings.cs:256-273`).
- Key derivation is entirely inside DPAPI: the key is bound to the **Windows user profile (and machine)**. There is no app secret, salt, or password. **A web/TypeScript tool cannot decrypt or produce these values**; it can only preserve them verbatim (copy the base64 string through) or blank them (`""`), which the app treats as "not configured".
- Pairing convention: each secret is a pair `Foo` (`[JsonIgnore]`, plaintext, runtime) / `FooEncrypted` (persisted). Setting either side re-derives the other (`TryProcessToken`, lines 62-85). An empty plaintext produces an empty encrypted string (line 66-70).

Encrypted persisted keys (complete list):

| File | Key | What |
|---|---|---|
| `OpenAISettings.json` | `AccessTokenEncrypted`, `OrganizationIDEncrypted` | OpenAI API key / org id |
| `SpotifySettings.json` | `AccessTokenEncrypted`, `RefreshTokenEncrypted` | OAuth tokens (`ClientId` is plaintext) |
| `PulsoidModuleSettings.json` | `AccessTokenOAuthEncrypted` | Pulsoid OAuth token |
| `TwitchSettings.json` | `ClientIdEncrypted`, `AccessTokenEncrypted` | |
| `DiscordSettings.json` | `VoiceClientIdEncrypted`, `AccessTokenEncrypted`, `RefreshTokenEncrypted` | |
| `WeatherSettings.json` | `WeatherLocationCityEncrypted` | the city name (privacy) |
| `VoicemodSettings.json` | `LocalClientKeyEncrypted` | |

`SettingsResetService` (`app/Services/SettingsResetService.cs:20-38`) treats these names plus `TokenExpiresAtUtcTicks` and `HasRpcScope` as "credentials" preserved across a section reset.

---

## 7. OSC chatbox output assembly

### 7.1 Pipeline

`app/Core/Osc/OscOutputBuilder.cs:46-175`, sender `app/Services/OscSenderService.cs`.

1. **Separator** = `"\n"` if `AppSettings.SeperateWithENTERS` else `AppSettings.OscMessageSeparator` (blank → `" ┆ "`) (lines 14, 219-229).
2. **Prefix/Suffix** = `AppSettings.OscMessagePrefix/Suffix` with literal `\n` expanded (lines 49-50, 231-236).
3. Providers are visited in `IntegrationSettings.SavedSortOrder` order (runtime `IntegrationDisplayState.IntegrationSortOrder`), then any provider missing from the order is appended (lines 53-56, 100-120). A provider contributes only if `IsEnabledForCurrentMode(isVR)` (master toggle && VR/Desktop gate) and returns a non-empty segment. Segment text has literal `\n` expanded (line 96).
4. Each provider receives `OscBuildContext` with the already-collected segments and computes its remaining budget `144 - prefix - suffix - Σ(segment) - separator×count` (`OscBuildContext.cs:76-87`); most providers truncate themselves with `SegmentWriter.Truncate`/`Fit` (word-boundary cut + `…`).
5. If the assembled length still exceeds **144** (`Constants.OscMaxMessageLength`, `app/Core/Constants.cs:3`), segments are dropped highest-`Priority`-number first until it fits (lines 128-142). A single surviving segment is clipped with `…` (lines 144-159).
6. Final = `prefix + join(separator, segments) + suffix`, hard-clamped to 144 chars, avoiding a split surrogate (lines 161-165, 238-254).
7. Sent as OSC `/chatbox/input` with args `(string text, bool sendImmediately=true, bool fx)` to main and optional 2nd/3rd targets; `/chatbox/typing` for the typing indicator (`OscSenderService.cs:16-17, 211-221`). `fx` = `ChatSettings.ChatFX` for chats. Dev egg: `AppSettings.BlankEgg` appends `"\u0003\u001f"` when total <145 (lines 215-223).
8. Tick rate: `AppSettings.ScanningInterval` seconds (0.7–10, default 1.0) (`ScanLoopService.cs:67-75, 118-123`). Manual chat messages pause integrations for `ScanPauseTimeout` s and re-send every `ChattingUpdateRate` s while `KeepUpdatingChat`.

### 7.2 Provider table (sort key = value stored in `SavedSortOrder`)

| SortKey | UiKey | Priority (higher = dropped first) | Master toggle | Segment shape / prefix | Source |
|---|---|---|---|---|---|
| `Status` | Status | 10 | `IntgrStatus` (or AFK active) | `[<emoji from EmojiCollection> ]<msg>`; AFK: `<Prefix> <MessageWithTime><duration>` | `Providers/StatusOscProvider.cs`, `Status/StatusLine.cs` |
| `Window` | Window | 30 | `IntgrScanWindowActivity` | `<VrTitle or DesktopTitle> [<FocusTitle>] <app>` e.g. `On desktop ⁱⁿ Blender` | `Providers/WindowOscProvider.cs:36-57` |
| `Twitch` | Twitch | 50 | `IntgrTwitch` | template or built-in `LIVE \| playing <game> \| 123 viewers` (labels superscript when `UseSmallText`) | `Providers/TwitchOscProvider.cs` |
| `TikTokLive` | TikTokLive | 52 | `IntgrTikTokLive` | templates §2.16 | `Providers/TikTokLiveOscProvider.cs` |
| `Discord` | Discord | 45 | `IntgrDiscord` | `Template` §2.17 | `Providers/DiscordOscProvider.cs` |
| `Spotify` | Spotify | 25 | `IntgrSpotify` | `OutputTemplate` §2.12; transient if `ShowOnlyOnChange` | `Providers/SpotifyOscProvider.cs` |
| `VrcRadar` | VrcRadar | 35 | `IntgrVrcRadar` | templates §2.18 | `Providers/VrcLogOscProvider.cs` |
| `HeartRate` | HeartRate | 40 | `IntgrHeartRate` && Pulsoid connected | `[Title: ]<icon><tempText> <hr>[ ᵇᵖᵐ][ trend][ stats\|stats]` e.g. `❤️ 72 ᵇᵖᵐ ↑ 70 ᵃᵛᵍ\|95 ᵐᵃˣ\|60 ᵐⁱⁿ` | `PulsoidModule.cs:680-770` |
| `Component` | ComponentStat | 70 | `IntgrComponentStats` | `ᶜᵖᵘ 12﹪ ¦ ᵍᵖᵘ 40﹪ 🌡55° ⚡120W ¦ ʳᵃᵐ 8/32ᵍᵇ` joined by `StatsSeparator` | `ComponentStatsModule.cs:835-905` |
| `VrPerformance` | VrPerformance | 65 | `IntgrVrPerformance` && VR | stats joined by `StatsSeparator` | `Providers/VrPerformanceOscProvider.cs` |
| `TrackerBattery` | TrackerBattery | 60 | `IntgrTrackerBattery` && VR | `[Prefix ]entry Separator entry[ Suffix]` with `Template` per device | `TrackerBatteryModule.cs:432-463` |
| `Network` | NetworkStatistics | 80 | `IntgrNetworkStatistics` | `Down 12.3 Mbps \| Up …` fields joined with `" \| "` | `NetworkStatisticsModule.cs:437-483` |
| `Weather` | Weather | 85 | `WeatherSettings.ShowWeatherInTime` | template or built-in; max segment 72 chars | `Providers/WeatherOscProvider.cs`, `WeatherSettings.cs:36-57` |
| `Time` | Time | 90 | `IntgrScanWindowTime` | `[ᴹʸ ᵗⁱᵐᵉ ]<clock>` (`PrefixTime`) | `Providers/TimeOscProvider.cs`, `TimeSegmentFormatter.cs` |
| `Soundpad` | Soundpad | 75 | `IntgrSoundpad` | `[🎶 ]'<title>'` | `Providers/SoundpadOscProvider.cs:11-75` |
| `Voicemod` | Voicemod | 80 | `IntgrVoicemod` && announces | `🎶 '<sound>'` (transient) or `🎙️ '<voice>'` | `Providers/VoicemodOscProvider.cs` |
| `MediaLink` | MediaLink | 20 | `IntgrScanMediaLink` | `[<IconPlay> or <TextPlaying>] <title><Separator><artist>[\n<seekbar>]`; paused → `IconPause`/`TextPaused`; no session → `IconStop` | `Providers/MediaLinkOscProvider.cs:133-175, 225-241` |
| `Lyrics` | Lyrics | 22 | `IntgrLyrics` | current lyric line (follows MediaLink/Spotify) | `Providers/LyricsOscProvider.cs` |

Human names for keys: `app/Core/Osc/OscProviderNames.cs:8-29` (`Component`→"Component stats" is keyed as `ComponentStat`, `Network` as `NetworkStatistics` in UI names).

Text helpers: within a segment, fields are joined with `" · "` (`OscGlyphs.FieldJoin`), labels/units are rendered in Unicode superscript (`OscText.Label/Unit` → `TextUtilities.TransformToSuperscript`), `%` becomes `⁒` in some writers (`OscGlyphs.cs`). Weather/ComponentStats use `°`.

---

## 8. Test fixtures

`MagicChatbox.Tests` contains no static `.json` fixture files; every persistence test builds objects and round-trips them through `JsonConvert` / `JsonSettingsProvider` in a temp dir (`MagicChatbox.Tests/Core/Configuration/JsonSettingsProviderTests.cs:26-60`, `Classes/Modules/IntegrationSettingsPersistenceTests.cs:64-88`, `Classes/Modules/PulsoidAuthPersistenceTests.cs:44-183`). Behaviours those tests pin down (useful as a TS test list):

- File name is `{TypeName}.json`; `Dispose()`/`FlushPendingSave()` without ever reading `Value` must not create or clobber the file.
- A file containing `null` or 64 × `\0` loads as defaults (no quarantine); `{ "CurrentHeartRateTitle": ` (truncated JSON) is moved to `*.corrupt-*` and re-created on next save.
- Save stamps `_appVersion` and `_schemaVersion`.
- `{}` for `IntegrationSettings` yields the default `SavedSortOrder`; a custom order round-trips exactly.
- Pulsoid token: `AccessTokenOAuth` written → `AccessTokenOAuthEncrypted` on disk; an undecryptable cipher keeps the cipher on disk and sets `StoredTokenUnreadable`; `ClearStoredToken()` blanks both.

Minimal literal example of a provider file as the app writes it (defaults, `TtsSettings.json`):

```json
{
  "_schemaVersion": 1,
  "_appVersion": "0.9.226.0",
  "_migratedAt": null,
  "TtsTikTokEnabled": false,
  "TtsCutOff": true,
  "AutoUnmuteTTS": true,
  "ToggleVoiceWithV": true,
  "TtsVolume": 0.2,
  "RecentTikTokTTSVoice": "",
  "RecentPlayBackOutput": "",
  "TtsOnResendChat": false
}
```

(Property order: base-class members first, then declaration order of the derived class; Newtonsoft writes `float 0.2f` as `0.2`.)

---

## 9. Gotchas for a TS implementation

1. **Key casing is exactly the C# property name**: PascalCase almost everywhere, but `StatusItem.msg` / `editMsg`, `ComponentStatsItem.cantShow*`, and metadata `_schemaVersion/_appVersion/_migratedAt` are exceptions. Newtonsoft matching on read is **case-insensitive**, so a parser should match case-insensitively but a serializer should emit the canonical spelling.
2. **Enums are integers**, never strings, and some are non-contiguous (`LyricsInstrumentalMarker`: 0,1,3,6,8,9). `Enum.TryParse` is only used for XML migration and hotkeys (which store enum *names*).
3. **DateTime**: Newtonsoft ISO round-trip. Local-kind values carry an offset (`2025-05-01T14:03:22.1234567+02:00`), UTC values end in `Z`, unspecified/`DateTime.MinValue` has no offset (`0001-01-01T00:00:00`). Up to 7 fractional digits. `DateTime?` null is `null`. `DiscordSettings/SpotifySettings.TokenExpiresAtUtcTicks` are .NET ticks (`(unixMs + 62135596800000) * 10000`).
4. **`double.NaN`** (AppSettings.WindowLeft/Top/Width/Height defaults) is written as the JSON string `"NaN"`; accept both string and number.
5. **Get-only computed properties are written but ignored on read** (`TwitchSettings.TemplateHasValue`, `VoicemodSettings.AnyFeatureEnabled/LiveSwitchesEnabled`, `PulsoidTrendSymbolSet.CombinedTrendSymbol`, `ProcessInfo.ContentFilterEnabled/HasContentFilter`, `ChatItem.CopyToClipboardCommand`, `IntelliChat` token totals). Never treat them as inputs; omitting them is safe.
6. **Read-only legacy keys** must never be emitted: `AppSettings.JoinedAlphaChannel`, `AppSettings.OpenTrayWithAltQ`, `DiscordSettings.VoiceClientId`, `AfkModuleSettings.Styles`.
7. **Unknown keys are ignored** (default `MissingMemberHandling.Ignore`); missing keys keep defaults. So partial files are valid input; a TS parser should apply the default tables above.
8. **Collections replace defaults** in every provider-managed file: `JsonSettingsProvider` deserializes with `ObjectCreationHandling.Replace`, so an explicit `"HeartIcons": []` means empty, not "defaults". Module-owned files (`AfkModuleSettings.json`, `IntelliChatSettings.json`, `WhisperModuleSettings.json`, `ComponentStatsV1.json`, history files) are read with plain `JsonConvert.DeserializeObject` (default *Auto* handling, which appends to a pre-populated collection); this is harmless today because all of their collection defaults are empty, but a TS serializer must never emit a key twice. Per-property `[JsonProperty(ObjectCreationHandling = Replace)]` additionally marks `SavedSortOrder`, `HiddenTiles`, `HeartIcons`, `FavoriteSoundIds`, `RecentSoundIds`.
9. **No `TypeNameHandling`**: no `$type` metadata anywhere. `$id/$ref` are not used either.
10. **Null handling**: nulls are written (`"HardwareFriendlyName": null`), except properties annotated `NullValueHandling.Ignore` (the legacy setters and `Styles`). Strings default to `""`, not null; several setters coerce null → `""`.
11. **Encrypted values are opaque** (DPAPI, user+machine bound, §6). Preserve verbatim or blank; never attempt to decode. Blanking a `*Encrypted` key also blanks the runtime plaintext.
12. **Clamping on load**: partial `On…Changed` hooks clamp ranges *when the setter runs*, which happens during deserialization for generated properties (ChatSettings, TikTok, Voicemod, Pulsoid ThrottleHRMax, AppSettings.ScanningInterval, TrackerBattery thresholds, Twitch UpdateIntervalSeconds). Out-of-range values in a file are silently corrected; a TS validator should apply the same ranges.
13. **Metadata stamping**: when writing a provider file, set `_schemaVersion` to the class's current schema (2 for ComponentStatsSettings, 3 for TikTokLiveSettings, 1 otherwise) and `_appVersion` to a 4-part version string; leave `_migratedAt` as found (null if unknown).
14. **Atomic writes**: emulate `file.tmp` → rename; the app also tolerates a leftover `.tmp`.
15. **StatusList invariants**: keep exactly one `IsActive` item, ensure a group literally named `"Default"` exists, every item `GroupId` must reference an existing group (else it is silently moved to Default), `MSGID` unique random ints in [10, 99999999).
16. **Separator characters are non-ASCII**: `" ┆ "` (U+2506 box drawings light triple dash vertical) for message separator, `" ¦ "` (U+00A6 broken bar) for stats separators, `" · "` for in-segment fields, `"…"` for clipping, `"﹪"` (U+FE6A) as the percent unit in component stats, `"⁒"` in some writers. Preserve them byte-exactly.
17. **Two different JSON stacks**: everything is Newtonsoft except `vrcosc_session.json` (System.Text.Json). Newtonsoft escapes non-ASCII? No: default `StringEscapeHandling.Default` leaves emoji/Unicode unescaped and only escapes `"`, `\`, control chars. Emit UTF-8 without BOM (`File.WriteAllText` default is UTF-8 no BOM).
18. **Formatting**: provider files, `StatusList.json`, `LastMessages.json`, AFK, IntelliChat, Whisper and Hotkeys are indented with 2 spaces; `AppHistory.json`, `LastMediaLinkSessions.json`, `MediaLinkStyles.json`, `ComponentStatsV1.json` are compact. Formatting is irrelevant for reading.
19. **Profiles**: a user may run `Vrcosc-MagicChatbox-profile-N` directories; the same file set applies per profile (except Whisper/session files, which are shared).
20. **Character limit**: the chatbox hard limit used everywhere is 144 (`Constants.OscMaxMessageLength`), chat input limit 141 (`Constants.MaxChatMessageLength`); weather segment cap 72.
