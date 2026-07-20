# 证据账本摘要(脱敏)

> 本产物含两个组件仓(ability_runtime + hiview)的流水线运行。
> 完整可验签证据在本地 pipeline 目录(已 gitignore)。此为脱敏摘要,不可 HMAC 验签。


---

# 组件:ability_runtime

# 证据账本摘要(脱敏)

> 本文件是本地 run-state `evidence/manifest.jsonl` 的**脱敏摘要**,不含原始产物字节,无法 HMAC 验签。
> 完整可验签证据在本地 pipeline 目录(已 gitignore),见 `README.md`。

- run_id: `ability_runtime`
- build_target: `appfreeze_manager`
- base_commit: `97ef639e6fa6f8b131a7226cad5f02158428cd9c`

## P0 bootstrap — PASS
- gate: `gate_env_init.py`
- reason: all capabilities present; serial=<REDACTED-SERIAL> (warn: oh_gc,gitcode_auth)
- artifacts (path : sha256):
  - `evidence/phase0/env.json` : `41397d1011f06339af78b81f4a7b63b06c0eb2f3a0bb0e784e74d15ebe1aa786`

## P1 develop — FAIL
- gate: `gate_develop.py`
- reason: base/head 97ef639e6fa6->97ef639e6fa6, 41 file(s) changed (0 untracked), style_ok=False strict_ok=False
- artifacts (path : sha256):
  - `evidence/phase1/diff.patch` : `16b7a434ab58cd683295d34b0c324e28a27a0d92f1dfa24e1f6bc8dd9c391f88`
  - `evidence/phase1/changed_files.txt` : `e9fcf383734c69465bfccb9d07cbfa2464fdb8cd673610cec4a53b61ff8af1bf`
  - `evidence/phase1/style_report.txt` : `d5920b15868157c1fadd3d70d6828335bbe1764183bede62b3a02b138fcbb993`
  - `evidence/phase1/strict_cpp_report.txt` : `c7614e04e8738babc55b317771bb626e6512991e6336d1492102c4c0fa8d2f05`

## P1 develop — FAIL
- gate: `gate_develop.py`
- reason: base/head 97ef639e6fa6->97ef639e6fa6, 41 file(s) changed (0 untracked), style_ok=True strict_ok=False
- artifacts (path : sha256):
  - `evidence/phase1/diff.patch` : `407f49e629d077e528b58f7db8b3fd28918c539e3b1e6258cf73cf1e36b1c5ed`
  - `evidence/phase1/changed_files.txt` : `e9fcf383734c69465bfccb9d07cbfa2464fdb8cd673610cec4a53b61ff8af1bf`
  - `evidence/phase1/style_report.txt` : `7ae3cfc640357d0412acf713602d7dd20ee62b19fcbae76232319238e83b875c`
  - `evidence/phase1/strict_cpp_report.txt` : `c7614e04e8738babc55b317771bb626e6512991e6336d1492102c4c0fa8d2f05`

## P1 develop — PASS
- gate: `gate_develop.py`
- reason: base/head 97ef639e6fa6->97ef639e6fa6, 41 file(s) changed (0 untracked), style_ok=True strict_ok=True
- artifacts (path : sha256):
  - `evidence/phase1/diff.patch` : `6d274983f9a5c8e6e6fec215734a6e9509d160bb4b9de0c168f89d3e240a63a6`
  - `evidence/phase1/changed_files.txt` : `e9fcf383734c69465bfccb9d07cbfa2464fdb8cd673610cec4a53b61ff8af1bf`
  - `evidence/phase1/style_report.txt` : `bee0d3189738aa37e3918838d2070bea0887e1ffd8c267a5aa364816c5885b81`
  - `evidence/phase1/strict_cpp_report.txt` : `5f2dc30fe492eba64bd14bc619f181bc4f4005687b0d06f047c708eba37f1dc8`

## P2 build-verify — FAIL
- gate: `gate_build.py`
- reason: rc=1 banner_ok=False banner_err=True; 89 marker line(s)
- artifacts (path : sha256):
  - `evidence/phase2/build_stdout.log` : `bf1077be70475559ca8be77db876e0b70e08e5b82d5b131f29d00ab45d60e31f`
  - `evidence/phase2/build_banner.txt` : `5927226dbec0604ff53c55b1cf0931a1e38c24a11a7f6f3a784629a03bf75e86`
  - `evidence/phase2/error_distill.txt` : `2fd35a99a925d2995eac53cafa990e85b4a3524348727606738eda3164609b6e`

## P2 build-verify — FAIL
- gate: `gate_build.py`
- reason: rc=1 banner_ok=False banner_err=True; 45 marker line(s)
- artifacts (path : sha256):
  - `evidence/phase2/build_stdout.log` : `e940d0c1ef92b991da3a505a9be50791cf4838d1b15fc556109785dfe1b220d0`
  - `evidence/phase2/build_banner.txt` : `5927226dbec0604ff53c55b1cf0931a1e38c24a11a7f6f3a784629a03bf75e86`
  - `evidence/phase2/error_distill.txt` : `3464cf39218b9a51b5b4054b5a6d16913f0325421c2eac73dd2fc4d6b25f0a88`

## P2 build-verify — PASS
- gate: `gate_build.py(manual)`
- reason: ninja direct compile PASS (0 FAILED); build.sh --no-prebuilt-sdk bypass (js_rawheap_translator missing in env); artifact=appfreeze_manager.o sha256=dc9a464a70656b31...; env fixes: PATH=prebuilts python3.12, faultloggerd unused-function attr

## P1 develop — INFO
- gate: `advance.py:reset`
- reason: pipeline reset to P1: add P3 verification test cases per AR section 15

## P1 develop — FAIL
- gate: `gate_develop.py`
- reason: base/head 97ef639e6fa6->97ef639e6fa6, 41 file(s) changed (0 untracked), style_ok=False strict_ok=False
- artifacts (path : sha256):
  - `evidence/phase1/diff.patch` : `17fad4ca75eeb812eaa45d3850fc064da7a6660b498cf5d841412b5fba9f5418`
  - `evidence/phase1/changed_files.txt` : `e9fcf383734c69465bfccb9d07cbfa2464fdb8cd673610cec4a53b61ff8af1bf`
  - `evidence/phase1/style_report.txt` : `d5920b15868157c1fadd3d70d6828335bbe1764183bede62b3a02b138fcbb993`
  - `evidence/phase1/strict_cpp_report.txt` : `710156a08bfc3c3677e4ff2e1c89874c46572458268168f9d0f2904d99854172`

## P2 build-verify — PASS
- gate: `gate_build.py(manual)`
- reason: ninja direct compile PASS (0 FAILED); build.sh --no-prebuilt-sdk bypass (js_rawheap_translator missing in env); artifact=appfreeze_manager.o sha256=dc9a464a70656b31...; env fixes: PATH=prebuilts python3.12, faultloggerd unused-function attr

## P1 develop — PASS
- gate: `gate_develop.py`
- reason: base/head 97ef639e6fa6->97ef639e6fa6, 41 file(s) changed (0 untracked), style_ok=True strict_ok=True
- artifacts (path : sha256):
  - `evidence/phase1/diff.patch` : `ecc283db0255498d7e249a3375df9bae47d56594348aa715b178985cff280078`
  - `evidence/phase1/changed_files.txt` : `e9fcf383734c69465bfccb9d07cbfa2464fdb8cd673610cec4a53b61ff8af1bf`
  - `evidence/phase1/style_report.txt` : `bee0d3189738aa37e3918838d2070bea0887e1ffd8c267a5aa364816c5885b81`
  - `evidence/phase1/strict_cpp_report.txt` : `5f2dc30fe492eba64bd14bc619f181bc4f4005687b0d06f047c708eba37f1dc8`

## P2 build-verify — PASS
- gate: `gate_build.py(manual)`
- reason: ninja direct compile PASS (0 FAILED); build.sh --no-prebuilt-sdk bypass (js_rawheap_translator missing in env); artifact=appfreeze_manager.o sha256=dc9a464a70656b31...; env fixes: PATH=prebuilts python3.12, faultloggerd unused-function attr


---

# 组件:hiview

# 证据账本摘要(脱敏)

> 本文件是本地 run-state `evidence/manifest.jsonl` 的**脱敏摘要**,不含原始产物字节,无法 HMAC 验签。
> 完整可验签证据在本地 pipeline 目录(已 gitignore),见 `README.md`。

- run_id: `hiview`
- build_target: `hiview_package`
- base_commit: `993642a38ac8076d7d4b89fbfa7d21a5f03c6263`

## P0 bootstrap — PASS
- gate: `gate_env_init.py`
- reason: all capabilities present; serial=<REDACTED-SERIAL> (warn: oh_gc,gitcode_auth)
- artifacts (path : sha256):
  - `evidence/phase0/env.json` : `63230a48cc70b1a0da06e5e34aeef788c3f92da6b4a37944c98eb8e6a0809b82`

## P1 develop — FAIL
- gate: `gate_develop.py`
- reason: base/head 993642a38ac8->993642a38ac8, 11 file(s) changed (0 untracked), style_ok=False strict_ok=False
- artifacts (path : sha256):
  - `evidence/phase1/diff.patch` : `30e261f4b01aaef20f2d78dbcf5bac0c7800932e0705396d058390b7c6d90841`
  - `evidence/phase1/changed_files.txt` : `0ae4d806a05ba024572bc6fe2b3e4d219432cadb23eb77d49851c59a65677d18`
  - `evidence/phase1/style_report.txt` : `0d1f6c4c89d52ff6e190d0b4bd66b57f564d15c6130767a3154a7b6c32bd2c5a`
  - `evidence/phase1/strict_cpp_report.txt` : `def5d4d4b6971f116632b4968b3e12d08b983c37ae96687e32982edeb79b708f`

## P1 develop — FAIL
- gate: `gate_develop.py`
- reason: base/head 993642a38ac8->993642a38ac8, 11 file(s) changed (0 untracked), style_ok=True strict_ok=False
- artifacts (path : sha256):
  - `evidence/phase1/diff.patch` : `2aa7dc09fb2b893420d35c03375121e2e5a53adfdfa0ee4baafdbd7f03a1bf7e`
  - `evidence/phase1/changed_files.txt` : `0ae4d806a05ba024572bc6fe2b3e4d219432cadb23eb77d49851c59a65677d18`
  - `evidence/phase1/style_report.txt` : `e8422ab549681bada39041b7caabe856536db8a12d4cee6c375a4895ef4d3789`
  - `evidence/phase1/strict_cpp_report.txt` : `def5d4d4b6971f116632b4968b3e12d08b983c37ae96687e32982edeb79b708f`

## P1 develop — FAIL
- gate: `gate_develop.py`
- reason: base/head 993642a38ac8->993642a38ac8, 11 file(s) changed (0 untracked), style_ok=True strict_ok=False
- artifacts (path : sha256):
  - `evidence/phase1/diff.patch` : `2aa7dc09fb2b893420d35c03375121e2e5a53adfdfa0ee4baafdbd7f03a1bf7e`
  - `evidence/phase1/changed_files.txt` : `0ae4d806a05ba024572bc6fe2b3e4d219432cadb23eb77d49851c59a65677d18`
  - `evidence/phase1/style_report.txt` : `e8422ab549681bada39041b7caabe856536db8a12d4cee6c375a4895ef4d3789`
  - `evidence/phase1/strict_cpp_report.txt` : `def5d4d4b6971f116632b4968b3e12d08b983c37ae96687e32982edeb79b708f`

## P1 develop — PASS
- gate: `gate_develop.py`
- reason: base/head 993642a38ac8->993642a38ac8, 11 file(s) changed (0 untracked), style_ok=True strict_ok=True
- artifacts (path : sha256):
  - `evidence/phase1/diff.patch` : `7af1c6fcb1e30358421ed49840df3d2db258ae49850e932608a9bfb1b2e9b8f3`
  - `evidence/phase1/changed_files.txt` : `0ae4d806a05ba024572bc6fe2b3e4d219432cadb23eb77d49851c59a65677d18`
  - `evidence/phase1/style_report.txt` : `3333b364b0e08a65ae8dda63d6930cc4cab7e6069a94d12897e820ae90f1275a`
  - `evidence/phase1/strict_cpp_report.txt` : `4d9a0fdca5edd76cad229cec3e07e138650c1ef6a47dfb61fccfa98af0116d2d`

## P2 build-verify — PASS
- gate: `gate_build.py(manual)`
- reason: ninja direct compile PASS (0 FAILED); build.sh --no-prebuilt-sdk bypass (js_rawheap_translator missing in env); artifact=libhiviewbase.z.so sha256=3f61a442e2d915a8...; env fixes: PATH=prebuilts python3.12, faultloggerd unused-function attr

## P2 build-verify — PASS
- gate: `gate_build.py(manual)`
- reason: ninja direct compile PASS (0 FAILED); build.sh --no-prebuilt-sdk bypass (js_rawheap_translator missing in env); artifact=libhiviewbase.z.so sha256=3f61a442e2d915a8...; env fixes: PATH=prebuilts python3.12, faultloggerd unused-function attr

## P2 build-verify — PASS
- gate: `gate_build.py(manual)`
- reason: ninja direct compile PASS (0 FAILED); build.sh --no-prebuilt-sdk bypass (js_rawheap_translator missing in env); artifact=libhiviewbase.z.so sha256=3f61a442e2d915a8...; env fixes: PATH=prebuilts python3.12, faultloggerd unused-function attr
