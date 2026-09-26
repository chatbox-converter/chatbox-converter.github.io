# VRCOSC persisted-configuration format reference

Derived from the C# sources in `.references/vrcosc` (VRCOSC app, tag `2026.807.0`, commit `d4eff6c`, 2026-08-07) and `.references/vrcosc-modules` (Official Modules, tag `2026.501.1`, commit `ad7f51f`, 2026-05-01). Every file path below is relative to `.references/` and citations are `file:line`. All JSON is produced by Newtonsoft.Json with default settings unless stated otherwise.

Contents

1. Storage layout and the generic serialiser mechanism
2. ChatBox config (`chatbox.json`) — full schema + example
3. ID naming scheme and format-string syntax
4. Module settings files (`modules/{fullid}.json`) and persistence
5. Global files: settings, profiles, router, startup, packages
6. Official modules: IDs, states, events, variables, settings
7. Import / export
8. Windows-only requirements and behaviour with missing modules
9. Gotchas for a TS implementation

---

## 1. Storage layout and the generic serialiser mechanism

### 1.1 Root directory

`AppManager.Storage = new Storage($"{Environment.GetFolderPath(SpecialFolder.ApplicationData)}/{APP_NAME}")` with `APP_NAME = "VRCOSC"` (release) or `"VRCOSC-Dev"` (debug) — `vrcosc/VRCOSC.App/AppManager.cs:46-57`. On Windows that is `%APPDATA%\VRCOSC\` (i.e. `C:\Users\<user>\AppData\Roaming\VRCOSC\`).

### 1.2 Files on disk

| Path under `%APPDATA%\VRCOSC\` | Written by | Citation |
|---|---|---|
| `configuration/settings.json` | SettingsManagerSerialiser | `Settings/Serialisation/SettingsManagerSerialiser.cs:11-12` |
| `configuration/profiles.json` | ProfileManagerSerialiser | `Profiles/Serialisation/ProfileManagerSerialiser.cs:15-16` |
| `configuration/router.json` | RouterManagerSerialiserV1 | `Router/Serialisation/V1/RouterManagerSerialiserV1.cs:12-13` |
| `configuration/startup.json` | StartupManagerSerialiser | `Startup/Serialisation/StartupManagerSerialiser.cs:12-13` |
| `configuration/packages.json` | PackageManagerSerialiser | `Packages/Serialisation/PackageManagerSerialiser.cs` |
| `profiles/{profileGuid}/chatbox.json` | ChatBoxSerialiser (**the ChatBox config**) | `ChatBox/Serialisation/ChatBoxSerialiser.cs:17`, `Serialisation/ProfiledSerialiser.cs:12` |
| `profiles/{profileGuid}/modules/{module.FullID}.json` | ModuleSerialiser (one per module, settings+parameters+enabled) | `Modules/Serialisation/ModuleSerialiser.cs:15-16` |
| `profiles/{profileGuid}/persistence/{module.FullID}.json` | ModulePersistenceSerialiser (runtime state a module wants to keep) | `Modules/Serialisation/ModulePersistenceSerialiser.cs:13-14` |
| `packages/remote/{packageId}/*.dll` | installed module packages; the folder name **is** the package id | `Modules/ModuleManager.cs:315-319` |
| `packages/local/*.dll` | user-dropped local modules, package id `"local"` | `Modules/ModuleManager.cs:261-283` |
| `logs/`, `runtime/whisper`, `runtime/openvr` | logs / downloaded runtimes | `Utils/Logger.cs:60`, `AppManager.cs:551` |

`{profileGuid}` is the `id` of the active profile from `profiles.json` (`Guid.ToString()` = lowercase, hyphenated, 36 chars). A `ProfiledSerialiser` puts its file under `profiles/<ActiveProfile.ID>` (`Serialisation/ProfiledSerialiser.cs:12`).

### 1.3 The Serialiser mechanism

`Serialiser<TReference, TSerialisable>` (`vrcosc/VRCOSC.App/Serialisation/Serialiser.cs`):

* Writing: `JsonConvert.SerializeObject(data, Formatting.Indented)` → UTF-8 bytes **without BOM**, written atomically via a temp file (`Serialiser.cs:96-115`, `Utils/Storage.cs:189-191`). Indented = Newtonsoft default 2-space indentation with `Environment.NewLine` line breaks (`\r\n` on Windows). Key order = C# declaration order, base-class fields first (so `"version"` is always the first key).
* Reading (`Serialiser.cs:117-153`): accepts UTF-16 LE with BOM (`FF FE`), UTF-16 LE without BOM (detected by decoding and checking for a leading `{`), otherwise UTF-8. Anything not starting with `{` is rejected as corrupt.
* Versioning: every top-level document derives from `SerialisableVersion` which has `[JsonProperty("version")] int Version` (`Serialisation/SerialisableVersion.cs:8-12`). `SerialisationManager.Deserialise` first reads only `version`, picks the registered serialiser whose version equals it, otherwise `CorruptFile` (`Serialisation/SerialisationManager.cs:36-61`). **Every document type currently has exactly one serialiser registered with version 1.** A file without a matching `version` is treated as corrupt and (when `serialiseOnFail` is true and the file does not exist) the defaults are written out.
* After deserialising from an override path (import) or an older version, the file is immediately re-serialised (`SerialisationManager.cs:63-72`).
* Newtonsoft settings: **defaults**. No `TypeNameHandling`, no `StringEnumConverter` (verified: no occurrences in `VRCOSC.App`), no camel-case resolver — property names come exclusively from `[JsonProperty("...")]` attributes, which are all `snake_case`. Enums therefore serialise as **integers**. `float` serialises as e.g. `5.0`, `int` as `5`, `Guid` as a string, `DateTime`/`DateTimeOffset` (where not converted to ticks by hand) as ISO-8601 strings.
* `Observable<T>` has a custom converter that writes/reads just the wrapped value (`Utils/Observable.cs:14, 149-171`) — so anywhere a C# type has `Observable<string> Name`, the JSON is simply `"name": "..."`.
* `TryConvertToTargetType` (`Serialiser.cs:166-204`) is used for loosely-typed dictionaries (`Dictionary<string, object?>`): a `JToken` (arrays/objects) is converted with `ToObject(targetType)`, strings → `Guid` are parsed, numbers → enums via `Enum.ToObject`, `long` → `DateTimeOffset` is interpreted as **UTC ticks** and converted to local time, everything else via `Convert.ChangeType`.

---

## 2. ChatBox config (`profiles/{guid}/chatbox.json`)

Source of truth: `vrcosc/VRCOSC.App/ChatBox/Serialisation/SerialisableChatBox.cs` (schema), `ChatBoxSerialiser.cs` (load), `ChatBoxValidationSerialiser.cs` (pre-validation), `ChatBox/Clips/*` (defaults/semantics), `ChatBox/Timeline.cs`.

### 2.1 Schema

```
SerialisableChatBox                                   SerialisableChatBox.cs:16-32
  version: int            = 1
  timeline: SerialisableTimeline
    length: int           seconds; default 60; UI clamps to 1..240        Timeline.cs:18,30
    clips:  SerialisableClip[]
      layer: int          0..31 (32 layers)                                Timeline.cs:17
      enabled: bool       default true                                     Clip.cs:20
      name: string        default "New Clip" (serialisable default "UNSET")Clip.cs:21, SerialisableChatBox.cs:63
      start: int          seconds, inclusive
      end: int            seconds, exclusive (clip shows while start <= t < end)  Clip.cs (Evaluate)
      linked_modules: string[]   module FullIDs whose states/events/variables this clip may use
      states: SerialisableClipState[]   ONLY non-default states are written     SerialisableChatBox.cs:93
        enabled: bool
        format: string
        show_typing: bool
        use_minimal_background: bool
        variables: SerialisableClipVariable[]
        states: { [moduleId: string]: stateId } | null     null == the "Built-In - Text" state  SerialisableChatBox.cs:131-143
      events: SerialisableClipEvent[]   ONLY non-default events are written      SerialisableChatBox.cs:94
        enabled, format, show_typing, use_minimal_background, variables  (same as above)
        module_id: string
        event_id: string
        length: float     seconds the event text is shown
        behaviour: int    0 = Override, 1 = Queue, 2 = Ignore              ClipEvent.cs:100-118

SerialisableClipVariable                              SerialisableChatBox.cs:175-221
  module_id: string | null    null == built-in variable
  variable_id: string
  options: { [serialisedName: string]: any }   empty object {} when the variable has all-default options
```

### 2.2 Semantics needed to serialise correctly

**Clip layering / evaluation** (`ChatBoxManager.cs:316-325` `evaluateClips`, `Clip.cs` `Evaluate`): every send tick the clips are ordered by `layer` ascending and the first enabled clip whose `[start,end)` contains `CurrentSecond` and whose current state/event evaluates to text wins. Lower layer index = higher priority. Clips on the same layer must not overlap in time (enforced by the UI's droppable areas; not validated on load). `CurrentSecond = floor(elapsedSeconds) % length`.

**States** (`Clip.cs:302-318` `addStatesOfAddedModules`, `ClipState.cs:83-90`):

* A clip with no linked modules has exactly one state, the built-in text state, serialised with `"states": null`.
* When a module is linked, the built-in state is removed and, for every state reference the module registered, VRCOSC creates one `ClipState` whose `states` dictionary is `{ [moduleId]: stateId }`, **plus** compound states: for each existing state a clone with the new module's state added. So linking modules A (states a1,a2) and B (states b1) yields `{A:a1}`, `{A:a2}`, `{A:a1,B:b1}`, `{A:a2,B:b1}`, `{B:b1}`. Every combination that is possible at runtime exists in memory; only the ones the user changed are persisted.
* A compound state is chosen at runtime only when the set of *running* linked modules equals the set of keys of the state and each module's current state matches (`Clip.cs:226-245` `calculateValidClipState`).
* Defaults for a module state: `format` = the module's `DefaultFormat`, `show_typing` = module default (false unless noted), `use_minimal_background` = false, **`enabled` = false**, `variables` = the module's default variable list (`ClipState.cs:83-90`, `ClipElement.cs`). Because `enabled` defaults to `false`, any state the user turned on is non-default and therefore always written.
* Built-in text state defaults: `format` = "", `enabled` = false, no variables.
* Load matching (`ChatBoxSerialiser.cs:43`): `states == null` → the built-in state; otherwise the in-memory state whose dictionary `SequenceEqual`s the file's dictionary. `SequenceEqual` on `Dictionary<string,string>` is **order-sensitive** (enumeration order = insertion order). VRCOSC inserts keys in the order modules appear in `linked_modules` (earlier-linked module first). A TS serialiser must emit compound-state keys in `linked_modules` order or the state silently fails to match and is dropped.
* Unknown state (no match) → silently skipped during the real load (`ChatBoxSerialiser.cs:44`), but the validation pass fails first (see §8).

**Events** (`ClipEvent.cs:75-84`): for each linked module every event reference gets a `ClipEvent`. Defaults: `format` = module `DefaultFormat`, `show_typing` = module default, `length` = module default (SDK default 5), `behaviour` = module default (SDK default `Override` = 0), `enabled` = false, variables = module defaults. Only non-default events are written (`IsDefault` also checks `length` and `behaviour`, `ClipEvent.cs:69`). On load an event is matched by `(module_id, event_id)`; no match → skipped.

**Variables inside a state/event** (`ChatBoxSerialiser.cs:53-73`): the `variables` array is authoritative — the in-memory list is cleared and rebuilt from the file in array order. Each entry is resolved via `ChatBoxManager.GetVariable(module_id, variable_id)`; unknown → silently dropped (array indices of following variables shift, which breaks `{n}` references). Each option key is matched against the variable class's `[ClipVariableOption("serialised_name")]` properties; unknown keys ignored; values converted with `TryConvertToTargetType`. Then `OnDeserialised()` runs.

**`options` serialisation** (`SerialisableChatBox.cs:191-220`): written only if `!clipVariable.IsDefault()`, otherwise `{}`. When written, **all** option properties of the class (base + derived) are emitted, not just the changed ones. `DateTimeOffset` values are written as `UtcTicks` (long). Enum options are written as ints, `List<string>` as JSON arrays.

**Text delivery**: `\n` in a format string is sent to VRChat as `\v` (`ChatBoxManager.cs:368-376` `convertSpecialCharacters`). If `use_minimal_background` is true the text is truncated to 142 chars and `"\u0003\u001f"` appended. VRChat's own limit is 144 chars.

### 2.3 Clip variable classes and their options

Base options on every variable (`ChatBox/Clips/Variables/ClipVariable.cs:121-140`):

| key | C# type | default | notes |
|---|---|---|---|
| `case_mode` | enum `ClipVariableCaseMode` | 0 | 0 Default, 1 Lower, 2 Upper |
| `truncate_length` | int | -1 | -1 = unlimited; measured in text elements (grapheme clusters) |
| `include_ellipses` | bool | false | replaces the last 3 chars with `...` when truncating and not scrolling |
| `scroll_direction` | enum `ClipVariableScrollDirection` | 0 | 0 Left, 1 Right, 2 Bounce |
| `scroll_speed` | int | 0 | characters per ChatBox update; 0 = no scrolling |
| `join_string` | string | "" | appended between wrap-around when scrolling |
| `only_scroll_when_truncated` | bool | false | |

`IsDefault()` for the base = all of the above at default (`ClipVariable.cs:147-153`); output post-processing is `GetFormattedValue()` (`ClipVariable.cs:157-234`).

Per-class options (all classes in `ChatBox/Clips/Variables/Instances/`):

| Class (chosen by value type, `SDK/Modules/Module.cs:741-760`) | Value type | Extra options (key: type = default) | Output |
|---|---|---|---|
| `StringClipVariable` | string | none | value as-is |
| `BoolClipVariable` | bool | `when_true: string = "True"`, `when_false: string = "False"` | |
| `IntClipVariable` | int | `mode: enum IntVariableMode = 0` (0 Standard, 1 Symbol), `min_value: int = 0`, `max_value: int = 100`, `symbol_list: string[] = []` | Standard: `int.ToString()` (`int.MaxValue` → `∞`); Symbol: picks `symbol_list[round(progress*(n-1))]` |
| `FloatClipVariable` | float | `mode: enum FloatVariableMode = 0` (0 Standard, 1 Symbol), `float_format: string = "F1"`, `symbol_list: string[] = []` | Standard: .NET numeric format string, current culture; ±∞ → `∞`/`-∞` |
| `DateTimeClipVariable` | DateTimeOffset | `datetime_format: string = "yyyy/MM/dd HH:mm:ss"`, `timezone_id: string = ""` | .NET `DateTime.ToString(fmt, InvariantCulture)`; `timezone_id` is a `TimeZoneInfo.FindSystemTimeZoneById` id (Windows ids like `"GMT Standard Time"`; IANA ids also resolve on modern .NET); "" = local |
| `TimeSpanClipVariable` | TimeSpan | `time_format: string = "mm\\:ss"` (JSON: `"mm\\:ss"`), `include_negative_sign: bool = true` | .NET `TimeSpan.ToString(fmt)`; colons must be escaped with backslash in .NET custom TimeSpan formats |
| `ProgressClipVariable` | float 0..1 (only when a module passes `typeof(ProgressClipVariable)`) | `use_visual: bool = true`, `visual_resolution: int = 10`, `visual_line: string = "━" (U+2501)`, `visual_line_complete: string = ""` (becomes `visual_line` on load), `visual_position: string = "●" (U+25CF)`, `visual_start: string = "┣" (U+2523)`, `visual_end: string = "┫" (U+252B)` | visual bar or `"NN%"` |
| Built-in `TextClipVariable` | (string, unused) | `text: string = ""` | the literal text |
| Built-in `TimerClipVariable` (extends TimeSpanClipVariable) | (TimeSpan, unused) | `datetime: long UTC ticks` (default = now) plus TimeSpan options | formats `datetime - now` |
| Built-in `FileReaderClipVariable` | (string, unused) | `file_location: string = ""` | file contents or `INVALID FILE LOCATION` |

Notes: `ProgressClipVariable.IsDefault()` compares `visual_line_complete` to `"━"` while the property default is `""`, so a fresh Progress variable is **never** default and its options are always written (`ProgressClipVariable.cs:40`). `TimerClipVariable.IsDefault()` compares to `DateTimeOffset.Now`, so it is never default either.

### 2.4 Built-in variables (`module_id: null`)

Registered in `ChatBoxManager.addBuiltInVariables` (`ChatBox/ChatBoxManager.cs:87-124`); ids are `BuiltInVariables` enum names lowercased (`ChatBoxManager.cs:516-523`, `Utils/Extensions.cs:181`):

| `variable_id` | Display name | Class | Value |
|---|---|---|---|
| `text` | Custom Text | TextClipVariable | the `text` option |
| `focusedwindow` | Focused Window | StringClipVariable | active window title |
| `timer` | Timer | TimerClipVariable | countdown to `datetime` |
| `filereader` | File Reader | FileReaderClipVariable | file contents |
| `routerchatboxinput` | Router ChatBox Input | StringClipVariable | text received via OSC router |

### 2.5 Literal example — two clips

Clip 1 (layer 0, 0–30 s) is linked to the Media module and has a customised *Playing* state plus an enabled *On Track Change* event. Clip 2 (layer 1, 0–60 s) is a built-in text clip with a custom-text variable and a timer.

```json
{
  "version": 1,
  "timeline": {
    "length": 60,
    "clips": [
      {
        "layer": 0,
        "enabled": true,
        "name": "Music",
        "start": 0,
        "end": 30,
        "linked_modules": [
          "volcanicarts.vrcosc.officialmodules.mediamodule"
        ],
        "states": [
          {
            "enabled": true,
            "format": "🎵 {2} - {3}\n{0}/{1} {4}",
            "show_typing": false,
            "use_minimal_background": true,
            "variables": [
              { "module_id": "volcanicarts.vrcosc.officialmodules.mediamodule", "variable_id": "time", "options": {} },
              { "module_id": "volcanicarts.vrcosc.officialmodules.mediamodule", "variable_id": "duration", "options": {} },
              {
                "module_id": "volcanicarts.vrcosc.officialmodules.mediamodule",
                "variable_id": "artist",
                "options": {
                  "case_mode": 0,
                  "truncate_length": 20,
                  "include_ellipses": true,
                  "scroll_direction": 0,
                  "scroll_speed": 0,
                  "join_string": "",
                  "only_scroll_when_truncated": false
                }
              },
              { "module_id": "volcanicarts.vrcosc.officialmodules.mediamodule", "variable_id": "title", "options": {} },
              {
                "module_id": "volcanicarts.vrcosc.officialmodules.mediamodule",
                "variable_id": "progressvisual",
                "options": {
                  "use_visual": true,
                  "visual_resolution": 10,
                  "visual_line": "━",
                  "visual_line_complete": "━",
                  "visual_position": "●",
                  "visual_start": "┣",
                  "visual_end": "┫",
                  "case_mode": 0,
                  "truncate_length": -1,
                  "include_ellipses": false,
                  "scroll_direction": 0,
                  "scroll_speed": 0,
                  "join_string": "",
                  "only_scroll_when_truncated": false
                }
              }
            ],
            "states": {
              "volcanicarts.vrcosc.officialmodules.mediamodule": "playing"
            }
          }
        ],
        "events": [
          {
            "enabled": true,
            "format": "Now Playing\n{0} - {1}",
            "show_typing": true,
            "use_minimal_background": false,
            "variables": [
              { "module_id": "volcanicarts.vrcosc.officialmodules.mediamodule", "variable_id": "artist", "options": {} },
              { "module_id": "volcanicarts.vrcosc.officialmodules.mediamodule", "variable_id": "title", "options": {} }
            ],
            "module_id": "volcanicarts.vrcosc.officialmodules.mediamodule",
            "event_id": "ontrackchange",
            "length": 8.0,
            "behaviour": 1
          }
        ]
      },
      {
        "layer": 1,
        "enabled": true,
        "name": "Countdown",
        "start": 0,
        "end": 60,
        "linked_modules": [],
        "states": [
          {
            "enabled": true,
            "format": "{0} in {1}",
            "show_typing": false,
            "use_minimal_background": false,
            "variables": [
              {
                "module_id": null,
                "variable_id": "text",
                "options": {
                  "text": "Stream starts",
                  "case_mode": 0,
                  "truncate_length": -1,
                  "include_ellipses": false,
                  "scroll_direction": 0,
                  "scroll_speed": 0,
                  "join_string": "",
                  "only_scroll_when_truncated": false
                }
              },
              {
                "module_id": null,
                "variable_id": "timer",
                "options": {
                  "datetime": 638990490000000000,
                  "time_format": "hh\\:mm\\:ss",
                  "include_negative_sign": true,
                  "case_mode": 0,
                  "truncate_length": -1,
                  "include_ellipses": false,
                  "scroll_direction": 0,
                  "scroll_speed": 0,
                  "join_string": "",
                  "only_scroll_when_truncated": false
                }
              }
            ],
            "states": null
          }
        ],
        "events": []
      }
    ]
  }
}
```

(Exact key ordering inside `options` is reflection order — derived-class properties first, then base — and is irrelevant for loading.)

---

## 3. ID naming scheme and format-string syntax

### 3.1 Module ID

`Module.ID = GetType().Name.ToLowerInvariant()`; `Module.FullID = $"{PackageID}.{ID}"` (`vrcosc/VRCOSC.App/SDK/Modules/Module.cs:50-60`). `PackageID` is the name of the folder under `packages/remote/` the DLL was loaded from (`Modules/ModuleManager.cs:319, 387`), which the package manager names after `package_id` in the repo's `vrcosc.json`. For the official modules that is `volcanicarts.vrcosc.officialmodules` (`vrcosc-modules/vrcosc.json`). Local (side-loaded) modules get `local`. Examples:

* `volcanicarts.vrcosc.officialmodules.mediamodule`
* `volcanicarts.vrcosc.officialmodules.hyperatemodule` (class `HypeRateModule`)
* `local.mycustommodule`

The module's `[ModuleTitle("...")]` is only used for display. `linked_modules`, `states` keys, `module_id` in events/variables all use the FullID.

### 3.2 State / event / variable / setting / parameter IDs

All `Create*`/`Register*` SDK calls take an `Enum lookup` and store `lookup.ToLookup()` = `enum.ToString().ToLowerInvariant()` (`Utils/Extensions.cs:181`; `Module.cs:578-760`). There is **no separator insertion**: `OnTrackChange` → `ontrackchange`, `HMD_Battery` → `hmd_battery`, `NotAFK` → `notafk`. Modules may also pass raw strings (Counter does: `$"{counter.ID}_value"`). IDs are unique per module only; the pair `(module FullID, id)` is the global key. There is no `{module_id}_{name}` concatenation anywhere in the persisted format — module and id are always separate fields (or dictionary key/value).

### 3.3 Format-string syntax

`ClipElement.RunFormatting()` (`ChatBox/Clips/ClipElement.cs:34-46`):

```csharp
for (var i = 0; i < Variables.Count; i++)
    localFormat = localFormat.Replace("{" + i + "}", variable.GetFormattedValue());
```

* Placeholders are `{0}`, `{1}`, … referring to the **position** of the variable in that state's/event's `variables` array. There are no named placeholders, no format specifiers inside the braces, no escaping of literal braces. A placeholder with no corresponding variable is left as literal text; a variable with no placeholder is simply not shown.
* Replacement is a plain ordinal `string.Replace` done sequentially, so the output of variable 0 could in theory contain `{1}` and be replaced again.
* Newlines are literal `\n` (JSON `"\n"`); they become `\v` on the wire.
* Each variable value is post-processed by its options (truncate/scroll/case) before insertion (`ClipVariable.cs:157-234`).

---

## 4. Module settings serialisation

### 4.1 File `profiles/{guid}/modules/{FullID}.json`

Schema (`Modules/Serialisation/SerialisableModule.cs`):

```json
{
  "version": 1,
  "enabled": true,
  "settings": { "<settingKey>": <value>, ... },
  "parameters": { "<parameterKey>": { "enabled": true, "parameter_name": "VRCOSC/Media/Play" }, ... }
}
```

* `enabled` — module enabled on the modules page (`SerialisableModule.cs:16`).
* `settings` — only settings whose value is **not the default** are written (`SerialisableModule.cs:34`). On load a key that no longer exists or fails to deserialise is dropped and the file is rewritten (`ModuleSerialiser.cs:18-32`).
* `parameters` — only parameters whose `enabled`/`parameter_name` differ from the registered defaults (`SerialisableModule.cs:35`). Key = parameter lookup id, `parameter_name` = the OSC address suffix after `/avatar/parameters/`.

### 4.2 Setting value shapes (`SDK/Modules/Attributes/Settings/*.cs`)

| Created with (`Module.cs` line) | Setting class | JSON value | Load tolerance |
|---|---|---|---|
| `CreateToggle` (462) | `BoolModuleSetting` | `true`/`false` | must be bool |
| `CreateTextBox(string)` (467), `CreatePasswordTextBox` (482) | `StringModuleSetting` | string | must be string |
| `CreateTextBox(int)` (472) | `IntModuleSetting` | integer | long or int (`ValueModuleSetting.cs:63-72`) |
| `CreateTextBox(float)` (477) | `FloatModuleSetting` | number (Newtonsoft writes `0.5`, integers as `1.0`) | double/float/long/int |
| `CreateSlider(int|float, min, max)` (487/492) | `SliderModuleSetting : FloatModuleSetting` | number; clamped to `[min,max]` on load | as float |
| `CreateDropdown<TEnum>` (497) | `EnumModuleSetting : IntModuleSetting` | **integer** enum value | as int |
| `CreateDropdown(items, titlePath, valuePath)` (502) | `DropdownListModuleSetting : StringModuleSetting` | string = `valuePath` property of the selected item | string |
| `CreateDateTime` (528) | `DateTimeModuleSetting` | **long UTC ticks** (`DateTimeModuleSetting.Serialise` = `UtcTicks`), converted to local on load | must be long |
| `CreateTextBoxList(string|int|float)` (533-545) | `StringListModuleSetting` etc. (`ValueListModuleSetting<T>`) | JSON array of raw values, e.g. `["a","b"]` | must be a JSON array |
| `CreateKeyValuePairList` (548) | `MutableKeyValuePairListModuleSetting` | `[{"key":"k","value":"v"}, ...]` | array |
| `CreateQueryableParameterList` (553) | `QueryableParameterListModuleSetting` | `[{"name":"","type":0,"comparison":0,"bool_value":false,"int_value":0,"float_value":0.0}, ...]` (`SDK/Parameters/Queryable/QueryableParameter.cs:29-45`; `type`: 0 Bool 1 Int 2 Float; `comparison`: 0 Changed 1 EqualTo 2 NotEqualTo 3 GreaterThan 4 LessThan 5 GreaterThanOrEqualTo 6 LessThanOrEqualTo) | array |
| `CreateCustomSetting` (457) | any `ModuleSetting` subclass, usually `ListModuleSetting<T>` | array of `T` objects serialised with `[JsonProperty]` names (see §6 per module) | array |

List settings compare against their default list to decide "is default" (`ListModuleSetting.cs:41`), so an empty list with an empty default is omitted from the file.

### 4.3 Module persistence `profiles/{guid}/persistence/{FullID}.json`

Properties tagged `[ModulePersistent("key")]` (`SDK/Modules/Attributes.cs:108-120`) are saved when the module stops and loaded when it starts (`Module.cs:208-219`):

```json
{ "version": 1, "properties": [ { "key": "counts", "value": { ... arbitrary JSON of the property ... } } ] }
```

(`Modules/Serialisation/SerialisableModulePersistence.cs`). Note `version` here is a plain field, the class does not derive from `SerialisableVersion` but the shape is identical. Values are converted back with `TryConvertToTargetType`.

---

## 5. Global configuration files (brief)

### `configuration/settings.json` (`Settings/Serialisation/SerialisableSettingsManager.cs`, defaults `Settings/SettingsManager.cs:51-87`)

```json
{ "version": 1,
  "settings":  { "<VRCOSCSetting enum name>": value, ... },
  "metadata":  { "<VRCOSCMetadata enum name>": value, ... } }
```

Keys are the PascalCase enum member names (`Enum.ToString()`), all keys are written (not only non-default). Values: bools, ints, strings, enums as ints, `DateTime` as ISO string.

| key | type | default |
|---|---|---|
| StartInTray, AutomaticProfileSwitching, VRCAutoStart, VRCAutoStop, OVRAutoOpen, OVRAutoClose, AllowPreReleasePackages, TrayOnClose, EnableAppDebug, SpeechTranslate, GlobalKeyboardHook | bool | false |
| AutoUpdatePackages, ChatBoxWorldBlacklist, FilterByEnabledModules, SpeechEnabled | bool | true |
| UpdateChannel | int enum (0 Live, 1 Beta) | 0 |
| ChatBoxSendInterval | int ms | 1500 |
| Theme | int enum (0 Dark, 1 Light) | 0 |
| ConnectionMode | int enum (0 Local, 1 LAN, 2 Custom) | 0 |
| OutgoingEndpoint / IncomingEndpoint | string | "127.0.0.1:9000" / "127.0.0.1:9001" |
| SelectedMicrophoneID, SpeechModelPath | string | "" |
| SpeechModel | int enum (0 Custom, 1 Tiny, 2 Small) | 0 |
| SpeechConfidence / SpeechNoiseCutoff / SpeechMicVolumeAdjustment | float | 0.4 / 0.14 / 1.0 |
| SpeechGPU | int | 0 |
| OSCQueryClientName | string | "VRChat-Client" |
| metadata.InstalledVersion | string | "" |
| metadata.LastUpdateCheck | DateTime | now |
| metadata.InstalledUpdateChannel | int | 0 |
| metadata.FirstTimeSetupComplete, AutoStartQuestionClicked | bool | false |

### `configuration/profiles.json` (`Profiles/Serialisation/SerialisableProfileManager.cs`)

```json
{ "version": 1,
  "profiles": [ { "id": "a1b2c3d4-....", "name": "Default", "linked_avatars": ["avtr_..."] } ],
  "default_profile": "a1b2c3d4-....",
  "active_profile":  "a1b2c3d4-...." }
```

The first-run profile is named "Default" (`Profiles/ProfileManager.cs:133-135`). `linked_avatars` are VRChat avatar ids used for automatic profile switching.

### `configuration/router.json` (`Router/Serialisation/V1/SerialisableRouterManagerV1.cs`)

```json
{ "version": 1, "routes": [ { "name": "My route", "mode": 0, "endpoint": "127.0.0.1:9002" } ] }
```
`mode`: 0 Send, 1 Receive (`Router/RouterInstance.cs:16-20`).

### `configuration/startup.json` (`Startup/Serialisation/SerialisableStartupManager.cs`)

```json
{ "version": 1, "instances": [ { "enabled": true, "file_location": "C:\\...\\app.exe", "arguments": "" } ] }
```

### `configuration/packages.json` (`Packages/Serialisation/SerialisablePackageManager.cs`)

```json
{ "version": 1,
  "installed": [ { "package_id": "volcanicarts.vrcosc.officialmodules", "version": "2026.501.1" } ],
  "cache_expire_time": "2026-...",
  "cache": [ { "owner": "VolcanicArts", "name": "VRCOSC-Modules", "repository": { ...GitHub metadata... } } ] }
```

---

## 6. Official modules (`package_id = volcanicarts.vrcosc.officialmodules`)

All ids below are already lower-cased lookups. `FullID` = `volcanicarts.vrcosc.officialmodules.` + the id in the second column. Default format strings are written exactly as in source (`\n` = newline). Unless stated, events default to `length 5.0`, `behaviour 0 (Override)`, `show_typing false`; states default `show_typing false`. "Var type" is the `CreateVariable<T>` type argument, which determines the ClipVariable class (§2.3).

### 6.1 AFK Detection — `afkdetectionmodule` (`vrcosc-modules/VRCOSC.Modules/AFKDetection/AFKDetectionModule.cs`)

| Settings key | type | default |
|---|---|---|
| `source` | enum `AFKDetectionSource` (0 VRChat, 1 SteamVR) | 0 |
| `managevrchatwindow` | bool | false |

| Variables | type | display |
|---|---|---|
| `duration` | TimeSpan | Duration |
| `starttime` | DateTimeOffset | Start Time |

| States | display | default format | default vars |
|---|---|---|---|
| `notafk` | Not AFK | "" | — |
| `afk` | AFK | `AFK for {0}` | [duration] |

| Events | display | default format |
|---|---|---|
| `afkstopped` | AFK Stopped | `AFK has ended` |
| `afkstarted` | AFK Started | `AFK has begun` |

### 6.2 Client Info — `clientinfomodule` (`ClientInfo/ClientInfoModule.cs:35-38`)

No settings. Variables: `instancecount` int "Instance Count", `fps` int "FPS". State `default` "Default" format `FPS: {0}` vars [fps]. No events.

### 6.3 Counter — `countermodule` (`Counter/CounterModule.cs`, `Counter/CountersModuleSetting.cs`)

Settings: `countinstances` — custom list of counters, each:

```json
{ "id": "<guid string>", "name": "New Counter", "value_today_mode": 0, "int_threshold": 1, "float_threshold": 0.9,
  "parameter_names": ["..."], "milestone_parameter": "", "milestones": [10, 50] }
```
`value_today_mode`: 0 Modules, 1 Day (`CounterModule.cs:309-313`).

State: `default` "Default", format "". **Dynamic** variables/events created per counter in `OnPostLoad` (`CounterModule.cs:56-63`) — ids embed the counter's `id` GUID:

| id | kind | type / default format |
|---|---|---|
| `{id}_value` | variable | int |
| `{id}_valuetoday` | variable | int |
| `{id}_milestoneprevious` | variable | int |
| `{id}_milestonenext` | variable | int |
| `{id}_milestoneprogress` | variable | float via `ProgressClipVariable` |
| `{id}_countchanged` | event | `"{counterName} - {0} ({1})"` vars [value, valuetoday]; display "On '{name}' Count Changed" |
| `{id}_milestoneachieved` | event | "" |

Persistence key `counts`: `{ "<counterId>": { "value": 0, "value_today": 0, "last_write": "ISO date" } }` (`CounterModule.cs:18, 291-307`).

### 6.4 DateTime — `datetimemodule` (`Datetime/DateTimeModule.cs`)

| Settings key | type | default |
|---|---|---|
| `smoothsecond` / `smoothminute` / `smoothhour` | bool | true |
| `mode` | bool (false 12 h, true 24 h; parameters only) | false |
| `timezone` | dropdown-list string = `TimeZoneInfo.Id` ("" = Local) | "" |

Variable `now` DateTimeOffset "Now". State `default` "Default" format `{0}` vars [now]. No events.

### 6.5 Hardware Stats — `hardwarestatsmodule` (`HardwareStats/HardwareStatsModules.cs`)

Settings: `selectedcpu` int 0, `selectedgpu` int 0.

Variables: `cpuname` string "CPU Name"; `cpuusage` int "CPU Usage (%)"; `cpupower` int "CPU Power (W)"; `cputemp` int "CPU Temp (C)"; `gpuname` string; `gpuusage` int "GPU Usage (%)"; `gpupower` int; `gputemp` int; `ramusage` float "RAM Usage (%)"; `ramtotal` float "RAM Total (GB)"; `ramused` float "RAM Used (GB)"; `ramfree` float; `vramusage` float; `vramtotal` float; `vramused` float; `vramfree` float.

State `default` "Default" format `CPU: {0}% | GPU: {1}%\nRAM: {2}GB/{3}GB` vars [cpuusage, gpuusage, ramused, ramtotal]. No events.

### 6.6 Heart-rate base (Pulsoid, HypeRate) — `vrcosc/VRCOSC.App/SDK/Modules/Heartrate/HeartrateModule.cs:38-73`

Shared settings: `smoothvalue` bool true; `smoothvaluelength` int 1000; `averageperiod` int 10000; `smoothaverage` bool true; `smoothaveragelength` int 1000; `normalisedlowerbound` int 0; `normalisedupperbound` int 240; `beatmode` bool false.

Variables: `current` int "Current", `average` int "Average". States: `connected` "Connected" format `Heartrate: {0}` vars [current]; `disconnected` "Disconnected" format "". No events.

* **Pulsoid** — `pulsoidmodule` (`Pulsoid/PulsoidModule.cs:20`): extra setting `accesstoken` string "".
* **HypeRate** — `hyperatemodule` (class `HypeRateModule`, `Hyperate/HyperateModule.cs:19`): extra setting `id` string "".

### 6.7 KAT — `katmodule` (`KAT/KATModule.cs:42-45`)

Settings: `syncparams` int 4, `linelength` int 32, `linecount` int 4, `updatedelay` int 250. No ChatBox states/events/variables.

### 6.8 Keybinds — `keybindsmodule` (`Keybinds/KeybindsModuleSetting.cs`)

Setting `keybinds`: list of
```json
{ "id": "<guid>", "name": "New Keybind",
  "parameters": [ { "name": "", "type": 0, "comparison": 0, "bool_value": false, "int_value": 0, "float_value": 0.0, "action": 0 } ],
  "keybinds": [ { "modifiers": [<WPF Key int>], "keys": [<WPF Key int>] } ] }
```
`action`: 0 Press, 1 Hold. No ChatBox items.

### 6.9 Maths — `mathsmodule` (`Maths/MathsModule.cs:25-28`, `Maths/EquationModuleSetting.cs`)

Settings: `constants` string[] []; `functions` string[] []; `equations` list of `{ "name": "My Equation", "trigger_parameters": [], "equation": "", "output_parameter": "" }`. No ChatBox items.

### 6.10 Media — `mediamodule` (`Media/MediaModule.cs:30-72`)

Settings: `playoninstancetransfer` bool false. Persistence key `source_selection` (string|null).

| Variables | type | display |
|---|---|---|
| `title` | string | Title |
| `subtitle` | string | Subtitle |
| `genres` | string | Genres |
| `artist` | string | Artist |
| `artisttitle` | string | Artist + Title |
| `time` | TimeSpan | Current Time |
| `timeremaining` | TimeSpan | Time Remaining |
| `duration` | TimeSpan | Duration |
| `volume` | int | Volume |
| `tracknumber` | int | Track Number |
| `albumtitle` | string | Album Title |
| `albumartist` | string | Album Artist |
| `albumtrackcount` | int | Album Track Count |
| `progressvisual` | float (ProgressClipVariable) | Progress Visual |

| States | display | default format | default vars |
|---|---|---|---|
| `playing` | Playing | `[{0}/{1}]\n{2} - {3}\n{4}` | [time, duration, artist, title, progressvisual] |
| `paused` | Paused | `[Paused]\n{0} - {1}` | [artist, title] |
| `stopped` | Stopped | `[No Source]` | — |

| Events | display | default format | default vars | show_typing |
|---|---|---|---|---|
| `ontrackchange` | On Track Change | `Now Playing\n{0} - {1}` | [artist, title] | **true** |
| `onplay` | On Play | `[Playing]\n{0} - {1}` | [artist, title] | false |
| `onpause` | On Pause | `[Paused]\n{0} - {1}` | [artist, title] | false |

### 6.11 OpenVR family (`OpenVR/*.cs`)

* **Index Gesture Extensions** — `gestureextensionsmodule`: setting `threshold` float slider 0.5 (0..1, step 0.01). No ChatBox items.
* **SteamVR Haptic Control** — `hapticcontrolmodule`: no settings, no ChatBox items.
* **SteamVR Stats** — `steamvrstatisticsmodule` (`SteamVRStatisticsModule.cs:86-115`): no settings. Variables: `fps` float "FPS"; `dashboardvisible` bool; then for each device role `hmd`, `lhand`, `rhand`, `lelbow`, `relbow`, `lfoot`, `rfoot`, `lknee`, `rknee`, `waist`, `chest`: `{role}_charging` bool "<Role> Charging" and `{role}_battery` int "<Role> Battery (%)"; plus `trackeraveragebattery` int "Average Tracker Battery (%)", `trackerlowestrole` string "Lowest Tracker Role", `trackerlowestbattery` int "Lowest Tracker Battery (%)". State `default` "Default" format `HMD: {0}\nLHand: {1}\nRHand: {2}\nTrackers: {3}` vars [hmd_battery, lhand_battery, rhand_battery, trackeraveragebattery]. No events.

### 6.12 Parameter Sync — `parametersyncmodule` (`ParameterSync/ParameterSyncModule.cs:23-32`, `ParameterSync/ParameterSync.cs`)

Settings: `instances` list of `{ "id": "<guid>", "name": "New Sync Instance", "avatars": ["avtr_..."], "parameters": ["..."] }`; `delay` int 100. Persistence key `parameter_cache`: `{ "<instanceGuid>": { "<param>": value } }`. No ChatBox items.

### 6.13 PiShock — `pishockmodule` (`PiShock/PiShockModule.cs:47-55`, `PiShock/*ModuleSetting.cs`)

| Settings key | type | default |
|---|---|---|
| `username` | string | "" |
| `apikey` | string (custom view) | "" |
| `buttondelay` | int slider 0..1000 step 10 | 0 |
| `shockers` | list `{ "id": "<guid>", "name": "New Shocker", "sharecode": "" }` | [] |
| `groups` | list `{ "id": "<guid>", "name": "My New Group", "shockers": ["<shockerId>"], "max_duration": 15.0, "max_intensity": 100 }` | [] |
| `phrases` | list `{ "name": "New Phrase", "text": "", "mode": 0, "duration": 15, "intensity": 100, "shocker_groups": ["<groupId>"] }`; `mode`: 0 Shock, 1 Vibrate, 2 Beep, 3 End (`vrcosc/VRCOSC.App/SDK/Providers/PiShock/PiShockObjects.cs:49-55`) | [] |

No ChatBox states/events/variables.

### 6.14 Process Manager — `processmanagermodule`: no settings, no ChatBox items.

### 6.15 Speech To Text — `speechtotextmodule` (`SpeechToText/SpeechToTextModule.cs:20-30`)

Settings: `listencriteria` enum (0 Anytime, 1 OnlyWhenMuted, 2 OnlyWhenUnMuted) default 0. Variable `text` string "Text". State `default` "Default" format "". Event `result` "On Speech Result" format `{0}` vars [text], **show_typing true, length 10.0**, behaviour 0.

### 6.16 Stopwatch — `stopwatchmodule` (`Stopwatch/StopwatchModule.cs:19-46`)

Settings: `smoothsecond` bool true, `smoothminute` bool true. Variable `currenttime` TimeSpan "Current Time". States: `started` "Started" `{0}` [currenttime]; `paused` "Paused" `{0}` [currenttime]; `stopped` "Stopped" "". No events.

### 6.17 Twitch — `twitchmodule` (`Twitch/TwitchModule.cs:34`)

Setting `accesstoken` string "". No ChatBox states/events/variables (Twitch data is exposed through the node graph only).

### 6.18 Voice Commands — `voicecommandsmodule` (`VoiceCommands/VoiceCommandsModule.cs:17-18`, `VoiceCommands/PhraseModuleSetting.cs`, `VoiceCommands/Parameter.cs`)

Settings: `phrases` list of `{ "name": "New Phrase", "text": "", "parameters": [ { "parameter_name": "MyParameter", "parameter_type": 0, "bool_mode": 2, "int_value": 0, "float_value": 0.0 } ] }` (`bool_mode`: 0 True, 1 False, 2 Toggle); `speechlog` bool false. No ChatBox items.

### 6.19 Weather — `weathermodule` (`Weather/WeatherModule.cs:24-36`)

Setting `location` string "". Variables: `tempc` float "Temp C"; `tempf` float "Temp F"; `humidity` int "Humidity"; `condition` string "Condition". State `default` "Default" format `Local Weather\n{0}\n{1}C - {2}F` vars [condition, tempc, tempf]. No events.

### 6.20 Summary of modules that contribute to the ChatBox

`afkdetectionmodule`, `clientinfomodule`, `countermodule`, `datetimemodule`, `hardwarestatsmodule`, `hyperatemodule`, `pulsoidmodule`, `mediamodule`, `steamvrstatisticsmodule`, `speechtotextmodule`, `stopwatchmodule`, `weathermodule`. All others (KAT, Keybinds, Maths, GestureExtensions, HapticControl, ParameterSync, PiShock, ProcessManager, Twitch, VoiceCommands) register no states/events/variables and only matter for `modules/*.json`.

---

## 7. Import / export

* **ChatBox**: the ChatBox tab has Import/Export buttons (`vrcosc/VRCOSC.App/UI/Views/ChatBox/ChatBoxView.xaml:213-221`). *Export* just opens Explorer at `profiles/{activeProfile}/chatbox.json` (`ChatBoxView.xaml.cs:427-431`, `Platform.PresentFile`) — there is no separate export format; the on-disk file **is** the exchange format. *Import* picks a `.json` and calls `ChatBoxManager.Deserialise(filePath)` (`ChatBoxView.xaml.cs:412-425`), which validates (§8), loads, and immediately re-saves to the profile's `chatbox.json` (`ChatBoxManager.cs:203`).
* **Modules**: per-module Import/Export (`UI/Views/Modules/ModulesView.xaml:112-121`, `.xaml.cs:35-60`). Export opens Explorer at `profiles/{id}/modules/{FullID}.json`; Import calls `Module.ImportConfig(path)` which reloads all modules with that one module reading from the override path (`SDK/Modules/Module.cs:152-155`), then re-saves.
* No clipboard, URL or "download" based sharing exists for configs (the only "Download" code is for whisper models/packages). Node graphs and Dolly paths have their own import/export, unrelated to the ChatBox.

---

## 8. Windows-only requirements and missing modules

* VRCOSC is a WPF app; module DLLs are loaded from `packages/remote/<package_id>/` and `packages/local/`. A config only makes sense on a machine where the referenced packages are installed and loaded — `ModuleManager.IsModuleLoaded(fullId)` checks the in-memory module list (`Modules/ModuleManager.cs:106`). Official modules must be installed from the package manager (source `VolcanicArts/VRCOSC-Modules`, `Packages/PackageManager.cs:50`).
* On load (`ChatBoxManager.Deserialise`, `ChatBox/ChatBoxManager.cs:150-203`) a **validation pass** (`ChatBoxValidationSerialiser`) runs first over the same file. It sets `IsValid = false` and stops at the first of: a `linked_modules` entry that is not loaded; a `states` dictionary entry whose `(moduleId, stateId)` has no registered state reference; a state or event variable whose `(module_id, variable_id)` is unknown; an event whose `(module_id, event_id)` is unknown (`ChatBoxValidationSerialiser.cs:29-90`). Note it does **not** check unknown option keys, layer/time ranges, overlaps or the `version` beyond the manager's version match.
* If validation fails during a **normal startup load**: an error dialog "ChatBox could not load all data... module not loading correctly or a missing config" is shown, `IsLoaded` stays false, the timeline stays empty and — importantly — nothing is re-serialised, so the file on disk is preserved until the module is installed again (`ChatBoxManager.cs:181-186`, `Serialise()` guard at `ChatBoxManager.cs:143-147`).
* If validation fails during an **import**: a dialog "ChatBox could not import all data ... Press OK to import anyway" appears; OK re-runs `Deserialise(filePath, bypassValidation: true)` (`ChatBoxManager.cs:170-179`). In the forced load the real serialiser silently drops every unmatched state, event and variable (§2.2) and then writes the pruned result to `chatbox.json`, i.e. references to missing modules are lost permanently. `linked_modules` entries for missing modules are kept verbatim in the clip.
* The validation serialiser is also a `ProfiledSerialiser` reading `chatbox.json`, so when there is no file at all the manager just writes an empty default (`SerialisationManager.cs:40-44`).

---

## 9. Gotchas for a TS implementation

1. **`version` first, value 1, everywhere.** Any document without `"version": 1` is rejected as corrupt. Do not invent higher versions.
2. **Enums are integers** (`behaviour`, `case_mode`, `scroll_direction`, `mode`, settings dropdowns, `type`/`comparison`, `UpdateChannel`, …). Never emit enum names.
3. **`{n}` placeholders are positional** into that element's `variables` array; reordering/removing variables changes meaning. A dropped (unknown) variable shifts every later index at load time.
4. **Only non-default states/events are stored.** To round-trip faithfully you must know each module's defaults (§6) — an absent state means "module default format, disabled". `enabled` defaults to `false` for every state and event, including the built-in text state, so a clip that shows anything must have at least one state with `"enabled": true`.
5. **Built-in text state is `"states": null`**, not `{}`. It only exists when `linked_modules` is empty (linking a module removes it; unlinking the last module re-creates it).
6. **Compound-state dictionary key order matters** (order-sensitive `SequenceEqual`): emit keys in `linked_modules` order.
7. **`options` is all-or-nothing**: `{}` when every option (base + class-specific) is default, otherwise VRCOSC writes every option of the class. Parsers must treat missing keys as defaults; serialisers may safely write only changed keys (unknown/missing keys are tolerated on load) but writing the full set matches VRCOSC output.
8. **Numbers**: JSON integers arrive as `long`, floats as `double`. `truncate_length`, `scroll_speed`, `visual_resolution`, `min_value`, `max_value` are ints; `length` (event) is a float and VRCOSC writes `5.0`. Int settings must be integers (a `5.0` for an `IntModuleSetting` fails to deserialise and is discarded), float settings accept both.
9. **Dates are .NET UTC ticks** (`datetime` option, `DateTimeModuleSetting` values): 100-ns intervals since 0001-01-01T00:00:00Z. `ticks = unixMillis * 10_000 + 621_355_968_000_000_000`. Values exceed 2^53 — use `BigInt` or string-preserving JSON parsing; `JSON.parse` will silently round them.
10. **Format strings are .NET format strings** (`float_format` e.g. `F1`, `N0`; `datetime_format` custom DateTime patterns; `time_format` custom TimeSpan patterns where `:` and `.` must be backslash-escaped, e.g. `hh\:mm\:ss` which is `"hh\\:mm\\:ss"` in JSON). Emulate or pass through; do not "fix" the backslashes.
11. **Truncation counts grapheme clusters** (`StringInfo.LengthInTextElements`), not UTF-16 code units — use `Intl.Segmenter` if you emulate output.
12. **IDs are lower-case enum names with no separators** (`ontrackchange`, `hmd_battery`), module ids are `package.classname` lower-case (`volcanicarts.vrcosc.officialmodules.mediamodule`). Counter ids embed a GUID: `{guid}_value`, `{guid}_countchanged`.
13. **Encoding**: write UTF-8 without BOM; accept UTF-8 and UTF-16 LE (with or without BOM) when reading. Non-ASCII in format strings (emoji, box-drawing chars) is written as raw UTF-8 characters by Newtonsoft, not `\uXXXX` escapes.
14. **Newlines** in `format` are literal `\n`; do not convert to `\v` in the file (VRCOSC does that at send time). Minimal-background clips are cut to 142 chars; VRChat's hard limit is 144.
15. **Timeline bounds**: `length` 1..240 s; `layer` 0..31; `0 <= start < end <= length`; clips on the same layer should not overlap; lower `layer` wins. None of this is validated on load, but out-of-range clips are pruned/clamped when the length changes (`Clip.cs:94-107` `ChatBoxLengthChange`).
16. **Progress/Timer variables are never "default"** (see §2.3), so VRCOSC always writes their options; and `visual_line_complete: ""` is rewritten to `visual_line` on load.
17. **Unknown module in a config** does not crash the loader but the whole ChatBox refuses to load until the module is present; a forced import prunes the references. A converter targeting VRCOSC should therefore only emit references to modules the user actually has, and should prefer built-in `text` variables for static content.
18. **Module settings files store only non-default keys**, keyed by lower-cased enum name, and `parameters` only for renamed/disabled parameters; both dictionaries can be entirely absent (`{}`) for an untouched module. Custom list-setting item objects use the `[JsonProperty]` names listed in §6 and `Observable<T>` fields are flattened to plain values.
19. **Profile GUIDs** are lowercase hyphenated; the ChatBox file for the *active* profile lives at `profiles/<active_profile>/chatbox.json` — read `configuration/profiles.json` to find it.
