# MagicChatbox ↔ neutral model mapping

Reference: `.references/notes/magicchatbox-format.md` (app 0.9.226). Files are matched by
basename, case-insensitively; keys case-insensitively; enums are integers; `*Encrypted` values are
opaque DPAPI blobs (passed through verbatim, written as `""` when unknown).

## Files

| File                                                                                           | Parse                                                                                                                  | Serialize                                                                         |
| ---------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| `IntegrationSettings.json`                                                                     | master toggles, `_VR`/`_DESKTOP` gates, `SavedSortOrder`                                                               | same; order = segment order + missing keys appended                               |
| `StatusList.json` (v2 bundle or v1 array)                                                      | statuses, groups                                                                                                       | v2 bundle; `Default` group (`CreationDate` `0001-01-01T00:00:00`), one `IsActive` |
| `AppSettings.json`                                                                             | cycle, separator/prefix/suffix, `SeperateWithENTERS`, `BlankEgg`, `ScanningInterval`, `PrefixIcon*`, `EmojiCollection` | same, `ScanningInterval` clamped 0.7–10                                           |
| `OscSettings.json`                                                                             | `OscIP`, `OscPortOut`                                                                                                  | same                                                                              |
| `AfkModuleSettings.json`                                                                       | AFK (flat fields or the `ActiveStyleId` custom style)                                                                  | flat fields, `ActiveStyleId` reset to `""`                                        |
| per-integration files (§ below)                                                                | template + options                                                                                                     | template + options                                                                |
| `ComponentStatsV1.json`                                                                        | per-component toggles                                                                                                  | 4 items CPU/GPU/RAM/VRAM, compact JSON                                            |
| anything else uploaded (`ChatSettings`, `TtsSettings`, `OpenAISettings`, `PrivacySettings`, …) | stored in `extras.magicchatbox.files`                                                                                  | passed through unchanged                                                          |

Every written provider file is built as `documented defaults ← extras.magicchatbox.files[name] ←
model values`, then stamped `_schemaVersion` (2 `ComponentStatsSettings`, 3 `TikTokLiveSettings`,
else 1), `_appVersion` `0.9.226.0`, `_migratedAt` kept or `null`. Legacy read-only keys
(`JoinedAlphaChannel`, `OpenTrayWithAltQ`, `VoiceClientId`, `Styles`) are never emitted.

## Profile-level fields

| Model                                        | MagicChatbox                                                                                                                                                                        |
| -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `statuses[].text/active/useInCycle/favorite` | `Items[].msg/IsActive/UseInCycle/IsFavorite`                                                                                                                                        |
| `statuses[].group` (`''` = default)          | `Groups[].Name` via `GroupId` (`Default` ↔ `''`)                                                                                                                                    |
| `statuses[].id`                              | `msgid-<MSGID>`; reused on export, otherwise FNV-1a of the text folded into [10, 99999999)                                                                                          |
| `statusCycle.enabled/intervalSeconds/random` | `CycleStatus/SwitchStatusInterval/IsRandomCycling`                                                                                                                                  |
| `afk.enabled/timeoutSeconds`                 | `EnableAfkDetection/AfkTimeout`                                                                                                                                                     |
| `afk.template`                               | `[AfkPrefix ]` + (`ShowAFKTime` ? `AfkMessageForTimeStamp{afk_duration}` : `AfkMessageWithoutTimeStamp`); split at `{afk_duration}` on export, first non-alphanumeric word → prefix |
| `afk.replaceEverything`                      | always `false` (MCB replaces only the status segment); `true` → info                                                                                                                |
| `output.separator`                           | `OscMessageSeparator` (blank → `" ┆ "`)                                                                                                                                             |
| `output.separateWithNewlines`                | `SeperateWithENTERS`                                                                                                                                                                |
| `output.prefix/suffix`                       | `OscMessagePrefix/Suffix` with literal `\n` expanded / re-escaped                                                                                                                   |
| `output.minimalBackground`                   | `BlankEgg`                                                                                                                                                                          |
| `output.sendIntervalSeconds`                 | `ScanningInterval`                                                                                                                                                                  |
| `osc.host/port`                              | `OscIP/OscPortOut`                                                                                                                                                                  |

## Integrations ↔ segments

| SortKey        | kind           | master toggle                       | gate pair                  | notes          |
| -------------- | -------------- | ----------------------------------- | -------------------------- | -------------- |
| Status         | status         | `IntgrStatus`                       | `IntgrStatus_*`            |                |
| Window         | window         | `IntgrScanWindowActivity`           | `IntgrWindowActivity_*`    |                |
| Twitch         | twitch         | `IntgrTwitch`                       | `IntgrTwitch_*`            |                |
| TikTokLive     | tiktok         | `IntgrTikTokLive`                   | `IntgrTikTokLive_*`        |                |
| Discord        | discord        | `IntgrDiscord`                      | `IntgrDiscord_*`           |                |
| Spotify        | media          | `IntgrSpotify`                      | `IntgrSpotify_*`           | 2nd media slot |
| VrcRadar       | vrchat         | `IntgrVrcRadar`                     | `IntgrVrcRadar_*`          |                |
| HeartRate      | heartrate      | `IntgrHeartRate`                    | `IntgrHeartRate_*`         |                |
| Component      | hardware       | `IntgrComponentStats`               | `IntgrComponentStats_*`    |                |
| VrPerformance  | vr_performance | `IntgrVrPerformance`                | — (VR only)                |                |
| TrackerBattery | vr_battery     | `IntgrTrackerBattery`               | — (VR only)                |                |
| Network        | network        | `IntgrNetworkStatistics`            | `IntgrNetworkStatistics_*` |                |
| Weather        | weather        | `WeatherSettings.ShowWeatherInTime` | `IntgrWeather_*`           |                |
| Time           | time           | `IntgrScanWindowTime`               | `IntgrCurrentTime_*`       |                |
| Soundpad       | soundpad       | `IntgrSoundpad`                     | `IntgrSoundpad_*`          |                |
| Voicemod       | voicemod       | `IntgrVoicemod`                     | `IntgrVoicemod_*`          | fixed text     |
| MediaLink      | media          | `IntgrScanMediaLink`                | `IntgrMediaLink_*`         | 1st media slot |
| Lyrics         | lyrics         | `IntgrLyrics`                       | `IntgrLyrics_*`            |                |

Parse creates one segment per sort key (id `mcb-<SortKey>`), `enabled` = master toggle,
`visibility` = gate pair (VR-only integrations: `{vr: true, desktop: false}`). Serialize assigns
each segment to a free slot of its kind; a `media` segment goes to MediaLink first unless its
template uses `album`, `volume`, `player`, `remaining` or `progress_percent` (Spotify-only
features), the second one takes the other slot. `speech`, `custom` and any further duplicate kind
are reported as unsupported. Integrations without a segment get their master toggle set to
`false` (gates are left as found).

## Per-integration templates

| Integration    | Template reconstruction (parse)                                                                                                                                                                                                                                                                                        | Settings written (serialize)                                                                                                                                                                            |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Status         | `[<EmojiCollection[0] or 💬> ]{status}` when `PrefixIconStatus`                                                                                                                                                                                                                                                        | `PrefixIconStatus` = leading literal; that literal becomes `EmojiCollection[0]`                                                                                                                         |
| Window         | `{device_mode} [DesktopFocusTitle ]{window_title}` (`ShowFocusedApp`)                                                                                                                                                                                                                                                  | `ShowFocusedApp`, `DesktopFocusTitle`, `DesktopTitle` (leading literal without `{device_mode}`), `MaxShowTitleCount`, `PrivateName`                                                                     |
| Twitch         | `Template` tokens, or built-in `{twitch_live}                                                                                                                                                                                                                                                                          | ᵖˡᵃʸⁱⁿᵍ {twitch_game}                                                                                                                                                                                   | {twitch_viewers} ᵛⁱᵉʷᵉʳˢ …`from the`Show*`/`*Prefix`/`*Label`/`UseSmallText` flags           | `Template`                                                                                                                                                                                                                            |
| TikTokLive     | `SummaryTemplate`                                                                                                                                                                                                                                                                                                      | `SummaryTemplate`                                                                                                                                                                                       |
| Discord        | `Template`                                                                                                                                                                                                                                                                                                             | `Template`                                                                                                                                                                                              |
| Spotify        | `OutputTemplate` tokens; paused from `PauseOutputMode`/`PausedText`; bar from `ProgressBarLength`/`Progress*Character`; transient from `ShowOnlyOnChange`/`TransientDuration`                                                                                                                                          | `OutputTemplate`, `ShowAlbum/Device/Volume/Progress`, `ProgressDisplayMode` (3 bar, 1 percent, 2 numbers), bar chars/length, `PauseOutputMode` (0 hide / 1 `PausedText` / 2 last track), transient      |
| VrcRadar       | `TemplateWorld`                                                                                                                                                                                                                                                                                                        | `TemplateWorld`                                                                                                                                                                                         |
| HeartRate      | `[Title: ][❤️ ]{heartrate}[ ᵇᵖᵐ][ {heartrate_trend}][ {heartrate_avg} ᵃᵛᵍ                                                                                                                                                                                                                                              | {heartrate_max} ᵐᵃˣ                                                                                                                                                                                     | {heartrate_min} ᵐⁱⁿ][ {heartrate_trend}]`, provider `pulsoid`, `smoothing`=`SmoothHeartRate` | `HeartRateTitle`/`CurrentHeartRateTitle` (`^(.*?): `), `MagicHeartIconPrefix` (heart glyph present), `ShowBPMSuffix`, `ShowHeartRateTrendIndicator`, `ShowAverage/Maximum/MinimumHeartRate`, `PulsoidStatsEnabled`, `SmoothHeartRate` |
| Component      | enabled `ComponentStatsV1` items in CPU/GPU/RAM/VRAM order: `ᶜᵖᵘ {cpu_usage}`, `ᵍᵖᵘ {gpu_usage}[ {gpu_temp}][ {gpu_power}]`, `ʳᵃᵐ {ram_used}[/{ram_total}]`, `ᵛʳᵃᵐ …`, joined by `StatsSeparator`; unit `C`/`F` from `TemperatureCelsius/Fahrenheit`                                                                   | `IsEnabled` per item from the tokens used, GPU `ShowTemperature`/`ShowWattage`, RAM/VRAM `ShowMaxValue` (`*_total`), `StatsSeparator`, temperature flags (+ legacy `IsFahrenheit`)                      |
| VrPerformance  | `{vr_fps} ᶠᵖˢ`, `{vr_target_hz} ᴴᶻ`, `{vr_reprojection} ʳᵉᵖʳᵒʲ`, `{vr_dropped_frames} ᵈʳᵒᵖᵖᵉᵈ` per `Show*`, joined by `StatsSeparator`                                                                                                                                                                                 | `ShowFps/TargetHz/Reprojection/DroppedFrames`                                                                                                                                                           |
| TrackerBattery | `🔋 HMD {hmd_battery} · L {left_controller_battery} · R {right_controller_battery}[ · {tracker_lowest_name} {tracker_lowest_battery}]` per `ShowHeadset/Controllers/Trackers`; options from those + `LowThreshold`                                                                                                     | `ShowHeadset/Controllers/Trackers`, `LowThreshold`; per-device `Template` untouched                                                                                                                     |
| Network        | `ᴰᵒʷⁿ {net_down}                                                                                                                                                                                                                                                                                                       | ᵁᵖ {net_up}                                                                                                                                                                                             | ᴹᵃˣ ᴰᵒʷⁿ {net_max_down}                                                                      | …                                                                                                                                                                                                                                     | ᴺᵉᵗʷᵒʳᵏ ᵁᵗⁱˡⁱᶻᵃᵗⁱᵒⁿ {net_utilization}`per`Show*`(labels plain when`StyledCharacters` false) | `Show*` from the tokens used |
| Weather        | `WeatherTemplate` tokens, or built-in `[{weather_emoji} {weather_condition}] {weather_temp}[ ᶠᵉᵉˡˢ {weather_feels_like}][ 💧{weather_humidity}][ 💨{weather_wind}]` joined by `WeatherStatsSeparator`; options from `WeatherUnitOverride` (UseGlobal → ComponentStats flags), `WeatherLocationMode`, lat/lon, interval | `WeatherTemplate` (≤144), `Show*` flags from tokens (they gate the token values), `ShowWeatherInTime` = enabled, `WeatherUnitOverride` 1/2, location mode, lat/lon, interval                            |
| Time           | `[ᴹʸ ᵗⁱᵐᵉ ]{time}[ {timezone}]`; options `Time24H`, `SelectedTimeZone` → IANA                                                                                                                                                                                                                                          | `PrefixTime`, `TimeShowTimeZone`, `Time24H`, `SelectedTimeZone` (IANA → enum, aliases for common European/US zones; unmapped or `''` → 0 UTC + warning)                                                 |
| Soundpad       | `[🎶 ]'{soundpad_sound}'` from `PrefixIconSoundpad`                                                                                                                                                                                                                                                                    | `PrefixIconSoundpad`                                                                                                                                                                                    |
| Voicemod       | `🎙️ '{voicemod_voice}'`                                                                                                                                                                                                                                                                                                | nothing (info when the template differs)                                                                                                                                                                |
| MediaLink      | `(<PrefixIconMusic> ? {play_icon} : TextPlaying) {title}<Separator>{artist}` + (`TimeSeekStyle` 1 → `\n{progress_bar}`, 0 → ` {position}/{duration}`); paused = `IconPause` (when `PauseIconMusic && PrefixIconMusic`) else `TextPaused`; transient                                                                    | `PrefixIconMusic` (`{play_icon}` used), `TextPlaying`, `Separator` (text between title and artist), `TimeSeekStyle`, `IconPause`/`PauseIconMusic`/`TextPaused`, `ShowOnlyOnChange`, `TransientDuration` |
| Lyrics         | `[♪ ]{lyrics}` from `ShowNoteIcon`                                                                                                                                                                                                                                                                                     | `ShowNoteIcon`                                                                                                                                                                                          |

### Token tables (MagicChatbox → canonical)

| Integration | Mapped                                                                                                                                                 | Dropped (info on parse / unsupported on serialize)                     |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------- |
| Spotify     | play_icon, artist, title, album, device→player, volume, seekbar→progress_bar, percent/progress→progress_percent, remaining, elapsed→position, duration | queue, liked_icon, explicit_icon, shuffle_icon, repeat_icon            |
| Weather     | temp→weather_temp, condition→weather_condition, emoji→weather_emoji, feels→weather_feels_like, humidity→weather_humidity, wind→weather_wind, time→time | unit (the canonical temperature already carries it), weather, lat, lon |
| VrcRadar    | master→vrc_master, world→vrc_world, count→vrc_player_count, type→vrc_instance_type, region→vrc_region                                                  | peak, owner, session_time, app_session, worlds, players, peak_session  |
| Twitch      | live, channel, game, title, viewers, followers → `twitch_*`                                                                                            | user, url, status                                                      |
| TikTokLive  | host, viewers, likes, followers → `tiktok_*`                                                                                                           | —                                                                      |
| Discord     | channel, count, speaking, mute_state → `discord_*`                                                                                                     | speaking_count, mute_emoji, voice_state                                |

Time zone enum: 0 UTC, 1 Europe/London, 2 America/New_York, 3 America/Chicago, 4 America/Denver,
5 America/Los_Angeles, 6 America/Anchorage, 7 Pacific/Honolulu, 8 Europe/Berlin,
9 Europe/Bucharest, 10 Asia/Kolkata, 11 Asia/Shanghai, 12 Asia/Tokyo, 13 Asia/Seoul,
14 Europe/Moscow, 15 Australia/Sydney, 16 Pacific/Auckland, 17 America/Sao_Paulo,
18 Africa/Johannesburg.

## Losses

MagicChatbox → model (parse):

- Encrypted values (tokens, weather city) cannot be read; the city becomes `''` with an info.
- Dropped tokens listed above; tracker-battery per-device layout is approximated; the
  component-stats unit glyphs (`﹪`, `ᵍᵇ`) are folded into the canonical placeholder values.
- Runtime/UI settings (Twitch credentials, Discord RPC, lyric matching, chat, TTS, OpenAI,
  privacy consents, hotkeys, history) are kept only in `extras.magicchatbox.files`.

Model → MagicChatbox (serialize):

- `speech` and `custom` segments, and a second segment of any kind other than `media`.
- Free-form layout for hardware, tracker battery, VR performance, network, Voicemod: only the
  toggles the app exposes are derived from the template; literal text between tokens is lost.
- Canonical placeholders outside an integration's token table (e.g. `{cpu_temp}`,
  `{vrc_instance_capacity}`, `{lyrics}` in a media template) are removed with a diagnostic.
- `TimeOptions.showSeconds`, `WeatherOptions.city`, time zones outside the 19-entry enum,
  `afk.replaceEverything`, text after `{afk_duration}`.
- Encrypted values can only be preserved from a previous MagicChatbox import, never created.
