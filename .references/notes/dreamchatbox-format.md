# OSC-DreamChatbox — persisted configuration format reference

Source: `.references/dreamchatbox` at commit `6102816` (v1.5.8, 2026-09-26; previously
`f453c74` = v1.5.6 — v1.5.7 added plugins-in-profiles, the *Default* profile, save on exit
and the single-file profile export, v1.5.8 added store tags and three MediaPlay placeholders). All
`file:line` citations are relative to that repo root. This document is meant to be
sufficient for writing a TypeScript parser/serializer without re-reading the Python.

---

## 1. Persisted files

| What | Linux | Windows | Format | Written by |
|---|---|---|---|---|
| Config dir | `~/.config/OSC-DreamChatbox` (XDG_CONFIG_HOME deliberately ignored) | `%APPDATA%\OSC-DreamChatbox` (fallback `~/AppData/Roaming/...`) | dir | `core/osinfo.py:91-108` |
| Main config | `<cfg>/config.json` | same | JSON, `indent=2`, **ASCII-escaped** (`json.dumps` default `ensure_ascii=True`), UTF-8 | `ui/config_mixin.py:981-991`, `core/constants.py:47` |
| Legacy config (pre v1.1, read-only migration source) | `~/.config/osc-dreamchatbox/settings.json` | `%APPDATA%\osc-dreamchatbox\settings.json` | JSON | `core/constants.py:48`, `core/osinfo.py:62-63,113` |
| Corrupt-config backup | `<cfg>/config.json.bak` (or `settings.json.bak`) | same | copy of the unparseable file | `ui/config_mixin.py:940-962` |
| Profiles | `<cfg>/profiles/<name>.json` | same | JSON `indent=2`, ASCII-escaped; since v1.5.7 ends with `plugin_<id>: bool` keys | `core/profiles.py:42,715-733` |
| Profile plugin settings (v1.5.7) | `<cfg>/profiles/plugins/<name>.json` | same | JSON `indent=2`, **`ensure_ascii=False`**, `{plugin id: settings}` | `core/profiles.py:736-760` |
| Profile export (v1.5.7) | anywhere, default `~/<name>.dcbprofile.json` | same | JSON `indent=2`, `ensure_ascii=False`, envelope (§7) | `core/profiles.py:803-820`, `ui/pages/profiles_panel.py:330-350` |
| Plugins | `<cfg>/plugins/<id>/plugin.json` (manifest, read-only) + `main.py` | same | JSON | `core/plugins.py:4-10,228` |
| Plugin state | `<cfg>/plugins/<id>/configs/config.json` | same | JSON `indent=2`, **`ensure_ascii=False`** | `core/plugins.py:277,287,1197-1222` |
| Plugin data dir | `<cfg>/plugins/<id>/configs/` (doubles as `api.data_dir`) | same | any | `core/constants.py:59-61` |
| Store catalogue (shipped) | `<app>/config/plugins.json` | same | JSON | `core/constants.py:71`, `config/plugins.json` |
| Store catalogue (cached) | `<cfg>/plugins.json` | same | JSON | `core/plugin_store.py:96` |
| Store user sources | `<cfg>/plugins_sources.json` (never overwritten) | same | JSON `{"sources":[url \| {"url":..,"ref":..}]}` | `core/plugin_store.py:94,339-361` |
| Store image cache | `<cfg>/store_cache/` | same | images | `core/plugin_store.py:89` |
| Theme backgrounds | `<cfg>/backgrounds/<file>` (`.png .jpg .jpeg .webp .bmp`) | same | images | `core/theming.py:41-42` |
| Local lyrics | `<cfg>/lyrics/*.lrc` (default of `media_lyrics_dir`) | same | LRC | `core/constants.py:51` |
| Python extras | `<cfg>/extras/` | same | pip site | `core/constants.py:64` |
| Headless log | `<cfg>/terminal.log` (5 MB cap) | same | text | `core/headless.py:64-65` |

Windows one-time migration: an existing `~/.config/OSC-DreamChatbox` is copied to
`%APPDATA%\OSC-DreamChatbox` before anything else runs (`core/osinfo.py:117+`,
`osc_dreamchatbox.py:40-42`).

**Atomic write** (`core/atomicfile.py:21-42`): write `<path>.tmp`, `flush`, `fsync`,
`os.replace(tmp, path)`. On `PermissionError` (Windows AV) falls back to plain
`write_text`. Used for config.json, profiles, plugin config.json and cached catalogue.

**Save cadence** (`ui/config_mixin.py:964-979`): toggles/spinboxes write
immediately; text fields debounce 800 ms. The whole `self.cfg` dict is dumped every
time — there is no partial write. Headless mode only rewrites `send_to_vrchat` on top of
the file as-is (`tests/test_headless.py:177-188`).

**Versioning**: there is **no version field** in config.json. Migration is purely
key-presence based and happens inside `ConfigMixin.load_config()`
(`ui/config_mixin.py:148-938`); the same function normalises profiles being switched
in. Load = `defaults.update(stored)` then clamp/migrate every key; unknown keys are
**kept** (they ride along in `self.cfg` and are written back out). Legacy keys that are
consumed and dropped on load: `afk_text`, `afk_custom`, `afk_boxes`, `afk_frame`
(`:602-605`), `chat_send_mode` (`:721`), `aio_graph` (`:827`), `box_width` (`:921`),
`hw_fps`, `hw_mangohud_dir`, `hw_fps_source` (`:902-907`). `stt_deepl` (old checkbox)
is honoured at UI-apply time but not removed (`ui/mainwindow.py:786-788`).

First run (no config.json and no legacy settings.json): the four
`FIRST_RUN_STATUS_TEXTS` are seeded into `status_texts`/`status_templates[0]` and
`status_count` = 4 (`ui/config_mixin.py:32-38,154-178`). Otherwise `status_count`
default is 1 and texts are empty.

---

## 2. Main config — complete key list

Defaults dict: `ui/config_mixin.py:157-506`; normalisation: `:531-938`. Types are the
JSON types after normalisation. "Owner" = UI page/section that edits the key.
`AIO_MAX` = 10 (`core/constants.py:24`), `CHATBOX_LIMIT` = 144, `SLIM_SUFFIX` =
`"\u0003\u001f"` (2 chars) so text fields cap at 142.

### 2.1 Personal Status (Apps page, "Personal Status" card)

| Key | Type | Default | Allowed / normalisation | Line |
|---|---|---|---|---|
| `status_text` | string | `""` | legacy single text; migrated into `status_texts[0]` if all texts empty | 158, 539 |
| `status_texts` | string[20] | 20×`""` (seeded on first run) | padded/truncated to 20; **mirror of active template's texts** | 160, 532-544 |
| `status_styles` | string[20] | 20×`"normal"` | each `normal\|super\|sub` (`core/textstyle.py:112`) | 162, 549-554 |
| `status_count` | int | 1 (4 on first run) | 1..20 | 163, 545 |
| `status_cycle_sec` | int | 10 | 10..3600 (MIN_STATUS_CYCLE_SEC=10) | 165, 768-773 |
| `status_random` | bool | true | missing ⇒ true | 169, 776 |
| `status_templates` | object[10] | see below | must be list of exactly 10 or reset | 170-177, 624-635 |
| `status_template_active` | int | 0 | 0..9 | 178, 636 |
| `status_active` | bool | true | | 179 |

`status_templates[i]` = `{"name": "Template i+1", "texts": string[20], "styles": string[20], "count": 1..20}`.
Sync rule on load (`:639-647`): if mirror `status_texts` has content and active
template is empty → template ← mirror; else mirror ← template. At edit time the
mirror is written back into the active template (`ui/pages/apps_page.py:2081-2088`).
**A serializer must write both consistently.**

### 2.2 AFK (fields at bottom of Personal Status card; switches under Preview)

| Key | Type | Default | Allowed | Line |
|---|---|---|---|---|
| `afk_detect` | bool | false | | 190, 579 |
| `afk_manual` | bool | false | | 191 |
| `afk_param` | string | `"AFK"` | stripped, empty ⇒ `"AFK"` | 192, 581-584 |
| `afk_preset` | int | 0 | 0..2 | 203, 586-590 |
| `afk_texts` | string[3] | `["💤 AFK / Away 💤", "💤 AFK \\n BRB – briefly away", "💤   AFK   💤"]` | each ≤142 chars; missing entries filled from defaults | 204, 591-616; `core/constants.py:151-155` |
| `afk_timer` | bool | false | | 208 |
| `afk_timer_text` | string | `"for {afk_time}"` | non-empty, ≤142 | 209, 619-622 |
| `afk_style` | string | `"normal"` | normal\|super\|sub | 210, 555-557 |
| `afk_solo` | bool | true | | 215 |

### 2.3 MediaPlay (Apps page, "MediaPlay" card)

| Key | Type | Default | Allowed | Line |
|---|---|---|---|---|
| `media_active` | bool | false | | 216 |
| `media_show_artist` | bool | true | | 217 |
| `media_show_title` | bool | true | | 218 |
| `media_title_max` | int | 24 | 3..64 (clamped at use, `apps_page.py:2791`) | 219 |
| `media_show_time` | bool | true | | 220 |
| `media_time_style` | string | `"normal"` | normal\|super\|sub (digits only) | 222, 555 |
| `media_time_seconds` | bool | true | true ⇒ `m:ss`/`h:mm:ss`, false ⇒ `h:mm` | 223 |
| `media_show_lyrics` | bool | false | | 225 |
| `media_lyrics_local` | bool | false | | 227 |
| `media_lyrics_sources` | string[] | `["lrclib","lyricsplus","betterlyrics"]` | subset of `lrclib, lyricsplus, betterlyrics, paxsenix, kugou, musixmatch`; **order is forced to canonical** on load, unknown dropped, non-list ⇒ default (`core/lyrics_sources.py:333-393`) | 232, 617 |
| `media_lyrics_dir` | string | `"<cfg>/lyrics"` (absolute path!) | | 233 |
| `media_lyrics_prefix_on` | bool | true | | 237, 702 |
| `media_lyrics_prefix` | string | `"♪"` | ≤4 chars | 238, 698-701 |
| `media_lyrics_max` | int | 144 | 10..144; 144 = no limit (`apps_page.py:2802-2809`) | 240 |
| `media_show_bar` | bool | true | | 241 |
| `media_bar_style` | int | 2 | 0..5 presets, 6 = custom (`core/textutils.py:30-37,83`) | 243 |
| `media_bar_size` | int | 100 | 30..100 (% of 13 segments, min 4) | 244; `textutils.py:59-63` |
| `media_time_pos` | string | `"line"` | `line\|before\|after\|split` (`textutils.py:46-49`) | 245 |
| `media_bar_custom` | object | `{"prefix":"[","filled":"█","empty":"░","knob":"","suffix":"]"}` | knob non-empty ⇒ travelling knob mode | 246; `textutils.py:85-112` |
| `media_poll_sec` | int | 1 | | 247 |
| `media_source` | string | `""` (auto) | player key e.g. `spotify`, `firefox`, `Spotify.exe` (Windows lower-cased) | 254, 881-882 |
| `media_source_label` | string | `""` | ≤64, display only | 255, 883-885 |
| `media_source_fallback` | bool | true | | 260, 886 |
| `media_idle` | bool | true | | 441, 909 |
| `media_idle_text` | string | `"⏸"` | ≤20 | 442, 910-912 |
| `media_icon` | bool | false | wraps first media line in `🎵 … 🎵` | 448 |
| `media_custom` | bool | false | | 449 |
| `media_custom_template` | string | `"{artist} : {title} \| {time}\\n{bar}"` | | 450 |

### 2.4 Hardware (Apps page, "Hardware" card)

| Key | Type | Default | Notes | Line |
|---|---|---|---|---|
| `hw_active` | bool | false | | 261 |
| `hw_flame` | bool | false | temp unit `🔥` instead of `°C` | 443 |
| `hw_custom` | bool | false | | 444 |
| `hw_custom_template` | string | `"🎮 {gpu_name} {gpu_usage} \| {gpu_temp} {temp_icon} \\n ⚙️ {cpu_name} {cpu_usage} \| {cpu_temp} {temp_icon} \\n VRAM {vram_usage} RAM {ram_usage} {ram_type}"` | three older default strings are auto-upgraded to this (`:649-661`) | 445-447 |
| `hw_poll_sec` | int | 2 | | 451 |
| `hw_gpu_usage` / `hw_gpu_name` / `hw_gpu_temp` | bool | true | | 452-457 |
| `hw_gpu_custom` | bool | false | use `hw_gpu_custom_name` | 454 |
| `hw_gpu_custom_name` | string | `""` | | 455 |
| `hw_gpu_name_style` | string | `"normal"` | | 456 |
| `hw_gpu_power` | bool | false | | 461 |
| `hw_gpu_select` | string | `""` | backend id e.g. `nvidia:0`, `amd:card1`; `""` = auto | 467, 563-565 |
| `hw_gpu2` | bool | false | | 468 |
| `hw_gpu2_select` | string | `""` | cleared if equal to `hw_gpu_select` | 469, 568-572 |
| `hw_gpu2_mode` | string | `"line"` | `line\|inline` (`core/constants.py:106-115`) | 472, 566 |
| `hw_gpu2_usage`/`_temp`/`_name` | bool | true | | 473-476 |
| `hw_gpu2_power`/`_custom`/`_vram_used`/`_vram_pct` | bool | false | | 475-481 |
| `hw_gpu2_custom_name` | string | `""` | | 478 |
| `hw_gpu2_name_style` | string | `"normal"` | | 479 |
| `hw_vram_used` | bool | true | | 482 |
| `hw_vram_pct` | bool | false | | 483 |
| `hw_ram_used` | bool | true | | 484 |
| `hw_ram_pct` | bool | false | | 485 |
| `hw_ram_type` | string | `""` | free text appended after RAM | 486 |
| `hw_cpu_usage`/`_name`/`_temp` | bool | true | | 487-492 |
| `hw_cpu_custom` | bool | false | | 489 |
| `hw_cpu_custom_name` | string | `""` | | 490 |
| `hw_cpu_name_style` | string | `"normal"` | | 491 |
| `hw_cpu_power` | bool | false | | 493 |

### 2.5 App order & All-in-one (Apps page)

| Key | Type | Default | Allowed | Line |
|---|---|---|---|---|
| `app_order` | string[] | `["status","media","hardware"]` | unknown dropped, missing appended | 262, 663-666 |
| `aio_active` | bool | false | | 357 |
| `aio_mode` | string | `"normal"` | `normal\|advanced` | 362, 813-814 |
| `aio_count` | int | 1 | 1..10 | 387, 778 |
| `aio_templates` | string[10] | `["{text} \\n {artist} : {title} \| {time} \\n {bar}", "", …]` | mirror of `aio_sets[active].templates` | 399, 682-685, 777 |
| `aio_custom_time` | bool[10] | 10×false | mirror | 405, 782 |
| `aio_custom_sec` | int[10] | 10×10 | 2..3600 each; mirror | 406, 784 |
| `aio_heights` | int[10] | 10×0 | 0..1200 (cosmetic, NOT in sets) | 409, 786 |
| `aio_graphs` | graph[10] | 10×`{"nodes":[],"edges":[]}` | mirror of `aio_sets[active].graphs` | 381, 816-833 |
| `aio_sets` | object[10] | see below | exactly 10 or reset | 389-395, 835-856 |
| `aio_set_active` | int | 0 | 0..9 | 396, 857 |
| `aio_rotate` | bool | false | | 397 |
| `aio_rotate_sec` | int | 10 | UI 2..3600 | 398 |

`aio_sets[i]` = `{"name":"Template i+1","templates":string[10],"count":1..10,"custom_time":bool[10],"custom_sec":int[10],"graphs":graph[10]}`.
Sync on load `:861-871` (mirror ↔ active set, same rule as status). Edit-time sync
`apps_page.py:3202-3216` copies templates/count/custom_time/custom_sec/graphs into
the active set. The Two-way page can write a `"Conversation"` set
(`ui/pages/twoway_page.py:94-102`, template `"{stt_output} \\n ──────── \\n {2wayin} \\n {2wayout}"`).

### 2.6 Textbox page (Chat / Speech to Text / Text to Text / presets / Block apps)

| Key | Type | Default | Allowed | Line |
|---|---|---|---|---|
| `textbox_presets` | string[20] | 6 seeded + 14×`""` (`"Hey! How are you doing? 😊"`, `"What are you up to? 👀"`, `"What's up? status: chilling ✨"`, `"BRB / AFK for a moment! ☕"`, `"Cuddles please? 🥺"`, `"PEANUTBUTTER"`) | `"ERP please ?"` auto-replaced | 263-268, 667-675 |
| `textbox_preset_count` | int | 6 | 1..20 (fallback 5 when missing) | 269, 676 |
| `textbox_pause_sec` | int | 10 | seconds a direct message holds the chatbox | 270 |
| `textbox_order` | string[] | `["chat","stt","presets"]` | same fix-up as app_order | 271, 678-681 |
| `stt_language` | string | `"de-DE"` | BCP-47 | 272 |
| `stt_block` | bool | false | "Block apps" | 273 |
| `stt_block_saved` | string[] | `[]` | app keys switched off by the block, restored on release | 308; `textbox_page.py:1169-1186` |
| `stt_block_plugins` | bool | true | | 314, 737 |
| `stt_block_box` | bool | true | | 315 |
| `stt_block_except` | string[] | `[]` | sorted set of `status\|media\|hardware\|aio\|custombox\|plugin:<id>` | 316, 762-764 |
| `stt_output` | string | `""` | target language (`""` = no translation) | 274 |
| `stt_method` | string | `"lingva"` | `lingva\|google\|libre\|libre_online\|deepl\|custom` (`core/translators.py:53-58`) | 275 |
| `stt_mic` | string | `""` | mic name | 276 |
| `stt_mic_strict` | bool | true | | 322, 737 |
| `stt_mic_show_raw` | bool | false | | 329, 743 |
| `stt_deepl_key` / `stt_google_key` / `stt_libre_url` | string | `""` | | 277-280 |
| `stt_libre_online_url` | string | `""` (= preset `https://de.libretranslate.com`) | stripped | 281, 706-710 |
| `stt_libre_online_key` | string | `""` | | 282 |
| `stt_libre_online_custom` | bool | false | | 284, 704 |
| `stt_custom_snippet` | string | `""` | Python snippet | 286 |
| `stt_custom_file` | string | `""` | path | 287 |
| `stt_energy_auto` | bool | true | | 335, 745 |
| `stt_energy_threshold` | int | 300 | 50..4000 (`core/audiolevel.py:135-145`) | 336, 747 |
| `stt_pause_sec` | float | 0.8 | 0.2..3.0 | 339, 749 |
| `stt_min_phrase_sec` | float | 0.3 | 0.05..2.0 | 343, 755 |
| `stt_phrase_limit` | int | 12 | 3..60 | 346, 757-761 |
| `stt_send_mode` | string | `"direct"` | `direct\|line\|vars` (`core/constants.py:131-133`); legacy `chat_send_mode` folded in | 352, 721-729 |
| `chat_anchor` | string | `"aio"` | `status\|media\|hardware\|aio` | 353, 730 |
| `chat_hold_sec` | int | 0 | 0..3600 (0 = until replaced) | 354, 732-736 |
| `stt_mode` | string | `"stt"` | `stt\|ttt` | 355 |
| `stt_show_both` | bool | false | send "source -> translation" | 356 |
| `stt_translate_notice` | bool | true | | 371, 796 |
| `stt_translate_notice_text` | string | `"Translate …"` | non-empty | 372, 798 |

### 2.7 Two-way translation page

| Key | Type | Default | Allowed | Line |
|---|---|---|---|---|
| `stt_twoway_source` | string | `""` | audio source name | 291, 706 |
| `stt_twoway_language` | string | `"en-US"` | what others speak | 292 |
| `stt_twoway_target` | string | `""` (= follow `stt_language`) | | 293 |
| `stt_twoway_energy_auto` | bool | true | | 295 |
| `stt_twoway_energy_threshold` | int | 400 | | 296 |
| `stt_twoway_pause_sec` | float | 0.7 | | 297 |
| `stt_twoway_min_phrase_sec` | float | 0.3 | | 298 |
| `stt_twoway_phrase_limit` | int | 8 | | 299 |
| `stt_twoway_send` | bool | false | | 302 |
| `stt_twoway_send_mode` | string | `"vars"` | `direct\|line\|vars` | 303 |
| `stt_twoway_filter_mode` | string | `"off"` | `off\|only\|except` | 305 |
| `stt_twoway_filter_only` | string | `"VRChat"` | comma list | 306 |
| `stt_twoway_filter_except` | string | `"Spotify, YouTube Music"` | | 307 |

(The twoway_* numeric keys are not clamped in load_config; `TWOWAY_DEFAULTS` at
`ui/pages/twoway_page.py:53-59` repeats the defaults.)

### 2.8 Options page (app-wide; excluded from profiles) and Advanced page

| Key | Type | Default | Allowed | Line |
|---|---|---|---|---|
| `send_to_vrchat` | bool | false | | 494 |
| `interval_sec` | int | 5 | | 495 |
| `osc_instant_send` | bool | true | | 499, 711 |
| `slim_chatbox` | bool | true | appends `\u0003\u001f` | 500 |
| `osc_ip` | string | `"127.0.0.1"` | | 501 |
| `osc_port` | int | 9000 | | 502 |
| `oscquery_enabled` | bool | true | | 242 |
| `osc_input_enabled` | bool | false | | 365, 792 |
| `osc_input_port` | int | 9001 | 1024..65535 | 373, 801-805 |
| `hotkey_input_enabled` | bool | false | | 368, 794 |
| `osc_ext_ip` | string | `"127.0.0.1"` | | 376, 806 |
| `osc_ext_port` | int | 9002 | 1..65535 | 377, 808-812 |
| `theme` | string | `"default"` | `default\|carbon\|nebula\|embers\|grass\|ocean\|rose\|mono` (`core/theming.py:91-128`) | 383, 686 |
| `theme_colors` | object | `{}` | `{themeId: {token: "#rrggbb"}}`, tokens `bg panel card inner border accent accent_hi text dim danger` | 384, 688 |
| `theme_background` | string | `""` | file name inside `<cfg>/backgrounds` | 385 |
| `theme_opacity` | float | 0.82 | 0.25..1.0 | 386, 690-694 |
| `debug` | bool | false | | 503 |
| `profile_active` | string | `""` | profile name, `""` = none; since v1.5.7 a fresh install gets `"Default"` (`profiles_panel.py:294-310`) | 507 |
| `profile_save_on_exit` (v1.5.7) | bool | true | *Options › General › Profiles*: save the active profile in `closeEvent` | `config_mixin.py:240`, `profiles.py:52` |
| `profile_plugins_asked` (v1.5.7) | object | *(absent until first popup)* | `{profile name or "": [plugin ids]}` — plugins already asked "save into profile?"; app-wide, not in defaults dict | `profiles.py:61`, `profiles_panel.py:445-472` |

### 2.9 Custom Box (Custom Box card / `ui/pages/custom_box.py`)

| Key | Type | Default | Allowed | Line |
|---|---|---|---|---|
| `box_active` | bool | false | | 419, 913 |
| `box_template` | int | 2 (Double) | 0..11 presets, 12 = custom (`core/boxstyle.py:43-83,122-127`) | 420, 914 |
| `box_custom_style` | object | `{"tl":"‹","tf":"·","tr":"›","bl":"‹","bf":"·","br":"›"}` | each ≤4 chars; empty `tf`/`bf` ⇒ `"·"` | 421, 916; `boxstyle.py:85-88,149-165` |
| `box_width_top` | int | 7 | 0..40, junk ⇒ 6; legacy `box_width` copied in | 424, 921-926 |
| `box_width_bottom` | int | 3 | same | 425 |
| `box_align` | bool | false (default dict) — **but missing key ⇒ true** (`:927`) | | 428, 927 |
| `box_top_on` / `box_bottom_on` | bool | true | | 429-430, 928 |
| `box_top_mode` | string | `"custom"` | `none\|clock\|custom`; unknown ⇒ `none` | 431, 930 |
| `box_top_custom` | string | `"🕐{box_clock}🕐"` | ≤120 | 432, 932-934 |
| `box_bottom_mode` | string | `"custom"` | | 433 |
| `box_bottom_custom` | string | `"OSC-DreamChatbox"` | ≤120 | 434 |
| `box_clock_live` | bool | true (default) — **missing ⇒ false** (`:935`) | | 437, 935 |
| `box_clock_format` | string | `"hm24"` | `hm24\|hms24\|hm12\|hm12ap` (`boxstyle.py:103-113`) | 438, 936 |

Note the two asymmetric fallbacks (`box_align`, `box_clock_live`): the value in the
defaults dict is only used when the key is absent *and* `defaults.get(key, X)` is
consulted — since `defaults` already contains the default, the `.get` fallback never
fires in practice; the effective default is the dict value (false / true). A TS
implementation should treat the defaults dict as authoritative.

---

## 3. Chatbox layout model

### 3.1 Payload assembly (`ui/mainwindow.py:1125-1204`)

1. Plugin lines grouped by anchor (`plugins.lines_by_anchor()`); Chat "Line" mode and
   Two-way "Line" mode add their text at `chat_anchor`.
2. If AFK active and `afk_solo` → payload = AFK lines only (through Custom Box).
3. Else if `aio_active` → `plugins.render_lines()` + chat lines + AIO lines
   (AFK lines prepended if active, non-solo). Custom Box is **not** auto-wrapped in AIO
   mode; only `{box_start}/{box_stop}/{box_text}` place it (`custom_box.py:624-645`).
4. Else "Normal" mode: for each key in `app_order`: anchored plugin lines above it,
   then the app's own lines (status → `_render_status`; media → `build_media_lines`;
   hardware → `build_hw_lines`); then anchor `aio` lines; then Custom Box wrap
   (top line first, bottom last, only if something non-empty and not blocked).
5. `plugins.filter_text()` (on_text hooks), then on send: if `slim_chatbox` →
   `text[:142] + "\u0003\u001f"` else `text[:144]`; OSC `/chatbox/input [text, true, false]`
   (`ui/mainwindow.py:1366-1376`).

Rate limit: ≥1.5 s between sends, ≤5 sends per rolling 5 s (`core/constants.py:83-93`).

### 3.2 Template language (`core/textutils.py:263-336`)

* `{name}` placeholders, case-insensitive, spaces → `_`, aliases folded via
  `PLACEHOLDER_ALIASES` (`textutils.py:135-194`) and `text_t<X>[_<N>]` regex (`:201-219`).
* Empty/unknown placeholder → removed, taking a directly-adjacent label (`Word:`) or
  ONE separator from `| : / , - –` with it; doubled/edge pipes cleaned; runs of
  whitespace collapsed; empty lines dropped (`:293-324`).
* Literal two-character `\n` (backslash-n) in a template = line break (`:305`).
  In JSON that is `"\\n"`.
* Inline styles: `{super/"word"}`, `{sup/…}`, `{sub/…}`, `{superscript/…}`,
  `{subscript/…}` (quotes optional, content may itself be a placeholder), and region
  tags `{sup}…{/sup}`, `{sub}…{/sub}` (unclosed = to end). `_"word"_` keeps a word
  out of conversion (`core/textstyle.py:62-63,197-303`).
* Style maps (super letters `ᴬᴮᶜᴰᴱᶠᴳᴴᴵᴶᴷᴸᴹᴺᴼᴾ?ᴿˢᵀᵁⱽᵂˣʸᶻ`, no q; sub letters only
  `a e h i j k l m n o p r s t u v x`; digits and `+ - = ( ) /`) at `textstyle.py:72-104`.

### 3.3 Placeholder inventory

Values built in `AppsPageMixin._template_values` (`ui/pages/apps_page.py:3649-3721`),
`_media_values` (`:4047-4100`), `_hw_values`/`_gpu2_values` (`:4359-4433`), Custom Box
(`:3969-3976`), AFK (`core/afk.py:56`). `None`/`""` collapse.

| Placeholder | Meaning / format | Filled when |
|---|---|---|
| `{text}` | current rotating status text (styled) | `status_active` |
| `{text_1}`…`{text_20}` | slot N of the active template | `status_active` |
| `{text_tX}`, `{text_tX_N}` (also `text_templateX`, `text_tplX`) | rotating text / slot N of template X (1-10) | always (`:3584-3640`) |
| `{artist}`, `{title}` | title hard-cut to `media_title_max` | `media_active` + show flags |
| `{album}` (v1.5.8) | album from MPRIS `xesam:album` / Windows `album_title`; empty when the player has none (`apps_page.py:4083`) | media |
| `{remaining}` (v1.5.8) | time left, `ft(length - position)`; empty without a length (`:4084-4085`) | media |
| `{progress_percent}` (v1.5.8) | `round(pos/len*100)%` e.g. `34%`; empty without a length (`:4086-4088`) | media |
| `{time}` | `pos/len` e.g. `1:18/3:47` (or `pos` only if no length) | `media_show_time` |
| `{position}` / `{time_status}` | position | media |
| `{length}` / `{time_end}` | length | media |
| `{bar}` (alias `songbar`) | progress bar, style `media_bar_style`, length 13×size% | `media_show_bar` |
| `{lyrics}` (aliases `lyric`, `songtext`, `liedtext`) | current synced line, cut to `media_lyrics_max` | `media_show_lyrics` |
| `{lyrics_prefix}` | `♪` or custom | prefix on |
| `{player}` | player name | media |
| `{icon_sound}` | `🎵` | always |
| `{media_idle}` | `media_idle_text` while nothing plays, else empty | |
| `{gpu_name}`, `{gpu_usage}` (`57%`), `{gpu_temp}` (`65°C` / `65🔥`), `{gpu_power}` (`213W` / `4.2W`; aliases `gpu_watt(s)`, `gpu_w`, `gpupower`) | | `hw_active` + flags |
| `{vram_usage}` (`9/16GB 56%` per flags; aliases `vram`), `{vram_pct}` | | |
| `{cpu_name}`, `{cpu_usage}`, `{cpu_temp}`, `{cpu_power}` | | |
| `{ram_usage}` (alias `ram`), `{ram_pct}`, `{ram_type}` (aliases `ram_typ`, `ramtype`) | | |
| `{temp_icon}` (aliases `tempicon`, `temp`) | `🔥` if `hw_flame` else `°C`; when present in a string, temps become bare numbers | always |
| `{icon_flame}` | `🔥` | always |
| `{gpu2_name}`, `{gpu2_usage}`, `{gpu2_temp}`, `{gpu2_power}`, `{vram2_usage}`, `{vram2_pct}` (aliases `gpu_2_*`, `vram_2*`) | second GPU | `hw_gpu2` |
| `{text_input}`, `{text_output}` | last typed/spoken message and what went out (translation) | any send mode |
| `{chat_input}/{chat_output}`, `{stt_input}/{stt_output}`, `{ttt_input}/{ttt_output}` (many aliases: `chat`, `spoken`, `said`, `heard`, `typed`, …) | same pair narrowed by origin | |
| `{twoway_input}`/`{twoway_output}` (aliases `2wayin`, `2wayout`, `2way_in`, …) | what others said / translation | |
| `{box_start}` (aliases `box_top`, `box_open`, `boxstart`), `{box_stop}` (`box_end`, `box_bottom`, `box_close`, `boxstop`), `{box_text}` | frame lines / middle text | resolve regardless of `box_active` |
| `{box_clock}` | clock in `box_clock_format`; only inside box middle text | |
| `{afk_time}` | `<1 min` / `N min` / `H h MM min` — only inside AFK texts | |
| `{<plugin_id>}`, `{<plugin_id>_<key>}`, plugin `global_placeholders` | | plugin enabled |
| `{player_in_world}`, `{group_world}`, `{realtime}`, `{instance_type}`, `{fps}` (aliases `players`, `world`, `clock`, `instance`, …) | provided by external **world_stats** plugin | plugin installed |

### 3.4 Generated (non-custom) layouts

* **Status**: one line, `apply_template` only if `{` present, then style (`apps_page.py:2136-2149`).
* **Media** (`:4102-4173`): `"{artist} : {title}"` joined with `" : "`; `" | pos/len"`
  appended when `media_time_pos == "line"`; optional lyrics line `"♪ <line>"`; bar
  line; time merged into the bar line for `before` (`0:27/1:06 ▓▓░░`), `after`, `split`
  (`0:27▓▓░░1:06`) (`textutils.py:66-79`). `media_icon` wraps line 1 in `🎵 … 🎵`. No
  player ⇒ `media_idle_text` line (if `media_idle`).
* **Hardware** (`:4490-4561`): `"<GPU name>: 57% 65°C 213W | VRAM 9/16GB 56%"`,
  optional GPU2 line (or `" | "`-inlined), `"<CPU name>: 12% 45°C"`, `"RAM: 14/32GB 44% DDR5"`.
  Names: custom > detected > `GPU`/`GPU2`/`CPU`, styled by `hw_*_name_style` (`:4330-4344`).
* **Songbar styles** (`textutils.py:30-37,89-132`), index = `media_bar_style`:
  0 `[───●────────]`, 1 `──■──` (half length), 2 `[█████░░░░░░░]` (default), 3 `▰▰▰▰▱▱▱▱`,
  4 `🎵🎵🎵──────`, 5 `▓▓▓▓░░░░`, 6 custom.
* **AIO**: rendered template-line by template-line (split on literal `\n`); a media
  line that renders empty is replaced once by the idle text (`:3945-3999`).
  Rotation: slots with non-empty template (or with an Output node in advanced mode),
  dwell = `aio_custom_sec[i]` if `aio_custom_time[i]` else `aio_rotate_sec` (`:3290-3330`).
* **Status rotation**: non-empty texts among first `status_count`; random (never same
  twice) or sequential; `tests/test_status_rotation.py`.

### 3.5 Box frame (`core/boxstyle.py`)

Template = six strings `tl tf tr bl bf br`. Presets (index → name → top/bottom):

| # | Name | tl tf tr | bl bf br |
|---|---|---|---|
| 0 | Light | `┌ ─ ┐` | `└ ─ ┘` |
| 1 | Heavy | `┏ ━ ┓` | `┗ ━ ┛` |
| 2 | Double | `╔ ═ ╗` | `╚ ═ ╝` |
| 3 | Rounded | `╭ ─ ╮` | `╰ ─ ╯` |
| 4 | Dashed | `┌ ╌ ┐` | `└ ╌ ┘` |
| 5 | Blocks | `▛ ▀ ▜` | `▙ ▄ ▟` |
| 6 | Rule | `"" ▔ ""` | `"" ▁ ""` |
| 7 | Corners | `◤ ━ ◥` | `◣ ━ ◢` |
| 8 | Stars | `✦ ─ ✦` | `✦ ─ ✦` |
| 9 | Hearts | `♡ ─ ♡` | `♡ ─ ♡` |
| 10 | Arrows | `≪ ━ ≫` | `≪ ━ ≫` |
| 11 | Sparkles | `✧ ･ ✧` | `✧ ･ ✧` |
| 12 | Custom | `box_custom_style` | |

Line rendering (`:206-230`): no middle → `left + fill*width + right`; with middle →
`left + fill*(width//2) + " " + middle + " " + fill*(width//2) + right`. Empty fill →
space. `box_align` grows the narrower rendered line by adding fill units alternately
left/right until cell widths match (east-asian wide = 2 cells) (`:233-280`). Middle
text: `none` → `""`, `clock` → `clock_text(box_clock_format)`, `custom` → template
rendered against the full value dict + `{box_clock}`, folded to one line
(`custom_box.py:573-596`). Clock formats: `hm24` `18:01`, `hms24` `18:01:47`,
`hm12` `6:01`, `hm12ap` `6:01 PM` (`boxstyle.py:283-297`). `core/boxframe.py` and
`ui/pages/custombox_card.py` are **empty files**.

### 3.6 Node graph (Advanced mode) — persisted in `aio_graphs[i]` / `aio_sets[].graphs[i]`

Shape (`ui/nodegraph.py:792-799,954-978`):
```json
{"nodes": [{"id": "n1", "type": "text", "x": 120.0, "y": 40.5, "values": {"value": "hi"}}],
 "edges": [{"from": "n1", "out": "out", "to": "n2", "in": "in"}]}
```
Nodes sorted by (x, y), edges by (from,out,to,in) on save. Ids default `n<i>`, dupes get `_`.
Unknown types / dangling edges are skipped on load. Legacy single `aio_graph` with
`output.values.slot` is split per slot (`config_mixin.py:95-144`).

Node types (`NODE_DEFS`, `ui/nodegraph.py:72-425`; eval `core/nodegraph_eval.py:200-400`).
Field defaults are what `values` may hold:

| type | inputs → outputs | values (default) |
|---|---|---|
| `text` | → `out` | `value` ("") — placeholders resolve |
| `placeholder` | → `out` | `name` ("text") |
| `status` | → `text` | `template` ("active"\|"1".."10") |
| `status_single` | → `text` | `template`, `entry` ("1".."20") |
| `media` | → `artist title time bar` | |
| `hw_gpu` / `hw_gpu2` | → `usage temp power vram name` | |
| `hw_cpu` | → `usage temp power name` | |
| `hw_sys` | → `ram ram_pct ram_type fps` | |
| `custom_box` | → `start stop text` | |
| `hardware` (legacy) | → `cpu gpu ram fps` | |
| `chat` | → `out` | `source` ("chat"\|stt\|ttt\|any; eval also accepts twoway) |
| `clock` | → `out` | `format` ("%H:%M", strftime) |
| `join` | `a..j` → `out` | `count` (4, 2..10), `sep` (" "), `skip_empty` ("skip"\|keep) |
| `format` | `a b c` → `out` | `pattern` ("{a} - {b}") |
| `style` | `in` → `out` | `style` (normal\|super\|sub\|upper\|lower) |
| `truncate` | `in` → `out` | `max` (40), `ellipsis` ("…", counts toward max) |
| `info` | `text when next` → `out` | `page` (0..10) |
| `step` | `advance reset` → `step wrapped` | `steps` (3), `seconds` (0) |
| `newline` | → `out` (`\n`) | |
| `if` | `cond then else` → `out` | |
| `compare` | `a b` → `out` | `op` (`==` `!=` `<` `>` `contains`) |
| `nonempty` | `in` → `out` | |
| `osc_in` | → `value bool` | `name` |
| `osc_out` | `value trigger` | `name`, `type` (bool\|int\|float) |
| `ext_osc_in` | → `value type bool text` | `address` ("/external/example") |
| `ext_osc_out` | `value trigger` | `address`, `type` (auto\|string\|bool\|int\|float), `ip` (""), `port` (0) |
| `timer` | `start` → `out` | `seconds` (10), `mode` (blink\|pulse) |
| `button` | → `out` | `mode` (pulse\|toggle) |
| `hotkey_in` | → `out` | `keys` ("f13") |
| `hotkey` | `trigger` | `keys` ("ctrl+shift+m") |
| `aio_change` | `trigger` | `target` (next\|previous\|"1".."5") |
| `proc_watch` | → `running` | `name` ("VRChat") |
| `run_program` | `trigger` | `command` (""), `debug` (off\|on) |
| `output` | `in` → `shown` | one per canvas; first by id wins |

Truthiness = non-empty string; `"1"` is the canonical true.

---

## 4. Profiles (`core/profiles.py`, `ui/pages/profiles_panel.py`)

* File: `<cfg>/profiles/<name>.json`; name cleaned of `\ / : * ? " < > |` and control
  chars, stripped of leading/trailing dots, max 40 chars (`profiles.py:47-58`).
* Content: **the full normalised config minus `APP_WIDE_KEYS`** (`:63-73`, **19 keys since
  v1.5.7**): `profile_active, profile_plugins_asked, profile_save_on_exit, osc_ip, osc_port,
  oscquery_enabled, send_to_vrchat, osc_input_enabled, osc_input_port, hotkey_input_enabled,
  osc_ext_ip, osc_ext_port, osc_instant_send, interval_sec, theme, theme_colors,
  theme_background, theme_opacity, debug` — minus any key starting with `plugin_`
  (`profile_part`, `:659-663`).
* **Plugins in profiles (v1.5.7)**: `save_profile(name, cfg, plugins={id: bool})` appends
  `plugin_<id>: true/false` **sorted, at the end of the file** (`:715-733`; test
  `tests/test_profile_plugins.py:41-48`). `plugin_flags(stored)` reads back only **boolean**
  `plugin_*` values, id lower-cased (`:702-712`); a profile without such keys leaves plugins
  alone. `merge_for_load` drops all `plugin_` keys, so they never reach `config.json`
  (`:229-235`). The flags are rebuilt from the installed plugins on every save
  (`profiles_panel.py:_write_profile`, `manager.profile_state()` = `plugins.py:1758-1770`).
* Per-profile plugin settings: `profiles/plugins/<name>.json` = `{plugin id: <plugin
  configs/config.json minus "enabled" and "chat">}` (`PROFILE_SKIP_KEYS`, `plugins.py:1756`);
  read with `read_plugin_settings` (non-dict entries dropped, broken file ⇒ `{}`, `:749-760`).
  Applied on switch via `manager.apply_profile(flags, settings)`; plugins listed `true` but not
  installed are offered from the store (`profiles_panel.py:_offer_profile_plugins`).
* Rename/delete move/remove the settings file too (`:277-299`).
* **Default profile** (v1.5.7): `DEFAULT_NAME = "Default"` (`:48`); when no profile exists the
  live settings are saved as *Default* and activated (`profiles_panel.py:294-310`).
* **Save on exit**: `profile_save_on_exit` (default true) writes the active profile + plugin
  settings in `closeEvent` (`profiles_panel.py:312-323`).
* Switch (`profiles_panel.py:342-393`): live cfg saved into the currently active profile,
  new profile read, `merge_for_load` (profile keys + current app-wide keys), then the
  result goes through `load_config(raw)` (all migrations apply), `profile_active` set.
* Startup: `--profile=NAME` / `--profile NAME` (case-insensitive lookup); otherwise
  `profile_active` from config.json is simply whatever was loaded last (config.json is
  already that profile's content).
* Test example (`tests/test_profiles.py:20-28`): saving
  `{"aio_active": true, "osc_port": 9123, "theme": "dark", "profile_active": "x"}`
  yields file content `{"aio_active": true}`.

A minimal but realistic profile file is therefore just config.json with those 17 keys
removed (see §8 example).

---

## 5. Plugins

### 5.1 Manifest `plugin.json` (`core/plugins.py:1276-1354`, `docs/PLUGIN_API.md:208-241`)

| Key | Type | Default | Notes |
|---|---|---|---|
| `id` | string | required | `^[a-z0-9][a-z0-9_-]{0,63}$`, lower-cased, = folder name |
| `name` | string | id | |
| `version` | string | `"?"` | |
| `author` | string | `"unknown"` | |
| `description` | string | about text | |
| `short_description` / `summary` | string | `""` | |
| `about` | string \| string[] \| `{"format":"text"\|"markdown","text":…}` | `""` | |
| `Github` / `github` | string | `""` | |
| `main` | string | `"main.py"` | must stay inside folder |
| `image` | string | | preview file |
| `unity` | string | `""` | http(s) only |
| `enabled` | bool | true | initial default only |
| `is_linux` / `is_windows` | bool | true | |
| `headless` (v1.5.7) | bool | true | `false` ⇒ not loaded in `--headless` mode (`plugins.py:1641-1649`); lenient `_truthy` |
| `tags` (v1.5.8) | string[] | `[]` | store search/filter; `parse_tags` (`plugins.py:606-622`): lower-cased, `#` stripped, ≤8 tags of ≤24 chars, comma string accepted |
| `template` | string | `"{<id>}"` | default custom string |
| `placeholders` | `{key: description}` | `{}` | UI hint |
| `global_placeholders` | string[] | `[]` | unprefixed names |
| `settings` | item[] | `[]` | schema, see below |
| `api` | int | 1 | max supported 2 |
| `min_app` | string | `""` | e.g. `"v1.3.2"` |
| `layout` | string[] | `["chatbox","settings","widget"]` | missing appended |
| `user_reorderable` | bool | false | |
| `chatbox` | `{"enabled": bool, "user_editable": bool}` | `{true,false}` | |
| *anything else* | | | kept in `Plugin.extra` |

Settings item keys (`:316-319`): `key type label hint depends depends_value default min
max suffix secret choices options items expanded mode filters placeholder button style`.
Types: `text bool int slider choice path emoji label` (values), `action` (no value),
`group` (`items`, depth ≤2), `widget` (marker). Unknown type → `unsupported` but value kept.

### 5.2 Plugin state `plugins/<id>/configs/config.json` (`core/plugins.py:1146-1222`)

```json
{
  "enabled": false,
  "anchor": "aio",
  "order": 1000,
  "line": true,
  "custom": false,
  "template": "{example_template}",
  "options": {"greeting": "Hi", "len": 24},
  "layout": [],
  "chat": null
}
```

| Key | Type | Default | Notes |
|---|---|---|---|
| `enabled` | bool | manifest `enabled` | |
| `anchor` | string | `"aio"` | `status\|media\|hardware\|aio` = app it sits ABOVE |
| `order` | int | 1000 | normalised to position index among plugins |
| `line` | bool | true | print own line (false = only fills `{id}`) |
| `custom` | bool | false | use `template` instead of `get_text()` |
| `template` | string | manifest template | empty ⇒ manifest |
| `options` | object | `{}` | schema defaults filled lazily; `action` keys never stored |
| `layout` | string[] | `[]` | user block order; `[]` = untouched |
| `chat` | bool \| null | null | user's chatbox switch; null = manifest decides |
| *unknown keys* | | | preserved and written back (`setdefault`) |

`KNOWN_CONFIG_KEYS` (`:328-330`) also lists `"line"` etc. Written `ensure_ascii=False`.

### 5.3 Store catalogue (`config/plugins.json`)
`{"_comment": …, "version": "1.1.8", "self_url": "https://raw.githubusercontent.com/yakuda-stack/OSC-DreamChatbox/main/config/plugins.json", "sources": ["https://github.com/yakuda-stack/Dream-Chatbox-Plugins/tree/main/plugins/world_stats", …]}`.
User additions: `<cfg>/plugins_sources.json` with the same `sources` list (items may be
`{"url": …, "ref": …}`).

---

## 6. Feature → config key map

| Feature | Keys | Default output | Emoji/prefix |
|---|---|---|---|
| Status text | `status_*` | rotating text line | none (user text) |
| Now playing | `media_active, media_show_*, media_title_max, media_time_*, media_bar_*, media_custom*, media_icon, media_source*` | `Artist : Title \| 1:18/3:47` + `[█████░░░░░░░]` | `🎵 … 🎵` when `media_icon`; idle `⏸` |
| Lyrics | `media_show_lyrics, media_lyrics_local, media_lyrics_sources, media_lyrics_dir, media_lyrics_prefix(_on), media_lyrics_max` | `♪ <line>` | `♪` |
| Hardware | `hw_*` | `GPU: 57% 65°C \| VRAM 9/16GB` / `CPU: 12% 45°C` / `RAM: 14/32GB` | `🎮 ⚙️` in default custom template; `🔥` with `hw_flame` |
| Watts | `hw_gpu_power, hw_cpu_power, hw_gpu2_power` | `213W` / `4.2W` | |
| Time / clock | Custom Box `box_*_mode="clock"`, `box_clock_format`, `{box_clock}`; node `clock`; `{realtime}` via plugin | `18:01` | `🕐{box_clock}🕐` default top |
| Timezone | **none** (local time only) | | |
| Heart rate | **none built in** (plugin territory) | | |
| Speech to text | `stt_language, stt_mic*, stt_energy_*, stt_pause_sec, stt_min_phrase_sec, stt_phrase_limit, stt_send_mode, chat_anchor, chat_hold_sec, stt_show_both, stt_block*` | message text | |
| Translation | `stt_output, stt_method, stt_*_key, stt_libre*, stt_custom_*, stt_translate_notice*` | `Translate …` while pending | |
| Two-way | `stt_twoway_*` | `{2wayin}/{2wayout}` | separator `────────` in Conversation set |
| AFK | `afk_*` | `💤 AFK / Away 💤` + `for 12 min` | `💤` |
| App/window activity | `stt_twoway_filter_*` (audio capture only); node `proc_watch` | | |
| Weather | **none** | | |
| VRChat log / world | external `world_stats` plugin (`{player_in_world} {group_world} {instance_type} {realtime} {fps}`) | | |
| Network / OSC | `osc_ip, osc_port, oscquery_enabled, osc_input_*, osc_ext_*, osc_instant_send, interval_sec, slim_chatbox, send_to_vrchat` | | |
| Theme | `theme, theme_colors, theme_background, theme_opacity` | | |

---

## 7. Import / export / backup

### 7.1 Profile export / import (v1.5.7, `core/profiles.py:802-859`, `ui/pages/profiles_panel.py:330-411`)

*Options › General › Profiles* has **📤 Export active** and **📥 Import**. There is still no
export of the whole `config.json`; the unit is one profile.

* **File name**: `<name>.dcbprofile.json` (`EXPORT_SUFFIX`, `:57`); the save dialog defaults to
  `~/<name>.dcbprofile.json` with filter `DreamChatbox profile (*.json)`. Export first saves
  the live settings into the active profile (`_save_active_profile`), so the file equals the
  files on disk.
* **Shape** (`export_profile`, `:803-820`; `json.dumps(indent=2, ensure_ascii=False)`, atomic):

  ```json
  {
    "format": "osc-dreamchatbox-profile",
    "version": 1,
    "name": "Gaming",
    "profile": { "...every non-app-wide config key...": 0, "plugin_afk": false, "plugin_oscleash": true },
    "plugins": { "oscleash": { "anchor": "aio", "order": 0, "line": true, "custom": false,
                               "template": "", "options": {}, "layout": [] } }
  }
  ```

  * `format` = `EXPORT_FORMAT` (`:55`), `version` = `EXPORT_VERSION` = 1 (`:56`).
  * `name` = `clean_name(name)`.
  * `profile` = `read_profile(name)` **as stored**: the profile file including the sorted
    `plugin_<id>` booleans at the end; **none of the 19 `APP_WIDE_KEYS`** (no OSC target, no
    theme, no `interval_sec`, no `profile_*`).
  * `plugins` = `read_plugin_settings(name)` = the `profiles/plugins/<name>.json` object
    (`{}` when there is none). Per plugin: its `configs/config.json` **minus `enabled` and
    `chat`** (`PROFILE_SKIP_KEYS`), unknown keys included. Custom Boxes, themes, backgrounds
    and the store cache are **not** bundled (Custom Box settings are ordinary `box_*` keys and
    therefore already inside `profile`; themes are app-wide).
* **Read back** (`read_export`, `:823-848`):
  * File must be a JSON object, else `ValueError("not a profile file")`.
  * `format == "osc-dreamchatbox-profile"` ⇒ `profile` must be a dict (else error),
    `plugins` non-dict ⇒ `{}`, name = `clean_name(data["name"])` or the file stem (with
    `.dcbprofile.json` / `.json` stripped). **`version` is not checked.**
  * Any other `format` value ⇒ `ValueError("unknown file format …")`.
  * No `format` key ⇒ a **plain profile file** (e.g. copied from `profiles/`): the object is the
    profile, name = file stem, plugins `{}`.
* **Import** (`import_profile`, `:851-859`; UI `on_profile_import`, `profiles_panel.py:352-411`):
  * `save_profile(name, profile, plugins=plugin_flags(profile))` — i.e. `profile_part()` drops
    app-wide keys and `plugin_*` keys, then the boolean flags are re-appended. **An import never
    changes the OSC target or theme.** No normalisation happens at import time; the full
    `load_config` migration runs when the profile is switched to.
  * `save_plugin_settings(name, {lower-cased id: dict entries})` (non-dict values dropped).
  * UI: empty name ⇒ `"Imported"`; existing name ⇒ *Replace* / *Import with another name*
    (`"<name> (imported)"` suggested) / Cancel; afterwards "Switch to it now?". Replacing the
    active profile detaches it first so the live settings do not overwrite the import.
  * Switching to the imported profile applies `plugin_flags` (`_load_profile_plugins`); plugins
    switched on but not installed are looked up in the store and offered for install; the
    saved settings are applied after install (`_ask_profile_plugins`).
  * Terminal mode (`core/headless.py:497-503`) only logs missing plugins.
* Tests: `tests/test_profile_plugins.py:162-201` (round trip, plain file, unknown format,
  OSC port never imported).

### 7.2 Other mechanisms (unchanged)

(a) corrupt config copied to `config.json.bak` (`config_mixin.py:940-962`); (b) legacy
`settings.json` read once (`:519-521`); (c) profiles as described in §4; (d) plugin `configs/`
folder preserved across zip re-install via `__configs_backup__` (`core/plugins.py`);
(e) theme background images imported by copy into `<cfg>/backgrounds`
(`core/theming.py:283-284`).

---

## 8. Literal examples

### 8.1 Default `config.json` skeleton (v1.5.8, non-first-run, abbreviated arrays)
```json
{
  "status_text": "",
  "status_texts": ["", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
  "status_styles": ["normal", "normal", "normal", "normal", "normal", "normal", "normal", "normal", "normal", "normal", "normal", "normal", "normal", "normal", "normal", "normal", "normal", "normal", "normal", "normal"],
  "status_count": 1,
  "status_cycle_sec": 10,
  "status_random": true,
  "status_templates": [
    {"name": "Template 1", "texts": ["", "…20"], "styles": ["normal", "…20"], "count": 1},
    {"name": "Template 2", "texts": ["", "…20"], "styles": ["normal", "…20"], "count": 1}
  ],
  "status_template_active": 0,
  "status_active": true,
  "afk_detect": false, "afk_manual": false, "afk_param": "AFK", "afk_preset": 0,
  "afk_texts": ["💤 AFK / Away 💤", "💤 AFK \\n BRB – briefly away", "💤   AFK   💤"],
  "afk_timer": false, "afk_timer_text": "for {afk_time}", "afk_style": "normal", "afk_solo": true,
  "media_active": false, "media_show_artist": true, "media_show_title": true, "media_title_max": 24,
  "media_show_time": true, "media_time_style": "normal", "media_time_seconds": true,
  "media_show_lyrics": false, "media_lyrics_local": false,
  "media_lyrics_sources": ["lrclib", "lyricsplus", "betterlyrics"],
  "media_lyrics_dir": "/home/user/.config/OSC-DreamChatbox/lyrics",
  "media_lyrics_prefix_on": true, "media_lyrics_prefix": "♪", "profile_save_on_exit": true, "media_lyrics_max": 144,
  "media_show_bar": true, "oscquery_enabled": true, "media_bar_style": 2, "media_bar_size": 100,
  "media_time_pos": "line",
  "media_bar_custom": {"prefix": "[", "filled": "█", "empty": "░", "knob": "", "suffix": "]"},
  "media_poll_sec": 1, "media_source": "", "media_source_label": "", "media_source_fallback": true,
  "hw_active": false,
  "app_order": ["status", "media", "hardware"],
  "textbox_presets": ["Hey! How are you doing? 😊", "What are you up to? 👀", "What's up? status: chilling ✨", "BRB / AFK for a moment! ☕", "Cuddles please? 🥺", "PEANUTBUTTER", "", "…14 more"],
  "textbox_preset_count": 6, "textbox_pause_sec": 10, "textbox_order": ["chat", "stt", "presets"],
  "stt_language": "de-DE", "stt_block": false, "stt_output": "", "stt_method": "lingva", "stt_mic": "",
  "stt_deepl_key": "", "stt_google_key": "", "stt_libre_url": "", "stt_libre_online_url": "",
  "stt_libre_online_key": "", "stt_libre_online_custom": false, "stt_custom_snippet": "", "stt_custom_file": "",
  "stt_twoway_source": "", "stt_twoway_language": "en-US", "stt_twoway_target": "",
  "stt_twoway_energy_auto": true, "stt_twoway_energy_threshold": 400, "stt_twoway_pause_sec": 0.7,
  "stt_twoway_min_phrase_sec": 0.3, "stt_twoway_phrase_limit": 8, "stt_twoway_send": false,
  "stt_twoway_send_mode": "vars", "stt_twoway_filter_mode": "off", "stt_twoway_filter_only": "VRChat",
  "stt_twoway_filter_except": "Spotify, YouTube Music",
  "stt_block_saved": [], "stt_block_plugins": true, "stt_block_box": true, "stt_block_except": [],
  "stt_mic_strict": true, "stt_mic_show_raw": false, "stt_energy_auto": true, "stt_energy_threshold": 300,
  "stt_pause_sec": 0.8, "stt_min_phrase_sec": 0.3, "stt_phrase_limit": 12,
  "stt_send_mode": "direct", "chat_anchor": "aio", "chat_hold_sec": 0, "stt_mode": "stt", "stt_show_both": false,
  "aio_active": false, "aio_mode": "normal",
  "osc_input_enabled": false, "hotkey_input_enabled": false,
  "stt_translate_notice": true, "stt_translate_notice_text": "Translate …",
  "osc_input_port": 9001, "osc_ext_ip": "127.0.0.1", "osc_ext_port": 9002,
  "aio_graphs": [{"nodes": [], "edges": []}, "…10 total"],
  "theme": "default", "theme_colors": {}, "theme_background": "", "theme_opacity": 0.82,
  "aio_count": 1,
  "aio_sets": [
    {"name": "Template 1", "templates": ["", "…10"], "count": 1,
     "custom_time": [false, "…10"], "custom_sec": [10, "…10"],
     "graphs": [{"nodes": [], "edges": []}, "…10"]}
  ],
  "aio_set_active": 0, "aio_rotate": false, "aio_rotate_sec": 10,
  "aio_templates": ["{text} \\n {artist} : {title} | {time} \\n {bar}", "", "", "", "", "", "", "", "", ""],
  "aio_custom_time": [false, false, false, false, false, false, false, false, false, false],
  "aio_custom_sec": [10, 10, 10, 10, 10, 10, 10, 10, 10, 10],
  "aio_heights": [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  "box_active": false, "box_template": 2,
  "box_custom_style": {"tl": "‹", "tf": "·", "tr": "›", "bl": "‹", "bf": "·", "br": "›"},
  "box_width_top": 7, "box_width_bottom": 3, "box_align": false, "box_top_on": true, "box_bottom_on": true,
  "box_top_mode": "custom", "box_top_custom": "🕐{box_clock}🕐",
  "box_bottom_mode": "custom", "box_bottom_custom": "OSC-DreamChatbox",
  "box_clock_live": true, "box_clock_format": "hm24",
  "media_idle": true, "media_idle_text": "⏸",
  "hw_flame": false, "hw_custom": false,
  "hw_custom_template": "🎮 {gpu_name} {gpu_usage} | {gpu_temp} {temp_icon} \\n ⚙️ {cpu_name} {cpu_usage} | {cpu_temp} {temp_icon} \\n VRAM {vram_usage} RAM {ram_usage} {ram_type}",
  "media_icon": false, "media_custom": false, "media_custom_template": "{artist} : {title} | {time}\\n{bar}",
  "hw_poll_sec": 2, "hw_gpu_usage": true, "hw_gpu_name": true, "hw_gpu_custom": false, "hw_gpu_custom_name": "",
  "hw_gpu_name_style": "normal", "hw_gpu_temp": true, "hw_gpu_power": false, "hw_gpu_select": "",
  "hw_gpu2": false, "hw_gpu2_select": "", "hw_gpu2_mode": "line", "hw_gpu2_usage": true, "hw_gpu2_temp": true,
  "hw_gpu2_power": false, "hw_gpu2_name": true, "hw_gpu2_custom": false, "hw_gpu2_custom_name": "",
  "hw_gpu2_name_style": "normal", "hw_gpu2_vram_used": false, "hw_gpu2_vram_pct": false,
  "hw_vram_used": true, "hw_vram_pct": false, "hw_ram_used": true, "hw_ram_pct": false, "hw_ram_type": "",
  "hw_cpu_usage": true, "hw_cpu_name": true, "hw_cpu_custom": false, "hw_cpu_custom_name": "",
  "hw_cpu_name_style": "normal", "hw_cpu_temp": true, "hw_cpu_power": false,
  "send_to_vrchat": false, "interval_sec": 5, "osc_instant_send": true, "slim_chatbox": true,
  "osc_ip": "127.0.0.1", "osc_port": 9000, "debug": false, "profile_active": ""
}
```
(Key order above follows the defaults dict; Python preserves insertion order so a real
file is in this order, with any unknown/legacy keys appended where `update()` put them.)

### 8.2 Test fixtures
* Status rotation cfg (`tests/test_status_rotation.py:29-34`):
  `{"status_texts": [...20], "status_count": 3, "status_random": false, "send_to_vrchat": false}`
* Media custom mode cfg (`tests/test_media_custom_mode.py:47-66`): template
  `"{artist} {title} {time} {bar} {lyrics}"`, `media_bar_style: 0`, `media_bar_custom: null`
  (null is tolerated at render time via `dict(DEFAULT).update(custom or {})`).
* Plugin layout written (`tests/test_plugin_layout.py:164-169`):
  `config.json["layout"] == ["widget", "chatbox", "settings"]`.
* Plugin manifest minimal: `{"id": "demo", "name": "Demo"}` (`tests/test_plugin_manifest.py:31-35`).
* Profile with plugins (`tests/test_profile_plugins.py:41-48`): `save_profile("Gaming",
  {"aio_active": True, "plugin_stale": True}, plugins={"oscleash": True, "afk": False})` writes
  keys in the order `["aio_active", "plugin_afk", "plugin_oscleash"]` (the stale flag is dropped).
* Export round trip (`:162-179`): `{"media_active": True, "plugin_afk": True}` +
  `{"afk": {"options": {"speed": 3}}}` → `Gaming.dcbprofile.json` → imported elsewhere gives
  the same profile dict and plugin settings; plain `Music.json` ⇒ `("Music", {...}, {})`.
* Media placeholders (`tests/test_media_custom_mode.py`, v1.5.8): `{album} {remaining}
  {progress_percent}` render `Neon Hours`, `2:29`, `34%` for position 78 / length 227 and empty
  strings (separators tidied away) when `length == 0` or no album.

---

## 9. Gotchas for a TS implementation

1. **No schema version.** Detect features by key presence; run the same migration
   chain as `load_config` (legacy keys listed in §1) if you want byte-compatible output.
2. **Escaped JSON.** config.json and profiles are `ensure_ascii=True` (`💤`
   surrogate pairs); plugin config.json is raw UTF-8. Both parse identically; when
   serialising, emit `indent=2` and (optionally) ASCII escapes to match.
3. **Literal `\n`.** Templates use the two characters backslash+n as line break, so the
   JSON string contains `\\n`. A real newline in a template is never written by the app.
4. **Fixed-size arrays.** `status_texts/styles` = 20, `status_templates` = 10,
   `aio_*` lists = 10 (AIO_MAX), `aio_sets` = 10, `afk_texts` = 3. Wrong length of
   `status_templates`/`aio_sets` **resets them entirely** to empty templates.
5. **Mirror keys.** `status_texts/status_styles/status_count` mirror
   `status_templates[status_template_active]`; `aio_templates/aio_count/aio_custom_time/
   aio_custom_sec/aio_graphs` mirror `aio_sets[aio_set_active]`. On load the mirror wins
   only if the template is empty; otherwise the template overwrites the mirror. Write both.
6. **Slim suffix.** Effective text budget is 142 chars when `slim_chatbox` (default true);
   `\u0003\u001f` is appended at send time and never stored in templates.
7. **Empty-placeholder tidy** removes an adjacent `Label:` or ONE separator from
   `| : / , - –` — reproduce `finish_template` exactly if you render previews.
8. **Aliases and case**: placeholder names are lower-cased, spaces→`_`, then the alias
   table applies (`{Song}` → `title`, `{2wayin}` → `twoway_input`, `{clock}` → `realtime`).
9. **Style markers** `{sup}`, `{/sup}`, `{super/…}` must not be treated as placeholders.
10. `media_lyrics_sources` order is not user-controlled — canonical order is enforced;
    `media_lyrics_dir` is stored as an **absolute path** (machine-specific).
11. `box_template` 12 and `media_bar_style` 6 mean "custom" and read the sibling dict.
12. `hw_gpu2_select == hw_gpu_select` → second is cleared; GPU ids are backend strings.
13. `chat_anchor` is shared by Chat-Line, Two-way-Line and (as default) plugin anchoring;
    plugin anchor/order live in each plugin's own config.json, not in config.json.
14. Profiles omit exactly the 19 `APP_WIDE_KEYS` (17 before v1.5.7) and every `plugin_*` key
    except the boolean flags they append themselves; on load the running app-wide values are
    re-injected and the full normaliser runs, so a profile file may be partial/old. A
    `.dcbprofile.json` is `{format, version, name, profile, plugins}` around that same object.
15. `stt_block_except` is a **sorted, de-duplicated** list of strings including
    `plugin:<id>`; `stt_block_saved` is transient bookkeeping (usually `[]`).
16. `defaults.get(key, X)` fallbacks in the normaliser never fire (the defaults dict already
    has the key), so the defaults dict values are the true defaults — e.g. `box_align`
    default is `false`, `box_clock_live` is `true`, `textbox_preset_count` is `6`.
17. Unknown top-level keys are preserved round-trip (both config.json and plugin
    config.json); do not strip them.
18. Node graphs: `x`/`y` are floats rounded to 0.1; `values` may contain ints or strings
    for choice fields (e.g. `"template": "3"`, `"count": 4`); unknown node types must be
    dropped, not rejected.
